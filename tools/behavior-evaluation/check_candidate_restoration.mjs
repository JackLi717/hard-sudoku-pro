// Read-only native regression: pass the existing native_replay executable.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const executable = process.argv[2];
assert.ok(
  executable,
  'usage: node check_candidate_restoration.mjs <native_replay>',
);
const require = createRequire(import.meta.url);
const ts = require('typescript');
// Load the actual adapter and game reducer without Metro or a mobile runtime.
require.extensions['.ts'] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  module._compile(compiled.outputText, filename);
};
const domain = require('../../src/domain/index.ts');
const adapter = require('../../src/application/technique-recognition/behavior-adapter.ts');
const fixtures = require('../../__tests__/helpers/ipad-shadow-restoration.ts');
const direct = require('../../__tests__/helpers/ipad-direct-placement.ts');

function analyze(request) {
  const result = spawnSync(
    executable,
    [
      request.startingBoardFingerprint,
      request.growthCandidates.join(','),
      request.givenCells.map(value => (value ? '1' : '0')).join(''),
      request.observedEffects
        .map(
          effect =>
            `${effect.kind === 'placement' ? 'p' : 'e'}:${effect.cell}:${
              effect.digit
            }`,
        )
        .join(','),
    ],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
  return { ...request, ...JSON.parse(result.stdout) };
}

const report = [];
const cases = [
  ...fixtures.ipadCandidateRestorations.map(fixture => ({
    ...fixture,
    puzzle: fixtures.ipadShadowPuzzle,
    solution: fixtures.ipadShadowSolution,
    restoreExplicitly: true,
  })),
  ...direct.directPlacementCases.map(fixture => ({
    ...fixture,
    label: `direct R${Math.floor(fixture.cell / 9) + 1}C${
      (fixture.cell % 9) + 1
    }=${fixture.digit}`,
    puzzle: direct.directPlacementPuzzle,
    solution: direct.directPlacementSolution,
    restoreExplicitly: false,
  })),
];
for (const fixture of cases) {
  const definition = {
    puzzleId: 'ipad-restoration-regression',
    contentVersion: 4,
    difficultyLevel: 1,
    puzzleFingerprint: fixture.puzzle,
    solutionFingerprint: fixture.solution,
  };
  let session = domain.createGameSession({
    sessionId: 'regression',
    definition,
    startedAtEpochMs: 1_000,
  });
  const values = domain.boardFromFingerprint(fixture.board);
  session = {
    ...session,
    state: {
      ...session.state,
      values,
      selectedCell: fixture.cell,
      candidates: {
        ...session.state.candidates,
        pencilMode: true,
        activeCandidateSource: 'quick',
        quickCandidates: domain.createSolverCandidates(values),
      },
    },
  };
  let state = adapter.createBehaviorRecognitionState(session);
  let clock = 2_000;
  const act = command => {
    const result = domain.dispatchGameCommand(session, definition, command);
    assert.equal(result.accepted, true);
    const observation = adapter.observeAcceptedGameCommand(
      state,
      session,
      command,
      result,
    );
    state = observation.state;
    session = result.session;
    return observation;
  };
  const digit = () => ({
    type: 'input_digit',
    digit: fixture.digit,
    moveId: `move-${clock}`,
    atEpochMs: clock++,
  });
  const deletion = act(digit());
  const deletionResult = analyze(deletion.analysisRequest);
  assert.equal(deletionResult.status, 'no_match');
  state = adapter.finalizeBehaviorSegment(
    adapter.acceptBehaviorAnalysisResult(state, deletionResult, session).state,
  ).state;
  if (fixture.restoreExplicitly) {
    const restoration = act(digit());
    assert.equal(restoration.analysisRequest, null);
    assert.equal(
      restoration.diagnostics[0].attribution.attributionEligibility.reason,
      'restore_polluted',
    );
    assert.deepEqual(
      state.growthCandidates,
      domain.createSolverCandidates(session.state.values),
    );
  }
  act({ type: 'set_pencil_mode', enabled: false, atEpochMs: clock++ });
  const placement = act(digit());
  if (!fixture.restoreExplicitly) {
    assert.equal(
      placement.diagnostics[0].attribution.attributionEligibility.reason,
      'restore_polluted',
    );
  }
  assert.deepEqual(placement.analysisRequest.observedEffects, [
    { kind: 'placement', cell: fixture.cell, digit: fixture.digit },
  ]);
  const placementResult = analyze(placement.analysisRequest);
  assert.equal(placementResult.status, 'matched');
  const accepted = adapter.acceptBehaviorAnalysisResult(
    state,
    placementResult,
    session,
  );
  assert.equal(
    accepted.diagnostic.attribution.attributionEligibility.status,
    'eligible',
  );
  assert.equal(
    accepted.diagnostic.attribution.automaticTechnique,
    'hiddenSingle',
  );
  assert.deepEqual(
    placement.analysisRequest.growthCandidates,
    domain.createSolverCandidates(values),
  );
  report.push({
    fixture: fixture.label,
    deletion: deletionResult.status,
    restored: true,
    placement: placementResult.status,
    automaticTechnique: accepted.diagnostic.attribution.automaticTechnique,
  });
}
console.log(JSON.stringify(report, null, 2));
