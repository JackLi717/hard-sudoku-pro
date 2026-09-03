import {
  Board,
  GameCommand,
  GameDefinition,
  GameSession,
  boardFromFingerprint,
  createGameSession,
  createSolverCandidates,
  digitsFromMask,
  dispatchGameCommand,
  findFullHousePlacements,
} from '../src/domain';
import {
  createBehaviorRecognitionState,
  observeAcceptedGameCommand,
} from '../src/application';

const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const solved = boardFromFingerprint(solution);
const definition: GameDefinition = {
  puzzleId: 'full-house',
  contentVersion: 4,
  difficultyLevel: 1,
  puzzleFingerprint: [...solution]
    .map((digit, cell) => (cell === 8 || cell === 80 ? '0' : digit))
    .join(''),
  solutionFingerprint: solution,
};

function session(): GameSession {
  const game = createGameSession({
    sessionId: 'full-house-session',
    definition,
    startedAtEpochMs: 1_000,
  });
  return {
    ...game,
    state: {
      ...game.state,
      selectedCell: 80,
      candidates: {
        ...game.state.candidates,
        pencilMode: true,
        manualCandidates: createSolverCandidates(game.state.values),
      },
    },
  };
}

const command: GameCommand = {
  type: 'complete_full_house',
  cell: 8,
  moveId: 'full-house-move',
  atEpochMs: 1_100,
};

describe('Full House only', () => {
  test.each([
    ['row', [0, 1, 2, 3, 4, 5, 6, 7], 8],
    ['column', [0, 9, 18, 27, 36, 45, 54, 63], 72],
    ['box', [0, 1, 2, 9, 10, 11, 18, 19], 20],
  ] as const)('finds the last empty cell in a %s', (_, placed, target) => {
    const board = solved.map((digit, cell) =>
      (placed as readonly number[]).includes(cell) ? digit : null,
    );
    expect([...findFullHousePlacements(board)]).toEqual([
      [target, solved[target]],
    ]);
  });

  test('does not treat a single candidate as a Full House', () => {
    const board: Board = Array.from({ length: 81 }, () => null);
    const values = [...board];
    values[1] = 1;
    values[2] = 2;
    values[3] = 3;
    values[4] = 4;
    values[9] = 6;
    values[18] = 7;
    values[27] = 8;
    values[36] = 9;
    expect(digitsFromMask(createSolverCandidates(values)[0])).toEqual([5]);
    expect(findFullHousePlacements(values).size).toBe(0);
    expect(findFullHousePlacements(solved).size).toBe(0);
  });

  test('rejects duplicate house values and a missing digit blocked by a peer', () => {
    const row = solved.map((digit, cell) => (cell < 8 ? digit : null));
    row[1] = row[0];
    expect(findFullHousePlacements(row).size).toBe(0);
    row[1] = solved[1];
    row[17] = solved[8];
    expect(findFullHousePlacements(row).size).toBe(0);
  });

  test('fills only the tapped cell, preserves pencil mode, and undoes once', () => {
    const before = session();
    const result = dispatchGameCommand(before, definition, command);
    expect(result.accepted).toBe(true);
    expect(result.session.state.values[8]).toBe(2);
    expect(result.session.state.values[80]).toBeNull();
    expect(result.session.state.selectedCell).toBe(80);
    expect(result.session.state.candidates.pencilMode).toBe(true);
    expect(result.session.state.candidates.manualCandidates[8]).toBe(0);
    expect(result.session.state.hintUseCount).toBe(0);
    expect(result.creditSpend).toBeUndefined();
    expect(result.session.history).toHaveLength(1);
    expect(result.session.history[0]).toMatchObject({
      kind: 'place_value',
      techniqueCode: 'fullHouse',
      cell: 8,
      digit: 2,
    });

    const repeated = dispatchGameCommand(result.session, definition, {
      ...command,
      moveId: 'repeat',
    });
    expect(repeated.session).toBe(result.session);
    const undone = dispatchGameCommand(result.session, definition, {
      type: 'undo',
      atEpochMs: 1_200,
    });
    expect(undone.session.state.values).toEqual(before.state.values);
    expect(undone.session.state.candidates).toEqual(before.state.candidates);
    expect(undone.session.history).toHaveLength(0);
  });

  test('rechecks the board and respects pause and hint guards', () => {
    const before = session();
    const values = [...before.state.values];
    for (const cell of [6, 17]) {
      values[cell] = null;
    }
    const changed = { ...before, state: { ...before.state, values } };
    expect(dispatchGameCommand(changed, definition, command).session).toBe(
      changed,
    );
    const paused = {
      ...before,
      state: { ...before.state, status: 'paused' as const },
    };
    expect(dispatchGameCommand(paused, definition, command).reason).toBe(
      'game_not_active',
    );
    const hinted = {
      ...before,
      state: {
        ...before.state,
        activeHint: {
          contractVersion: 1 as const,
          boardFingerprint: definition.puzzleFingerprint,
          techniqueCode: 'fullHouse' as const,
          difficultyLevel: 1 as const,
          focusCells: [8],
          focusRegions: [],
          premiseCandidates: [],
          eliminations: [],
          placements: [{ cell: 8, digit: 2 as const }],
          explanationKey: 'hint.fullHouse' as const,
          explanationParams: {},
        },
      },
    };
    expect(dispatchGameCommand(hinted, definition, command).reason).toBe(
      'hint_in_progress',
    );
  });

  test('keeps assisted filling out of independent technique recognition', () => {
    const before = session();
    const result = dispatchGameCommand(before, definition, command);
    const observation = observeAcceptedGameCommand(
      createBehaviorRecognitionState(before),
      before,
      command,
      result,
    );
    expect(observation.analysisRequest).toBeNull();
    expect(observation.state.segment).toBeNull();
    expect(observation.state.growthCandidates).toEqual(
      createSolverCandidates(result.session.state.values),
    );
  });
});
