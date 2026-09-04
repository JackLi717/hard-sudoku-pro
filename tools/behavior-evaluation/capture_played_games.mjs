// Read-only device/database collection. Outputs are local, immutable snapshots.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { gzipSync } from 'node:zlib';

const args = process.argv.slice(2),
  sources = [],
  unavailable = [];
let output = '.local/behavior-regression',
  android = false,
  ios = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out') output = args[++i];
  else if (args[i] === '--android') android = true;
  else if (args[i] === '--ios') ios = true;
  else if (args[i] === '--database')
    sources.push({ platform: 'import', file: path.resolve(args[++i]) });
  else throw Error(`Unknown argument ${args[i]}`);
}
if (!android && !ios && !sources.length)
  throw Error('Use --android --ios and/or --database <user.sqlite>');
fs.mkdirSync(output, { recursive: true });
const directory = fs.mkdtempSync(path.join(path.resolve(output), 'capture-'));
function run(cmd, args, binary = false) {
  const r = spawnSync(cmd, args, {
    encoding: binary ? undefined : 'utf8',
    timeout: 30000,
    maxBuffer: 128 * 1024 * 1024,
  });
  if (r.status !== 0) throw Error(r.error?.message || String(r.stderr));
  return r.stdout;
}
if (ios) {
  const base = path.join(
    os.homedir(),
    'Library/Developer/CoreSimulator/Devices',
  );
  const found = run('rg', ['--files', '--hidden', base, '-g', 'user.sqlite']);
  for (const file of found.trim().split('\n').filter(Boolean))
    sources.push({
      platform: 'ios',
      device: path.relative(base, file).split(path.sep)[0],
      file,
    });
}
if (android) {
  const adb =
    process.env.ADB ??
    path.join(os.homedir(), 'Library/Android/sdk/platform-tools/adb');
  const devices = run(adb, ['devices'])
    .split('\n')
    .filter(l => /\tdevice$/.test(l))
    .map(l => l.split('\t')[0]);
  if (!devices.length)
    unavailable.push({ platform: 'android', reason: 'no_connected_device' });
  for (const device of devices) {
    try {
      const prefix = [
        '-s',
        device,
        'exec-out',
        'run-as',
        'com.jackli717.sudoku',
      ];
      // Include WAL and refuse a capture if the source changed during copying.
      const checksum = () =>
        run(adb, [
          ...prefix,
          'sh',
          '-c',
          'find files/databases -type f -exec sha256sum {} \\;',
        ]);
      const before = checksum();
      const archive = run(
        adb,
        [...prefix, 'tar', '-cf', '-', 'files/databases'],
        true,
      );
      if (before !== checksum())
        throw Error(
          'Database changed during capture; retry while game is idle',
        );
      const dest = fs.mkdtempSync(path.join(directory, 'android-'));
      const tar = path.join(dest, 'snapshot.tar');
      fs.writeFileSync(tar, archive, { flag: 'wx' });
      run('tar', ['-xf', tar, '-C', dest]);
      sources.push({
        platform: 'android',
        device,
        file: path.join(dest, 'files/databases/user.sqlite'),
      });
    } catch (error) {
      unavailable.push({ platform: 'android', device, reason: error.message });
    }
  }
}
const corpus = {
  capturedAt: new Date().toISOString(),
  sources: [],
  unavailable,
};
for (const source of sources) {
  let db, shadow;
  try {
    db = new DatabaseSync(source.file, { readOnly: true });
    db.exec('BEGIN');
    if (Object.values(db.prepare('PRAGMA quick_check').get())[0] !== 'ok')
      throw Error('user integrity check failed');
    const hasReplayEvents = Boolean(
      db
        .prepare(
          "SELECT name FROM sqlite_schema WHERE type='table' AND name='game_replay_events'",
        )
        .get(),
    );
    const sessions = db
      .prepare('SELECT id,state_json FROM game_sessions ORDER BY id')
      .all()
      .map(row => ({
        id: row.id,
        state: JSON.parse(row.state_json),
        moves: db
          .prepare(
            'SELECT * FROM game_moves WHERE session_id=? ORDER BY sequence',
          )
          .all(row.id),
        replayEvents: hasReplayEvents
          ? db
              .prepare(
                'SELECT event_json FROM game_replay_events WHERE session_id=? ORDER BY revision',
              )
              .all(row.id)
              .map(event => JSON.parse(event.event_json))
          : undefined,
        records: [],
      }));
    const shadowFile = path.join(
      path.dirname(source.file),
      'behavior-shadow.sqlite',
    );
    if (fs.existsSync(shadowFile)) {
      shadow = new DatabaseSync(shadowFile, { readOnly: true });
      shadow.exec('BEGIN');
      if (Object.values(shadow.prepare('PRAGMA quick_check').get())[0] !== 'ok')
        throw Error('shadow integrity check failed');
      for (const s of sessions)
        s.records = shadow
          .prepare(
            'SELECT record_json FROM behavior_shadow_records WHERE session_id=? ORDER BY recorded_at_ms,rowid',
          )
          .all(s.id)
          .map(r => JSON.parse(r.record_json));
    }
    const digest = crypto
      .createHash('sha256')
      .update(JSON.stringify(sessions))
      .digest('hex');
    corpus.sources.push({
      ...source,
      digest,
      hasShadow: Boolean(shadow),
      sessions,
    });
  } catch (error) {
    unavailable.push({ ...source, reason: error.message });
  } finally {
    shadow?.close();
    db?.close();
  }
}
const file = path.join(directory, 'played-games.json.gz');
fs.writeFileSync(file, gzipSync(JSON.stringify(corpus)), { flag: 'wx' });
console.log(
  JSON.stringify(
    {
      file,
      sources: corpus.sources.map(({ sessions, ...s }) => ({
        ...s,
        sessions: sessions.length,
        moves: sessions.reduce((n, s) => n + s.moves.length, 0),
      })),
      unavailable,
    },
    null,
    2,
  ),
);
if (!corpus.sources.length || unavailable.length) process.exitCode = 1;
