import NativeHintEngine, {
  Spec as NativeHintEngineModule,
} from '../../native/NativeHintEngine';
import { TECHNIQUES, TechniqueCode } from '../hints/techniques';
import {
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
  TechniqueCandidateExplanation,
  TechniqueOpportunityAnalyzer,
} from './contracts';

const TECHNIQUE_CODES = new Set<string>(
  TECHNIQUES.map(technique => technique.code),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTechniqueCode(value: unknown): value is TechniqueCode {
  return typeof value === 'string' && TECHNIQUE_CODES.has(value);
}

function isCandidate(value: unknown): value is TechniqueCandidateExplanation {
  return (
    isRecord(value) &&
    isTechniqueCode(value.technique) &&
    typeof value.humanCost === 'number' &&
    typeof value.directPlacementMatch === 'boolean' &&
    typeof value.oneHopPlacementMatch === 'boolean' &&
    typeof value.matchingOpportunityCount === 'number'
  );
}

function parseNativeExplanation(
  encoded: string,
): Pick<
  GrowthAnalysisResponse,
  'status' | 'candidateTechniques' | 'diagnostics'
> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(encoded);
  } catch {
    throw new Error('The native opportunity analyzer returned invalid JSON.');
  }
  if (
    !isRecord(parsed) ||
    ![
      'matched',
      'no_match',
      'incomplete_opportunity_set',
      'invalid_input',
      'cancelled',
    ].includes(String(parsed.status)) ||
    !Array.isArray(parsed.candidateTechniques) ||
    !parsed.candidateTechniques.every(isCandidate) ||
    !isRecord(parsed.diagnostics) ||
    typeof parsed.diagnostics.opportunityCount !== 'number' ||
    typeof parsed.diagnostics.opportunitySetComplete !== 'boolean' ||
    typeof parsed.diagnostics.usedExpandedSearch !== 'boolean' ||
    !Array.isArray(parsed.diagnostics.reachedEnumerationLimitTechniques) ||
    !parsed.diagnostics.reachedEnumerationLimitTechniques.every(isTechniqueCode)
  ) {
    throw new Error(
      'The native opportunity analyzer returned an invalid result.',
    );
  }
  return parsed as Pick<
    GrowthAnalysisResponse,
    'status' | 'candidateTechniques' | 'diagnostics'
  >;
}

function encodeEffects(request: GrowthAnalysisRequest): string {
  return request.observedEffects
    .map(
      effect =>
        `${effect.kind === 'placement' ? 'p' : 'e'}:${effect.cell}:${
          effect.digit
        }`,
    )
    .join(',');
}

export class ReactNativeTechniqueOpportunityAnalyzer
  implements TechniqueOpportunityAnalyzer
{
  constructor(
    private readonly nativeModule: NativeHintEngineModule = NativeHintEngine,
  ) {}

  async analyze(
    request: GrowthAnalysisRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<GrowthAnalysisResponse> {
    if (options.signal?.aborted) {
      return this.response(request, 'cancelled');
    }
    const cancel = () => this.nativeModule.cancel(request.requestId);
    options.signal?.addEventListener('abort', cancel, { once: true });
    try {
      const encoded = await this.nativeModule.explainOpportunityEffects(
        request.requestId,
        request.startingBoardFingerprint,
        request.growthCandidates.join(','),
        request.givenCells.map(value => (value ? '1' : '0')).join(''),
        encodeEffects(request),
      );
      const native = parseNativeExplanation(encoded);
      if (options.signal?.aborted) {
        return this.response(request, 'cancelled');
      }
      return {
        requestId: request.requestId,
        sessionId: request.sessionId,
        segmentId: request.segmentId,
        startingRevision: request.startingRevision,
        issuedRevision: request.issuedRevision,
        startingBoardFingerprint: request.startingBoardFingerprint,
        expectedBoardFingerprint: request.expectedBoardFingerprint,
        ...native,
      };
    } catch {
      return this.response(request, 'failed');
    } finally {
      options.signal?.removeEventListener('abort', cancel);
    }
  }

  private response(
    request: GrowthAnalysisRequest,
    status: 'cancelled' | 'failed',
  ): GrowthAnalysisResponse {
    return {
      requestId: request.requestId,
      sessionId: request.sessionId,
      segmentId: request.segmentId,
      startingRevision: request.startingRevision,
      issuedRevision: request.issuedRevision,
      startingBoardFingerprint: request.startingBoardFingerprint,
      expectedBoardFingerprint: request.expectedBoardFingerprint,
      status,
      candidateTechniques: [],
      diagnostics: {
        opportunityCount: 0,
        opportunitySetComplete: false,
        usedExpandedSearch: false,
        reachedEnumerationLimitTechniques: [],
      },
    };
  }
}
