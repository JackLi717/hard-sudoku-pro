import { Translate } from '../../localization';

/** Recent activity uses elapsed time; older and future dates stay explicit. */
export function formatRecordTime(
  at: number | null,
  now: number,
  locale: string,
  t: Translate,
): string {
  if (at === null || !Number.isFinite(at)) return t('growth.unknownDate');
  const elapsed = now - at;
  const day = 24 * 60 * 60 * 1000;
  if (elapsed < 0 || elapsed >= 8 * day)
    return new Date(at).toLocaleDateString(locale);
  if (elapsed >= 7 * day) return t('growth.time.week');
  if (elapsed < 60 * 1000) return t('growth.time.now');
  const unit = elapsed >= day ? 'day' : elapsed >= 3600000 ? 'hour' : 'minute';
  const count = Math.floor(
    elapsed / (unit === 'day' ? day : unit === 'hour' ? 3600000 : 60000),
  );
  return t(`growth.time.${unit}${count === 1 ? '' : 's'}`, { count });
}
