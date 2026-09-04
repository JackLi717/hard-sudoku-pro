import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const [input, executable, output] = process.argv.slice(2);
if (!input || !executable || !output)
  throw Error(
    'Usage: node audit_growth.mjs corpus.gz native_replay output.json',
  );
const require = createRequire(import.meta.url),
  ts = require('typescript');
require.extensions['.ts'] = (m, f) =>
  m._compile(
    ts.transpileModule(fs.readFileSync(f, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    f,
  );
const {
  buildOpportunityProcesses,
  verifyOpportunityProcesses,
} = require('../../src/application/technique-recognition/opportunity-processes.ts');
const {
  projectGrowthSession,
} = require('../../src/application/technique-growth/projector.ts');
const {
  buildGrowthViewModel,
} = require('../../src/application/technique-growth/view-model.ts');
const {
  deserializeSession,
  deserializeReplayEvent,
} = require('../../src/data/user/game-serialization.ts');
const {
  buildSessionReplay,
} = require('../../src/application/game/session-replay.ts');
const {
  locateGrowthReference,
} = require('../../src/application/technique-growth/replay-reference.ts');
const corpus = JSON.parse(gunzipSync(fs.readFileSync(input)));
const original = JSON.stringify(corpus);
const projections = [];
const summaries = [];
const analyzer = {
  analyze: async q => {
    const run = spawnSync(
      executable,
      [
        q.startingBoardFingerprint,
        q.growthCandidates.join(','),
        q.givenCells.map(v => (v ? '1' : '0')).join(''),
        q.observedEffects
          .map(
            e => `${e.kind === 'placement' ? 'p' : 'e'}:${e.cell}:${e.digit}`,
          )
          .join(','),
      ],
      { encoding: 'utf8', timeout: 30000, maxBuffer: 32 * 1024 * 1024 },
    );
    if (run.status !== 0) throw Error(run.error?.message || run.stderr);
    return { ...q, ...JSON.parse(run.stdout) };
  },
};
for (const source of corpus.sources)
  for (const game of source.sessions) {
    const session = deserializeSession(
      JSON.stringify(game.state),
      game.moves.filter(m => m.active),
    );
    session.replayEvents = game.replayEvents?.map(e =>
      typeof e.event_json === 'string'
        ? deserializeReplayEvent(e.event_json)
        : e,
    );
    const report = await verifyOpportunityProcesses(
      buildOpportunityProcesses(game.records, game.id),
      analyzer,
    );
    const p = projectGrowthSession(session, game.records, [], report, 1);
    const repeat = projectGrowthSession(session, game.records, [], report, 2);
    assert.deepEqual(p.records, repeat.records);
    const apps = p.records.filter(r => r.kind === 'application');
    const replay = buildSessionReplay(session);
    assert(
      apps.every(r => locateGrowthReference(replay, r.reference)),
      'Application without recoverable source',
    );
    assert.equal(
      new Set(apps.map(r => r.reference.processId)).size,
      apps.length,
    );
    if (!report.enumerationComplete) assert.equal(apps.length, 0);
    projections.push(p);
    summaries.push({
      platform: source.platform,
      sessionId: game.id,
      coverage: p.coverage,
      applications: apps.length,
      learning: p.records.filter(r =>
        ['hint_viewed', 'hint_applied', 'walkthrough'].includes(r.kind),
      ).length,
      possible: p.records.filter(r => r.kind === 'possible').length,
      unknown: p.records.filter(r => r.kind === 'unknown').length,
      verifiedProcesses: report.verification?.attributed ?? 0,
    });
    console.log(
      `${source.platform} ${game.id}: ${apps.length} applications, ${p.coverage}`,
    );
  }
assert.equal(JSON.stringify(corpus), original, 'Original archive mutated');
const vm = buildGrowthViewModel(projections);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(
  output,
  JSON.stringify(
    {
      scope:
        'Dedicated growth projection audit using original saved evidence and fixed native process verification; no replay budget input or history synthesis.',
      sessions: summaries,
      profiles: vm.profiles.map(({ records, ...p }) => ({
        ...p,
        records: records.length,
      })),
      failures: 0,
      originalArchiveUnchanged: true,
    },
    null,
    2,
  ),
);
