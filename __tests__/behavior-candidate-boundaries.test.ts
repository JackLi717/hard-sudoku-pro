import { spawnSync } from 'node:child_process';
import {
  acceptBehaviorAnalysisResult,
  createBehaviorRecognitionState,
  finalizeBehaviorSegment,
  invalidateForRestore,
  observeAcceptedGameCommand,
} from '../src/application/technique-recognition/behavior-adapter';
import {
  boardFromFingerprint,
  attributionFromAnalysis,
  createBoardFingerprint,
  createGameSession,
  createSolverCandidates,
  dispatchGameCommand,
  digitsFromMask,
  Digit,
  GameCommand,
  GameDefinition,
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
  HintStep,
  hasCandidate,
} from '../src/domain';

// Snapshot from session-1788427345446-09ifcnhz before moves 69 and 110.
const definition: GameDefinition = {
  puzzleId: 'hsp-f872a45990345b4c276f',
  contentVersion: 4,
  difficultyLevel: 3,
  puzzleFingerprint:
    '008002049060310000000000030300074000007001900106020500000000405920000000000000607',
  solutionFingerprint:
    '738562149462319758591487236359674812247851963186923574673198425925746381814235697',
};
const beforeHints =
  '738002149060310050000000036300074000007001900106020570670000405925706300000005607';
const beforeFullHouse =
  '738002149462319758591400236359074812247001963186923574673100425925746381814235697';

function harness(board = beforeHints) {
  const initial = createGameSession({
    sessionId: 'candidate-boundaries',
    definition,
    startedAtEpochMs: 1000,
  });
  const values = boardFromFingerprint(board);
  let session = {
    ...initial,
    state: {
      ...initial.state,
      values,
      candidates: {
        ...initial.state.candidates,
        manualCandidates: createSolverCandidates(values),
      },
    },
  };
  let state = createBehaviorRecognitionState(session);
  let now = 2000;
  function act(command: GameCommand) {
    const result = dispatchGameCommand(session, definition, command);
    expect(result.accepted).toBe(true);
    const observed = observeAcceptedGameCommand(
      state,
      session,
      command,
      result,
    );
    session = result.session;
    state = observed.state;
    return observed;
  }
  function input(cell: number, digit: Digit, pencilMode = true) {
    act({ type: 'select_cell', cell, atEpochMs: now++ });
    act({ type: 'set_pencil_mode', enabled: pencilMode, atEpochMs: now++ });
    return act({
      type: 'input_digit',
      digit,
      moveId: `move-${now}`,
      atEpochMs: now++,
    });
  }
  function show(
    cell: number,
    digit: Digit,
    techniqueCode: HintStep['techniqueCode'] = 'nakedSingle',
  ) {
    return act({
      type: 'reveal_hint',
      step: {
        contractVersion: 1,
        boardFingerprint: createBoardFingerprint(session.state.values),
        techniqueCode,
        difficultyLevel: 1,
        focusCells: [cell],
        focusRegions: [],
        premiseCandidates: [{ cell, digit }],
        eliminations: [],
        placements: [{ cell, digit }],
        explanationKey: `hint.${techniqueCode}`,
        explanationParams: {},
      },
      availableCredits: 10,
      atEpochMs: now++,
    });
  }
  return {
    act,
    input,
    show,
    finishSegment: () => {
      state = finalizeBehaviorSegment(state).state;
    },
    apply: () =>
      act({ type: 'apply_hint', moveId: `hint-${now}`, atEpochMs: now++ }),
    get state() {
      return state;
    },
    get session() {
      return session;
    },
  };
}

function checkNative(request: GrowthAnalysisRequest, expected: string) {
  const executable = process.env.BEHAVIOR_NATIVE_REPLAY;
  if (!executable) return; // The mandatory segment-lifecycle stage supplies native.
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
    { encoding: 'utf8', timeout: 30_000 },
  );
  expect(run.status).toBe(0);
  const response: GrowthAnalysisResponse = {
    ...request,
    ...JSON.parse(run.stdout),
  };
  expect(response.diagnostics.opportunitySetComplete).toBe(true);
  expect(response.candidateTechniques[0].technique).toBe(expected);
  expect(attributionFromAnalysis(response, request)).toMatchObject({
    automaticTechnique: expected,
    attributionEligibility: { status: 'eligible' },
  });
}

test.each([false, true])(
  'two hints retain R3C5 -5; R5C5 -3/-8 is a hidden pair, separated=%s',
  separated => {
    const h = harness();
    const deletion = h.input(22, 5);
    expect(
      h.show(67, 4).diagnostics[0].attribution.attributionEligibility,
    ).toEqual({ status: 'ineligible', reason: 'hint_polluted' });
    expect(h.state.candidateRemovalSegments).toEqual(
      deletion.state.candidateRemovalSegments,
    );
    h.apply();
    h.show(21, 4, 'hiddenSingle');
    h.apply();
    expect(digitsFromMask(h.state.growthCandidates[22])).toEqual([8, 9]);
    for (const digit of [3, 8] as const) {
      const observed = h.input(40, digit);
      expect(
        hasCandidate(observed.analysisRequest!.growthCandidates[22], 5),
      ).toBe(false);
      checkNative(observed.analysisRequest!, 'hiddenPair');
      if (separated) h.finishSegment();
    }
  },
);

test('pause and resume preserve recorded deletions while ending the segment', () => {
  const h = harness();
  h.input(22, 5);
  const expected = h.state.growthCandidates;
  h.act({ type: 'pause', atEpochMs: 3000 });
  h.act({ type: 'resume', atEpochMs: 4000 });
  expect(h.state.growthCandidates).toEqual(expected);
  expect(h.state.candidateRemovalSegments['22:5']).toBeDefined();
  expect(h.state.segment).toBeNull();
});

test('an assisted placement contradicting a recorded deletion resets candidate facts', () => {
  const h = harness();
  h.input(22, 5);
  h.input(67, 4); // Deliberately incorrect deletion, later contradicted by the hint.
  h.show(67, 4);
  h.apply();
  expect(h.state.candidateRemovalSegments).toEqual({});
  expect(hasCandidate(h.state.growthCandidates[22], 5)).toBe(true);
  expect(h.state.segment).toBeNull();
});

test('full-house assistance retains R5C5 -8, so R5C5 =5 is a naked single', () => {
  const h = harness(beforeFullHouse);
  h.input(40, 8);
  const assisted = h.act({
    type: 'complete_full_house',
    cell: 30,
    moveId: 'full-house',
    atEpochMs: 3000,
  });
  expect(assisted.analysisRequest).toBeNull();
  expect(assisted.diagnostics[0].attribution.attributionEligibility).toEqual({
    status: 'ineligible',
    reason: 'hint_polluted',
  });
  expect(digitsFromMask(h.state.growthCandidates[40])).toEqual([5]);
  checkNative(h.input(40, 5, false).analysisRequest!, 'nakedSingle');
});

test('a deleted candidate added back after a hint still retracts its original evidence', () => {
  const h = harness();
  const original = h.input(22, 5).state.segment!.id;
  h.show(67, 4);
  h.apply();
  const restored = h.input(22, 5);
  expect(restored.analysisRequest).toBeNull();
  expect(restored.diagnostics).toContainEqual(
    expect.objectContaining({
      segmentId: original,
      attribution: expect.objectContaining({
        attributionEligibility: {
          status: 'ineligible',
          reason: 'restore_polluted',
        },
      }),
    }),
  );
  expect(hasCandidate(h.state.growthCandidates[22], 5)).toBe(true);
});

test('undo and observer restore do not retain old player deletion facts', () => {
  const h = harness();
  h.input(22, 5);
  expect(
    hasCandidate(
      invalidateForRestore(h.state, h.session).state.growthCandidates[22],
      5,
    ),
  ).toBe(true);
  h.act({ type: 'undo', atEpochMs: 3000 });
  expect(h.state.candidateRemovalSegments).toEqual({});
  expect(hasCandidate(h.state.growthCandidates[22], 5)).toBe(true);
});

test('shown placements remain assisted and cannot revive an interrupted response', () => {
  const h = harness();
  const old = h.input(22, 5).analysisRequest!;
  h.show(67, 4);
  h.act({ type: 'dismiss_hint', atEpochMs: 3000 });
  const placement = h.input(67, 4, false).analysisRequest!;
  const response: GrowthAnalysisResponse = {
    ...placement,
    status: 'matched',
    candidateTechniques: [],
    diagnostics: {
      opportunityCount: 0,
      opportunitySetComplete: true,
      usedExpandedSearch: false,
      reachedEnumerationLimitTechniques: [],
    },
  };
  expect(
    acceptBehaviorAnalysisResult(h.state, response, h.session).diagnostic
      .attribution.attributionEligibility,
  ).toEqual({ status: 'ineligible', reason: 'hint_polluted' });
  const stale = acceptBehaviorAnalysisResult(
    h.state,
    { ...response, ...old },
    h.session,
  );
  expect(stale.state).toBe(h.state);
  expect(stale.diagnostic.attribution.automaticTechnique).toBeNull();
});
