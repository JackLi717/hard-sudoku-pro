import {
  BoardFingerprint,
  CandidateGrid,
  CandidateRef,
  CellIndex,
  Digit,
} from '../sudoku/contracts';
import { TechniqueCode } from '../hints/techniques';

export type NormalizedPlayerEffect = {
  kind: 'placement' | 'elimination';
  cell: CellIndex;
  digit: Digit;
};

export type HintAssistanceSource = {
  sourceId: string;
  boardFingerprint: BoardFingerprint;
  technique: TechniqueCode;
  eliminations: readonly CandidateRef[];
  placements: readonly CandidateRef[];
  assistedEffects: readonly NormalizedPlayerEffect[];
  /** New singles enabled by accepted, source-dependent moves; not imagined play. */
  dependentEffects?: readonly {
    effect: NormalizedPlayerEffect;
    via: readonly NormalizedPlayerEffect[];
    moveId: string;
    beforeBoardFingerprint: BoardFingerprint;
    afterBoardFingerprint: BoardFingerprint;
  }[];
};

export type HintAssistanceContext = {
  /** False forbids independent attribution even if the missing hint is unknown. */
  exposureComplete?: boolean;
  appliedSources: readonly HintAssistanceSource[];
  knownSources: readonly HintAssistanceSource[];
  affectedEffects: readonly NormalizedPlayerEffect[];
};

export type TechniqueOpportunityEvidence = {
  placements: readonly CandidateRef[];
  eliminations: readonly CandidateRef[];
};

export type TechniqueCandidateExplanation = {
  technique: TechniqueCode;
  humanCost: number;
  directPlacementMatch: boolean;
  oneHopPlacementMatch: boolean;
  matchingOpportunityCount: number;
  /** Full normalized outcomes, not just this player's partial effects. */
  matchingOpportunities?: readonly TechniqueOpportunityEvidence[];
};

export type AttributionIneligibilityReason =
  | 'incomplete_opportunity_set'
  | 'hint_polluted'
  | 'undo_polluted'
  | 'restore_polluted'
  | 'revision_expired'
  | 'board_fingerprint_mismatch'
  | 'rapid_operation_polluted'
  | 'invalid_effect'
  | 'analysis_cancelled'
  | 'analysis_failed';

export type AttributionEligibility =
  | { status: 'eligible' }
  | {
      status: 'ineligible';
      reason: AttributionIneligibilityReason;
    };

export type TechniqueAttribution = {
  candidateTechniques: readonly TechniqueCandidateExplanation[];
  automaticTechnique: TechniqueCode | null;
  selectedTechnique: TechniqueCode | null;
  attributionEligibility: AttributionEligibility;
};

export type GrowthAnalysisRequest = {
  requestId: string;
  sessionId: string;
  segmentId: string;
  startingRevision: number;
  issuedRevision: number;
  startingBoardFingerprint: BoardFingerprint;
  expectedBoardFingerprint: BoardFingerprint;
  growthCandidates: CandidateGrid;
  givenCells: readonly boolean[];
  observedEffects: readonly NormalizedPlayerEffect[];
  /** Adapter provenance; native search still receives only board and effects. */
  hintAssistance?: HintAssistanceContext;
};

export type GrowthAnalysisDiagnostics = {
  opportunityCount: number;
  opportunitySetComplete: boolean;
  usedExpandedSearch: boolean;
  reachedEnumerationLimitTechniques: readonly TechniqueCode[];
};

export type GrowthAnalysisResponse = {
  requestId: string;
  sessionId: string;
  segmentId: string;
  startingRevision: number;
  issuedRevision: number;
  startingBoardFingerprint: BoardFingerprint;
  expectedBoardFingerprint: BoardFingerprint;
  status:
    | 'matched'
    | 'no_match'
    | 'incomplete_opportunity_set'
    | 'invalid_input'
    | 'cancelled'
    | 'failed';
  candidateTechniques: readonly TechniqueCandidateExplanation[];
  diagnostics: GrowthAnalysisDiagnostics;
};

export interface TechniqueOpportunityAnalyzer {
  analyze(
    request: GrowthAnalysisRequest,
    options?: { signal?: AbortSignal },
  ): Promise<GrowthAnalysisResponse>;
}

export function attributionFromAnalysis(
  response: GrowthAnalysisResponse,
  request?: Pick<GrowthAnalysisRequest, 'hintAssistance'>,
): TechniqueAttribution {
  const reason =
    response.status === 'incomplete_opportunity_set'
      ? 'incomplete_opportunity_set'
      : response.status === 'cancelled'
      ? 'analysis_cancelled'
      : response.status === 'invalid_input'
      ? 'invalid_effect'
      : response.status === 'failed'
      ? 'analysis_failed'
      : request?.hintAssistance?.exposureComplete === false ||
        request?.hintAssistance?.affectedEffects.length
      ? 'hint_polluted'
      : null;
  if (reason !== null) {
    return {
      candidateTechniques: response.candidateTechniques,
      automaticTechnique: null,
      selectedTechnique: null,
      attributionEligibility: { status: 'ineligible', reason },
    };
  }

  return {
    candidateTechniques: response.candidateTechniques,
    automaticTechnique: response.candidateTechniques[0]?.technique ?? null,
    selectedTechnique: null,
    attributionEligibility: { status: 'eligible' },
  };
}
