import { GameSession } from '../../domain/game/contracts';
import { createBoardFingerprint } from '../../domain/sudoku/board';
import { GrowthAnalysisRequest } from '../../domain/technique-recognition/contracts';
import { BehaviorShadowRecord } from '../technique-recognition/shadow-controller';
import { behaviorShadowRecordsToReviewSamples } from '../technique-recognition/shadow-export';
import { buildTechniqueOpportunityGroups } from '../technique-recognition/opportunity-groups';
import { OpportunityProcessReport } from '../technique-recognition/opportunity-processes';
import { buildSessionReview } from '../technique-recognition/session-review';
import {
  GrowthRecord,
  GrowthSession,
  LearningCompletion,
  GROWTH_ANALYSIS_FINGERPRINT,
} from './contracts';

export function growthInputFingerprint(
  session: GameSession,
  records: readonly BehaviorShadowRecord[],
) {
  return JSON.stringify([
    GROWTH_ANALYSIS_FINGERPRINT,
    session.state.revision,
    records.map(r => r.recordId),
  ]);
}
/** Only stable accepted events, or uniquely recoverable saved moves, locate evidence. */
export function requestMoveIds(
  session: GameSession,
  request: GrowthAnalysisRequest,
): string[] {
  const events = session.replayEvents?.filter(
    e =>
      e.revision > request.startingRevision &&
      e.revision <= request.issuedRevision &&
      e.move,
  );
  if (events?.length) return [...new Set(events.map(e => e.move!.id))];
  const matches = session.history.filter(
    m =>
      createBoardFingerprint(m.before.values) ===
        request.startingBoardFingerprint &&
      createBoardFingerprint(m.after.values) ===
        request.expectedBoardFingerprint &&
      request.observedEffects.every(e =>
        e.kind === 'placement'
          ? m.cell === e.cell && m.digit === e.digit && m.kind === 'place_value'
          : m.cell === e.cell &&
            m.digit === e.digit &&
            (m.kind === 'edit_manual_candidate' ||
              m.kind === 'edit_quick_candidate'),
      ),
  );
  return matches.length === 1 ? [matches[0].id] : [];
}
export function projectGrowthSession(
  session: GameSession,
  shadow: readonly BehaviorShadowRecord[],
  completions: readonly LearningCompletion[],
  report: OpportunityProcessReport | null,
  now: number,
): GrowthSession {
  const state = session.state;
  const sessionId = state.sessionId;
  const records: GrowthRecord[] = [];
  const events = session.replayEvents ?? [];
  const shown = events.filter(e => e.kind === 'reveal_hint' && e.hint);
  shown.forEach(e =>
    records.push({
      id: `hint:${e.id}`,
      technique: e.hint!.techniqueCode,
      kind: 'hint_viewed',
      occurredAt: e.createdAtEpochMs,
      reference: { sessionId, eventId: e.id, moveIds: [] },
      alternatives: [],
      reason: 'learning',
    }),
  );
  // Retained exposures are real, but old formats did not persist their wall time.
  // Match in order only when event coverage supplies every exposure.
  if (state.hintExposures && shown.length < state.hintExposures.length) {
    const pending = [...shown];
    state.hintExposures.forEach((e, i) => {
      const index = pending.findIndex(
        p => JSON.stringify(p.hint) === JSON.stringify(e.step),
      );
      if (index >= 0) {
        pending.splice(index, 1);
        return;
      }
      records.push({
        id: `exposure:${sessionId}:${i}`,
        technique: e.step.techniqueCode,
        kind: 'hint_viewed',
        occurredAt: null,
        reference: { sessionId, moveIds: [] },
        alternatives: [],
        reason: 'missing_evidence',
      });
    });
  }
  const applied = new Map(
    [...session.history, ...events.flatMap(e => (e.move ? [e.move] : []))]
      .filter(m => m.kind === 'apply_hint')
      .map(m => [m.id, m]),
  );
  applied.forEach(m => {
    if (m.techniqueCode)
      records.push({
        id: `applied:${m.id}`,
        technique: m.techniqueCode,
        kind: 'hint_applied',
        occurredAt: m.createdAtEpochMs,
        reference: { sessionId, moveIds: [m.id] },
        alternatives: [],
        reason: 'learning',
      });
  });
  completions
    .filter(c => c.reference.sessionId === sessionId)
    .forEach(c =>
      records.push({
        id: c.id,
        technique: c.technique,
        kind: 'walkthrough',
        occurredAt: c.occurredAt,
        reference: c.reference,
        alternatives: [],
        reason: 'learning',
      }),
    );
  const samples = behaviorShadowRecordsToReviewSamples(shadow);
  const requests = new Map(samples.map(s => [s.sampleId, s.analysisRequest]));
  const groups = buildTechniqueOpportunityGroups(shadow, sessionId);
  const memberships = new Map(groups.memberships.map(m => [m.sampleId, m]));
  const validGroups = new Set(
    groups.groups.filter(g => g.representativeSampleId).map(g => g.id),
  );
  const usedGroups = new Set<string>();
  const usedSamples = new Set<string>();
  const dependent = new Set(
    report?.placementExplanations
      ?.filter(p => p.independentUse === false)
      .map(p => p.sampleId),
  );
  let incomplete =
    !report || !report.enumerationComplete || state.hintExposures === null;
  for (const process of report?.processes ?? []) {
    const attribution = process.attribution;
    const technique =
      attribution?.automaticTechnique ?? process.seedTechniques[0] ?? null;
    const ids = [
      ...new Set(
        [...process.members, ...process.followUps].flatMap(m => {
          const r = requests.get(m.sampleId);
          return r ? requestMoveIds(session, r) : [];
        }),
      ),
    ];
    const groupIds = [
      ...new Set(
        process.members.flatMap(
          m => memberships.get(m.sampleId)?.opportunityIds ?? [],
        ),
      ),
    ];
    const completeReferences = process.members.every(m => {
      const r = requests.get(m.sampleId);
      return r && requestMoveIds(session, r).length > 0;
    });
    const candidate = attribution?.candidateTechniques.find(
      c => c.technique === technique,
    );
    const omittedSource =
      candidate?.oneHopPlacementMatch &&
      !candidate.directPlacementMatch &&
      !process.observedEffects.some(e => e.kind === 'elimination');
    // The existing placement projection explicitly marks these as dependent
    // finishes of this source. Their local single process is not a competing
    // discovery; all other overlaps remain uncountable.
    const ownFinishes = new Set(
      report?.placementExplanations
        ?.filter(
          p =>
            p.independentUse === false &&
            p.paths.some(
              path =>
                path.processId === process.id &&
                path.prerequisite.basis === 'observed_effects',
            ),
        )
        .map(p => p.sampleId),
    );
    const unresolvedOverlap = process.overlaps.some(id => {
      const other = report?.processes.find(p => p.id === id);
      return !other || !other.members.every(m => ownFinishes.has(m.sampleId));
    });
    const eligible =
      report!.enumerationComplete &&
      attribution?.attributionEligibility.status === 'eligible' &&
      !!attribution.automaticTechnique &&
      !unresolvedOverlap &&
      completeReferences &&
      ids.every(id => session.history.some(m => m.id === id)) &&
      groupIds.length === 1 &&
      validGroups.has(groupIds[0]) &&
      process.members.every(
        m =>
          memberships.get(m.sampleId)?.status === 'resolved' &&
          (!dependent.has(m.sampleId) || ownFinishes.has(m.sampleId)),
      ) &&
      !omittedSource;
    if (eligible && usedGroups.has(groupIds[0])) continue;
    if (eligible) usedGroups.add(groupIds[0]);
    if (!attribution) incomplete = true;
    process.members.forEach(m => usedSamples.add(m.sampleId));
    const ref = { sessionId, moveIds: ids, processId: process.id };
    const date = ids
      .map(
        id =>
          session.history.find(m => m.id === id)?.createdAtEpochMs ??
          events.find(e => e.move?.id === id)?.createdAtEpochMs,
      )
      .filter((v): v is number => v !== undefined);
    records.push({
      id: `process:${process.id}`,
      technique,
      kind: eligible
        ? 'application'
        : attribution?.attributionEligibility.status === 'eligible'
        ? 'possible'
        : 'unknown',
      occurredAt: date.length ? Math.max(...date) : null,
      reference: ref,
      alternatives:
        attribution?.candidateTechniques.map(c => c.technique) ??
        process.seedTechniques,
      reason: eligible
        ? 'verified_process'
        : !completeReferences || !attribution
        ? 'missing_evidence'
        : 'possible_path',
    });
    for (const finish of process.followUps) {
      if (
        finish.prerequisite.basis !== 'observed_effects' ||
        !attribution?.automaticTechnique
      )
        continue;
      const r = requests.get(finish.sampleId);
      const local = samples.find(
        s => s.sampleId === finish.sampleId,
      )?.systemAttribution;
      if (r && local?.automaticTechnique)
        records.push({
          id: `finish:${process.id}:${finish.sampleId}`,
          technique: local.automaticTechnique,
          kind: 'related_finish',
          occurredAt: date.length ? Math.max(...date) : null,
          reference: { ...ref, moveIds: requestMoveIds(session, r) },
          alternatives: [],
          reason: 'dependent_finish',
        });
    }
  }
  for (const entry of buildSessionReview(shadow, sessionId)) {
    const sample = samples.find(
      s => s.analysisRequest?.requestId === entry.request?.requestId,
    );
    if (sample && usedSamples.has(sample.sampleId)) continue;
    const ids = entry.request ? requestMoveIds(session, entry.request) : [];
    const candidates =
      entry.attribution?.candidateTechniques.map(c => c.technique) ?? [];
    records.push({
      id: `review:${entry.id}`,
      technique: candidates[0] ?? null,
      kind:
        candidates.length &&
        (entry.status === 'explained' || entry.status === 'hint_assisted')
          ? 'possible'
          : 'unknown',
      occurredAt:
        session.history.find(m => m.id === ids[0])?.createdAtEpochMs ?? null,
      reference: { sessionId, moveIds: ids },
      alternatives: candidates,
      reason:
        entry.status === 'hint_assisted'
          ? 'hint_assisted'
          : entry.status === 'invalidated'
          ? 'ineligible'
          : 'missing_evidence',
    });
    if (entry.status === 'insufficient') incomplete = true;
  }
  if (
    !shadow.length &&
    session.history.some(
      m => m.kind === 'place_value' || m.kind.includes('candidate'),
    )
  )
    incomplete = true;
  if (incomplete && !records.some(r => r.kind === 'unknown'))
    records.push({
      id: `coverage:${sessionId}`,
      technique: null,
      kind: 'unknown',
      occurredAt: null,
      reference: { sessionId, moveIds: [] },
      alternatives: [],
      reason: 'missing_evidence',
    });
  return {
    sessionId,
    puzzleIdentity: createBoardFingerprint(state.givens),
    difficulty: state.difficultyLevel,
    status: state.status,
    endedAt: state.updatedAtEpochMs,
    revision: state.revision,
    inputFingerprint: growthInputFingerprint(session, shadow),
    updatedAt: now,
    coverage: report ? (incomplete ? 'incomplete' : 'complete') : 'pending',
    records: [
      ...new Map(
        records.map(r => [
          r.id,
          { ...r, reference: { ...r.reference, recordId: r.id } },
        ]),
      ).values(),
    ],
  };
}
