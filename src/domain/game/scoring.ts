import type { DifficultyLevel } from '../hints/techniques';

export type CompletionScore = {
  baseScore: number;
  noMistakeBonus: number;
  noHintBonus: number;
  totalScore: number;
};

export type CompletionScoreInput = {
  difficultyLevel: DifficultyLevel;
  difficultyScore: number;
  errorCount: number;
  hintUseCount: number;
};

export type LevelScorePolicy = {
  midpoint: number;
  referenceMinimum: number;
  referenceMaximum: number;
};

/**
 * Fixed against the current production-content baseline. These references are
 * policy constants, not live catalogue statistics, so a stored score never
 * changes when the catalogue grows.
 */
export const LEVEL_SCORE_POLICY: Readonly<
  Record<DifficultyLevel, LevelScorePolicy>
> = {
  1: { midpoint: 1_000, referenceMinimum: 446, referenceMaximum: 732 },
  2: { midpoint: 2_000, referenceMinimum: 2_394, referenceMaximum: 11_175 },
  3: { midpoint: 4_000, referenceMinimum: 3_453, referenceMaximum: 10_717 },
  4: { midpoint: 8_000, referenceMinimum: 4_467, referenceMaximum: 22_648 },
  5: {
    midpoint: 16_000,
    referenceMinimum: 5_664,
    referenceMaximum: 54_684,
  },
};

function roundToTen(value: number): number {
  return Math.round(value / 10) * 10;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function calculateCompletionScore({
  difficultyLevel,
  difficultyScore,
  errorCount,
  hintUseCount,
}: CompletionScoreInput): CompletionScore {
  if (!Number.isFinite(difficultyScore) || difficultyScore <= 0) {
    throw new Error('Difficulty score must be a positive finite number.');
  }
  if (!Number.isInteger(errorCount) || errorCount < 0) {
    throw new Error('Error count must be a non-negative integer.');
  }
  if (!Number.isInteger(hintUseCount) || hintUseCount < 0) {
    throw new Error('Hint use count must be a non-negative integer.');
  }

  const policy = LEVEL_SCORE_POLICY[difficultyLevel];
  const position = clamp(
    Math.log(difficultyScore / policy.referenceMinimum) /
      Math.log(policy.referenceMaximum / policy.referenceMinimum),
    0,
    1,
  );
  const baseScore = roundToTen(policy.midpoint * (0.75 + 0.5 * position));
  const noMistakeBonus = errorCount === 0 ? roundToTen(baseScore * 0.05) : 0;
  const noHintBonus = hintUseCount === 0 ? roundToTen(baseScore * 0.05) : 0;

  return {
    baseScore,
    noMistakeBonus,
    noHintBonus,
    totalScore: baseScore + noMistakeBonus + noHintBonus,
  };
}
