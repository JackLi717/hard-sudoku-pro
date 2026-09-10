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
  premiumAtCompletion: boolean;
  quickPencil: number;
  smartHint: number;
};

export type AttemptProgressResult = {
  progress: PlayerCompletionProgress;
  reward: CompletionReward;
};

const EMPTY_REWARD: CompletionReward = {
  isFirstCompletion: false,
  premiumAtCompletion: false,
  quickPencil: 0,
  smartHint: 0,
};

const PREMIUM_COMPLETION_REWARDS: Readonly<
  Record<DifficultyLevel, { quickPencil: number; smartHint: number }>
> = {
  1: { quickPencil: 1, smartHint: 1 },
  2: { quickPencil: 1, smartHint: 2 },
  3: { quickPencil: 1, smartHint: 3 },
  4: { quickPencil: 1, smartHint: 4 },
  5: { quickPencil: 1, smartHint: 5 },
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
  premiumAtCompletion = false,
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
    const reward = premiumAtCompletion
      ? PREMIUM_COMPLETION_REWARDS[state.difficultyLevel]
      : { quickPencil: 0, smartHint: 0 };
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
        premiumAtCompletion,
        ...reward,
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
