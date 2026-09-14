import { arePeers, digitsFromMask } from './board';
import { Board, CandidateGrid, CellIndex, Digit } from './contracts';

export type OneTapFillKind = 'full_house' | 'single_candidate';

/** A note is tappable only when it is the sole visible, currently legal note. */
export function findSingleCandidatePlacements(
  board: Board,
  candidates: CandidateGrid,
): ReadonlyMap<CellIndex, Digit> {
  const placements = new Map<CellIndex, Digit>();
  candidates.forEach((mask, cell) => {
    if (board[cell] !== null) return;
    const digits = digitsFromMask(mask);
    if (digits.length !== 1) return;
    const digit = digits[0];
    if (board.some((value, peer) => value === digit && arePeers(cell, peer))) {
      return;
    }
    placements.set(cell, digit);
  });
  return placements;
}
