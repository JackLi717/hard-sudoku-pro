import type { CellIndex, Digit } from '../domain/sudoku/contracts';

export type CandidateBatchRemoval = {
  cells: readonly CellIndex[];
  digits: readonly Digit[];
};

function toggleSorted<T extends number>(
  selected: readonly T[],
  item: T,
  restart: boolean,
): readonly T[] {
  if (restart) return [item];
  return selected.includes(item)
    ? selected.filter(value => value !== item)
    : [...selected, item].sort((left, right) => left - right);
}

export function toggleSelectedCandidateCell(
  cells: readonly CellIndex[],
  cell: CellIndex,
  restart = false,
): readonly CellIndex[] {
  return toggleSorted(cells, cell, restart);
}

export function toggleSelectedCandidateDigit(
  digits: readonly Digit[],
  digit: Digit,
  restart = false,
): readonly Digit[] {
  return toggleSorted(digits, digit, restart);
}

export function addSelectedCandidateCells(
  current: readonly CellIndex[],
  added: readonly CellIndex[],
  restart = false,
): readonly CellIndex[] {
  return [...new Set([...(restart ? [] : current), ...added])].sort(
    (left, right) => left - right,
  );
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
