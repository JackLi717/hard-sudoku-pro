// Read-only end-to-end regression using the real game reducer, adapter and C++.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const executable = process.argv[2];
assert.ok(executable, 'usage: node check_hint_assistance.mjs <native_replay>');
const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
};
const domain = require('../../src/domain/index.ts');
const adapter = require('../../src/application/technique-recognition/behavior-adapter.ts');
const {
  kiteGame,
  kiteHint,
  kiteDefinition,
} = require('../../__tests__/helpers/ipad-hint-assistance.ts');

function analyze(request) {
  const run = spawnSync(
    executable,
    [
      request.startingBoardFingerprint,
      request.growthCandidates.join(','),
      request.givenCells.map(v => (v ? '1' : '0')).join(''),
      request.observedEffects
        .map(e => `${e.kind === 'placement' ? 'p' : 'e'}:${e.cell}:${e.digit}`)
        .join(','),
    ],
    { encoding: 'utf8' },
  );
  assert.equal(run.status, 0, run.stderr);
  return { ...request, ...JSON.parse(run.stdout) };
}

const report = [];
for (const restore of [false, true]) {
  let session = kiteGame();
  let state = adapter.createBehaviorRecognitionState(session);
  let now = 2_000;
  function act(command) {
    const result = domain.dispatchGameCommand(session, kiteDefinition, {
      ...command,
      atEpochMs: now++,
    });
    assert.equal(result.accepted, true, result.reason);
    const observation = adapter.observeAcceptedGameCommand(
      state,
      session,
      command,
      result,
    );
    state = observation.state;
    session = result.session;
    return observation;
  }
  act({ type: 'reveal_hint', step: kiteHint, availableCredits: 1 });
  act({ type: 'apply_hint', moveId: 'kite' });
  if (restore) {
    state = adapter.createBehaviorRecognitionState(session);
  }
  act({ type: 'select_cell', cell: 77 });
  const request = act({
    type: 'input_digit',
    digit: 3,
    moveId: 'follow-up',
  }).analysisRequest;
  assert.equal(domain.hasCandidate(request.growthCandidates[32], 3), false);
  const result = analyze(request);
  assert.equal(result.status, 'matched');
  assert.equal(result.candidateTechniques[0].technique, 'hiddenSingle');
  const accepted = adapter.acceptBehaviorAnalysisResult(state, result, session);
  state = accepted.state;
  assert.deepEqual(accepted.diagnostic.attribution.attributionEligibility, {
    status: 'ineligible',
    reason: 'hint_polluted',
  });
  assert.equal(accepted.diagnostic.attribution.automaticTechnique, null);
  act({ type: 'complete_full_house', cell: 32, moveId: 'full-house' });
  act({ type: 'select_cell', cell: 76 });
  const laterRequest = act({
    type: 'input_digit',
    digit: 8,
    moveId: 'later',
  }).analysisRequest;
  const later = adapter.acceptBehaviorAnalysisResult(
    state,
    analyze(laterRequest),
    session,
  );
  assert.equal(later.diagnostic.attribution.automaticTechnique, null);
  assert.equal(
    later.diagnostic.attribution.attributionEligibility.status,
    'ineligible',
  );
  assert.ok(
    laterRequest.hintAssistance.knownSources.some(source =>
      source.dependentEffects?.some(
        d => d.effect.cell === 76 && d.effect.digit === 8,
      ),
    ),
  );
  report.push({
    restore,
    candidate: result.candidateTechniques[0].technique,
    eligibility: accepted.diagnostic.attribution.attributionEligibility,
    laterAutomaticTechnique: later.diagnostic.attribution.automaticTechnique,
  });
}
console.log(JSON.stringify(report, null, 2));
