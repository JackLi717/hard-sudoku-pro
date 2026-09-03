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
  const activeSegmentKeys = new Map<string, string>();
  const segmentlessFinals: BehaviorShadowRecord[] = [];

  // Starting state also separates retained real-play evidence whose pre-fix
  // segment counters were reused. Equal timestamps retain capture order.
  for (const record of [...records].sort(
    (a, b) => a.recordedAtEpochMs - b.recordedAtEpochMs,
  )) {
    const identity = JSON.stringify([record.sessionId, record.segmentId]);
    const key = record.request
      ? JSON.stringify([
          record.sessionId,
          record.segmentId,
          record.request.startingRevision,
          record.request.startingBoardFingerprint,
        ])
      : activeSegmentKeys.get(identity) ?? identity;
    if (record.segmentId && record.request) {
      // Late responses must not redirect a later undo to an older incarnation.
      if (record.phase === 'request' || !activeSegmentKeys.has(identity)) {
        activeSegmentKeys.set(identity, key);
      }
      const existing = evidenceBySegment.get(key);
      if (
        !existing?.request ||
        record.request.issuedRevision >= existing.request.issuedRevision
      ) {
        evidenceBySegment.set(key, record);
      }
    }
    const diagnostic = record.diagnostic;
    if (!diagnostic || diagnostic.finality !== 'final') {
      continue;
    }
    if (
      record.phase === 'result' &&
      record.request &&
      record.request.issuedRevision <
        (evidenceBySegment.get(key)?.request?.issuedRevision ?? 0)
    ) {
      continue;
    }
    if (record.segmentId) {
      const existing = finalBySegment.get(key);
      if (
        record.phase === 'invalidation' ||
        (existing?.phase !== 'invalidation' &&
          (!existing?.request ||
            !record.request ||
            record.request.issuedRevision >= existing.request.issuedRevision))
      ) {
        finalBySegment.set(key, record);
      }
    } else {
      segmentlessFinals.push(record);
    }
  }

  const samples: BehaviorReviewSample[] = [];
  const finals: [string, BehaviorShadowRecord][] = [
    ...finalBySegment.entries(),
    ...segmentlessFinals.map(
      record => [record.recordId, record] as [string, BehaviorShadowRecord],
    ),
  ];
  for (const [key, record] of finals) {
    const diagnostic = record.diagnostic!;
    const evidence =
      record.request !== null
        ? record
        : record.segmentId
        ? evidenceBySegment.get(key) ?? record
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
