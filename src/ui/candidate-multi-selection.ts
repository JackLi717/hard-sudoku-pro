import { hasCandidate } from '../domain/sudoku/board';
import type {
  CandidateGrid,
  CellIndex,
  Digit,
} from '../domain/sudoku/contracts';
import type { CandidateEditAction } from '../domain/game/contracts';

export type CandidateBatchEdit = {
  cells: readonly CellIndex[];
  digits: readonly Digit[];
  action: CandidateEditAction;
  count: number;
};

// Keep selection order so Normal can retain the most recently selected item.
function toggleSelection<T extends number>(
  selected: readonly T[],
  item: T,
  restart: boolean,
): readonly T[] {
  if (restart) return [item];
  return selected.includes(item)
    ? selected.filter(value => value !== item)
    : [...selected, item];
}

export function toggleSelectedCandidateCell(
  cells: readonly CellIndex[],
  cell: CellIndex,
  restart = false,
): readonly CellIndex[] {
  return toggleSelection(cells, cell, restart);
}

export function toggleSelectedCandidateDigit(
  digits: readonly Digit[],
  digit: Digit,
  restart = false,
): readonly Digit[] {
  return toggleSelection(digits, digit, restart);
}

export function addSelectedCandidateCells(
  current: readonly CellIndex[],
  added: readonly CellIndex[],
  restart = false,
): readonly CellIndex[] {
  return [...new Set([...(restart ? [] : current), ...added])];
}

/** Add missing manual notes first; remove only when every pair is present. */
export function candidateBatchEdit(
  cells: readonly CellIndex[],
  digits: readonly Digit[],
  grid: CandidateGrid,
  source: 'manual' | 'quick',
): CandidateBatchEdit | null {
  if (cells.length === 0 || digits.length === 0) return null;
  const uniqueCells = [...new Set(cells)].sort((left, right) => left - right);
  const uniqueDigits = [...new Set(digits)].sort((left, right) => left - right);
  const presentCount = uniqueCells.reduce(
    (count, cell) =>
      count +
      uniqueDigits.filter(digit => hasCandidate(grid[cell], digit)).length,
    0,
  );
  const missingCount = uniqueCells.length * uniqueDigits.length - presentCount;
  const action = source === 'manual' && missingCount > 0 ? 'add' : 'remove';
  const count = action === 'add' ? missingCount : presentCount;
  if (count === 0) return null;
  return {
    cells: uniqueCells,
    digits: uniqueDigits,
    action,
    count,
  };
}
