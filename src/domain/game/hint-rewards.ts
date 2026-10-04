export const DAILY_HINT_REWARDS = [3, 3, 5, 5, 5, 10, 10] as const;
export const AD_HINT_REWARD = 5;

export type DailyHintReward = {
  date: string;
  cycleDay: number;
  requested: number;
  credited: number;
};

export type DailyHintRewardHistory = {
  today: string;
  last: DailyHintReward | null;
  receipts: readonly DailyHintReward[];
};

export function shiftRewardDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${String(
    shifted.getUTCMonth() + 1,
  ).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

export function dailyHintRewardWeek(history: DailyHintRewardHistory) {
  const { last, today, receipts } = history;
  // A rolled-back clock displays the recorded cycle without inventing a grant.
  const anchor = last && last.date >= today ? last.date : today;
  const cycleDay =
    last?.date === anchor ? last.cycleDay : rewardCycleDay(anchor, last);
  const startDate = shiftRewardDate(anchor, 1 - cycleDay);
  const previous = receipts.find(receipt => last && receipt.date < last.date);
  return {
    startDate,
    endDate: shiftRewardDate(startDate, 6),
    cycleDay,
    todayReceipt: receipts.find(receipt => receipt.date === today) ?? null,
    clockAhead: Boolean(last && last.date > today),
    restarted: Boolean(
      last?.date === today &&
        previous &&
        shiftRewardDate(previous.date, 1) < today,
    ),
    days: DAILY_HINT_REWARDS.map((requested, index) => {
      const date = shiftRewardDate(startDate, index);
      return {
        date,
        cycleDay: index + 1,
        requested,
        receipt: receipts.find(receipt => receipt.date === date) ?? null,
      };
    }),
  };
}

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
