import {
  GameCommand,
  GameDefinition,
  GameSession,
  HINT_STEP_CONTRACT_VERSION,
  HintStep,
  createGameSession,
  createSolverCandidates,
  digitsFromMask,
  dispatchGameCommand,
  getElapsedMs,
  getGameConflictingCells,
  retryGame,
} from '../src/domain';
import {
  cellColor,
  clearCellColors,
  colorCells,
  toggleCellColor,
} from '../src/domain/game/annotations';
import {
  deserializeGameState,
  serializeGameState,
} from '../src/data/user/game-serialization';

const puzzle =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

function definition(
  puzzleFingerprint = puzzle,
  solutionFingerprint = solution,
): GameDefinition {
  return {
    puzzleId: 'puzzle-1',
    contentVersion: 4,
    difficultyLevel: 3,
    puzzleFingerprint,
    solutionFingerprint,
  };
}

function createSession(
  overrides: Parameters<typeof createGameSession>[0]['settings'] = {},
  gameDefinition = definition(),
): GameSession {
  return createGameSession({
    sessionId: 'session-1',
    definition: gameDefinition,
    startedAtEpochMs: 1_000,
    settings: overrides,
  });
}

function run(
  session: GameSession,
  gameDefinition: GameDefinition,
  command: GameCommand,
): GameSession {
  const result = dispatchGameCommand(session, gameDefinition, command);
  expect(result.accepted).toBe(true);
  return result.session;
}

function select(
  session: GameSession,
  gameDefinition: GameDefinition,
  cell: number,
  atEpochMs = 1_100,
): GameSession {
  return run(session, gameDefinition, {
    type: 'select_cell',
    cell,
    atEpochMs,
  });
}

function eliminationStep(boardFingerprint: string): HintStep {
  return {
    contractVersion: HINT_STEP_CONTRACT_VERSION,
    boardFingerprint,
    techniqueCode: 'lockedCandidates.pointing',
    difficultyLevel: 2,
    focusCells: [2],
    focusRegions: [{ kind: 'row', index: 0 }],
    premiseCandidates: [],
    eliminations: [{ cell: 2, digit: 1 }],
    placements: [],
    explanationKey: 'hint.lockedCandidates.pointing',
    explanationParams: {},
  };
}

describe('game domain engine', () => {
  test('repeating a correct placed digit is an accepted no-op without another move', () => {
    const gameDefinition = definition();
    let session = select(createSession(), gameDefinition, 2);
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 4,
      moveId: 'correct-first',
      atEpochMs: 1_200,
    });
    const correctRepeat = dispatchGameCommand(session, gameDefinition, {
      type: 'input_digit',
      digit: 4,
      moveId: 'correct-repeat',
      atEpochMs: 1_300,
    });
    expect(correctRepeat.accepted).toBe(true);
    expect(correctRepeat.session).toBe(session);
    expect(correctRepeat.session.history).toHaveLength(1);
  });
  test('cell coloring preserves future annotation facets and Clear All removes only colors', () => {
    const annotations = [
      {
        type: 'cell' as const,
        cell: 1,
        color: 1 as const,
        marker: 'circle' as const,
      },
      {
        type: 'candidate' as const,
        cell: 2,
        digit: 3 as const,
        marker: 'triangle' as const,
      },
      {
        type: 'relation' as const,
        id: 'link-1',
        from: { type: 'cell' as const, cell: 0 },
        to: { type: 'cell' as const, cell: 1 },
        relationType: 'strong' as const,
      },
    ];
    const colored = colorCells(annotations, [1, 3], 5);
    expect(
      colored.find(entry => entry.type === 'cell' && entry.cell === 1),
    ).toMatchObject({
      color: 5,
      marker: 'circle',
    });
    expect(clearCellColors(colored)).toEqual([
      { type: 'cell', cell: 1, marker: 'circle' },
      annotations[1],
      annotations[2],
    ]);
    expect(toggleCellColor(annotations, 1, 1)).toEqual([
      { type: 'cell', cell: 1, marker: 'circle' },
      annotations[1],
      annotations[2],
    ]);
  });
  test('the stored annotation union can hold cell, candidate and relation scopes', () => {
    const state = createSession().state;
    const annotations = [
      { type: 'cell' as const, cell: 0, color: 2 as const },
      {
        type: 'candidate' as const,
        cell: 1,
        digit: 4 as const,
        marker: 'square' as const,
      },
      {
        type: 'relation' as const,
        id: 'r1',
        from: { type: 'cell' as const, cell: 0 },
        to: { type: 'candidate' as const, cell: 1, digit: 4 as const },
        lineStyle: 'dashed' as const,
      },
    ];
    expect(
      deserializeGameState(serializeGameState({ ...state, annotations }))
        .annotations,
    ).toEqual(annotations);
  });
  test('board colors overwrite, clear and undo without changing Sudoku values or candidates', () => {
    const gameDefinition = definition();
    const original = createSession({}, gameDefinition);
    let session = run(original, gameDefinition, {
      type: 'color_cells',
      cells: [0, 1, 2],
      color: 0,
      moveId: 'stroke-one',
      atEpochMs: 1_100,
    });
    expect(session.history).toHaveLength(1);
    expect(
      [0, 1, 2].map(cell => cellColor(session.state.annotations, cell)),
    ).toEqual([0, 0, 0]);
    session = run(session, gameDefinition, {
      type: 'color_cells',
      cells: [1],
      color: 5,
      moveId: 'stroke-two',
      atEpochMs: 1_101,
    });
    expect(
      [0, 1, 2].map(cell => cellColor(session.state.annotations, cell)),
    ).toEqual([0, 5, 0]);
    session = run(session, gameDefinition, {
      type: 'clear_board_colors',
      moveId: 'clear',
      atEpochMs: 1_102,
    });
    expect(session.state.annotations).toEqual([]);
    session = run(session, gameDefinition, { type: 'undo', atEpochMs: 1_103 });
    expect(
      [0, 1, 2].map(cell => cellColor(session.state.annotations, cell)),
    ).toEqual([0, 5, 0]);
    session = run(session, gameDefinition, { type: 'undo', atEpochMs: 1_104 });
    expect(
      [0, 1, 2].map(cell => cellColor(session.state.annotations, cell)),
    ).toEqual([0, 0, 0]);
    expect(session.state.values).toEqual(original.state.values);
    expect(session.state.candidates).toEqual(original.state.candidates);
  });
  test('a same-color tap clears one cell and Undo restores it while selection remains available', () => {
    const gameDefinition = definition();
    const original = createSession({}, gameDefinition);
    let session = select(original, gameDefinition, 2);
    session = run(session, gameDefinition, {
      type: 'color_cells',
      cells: [2],
      color: 3,
      toggleSameColor: true,
      moveId: 'paint',
      atEpochMs: 1_101,
    });
    expect(session.state.selectedCell).toBe(2);
    expect(cellColor(session.state.annotations, 2)).toBe(3);
    session = run(session, gameDefinition, {
      type: 'color_cells',
      cells: [2],
      color: 3,
      toggleSameColor: true,
      moveId: 'toggle',
      atEpochMs: 1_102,
    });
    expect(cellColor(session.state.annotations, 2)).toBeNull();
    expect(session.state.selectedCell).toBe(2);
    session = run(session, gameDefinition, { type: 'undo', atEpochMs: 1_103 });
    expect(cellColor(session.state.annotations, 2)).toBe(3);
    expect(session.state.values).toEqual(original.state.values);
    expect(session.state.candidates).toEqual(original.state.candidates);
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 4,
      moveId: 'digit-after-color',
      atEpochMs: 1_104,
    });
    expect(session.state.values[2]).toBe(4);
    expect(cellColor(session.state.annotations, 2)).toBe(3);
    session = run(session, gameDefinition, {
      type: 'erase',
      moveId: 'erase-after-color',
      atEpochMs: 1_105,
    });
    expect(session.state.values[2]).toBeNull();
    session = run(session, gameDefinition, {
      type: 'set_pencil_mode',
      enabled: true,
      atEpochMs: 1_106,
    });
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 1,
      moveId: 'pencil-after-color',
      atEpochMs: 1_107,
    });
    expect(
      digitsFromMask(session.state.candidates.manualCandidates[2]),
    ).toEqual([1]);
  });
  test('edits the cells × candidates cross product as one undoable action', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = run(session, gameDefinition, {
      type: 'edit_candidates',
      cells: [2, 3, 5],
      candidates: [1, 2],
      action: 'add',
      source: 'manual',
      moveId: 'add-batch',
      atEpochMs: 1_100,
    });
    for (const cell of [2, 3, 5]) {
      expect(
        digitsFromMask(session.state.candidates.manualCandidates[cell]),
      ).toEqual([1, 2]);
    }
    expect(session.history).toHaveLength(1);
    session = run(session, gameDefinition, {
      type: 'edit_candidates',
      cells: [2, 3, 5, 8],
      candidates: [1],
      action: 'remove',
      source: 'manual',
      moveId: 'remove-batch',
      atEpochMs: 1_200,
    });
    for (const cell of [2, 3, 5]) {
      expect(
        digitsFromMask(session.state.candidates.manualCandidates[cell]),
      ).toEqual([2]);
    }
    expect(session.history).toHaveLength(2);
    expect(session.history[1].cell).toBeNull();
    session = run(session, gameDefinition, { type: 'undo', atEpochMs: 1_300 });
    for (const cell of [2, 3, 5]) {
      expect(
        digitsFromMask(session.state.candidates.manualCandidates[cell]),
      ).toEqual([1, 2]);
    }
    expect(session.history).toHaveLength(1);
  });

  test('treats selection as transient presentation state', () => {
    const gameDefinition = definition();
    const session = createSession({}, gameDefinition);
    const selected = select(session, gameDefinition, 2, 5_000);

    expect(selected.state.selectedCell).toBe(2);
    expect(selected.state.revision).toBe(session.state.revision);
    expect(selected.state.updatedAtEpochMs).toBe(
      session.state.updatedAtEpochMs,
    );
    expect(selected.state.timer).toEqual(session.state.timer);
  });

  test('keeps givens immutable and edits only the active player draft', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = select(session, gameDefinition, 0);

    const givenResult = dispatchGameCommand(session, gameDefinition, {
      type: 'erase',
      moveId: 'move-given',
      atEpochMs: 1_200,
    });
    expect(givenResult.accepted).toBe(false);
    expect(givenResult.reason).toBe('given_cell');

    session = select(session, gameDefinition, 2, 1_300);
    session = run(session, gameDefinition, {
      type: 'set_pencil_mode',
      enabled: true,
      atEpochMs: 1_400,
    });
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 9,
      moveId: 'manual-9',
      atEpochMs: 1_500,
    });

    expect(
      digitsFromMask(session.state.candidates.manualCandidates[2]),
    ).toEqual([9]);
    expect(session.state.candidates.quickCandidates[2]).toBe(0);
    expect(session.state.candidates.hintCandidates).toBeNull();
  });

  test('generates once, restores after board changes, and regenerates only on confirmation', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    const generated = dispatchGameCommand(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 1_100,
    });
    expect(generated.accepted).toBe(true);
    expect(generated.creditSpend).toEqual({
      resource: 'quick_pencil',
      amount: 1,
    });
    session = generated.session;
    expect(session.state.candidates.activeCandidateSource).toBe('quick');
    expect(session.state.candidates.pencilMode).toBe(true);
    expect(digitsFromMask(session.state.candidates.quickCandidates[2])).toEqual(
      [1, 2, 4],
    );

    session = run(session, gameDefinition, {
      type: 'set_pencil_mode',
      enabled: false,
      atEpochMs: 1_200,
    });
    session = select(session, gameDefinition, 40, 1_300);
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 5,
      moveId: 'place-5',
      atEpochMs: 1_400,
    });

    const shown = dispatchGameCommand(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 0,
      atEpochMs: 1_500,
    });
    expect(shown.accepted).toBe(true);
    expect(shown.creditSpend).toBeUndefined();
    expect(shown.session.state.candidates.quickCandidates).toEqual(
      session.state.candidates.quickCandidates,
    );
    expect(shown.session.state.quickPencilUseCount).toBe(1);
    const noCredit = dispatchGameCommand(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: true,
      availableCredits: 0,
      premium: true,
      atEpochMs: 1_500,
    });
    expect(noCredit.reason).toBe('insufficient_quick_pencil_credits');
    expect(noCredit.session.state.candidates.quickCandidates).toEqual(
      session.state.candidates.quickCandidates,
    );

    session = run(session, gameDefinition, {
      type: 'undo',
      atEpochMs: 1_600,
    });
    session = run(session, gameDefinition, {
      type: 'set_candidate_source',
      source: 'manual',
      atEpochMs: 1_700,
    });
    const restored = dispatchGameCommand(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 0,
      atEpochMs: 1_800,
    });
    expect(restored.accepted).toBe(true);
    expect(restored.creditSpend).toBeUndefined();
    expect(restored.session.state.quickPencilUseCount).toBe(1);
  });

  test('undo restores the candidates before quick generation without refunding credit', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = select(session, gameDefinition, 2);
    session = run(session, gameDefinition, {
      type: 'set_pencil_mode',
      enabled: true,
      atEpochMs: 1_200,
    });
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 9,
      moveId: 'manual-before-quick',
      atEpochMs: 1_300,
    });
    session = run(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 1_400,
    });
    session = run(session, gameDefinition, {
      type: 'undo',
      atEpochMs: 1_500,
    });

    expect(
      digitsFromMask(session.state.candidates.manualCandidates[2]),
    ).toEqual([9]);
    expect(session.state.candidates.quickDraftGenerated).toBe(false);
    expect(session.state.candidates.activeCandidateSource).toBe('manual');
    expect(session.state.candidates.quickCandidates[2]).toBe(0);
    expect(session.state.quickPencilUseCount).toBe(1);
  });

  test('show and hide preserve edited quick candidates; regeneration replaces them and undo restores them', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = run(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      moveId: 'generate',
      atEpochMs: 1_100,
    });
    session = run(session, gameDefinition, {
      type: 'edit_candidates',
      cells: [2],
      candidates: [1],
      action: 'remove',
      source: 'quick',
      moveId: 'player-edit',
      atEpochMs: 1_200,
    });
    const edited = [...session.state.candidates.quickCandidates];
    const historyLength = session.history.length;
    session = run(session, gameDefinition, {
      type: 'set_candidate_source',
      source: 'manual',
      atEpochMs: 1_300,
    });
    session = run(session, gameDefinition, {
      type: 'set_candidate_source',
      source: 'quick',
      atEpochMs: 1_400,
    });
    expect(session.history).toHaveLength(historyLength);
    expect(session.state.candidates.quickCandidates).toEqual(edited);
    expect(session.state.quickPencilUseCount).toBe(1);

    const canceled = dispatchGameCommand(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: true,
      availableCredits: 0,
      atEpochMs: 1_500,
    });
    expect(canceled.accepted).toBe(false);
    expect(canceled.session).toBe(session);
    session = run(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: true,
      availableCredits: 1,
      moveId: 'regenerate',
      atEpochMs: 1_600,
    });
    expect(session.history.at(-1)?.kind).toBe('generate_quick_draft');
    expect(digitsFromMask(session.state.candidates.quickCandidates[2])).toEqual(
      [1, 2, 4],
    );
    expect(session.state.quickPencilUseCount).toBe(2);
    session = run(session, gameDefinition, { type: 'undo', atEpochMs: 1_700 });
    expect(session.state.candidates.quickCandidates).toEqual(edited);
    expect(session.state.quickPencilUseCount).toBe(2);
  });

  test('regeneration uses the current placed values rather than the original board', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = run(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 1_100,
    });
    session = run(session, gameDefinition, {
      type: 'set_pencil_mode',
      enabled: false,
      atEpochMs: 1_200,
    });
    session = select(session, gameDefinition, 2, 1_300);
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 4,
      moveId: 'place-four',
      atEpochMs: 1_400,
    });
    const before = [...session.state.candidates.quickCandidates];
    session = run(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: true,
      availableCredits: 1,
      atEpochMs: 1_500,
    });
    expect(session.state.candidates.quickCandidates).toEqual(
      createSolverCandidates(session.state.values),
    );
    expect(session.state.candidates.quickDraftBoardFingerprint).not.toBe(
      gameDefinition.puzzleFingerprint,
    );
    session = run(session, gameDefinition, { type: 'undo', atEpochMs: 1_600 });
    expect(session.state.candidates.quickCandidates).toEqual(before);
    expect(session.state.values[2]).toBe(4);
  });

  test('cleans both drafts on a correct value and restores them with undo', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = run(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 1_100,
    });
    session = run(session, gameDefinition, {
      type: 'set_candidate_source',
      source: 'manual',
      atEpochMs: 1_200,
    });
    session = select(session, gameDefinition, 37, 1_300);
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 5,
      moveId: 'manual-peer-5',
      atEpochMs: 1_400,
    });
    session = run(session, gameDefinition, {
      type: 'set_pencil_mode',
      enabled: false,
      atEpochMs: 1_500,
    });
    session = select(session, gameDefinition, 40, 1_600);
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 5,
      moveId: 'place-center-5',
      atEpochMs: 1_700,
    });
    expect(
      digitsFromMask(session.state.candidates.manualCandidates[37]),
    ).not.toContain(5);
    expect(
      digitsFromMask(session.state.candidates.quickCandidates[37]),
    ).not.toContain(5);

    session = run(session, gameDefinition, {
      type: 'undo',
      atEpochMs: 1_800,
    });
    expect(session.state.values[40]).toBeNull();
    expect(
      digitsFromMask(session.state.candidates.manualCandidates[37]),
    ).toContain(5);
    expect(
      digitsFromMask(session.state.candidates.quickCandidates[37]),
    ).toContain(5);
  });

  test('rebuilds tracked hint candidates when a value is erased', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = dispatchGameCommand(session, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_100,
    }).session;
    session = select(session, gameDefinition, 40, 1_200);
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 5,
      moveId: 'place-for-erase',
      atEpochMs: 1_300,
    });
    expect(session.state.candidates.hintCandidates?.[40]).toBe(0);

    session = run(session, gameDefinition, {
      type: 'erase',
      moveId: 'erase-value',
      atEpochMs: 1_400,
    });
    expect(session.state.values[40]).toBeNull();
    expect(
      digitsFromMask(session.state.candidates.hintCandidates![40]),
    ).toEqual([5]);
    expect(session.state.candidates.hintBoardFingerprint).toBe(puzzle);
  });

  test('uses the complete visible quick draft as the hint candidate state', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = dispatchGameCommand(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 1_100,
    }).session;
    session = select(session, gameDefinition, 2, 1_200);
    for (const digit of [1, 2] as const) {
      session = run(session, gameDefinition, {
        type: 'input_digit',
        digit,
        moveId: `remove-quick-${digit}`,
        atEpochMs: 1_300 + digit,
      });
    }

    const prepared = dispatchGameCommand(session, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_400,
    });

    expect(digitsFromMask(prepared.hintRequest!.hintCandidates[2])).toEqual([
      4,
    ]);
    expect(
      digitsFromMask(prepared.session.state.candidates.hintCandidates![2]),
    ).toEqual([4]);

    const repeated = dispatchGameCommand(prepared.session, gameDefinition, {
      type: 'reveal_hint',
      step: eliminationStep(prepared.hintRequest!.boardFingerprint),
      availableCredits: 1,
      atEpochMs: 1_500,
    });
    expect(repeated.accepted).toBe(false);
    expect(repeated.reason).toBe('invalid_hint');
    expect(repeated.session.state.hintUseCount).toBe(0);
  });

  test('blocks hints without changing state when quick candidates remove the solution', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = dispatchGameCommand(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 1_100,
    }).session;
    const quickCandidates = [...session.state.candidates.quickCandidates];
    // Cell 2 solves to 4. The feedback identifies the cell without revealing 4.
    quickCandidates[2] = 0b11;
    session = {
      ...session,
      state: {
        ...session.state,
        candidates: { ...session.state.candidates, quickCandidates },
      },
    };

    const prepared = dispatchGameCommand(session, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_200,
    });

    expect(prepared.accepted).toBe(false);
    expect(prepared.reason).toBe('quick_candidates_inconsistent');
    expect(prepared.feedbackCells).toEqual([2]);
    expect(prepared.hintRequest).toBeUndefined();
    expect(prepared.creditSpend).toBeUndefined();
    expect(prepared.session).toBe(session);
    expect(prepared.session.state.candidates.hintCandidates).toBeNull();
  });

  test('blocks hints without changing state when quick candidates contain a board-forbidden digit', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = dispatchGameCommand(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 1_100,
    }).session;
    const quickCandidates = [...session.state.candidates.quickCandidates];
    // Cell 2 permits 1, 2 and 4. The solution remains present, but 3 is
    // forbidden by the board, so this grid cannot be trusted for deletions.
    quickCandidates[2] = 0b1101;
    session = {
      ...session,
      state: {
        ...session.state,
        candidates: { ...session.state.candidates, quickCandidates },
      },
    };

    const prepared = dispatchGameCommand(session, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_200,
    });

    expect(prepared.accepted).toBe(false);
    expect(prepared.reason).toBe('quick_candidates_inconsistent');
    expect(prepared.feedbackCells).toEqual([2]);
    expect(prepared.hintRequest).toBeUndefined();
    expect(prepared.session).toBe(session);
  });

  test('does not let hidden hint state override valid visible quick edits', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = run(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 1_100,
    });
    session = run(session, gameDefinition, {
      type: 'reveal_hint',
      step: eliminationStep(puzzle),
      availableCredits: 1,
      atEpochMs: 1_200,
    });
    session = run(session, gameDefinition, {
      type: 'apply_hint',
      moveId: 'exclude-1',
      atEpochMs: 1_300,
    });
    session = select(session, gameDefinition, 2, 1_400);
    for (const digit of [1, 2] as const) {
      session = run(session, gameDefinition, {
        type: 'input_digit',
        digit,
        moveId: `edit-${digit}`,
        atEpochMs: 1_500 + digit,
      });
    }
    expect(digitsFromMask(session.state.candidates.quickCandidates[2])).toEqual(
      [1, 4],
    );
    const prepared = dispatchGameCommand(session, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_600,
    });
    expect(prepared.accepted).toBe(true);
    expect(digitsFromMask(prepared.hintRequest!.hintCandidates[2])).toEqual([
      1, 4,
    ]);
  });

  test('does not use a hidden quick draft as hint evidence', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = run(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 1_100,
    });
    const quickCandidates = [...session.state.candidates.quickCandidates];
    quickCandidates[2] = 0b11;
    session = {
      ...session,
      state: {
        ...session.state,
        candidates: {
          ...session.state.candidates,
          activeCandidateSource: 'manual',
          quickCandidates,
        },
      },
    };

    const prepared = dispatchGameCommand(session, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_200,
    });

    expect(prepared.accepted).toBe(true);
    expect(digitsFromMask(prepared.hintRequest!.hintCandidates[2])).toEqual([
      1, 2, 4,
    ]);
  });

  test('discards a hidden Quick candidate state', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    const hidden = createSolverCandidates(session.state.values).map(
      (mask, cell) => (cell === 2 ? mask - 1 : mask),
    );
    session = {
      ...session,
      state: {
        ...session.state,
        candidates: {
          ...session.state.candidates,
          hintCandidates: hidden,
          hintCandidateOrigin: 'quick',
          appliedHintSteps: [],
          hintBoardFingerprint: puzzle,
        },
      },
    };

    const prepared = dispatchGameCommand(session, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_200,
    });

    expect(prepared.accepted).toBe(true);
    expect(digitsFromMask(prepared.hintRequest!.hintCandidates[2])).toEqual([
      1, 2, 4,
    ]);
    expect(prepared.session.state.candidates.hintCandidateOrigin).toBe('board');
  });

  test('reuses only eliminations from explicitly applied hints', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = run(session, gameDefinition, {
      type: 'reveal_hint',
      step: eliminationStep(puzzle),
      availableCredits: 1,
      atEpochMs: 1_100,
    });
    session = run(session, gameDefinition, {
      type: 'apply_hint',
      moveId: 'apply-explicit-elimination',
      atEpochMs: 1_200,
    });
    expect(session.state.candidates.hintCandidateOrigin).toBe('applied_hint');
    expect(session.state.candidates.appliedHintSteps).toEqual([
      eliminationStep(puzzle),
    ]);
    session = {
      ...session,
      state: deserializeGameState(serializeGameState(session.state)),
    };

    const prepared = dispatchGameCommand(session, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_300,
    });

    expect(prepared.accepted).toBe(true);
    expect(digitsFromMask(prepared.hintRequest!.hintCandidates[2])).toEqual([
      2, 4,
    ]);
    expect(prepared.session.state.candidates.appliedHintSteps).toHaveLength(1);
  });

  test('keeps an applied Hint when Quick Candidates are later hidden', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = run(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: true,
      moveId: 'generate-before-hint',
      availableCredits: 1,
      atEpochMs: 1_050,
    });
    session = run(session, gameDefinition, {
      type: 'reveal_hint',
      step: eliminationStep(puzzle),
      availableCredits: 1,
      atEpochMs: 1_100,
    });
    session = run(session, gameDefinition, {
      type: 'apply_hint',
      moveId: 'apply-with-quick-visible',
      atEpochMs: 1_200,
    });
    expect(session.state.candidates.hintCandidateOrigin).toBe('quick');
    expect(session.state.candidates.appliedHintSteps).toHaveLength(1);
    session = run(session, gameDefinition, {
      type: 'set_candidate_source',
      source: 'manual',
      atEpochMs: 1_250,
    });

    const prepared = dispatchGameCommand(session, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_300,
    });

    expect(prepared.accepted).toBe(true);
    expect(prepared.session.state.candidates.hintCandidateOrigin).toBe(
      'applied_hint',
    );
    expect(digitsFromMask(prepared.hintRequest!.hintCandidates[2])).toEqual([
      2, 4,
    ]);
  });

  test('blocks hint preparation for checked errors without spending a hint', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = select(session, gameDefinition, 2);
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 1,
      moveId: 'incorrect-for-hint',
      atEpochMs: 1_200,
    });

    const prepared = dispatchGameCommand(session, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_300,
    });
    expect(prepared.accepted).toBe(false);
    expect(prepared.reason).toBe('incorrect_values');
    expect(prepared.creditSpend).toBeUndefined();
    expect(prepared.session.state.candidates.hintCandidates).toBeNull();
  });

  test('distinguishes conflicting and unsolvable unchecked boards before hints', () => {
    const gameDefinition = definition();
    let conflicting = createSession({ autoCheckErrors: false }, gameDefinition);
    conflicting = select(conflicting, gameDefinition, 2);
    conflicting = run(conflicting, gameDefinition, {
      type: 'input_digit',
      digit: 3,
      moveId: 'conflict-for-hint',
      atEpochMs: 1_200,
    });
    const conflictResult = dispatchGameCommand(conflicting, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_300,
    });
    expect(conflictResult.accepted).toBe(false);
    expect(conflictResult.reason).toBe('conflicting_values');

    let unsolvable = createSession({ autoCheckErrors: false }, gameDefinition);
    unsolvable = select(unsolvable, gameDefinition, 2);
    unsolvable = run(unsolvable, gameDefinition, {
      type: 'input_digit',
      digit: 1,
      moveId: 'unsolvable-for-hint',
      atEpochMs: 1_200,
    });
    const unsolvableResult = dispatchGameCommand(unsolvable, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_300,
    });
    expect(unsolvableResult.accepted).toBe(false);
    expect(unsolvableResult.reason).toBe('unsolvable_values');
  });

  test('preserves notes for checked errors and fails on the third attempt', () => {
    const gameDefinition = definition();
    let session = createSession({ errorLimit: 3 }, gameDefinition);
    session = select(session, gameDefinition, 2);
    session = run(session, gameDefinition, {
      type: 'set_pencil_mode',
      enabled: true,
      atEpochMs: 1_200,
    });
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 9,
      moveId: 'note-9',
      atEpochMs: 1_300,
    });
    session = run(session, gameDefinition, {
      type: 'set_pencil_mode',
      enabled: false,
      atEpochMs: 1_400,
    });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      session = run(session, gameDefinition, {
        type: 'input_digit',
        digit: 9,
        moveId: `wrong-${attempt}`,
        atEpochMs: 1_400 + attempt * 100,
      });
    }

    expect(session.state.values[2]).toBe(9);
    expect(session.state.errorCount).toBe(3);
    expect(session.state.incorrectCells).toEqual([2]);
    expect(session.state.status).toBe('failed');
    expect(
      digitsFromMask(session.state.candidates.manualCandidates[2]),
    ).toEqual([9]);
    expect(session.state.timer.runningSinceEpochMs).toBeNull();
  });

  test('undo restores the error and value snapshot', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = select(session, gameDefinition, 2);
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 9,
      moveId: 'undo-error',
      atEpochMs: 1_200,
    });
    expect(session.state.errorCount).toBe(1);

    session = run(session, gameDefinition, {
      type: 'undo',
      atEpochMs: 1_300,
    });
    expect(session.state.values[2]).toBeNull();
    expect(session.state.errorCount).toBe(0);
    expect(session.state.incorrectCells).toEqual([]);
  });

  test('treats replacement and its error impact as one undoable move', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = select(session, gameDefinition, 2);
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 4,
      moveId: 'correct-first',
      atEpochMs: 1_200,
    });
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 2,
      moveId: 'replace-with-error',
      atEpochMs: 1_300,
    });
    expect(session.state.values[2]).toBe(2);
    expect(session.state.errorCount).toBe(1);

    session = run(session, gameDefinition, {
      type: 'undo',
      atEpochMs: 1_400,
    });
    expect(session.state.values[2]).toBe(4);
    expect(session.state.errorCount).toBe(0);
    expect(session.history).toHaveLength(1);
  });

  test('marks a full incorrect board when automatic checking is disabled', () => {
    const almostSolved = `${solution.slice(0, 80)}0`;
    const gameDefinition = definition(almostSolved, solution);
    let session = createSession({ autoCheckErrors: false }, gameDefinition);
    session = select(session, gameDefinition, 80);
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 8,
      moveId: 'wrong-final',
      atEpochMs: 1_200,
    });

    expect(session.state.status).toBe('active');
    expect(session.state.incorrectCells).toEqual([80]);
    expect(session.state.errorCount).toBe(1);
    expect(getGameConflictingCells(session.state)).toContain(80);
  });

  test('pauses effective time and completes with the correct completion kind', () => {
    const almostSolved = `${solution.slice(0, 80)}0`;
    const gameDefinition = definition(almostSolved, solution);
    let session = createSession({}, gameDefinition);
    session = select(session, gameDefinition, 80, 1_100);
    session = run(session, gameDefinition, {
      type: 'pause',
      atEpochMs: 2_000,
    });
    expect(getElapsedMs(session.state, 5_000)).toBe(1_000);
    session = run(session, gameDefinition, {
      type: 'resume',
      atEpochMs: 5_000,
    });
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 9,
      moveId: 'finish',
      atEpochMs: 6_000,
    });

    expect(session.state.status).toBe('completed');
    expect(session.state.completionKind).toBe('perfect');
    expect(session.state.timer.elapsedMs).toBe(2_000);
    expect(session.state.timer.runningSinceEpochMs).toBeNull();
  });

  test('charges a hint on reveal, applies it atomically, and never refunds usage', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    session = select(session, gameDefinition, 2);
    session = run(session, gameDefinition, {
      type: 'set_pencil_mode',
      enabled: true,
      atEpochMs: 1_200,
    });
    session = run(session, gameDefinition, {
      type: 'input_digit',
      digit: 1,
      moveId: 'manual-1',
      atEpochMs: 1_300,
    });
    const quick = dispatchGameCommand(session, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 1,
      atEpochMs: 1_400,
    });
    session = quick.session;

    const prepared = dispatchGameCommand(session, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_500,
    });
    expect(prepared.hintRequest).toBeDefined();
    session = prepared.session;
    const step = eliminationStep(prepared.hintRequest!.boardFingerprint);
    const revealed = dispatchGameCommand(session, gameDefinition, {
      type: 'reveal_hint',
      step,
      availableCredits: 1,
      atEpochMs: 1_600,
    });
    expect(revealed.creditSpend).toEqual({
      resource: 'smart_hint',
      amount: 1,
    });
    expect(revealed.session.state.hintUseCount).toBe(1);
    session = revealed.session;

    session = run(session, gameDefinition, {
      type: 'apply_hint',
      moveId: 'apply-hint',
      atEpochMs: 1_700,
    });
    expect(
      digitsFromMask(session.state.candidates.manualCandidates[2]),
    ).not.toContain(1);
    expect(
      digitsFromMask(session.state.candidates.quickCandidates[2]),
    ).not.toContain(1);
    expect(
      digitsFromMask(session.state.candidates.hintCandidates![2]),
    ).not.toContain(1);

    session = run(session, gameDefinition, {
      type: 'undo',
      atEpochMs: 1_800,
    });
    expect(
      digitsFromMask(session.state.candidates.manualCandidates[2]),
    ).toContain(1);
    expect(
      digitsFromMask(session.state.candidates.quickCandidates[2]),
    ).toContain(1);
    expect(
      digitsFromMask(session.state.candidates.hintCandidates![2]),
    ).toContain(1);
    expect(session.state.hintUseCount).toBe(1);
    expect(session.state.usedSmartHint).toBe(true);
  });

  test('does not reveal or count a hint without available credit', () => {
    const gameDefinition = definition();
    let session = createSession({}, gameDefinition);
    const prepared = dispatchGameCommand(session, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_100,
    });
    session = prepared.session;
    const result = dispatchGameCommand(session, gameDefinition, {
      type: 'reveal_hint',
      step: eliminationStep(prepared.hintRequest!.boardFingerprint),
      availableCredits: 0,
      premium: true,
      atEpochMs: 1_200,
    });

    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('insufficient_smart_hint_credits');
    expect(result.session.state.hintUseCount).toBe(0);
    expect(result.session.state.activeHint).toBeNull();
  });

  test('abandons only by explicit command and stops effective time', () => {
    const gameDefinition = definition();
    const session = createSession({}, gameDefinition);
    const abandoned = dispatchGameCommand(session, gameDefinition, {
      type: 'abandon',
      atEpochMs: 2_500,
    });

    expect(abandoned.accepted).toBe(true);
    expect(abandoned.session.state.status).toBe('abandoned');
    expect(abandoned.session.state.timer.elapsedMs).toBe(1_500);
    expect(abandoned.session.state.timer.runningSinceEpochMs).toBeNull();
  });

  test('restores a failed puzzle as a clean new attempt', () => {
    const gameDefinition = definition();
    let failed = createSession({ errorLimit: 3 }, gameDefinition);
    failed = select(failed, gameDefinition, 2);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      failed = run(failed, gameDefinition, {
        type: 'input_digit',
        digit: 9,
        moveId: `failure-${attempt}`,
        atEpochMs: 1_100 + attempt * 100,
      });
    }

    const retried = retryGame(failed, gameDefinition, 'session-2', 5_000);
    expect(retried.state.attemptNumber).toBe(2);
    expect(retried.state.status).toBe('active');
    expect(retried.state.values).toEqual(retried.state.givens);
    expect(retried.state.errorCount).toBe(0);
    expect(retried.state.timer.elapsedMs).toBe(0);
    expect(retried.history).toEqual([]);
  });

  test('produces identical state for the same command sequence', () => {
    const gameDefinition = definition();
    const commands: readonly GameCommand[] = [
      { type: 'select_cell', cell: 2, atEpochMs: 1_100 },
      { type: 'set_pencil_mode', enabled: true, atEpochMs: 1_200 },
      {
        type: 'input_digit',
        digit: 1,
        moveId: 'candidate-1',
        atEpochMs: 1_300,
      },
      { type: 'set_pencil_mode', enabled: false, atEpochMs: 1_400 },
      {
        type: 'input_digit',
        digit: 4,
        moveId: 'value-4',
        atEpochMs: 1_500,
      },
      { type: 'undo', atEpochMs: 1_600 },
    ];
    const execute = () =>
      commands.reduce(
        (session, command) => run(session, gameDefinition, command),
        createSession({}, gameDefinition),
      );

    expect(execute()).toEqual(execute());
  });
});
