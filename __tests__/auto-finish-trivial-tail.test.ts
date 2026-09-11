import {
  AUTO_FINISH_EMPTY_CELL_LIMIT,
  GameDefinition,
  boardFromFingerprint,
  createBoardFingerprint,
  createGameSession,
  dispatchGameCommand,
  findTrivialTailCompletion,
} from '../src/domain';

const solution =
  '296845371843716295571293468319562784482971653765384129638157942157429836924638517';
const nineteenCellTail = [
  36, 76, 70, 74, 66, 49, 50, 41, 69, 77, 63, 68, 48, 73, 42, 78, 18, 45, 16,
];

function boardWithBlanks(cells: readonly number[]) {
  const blanks = new Set(cells);
  return boardFromFingerprint(solution).map((value, cell) =>
    blanks.has(cell) ? null : value,
  );
}

test('proves a sub-20-cell tail using only Full Houses and naked singles', () => {
  const board = boardWithBlanks(nineteenCellTail);
  const placements = findTrivialTailCompletion(board);
  expect(placements).toHaveLength(19);
  expect(
    placements?.every(({ technique }) =>
      ['fullHouse', 'nakedSingle'].includes(technique),
    ),
  ).toBe(true);
});

test('does no work at 20 empty cells or when singles cannot finish the board', () => {
  expect(
    findTrivialTailCompletion(
      boardWithBlanks(
        Array.from({ length: AUTO_FINISH_EMPTY_CELL_LIMIT }, (_, cell) => cell),
      ),
    ),
  ).toBeNull();

  // Two interchangeable 2/9 pairs leave no Full House or naked single.
  expect(findTrivialTailCompletion(boardWithBlanks([0, 1, 72, 73]))).toBeNull();
});

test('finishes Level 3 atomically without a hint or player move', () => {
  const puzzle = boardWithBlanks(nineteenCellTail);
  const definition: GameDefinition = {
    puzzleId: 'trivial-tail',
    contentVersion: 1,
    difficultyLevel: 3,
    puzzleFingerprint: createBoardFingerprint(puzzle),
    solutionFingerprint: solution,
  };
  const session = createGameSession({
    sessionId: 'session',
    definition,
    startedAtEpochMs: 100,
  });
  const result = dispatchGameCommand(session, definition, {
    type: 'auto_finish_trivial_tail',
    atEpochMs: 250,
  });

  expect(result.accepted).toBe(true);
  expect(result.session.state.status).toBe('completed');
  expect(result.session.state.values.join('')).toBe(solution);
  expect(result.session.state.completionKind).toBe('perfect');
  expect(result.session.state.hintUseCount).toBe(0);
  expect(result.session.history).toHaveLength(0);
});

test('never auto-finishes Level 1 or 2', () => {
  const puzzle = boardWithBlanks([0]);
  for (const difficultyLevel of [1, 2] as const) {
    const definition: GameDefinition = {
      puzzleId: `level-${difficultyLevel}`,
      contentVersion: 1,
      difficultyLevel,
      puzzleFingerprint: createBoardFingerprint(puzzle),
      solutionFingerprint: solution,
    };
    const session = createGameSession({
      sessionId: `session-${difficultyLevel}`,
      definition,
      startedAtEpochMs: 100,
    });
    const result = dispatchGameCommand(session, definition, {
      type: 'auto_finish_trivial_tail',
      atEpochMs: 250,
    });
    expect(result.session).toBe(session);
  }
});
