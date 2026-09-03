import {
  ALL_CANDIDATES_MASK,
  BOX_SIZE,
  BOARD_SIZE,
  Board,
  BoardFingerprint,
  CandidateGrid,
  CandidateMask,
  CELL_COUNT,
  CellIndex,
  Digit,
} from './contracts';

export function rowOf(cell: CellIndex): number {
  return Math.floor(cell / BOARD_SIZE);
}

export function columnOf(cell: CellIndex): number {
  return cell % BOARD_SIZE;
}

export function boxOf(cell: CellIndex): number {
  return (
    Math.floor(rowOf(cell) / BOX_SIZE) * BOX_SIZE +
    Math.floor(columnOf(cell) / BOX_SIZE)
  );
}

export function arePeers(left: CellIndex, right: CellIndex): boolean {
  return (
    left !== right &&
    (rowOf(left) === rowOf(right) ||
      columnOf(left) === columnOf(right) ||
      boxOf(left) === boxOf(right))
  );
}

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

export function intersectCandidateMasks(
  left: CandidateMask,
  right: CandidateMask,
): CandidateMask {
  return left & right;
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

export function createSolverCandidates(board: Board): CandidateGrid {
  if (!isBoard(board)) {
    throw new Error(`A board must contain exactly ${CELL_COUNT} valid cells.`);
  }

  const rows = new Uint16Array(BOARD_SIZE);
  const columns = new Uint16Array(BOARD_SIZE);
  const boxes = new Uint16Array(BOARD_SIZE);
  board.forEach((value, cell) => {
    if (value !== null) {
      const mask = candidateMaskFor(value);
      rows[rowOf(cell)] |= mask;
      columns[columnOf(cell)] |= mask;
      boxes[boxOf(cell)] |= mask;
    }
  });

  return board.map((value, cell) =>
    value === null
      ? ALL_CANDIDATES_MASK &
        ~(rows[rowOf(cell)] | columns[columnOf(cell)] | boxes[boxOf(cell)])
      : 0,
  );
}

export function findConflictingCells(board: Board): readonly CellIndex[] {
  if (!isBoard(board)) {
    throw new Error(`A board must contain exactly ${CELL_COUNT} valid cells.`);
  }

  const conflicts = new Set<CellIndex>();
  board.forEach((value, cell) => {
    if (value === null) {
      return;
    }
    board.forEach((peerValue, peer) => {
      if (peerValue === value && arePeers(cell, peer)) {
        conflicts.add(cell);
        conflicts.add(peer);
      }
    });
  });
  return [...conflicts].sort((left, right) => left - right);
}

export function isCompleteBoard(board: Board): boolean {
  return isBoard(board) && board.every(value => value !== null);
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
