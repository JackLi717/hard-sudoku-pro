import {
  acceptBehaviorAnalysisResult,
  createBehaviorRecognitionState,
  invalidateForRestore,
  observeAcceptedGameCommand,
} from '../src/application/technique-recognition/behavior-adapter';
import { replayBehaviorReviewSamples } from '../src/application/technique-recognition/evaluation';
import {
  dispatchGameCommand,
  GameCommand,
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
  hasCandidate,
} from '../src/domain';
import {
  kiteDefinition,
  kiteGame,
  kiteHint,
} from './helpers/ipad-hint-assistance';

function matched(request: GrowthAnalysisRequest): GrowthAnalysisResponse {
  return {
    ...request,
    status: 'matched',
    candidateTechniques: [
      {
        technique: 'hiddenSingle',
        humanCost: 1100,
        directPlacementMatch: true,
        oneHopPlacementMatch: false,
        matchingOpportunityCount: 1,
      },
    ],
    diagnostics: {
      opportunityCount: 1,
      opportunitySetComplete: true,
      usedExpandedSearch: false,
      reachedEnumerationLimitTechniques: [],
    },
  };
}

function harness() {
  let session = kiteGame();
  let state = createBehaviorRecognitionState(session);
  let now = 2_000;
  const act = (command: GameCommand) => {
    const result = dispatchGameCommand(session, kiteDefinition, command);
    expect(result.accepted).toBe(true);
    const observation = observeAcceptedGameCommand(
      state,
      session,
      command,
      result,
    );
    session = result.session;
    state = observation.state;
    return observation;
  };
  const show = () =>
    act({
      type: 'reveal_hint',
      step: kiteHint,
      availableCredits: 1,
      atEpochMs: now++,
    });
  const apply = () =>
    act({ type: 'apply_hint', moveId: `hint-${now}`, atEpochMs: now++ });
  const place = (cell: number, digit: 3 | 8 | 9) => {
    act({ type: 'select_cell', cell, atEpochMs: now++ });
    return act({
      type: 'input_digit',
      digit,
      moveId: `place-${now}`,
      atEpochMs: now++,
    });
  };
  return {
    act,
    show,
    apply,
    place,
    get session() {
      return session;
    },
    get state() {
      return state;
    },
    restore() {
      state = createBehaviorRecognitionState(session);
    },
    accept(request: GrowthAnalysisRequest) {
      const result = acceptBehaviorAnalysisResult(
        state,
        matched(request),
        session,
      );
      state = result.state;
      return result.diagnostic;
    },
  };
}

test.each([false, true])(
  'real kite follow-up is assisted, including restore=%s',
  restore => {
    const h = harness();
    h.show();
    expect(hasCandidate(h.state.growthCandidates[32], 3)).toBe(true);
    h.apply();
    if (restore) {
      h.restore();
    }
    expect(hasCandidate(h.state.growthCandidates[32], 3)).toBe(false);
    const request = h.place(77, 3).analysisRequest!;
    expect(hasCandidate(request.growthCandidates[32], 3)).toBe(false);
    expect(request.hintAssistance?.affectedEffects).toEqual([
      { kind: 'placement', cell: 77, digit: 3 },
    ]);
    const diagnostic = h.accept(request);
    expect(diagnostic.attribution).toMatchObject({
      candidateTechniques: [{ technique: 'hiddenSingle' }],
      automaticTechnique: null,
      selectedTechnique: null,
      attributionEligibility: { status: 'ineligible', reason: 'hint_polluted' },
    });
    h.act({
      type: 'complete_full_house',
      cell: 32,
      moveId: 'full-house',
      atEpochMs: 4_000,
    });
    const next = h.place(76, 8).analysisRequest!;
    expect(next.hintAssistance?.affectedEffects).toEqual([
      { kind: 'placement', cell: 76, digit: 8 },
    ]);
    expect(h.accept(next).attribution.attributionEligibility.status).toBe(
      'ineligible',
    );
  },
);

test('pause, quick draft and unrelated placement retain hint eliminations', () => {
  const h = harness();
  h.show();
  h.apply();
  h.act({ type: 'pause', atEpochMs: 3_000 });
  h.act({ type: 'resume', atEpochMs: 3_001 });
  h.act({
    type: 'generate_quick_draft',
    confirmed: false,
    availableCredits: 1,
    atEpochMs: 3_002,
  });
  h.act({ type: 'set_pencil_mode', enabled: false, atEpochMs: 3_003 });
  const unrelated = h.place(27, 9).analysisRequest!;
  expect(unrelated.hintAssistance?.affectedEffects).toEqual([]);
  h.accept(unrelated);
  expect(hasCandidate(h.state.growthCandidates[32], 3)).toBe(false);
  expect(
    h.place(77, 3).analysisRequest!.hintAssistance?.affectedEffects,
  ).toHaveLength(1);
});

test.each(['dismiss', 'undo'] as const)(
  '%s removes no logical candidate but does not erase exposure',
  mode => {
    const h = harness();
    h.show();
    if (mode === 'undo') {
      h.apply();
      h.act({ type: 'undo', atEpochMs: 3_000 });
    } else {
      h.act({ type: 'dismiss_hint', atEpochMs: 3_000 });
    }
    expect(hasCandidate(h.state.growthCandidates[32], 3)).toBe(true);
    const request = h.place(77, 3).analysisRequest!;
    expect(h.accept(request).attribution.attributionEligibility).toEqual({
      status: 'ineligible',
      reason: 'hint_polluted',
    });
  },
);

test('hint invalidates pending native results', () => {
  const h = harness();
  const before = h.place(27, 9).analysisRequest!;
  // Undo returns to the exact fixture board; the old async response stays stale.
  h.act({ type: 'undo', atEpochMs: 3_000 });
  h.show();
  h.apply();
  const late = acceptBehaviorAnalysisResult(
    h.state,
    matched(before),
    h.session,
  );
  expect(late.diagnostic.attribution.attributionEligibility).toEqual({
    status: 'ineligible',
    reason: 'revision_expired',
  });
});

test('erasing a hint premise discards its candidate exclusions, including after reattach', () => {
  const h = harness();
  h.show();
  h.apply();
  h.act({ type: 'select_cell', cell: 0, atEpochMs: 3_000 });
  h.act({ type: 'erase', moveId: 'erase-premise', atEpochMs: 3_001 });
  expect(h.state.appliedHintSources).toEqual([]);
  expect(hasCandidate(h.state.growthCandidates[32], 3)).toBe(true);
  h.restore();
  expect(h.state.appliedHintSources).toEqual([]);
});

test('restoring in the same observation does not forget a dismissed hint', () => {
  const h = harness();
  h.show();
  h.act({ type: 'dismiss_hint', atEpochMs: 3_000 });
  const restored = invalidateForRestore(h.state, h.session).state;
  expect(restored.knownHintSources).toEqual(h.state.knownHintSources);
  expect(restored.observationId).not.toBe(h.state.observationId);
  expect(restored.appliedHintSources).toEqual([]);
});

test('wrong input reset and its undo retain applied hint exclusions', () => {
  const h = harness();
  h.show();
  h.apply();
  const wrong = h.place(27, 3);
  expect(wrong.analysisRequest).toBeNull();
  expect(wrong.diagnostics[0].attribution.attributionEligibility).toEqual({
    status: 'ineligible',
    reason: 'invalid_effect',
  });
  expect(hasCandidate(h.state.growthCandidates[32], 3)).toBe(false);
  h.act({ type: 'undo', atEpochMs: 3_000 });
  expect(hasCandidate(h.state.growthCandidates[32], 3)).toBe(false);
});

test('offline replay preserves assistance instead of restoring independent attribution', async () => {
  const h = harness();
  h.show();
  h.apply();
  const request = h.place(77, 3).analysisRequest!;
  const attribution = h.accept(request).attribution;
  const [sample] = await replayBehaviorReviewSamples(
    [
      {
        sampleId: 'kite',
        scenarioFamily: 'hint_counterexample',
        sourceCommands: ['apply_hint', 'input_digit'],
        analysisRequest: request,
        analysisDiagnostics: null,
        systemAttribution: attribution,
        humanReview: {
          status: 'pending',
          shouldBeEligible: null,
          intendedTechnique: null,
          acceptableCandidateTechniques: [],
          notes: '',
        },
      },
    ],
    { analyze: async input => matched(input) },
  );
  expect(sample.systemAttribution).toEqual(attribution);
});
