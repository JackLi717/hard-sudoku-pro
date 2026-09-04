import { TECHNIQUES, TechniqueCode } from '../../domain/hints/techniques';
import {
  GrowthRecord,
  GrowthSession,
  GrowthViewModel,
  GrowthWindow,
  GROWTH_POLICY,
} from './contracts';
export const isLearning = (r: GrowthRecord) =>
  r.kind === 'hint_viewed' ||
  r.kind === 'walkthrough' ||
  r.kind === 'hint_applied';
const distinct = (values: readonly unknown[]) => new Set(values).size;
export function buildGrowthViewModel(
  sessions: readonly GrowthSession[],
  followed: readonly TechniqueCode[] = [],
): GrowthViewModel {
  const ordered = [...sessions].sort((a, b) => b.endedAt - a.endedAt);
  const recent = ordered
    .filter(s => s.status === 'completed')
    .slice(0, GROWTH_POLICY.windowSize);
  const profiles = TECHNIQUES.map(({ code }) => {
    const records = ordered
      .flatMap(s => s.records)
      .filter(r => r.technique === code)
      .sort(
        (a, b) =>
          (b.occurredAt ?? 0) - (a.occurredAt ?? 0) || a.id.localeCompare(b.id),
      );
    const learning = records.filter(isLearning);
    const apps = records.filter(r => r.kind === 'application');
    const identities = new Map(
      ordered.map(s => [s.sessionId, s.puzzleIdentity]),
    );
    const puzzles = distinct(
      apps.map(r => identities.get(r.reference.sessionId)),
    );
    const milestones: {
      kind: 'contact' | 'walkthrough' | 'diversity';
      record: GrowthRecord;
    }[] = [];
    const first = [...learning].reverse().find(r => r.occurredAt !== null);
    const walk = [...learning].reverse().find(r => r.kind === 'walkthrough');
    if (first) milestones.push({ kind: 'contact', record: first });
    if (walk) milestones.push({ kind: 'walkthrough', record: walk });
    const accumulated: GrowthRecord[] = [];
    for (const r of [...apps].reverse()) {
      accumulated.push(r);
      if (
        accumulated.length >= GROWTH_POLICY.diversityProcesses &&
        distinct(accumulated.map(a => identities.get(a.reference.sessionId))) >=
          GROWTH_POLICY.diversityPuzzles
      ) {
        milestones.push({ kind: 'diversity', record: r });
        break;
      }
    }
    return {
      technique: code,
      learningSessions: distinct(learning.map(r => r.reference.sessionId)),
      applications: apps.length,
      puzzles,
      latestAt: records[0]?.occurredAt ?? null,
      status: apps.length
        ? puzzles >= GROWTH_POLICY.diversityPuzzles &&
          apps.length >= GROWTH_POLICY.diversityProcesses
          ? ('multiple' as const)
          : ('applying' as const)
        : learning.length
        ? ('learning' as const)
        : records.some(
            r => r.kind === 'possible' || r.kind === 'related_finish',
          )
        ? ('possible' as const)
        : records.length
        ? ('unknown' as const)
        : ('empty' as const),
      records,
      milestones,
    };
  });
  return {
    profiles,
    sessions: ordered,
    followed,
    loading: false,
    updating: false,
    failed: false,
    updatedAt: ordered.length
      ? Math.max(...ordered.map(s => s.updatedAt))
      : null,
    recentCount: recent.length,
    recentLearning: distinct(
      recent.flatMap(s => s.records.filter(isLearning).map(r => r.technique)),
    ),
    recentApplications: distinct(
      recent.flatMap(s =>
        s.records.filter(r => r.kind === 'application').map(r => r.technique),
      ),
    ),
  };
}
export function growthWindows(
  vm: GrowthViewModel,
  technique: TechniqueCode,
): readonly GrowthWindow[] {
  const completed = vm.sessions
    .filter(s => s.status === 'completed')
    .sort((a, b) => b.endedAt - a.endedAt);
  return [0, GROWTH_POLICY.windowSize].map(offset => {
    const sessions = completed.slice(offset, offset + GROWTH_POLICY.windowSize);
    const applied = sessions.filter(s =>
      s.records.some(
        r => r.kind === 'application' && r.technique === technique,
      ),
    );
    return {
      sessions: sessions.length,
      covered: sessions.filter(s => s.coverage === 'complete').length,
      applications: sessions.reduce(
        (n, s) =>
          n +
          s.records.filter(
            r => r.kind === 'application' && r.technique === technique,
          ).length,
        0,
      ),
      puzzles: distinct(applied.map(s => s.puzzleIdentity)),
      from: sessions.at(-1)?.endedAt ?? null,
      to: sessions[0]?.endedAt ?? null,
      levels: sessions.map(s => s.difficulty),
    };
  });
}
