import {
  GAME_STATE_SCHEMA_VERSION,
  GameMove,
  GameSession,
  GameState,
  UndoSnapshot,
} from '../../domain/game/contracts';
import { validateHintStep } from '../../domain/hints/contracts';
import { TECHNIQUES } from '../../domain/hints/techniques';
import {
  isBoard,
  isCandidateGrid,
  isCellIndex,
  isDigit,
} from '../../domain/sudoku/board';

type JsonRecord = Record<string, unknown>;

export type StoredMoveRow = {
  id: string;
  session_id: string;
  sequence: number;
  move_kind: string;
  cell_index: number | null;
  digit: number | null;
  technique_code: string | null;
  applied_hint_json: string | null;
  before_snapshot_json: string;
  after_snapshot_json: string;
  created_at_ms: number;
};

const statuses = new Set([
  'active',
  'paused',
  'failed',
  'completed',
  'abandoned',
]);
const moveKinds = new Set([
  'place_value',
  'erase_value',
  'edit_manual_candidate',
  'edit_quick_candidate',
  'apply_hint',
]);
const techniqueCodes = new Set<string>(TECHNIQUES.map(item => item.code));
const completionKinds = new Set(['independent', 'hint_assisted', 'perfect']);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, name: string): JsonRecord {
  if (!isRecord(value)) {
    throw new Error(`${name} must be an object.`);
  }
  return value;
}

function requireNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }
  return value;
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${name} must be a string.`);
  }
  return value;
}

function validateCandidates(value: unknown): void {
  const candidates = requireRecord(value, 'GameState.candidates');
  if (
    !Array.isArray(candidates.manualCandidates) ||
    !isCandidateGrid(candidates.manualCandidates) ||
    !Array.isArray(candidates.quickCandidates) ||
    !isCandidateGrid(candidates.quickCandidates) ||
    (candidates.hintCandidates !== null &&
      (!Array.isArray(candidates.hintCandidates) ||
        !isCandidateGrid(candidates.hintCandidates))) ||
    !['manual', 'quick'].includes(String(candidates.activeCandidateSource)) ||
    typeof candidates.pencilMode !== 'boolean' ||
    typeof candidates.quickDraftGenerated !== 'boolean' ||
    (candidates.quickDraftBoardFingerprint !== null &&
      (typeof candidates.quickDraftBoardFingerprint !== 'string' ||
        !/^[0-9]{81}$/.test(candidates.quickDraftBoardFingerprint))) ||
    (candidates.hintBoardFingerprint !== null &&
      (typeof candidates.hintBoardFingerprint !== 'string' ||
        !/^[0-9]{81}$/.test(candidates.hintBoardFingerprint)))
  ) {
    throw new Error('GameState.candidates is invalid.');
  }
}

function validateSnapshot(value: unknown): UndoSnapshot {
  const snapshot = requireRecord(value, 'GameMove snapshot');
  if (!Array.isArray(snapshot.values) || !isBoard(snapshot.values)) {
    throw new Error('GameMove snapshot contains an invalid board.');
  }
  validateCandidates(snapshot.candidates);
  if (
    !Array.isArray(snapshot.incorrectCells) ||
    !snapshot.incorrectCells.every(
      cell => typeof cell === 'number' && isCellIndex(cell),
    ) ||
    typeof snapshot.errorCount !== 'number' ||
    !Number.isInteger(snapshot.errorCount) ||
    snapshot.errorCount < 0 ||
    !statuses.has(String(snapshot.status)) ||
    (snapshot.completionKind !== null &&
      !completionKinds.has(String(snapshot.completionKind)))
  ) {
    throw new Error('GameMove snapshot is invalid.');
  }
  return snapshot as UndoSnapshot;
}

export function serializeGameState(state: GameState): string {
  return JSON.stringify(state);
}

export function deserializeGameState(json: string): GameState {
  const state = requireRecord(JSON.parse(json), 'GameState');
  if (state.schemaVersion !== GAME_STATE_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported GameState schema ${String(state.schemaVersion)}.`,
    );
  }
  if (
    !Array.isArray(state.givens) ||
    !isBoard(state.givens) ||
    !Array.isArray(state.values) ||
    !isBoard(state.values)
  ) {
    throw new Error('GameState contains an invalid board.');
  }
  validateCandidates(state.candidates);
  requireString(state.sessionId, 'GameState.sessionId');
  requireString(state.puzzleId, 'GameState.puzzleId');
  for (const [name, value] of [
    ['contentVersion', state.contentVersion],
    ['difficultyLevel', state.difficultyLevel],
    ['attemptNumber', state.attemptNumber],
    ['revision', state.revision],
    ['nextMoveSequence', state.nextMoveSequence],
    ['errorCount', state.errorCount],
    ['hintUseCount', state.hintUseCount],
    ['quickPencilUseCount', state.quickPencilUseCount],
    ['startedAtEpochMs', state.startedAtEpochMs],
    ['updatedAtEpochMs', state.updatedAtEpochMs],
  ] as const) {
    const numericValue = requireNumber(value, `GameState.${name}`);
    if (!Number.isInteger(numericValue) || numericValue < 0) {
      throw new Error(`GameState.${name} must be a non-negative integer.`);
    }
  }
  const validatedState = state as unknown as GameState;
  const settings = requireRecord(state.settings, 'GameState.settings');
  const timer = requireRecord(state.timer, 'GameState.timer');
  if (
    validatedState.contentVersion < 1 ||
    validatedState.difficultyLevel < 1 ||
    validatedState.difficultyLevel > 5 ||
    validatedState.attemptNumber < 1 ||
    validatedState.nextMoveSequence < 1 ||
    !statuses.has(String(state.status)) ||
    (state.selectedCell !== null &&
      (typeof state.selectedCell !== 'number' ||
        !isCellIndex(state.selectedCell))) ||
    !Array.isArray(state.incorrectCells) ||
    !state.incorrectCells.every(
      cell => typeof cell === 'number' && isCellIndex(cell),
    ) ||
    typeof settings.autoCheckErrors !== 'boolean' ||
    ![null, 3].includes(settings.errorLimit as null | number) ||
    typeof settings.autoRemoveCandidates !== 'boolean' ||
    typeof timer.elapsedMs !== 'number' ||
    !Number.isInteger(timer.elapsedMs) ||
    timer.elapsedMs < 0 ||
    (timer.runningSinceEpochMs !== null &&
      (typeof timer.runningSinceEpochMs !== 'number' ||
        !Number.isInteger(timer.runningSinceEpochMs) ||
        timer.runningSinceEpochMs < 0)) ||
    typeof state.usedSmartHint !== 'boolean' ||
    (state.completionKind !== null &&
      !completionKinds.has(String(state.completionKind))) ||
    validatedState.givens.some(
      (given, cell) => given !== null && given !== validatedState.values[cell],
    )
  ) {
    throw new Error('GameState contains invalid gameplay fields.');
  }
  if (state.activeHint !== null) {
    const errors = validateHintStep(state.activeHint as never);
    if (errors.length > 0) {
      throw new Error(`GameState.activeHint is invalid: ${errors.join(', ')}`);
    }
  }
  // Missing exposure evidence is not an empty history. Preserve retained games
  // without inventing hints or resetting their progress; attribution fails closed.
  if (state.hintExposures === undefined) {
    state.hintExposures = state.hintUseCount === 0 ? [] : null;
  }
  if (
    state.hintExposures !== null &&
    (!Array.isArray(state.hintExposures) ||
      state.hintExposures.length !== state.hintUseCount ||
      !state.hintExposures.every(
        exposure =>
          isRecord(exposure) &&
          Array.isArray(exposure.candidates) &&
          isCandidateGrid(exposure.candidates) &&
          isRecord(exposure.step) &&
          validateHintStep(exposure.step as never).length === 0,
      ))
  ) {
    throw new Error('GameState.hintExposures is invalid.');
  }
  return validatedState;
}

export function serializeMove(move: GameMove): {
  params: readonly (string | number | null)[];
} {
  return {
    params: [
      move.id,
      move.sessionId,
      move.sequence,
      move.kind,
      move.cell,
      move.digit,
      move.techniqueCode,
      move.appliedHint ? JSON.stringify(move.appliedHint) : null,
      JSON.stringify(move.before),
      JSON.stringify(move.after),
      move.createdAtEpochMs,
    ],
  };
}

export function deserializeMove(row: StoredMoveRow): GameMove {
  if (
    typeof row.id !== 'string' ||
    typeof row.session_id !== 'string' ||
    !Number.isInteger(row.sequence) ||
    row.sequence < 1 ||
    !Number.isInteger(row.created_at_ms) ||
    row.created_at_ms < 0 ||
    !moveKinds.has(row.move_kind) ||
    (row.cell_index !== null && !isCellIndex(row.cell_index)) ||
    (row.digit !== null && !isDigit(row.digit)) ||
    (row.technique_code !== null && !techniqueCodes.has(row.technique_code))
  ) {
    throw new Error(`Stored game move ${row.id} is invalid.`);
  }
  const appliedHint = row.applied_hint_json
    ? JSON.parse(row.applied_hint_json)
    : null;
  if (appliedHint !== null) {
    const errors = validateHintStep(appliedHint);
    if (errors.length > 0) {
      throw new Error(`Stored game move ${row.id} has an invalid hint.`);
    }
  }
  return {
    id: row.id,
    sessionId: row.session_id,
    sequence: row.sequence,
    kind: row.move_kind as GameMove['kind'],
    cell: row.cell_index,
    digit: row.digit,
    techniqueCode: row.technique_code as GameMove['techniqueCode'],
    appliedHint,
    before: validateSnapshot(JSON.parse(row.before_snapshot_json)),
    after: validateSnapshot(JSON.parse(row.after_snapshot_json)),
    createdAtEpochMs: row.created_at_ms,
  };
}

export function deserializeSession(
  stateJson: string,
  moves: readonly StoredMoveRow[],
): GameSession {
  const state = deserializeGameState(stateJson);
  const history = moves.map(deserializeMove);
  if (
    history.some(move => move.sessionId !== state.sessionId) ||
    history.some(
      (move, index) =>
        index > 0 && move.sequence <= history[index - 1].sequence,
    )
  ) {
    throw new Error('Stored game history is inconsistent with its session.');
  }
  return { state, history };
}
