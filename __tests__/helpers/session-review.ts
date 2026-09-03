import { BehaviorShadowRecord } from '../../src/application/technique-recognition/shadow-controller';
import {
  boardFromFingerprint,
  createSolverCandidates,
} from '../../src/domain/sudoku/board';
import { GrowthAnalysisRequest } from '../../src/domain/technique-recognition/contracts';

export const reviewBoard =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

export function reviewRequest(
  patch: Partial<GrowthAnalysisRequest> = {},
): GrowthAnalysisRequest {
  const board = boardFromFingerprint(reviewBoard);
  return {
    sessionId: 'review-game',
    segmentId: 'review-segment',
    requestId: 'review-request',
    startingRevision: 0,
    issuedRevision: 1,
    startingBoardFingerprint: reviewBoard,
    expectedBoardFingerprint: reviewBoard,
    growthCandidates: createSolverCandidates(board),
    givenCells: board.map(value => value !== null),
    observedEffects: [{ kind: 'elimination', cell: 2, digit: 1 }],
    hintAssistance: {
      appliedSources: [],
      knownSources: [],
      affectedEffects: [],
    },
    ...patch,
  };
}

export function reviewRecord(
  patch: Partial<BehaviorShadowRecord> = {},
): BehaviorShadowRecord {
  return {
    recordId: 'review-record',
    sessionId: 'review-game',
    segmentId: 'review-segment',
    recordedAtEpochMs: 1,
    phase: 'result',
    sourceCommandType: 'input_digit',
    request: reviewRequest(),
    responseStatus: 'matched',
    analysisDiagnostics: null,
    diagnostic: {
      segmentId: 'review-segment',
      finality: 'final',
      attribution: {
        automaticTechnique: 'nakedPair',
        selectedTechnique: null,
        candidateTechniques: [
          {
            technique: 'nakedPair',
            humanCost: 100,
            matchingOpportunityCount: 2,
            directPlacementMatch: false,
            oneHopPlacementMatch: false,
          },
        ],
        attributionEligibility: { status: 'eligible' },
      },
    },
    ...patch,
  };
}
