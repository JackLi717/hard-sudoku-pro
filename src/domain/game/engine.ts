import {
  HINT_STEP_CONTRACT_VERSION,
  HintEngineRequest,
  HintStep,
} from '../hints/contracts';
import {
  applyHintStep,
  validateHintEngineRequest,
  validateHintStepForState,
} from '../hints/candidate-state';
import {
  addCandidate,
  arePeers,
  boardFromFingerprint,
  createBoardFingerprint,
  createSolverCandidates,
  findConflictingCells,
  hasCandidate,
  isCellIndex,
  isCompleteBoard,
  isDigit,
  removeCandidate,
} from '../sudoku/board';
import { Board, CandidateGrid, CellIndex, Digit } from '../sudoku/contracts';
import {
  CandidateState,
  CreateGameInput,
  DEFAULT_GAME_SETTINGS,
  GameActionBlockReason,
  GameCommand,
  GameCommandResult,
  GameDefinition,
  GameMove,
  GameMoveKind,
  GameSession,
  GameState,
  GameTimerState,
  UndoSnapshot,
} from './contracts';

const EMPTY_CANDIDATES: CandidateGrid = Object.freeze(
  Array.from({ length: 81 }, () => 0),
);

function cloneGrid(grid: CandidateGrid): CandidateGrid {
  return [...grid];
}

function cloneCandidates(candidates: CandidateState): CandidateState {
  return {
    ...candidates,
    manualCandidates: cloneGrid(candidates.manualCandidates),
    quickCandidates: cloneGrid(candidates.quickCandidates),
    hintCandidates: candidates.hintCandidates
      ? cloneGrid(candidates.hintCandidates)
      : null,
  };
}

function createSnapshot(state: GameState): UndoSnapshot {
  return {
    values: [...state.values],
    candidates: cloneCandidates(state.candidates),
    incorrectCells: [...state.incorrectCells],
    errorCount: state.errorCount,
    status: state.status,
    completionKind: state.completionKind,
  };
}

function gridsEqual(left: CandidateGrid, right: CandidateGrid): boolean {
  return left.every((mask, cell) => mask === right[cell]);
}

function settleTimer(
  timer: GameTimerState,
  status: GameState['status'],
  atEpochMs: number,
): GameTimerState {
  if (status !== 'active' || timer.runningSinceEpochMs === null) {
    return timer;
  }
  return {
    elapsedMs:
      timer.elapsedMs + Math.max(0, atEpochMs - timer.runningSinceEpochMs),
    runningSinceEpochMs: atEpochMs,
  };
}

function updateState(
  state: GameState,
  changes: Partial<GameState>,
  atEpochMs: number,
): GameState {
  const effectiveAtEpochMs = Math.max(atEpochMs, state.updatedAtEpochMs);
  const status = changes.status ?? state.status;
  let timer =
    changes.timer ?? settleTimer(state.timer, state.status, effectiveAtEpochMs);
  if (status === 'active' && timer.runningSinceEpochMs === null) {
    timer = { ...timer, runningSinceEpochMs: effectiveAtEpochMs };
  } else if (status !== 'active' && timer.runningSinceEpochMs !== null) {
    timer = { ...timer, runningSinceEpochMs: null };
  }

  return {
    ...state,
    ...changes,
    timer,
    revision: state.revision + 1,
    updatedAtEpochMs: effectiveAtEpochMs,
  };
}

function accepted(
  session: GameSession,
  extras: Omit<GameCommandResult, 'session' | 'accepted'> = {},
): GameCommandResult {
  return { session, accepted: true, ...extras };
}

function blocked(
  session: GameSession,
  reason: GameActionBlockReason,
): GameCommandResult {
  return { session, accepted: false, reason };
}

function validateDefinition(definition: GameDefinition): {
  givens: Board;
  solution: Board;
} {
  const givens = boardFromFingerprint(definition.puzzleFingerprint);
  const solution = boardFromFingerprint(definition.solutionFingerprint);
  if (!isCompleteBoard(solution) || findConflictingCells(solution).length > 0) {
    throw new Error('The game solution must be a complete valid Sudoku board.');
  }
  givens.forEach((value, cell) => {
    if (value !== null && value !== solution[cell]) {
      throw new Error(`Given cell ${cell} contradicts the game solution.`);
    }
  });
  return { givens, solution };
}

export function createGameSession(input: CreateGameInput): GameSession {
  const { givens } = validateDefinition(input.definition);
  const settings = {
    ...DEFAULT_GAME_SETTINGS,
    ...input.settings,
  };
  if (settings.errorLimit !== null) {
    settings.autoCheckErrors = true;
  }

  return {
    state: {
      schemaVersion: 1,
      sessionId: input.sessionId,
      puzzleId: input.definition.puzzleId,
      contentVersion: input.definition.contentVersion,
      difficultyLevel: input.definition.difficultyLevel,
      attemptNumber: input.attemptNumber ?? 1,
      revision: 0,
      nextMoveSequence: 1,
      status: 'active',
      givens: [...givens],
      values: [...givens],
      selectedCell: null,
      incorrectCells: [],
      candidates: {
        manualCandidates: cloneGrid(EMPTY_CANDIDATES),
        quickCandidates: cloneGrid(EMPTY_CANDIDATES),
        hintCandidates: null,
        activeCandidateSource: 'manual',
        pencilMode: false,
        quickDraftGenerated: false,
        quickDraftBoardFingerprint: null,
        hintBoardFingerprint: null,
      },
      activeHint: null,
      settings,
      timer: {
        elapsedMs: 0,
        runningSinceEpochMs: input.startedAtEpochMs,
      },
      errorCount: 0,
      hintUseCount: 0,
      quickPencilUseCount: 0,
      usedSmartHint: false,
      completionKind: null,
      startedAtEpochMs: input.startedAtEpochMs,
      updatedAtEpochMs: input.startedAtEpochMs,
    },
    history: [],
  };
}

export function retryGame(
  session: GameSession,
  definition: GameDefinition,
  sessionId: string,
  startedAtEpochMs: number,
): GameSession {
  if (session.state.status !== 'failed') {
    throw new Error('Only a failed attempt can be retried.');
  }
  return createGameSession({
    sessionId,
    definition,
    attemptNumber: session.state.attemptNumber + 1,
    startedAtEpochMs,
    settings: session.state.settings,
  });
}

export function getElapsedMs(state: GameState, atEpochMs: number): number {
  return settleTimer(state.timer, state.status, atEpochMs).elapsedMs;
}

export function getGameConflictingCells(
  state: GameState,
): readonly CellIndex[] {
  return findConflictingCells(state.values);
}

function hasUnsolvableValues(state: GameState, solution: Board): boolean {
  return state.values.some(
    (value, cell) => value !== null && value !== solution[cell],
  );
}

function completionKind(state: GameState, errorCount: number) {
  if (state.usedSmartHint) {
    return 'hint_assisted' as const;
  }
  return errorCount === 0 ? ('perfect' as const) : ('independent' as const);
}

function clearDigitFromDrafts(
  candidates: CandidateState,
  cell: CellIndex,
  digit: Digit,
  cleanPeers: boolean,
): CandidateState {
  const manualCandidates = [...candidates.manualCandidates];
  const quickCandidates = [...candidates.quickCandidates];
  manualCandidates[cell] = 0;
  quickCandidates[cell] = 0;
  if (cleanPeers) {
    manualCandidates.forEach((mask, peer) => {
      if (arePeers(cell, peer)) {
        manualCandidates[peer] = removeCandidate(mask, digit);
        quickCandidates[peer] = removeCandidate(quickCandidates[peer], digit);
      }
    });
  }
  return { ...candidates, manualCandidates, quickCandidates };
}

function applyHintPlacementCandidates(
  candidates: CandidateState,
  oldBoard: Board,
  newBoard: Board,
  cell: CellIndex,
  digit: Digit,
): CandidateState {
  if (candidates.hintCandidates === null) {
    return candidates;
  }
  const oldFingerprint = createBoardFingerprint(oldBoard);
  const newFingerprint = createBoardFingerprint(newBoard);
  if (candidates.hintBoardFingerprint !== oldFingerprint) {
    return {
      ...candidates,
      hintCandidates: createSolverCandidates(newBoard),
      hintBoardFingerprint: newFingerprint,
    };
  }

  const hintCandidates = [...candidates.hintCandidates];
  hintCandidates[cell] = 0;
  hintCandidates.forEach((mask, peer) => {
    if (arePeers(cell, peer)) {
      hintCandidates[peer] = removeCandidate(mask, digit);
    }
  });
  return {
    ...candidates,
    hintCandidates,
    hintBoardFingerprint: newFingerprint,
  };
}

function rebuildTrackedHintCandidates(
  candidates: CandidateState,
  board: Board,
): CandidateState {
  if (candidates.hintCandidates === null) {
    return candidates;
  }
  const fingerprint = createBoardFingerprint(board);
  if (candidates.hintBoardFingerprint === fingerprint) {
    return candidates;
  }
  return {
    ...candidates,
    hintCandidates: createSolverCandidates(board),
    hintBoardFingerprint: fingerprint,
  };
}

function recordMove(
  session: GameSession,
  changes: Partial<GameState>,
  command: { moveId: string; atEpochMs: number },
  kind: GameMoveKind,
  cell: CellIndex | null,
  digit: Digit | null,
  appliedHint: HintStep | null = null,
): GameCommandResult {
  if (session.history.some(move => move.id === command.moveId)) {
    throw new Error(`Duplicate game move id ${command.moveId}.`);
  }
  const before = createSnapshot(session.state);
  const state = updateState(
    session.state,
    {
      ...changes,
      activeHint: null,
      nextMoveSequence: session.state.nextMoveSequence + 1,
    },
    command.atEpochMs,
  );
  const move: GameMove = {
    id: command.moveId,
    sessionId: state.sessionId,
    sequence: session.state.nextMoveSequence,
    kind,
    cell,
    digit,
    techniqueCode: appliedHint?.techniqueCode ?? null,
    appliedHint,
    before,
    after: createSnapshot(state),
    createdAtEpochMs: state.updatedAtEpochMs,
  };
  return accepted({ state, history: [...session.history, move] });
}

function requireBoardAction(
  session: GameSession,
): GameActionBlockReason | null {
  if (session.state.status !== 'active') {
    return 'game_not_active';
  }
  if (session.state.activeHint !== null) {
    return 'hint_in_progress';
  }
  return null;
}

function inputDigit(
  session: GameSession,
  definition: GameDefinition,
  command: Extract<GameCommand, { type: 'input_digit' }>,
): GameCommandResult {
  const actionBlock = requireBoardAction(session);
  if (actionBlock) {
    return blocked(session, actionBlock);
  }
  if (!isDigit(command.digit)) {
    throw new Error('input_digit requires a digit from 1 to 9.');
  }
  const cell = session.state.selectedCell;
  if (cell === null) {
    return blocked(session, 'no_selected_cell');
  }
  if (session.state.givens[cell] !== null) {
    return blocked(session, 'given_cell');
  }

  if (session.state.candidates.pencilMode) {
    if (session.state.values[cell] !== null) {
      return blocked(session, 'filled_cell');
    }
    const source = session.state.candidates.activeCandidateSource;
    const key = source === 'manual' ? 'manualCandidates' : 'quickCandidates';
    const grid = [...session.state.candidates[key]];
    grid[cell] = hasCandidate(grid[cell], command.digit)
      ? removeCandidate(grid[cell], command.digit)
      : addCandidate(grid[cell], command.digit);
    return recordMove(
      session,
      {
        candidates: { ...session.state.candidates, [key]: grid },
      },
      command,
      source === 'manual' ? 'edit_manual_candidate' : 'edit_quick_candidate',
      cell,
      command.digit,
    );
  }

  const { solution } = validateDefinition(definition);
  const oldValue = session.state.values[cell];
  const isIncorrect = command.digit !== solution[cell];
  if (oldValue === command.digit && !isIncorrect) {
    return blocked(session, 'filled_cell');
  }

  const values = [...session.state.values];
  values[cell] = command.digit;
  let candidates = cloneCandidates(session.state.candidates);
  let incorrectCells = new Set(session.state.incorrectCells);
  let errorCount = session.state.errorCount;
  let status = session.state.status;
  let kind = session.state.completionKind;

  if (session.state.settings.autoCheckErrors && isIncorrect) {
    incorrectCells.add(cell);
    errorCount += 1;
    if (
      session.state.settings.errorLimit !== null &&
      errorCount >= session.state.settings.errorLimit
    ) {
      status = 'failed';
    }
  } else {
    incorrectCells.delete(cell);
    candidates = clearDigitFromDrafts(
      candidates,
      cell,
      command.digit,
      session.state.settings.autoRemoveCandidates,
    );
    if (oldValue === null) {
      candidates = applyHintPlacementCandidates(
        candidates,
        session.state.values,
        values,
        cell,
        command.digit,
      );
    } else {
      candidates = rebuildTrackedHintCandidates(candidates, values);
    }
  }

  if (!session.state.settings.autoCheckErrors && isCompleteBoard(values)) {
    const mismatches = values
      .map((value, index) => (value !== solution[index] ? index : -1))
      .filter(index => index >= 0);
    const newlyCounted = mismatches.filter(
      mismatch => !incorrectCells.has(mismatch),
    );
    errorCount += newlyCounted.length;
    incorrectCells = new Set(mismatches);
  }

  if (values.every((value, index) => value === solution[index])) {
    status = 'completed';
    incorrectCells.clear();
    kind = completionKind(session.state, errorCount);
  }

  return recordMove(
    session,
    {
      values,
      candidates,
      incorrectCells: [...incorrectCells].sort((left, right) => left - right),
      errorCount,
      status,
      completionKind: kind,
    },
    command,
    'place_value',
    cell,
    command.digit,
  );
}

function erase(
  session: GameSession,
  command: Extract<GameCommand, { type: 'erase' }>,
): GameCommandResult {
  const actionBlock = requireBoardAction(session);
  if (actionBlock) {
    return blocked(session, actionBlock);
  }
  const cell = session.state.selectedCell;
  if (cell === null) {
    return blocked(session, 'no_selected_cell');
  }
  if (session.state.givens[cell] !== null) {
    return blocked(session, 'given_cell');
  }

  if (session.state.values[cell] !== null) {
    const values = [...session.state.values];
    const digit = values[cell];
    values[cell] = null;
    const incorrectCells = session.state.incorrectCells.filter(
      incorrectCell => incorrectCell !== cell,
    );
    return recordMove(
      session,
      {
        values,
        incorrectCells,
        candidates: rebuildTrackedHintCandidates(
          cloneCandidates(session.state.candidates),
          values,
        ),
      },
      command,
      'erase_value',
      cell,
      digit,
    );
  }

  const source = session.state.candidates.activeCandidateSource;
  const key = source === 'manual' ? 'manualCandidates' : 'quickCandidates';
  if (session.state.candidates[key][cell] === 0) {
    return blocked(session, 'nothing_to_erase');
  }
  const grid = [...session.state.candidates[key]];
  grid[cell] = 0;
  return recordMove(
    session,
    { candidates: { ...session.state.candidates, [key]: grid } },
    command,
    source === 'manual' ? 'edit_manual_candidate' : 'edit_quick_candidate',
    cell,
    null,
  );
}

function generateQuickDraft(
  session: GameSession,
  definition: GameDefinition,
  command: Extract<GameCommand, { type: 'generate_quick_draft' }>,
): GameCommandResult {
  const actionBlock = requireBoardAction(session);
  if (actionBlock) {
    return blocked(session, actionBlock);
  }
  const { solution } = validateDefinition(definition);
  if (session.state.incorrectCells.length > 0) {
    return blocked(session, 'incorrect_values');
  }
  if (findConflictingCells(session.state.values).length > 0) {
    return blocked(session, 'conflicting_values');
  }
  if (hasUnsolvableValues(session.state, solution)) {
    return blocked(session, 'unsolvable_values');
  }

  const fingerprint = createBoardFingerprint(session.state.values);
  if (
    session.state.candidates.quickDraftGenerated &&
    session.state.candidates.quickDraftBoardFingerprint === fingerprint
  ) {
    if (session.state.candidates.activeCandidateSource === 'quick') {
      return accepted(session);
    }
    return accepted({
      ...session,
      state: updateState(
        session.state,
        {
          candidates: {
            ...session.state.candidates,
            activeCandidateSource: 'quick',
          },
        },
        command.atEpochMs,
      ),
    });
  }

  if (session.state.candidates.quickDraftGenerated && !command.confirmed) {
    return blocked(session, 'quick_draft_confirmation_required');
  }
  if (!command.premium && command.availableCredits < 1) {
    return blocked(session, 'insufficient_quick_pencil_credits');
  }

  const quickCandidates = createSolverCandidates(session.state.values);
  if (
    quickCandidates.some(
      (mask, cell) => session.state.values[cell] === null && mask === 0,
    )
  ) {
    return blocked(session, 'unsolvable_values');
  }
  const firstGeneration = !session.state.candidates.quickDraftGenerated;
  const state = updateState(
    session.state,
    {
      candidates: {
        ...session.state.candidates,
        quickCandidates,
        quickDraftGenerated: true,
        quickDraftBoardFingerprint: fingerprint,
        activeCandidateSource: 'quick',
        pencilMode: firstGeneration
          ? true
          : session.state.candidates.pencilMode,
      },
      quickPencilUseCount: session.state.quickPencilUseCount + 1,
    },
    command.atEpochMs,
  );
  return accepted(
    { ...session, state },
    command.premium
      ? {}
      : { creditSpend: { resource: 'quick_pencil', amount: 1 } },
  );
}

function prepareHint(
  session: GameSession,
  definition: GameDefinition,
  atEpochMs: number,
): GameCommandResult {
  const actionBlock = requireBoardAction(session);
  if (actionBlock) {
    return blocked(session, actionBlock);
  }
  const { solution } = validateDefinition(definition);
  if (session.state.incorrectCells.length > 0) {
    return blocked(session, 'incorrect_values');
  }
  if (findConflictingCells(session.state.values).length > 0) {
    return blocked(session, 'conflicting_values');
  }
  if (hasUnsolvableValues(session.state, solution)) {
    return blocked(session, 'unsolvable_values');
  }

  const fingerprint = createBoardFingerprint(session.state.values);
  let candidates = session.state.candidates;
  let hintCandidates = candidates.hintCandidates;
  let changed = false;
  if (
    hintCandidates === null ||
    candidates.hintBoardFingerprint !== fingerprint
  ) {
    hintCandidates = createSolverCandidates(session.state.values);
    candidates = {
      ...candidates,
      hintCandidates,
      hintBoardFingerprint: fingerprint,
    };
    changed = true;
  }

  let hintRequest: HintEngineRequest = {
    contractVersion: HINT_STEP_CONTRACT_VERSION,
    boardFingerprint: fingerprint,
    hintCandidates,
    givenCells: session.state.givens.map(value => value !== null),
  };
  if (validateHintEngineRequest(hintRequest).length > 0) {
    hintCandidates = createSolverCandidates(session.state.values);
    candidates = {
      ...candidates,
      hintCandidates,
      hintBoardFingerprint: fingerprint,
    };
    hintRequest = { ...hintRequest, hintCandidates };
    changed = true;
    if (validateHintEngineRequest(hintRequest).length > 0) {
      return blocked(session, 'unsolvable_values');
    }
  }
  const nextSession = changed
    ? {
        ...session,
        state: updateState(session.state, { candidates }, atEpochMs),
      }
    : session;
  return accepted(nextSession, { hintRequest });
}

function revealHint(
  session: GameSession,
  definition: GameDefinition,
  command: Extract<GameCommand, { type: 'reveal_hint' }>,
): GameCommandResult {
  if (session.state.status !== 'active') {
    return blocked(session, 'game_not_active');
  }
  if (session.state.activeHint !== null) {
    return blocked(session, 'hint_already_active');
  }
  const prepared = prepareHint(session, definition, command.atEpochMs);
  if (!prepared.accepted || !prepared.hintRequest) {
    return prepared;
  }
  const errors = validateHintStepForState(
    prepared.hintRequest,
    command.step,
    definition.solutionFingerprint,
  );
  if (errors.length > 0) {
    return blocked(session, 'invalid_hint');
  }
  if (!command.premium && command.availableCredits < 1) {
    return blocked(session, 'insufficient_smart_hint_credits');
  }
  const state = updateState(
    prepared.session.state,
    {
      activeHint: command.step,
      hintUseCount: prepared.session.state.hintUseCount + 1,
      usedSmartHint: true,
    },
    command.atEpochMs,
  );
  return accepted(
    { ...prepared.session, state },
    command.premium
      ? {}
      : { creditSpend: { resource: 'smart_hint', amount: 1 } },
  );
}

function applyActiveHint(
  session: GameSession,
  definition: GameDefinition,
  command: Extract<GameCommand, { type: 'apply_hint' }>,
): GameCommandResult {
  if (session.state.status !== 'active') {
    return blocked(session, 'game_not_active');
  }
  const step = session.state.activeHint;
  if (step === null || session.state.candidates.hintCandidates === null) {
    return blocked(session, 'no_active_hint');
  }
  const request: HintEngineRequest = {
    contractVersion: HINT_STEP_CONTRACT_VERSION,
    boardFingerprint: createBoardFingerprint(session.state.values),
    hintCandidates: session.state.candidates.hintCandidates,
    givenCells: session.state.givens.map(value => value !== null),
  };
  let applied;
  try {
    applied = applyHintStep(request, step, definition.solutionFingerprint);
  } catch {
    return blocked(session, 'invalid_hint');
  }

  const values = boardFromFingerprint(applied.boardFingerprint);
  let candidates: CandidateState = {
    ...session.state.candidates,
    hintCandidates: applied.hintCandidates,
    hintBoardFingerprint: applied.boardFingerprint,
  };
  for (const elimination of step.eliminations) {
    const manualCandidates = [...candidates.manualCandidates];
    const quickCandidates = [...candidates.quickCandidates];
    manualCandidates[elimination.cell] = removeCandidate(
      manualCandidates[elimination.cell],
      elimination.digit,
    );
    quickCandidates[elimination.cell] = removeCandidate(
      quickCandidates[elimination.cell],
      elimination.digit,
    );
    candidates = { ...candidates, manualCandidates, quickCandidates };
  }
  for (const placement of step.placements) {
    candidates = clearDigitFromDrafts(
      candidates,
      placement.cell,
      placement.digit,
      true,
    );
  }

  const { solution } = validateDefinition(definition);
  const completed = values.every((value, cell) => value === solution[cell]);
  return recordMove(
    session,
    {
      values,
      candidates,
      status: completed ? 'completed' : 'active',
      completionKind: completed
        ? completionKind(session.state, session.state.errorCount)
        : null,
    },
    command,
    'apply_hint',
    step.placements[0]?.cell ?? null,
    step.placements[0]?.digit ?? null,
    step,
  );
}

function undo(session: GameSession, atEpochMs: number): GameCommandResult {
  const actionBlock = requireBoardAction(session);
  if (actionBlock) {
    return blocked(session, actionBlock);
  }
  const move = session.history[session.history.length - 1];
  if (!move) {
    return blocked(session, 'nothing_to_undo');
  }

  const current = session.state.candidates;
  const quickDataUnchanged =
    gridsEqual(
      current.quickCandidates,
      move.after.candidates.quickCandidates,
    ) &&
    current.quickDraftGenerated === move.after.candidates.quickDraftGenerated &&
    current.quickDraftBoardFingerprint ===
      move.after.candidates.quickDraftBoardFingerprint;
  const hintDataUnchanged =
    current.hintBoardFingerprint ===
      move.after.candidates.hintBoardFingerprint &&
    ((current.hintCandidates === null &&
      move.after.candidates.hintCandidates === null) ||
      (current.hintCandidates !== null &&
        move.after.candidates.hintCandidates !== null &&
        gridsEqual(
          current.hintCandidates,
          move.after.candidates.hintCandidates,
        )));

  const candidates: CandidateState = {
    ...current,
    manualCandidates: cloneGrid(move.before.candidates.manualCandidates),
    quickCandidates: quickDataUnchanged
      ? cloneGrid(move.before.candidates.quickCandidates)
      : current.quickCandidates,
    quickDraftGenerated: quickDataUnchanged
      ? move.before.candidates.quickDraftGenerated
      : current.quickDraftGenerated,
    quickDraftBoardFingerprint: quickDataUnchanged
      ? move.before.candidates.quickDraftBoardFingerprint
      : current.quickDraftBoardFingerprint,
    hintCandidates: hintDataUnchanged
      ? move.before.candidates.hintCandidates
        ? cloneGrid(move.before.candidates.hintCandidates)
        : null
      : null,
    hintBoardFingerprint: hintDataUnchanged
      ? move.before.candidates.hintBoardFingerprint
      : null,
  };
  const state = updateState(
    session.state,
    {
      values: [...move.before.values],
      candidates,
      incorrectCells: [...move.before.incorrectCells],
      errorCount: move.before.errorCount,
      completionKind: null,
      activeHint: null,
    },
    atEpochMs,
  );
  return accepted({ state, history: session.history.slice(0, -1) });
}

export function dispatchGameCommand(
  session: GameSession,
  definition: GameDefinition,
  command: GameCommand,
): GameCommandResult {
  if (
    session.state.puzzleId !== definition.puzzleId ||
    session.state.contentVersion !== definition.contentVersion ||
    session.state.difficultyLevel !== definition.difficultyLevel ||
    createBoardFingerprint(session.state.givens) !==
      definition.puzzleFingerprint
  ) {
    throw new Error('The game definition does not match the session puzzle.');
  }

  switch (command.type) {
    case 'select_cell': {
      if (session.state.status !== 'active') {
        return blocked(session, 'game_not_active');
      }
      if (session.state.activeHint !== null) {
        return blocked(session, 'hint_in_progress');
      }
      if (command.cell !== null && !isCellIndex(command.cell)) {
        throw new Error('select_cell requires a cell from 0 to 80.');
      }
      if (session.state.selectedCell === command.cell) {
        return accepted(session);
      }
      return accepted({
        ...session,
        // Selection is presentation state. Keep the persisted revision and timer
        // untouched so it can update synchronously without a SQLite round trip.
        // The next durable command (including pause/background) persists it with
        // the rest of the game state.
        state: { ...session.state, selectedCell: command.cell },
      });
    }
    case 'input_digit':
      return inputDigit(session, definition, command);
    case 'erase':
      return erase(session, command);
    case 'set_pencil_mode': {
      const actionBlock = requireBoardAction(session);
      if (actionBlock) {
        return blocked(session, actionBlock);
      }
      if (session.state.candidates.pencilMode === command.enabled) {
        return accepted(session);
      }
      return accepted({
        ...session,
        state: updateState(
          session.state,
          {
            candidates: {
              ...session.state.candidates,
              pencilMode: command.enabled,
            },
          },
          command.atEpochMs,
        ),
      });
    }
    case 'set_candidate_source': {
      const actionBlock = requireBoardAction(session);
      if (actionBlock) {
        return blocked(session, actionBlock);
      }
      if (command.source === 'quick') {
        if (!session.state.candidates.quickDraftGenerated) {
          return blocked(session, 'quick_draft_missing');
        }
        if (
          session.state.candidates.quickDraftBoardFingerprint !==
          createBoardFingerprint(session.state.values)
        ) {
          return blocked(session, 'quick_draft_confirmation_required');
        }
      }
      if (session.state.candidates.activeCandidateSource === command.source) {
        return accepted(session);
      }
      return accepted({
        ...session,
        state: updateState(
          session.state,
          {
            candidates: {
              ...session.state.candidates,
              activeCandidateSource: command.source,
            },
          },
          command.atEpochMs,
        ),
      });
    }
    case 'generate_quick_draft':
      return generateQuickDraft(session, definition, command);
    case 'prepare_hint':
      return prepareHint(session, definition, command.atEpochMs);
    case 'reveal_hint':
      return revealHint(session, definition, command);
    case 'dismiss_hint': {
      if (session.state.status !== 'active') {
        return blocked(session, 'game_not_active');
      }
      if (session.state.activeHint === null) {
        return blocked(session, 'no_active_hint');
      }
      return accepted({
        ...session,
        state: updateState(
          session.state,
          { activeHint: null },
          command.atEpochMs,
        ),
      });
    }
    case 'apply_hint':
      return applyActiveHint(session, definition, command);
    case 'undo':
      return undo(session, command.atEpochMs);
    case 'pause': {
      if (session.state.status !== 'active') {
        return blocked(session, 'game_not_active');
      }
      return accepted({
        ...session,
        state: updateState(
          session.state,
          { status: 'paused', activeHint: null },
          command.atEpochMs,
        ),
      });
    }
    case 'resume': {
      if (session.state.status !== 'paused') {
        return blocked(session, 'game_not_paused');
      }
      return accepted({
        ...session,
        state: updateState(
          session.state,
          { status: 'active' },
          command.atEpochMs,
        ),
      });
    }
    case 'abandon': {
      if (!['active', 'paused'].includes(session.state.status)) {
        return blocked(session, 'game_not_active');
      }
      return accepted({
        ...session,
        state: updateState(
          session.state,
          { status: 'abandoned', activeHint: null },
          command.atEpochMs,
        ),
      });
    }
  }
}
