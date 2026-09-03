import { arePeers, digitsFromMask, addCandidate, hasCandidate } from './board';
import { ALL_CANDIDATES_MASK, Board, CellIndex, Digit } from './contracts';

const DIGITS = digitsFromMask(ALL_CANDIDATES_MASK);
const HOUSES = Array.from({ length: 9 }, (_, index) => [
  Array.from({ length: 9 }, (__, offset) => index * 9 + offset),
  Array.from({ length: 9 }, (__, offset) => offset * 9 + index),
  Array.from(
    { length: 9 },
    (__, offset) =>
      (Math.floor(index / 3) * 3 + Math.floor(offset / 3)) * 9 +
      (index % 3) * 3 +
      (offset % 3),
  ),
]).flat();

// Only eight placed digits and one empty cell qualify. Player notes are not
// evidence for this assistance, even when only one candidate is written down.
export function findFullHousePlacements(
  board: Board,
): ReadonlyMap<CellIndex, Digit> {
  const placements = new Map<CellIndex, Digit>();
  for (const house of HOUSES) {
    const emptyCells = house.filter(cell => board[cell] === null);
    if (emptyCells.length !== 1) {
      continue;
    }
    const cell = emptyCells[0];
    let placed = 0;
    let duplicate = false;
    for (const index of house) {
      const value = board[index];
      if (value !== null) {
        duplicate ||= hasCandidate(placed, value);
        placed = addCandidate(placed, value);
      }
    }
    if (duplicate) {
      continue;
    }
    const digit = DIGITS.find(value => !hasCandidate(placed, value));
    if (
      digit !== undefined &&
      !board.some((value, peer) => value === digit && arePeers(cell, peer))
    ) {
      placements.set(cell, digit);
    }
  }
  return placements;
}
