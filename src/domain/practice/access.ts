import type { TechniqueCode } from '../hints/techniques';

export const FREE_PRACTICE_EXERCISES = 5;
export const PRACTICE_AD_BATCH_SIZE = 5;

export function accessibleExerciseCount(
  total: number,
  premium: boolean,
  unlockedBatches: number,
): number {
  if (premium) return total;
  return Math.min(
    total,
    FREE_PRACTICE_EXERCISES +
      PRACTICE_AD_BATCH_SIZE * Math.max(0, unlockedBatches),
  );
}

export interface PracticeAccessStore {
  readUnlockedBatches(technique: TechniqueCode): Promise<number>;
  grantNextBatch(
    technique: TechniqueCode,
    total: number,
    eventId: string,
    now: number,
  ): Promise<number>;
}
