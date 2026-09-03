import {
  boardFromFingerprint,
  createBoardFingerprint,
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
  GrowthAnalysisResponse,
  NormalizedPlayerEffect,
  TechniqueAttribution,
  TechniqueOpportunityAnalyzer,
  TechniqueOpportunityEvidence,
  attributionFromAnalysis,
} from '../../domain/technique-recognition/contracts';
import { TECHNIQUES, TechniqueCode } from '../../domain/hints/techniques';
import { BehaviorShadowRecord } from './shadow-controller';
import { behaviorShadowRecordsToReviewSamples } from './shadow-export';
import { sameEffect, singles } from './hint-assistance';

export type OpportunityProcess = {
  id: string;
  anchor: GrowthAnalysisRequest;
  evidence: TechniqueOpportunityEvidence;
  seedTechniques: readonly TechniqueCode[];
  members: {
    sampleId: string;
    effects: readonly NormalizedPlayerEffect[];
    locallyMatched: boolean;
    localAttribution: TechniqueAttribution;
  }[];
  /** Execution links are not additional independent uses of the seed technique. */
  followUps: {
    sampleId: string;
    effect: NormalizedPlayerEffect;
    relation: 'new_single' | 'already_available_single';
    prerequisite: {
      basis: 'observed_effects' | 'unobserved_effects' | 'already_available';
      /** Sufficient recorded source effects, not a claim of minimal proof. */
      effects: readonly NormalizedPlayerEffect[];
    };
  }[];
  observedEffects: NormalizedPlayerEffect[];
  remainingEffects: readonly NormalizedPlayerEffect[];
  completion: 'partial' | 'complete';
  endedBy: 'boundary' | null;
  overlaps: string[];
  /** Null until the entire observed outcome is rechecked against its anchor. */
  attribution: TechniqueAttribution | null;
};

export type OpportunityProcessReport = {
  processes: OpportunityProcess[];
  diagnostics: { sampleId: string | null; reason: string }[];
  enumerationComplete: boolean;
  /** Published only by whole-process verification; never replaces local records. */
  placementExplanations?: ProcessPlacementExplanation[];
  verification?: {
    batchSize: number;
    completedBatchSizes: number[];
    attempted: number;
    attributed: number;
  };
};

export type ProcessPlacementExplanation = {
  sampleId: string;
  effect: NormalizedPlayerEffect;
  localAttribution: TechniqueAttribution;
  dependencyStatus: 'observed' | 'possible' | 'not_established' | 'unverified';
  /** False only when a verified source explains this as its dependent finish.
   * Null is unknown, never permission to count another independent discovery. */
  independentUse: false | null;
  /** Distinct source opportunities stay alternatives; no cross-anchor ranking. */
  paths: {
    processId: string;
    startingRevision: number;
    startingBoardFingerprint: string;
    prerequisite: OpportunityProcess['followUps'][number]['prerequisite'];
    attribution: TechniqueAttribution;
  }[];
  unresolvedProcessIds: string[];
};

const effectKey = (e: NormalizedPlayerEffect) =>
  `${e.kind}:${e.cell}:${e.digit}`;
const effectsOf = (
  e: TechniqueOpportunityEvidence,
): NormalizedPlayerEffect[] => [
  ...e.placements.map(p => ({ kind: 'placement' as const, ...p })),
  ...e.eliminations.map(p => ({ kind: 'elimination' as const, ...p })),
];
const key = (effects: readonly NormalizedPlayerEffect[]) =>
  JSON.stringify([...new Set(effects.map(effectKey))].sort());

function after(request: GrowthAnalysisRequest) {
  const board = [...boardFromFingerprint(request.startingBoardFingerprint)];
  for (const e of request.observedEffects) {
    if (!isCellIndex(e.cell) || !isDigit(e.digit))
      throw new Error('invalid_effect');
    if (e.kind === 'placement') board[e.cell] = e.digit;
  }
  const legal = createSolverCandidates(board);
  const candidates = request.growthCandidates.map((mask, cell) =>
    intersectCandidateMasks(mask, legal[cell]),
  );
  for (const e of request.observedEffects)
    if (e.kind === 'elimination')
      candidates[e.cell] = removeCandidate(candidates[e.cell], e.digit);
  return { board: createBoardFingerprint(board), candidates };
}

function active(e: NormalizedPlayerEffect, request: GrowthAnalysisRequest) {
  return e.kind === 'placement'
    ? request.startingBoardFingerprint[e.cell] === '0'
    : hasCandidate(request.growthCandidates[e.cell], e.digit);
}

function followUps(process: OpportunityProcess) {
  const outcome = effectsOf(process.evidence);
  const applied = after({ ...process.anchor, observedEffects: outcome });
  const before = singles(process.anchor.growthCandidates);
  return singles(applied.candidates)
    .filter(
      e =>
        !before.some(b => sameEffect(b, e)) ||
        outcome.some(o => o.cell === e.cell),
    )
    .map(effect => ({
      effect,
      relation: before.some(b => sameEffect(b, effect))
        ? ('already_available_single' as const)
        : ('new_single' as const),
    }));
}

function observation(request: GrowthAnalysisRequest): string {
  // Segment identity already embeds the unique observer run. Unknown identities
  // deliberately cannot join across segments without continuity evidence.
  const index = request.segmentId.lastIndexOf(':segment-');
  return index < 0 ? request.segmentId : request.segmentId.slice(0, index);
}

/** Read-only, technique-agnostic graph of complete outcomes, NOT a score or a
 * replacement for per-action attribution. There are no technique-name branches.
 */
export function buildOpportunityProcesses(
  records: readonly BehaviorShadowRecord[],
  sessionId: string,
  maxProcesses = 512,
): OpportunityProcessReport {
  if (!Number.isSafeInteger(maxProcesses) || maxProcesses < 1)
    throw new Error('maxProcesses must be a positive integer');
  const report: OpportunityProcessReport = {
    processes: [],
    diagnostics: [],
    enumerationComplete: true,
  };
  const local = records.filter(
    r =>
      r.sessionId === sessionId &&
      (!r.request || r.request.sessionId === sessionId),
  );
  const samples = behaviorShadowRecordsToReviewSamples(local);
  const requests = new Map<
    string,
    { request: GrowthAnalysisRequest; time: number }
  >();
  for (const r of local) {
    if (!r.request) continue;
    const previous = requests.get(r.request.segmentId);
    if (!previous || r.request.issuedRevision > previous.request.issuedRevision)
      requests.set(r.request.segmentId, {
        request: r.request,
        time: r.recordedAtEpochMs,
      });
    else if (
      r.request.requestId === previous.request.requestId &&
      r.phase === 'request'
    )
      previous.time = r.recordedAtEpochMs;
  }
  let current: OpportunityProcess[] = [];
  let previous: { request: GrowthAnalysisRequest; time: number } | null = null;
  const boundary = () => {
    for (const p of current) p.endedBy = 'boundary';
    current = [];
  };
  for (const entry of [...requests.values()].sort(
    (a, b) =>
      a.request.startingRevision - b.request.startingRevision ||
      a.time - b.time,
  )) {
    const q = entry.request;
    const sample = samples.find(
      s => s.analysisRequest?.requestId === q.requestId,
    );
    const fail = (reason: string) => {
      boundary();
      report.diagnostics.push({ sampleId: sample?.sampleId ?? null, reason });
      previous = null;
    };
    try {
      if (
        !isCandidateGrid(q.growthCandidates) ||
        q.givenCells.length !== 81 ||
        !q.givenCells.every(v => typeof v === 'boolean') ||
        !q.observedEffects.length ||
        after(q).board !== q.expectedBoardFingerprint
      ) {
        fail('invalid_snapshot');
        continue;
      }
      if (
        !sample ||
        sample.systemAttribution.attributionEligibility.status !== 'eligible' ||
        sample.analysisDiagnostics?.opportunitySetComplete !== true ||
        !q.hintAssistance ||
        q.hintAssistance.exposureComplete === false ||
        q.hintAssistance.affectedEffects.length
      ) {
        fail('ineligible_or_missing_evidence');
        continue;
      }
      if (previous) {
        const end = after(previous.request);
        const interrupted = local.some(
          r =>
            r.phase === 'invalidation' &&
            r.recordedAtEpochMs >= previous!.time &&
            r.recordedAtEpochMs <= entry.time,
        );
        if (
          interrupted ||
          observation(q) !== observation(previous.request) ||
          q.startingRevision < previous.request.issuedRevision ||
          q.startingBoardFingerprint !== end.board ||
          q.givenCells.some((v, i) => v !== previous!.request.givenCells[i]) ||
          q.growthCandidates.some((v, i) => v !== end.candidates[i]) ||
          JSON.stringify(q.hintAssistance) !==
            JSON.stringify(previous.request.hintAssistance)
        ) {
          boundary();
          report.diagnostics.push({
            sampleId: sample.sampleId,
            reason: 'continuity_boundary',
          });
        }
      }
      const outcomes = sample.systemAttribution.candidateTechniques.flatMap(c =>
        c.matchingOpportunities?.length === c.matchingOpportunityCount
          ? c.matchingOpportunities.map(evidence => ({
              evidence,
              technique: c.technique,
            }))
          : [],
      );
      if (
        sample.systemAttribution.candidateTechniques.some(
          c =>
            !c.matchingOpportunities?.length ||
            c.matchingOpportunities.length !== c.matchingOpportunityCount,
        )
      ) {
        fail('missing_complete_outcomes');
        continue;
      }
      if (
        outcomes.some(
          ({ evidence }) =>
            !effectsOf(evidence).length ||
            effectsOf(evidence).some(
              e => !isCellIndex(e.cell) || !isDigit(e.digit) || !active(e, q),
            ),
        )
      ) {
        fail('invalid_outcome');
        continue;
      }
      for (const { evidence } of outcomes) {
        const effects = effectsOf(evidence);
        // Residual equality preserves the original whole opportunity. A subset
        // is a competing explanation, never a reason to transitively union it.
        const existing = current.find(
          p =>
            key(effectsOf(p.evidence).filter(e => active(e, q))) ===
            key(effects),
        );
        if (existing) continue;
        if (report.processes.length >= maxProcesses) {
          report.enumerationComplete = false;
          report.diagnostics.push({
            sampleId: sample.sampleId,
            reason: 'process_limit',
          });
          break;
        }
        const p: OpportunityProcess = {
          id: `${q.requestId}:${key(effects)}`,
          anchor: q,
          evidence,
          seedTechniques: [
            ...new Set(
              outcomes
                .filter(o => key(effectsOf(o.evidence)) === key(effects))
                .map(o => o.technique),
            ),
          ],
          members: [],
          followUps: [],
          observedEffects: [],
          remainingEffects: effects,
          completion: 'partial',
          endedBy: null,
          overlaps: [],
          attribution: null,
        };
        // Ensure every seed actually supports this fragment, including existing
        // native one-hop placement matches, without inventing deleted actions.
        const singlesAfter = followUps(p);
        if (
          !q.observedEffects.every(
            e =>
              effects.some(o => sameEffect(e, o)) ||
              singlesAfter.some(f => sameEffect(e, f.effect)),
          )
        )
          continue;
        current.push(p);
        report.processes.push(p);
      }
      for (const p of current) {
        const outcome = effectsOf(p.evidence);
        const possibleFollowUps = followUps(p);
        if (
          !q.observedEffects.every(
            e =>
              outcome.some(o => sameEffect(o, e)) ||
              possibleFollowUps.some(f => sameEffect(f.effect, e)),
          )
        )
          continue;
        const direct = q.observedEffects.filter(e =>
          outcome.some(o => sameEffect(o, e)),
        );
        // Complete local no_match is not pollution. A saved original outcome
        // may explain this residual, subject to whole-process native verification.
        p.members.push({
          sampleId: sample.sampleId,
          effects: q.observedEffects,
          locallyMatched: sample.systemAttribution.automaticTechnique !== null,
          localAttribution: sample.systemAttribution,
        });
        for (const e of direct)
          if (!p.observedEffects.some(o => sameEffect(o, e)))
            p.observedEffects.push(e);
        for (const e of q.observedEffects.filter(
          effect => !direct.includes(effect),
        )) {
          const f = possibleFollowUps.find(s => sameEffect(s.effect, e))!;
          const observedPrerequisite =
            f.relation === 'new_single' &&
            singles(
              after({ ...p.anchor, observedEffects: p.observedEffects })
                .candidates,
            ).some(s => sameEffect(s, e));
          p.followUps.push({
            sampleId: sample.sampleId,
            ...f,
            prerequisite: {
              basis:
                f.relation === 'already_available_single'
                  ? 'already_available'
                  : observedPrerequisite
                  ? 'observed_effects'
                  : 'unobserved_effects',
              effects: observedPrerequisite ? [...p.observedEffects] : [],
            },
          });
        }
        // Only actual player effects count as performed; disappearing candidates
        // due to automatic cleanup are not fabricated as player eliminations.
        p.remainingEffects = outcome.filter(
          e => !p.observedEffects.some(o => sameEffect(o, e)),
        );
        p.completion = p.remainingEffects.length ? 'partial' : 'complete';
      }
      previous = entry;
    } catch {
      fail('invalid_snapshot');
    }
  }
  for (const p of report.processes) {
    p.overlaps = report.processes
      .filter(
        other =>
          other !== p &&
          p.members.some(m =>
            other.members.some(o => o.sampleId === m.sampleId),
          ),
      )
      .map(other => other.id);
  }
  return report;
}

/** Native validation is serial and bounded. It uses the unchanged anchor and
 * the actual combined effects, not a union of technique labels or guessed costs.
 */
export async function verifyOpportunityProcesses(
  report: OpportunityProcessReport,
  analyzer: TechniqueOpportunityAnalyzer,
  batchSize = 128,
): Promise<OpportunityProcessReport> {
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 128)
    throw new Error('batchSize must be an integer between 1 and 128');
  const verification = {
    batchSize,
    completedBatchSizes: [] as number[],
    attempted: 0,
    attributed: 0,
  };
  const result: OpportunityProcessReport = {
    ...report,
    diagnostics: [...report.diagnostics],
    processes: report.processes.map(p => ({ ...p, attribution: null })),
    verification,
    placementExplanations: [],
  };
  if (!report.enumerationComplete) {
    result.enumerationComplete = false;
    result.diagnostics.push({ sampleId: null, reason: 'verification_limit' });
    return result;
  }
  for (let offset = 0; offset < result.processes.length; offset += batchSize) {
    // Yield between bounded batches, including when an analyzer is synchronous.
    if (offset > 0) await new Promise<void>(resolve => setTimeout(resolve, 0));
    const batch = result.processes.slice(offset, offset + batchSize);
    for (const p of batch) {
      verification.attempted += 1;
      try {
        // Recheck the whole actual sequence from ONE frozen origin, including
        // simple finishes. Never evaluate the source using only its last board.
        const effects: NormalizedPlayerEffect[] = [];
        for (const e of [
          ...p.anchor.observedEffects,
          ...p.members.flatMap(m => m.effects),
        ])
          if (!effects.some(o => sameEffect(o, e))) effects.push(e);
        const sourceRequest = {
          ...p.anchor,
          requestId: `process:${p.id}`,
          observedEffects: effects,
        };
        // Native accepts eliminations followed by at most one placement. Check
        // each finish against the SAME anchor and the SAME complete source
        // outcome; only explanations common to every check survive.
        const eliminations = effects.filter(e => e.kind === 'elimination');
        const placements = effects.filter(
          e =>
            e.kind === 'placement' &&
            !p.followUps.some(
              f =>
                sameEffect(f.effect, e) &&
                (f.relation === 'already_available_single' ||
                  p.evidence.placements.length > 0),
            ),
        );
        // Native's one-hop API covers elimination sources only. A source which
        // directly places values is itself verified natively; its forward
        // single closure is checked by the same board/candidate rules, without
        // asking native to mislabel the consequence as another direct source.
        if (
          p.evidence.placements.length &&
          p.followUps.some(
            f =>
              !followUps(p).some(
                expected =>
                  sameEffect(expected.effect, f.effect) &&
                  expected.relation === f.relation,
              ),
          )
        )
          throw new Error('invalid_placement_closure');
        // An already available single is only an execution link, NOT a source
        // consequence. Validate its origin directly instead of forcing native
        // to call it newly derived from this opportunity.
        if (
          p.followUps.some(
            f =>
              f.relation === 'already_available_single' &&
              !singles(p.anchor.growthCandidates).some(e =>
                sameEffect(e, f.effect),
              ),
          )
        )
          throw new Error('invalid_existing_single');
        const checks = placements.length
          ? placements.map(e => [...eliminations, e])
          : [eliminations.length ? eliminations : p.anchor.observedEffects];
        let combined: GrowthAnalysisResponse | null = null;
        let failure: string | null = null;
        for (const [index, observedEffects] of checks.entries()) {
          const request = {
            ...sourceRequest,
            requestId: `${sourceRequest.requestId}:${index}`,
            observedEffects,
          };
          request.expectedBoardFingerprint = after(request).board;
          const response = await analyzer.analyze(request);
          if (
            response.requestId !== request.requestId ||
            response.segmentId !== request.segmentId ||
            response.sessionId !== request.sessionId ||
            response.startingRevision !== request.startingRevision ||
            response.issuedRevision !== request.issuedRevision ||
            response.startingBoardFingerprint !==
              request.startingBoardFingerprint ||
            response.expectedBoardFingerprint !==
              request.expectedBoardFingerprint
          ) {
            failure = 'verification_identity_mismatch';
            break;
          }
          const candidates = response.candidateTechniques
            .filter(c =>
              c.matchingOpportunities?.some(
                e => key(effectsOf(e)) === key(effectsOf(p.evidence)),
              ),
            )
            .map(c => ({
              ...c,
              matchingOpportunityCount: 1,
              matchingOpportunities: [p.evidence],
            }));
          if (
            !response.diagnostics.opportunitySetComplete ||
            response.status !== 'matched' ||
            !candidates.length
          ) {
            failure = 'verification_unavailable';
            break;
          }
          const common: GrowthAnalysisResponse['candidateTechniques'] =
            combined === null
              ? candidates
              : combined.candidateTechniques.flatMap(c => {
                  const next = candidates.find(
                    n => n.technique === c.technique,
                  );
                  // Exact source effects were checked above. Request-wide
                  // minimum cost is a ranking value, never opportunity identity.
                  return next
                    ? [
                        {
                          ...c,
                          humanCost: Math.max(c.humanCost, next.humanCost),
                        },
                      ]
                    : [];
                });
          combined = {
            ...response,
            candidateTechniques: [...common].sort(
              (a, b) =>
                a.humanCost - b.humanCost ||
                TECHNIQUES.findIndex(t => t.code === a.technique) -
                  TECHNIQUES.findIndex(t => t.code === b.technique),
            ),
          };
        }
        if (failure || !combined?.candidateTechniques.length) {
          result.diagnostics.push({
            sampleId: null,
            reason: failure ?? 'verification_unavailable',
          });
          continue;
        }
        p.attribution = attributionFromAnalysis(combined, sourceRequest);
        verification.attributed += 1;
      } catch {
        result.diagnostics.push({
          sampleId: null,
          reason: 'verification_failed',
        });
      }
    }
    verification.completedBatchSizes.push(batch.length);
  }
  result.placementExplanations = explainProcessPlacements(result);
  return result;
}

function explainProcessPlacements(
  report: OpportunityProcessReport,
): ProcessPlacementExplanation[] {
  const explanations = new Map<string, ProcessPlacementExplanation>();
  for (const p of report.processes) {
    for (const member of p.members) {
      for (const effect of member.effects.filter(e => e.kind === 'placement')) {
        const id = JSON.stringify([member.sampleId, effectKey(effect)]);
        let entry = explanations.get(id);
        if (!entry) {
          entry = {
            sampleId: member.sampleId,
            effect,
            localAttribution: member.localAttribution,
            dependencyStatus: 'not_established',
            independentUse: null,
            paths: [],
            unresolvedProcessIds: [],
          };
          explanations.set(id, entry);
        }
        const link = p.followUps.find(
          f => f.sampleId === member.sampleId && sameEffect(f.effect, effect),
        );
        // Already available singles cannot be retroactively credited to a more
        // complex alternative. Keep that alternative on the process itself.
        if (!link || link.prerequisite.basis === 'already_available') continue;
        if (
          p.attribution?.attributionEligibility.status !== 'eligible' ||
          !p.attribution.automaticTechnique
        ) {
          if (!entry.unresolvedProcessIds.includes(p.id))
            entry.unresolvedProcessIds.push(p.id);
          continue;
        }
        if (!entry.paths.some(path => path.processId === p.id))
          entry.paths.push({
            processId: p.id,
            startingRevision: p.anchor.startingRevision,
            startingBoardFingerprint: p.anchor.startingBoardFingerprint,
            prerequisite: link.prerequisite,
            attribution: p.attribution,
          });
      }
    }
  }
  for (const entry of explanations.values()) {
    const observed = entry.paths.some(
      p => p.prerequisite.basis === 'observed_effects',
    );
    entry.dependencyStatus = observed
      ? 'observed'
      : entry.paths.length
      ? 'possible'
      : entry.unresolvedProcessIds.length
      ? 'unverified'
      : 'not_established';
    entry.independentUse = observed ? false : null;
  }
  return [...explanations.values()];
}
