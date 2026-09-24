import {
  GameDefinition,
  PlayerCompletionProgress,
  PuzzleRecord,
  applyAttemptProgress,
  assignPuzzle,
  createGameSession,
  dispatchGameCommand,
  planGameStart,
} from '../src/domain';

const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

function puzzleRecord(id: string, enabled = true): PuzzleRecord {
  return {
    id,
    puzzle: `${solution.slice(0, 80)}0`,
    solution,
    difficultyLevel: 2,
    difficultyScore: 10,
    hardestTechnique: 'hiddenSingle',
    ratingVersion: 'hsp-v1',
    source: 'test',
    contentVersion: 4,
    checksum: `checksum-${id}`,
    enabled,
  };
}

function completedState(
  puzzleId: string,
  completionKind: 'perfect' | 'independent' | 'hint_assisted' = 'perfect',
) {
  const definition: GameDefinition = {
    puzzleId,
    contentVersion: 4,
    difficultyLevel: 2,
    difficultyScore: 3_000,
    puzzleFingerprint: `${solution.slice(0, 80)}0`,
    solutionFingerprint: solution,
  };
  let session = createGameSession({
    sessionId: `session-${puzzleId}`,
    definition,
    startedAtEpochMs: 1_000,
  });
  session = dispatchGameCommand(session, definition, {
    type: 'select_cell',
    cell: 80,
    atEpochMs: 1_100,
  }).session;
  session = dispatchGameCommand(session, definition, {
    type: 'input_digit',
    digit: 9,
    moveId: `finish-${puzzleId}`,
    atEpochMs: 2_000,
  }).session;
  return { ...session.state, completionKind };
}

describe('game progression rules', () => {
  test('assigns unfinished enabled puzzles before deterministic replays', () => {
    const puzzles = [
      puzzleRecord('p1'),
      puzzleRecord('p2'),
      puzzleRecord('p3'),
      puzzleRecord('disabled', false),
    ];
    const first = assignPuzzle(puzzles, 2, new Set(['p1']), 'seed-1');
    const repeated = assignPuzzle(puzzles, 2, new Set(['p1']), 'seed-1');

    expect(first).toEqual(repeated);
    expect(first?.replay).toBe(false);
    expect(first?.puzzle.id).not.toBe('p1');
    expect(first?.puzzle.id).not.toBe('disabled');

    const replay = assignPuzzle(
      puzzles,
      2,
      new Set(['p1', 'p2', 'p3']),
      'seed-2',
    );
    expect(replay?.replay).toBe(true);
  });

  test('requires an explicit choice before replacing an unfinished game', () => {
    const definition: GameDefinition = {
      puzzleId: 'p1',
      contentVersion: 4,
      difficultyLevel: 2,
      difficultyScore: 3_000,
      puzzleFingerprint: `${solution.slice(0, 80)}0`,
      solutionFingerprint: solution,
    };
    const session = createGameSession({
      sessionId: 'active-session',
      definition,
      startedAtEpochMs: 1_000,
    });

    expect(planGameStart(session)).toEqual({
      action: 'resume_or_abandon_confirmation',
      sessionId: 'active-session',
    });
    expect(planGameStart(null)).toEqual({ action: 'start' });
  });

  test('awards only Premium first completions without perfect or streak bonuses', () => {
    let progress: PlayerCompletionProgress = {
      completedPuzzleIds: [],
      currentCompletionStreak: 0,
      bestCompletionStreak: 0,
    };

    const first = applyAttemptProgress(
      progress,
      completedState('p1', 'perfect'),
      true,
    );
    progress = first.progress;
    expect(first.reward).toEqual({
      isFirstCompletion: true,
      premiumAtCompletion: true,
      quickPencil: 1,
      smartHint: 2,
    });

    progress = applyAttemptProgress(
      progress,
      completedState('p2', 'hint_assisted'),
      true,
    ).progress;
    const third = applyAttemptProgress(
      progress,
      completedState('p3', 'independent'),
      true,
    );
    expect(third.reward).toEqual({
      isFirstCompletion: true,
      premiumAtCompletion: true,
      quickPencil: 1,
      smartHint: 2,
    });
    expect(third.progress.currentCompletionStreak).toBe(3);
    expect(third.progress.bestCompletionStreak).toBe(3);

    const replay = applyAttemptProgress(
      third.progress,
      completedState('p1', 'perfect'),
      true,
    );
    expect(replay.progress).toEqual({
      ...third.progress,
      currentCompletionStreak: 4,
      bestCompletionStreak: 4,
    });
    expect(replay.reward).toEqual({
      isFirstCompletion: false,
      premiumAtCompletion: false,
      quickPencil: 0,
      smartHint: 0,
    });
  });

  test('records free first completions without granting credits', () => {
    const result = applyAttemptProgress(
      {
        completedPuzzleIds: [],
        currentCompletionStreak: 0,
        bestCompletionStreak: 0,
      },
      completedState('free', 'perfect'),
    );
    expect(result.reward).toEqual({
      isFirstCompletion: true,
      premiumAtCompletion: false,
      quickPencil: 0,
      smartHint: 0,
    });
  });

  test.each([
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 5],
  ] as const)('grants the Level %i Premium table', (level, smartHint) => {
    const state = {
      ...completedState(`level-${level}`, 'hint_assisted'),
      difficultyLevel: level,
    };
    expect(
      applyAttemptProgress(
        {
          completedPuzzleIds: [],
          currentCompletionStreak: 0,
          bestCompletionStreak: 0,
        },
        state,
        true,
      ).reward,
    ).toEqual({
      isFirstCompletion: true,
      premiumAtCompletion: true,
      quickPencil: 1,
      smartHint,
    });
  });

  test('failure or abandonment breaks the current streak for any puzzle', () => {
    const progress: PlayerCompletionProgress = {
      completedPuzzleIds: ['replay'],
      currentCompletionStreak: 2,
      bestCompletionStreak: 4,
    };
    const base = completedState('new-puzzle');
    const failed = applyAttemptProgress(progress, {
      ...base,
      status: 'failed',
      completionKind: null,
    });
    expect(failed.progress.currentCompletionStreak).toBe(0);
    expect(failed.progress.bestCompletionStreak).toBe(4);

    const replayFailure = applyAttemptProgress(progress, {
      ...base,
      puzzleId: 'replay',
      status: 'abandoned',
      completionKind: null,
    });
    expect(replayFailure.progress.currentCompletionStreak).toBe(0);
    expect(replayFailure.progress.bestCompletionStreak).toBe(4);
  });
});
