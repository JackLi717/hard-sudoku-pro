import type { CellIndex, Digit } from '../domain/sudoku/contracts';

export type CandidateBatchRemoval = {
  cells: readonly CellIndex[];
  digits: readonly Digit[];
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

/** Both input orders produce the same candidate edit command. */
export function candidateBatchRemoval(
  cells: readonly CellIndex[],
  digits: readonly Digit[],
): CandidateBatchRemoval | null {
  if (cells.length === 0 || digits.length === 0) return null;
  return {
    cells: [...new Set(cells)].sort((left, right) => left - right),
    digits: [...new Set(digits)].sort((left, right) => left - right),
  };
}
