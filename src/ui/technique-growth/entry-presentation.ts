import { GrowthRecord } from '../../application/technique-growth/contracts';
import { isLearning } from '../../application/technique-growth/view-model';

// Display order only. Never changes record admission, counts or attribution.
export function featuredRecord(records: readonly GrowthRecord[]) {
  const rank = (r: GrowthRecord) =>
    r.kind === 'application' ? 0 : isLearning(r) ? 1 : 2;
  return [...records]
    .filter(
      r =>
        r.technique &&
        (r.kind === 'application' || isLearning(r) || r.kind === 'possible'),
    )
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        (b.occurredAt ?? -1) - (a.occurredAt ?? -1) ||
        a.id.localeCompare(b.id),
    )[0];
}

export function recordTag(record: GrowthRecord) {
  return record.kind === 'application'
    ? ('growth.album.application' as const)
    : record.kind === 'possible'
    ? ('growth.album.possible' as const)
    : (`growth.kind.${record.kind}` as const);
}
