import {
  acceptBehaviorAnalysisResult,
  createBehaviorRecognitionState,
  finalizeBehaviorSegment,
  observeAcceptedGameCommand,
} from '../src/application/technique-recognition/behavior-adapter';
import {
  boardFromFingerprint,
  createSolverCandidates,
  createGameSession,
  dispatchGameCommand,
  GameCommand,
  GameDefinition,
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
} from '../src/domain';
import {
  directPlacementCases,
  directPlacementPuzzle,
  directPlacementSolution,
} from './helpers/ipad-direct-placement';

const definition: GameDefinition = {
  puzzleId: 'direct-placement',
  contentVersion: 4,
  difficultyLevel: 2,
  puzzleFingerprint: directPlacementPuzzle,
  solutionFingerprint: directPlacementSolution,
};
function noMatch(request: GrowthAnalysisRequest): GrowthAnalysisResponse {
  return {
    ...request,
    status: 'no_match',
    candidateTechniques: [],
    diagnostics: {
      opportunityCount: 0,
      opportunitySetComplete: true,
      usedExpandedSearch: false,
      reachedEnumerationLimitTechniques: [],
    },
  };
}

describe.each(directPlacementCases)(
  'real direct placement at cell $cell',
  fixture => {
    describe.each(['manual', 'quick'] as const)('%s candidates', source => {
      test.each(['pending', 'provisional', 'settled'] as const)(
        'retracts %s deletion and starts a clean placement',
        phase => {
          let session = createGameSession({
            sessionId: 'regression',
            definition,
            startedAtEpochMs: 1_000,
          });
          const values = boardFromFingerprint(fixture.board);
          const candidates = createSolverCandidates(values);
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
                manualCandidates: candidates,
                quickCandidates: candidates,
              },
            },
          };
          let state = createBehaviorRecognitionState(session);
          const act = (command: GameCommand) => {
            const result = dispatchGameCommand(session, definition, command);
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
          const deletion = act({
            type: 'input_digit',
            digit: fixture.digit,
            moveId: 'delete',
            atEpochMs: 2_000,
          });
          if (phase !== 'pending') {
            state = acceptBehaviorAnalysisResult(
              state,
              noMatch(deletion.analysisRequest!),
              session,
            ).state;
          }
          if (phase === 'settled') {
            state = finalizeBehaviorSegment(state).state;
          }
          act({ type: 'set_pencil_mode', enabled: false, atEpochMs: 3_000 });
          const placement = act({
            type: 'input_digit',
            digit: fixture.digit,
            moveId: 'place',
            atEpochMs: 4_000,
          });
          expect(placement.diagnostics).toMatchObject([
            {
              segmentId: deletion.analysisRequest!.segmentId,
              attribution: {
                automaticTechnique: null,
                attributionEligibility: {
                  status: 'ineligible',
                  reason: 'restore_polluted',
                },
              },
            },
          ]);
          expect(placement.analysisRequest!.segmentId).not.toBe(
            deletion.analysisRequest!.segmentId,
          );
          expect(placement.analysisRequest!.startingBoardFingerprint).toBe(
            fixture.board,
          );
          expect(placement.analysisRequest!.growthCandidates).toEqual(
            candidates,
          );
          expect(placement.analysisRequest!.observedEffects).toEqual([
            { kind: 'placement', cell: fixture.cell, digit: fixture.digit },
          ]);
          expect(session.state.incorrectCells).toEqual([]);
          const late = acceptBehaviorAnalysisResult(
            state,
            noMatch(deletion.analysisRequest!),
            session,
          );
          expect(late.state).toBe(state);
          expect(late.diagnostic.attribution.attributionEligibility).toEqual({
            status: 'ineligible',
            reason: 'revision_expired',
          });
        },
      );
    });
  },
);
