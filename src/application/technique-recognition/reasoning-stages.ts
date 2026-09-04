import {
  boardFromFingerprint,
  createBoardFingerprint,
  createSolverCandidates,
  intersectCandidateMasks,
  removeCandidate,
} from '../../domain/sudoku/board';
import { CandidateGrid } from '../../domain/sudoku/contracts';
import {
  GrowthAnalysisRequest,
  GrowthAnalysisResponse,
  NormalizedPlayerEffect,
  TechniqueAttribution,
  TechniqueOpportunityAnalyzer,
  attributionFromAnalysis,
} from '../../domain/technique-recognition/contracts';
import type { OpportunityProcessReport } from './opportunity-processes';
import { sameEffect, singles } from './hint-assistance';

export type ReasoningStage = {
  id: string;
  role: 'source' | 'finish';
  actionKind: 'elimination' | 'placement' | 'mixed';
  beforeBoardFingerprint: string;
  beforeCandidates: CandidateGrid;
  afterBoardFingerprint: string;
  afterCandidates: CandidateGrid;
  effects: readonly NormalizedPlayerEffect[];
  observedEffects: readonly NormalizedPlayerEffect[];
  unobservedEffects: readonly NormalizedPlayerEffect[];
  attribution: TechniqueAttribution;
};

export type StagedReasoningProcess = {
  processId: string;
  source: ReasoningStage;
  finishes: {
    sampleId: string;
    stage: ReasoningStage;
    dependency: 'observed' | 'possible';
    prerequisiteEffects: readonly NormalizedPlayerEffect[];
    /** A hypothetical path never grants independent mastery credit. */
    independentUse: false | null;
  }[];
};

export type ReasoningStagesReport = {
  processes: StagedReasoningProcess[];
  diagnostics: {
    processId: string | null;
    sampleId: string | null;
    reason: string;
  }[];
};

const key = (effects: readonly NormalizedPlayerEffect[]) =>
  JSON.stringify(
    [...new Set(effects.map(e => `${e.kind}:${e.cell}:${e.digit}`))].sort(),
  );

function apply(
  q: GrowthAnalysisRequest,
  effects: readonly NormalizedPlayerEffect[],
) {
  const board = [...boardFromFingerprint(q.startingBoardFingerprint)];
  for (const e of effects) if (e.kind === 'placement') board[e.cell] = e.digit;
  const legal = createSolverCandidates(board);
  const candidates = q.growthCandidates.map((m, c) =>
    intersectCandidateMasks(m, legal[c]),
  );
  for (const e of effects)
    if (e.kind === 'elimination')
      candidates[e.cell] = removeCandidate(candidates[e.cell], e.digit);
  return { board: createBoardFingerprint(board), candidates };
}

function check(q: GrowthAnalysisRequest, r: GrowthAnalysisResponse) {
  if (
    r.requestId !== q.requestId ||
    r.sessionId !== q.sessionId ||
    r.segmentId !== q.segmentId ||
    r.startingRevision !== q.startingRevision ||
    r.issuedRevision !== q.issuedRevision ||
    r.startingBoardFingerprint !== q.startingBoardFingerprint ||
    r.expectedBoardFingerprint !== q.expectedBoardFingerprint
  )
    throw Error('stage_identity_mismatch');
  if (r.status !== 'matched' || !r.diagnostics.opportunitySetComplete)
    throw Error('stage_verification_unavailable');
}

function stage(
  q: GrowthAnalysisRequest,
  attribution: TechniqueAttribution,
  role: ReasoningStage['role'],
  observed: readonly NormalizedPlayerEffect[],
): ReasoningStage {
  const after = apply(q, q.observedEffects);
  const kinds = new Set(q.observedEffects.map(e => e.kind));
  return {
    id: q.requestId,
    role,
    actionKind: kinds.size > 1 ? 'mixed' : q.observedEffects[0].kind,
    beforeBoardFingerprint: q.startingBoardFingerprint,
    beforeCandidates: q.growthCandidates,
    afterBoardFingerprint: after.board,
    afterCandidates: after.candidates,
    effects: q.observedEffects,
    observedEffects: q.observedEffects.filter(e =>
      observed.some(o => sameEffect(o, e)),
    ),
    unobservedEffects: q.observedEffects.filter(
      e => !observed.some(o => sameEffect(o, e)),
    ),
    attribution,
  };
}

/** Separate source reasoning from direct-single execution. No technique-name
 * branches for sources, no invented player actions, no cross-anchor winner.
 * Input must be the complete graph after whole-process verification.
 */
export async function verifyReasoningStages(
  report: OpportunityProcessReport,
  analyzer: TechniqueOpportunityAnalyzer,
): Promise<ReasoningStagesReport> {
  const result: ReasoningStagesReport = { processes: [], diagnostics: [] };
  if (!report.enumerationComplete || !report.verification) {
    result.diagnostics.push({
      processId: null,
      sampleId: null,
      reason: 'unverified_process_graph',
    });
    return result;
  }
  for (const p of report.processes) {
    const fail = (reason: string, sampleId: string | null = null) =>
      result.diagnostics.push({ processId: p.id, sampleId, reason });
    if (
      p.attribution?.attributionEligibility.status !== 'eligible' ||
      !p.attribution.automaticTechnique ||
      p.anchor.hintAssistance?.exposureComplete === false ||
      p.anchor.hintAssistance?.affectedEffects.length
    ) {
      fail('ineligible_source');
      continue;
    }
    const effects: NormalizedPlayerEffect[] = [
      ...p.evidence.placements.map(e => ({ ...e, kind: 'placement' as const })),
      ...p.evidence.eliminations.map(e => ({
        ...e,
        kind: 'elimination' as const,
      })),
    ];
    if (!effects.length || p.evidence.placements.length > 1) {
      fail('unsupported_source_shape');
      continue;
    }
    let source: ReasoningStage;
    try {
      const q = {
        ...p.anchor,
        requestId: `stages:${p.id}:source`,
        observedEffects: effects,
      };
      q.expectedBoardFingerprint = apply(q, effects).board;
      const response = await analyzer.analyze(q);
      check(q, response);
      const candidates = response.candidateTechniques
        .filter(
          c =>
            p.attribution!.candidateTechniques.some(
              a => a.technique === c.technique,
            ) &&
            c.matchingOpportunities?.some(
              o =>
                key([
                  ...o.placements.map(e => ({
                    ...e,
                    kind: 'placement' as const,
                  })),
                  ...o.eliminations.map(e => ({
                    ...e,
                    kind: 'elimination' as const,
                  })),
                ]) === key(effects),
            ),
        )
        .map(c => ({
          ...c,
          matchingOpportunityCount: 1,
          matchingOpportunities: [p.evidence],
        }));
      if (!candidates.length) throw Error('source_evidence_mismatch');
      source = stage(
        q,
        attributionFromAnalysis(
          { ...response, candidateTechniques: candidates },
          q,
        ),
        'source',
        p.observedEffects,
      );
    } catch (error) {
      fail(error instanceof Error ? error.message : 'stage_failed');
      continue;
    }
    const process: StagedReasoningProcess = {
      processId: p.id,
      source,
      finishes: [],
    };
    result.processes.push(process);
    for (const [index, link] of p.followUps.entries()) {
      // An already available single is not a consequence of this source.
      if (
        link.relation !== 'new_single' ||
        link.prerequisite.basis === 'already_available'
      )
        continue;
      try {
        const observed = link.prerequisite.basis === 'observed_effects';
        const prerequisites = observed ? link.prerequisite.effects : effects;
        if (
          !prerequisites.length ||
          prerequisites.some(
            e =>
              !effects.some(o => sameEffect(o, e)) ||
              (observed && !p.observedEffects.some(o => sameEffect(o, e))),
          )
        )
          throw Error('invalid_stage_prerequisites');
        const narrowed = apply(p.anchor, prerequisites);
        if (
          singles(p.anchor.growthCandidates).some(e =>
            sameEffect(e, link.effect),
          ) ||
          !singles(narrowed.candidates).some(e => sameEffect(e, link.effect))
        )
          throw Error('not_a_new_single');
        if (
          !p.members.some(
            m =>
              m.sampleId === link.sampleId &&
              m.effects.some(e => sameEffect(e, link.effect)),
          )
        )
          throw Error('unobserved_finish');
        const q: GrowthAnalysisRequest = {
          ...p.anchor,
          requestId: `stages:${p.id}:finish-${index}`,
          startingBoardFingerprint: narrowed.board,
          growthCandidates: narrowed.candidates,
          observedEffects: [link.effect],
        };
        q.expectedBoardFingerprint = apply(q, q.observedEffects).board;
        const response = await analyzer.analyze(q);
        check(q, response);
        // These are the explicitly bounded execution primitives, not a new
        // search over advanced follow-up techniques or recursive closures.
        const candidates = response.candidateTechniques.filter(
          c =>
            c.directPlacementMatch &&
            ['fullHouse', 'nakedSingle', 'hiddenSingle'].includes(c.technique),
        );
        if (!candidates.length) throw Error('finish_not_direct_single');
        process.finishes.push({
          sampleId: link.sampleId,
          stage: stage(
            q,
            attributionFromAnalysis(
              { ...response, candidateTechniques: candidates },
              q,
            ),
            'finish',
            [link.effect],
          ),
          dependency: observed ? 'observed' : 'possible',
          prerequisiteEffects: prerequisites,
          independentUse: observed ? false : null,
        });
      } catch (error) {
        fail(
          error instanceof Error ? error.message : 'stage_failed',
          link.sampleId,
        );
      }
    }
  }
  return result;
}
