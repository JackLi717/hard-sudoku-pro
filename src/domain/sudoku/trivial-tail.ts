import {
  createSolverCandidates,
  digitsFromMask,
  findConflictingCells,
  isCompleteBoard,
} from './board';
import { findFullHousePlacements } from './full-house';
import { Board, CellIndex, Digit } from './contracts';

export const AUTO_FINISH_EMPTY_CELL_LIMIT = 20;

export type TrivialTailPlacement = {
  cell: CellIndex;
  digit: Digit;
  technique: 'fullHouse' | 'nakedSingle';
  round: number;
};

/**
 * Proves a completion using only Full Houses and naked singles. Player notes
 * and the stored solution are deliberately excluded from the proof.
 */
export function findTrivialTailCompletion(
  board: Board,
): readonly TrivialTailPlacement[] | null {
  const emptyCellCount = board.filter(value => value === null).length;
  if (
    emptyCellCount === 0 ||
    emptyCellCount >= AUTO_FINISH_EMPTY_CELL_LIMIT ||
    findConflictingCells(board).length > 0
  ) {
    return null;
  }

  const values = [...board];
  const placements: TrivialTailPlacement[] = [];
  for (let round = 0; round < AUTO_FINISH_EMPTY_CELL_LIMIT; round += 1) {
    const fullHouses = findFullHousePlacements(values);
    if (fullHouses.size > 0) {
      for (const [cell, digit] of fullHouses) {
        if (values[cell] === null) {
          values[cell] = digit;
          placements.push({ cell, digit, technique: 'fullHouse', round });
        }
      }
    } else {
      const candidates = createSolverCandidates(values);
      const singles = candidates.flatMap((mask, cell) => {
        if (values[cell] !== null) return [];
        const digits = digitsFromMask(mask);
        return digits.length === 1
          ? [{ cell: cell as CellIndex, digit: digits[0] }]
          : [];
      });
      if (singles.length === 0) return null;
      for (const { cell, digit } of singles) {
        values[cell] = digit;
        placements.push({ cell, digit, technique: 'nakedSingle', round });
      }
    }

    if (findConflictingCells(values).length > 0) return null;
    if (isCompleteBoard(values)) return placements;
  }
  return null;
}
