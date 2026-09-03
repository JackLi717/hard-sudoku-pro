import { HintEngineRequest, HintStep } from '../hints/contracts';
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

export type GameSettings = {
  autoCheckErrors: boolean;
  errorLimit: 3 | null;
  autoRemoveCandidates: boolean;
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  autoCheckErrors: true,
  errorLimit: null,
  autoRemoveCandidates: true,
};

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
  nextMoveSequence: number;
  status: GameStatus;
  givens: Board;
  values: Board;
  selectedCell: CellIndex | null;
  incorrectCells: readonly CellIndex[];
  candidates: CandidateState;
  activeHint: HintStep | null;
  /** Accepted hint exposures, outside undo snapshots. Null means evidence missing. */
  hintExposures:
    | readonly {
        step: HintStep;
        candidates: CandidateGrid;
        /** First move after exposure. Absent means the time anchor is unknown. */
        nextMoveSequence?: number;
      }[]
    | null;
  settings: GameSettings;
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
  | 'values'
  | 'candidates'
  | 'incorrectCells'
  | 'errorCount'
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

export type GameSession = {
  state: GameState;
  history: readonly GameMove[];
};

export type GameDefinition = {
  puzzleId: string;
  contentVersion: number;
  difficultyLevel: DifficultyLevel;
  puzzleFingerprint: BoardFingerprint;
  solutionFingerprint: BoardFingerprint;
};

export type CreateGameInput = {
  sessionId: string;
  definition: GameDefinition;
  attemptNumber?: number;
  startedAtEpochMs: number;
  settings?: Partial<GameSettings>;
};

export type GameCommand =
  | { type: 'select_cell'; cell: CellIndex | null; atEpochMs: number }
  | { type: 'input_digit'; digit: Digit; moveId: string; atEpochMs: number }
  | {
      type: 'complete_full_house';
      cell: CellIndex;
      moveId: string;
      atEpochMs: number;
    }
  | { type: 'erase'; moveId: string; atEpochMs: number }
  | { type: 'set_pencil_mode'; enabled: boolean; atEpochMs: number }
  | {
      type: 'set_candidate_source';
      source: CandidateSource;
      atEpochMs: number;
    }
  | {
      type: 'generate_quick_draft';
      confirmed: boolean;
      availableCredits: number;
      premium?: boolean;
      atEpochMs: number;
    }
  | { type: 'prepare_hint'; atEpochMs: number }
  | {
      type: 'reveal_hint';
      step: HintStep;
      availableCredits: number;
      premium?: boolean;
      atEpochMs: number;
    }
  | { type: 'dismiss_hint'; atEpochMs: number }
  | { type: 'apply_hint'; moveId: string; atEpochMs: number }
  | { type: 'undo'; atEpochMs: number }
  | { type: 'pause'; atEpochMs: number }
  | { type: 'resume'; atEpochMs: number }
  | { type: 'abandon'; atEpochMs: number };

export type GameActionBlockReason =
  | 'game_not_active'
  | 'game_not_paused'
  | 'hint_in_progress'
  | 'no_selected_cell'
  | 'given_cell'
  | 'filled_cell'
  | 'nothing_to_erase'
  | 'nothing_to_undo'
  | 'quick_draft_missing'
  | 'quick_draft_confirmation_required'
  | 'incorrect_values'
  | 'conflicting_values'
  | 'unsolvable_values'
  | 'insufficient_quick_pencil_credits'
  | 'insufficient_smart_hint_credits'
  | 'hint_already_active'
  | 'no_active_hint'
  | 'invalid_hint';

export type CreditResource = 'quick_pencil' | 'smart_hint';

export type CreditSpend = {
  resource: CreditResource;
  amount: 1;
};

export type GameCommandResult = {
  session: GameSession;
  accepted: boolean;
  historyChange?:
    | { kind: 'append'; move: GameMove }
    | { kind: 'undo'; moveId: string };
  reason?: GameActionBlockReason;
  creditSpend?: CreditSpend;
  hintRequest?: HintEngineRequest;
};

export type NonUndoableGameEvent =
  | { type: 'select_cell'; cell: CellIndex | null }
  | { type: 'set_candidate_source'; source: CandidateSource }
  | { type: 'set_pencil_mode'; enabled: boolean }
  | { type: 'generate_quick_draft'; boardFingerprint: BoardFingerprint }
  | { type: 'reveal_hint'; step: HintStep }
  | { type: 'dismiss_hint' }
  | { type: 'pause' }
  | { type: 'resume' };
