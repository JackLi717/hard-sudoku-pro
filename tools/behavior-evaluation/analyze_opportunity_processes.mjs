import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';

const [input, sessionId, executable, output] = process.argv.slice(2);
if (!input || !sessionId || !executable)
  throw new Error(
    'usage: node analyze_opportunity_processes.mjs <shadow.sqlite|records.json> <session-id> <native_replay> [new-report.json]',
  );
// Offline tooling only; TypeScript compilation and SQLite never enter app UI.
const require = createRequire(import.meta.url);
const ts = require('typescript');
const original = require.extensions['.ts'];
require.extensions['.ts'] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const {
  buildOpportunityProcesses,
  verifyOpportunityProcesses,
} = require('../../src/application/technique-recognition/opportunity-processes.ts');
if (original) require.extensions['.ts'] = original;
else delete require.extensions['.ts'];

let records;
if (path.extname(input) === '.json')
  records = JSON.parse(fs.readFileSync(input, 'utf8'));
else {
  const database = new DatabaseSync(input, { readOnly: true });
  try {
    records = database
      .prepare(
        'SELECT record_json FROM behavior_shadow_records WHERE session_id=? ORDER BY recorded_at_ms,rowid',
      )
      .all(sessionId)
      .map(row => JSON.parse(row.record_json));
  } finally {
    database.close();
  }
}
if (!Array.isArray(records))
  throw new Error('Input must be a shadow record array');
const graph = buildOpportunityProcesses(records, sessionId);
const verified = await verifyOpportunityProcesses(graph, {
  analyze: async request => {
    const run = spawnSync(
      executable,
      [
        request.startingBoardFingerprint,
        request.growthCandidates.join(','),
        request.givenCells.map(v => (v ? '1' : '0')).join(''),
        request.observedEffects
          .map(
            e => `${e.kind === 'placement' ? 'p' : 'e'}:${e.cell}:${e.digit}`,
          )
          .join(','),
      ],
      { encoding: 'utf8', timeout: 30_000, maxBuffer: 16 * 1024 * 1024 },
    );
    if (run.status !== 0) throw new Error(run.error?.message || run.stderr);
    return { ...request, ...JSON.parse(run.stdout) };
  },
});
const report = {
  sessionId,
  recordCount: records.length,
  scope:
    'Offline outcome association; overlapping explanations are not independent mastery counts.',
  ...verified,
};
const json = JSON.stringify(report, null, 2) + '\n';
if (output) {
  fs.writeFileSync(output, json, { flag: 'wx' });
  console.log(
    JSON.stringify({
      output,
      processes: report.processes.length,
      verified: report.processes.filter(p => p.attribution !== null).length,
      enumerationComplete: report.enumerationComplete,
      verification: report.verification,
    }),
  );
} else process.stdout.write(json);
