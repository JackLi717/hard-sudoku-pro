import { spawnSync } from 'node:child_process';
const capture = spawnSync(
  process.execPath,
  ['tools/behavior-evaluation/capture_played_games.mjs', '--android', '--ios'],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
);
process.stdout.write(capture.stdout ?? '');
process.stderr.write(capture.stderr ?? '');
if (capture.status !== 0) process.exit(capture.status ?? 1);
const { file } = JSON.parse(capture.stdout);
const run = spawnSync(
  process.execPath,
  ['tools/behavior-evaluation/run_played_games.mjs', '--corpus', file],
  { stdio: 'inherit' },
);
process.exitCode = run.status ?? 1;
