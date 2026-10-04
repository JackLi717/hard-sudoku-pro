export const DAILY_HINT_REWARDS = [3, 3, 5, 5, 5, 10, 10] as const;
export const AD_HINT_REWARD = 5;

export type DailyHintReward = {
  date: string;
  cycleDay: number;
  requested: number;
  credited: number;
};

export function localRewardDate(epochMs: number): string {
  const date = new Date(epochMs);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

// Compare calendar days, not elapsed hours: daylight saving days may be 23/25h.
export function rewardCycleDay(
  date: string,
  previous: DailyHintReward | null,
): number {
  if (!previous) return 1;
  const ordinal = (key: string) => {
    const [year, month, day] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, day) / 86400000;
  };
  return ordinal(date) - ordinal(previous.date) === 1
    ? (previous.cycleDay % DAILY_HINT_REWARDS.length) + 1
    : 1;
}
