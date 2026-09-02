import { TechniqueCode } from '../../domain/hints/techniques';
import {
  GrowthAnalysisDiagnostics,
  GrowthAnalysisRequest,
  TechniqueAttribution,
  TechniqueOpportunityAnalyzer,
  attributionFromAnalysis,
} from '../../domain/technique-recognition/contracts';

export type BehaviorScenarioFamily =
  | 'subset'
  | 'fish'
  | 'chain'
  | 'coloring'
  | 'placement_closure'
  | 'technique_catalog'
  | 'shadow_gameplay'
  | 'hint_counterexample'
  | 'undo_counterexample'
  | 'restore_counterexample'
  | 'auto_pencil_counterexample'
  | 'rapid_operation_counterexample';

export type BehaviorReviewSample = {
  sampleId: string;
  scenarioFamily: BehaviorScenarioFamily;
  reviewSeedTechnique?: TechniqueCode;
  sourceCommands: readonly string[];
  analysisRequest: GrowthAnalysisRequest | null;
  analysisDiagnostics: GrowthAnalysisDiagnostics | null;
  systemAttribution: TechniqueAttribution;
  humanReview:
    | {
        status: 'pending';
        shouldBeEligible: null;
        intendedTechnique: null;
        acceptableCandidateTechniques: readonly TechniqueCode[];
        notes: string;
      }
    | {
        status: 'reviewed' | 'proxy_reviewed';
        shouldBeEligible: boolean;
        intendedTechnique: TechniqueCode | null;
        acceptableCandidateTechniques: readonly TechniqueCode[];
        notes: string;
      };
};

export type TechniqueCandidateRecall = {
  expected: number;
  recalled: number;
  recall: number | null;
};

export type BehaviorEvaluationReport = {
  sampleCount: number;
  reviewedSampleCount: number;
  humanReviewedSampleCount: number;
  proxyReviewedSampleCount: number;
  pendingReviewCount: number;
  eligiblePositiveCount: number;
  candidateRecallByTechnique: Partial<
    Record<TechniqueCode, TechniqueCandidateRecall>
  >;
  defaultExplanationAccuracy: number | null;
  misattributionCount: number;
  misattributionRate: number | null;
  missedAttributionCount: number;
  missedAttributionRate: number | null;
  ambiguityCount: number;
  ambiguityRate: number | null;
  pollutionIsolationCount: number;
  pollutionIsolationTotal: number;
  pollutionIsolationRate: number | null;
  confusionMatrix: Record<string, Record<string, number>>;
};

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export function exportBehaviorReviewSamples(
  samples: readonly BehaviorReviewSample[],
): string {
  return `${JSON.stringify(samples, null, 2)}\n`;
}

export async function replayBehaviorReviewSamples(
  samples: readonly BehaviorReviewSample[],
  analyzer: TechniqueOpportunityAnalyzer,
): Promise<readonly BehaviorReviewSample[]> {
  return Promise.all(
    samples.map(async sample =>
      sample.analysisRequest === null
        ? sample
        : {
            ...sample,
            ...(await analyzer.analyze(sample.analysisRequest).then(result => ({
              systemAttribution: attributionFromAnalysis(result),
              analysisDiagnostics: result.diagnostics,
            }))),
          },
    ),
  );
}

export function evaluateBehaviorReviewSamples(
  samples: readonly BehaviorReviewSample[],
): BehaviorEvaluationReport {
  const candidateRecallByTechnique: BehaviorEvaluationReport['candidateRecallByTechnique'] =
    {};
  const confusionMatrix: BehaviorEvaluationReport['confusionMatrix'] = {};
  let eligiblePositiveCount = 0;
  let defaultCorrect = 0;
  let misattributionCount = 0;
  let missedAttributionCount = 0;
  let ambiguityCount = 0;
  let pollutionIsolationCount = 0;
  let pollutionIsolationTotal = 0;
  let reviewedSampleCount = 0;
  let humanReviewedSampleCount = 0;
  let proxyReviewedSampleCount = 0;

  for (const sample of samples) {
    const { humanReview, systemAttribution } = sample;
    if (humanReview.status === 'pending') {
      continue;
    }
    reviewedSampleCount += 1;
    if (humanReview.status === 'proxy_reviewed') {
      proxyReviewedSampleCount += 1;
    } else {
      humanReviewedSampleCount += 1;
    }
    const actual = systemAttribution.automaticTechnique ?? 'none';
    const expected = humanReview.intendedTechnique ?? 'none';
    confusionMatrix[expected] ??= {};
    confusionMatrix[expected][actual] =
      (confusionMatrix[expected][actual] ?? 0) + 1;

    if (humanReview.intendedTechnique === null) {
      pollutionIsolationTotal += 1;
      if (
        systemAttribution.automaticTechnique === null &&
        (humanReview.shouldBeEligible
          ? systemAttribution.attributionEligibility.status === 'eligible'
          : systemAttribution.attributionEligibility.status === 'ineligible')
      ) {
        pollutionIsolationCount += 1;
      } else {
        misattributionCount += 1;
      }
      continue;
    }

    if (!humanReview.shouldBeEligible) {
      misattributionCount += 1;
      continue;
    }
    eligiblePositiveCount += 1;
    const technique = humanReview.intendedTechnique;
    const recall = candidateRecallByTechnique[technique] ?? {
      expected: 0,
      recalled: 0,
      recall: null,
    };
    recall.expected += 1;
    if (
      systemAttribution.candidateTechniques.some(
        candidate => candidate.technique === technique,
      )
    ) {
      recall.recalled += 1;
    }
    candidateRecallByTechnique[technique] = recall;

    if (systemAttribution.automaticTechnique === technique) {
      defaultCorrect += 1;
    }
    if (systemAttribution.automaticTechnique === null) {
      missedAttributionCount += 1;
    } else if (
      !humanReview.acceptableCandidateTechniques.includes(
        systemAttribution.automaticTechnique,
      )
    ) {
      misattributionCount += 1;
    }
    if (systemAttribution.candidateTechniques.length > 1) {
      ambiguityCount += 1;
    }
  }

  for (const recall of Object.values(candidateRecallByTechnique)) {
    if (recall) {
      recall.recall = ratio(recall.recalled, recall.expected);
    }
  }

  return {
    sampleCount: samples.length,
    reviewedSampleCount,
    humanReviewedSampleCount,
    proxyReviewedSampleCount,
    pendingReviewCount: samples.length - reviewedSampleCount,
    eligiblePositiveCount,
    candidateRecallByTechnique,
    defaultExplanationAccuracy: ratio(defaultCorrect, eligiblePositiveCount),
    misattributionCount,
    misattributionRate: ratio(misattributionCount, reviewedSampleCount),
    missedAttributionCount,
    missedAttributionRate: ratio(missedAttributionCount, eligiblePositiveCount),
    ambiguityCount,
    ambiguityRate: ratio(ambiguityCount, eligiblePositiveCount),
    pollutionIsolationCount,
    pollutionIsolationTotal,
    pollutionIsolationRate: ratio(
      pollutionIsolationCount,
      pollutionIsolationTotal,
    ),
    confusionMatrix,
  };
}
