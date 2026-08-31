import { HintStep } from '../hints/contracts';
import { DifficultyLevel, TechniqueCode } from '../hints/techniques';
import {
  Board,
  BoardFingerprint,
  CandidateGrid,
  CellIndex,
  Digit,
} from '../sudoku/contracts';

export const GAME_STATE_SCHEMA_VERSION = 1 as const;

export type GameStatus =
  | 'active'
  | 'paused'
  | 'failed'
  | 'completed'
  | 'abandoned';

export type CandidateSource = 'manual' | 'quick';

export type CompletionKind = 'independent' | 'hint_assisted' | 'perfect';

export type CandidateState = {
  manualCandidates: CandidateGrid;
  quickCandidates: CandidateGrid;
  hintCandidates: CandidateGrid | null;
  activeCandidateSource: CandidateSource;
  pencilMode: boolean;
  quickDraftGenerated: boolean;
  quickDraftBoardFingerprint: BoardFingerprint | null;
  hintBoardFingerprint: BoardFingerprint | null;
};

export type GameTimerState = {
  elapsedMs: number;
  runningSinceEpochMs: number | null;
};

export type GameState = {
  schemaVersion: typeof GAME_STATE_SCHEMA_VERSION;
  sessionId: string;
  puzzleId: string;
  contentVersion: number;
  difficultyLevel: DifficultyLevel;
  attemptNumber: number;
  revision: number;
  status: GameStatus;
  givens: Board;
  values: Board;
  candidates: CandidateState;
  timer: GameTimerState;
  errorCount: number;
  hintUseCount: number;
  quickPencilUseCount: number;
  usedSmartHint: boolean;
  completionKind: CompletionKind | null;
  startedAtEpochMs: number;
  updatedAtEpochMs: number;
};

export type UndoSnapshot = Pick<
  GameState,
  | 'revision'
  | 'values'
  | 'candidates'
  | 'errorCount'
  | 'hintUseCount'
  | 'quickPencilUseCount'
  | 'usedSmartHint'
  | 'status'
  | 'completionKind'
>;

export type GameMoveKind =
  | 'place_value'
  | 'erase_value'
  | 'edit_manual_candidate'
  | 'edit_quick_candidate'
  | 'apply_hint';

export type GameMove = {
  id: string;
  sessionId: string;
  sequence: number;
  kind: GameMoveKind;
  cell: CellIndex | null;
  digit: Digit | null;
  techniqueCode: TechniqueCode | null;
  appliedHint: HintStep | null;
  before: UndoSnapshot;
  after: UndoSnapshot;
  createdAtEpochMs: number;
};

export type NonUndoableGameEvent =
  | { type: 'set_candidate_source'; source: CandidateSource }
  | { type: 'set_pencil_mode'; enabled: boolean }
  | { type: 'generate_quick_draft'; boardFingerprint: BoardFingerprint }
  | { type: 'pause' }
  | { type: 'resume' };
