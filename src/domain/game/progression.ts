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
  currentCompletionStreak: number;
  bestCompletionStreak: number;
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

export function nextHintRewardProgress(progress: number): Readonly<{
  progress: number;
  smartHint: number;
}> {
  if (!Number.isInteger(progress) || progress < 0 || progress > 2) {
    throw new Error('Hint reward progress must be 0, 1, or 2.');
  }
  const next = progress + 1;
  return { progress: next % 3, smartHint: next === 3 ? 1 : 0 };
}

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
    if (!wasPreviouslyCompleted) {
      completed.add(state.puzzleId);
    }
    const currentCompletionStreak = progress.currentCompletionStreak + 1;
    return {
      progress: {
        completedPuzzleIds: [...completed].sort(),
        currentCompletionStreak,
        bestCompletionStreak: Math.max(
          progress.bestCompletionStreak,
          currentCompletionStreak,
        ),
      },
      reward: {
        isFirstCompletion: !wasPreviouslyCompleted,
        premiumAtCompletion: !wasPreviouslyCompleted && premiumAtCompletion,
        quickPencil: 0,
        smartHint: 0,
      },
    };
  }

  if (['failed', 'abandoned'].includes(state.status)) {
    return {
      progress: {
        ...progress,
        currentCompletionStreak: 0,
      },
      reward: EMPTY_REWARD,
    };
  }

  return { progress, reward: EMPTY_REWARD };
}
