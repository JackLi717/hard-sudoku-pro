import {
  boardFromFingerprint,
  isCandidateGrid,
} from '../../domain/sudoku/board';
import {
  AttributionIneligibilityReason,
  GrowthAnalysisRequest,
  TechniqueAttribution,
} from '../../domain/technique-recognition/contracts';
import { BehaviorShadowRecord } from './shadow-controller';
import { behaviorShadowRecordsToReviewSamples } from './shadow-export';

/** Read-only diagnostic access. Never writes game progress or growth data. */
export interface SessionReviewSource {
  readSession(sessionId: string): Promise<readonly BehaviorShadowRecord[]>;
  subscribe(listener: (sessionId: string | null) => void): () => void;
}

export type SessionReviewEntry = {
  id: string;
  request: GrowthAnalysisRequest | null;
  attribution: TechniqueAttribution | null;
  status: 'explained' | 'hint_assisted' | 'invalidated' | 'insufficient';
  reason:
    | null
    | AttributionIneligibilityReason
    | 'missing_request'
    | 'missing_hint_source'
    | 'no_match'
    | 'unfinished';
  hintSourceMissing: boolean;
};

function requestKey(request: GrowthAnalysisRequest): string {
  return JSON.stringify([
    request.sessionId,
    request.segmentId,
    request.startingRevision,
    request.startingBoardFingerprint,
  ]);
}

function hasBoardEvidence(request: GrowthAnalysisRequest): boolean {
  try {
    boardFromFingerprint(request.startingBoardFingerprint);
    return (
      isCandidateGrid(request.growthCandidates) &&
      request.givenCells.length === 81 &&
      request.givenCells.every(value => typeof value === 'boolean')
    );
  } catch {
    return false;
  }
}

export function buildSessionReview(
  records: readonly BehaviorShadowRecord[],
  sessionId: string,
): readonly SessionReviewEntry[] {
  const local = records.filter(
    record =>
      record.sessionId === sessionId &&
      (!record.request || record.request.sessionId === sessionId),
  );
  const requests = new Map<string, GrowthAnalysisRequest>();
  const order = new Map<string, number>();
  for (const record of [...local].sort(
    (a, b) => a.recordedAtEpochMs - b.recordedAtEpochMs,
  )) {
    if (!record.request) {
      continue;
    }
    const key = requestKey(record.request);
    if (!order.has(key)) {
      order.set(key, order.size);
    }
    if (
      record.request.issuedRevision >= (requests.get(key)?.issuedRevision ?? -1)
    ) {
      requests.set(key, record.request);
    }
  }

  const entries: SessionReviewEntry[] = [];
  for (const sample of behaviorShadowRecordsToReviewSamples(local)) {
    const evidence = sample.analysisRequest;
    const id = evidence ? requestKey(evidence) : sample.sampleId;
    if (
      evidence &&
      (requests.get(id)?.issuedRevision ?? -1) > evidence.issuedRevision
    ) {
      continue;
    }
    requests.delete(id);
    const request = evidence && hasBoardEvidence(evidence) ? evidence : null;
    const attribution = sample.systemAttribution;
    const eligibility = attribution.attributionEligibility;
    const hintSourceMissing = !request?.hintAssistance;
    const reason =
      eligibility.status === 'ineligible'
        ? eligibility.reason
        : !request
        ? 'missing_request'
        : hintSourceMissing
        ? 'missing_hint_source'
        : request.hintAssistance!.affectedEffects.length > 0
        ? 'hint_polluted'
        : attribution.automaticTechnique
        ? null
        : 'no_match';
    // Do not promote old saved attribution when provenance is absent, or when
    // retained hint evidence contradicts it. This view never re-runs attribution.
    const status =
      reason === 'hint_polluted'
        ? 'hint_assisted'
        : eligibility.status === 'ineligible'
        ? 'invalidated'
        : !request || hintSourceMissing
        ? 'insufficient'
        : attribution.automaticTechnique
        ? 'explained'
        : 'insufficient';
    entries.push({
      id,
      request,
      attribution,
      status,
      reason,
      hintSourceMissing,
    });
  }
  // Completion can precede the final asynchronous diagnostic write. Keep these
  // requests visible as unfinished; never present provisional matches as final.
  for (const [id, evidence] of requests) {
    entries.push({
      id,
      request: hasBoardEvidence(evidence) ? evidence : null,
      attribution: null,
      status: 'insufficient',
      reason: 'unfinished',
      hintSourceMissing: !evidence.hintAssistance,
    });
  }
  return entries.sort(
    (a, b) =>
      (order.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (order.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}
