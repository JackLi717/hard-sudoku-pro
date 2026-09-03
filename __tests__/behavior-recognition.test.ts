import {
  acceptBehaviorAnalysisResult,
  createBehaviorRecognitionState,
  evaluateBehaviorReviewSamples,
  finalizeBehaviorSegment,
  invalidateForRestore,
  observeAcceptedGameCommand,
} from '../src/application';
import {
  GameCommand,
  GameDefinition,
  GameSession,
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
  TechniqueAttribution,
  createGameSession,
  createSolverCandidates,
  hasCandidate,
  boardFromFingerprint,
  dispatchGameCommand,
} from '../src/domain';
import {
  ipadCandidateRestorations,
  ipadShadowPuzzle,
  ipadShadowSolution,
} from './helpers/ipad-shadow-restoration';

const puzzle =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

const definition: GameDefinition = {
  puzzleId: 'recognition-puzzle',
  contentVersion: 4,
  difficultyLevel: 3,
  puzzleFingerprint: puzzle,
  solutionFingerprint: solution,
};

function game(): GameSession {
  return createGameSession({
    sessionId: 'recognition-session',
    definition,
    startedAtEpochMs: 1_000,
  });
}

function dispatch(session: GameSession, command: GameCommand) {
  const result = dispatchGameCommand(session, definition, command);
  expect(result.accepted).toBe(true);
  return result;
}

function select(session: GameSession, cell: number, atEpochMs: number) {
  return dispatch(session, { type: 'select_cell', cell, atEpochMs }).session;
}

function response(
  request: GrowthAnalysisRequest,
  overrides: Partial<GrowthAnalysisResponse> = {},
): GrowthAnalysisResponse {
  return {
    requestId: request.requestId,
    sessionId: request.sessionId,
    segmentId: request.segmentId,
    startingRevision: request.startingRevision,
    issuedRevision: request.issuedRevision,
    startingBoardFingerprint: request.startingBoardFingerprint,
    expectedBoardFingerprint: request.expectedBoardFingerprint,
    status: 'matched',
    candidateTechniques: [
      {
        technique: 'nakedSingle',
        humanCost: 100,
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
    ...overrides,
  };
}

describe('actual behavior recognition adapter', () => {
  test('ordinary note additions do not copy the UI grid or manufacture effects', () => {
    let session = select(game(), 2, 1_100);
    session = dispatch(session, {
      type: 'set_pencil_mode',
      enabled: true,
      atEpochMs: 1_200,
    }).session;
    const state = createBehaviorRecognitionState(session);
    const command: GameCommand = {
      type: 'input_digit',
      digit: 4,
      moveId: 'add-note',
      atEpochMs: 1_300,
    };
    const result = dispatch(session, command);
    const observed = observeAcceptedGameCommand(
      state,
      session,
      command,
      result,
    );
    expect(observed.state).toBe(state);
    expect(observed.analysisRequest).toBeNull();
    expect(observed.diagnostics).toEqual([]);
    expect(observed.state.growthCandidates).not.toEqual(
      result.session.state.candidates.manualCandidates,
    );
  });

  test('never reuses segment or request IDs after restoring the same revision', () => {
    const session = select(game(), 2, 1_100);
    const command: GameCommand = {
      type: 'input_digit',
      digit: 4,
      moveId: 'same-move',
      atEpochMs: 1_200,
    };
    const result = dispatch(session, command);
    const firstState = createBehaviorRecognitionState(session);
    const restored = invalidateForRestore(firstState, session).state;
    const first = observeAcceptedGameCommand(
      firstState,
      session,
      command,
      result,
    );
    const second = observeAcceptedGameCommand(
      restored,
      session,
      command,
      result,
    );
    expect(first.analysisRequest!.segmentId).not.toBe(
      second.analysisRequest!.segmentId,
    );
    expect(first.analysisRequest!.requestId).not.toBe(
      second.analysisRequest!.requestId,
    );
    expect(
      acceptBehaviorAnalysisResult(
        second.state,
        response(first.analysisRequest!),
        result.session,
      ).diagnostic.attribution.attributionEligibility,
    ).toEqual({ status: 'ineligible', reason: 'revision_expired' });
  });

  describe.each(ipadCandidateRestorations)(
    '$label real-play regression',
    fixture => {
      test.each(['quick', 'manual'] as const)(
        'rebuilds independent candidates after %s removal and re-addition',
        source => {
          const actualDefinition: GameDefinition = {
            ...definition,
            puzzleFingerprint: ipadShadowPuzzle,
            solutionFingerprint: ipadShadowSolution,
          };
          let session = createGameSession({
            sessionId: 'ipad-regression',
            definition: actualDefinition,
            startedAtEpochMs: 1_000,
          });
          const values = boardFromFingerprint(fixture.board);
          const baseline = createSolverCandidates(values);
          session = {
            ...session,
            state: {
              ...session.state,
              values,
              selectedCell: fixture.cell,
              candidates: {
                ...session.state.candidates,
                pencilMode: true,
                activeCandidateSource: source,
                manualCandidates: baseline,
                quickCandidates: baseline,
              },
            },
          };
          let state = createBehaviorRecognitionState(session);
          let clock = 2_000;
          const act = (command: GameCommand) => {
            const result = dispatchGameCommand(
              session,
              actualDefinition,
              command,
            );
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
          };
          const digitCommand = (): GameCommand => ({
            type: 'input_digit',
            digit: fixture.digit,
            moveId: `move-${clock}`,
            atEpochMs: clock++,
          });
          const removed = act(digitCommand());
          expect(
            hasCandidate(state.growthCandidates[fixture.cell], fixture.digit),
          ).toBe(false);
          // Real sessions settled before the player re-added the candidate.
          const analyzed = acceptBehaviorAnalysisResult(
            state,
            response(removed.analysisRequest!, {
              status: 'no_match',
              candidateTechniques: [],
            }),
            session,
          );
          state = finalizeBehaviorSegment(analyzed.state).state;
          const added = act(digitCommand());
          expect(added.analysisRequest).toBeNull();
          expect(added.diagnostics).toMatchObject([
            {
              segmentId: removed.analysisRequest!.segmentId,
              attribution: {
                automaticTechnique: null,
                attributionEligibility: {
                  status: 'ineligible',
                  reason: 'restore_polluted',
                },
              },
            },
          ]);
          expect(state.growthCandidates).toEqual(
            createSolverCandidates(session.state.values),
          );
          expect(state.growthCandidates).not.toBe(
            session.state.candidates.manualCandidates,
          );
          act({ type: 'set_pencil_mode', enabled: false, atEpochMs: clock++ });
          const placement = act(digitCommand());
          expect(placement.analysisRequest!.observedEffects).toEqual([
            { kind: 'placement', cell: fixture.cell, digit: fixture.digit },
          ]);
          expect(placement.analysisRequest!.segmentId).not.toBe(
            removed.analysisRequest!.segmentId,
          );
          expect(
            hasCandidate(
              placement.analysisRequest!.growthCandidates[fixture.cell],
              fixture.digit,
            ),
          ).toBe(true);
          expect(session.state.incorrectCells).toEqual([]);
        },
      );
    },
  );

  test('normalizes a placement without treating automatic candidate cleanup as eliminations', () => {
    let session = select(game(), 2, 1_100);
    const state = createBehaviorRecognitionState(session);
    const command: GameCommand = {
      type: 'input_digit',
      digit: 4,
      moveId: 'place-4',
      atEpochMs: 1_200,
    };
    const result = dispatch(session, command);
    const observed = observeAcceptedGameCommand(
      state,
      session,
      command,
      result,
    );

    expect(observed.analysisRequest?.observedEffects).toEqual([
      { kind: 'placement', cell: 2, digit: 4 },
    ]);
    expect(observed.state.growthCandidates).not.toBe(
      result.session.state.candidates.manualCandidates,
    );
  });

  test('ignores quick draft generation but recognizes a player deletion from it', () => {
    let session = game();
    let state = createBehaviorRecognitionState(session);
    const quickCommand: GameCommand = {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 1_100,
    };
    const quickResult = dispatch(session, quickCommand);
    const quickObservation = observeAcceptedGameCommand(
      state,
      session,
      quickCommand,
      quickResult,
    );
    expect(quickObservation.analysisRequest).toBeNull();
    state = quickObservation.state;
    session = select(quickResult.session, 2, 1_200);

    const removeCommand: GameCommand = {
      type: 'input_digit',
      digit: 1,
      moveId: 'remove-1',
      atEpochMs: 1_300,
    };
    const removeResult = dispatch(session, removeCommand);
    const removed = observeAcceptedGameCommand(
      state,
      session,
      removeCommand,
      removeResult,
    );
    expect(removed.analysisRequest?.observedEffects).toEqual([
      { kind: 'elimination', cell: 2, digit: 1 },
    ]);
    expect(removed.state.growthCandidates[2]).not.toBe(
      state.growthCandidates[2],
    );
    const provisional = acceptBehaviorAnalysisResult(
      removed.state,
      response(removed.analysisRequest!),
      removeResult.session,
    );
    expect(provisional.diagnostic.finality).toBe('provisional');
    expect(
      finalizeBehaviorSegment(provisional.state).diagnostic?.finality,
    ).toBe('final');
  });

  test('rejects stale async results and isolates hint and undo pollution', () => {
    let session = select(game(), 2, 1_100);
    let state = createBehaviorRecognitionState(session);
    const place: GameCommand = {
      type: 'input_digit',
      digit: 4,
      moveId: 'place-before-pollution',
      atEpochMs: 1_200,
    };
    const placed = dispatch(session, place);
    const observed = observeAcceptedGameCommand(state, session, place, placed);
    state = observed.state;
    const request = observed.analysisRequest!;

    const paused = dispatch(placed.session, {
      type: 'pause',
      atEpochMs: 1_300,
    }).session;
    expect(
      acceptBehaviorAnalysisResult(state, response(request), paused).diagnostic
        .attribution.attributionEligibility,
    ).toEqual({ status: 'ineligible', reason: 'revision_expired' });

    const undo = dispatch(placed.session, { type: 'undo', atEpochMs: 1_300 });
    const undoObservation = observeAcceptedGameCommand(
      state,
      placed.session,
      { type: 'undo', atEpochMs: 1_300 },
      undo,
    );
    expect(
      undoObservation.diagnostics[0].attribution.attributionEligibility,
    ).toEqual({ status: 'ineligible', reason: 'undo_polluted' });
  });

  test('isolates hint, restore, rapid operation and fingerprint pollution', () => {
    let session = select(game(), 2, 1_100);
    let state = createBehaviorRecognitionState(session);
    const place: GameCommand = {
      type: 'input_digit',
      digit: 4,
      moveId: 'first-placement',
      atEpochMs: 1_200,
    };
    const placed = dispatch(session, place);
    const first = observeAcceptedGameCommand(state, session, place, placed);
    state = first.state;

    const mismatched = response(first.analysisRequest!, {
      expectedBoardFingerprint: puzzle,
    });
    expect(
      acceptBehaviorAnalysisResult(state, mismatched, placed.session).diagnostic
        .attribution.attributionEligibility,
    ).toEqual({
      status: 'ineligible',
      reason: 'board_fingerprint_mismatch',
    });

    session = select(placed.session, 3, 1_250);
    const secondPlace: GameCommand = {
      type: 'input_digit',
      digit: 6,
      moveId: 'rapid-second-placement',
      atEpochMs: 1_300,
    };
    const secondPlaced = dispatch(session, secondPlace);
    const rapid = observeAcceptedGameCommand(
      state,
      session,
      secondPlace,
      secondPlaced,
    );
    expect(rapid.diagnostics[0].attribution.attributionEligibility).toEqual({
      status: 'ineligible',
      reason: 'rapid_operation_polluted',
    });

    const hint = dispatch(secondPlaced.session, {
      type: 'prepare_hint',
      atEpochMs: 1_400,
    });
    const hinted = observeAcceptedGameCommand(
      rapid.state,
      secondPlaced.session,
      { type: 'prepare_hint', atEpochMs: 1_400 },
      hint,
    );
    expect(hinted.diagnostics[0].attribution.attributionEligibility).toEqual({
      status: 'ineligible',
      reason: 'hint_polluted',
    });

    const restored = invalidateForRestore(rapid.state, secondPlaced.session);
    expect(restored.diagnostics[0].attribution.attributionEligibility).toEqual({
      status: 'ineligible',
      reason: 'restore_polluted',
    });
    expect(restored.state.segment).toBeNull();
  });
});

function attribution(
  automaticTechnique: TechniqueAttribution['automaticTechnique'],
  eligible = true,
  candidates = automaticTechnique ? [automaticTechnique] : [],
): TechniqueAttribution {
  return {
    candidateTechniques: candidates.map((technique, index) => ({
      technique,
      humanCost: 100 + index,
      directPlacementMatch: true,
      oneHopPlacementMatch: false,
      matchingOpportunityCount: 1,
    })),
    automaticTechnique,
    selectedTechnique: null,
    attributionEligibility: eligible
      ? { status: 'eligible' }
      : { status: 'ineligible', reason: 'hint_polluted' },
  };
}

describe('behavior truth evaluator', () => {
  test('reports recall, default accuracy, ambiguity, pollution and confusion', () => {
    const session = game();
    const request: GrowthAnalysisRequest = {
      requestId: 'r',
      sessionId: session.state.sessionId,
      segmentId: 's',
      startingRevision: 0,
      issuedRevision: 1,
      startingBoardFingerprint: puzzle,
      expectedBoardFingerprint: puzzle,
      growthCandidates:
        createBehaviorRecognitionState(session).growthCandidates,
      givenCells: session.state.givens.map(value => value !== null),
      observedEffects: [{ kind: 'elimination', cell: 2, digit: 1 }],
    };
    const report = evaluateBehaviorReviewSamples([
      {
        sampleId: 'fish-positive',
        scenarioFamily: 'fish',
        sourceCommands: ['input_digit'],
        analysisRequest: request,
        analysisDiagnostics: null,
        systemAttribution: attribution('xWing', true, ['xWing', 'swordfish']),
        humanReview: {
          status: 'reviewed',
          shouldBeEligible: true,
          intendedTechnique: 'xWing',
          acceptableCandidateTechniques: ['xWing', 'swordfish'],
          notes: '',
        },
      },
      {
        sampleId: 'hint-negative',
        scenarioFamily: 'hint_counterexample',
        sourceCommands: ['prepare_hint'],
        analysisRequest: request,
        analysisDiagnostics: null,
        systemAttribution: attribution(null, false),
        humanReview: {
          status: 'reviewed',
          shouldBeEligible: false,
          intendedTechnique: null,
          acceptableCandidateTechniques: [],
          notes: '',
        },
      },
    ]);

    expect(report.candidateRecallByTechnique.xWing?.recall).toBe(1);
    expect(report.defaultExplanationAccuracy).toBe(1);
    expect(report.ambiguityCount).toBe(1);
    expect(report.pollutionIsolationRate).toBe(1);
    expect(report.confusionMatrix.xWing.xWing).toBe(1);
    expect(report.confusionMatrix.none.none).toBe(1);
  });
});
