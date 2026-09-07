import {
  boxOf,
  columnOf,
  hasCandidate,
  rowOf,
} from '../../domain/sudoku/board';
import {
  Board,
  CandidateGrid,
  CellIndex,
  Digit,
} from '../../domain/sudoku/contracts';

/** Counts visible notes only; a unique occurrence is not a proven placement. */
export function uniqueCandidateNotes(
  values: Board,
  candidates: CandidateGrid,
  digit: Digit,
): ReadonlySet<CellIndex> {
  const unique = new Set<CellIndex>();
  for (const regionOf of [rowOf, columnOf, boxOf]) {
    for (let region = 0; region < 9; region++) {
      const cells = values.flatMap((value, cell) =>
        value === null &&
        regionOf(cell) === region &&
        hasCandidate(candidates[cell], digit)
          ? [cell]
          : [],
      );
      // A placed copy means this region no longer needs this digit.
      if (
        cells.length === 1 &&
        !values.some(
          (value, cell) => value === digit && regionOf(cell) === region,
        )
      )
        unique.add(cells[0]);
    }
  }
  return unique;
}
