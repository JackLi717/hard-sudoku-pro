import type { CoordinatorMessage, OfflineGameSnapshot } from '../application';
import type { CellIndex } from '../domain/sudoku/contracts';
import { findConflictingCells } from '../domain/sudoku/board';

const GAMEPLAY_FEEDBACK_CODES = new Set<CoordinatorMessage['code']>([
  'no_selected_cell',
  'given_cell',
  'filled_cell',
  'nothing_to_erase',
  'nothing_to_undo',
  'quick_draft_missing',
  'incorrect_values',
  'conflicting_values',
  'unsolvable_values',
  'quick_candidates_inconsistent',
]);

export type GameplayFeedback = {
  cells: readonly CellIndex[];
  tone: 'error' | 'notice';
  target: 'board' | 'undo' | 'quick';
};

export function isGameplayFeedbackMessage(
  message: CoordinatorMessage | null,
): message is CoordinatorMessage {
  return message !== null && GAMEPLAY_FEEDBACK_CODES.has(message.code);
}

export function resolveGameplayFeedback(
  snapshot: OfflineGameSnapshot,
): GameplayFeedback | null {
  const { message, session } = snapshot;
  if (!session || !isGameplayFeedbackMessage(message)) return null;
  const { state } = session;
  switch (message.code) {
    case 'conflicting_values':
      return {
        cells: findConflictingCells(state.values),
        tone: 'error',
        target: 'board',
      };
    case 'incorrect_values':
      return {
        cells: state.incorrectCells,
        tone: 'error',
        target: 'board',
      };
    case 'quick_candidates_inconsistent':
      return {
        cells: message.cells ?? [],
        tone: 'error',
        target: 'board',
      };
    case 'unsolvable_values': {
      // An unsolvable board may have no visible duplicate. Do not reveal
      // solution mismatches when automatic error checking is disabled.
      return { cells: [], tone: 'notice', target: 'board' };
    }
    case 'given_cell':
    case 'filled_cell':
    case 'nothing_to_erase':
      return {
        cells: state.selectedCell === null ? [] : [state.selectedCell],
        tone: 'notice',
        target: 'board',
      };
    case 'nothing_to_undo':
      return { cells: [], tone: 'notice', target: 'undo' };
    case 'quick_draft_missing':
      return { cells: [], tone: 'notice', target: 'quick' };
    default:
      return { cells: [], tone: 'notice', target: 'board' };
  }
}
