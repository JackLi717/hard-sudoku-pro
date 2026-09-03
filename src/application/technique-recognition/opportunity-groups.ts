import {
  boardFromFingerprint,
  createSolverCandidates,
  hasCandidate,
  intersectCandidateMasks,
  isCandidateGrid,
  isCellIndex,
  isDigit,
  removeCandidate,
} from '../../domain/sudoku/board';
import {
  GrowthAnalysisRequest,
  TechniqueOpportunityEvidence,
} from '../../domain/technique-recognition/contracts';
import { BehaviorShadowRecord } from './shadow-controller';
import { behaviorShadowRecordsToReviewSamples } from './shadow-export';
import { sameEffect, singles } from './hint-assistance';

export type OpportunityMembership = {
  sampleId: string;
  segmentId: string;
  opportunityIds: readonly string[];
  status: 'resolved' | 'ambiguous' | 'missing_evidence' | 'ineligible';
};

export type TechniqueOpportunityGroup = {
  id: string;
  anchor: GrowthAnalysisRequest;
  evidence: TechniqueOpportunityEvidence;
  sampleIds: readonly string[];
  /** At most one record per group may contribute; this is not a mastery score. */
  representativeSampleId: string | null;
};

function key(evidence: TechniqueOpportunityEvidence): string {
  return JSON.stringify([
    evidence.placements.map(e => `${e.cell}:${e.digit}`).sort(),
    evidence.eliminations.map(e => `${e.cell}:${e.digit}`).sort(),
  ]);
}

function usableEvidence(
  request: GrowthAnalysisRequest,
  outcomes: readonly TechniqueOpportunityEvidence[],
): boolean {
  try {
    boardFromFingerprint(request.startingBoardFingerprint);
    return (
      isCandidateGrid(request.growthCandidates) &&
      request.givenCells.length === 81 &&
      outcomes.every(
        outcome =>
          outcome.placements.length + outcome.eliminations.length > 0 &&
          [...outcome.placements, ...outcome.eliminations].every(
            e => isCellIndex(e.cell) && isDigit(e.digit),
          ),
      )
    );
  } catch {
    return false;
  }
}

function extendsAnchor(
  anchor: GrowthAnalysisRequest,
  next: GrowthAnalysisRequest,
): boolean {
  return (
    anchor.sessionId === next.sessionId &&
    anchor.startingRevision <= next.startingRevision &&
    anchor.givenCells.every((v, i) => v === next.givenCells[i]) &&
    [...anchor.startingBoardFingerprint].every(
      (v, i) => v === '0' || v === next.startingBoardFingerprint[i],
    )
  );
}

function closure(group: TechniqueOpportunityGroup) {
  const { anchor, evidence } = group;
  const board = [...boardFromFingerprint(anchor.startingBoardFingerprint)];
  for (const p of evidence.placements) board[p.cell] = p.digit;
  const legal = createSolverCandidates(board);
  const after = anchor.growthCandidates.map((mask, cell) =>
    intersectCandidateMasks(mask, legal[cell]),
  );
  for (const e of evidence.eliminations)
    after[e.cell] = removeCandidate(after[e.cell], e.digit);
  const before = singles(anchor.growthCandidates);
  return singles(after).filter(e => !before.some(b => sameEffect(b, e)));
}

function continues(
  group: TechniqueOpportunityGroup,
  request: GrowthAnalysisRequest,
  evidence: TechniqueOpportunityEvidence,
): boolean {
  if (!extendsAnchor(group.anchor, request)) return false;
  const board = boardFromFingerprint(request.startingBoardFingerprint);
  const remaining = {
    placements: group.evidence.placements.filter(e => board[e.cell] === null),
    eliminations: group.evidence.eliminations.filter(e =>
      hasCandidate(request.growthCandidates[e.cell], e.digit),
    ),
  };
  if (key(remaining) === key(evidence)) return true;
  // A directly enabled single is part of the same outcome, not another use of
  // the advanced technique. Only the original one-hop closure is considered.
  return (
    evidence.eliminations.length === 0 &&
    evidence.placements.length > 0 &&
    remaining.eliminations.length === 0 &&
    evidence.placements.every(e =>
      closure(group).some(p => p.cell === e.cell && p.digit === e.digit),
    )
  );
}

/** Shared attribution projection: no UI heuristics, no writes or native reruns.
 * Exact full outcomes (including residuals) define operational opportunities.
 * Multiple possible identities remain ambiguous; never use transitive union.
 */
export function buildTechniqueOpportunityGroups(
  records: readonly BehaviorShadowRecord[],
  sessionId: string,
): {
  groups: readonly TechniqueOpportunityGroup[];
  memberships: readonly OpportunityMembership[];
} {
  const local = records.filter(
    r =>
      r.sessionId === sessionId &&
      (!r.request || r.request.sessionId === sessionId),
  );
  const groups: TechniqueOpportunityGroup[] = [];
  const memberships: OpportunityMembership[] = [];
  const samples = [...behaviorShadowRecordsToReviewSamples(local)].sort(
    (a, b) =>
      (a.analysisRequest?.startingRevision ?? 0) -
      (b.analysisRequest?.startingRevision ?? 0),
  );
  for (const sample of samples) {
    const request = sample.analysisRequest;
    if (!request) continue;
    const attribution = sample.systemAttribution;
    // Even invalidated records may retain native evidence for grouping. This
    // lookup never restores their eligibility or their automatic explanation.
    const saved = [...local]
      .reverse()
      .find(
        r =>
          r.request?.requestId === request.requestId &&
          r.phase === 'result' &&
          r.diagnostic?.attribution.candidateTechniques.length,
      );
    const candidates = attribution.candidateTechniques.length
      ? attribution.candidateTechniques
      : saved?.diagnostic?.attribution.candidateTechniques ?? [];
    const candidate =
      candidates.find(c => c.technique === attribution.automaticTechnique) ??
      candidates[0];
    const evidence = candidate?.matchingOpportunities;
    const eligible =
      attribution.attributionEligibility.status === 'eligible' &&
      attribution.automaticTechnique !== null &&
      request.hintAssistance !== undefined &&
      request.hintAssistance.exposureComplete !== false &&
      request.hintAssistance.affectedEffects.length === 0;
    if (
      !evidence?.length ||
      !usableEvidence(request, evidence) ||
      evidence.length !== candidate?.matchingOpportunityCount ||
      sample.analysisDiagnostics?.opportunitySetComplete !== true
    ) {
      memberships.push({
        sampleId: sample.sampleId,
        segmentId: request.segmentId,
        opportunityIds: [],
        status: eligible ? 'missing_evidence' : 'ineligible',
      });
      continue;
    }
    const ids = new Set<string>();
    for (const outcome of evidence) {
      const matches = groups.filter(g => continues(g, request, outcome));
      if (matches.length) {
        for (const match of matches) ids.add(match.id);
      } else {
        const id = JSON.stringify([sessionId, request.segmentId, key(outcome)]);
        groups.push({
          id,
          anchor: request,
          evidence: outcome,
          sampleIds: [],
          representativeSampleId: null,
        });
        ids.add(id);
      }
    }
    const status = !eligible
      ? 'ineligible'
      : ids.size === 1
      ? 'resolved'
      : 'ambiguous';
    memberships.push({
      sampleId: sample.sampleId,
      segmentId: request.segmentId,
      opportunityIds: [...ids],
      status,
    });
    for (let i = 0; i < groups.length; i++) {
      if (!ids.has(groups[i].id)) continue;
      groups[i] = {
        ...groups[i],
        sampleIds: [...groups[i].sampleIds, sample.sampleId],
      };
    }
  }
  // Invalidation dominates a whole opportunity, including earlier fragments.
  // Ambiguous memberships are never counted, nor used to join separate groups.
  for (let i = 0; i < groups.length; i++) {
    const linked = memberships.filter(m =>
      m.opportunityIds.includes(groups[i].id),
    );
    groups[i] = {
      ...groups[i],
      representativeSampleId: linked.some(m => m.status === 'ineligible')
        ? null
        : linked.find(m => m.status === 'resolved')?.sampleId ?? null,
    };
  }
  return { groups, memberships };
}
