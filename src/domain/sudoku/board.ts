import {
  ALL_CANDIDATES_MASK,
  BOARD_SIZE,
  Board,
  BoardFingerprint,
  CandidateGrid,
  CandidateMask,
  CELL_COUNT,
  CellIndex,
  Digit,
} from './contracts';

export function isDigit(value: number): value is Digit {
  return Number.isInteger(value) && value >= 1 && value <= BOARD_SIZE;
}

export function isCellIndex(value: number): value is CellIndex {
  return Number.isInteger(value) && value >= 0 && value < CELL_COUNT;
}

export function isCandidateMask(value: number): value is CandidateMask {
  return (
    Number.isInteger(value) &&
    value >= 0 &&
    (value & ~ALL_CANDIDATES_MASK) === 0
  );
}

export function isBoard(value: readonly unknown[]): value is Board {
  return (
    value.length === CELL_COUNT &&
    value.every(
      cell => cell === null || (typeof cell === 'number' && isDigit(cell)),
    )
  );
}

export function isCandidateGrid(
  value: readonly unknown[],
): value is CandidateGrid {
  return (
    value.length === CELL_COUNT &&
    value.every(mask => typeof mask === 'number' && isCandidateMask(mask))
  );
}

export function candidateMaskFor(digit: Digit): CandidateMask {
  return 1 << (digit - 1);
}

export function hasCandidate(mask: CandidateMask, digit: Digit): boolean {
  return (mask & candidateMaskFor(digit)) !== 0;
}

export function addCandidate(mask: CandidateMask, digit: Digit): CandidateMask {
  return mask | candidateMaskFor(digit);
}

export function removeCandidate(
  mask: CandidateMask,
  digit: Digit,
): CandidateMask {
  return mask & ~candidateMaskFor(digit);
}

export function digitsFromMask(mask: CandidateMask): readonly Digit[] {
  const digits: Digit[] = [];

  for (let digit = 1; digit <= BOARD_SIZE; digit += 1) {
    if (isDigit(digit) && hasCandidate(mask, digit)) {
      digits.push(digit);
    }
  }

  return digits;
}

export function createBoardFingerprint(board: Board): BoardFingerprint {
  if (!isBoard(board)) {
    throw new Error(`A board must contain exactly ${CELL_COUNT} valid cells.`);
  }

  return board.map(value => value ?? 0).join('');
}

export function boardFromFingerprint(fingerprint: string): Board {
  if (!/^[0-9]{81}$/.test(fingerprint)) {
    throw new Error('A board fingerprint must contain exactly 81 digits.');
  }

  return [...fingerprint].map(character => {
    const value = Number(character);
    return value === 0 ? null : (value as Digit);
  });
}
