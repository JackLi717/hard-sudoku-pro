import { Spec as NativeHintEngineModule } from '../src/native/NativeHintEngine';

jest.mock('../src/native/NativeHintEngine', () => ({
  __esModule: true,
  default: {},
}));

import { ReactNativeTechniqueOpportunityAnalyzer } from '../src/domain/technique-recognition/native-analyzer';
import { GrowthAnalysisRequest } from '../src/domain/technique-recognition/contracts';

const board =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';

function nativeModule(
  explainOpportunityEffects: NativeHintEngineModule['explainOpportunityEffects'],
) {
  return {
    explainOpportunityEffects,
    nextStep: jest.fn(),
    cancel: jest.fn(),
  } as unknown as NativeHintEngineModule;
}

function request(): GrowthAnalysisRequest {
  return {
    requestId: 'growth-1',
    sessionId: 'session-1',
    segmentId: 'segment-1',
    startingRevision: 2,
    issuedRevision: 3,
    startingBoardFingerprint: board,
    expectedBoardFingerprint: board,
    growthCandidates: Array.from({ length: 81 }, () => 1),
    givenCells: [...board].map(value => value !== '0'),
    observedEffects: [{ kind: 'elimination', cell: 2, digit: 1 }],
  };
}

describe('native opportunity analyzer adapter', () => {
  test('encodes effects and preserves all ordered candidates', async () => {
    const explain = jest.fn(async () =>
      JSON.stringify({
        status: 'matched',
        candidateTechniques: [
          {
            technique: 'xWing',
            humanCost: 400,
            directPlacementMatch: false,
            oneHopPlacementMatch: false,
            matchingOpportunityCount: 2,
          },
          {
            technique: 'swordfish',
            humanCost: 500,
            directPlacementMatch: false,
            oneHopPlacementMatch: false,
            matchingOpportunityCount: 1,
          },
        ],
        diagnostics: {
          opportunityCount: 3,
          opportunitySetComplete: true,
          reachedEnumerationLimitTechniques: [],
        },
      }),
    );
    const result = await new ReactNativeTechniqueOpportunityAnalyzer(
      nativeModule(explain),
    ).analyze(request());

    expect(explain).toHaveBeenCalledWith(
      'growth-1',
      board,
      request().growthCandidates.join(','),
      request()
        .givenCells.map(value => (value ? '1' : '0'))
        .join(''),
      'e:2:1',
    );
    expect(result.candidateTechniques.map(value => value.technique)).toEqual([
      'xWing',
      'swordfish',
    ]);
  });

  test('turns malformed native output into a failed diagnostic result', async () => {
    const result = await new ReactNativeTechniqueOpportunityAnalyzer(
      nativeModule(jest.fn(async () => '{}')),
    ).analyze(request());
    expect(result.status).toBe('failed');
    expect(result.candidateTechniques).toEqual([]);
  });
});
