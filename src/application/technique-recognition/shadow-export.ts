import { AttributionIneligibilityReason } from '../../domain/technique-recognition/contracts';
import {
  BehaviorReviewSample,
  BehaviorScenarioFamily,
  exportBehaviorReviewSamples,
} from './evaluation';
import { BehaviorShadowRecord } from './shadow-controller';

function scenarioFamily(
  reason: AttributionIneligibilityReason | null,
): BehaviorScenarioFamily {
  switch (reason) {
    case 'hint_polluted':
      return 'hint_counterexample';
    case 'undo_polluted':
      return 'undo_counterexample';
    case 'rapid_operation_polluted':
      return 'rapid_operation_counterexample';
    case 'restore_polluted':
      return 'restore_counterexample';
    default:
      return 'shadow_gameplay';
  }
}

export function behaviorShadowRecordsToReviewSamples(
  records: readonly BehaviorShadowRecord[],
): readonly BehaviorReviewSample[] {
  const evidenceBySegment = new Map<string, BehaviorShadowRecord>();
  const finalBySegment = new Map<string, BehaviorShadowRecord>();
  const segmentlessFinals: BehaviorShadowRecord[] = [];

  for (const record of records) {
    if (record.segmentId && record.request) {
      evidenceBySegment.set(record.segmentId, record);
    }
    const diagnostic = record.diagnostic;
    if (!diagnostic || diagnostic.finality !== 'final') {
      continue;
    }
    if (record.segmentId) {
      const existing = finalBySegment.get(record.segmentId);
      if (
        record.phase === 'invalidation' ||
        existing?.phase !== 'invalidation'
      ) {
        finalBySegment.set(record.segmentId, record);
      }
    } else {
      segmentlessFinals.push(record);
    }
  }

  const samples: BehaviorReviewSample[] = [];
  for (const record of [...finalBySegment.values(), ...segmentlessFinals]) {
    const diagnostic = record.diagnostic!;
    const evidence =
      record.request !== null
        ? record
        : record.segmentId
        ? evidenceBySegment.get(record.segmentId) ?? record
        : record;
    const eligibility = diagnostic.attribution.attributionEligibility;
    const reason =
      eligibility.status === 'ineligible' ? eligibility.reason : null;
    const sourceCommands = evidence.request
      ? evidence.request.observedEffects.map(
          effect => `input_digit:${effect.kind}:${effect.cell}:${effect.digit}`,
        )
      : [record.sourceCommandType ?? 'restore'];
    samples.push({
      sampleId: `shadow-${record.recordId}`,
      scenarioFamily: scenarioFamily(reason),
      sourceCommands,
      analysisRequest: evidence.request,
      analysisDiagnostics: evidence.analysisDiagnostics,
      systemAttribution: diagnostic.attribution,
      humanReview: {
        status: 'pending',
        shouldBeEligible: null,
        intendedTechnique: null,
        acceptableCandidateTechniques: [],
        notes: 'Pending review of locally captured shadow gameplay.',
      },
    });
  }
  return samples;
}

export function exportBehaviorShadowReviewSamples(
  records: readonly BehaviorShadowRecord[],
): string {
  return exportBehaviorReviewSamples(
    behaviorShadowRecordsToReviewSamples(records),
  );
}
