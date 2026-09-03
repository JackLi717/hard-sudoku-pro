import { BehaviorShadowRecord } from '../../src/application/technique-recognition/shadow-controller';
import {
  boardFromFingerprint,
  createBoardFingerprint,
  createSolverCandidates,
  intersectCandidateMasks,
  removeCandidate,
} from '../../src/domain/sudoku/board';
import {
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
  NormalizedPlayerEffect,
  TechniqueCandidateExplanation,
} from '../../src/domain/technique-recognition/contracts';

export const processBoard =
  '001800045005700902003060000800000000004300500057986204000290000500600021302107800';
const deletions = [
  { cell: 16, digit: 1 },
  { cell: 16, digit: 8 },
  { cell: 6, digit: 7 },
] as const;
export function processResponse(
  request: GrowthAnalysisRequest,
): GrowthAnalysisResponse {
  const source = request.startingRevision < 6;
  const candidates: TechniqueCandidateExplanation[] = [
    {
      technique: source ? 'hiddenPair' : 'hiddenSingle',
      humanCost: source ? 2053 : 204,
      matchingOpportunityCount: 1,
      directPlacementMatch: !source,
      oneHopPlacementMatch:
        source && request.observedEffects.some(e => e.kind === 'placement'),
      matchingOpportunities: [
        source
          ? {
              placements: [],
              eliminations: deletions.slice(request.startingRevision / 2),
            }
          : { placements: [{ cell: 10, digit: 8 }], eliminations: [] },
      ],
    },
  ];
  if (request.startingRevision === 2)
    candidates.push({
      technique: 'forcingNet',
      humanCost: 5190,
      matchingOpportunityCount: 1,
      directPlacementMatch: false,
      oneHopPlacementMatch: true,
      matchingOpportunities: [
        { placements: [], eliminations: [{ cell: 16, digit: 8 }] },
      ],
    });
  return {
    ...request,
    status: 'matched',
    candidateTechniques: candidates,
    diagnostics: {
      opportunityCount: candidates.length,
      opportunitySetComplete: true,
      usedExpandedSearch: false,
      reachedEnumerationLimitTechniques: [],
    },
  };
}

/** Actual R2C2=8 geometry; responses are explicit contract fixtures, not native truth. */
export function processReviewRecords(): BehaviorShadowRecord[] {
  const board = [...boardFromFingerprint(processBoard)];
  let masks = [...createSolverCandidates(board)];
  for (const cell of [55, 64, 23, 14, 5])
    masks[cell] = removeCandidate(masks[cell], 8);
  masks[73] = removeCandidate(masks[73], 9);
  const effects: NormalizedPlayerEffect[] = [
    ...deletions.map(e => ({ kind: 'elimination' as const, ...e })),
    { kind: 'placement', cell: 10, digit: 8 },
  ];
  return effects.map((effect, index) => {
    const startingBoardFingerprint = createBoardFingerprint(board);
    const growthCandidates = [...masks];
    if (effect.kind === 'elimination')
      masks[effect.cell] = removeCandidate(masks[effect.cell], effect.digit);
    else {
      board[effect.cell] = effect.digit;
      const legal = createSolverCandidates(board);
      masks = masks.map((mask, cell) =>
        intersectCandidateMasks(mask, legal[cell]),
      );
    }
    const request: GrowthAnalysisRequest = {
      requestId: `review-${index}`,
      sessionId: 'review-game',
      segmentId: `observer:segment-${index}`,
      startingRevision: index * 2,
      issuedRevision: index * 2 + 1,
      startingBoardFingerprint,
      expectedBoardFingerprint: createBoardFingerprint(board),
      growthCandidates,
      givenCells: [...processBoard].map(v => v !== '0'),
      observedEffects: [effect],
      hintAssistance: {
        exposureComplete: true,
        affectedEffects: [],
        appliedSources: [],
        knownSources: [],
      },
    };
    const response = processResponse(request);
    return {
      recordId: `record-${index}`,
      sessionId: 'review-game',
      segmentId: request.segmentId,
      recordedAtEpochMs: index * 5000,
      sourceCommandType: 'input_digit',
      phase: 'result',
      request,
      responseStatus: response.status,
      analysisDiagnostics: response.diagnostics,
      diagnostic: {
        segmentId: request.segmentId,
        finality: 'final',
        attribution: {
          candidateTechniques: response.candidateTechniques,
          automaticTechnique: response.candidateTechniques[0].technique,
          selectedTechnique: null,
          attributionEligibility: { status: 'eligible' },
        },
      },
    };
  });
}
