import { PuzzleRecord } from '../content/contracts';
import { DifficultyLevel } from '../hints/techniques';
import { GameSession, GameState } from './contracts';

export type PuzzleAssignment = {
  puzzle: PuzzleRecord;
  replay: boolean;
};

export type GameStartPlan =
  | { action: 'start' }
  | { action: 'resume_or_abandon_confirmation'; sessionId: string };

export type PlayerCompletionProgress = {
  completedPuzzleIds: readonly string[];
  currentFirstCompletionStreak: number;
  bestFirstCompletionStreak: number;
};

export type CompletionReward = {
  isFirstCompletion: boolean;
  quickPencil: number;
  smartHint: number;
  perfectBonus: boolean;
  streakBonus: boolean;
};

export type AttemptProgressResult = {
  progress: PlayerCompletionProgress;
  reward: CompletionReward;
};

const EMPTY_REWARD: CompletionReward = {
  isFirstCompletion: false,
  quickPencil: 0,
  smartHint: 0,
  perfectBonus: false,
  streakBonus: false,
};

const BASE_REWARDS: Readonly<
  Record<DifficultyLevel, { quickPencil: number; smartHint: number }>
> = {
  1: { quickPencil: 1, smartHint: 0 },
  2: { quickPencil: 1, smartHint: 1 },
  3: { quickPencil: 1, smartHint: 1 },
  4: { quickPencil: 1, smartHint: 2 },
  5: { quickPencil: 2, smartHint: 2 },
};

function stableHash(value: string): number {
  let hash = 17;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2_147_483_647;
  }
  return hash;
}

export function assignPuzzle(
  puzzles: readonly PuzzleRecord[],
  difficultyLevel: DifficultyLevel,
  completedPuzzleIds: ReadonlySet<string>,
  allocationSeed: string,
): PuzzleAssignment | null {
  const eligible = puzzles
    .filter(
      puzzle => puzzle.enabled && puzzle.difficultyLevel === difficultyLevel,
    )
    .sort((left, right) =>
      left.id < right.id ? -1 : left.id > right.id ? 1 : 0,
    );
  if (eligible.length === 0) {
    return null;
  }

  const unfinished = eligible.filter(
    puzzle => !completedPuzzleIds.has(puzzle.id),
  );
  const pool = unfinished.length > 0 ? unfinished : eligible;
  return {
    puzzle: pool[stableHash(allocationSeed) % pool.length],
    replay: unfinished.length === 0,
  };
}

export function planGameStart(
  unfinishedSession: GameSession | null,
): GameStartPlan {
  if (
    unfinishedSession &&
    ['active', 'paused'].includes(unfinishedSession.state.status)
  ) {
    return {
      action: 'resume_or_abandon_confirmation',
      sessionId: unfinishedSession.state.sessionId,
    };
  }
  return { action: 'start' };
}

export function applyAttemptProgress(
  progress: PlayerCompletionProgress,
  state: GameState,
): AttemptProgressResult {
  const completed = new Set(progress.completedPuzzleIds);
  const wasPreviouslyCompleted = completed.has(state.puzzleId);

  if (state.status === 'completed') {
    if (wasPreviouslyCompleted) {
      return { progress, reward: EMPTY_REWARD };
    }

    completed.add(state.puzzleId);
    const currentFirstCompletionStreak =
      progress.currentFirstCompletionStreak + 1;
    const streakBonus = currentFirstCompletionStreak % 3 === 0;
    const perfectBonus = state.completionKind === 'perfect';
    const base = BASE_REWARDS[state.difficultyLevel];
    return {
      progress: {
        completedPuzzleIds: [...completed].sort(),
        currentFirstCompletionStreak,
        bestFirstCompletionStreak: Math.max(
          progress.bestFirstCompletionStreak,
          currentFirstCompletionStreak,
        ),
      },
      reward: {
        isFirstCompletion: true,
        quickPencil: base.quickPencil + (streakBonus ? 1 : 0),
        smartHint:
          base.smartHint + (perfectBonus ? 1 : 0) + (streakBonus ? 1 : 0),
        perfectBonus,
        streakBonus,
      },
    };
  }

  if (
    !wasPreviouslyCompleted &&
    ['failed', 'abandoned'].includes(state.status)
  ) {
    return {
      progress: {
        ...progress,
        currentFirstCompletionStreak: 0,
      },
      reward: EMPTY_REWARD,
    };
  }

  return { progress, reward: EMPTY_REWARD };
}
