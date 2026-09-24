import {
  LEVEL_SCORE_POLICY,
  calculateCompletionScore,
} from '../src/domain/game/scoring';
import type { DifficultyLevel } from '../src/domain/hints/techniques';

describe('single-game scoring', () => {
  test.each([1, 2, 3, 4, 5] as DifficultyLevel[])(
    'keeps Level %s inside its fixed base range',
    level => {
      const policy = LEVEL_SCORE_POLICY[level];
      expect(
        calculateCompletionScore({
          difficultyLevel: level,
          difficultyScore: policy.referenceMinimum / 2,
          errorCount: 1,
          hintUseCount: 1,
        }).baseScore,
      ).toBe(policy.midpoint * 0.75);
      expect(
        calculateCompletionScore({
          difficultyLevel: level,
          difficultyScore: policy.referenceMaximum * 2,
          errorCount: 1,
          hintUseCount: 1,
        }).baseScore,
      ).toBe(policy.midpoint * 1.25);
    },
  );

  test('maps raw burden logarithmically within a level', () => {
    expect(
      calculateCompletionScore({
        difficultyLevel: 5,
        difficultyScore: 15_000,
        errorCount: 1,
        hintUseCount: 1,
      }),
    ).toEqual({
      baseScore: 15_440,
      noMistakeBonus: 0,
      noHintBonus: 0,
      totalScore: 15_440,
    });
  });

  test('adds independent five-percent quality bonuses rounded to ten', () => {
    const perfect = calculateCompletionScore({
      difficultyLevel: 5,
      difficultyScore: 15_000,
      errorCount: 0,
      hintUseCount: 0,
    });
    expect(perfect).toEqual({
      baseScore: 15_440,
      noMistakeBonus: 770,
      noHintBonus: 770,
      totalScore: 16_980,
    });

    expect(
      calculateCompletionScore({
        difficultyLevel: 5,
        difficultyScore: 15_000,
        errorCount: 2,
        hintUseCount: 0,
      }),
    ).toMatchObject({ noMistakeBonus: 0, noHintBonus: 770 });
  });

  test('rejects invalid scoring evidence', () => {
    expect(() =>
      calculateCompletionScore({
        difficultyLevel: 1,
        difficultyScore: 0,
        errorCount: 0,
        hintUseCount: 0,
      }),
    ).toThrow('Difficulty score');
    expect(() =>
      calculateCompletionScore({
        difficultyLevel: 1,
        difficultyScore: 600,
        errorCount: -1,
        hintUseCount: 0,
      }),
    ).toThrow('Error count');
  });
});
