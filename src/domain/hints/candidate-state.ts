import { Board, CandidateGrid, CellIndex, Digit } from '../sudoku/contracts';
import {
  addCandidate,
  boardFromFingerprint,
  createBoardFingerprint,
  digitsFromMask,
  hasCandidate,
  isBoard,
  isCandidateGrid,
  removeCandidate,
} from '../sudoku/board';
import { HintEngineRequest, HintStep, validateHintStep } from './contracts';

const BOARD_SIZE = 9;
const BOX_SIZE = 3;

export type HintCandidateState = {
  boardFingerprint: string;
  hintCandidates: CandidateGrid;
};

function rowOf(cell: CellIndex): number {
  return Math.floor(cell / BOARD_SIZE);
}

function columnOf(cell: CellIndex): number {
  return cell % BOARD_SIZE;
}

function boxOf(cell: CellIndex): number {
  return (
    Math.floor(rowOf(cell) / BOX_SIZE) * BOX_SIZE +
    Math.floor(columnOf(cell) / BOX_SIZE)
  );
}

function arePeers(left: CellIndex, right: CellIndex): boolean {
  return (
    rowOf(left) === rowOf(right) ||
    columnOf(left) === columnOf(right) ||
    boxOf(left) === boxOf(right)
  );
}

export function createHintCandidates(board: Board): CandidateGrid {
  if (!isBoard(board)) {
    throw new Error('A board must contain exactly 81 valid cells.');
  }

  return board.map((value, cell) => {
    if (value !== null) {
      return 0;
    }

    let mask = 0;
    for (let digit = 1; digit <= BOARD_SIZE; digit += 1) {
      const candidate = digit as Digit;
      const conflicts = board.some(
        (peerValue, peer) =>
          peerValue === candidate && peer !== cell && arePeers(cell, peer),
      );
      if (!conflicts) {
        mask = addCandidate(mask, candidate);
      }
    }
    return mask;
  });
}

export function validateHintEngineRequest(
  request: HintEngineRequest,
): readonly string[] {
  const errors: string[] = [];
  let board: Board;

  if (request.contractVersion !== 1) {
    errors.push('unsupported hint contract version');
  }

  try {
    board = boardFromFingerprint(request.boardFingerprint);
  } catch {
    return ['boardFingerprint must contain exactly 81 digits'];
  }

  if (!isCandidateGrid(request.hintCandidates)) {
    return [...errors, 'hintCandidates must contain 81 valid 9-bit masks'];
  }

  board.forEach((value, cell) => {
    if (value === null) {
      return;
    }
    const conflictingPeer = board.findIndex(
      (peerValue, peer) =>
        peer > cell && peerValue === value && arePeers(cell, peer),
    );
    if (conflictingPeer >= 0) {
      errors.push(
        `board contains conflicting digit ${value} at cells ${cell} and ${conflictingPeer}`,
      );
    }
  });

  const legalCandidates = createHintCandidates(board);
  request.hintCandidates.forEach((mask, cell) => {
    if (board[cell] !== null && mask !== 0) {
      errors.push(`filled cell ${cell} must not contain hint candidates`);
    }
    if (board[cell] === null && mask === 0) {
      errors.push(
        `empty cell ${cell} must contain at least one hint candidate`,
      );
    }
    if (
      digitsFromMask(mask).some(
        digit => !hasCandidate(legalCandidates[cell], digit),
      )
    ) {
      errors.push(`cell ${cell} contains a candidate forbidden by the board`);
    }
  });

  return errors;
}

function candidateKey(cell: CellIndex, digit: Digit): string {
  return `${cell}:${digit}`;
}

export function validateHintStepForState(
  request: HintEngineRequest,
  step: HintStep,
  solutionFingerprint?: string,
): readonly string[] {
  const errors = [...validateHintStep(step)];
  const requestErrors = validateHintEngineRequest(request);
  errors.push(...requestErrors);

  if (step.boardFingerprint !== request.boardFingerprint) {
    errors.push('hint step must match the request board fingerprint');
  }
  if (requestErrors.length > 0) {
    return errors;
  }

  const board = boardFromFingerprint(request.boardFingerprint);
  let solution: Board | null = null;
  if (solutionFingerprint) {
    try {
      solution = boardFromFingerprint(solutionFingerprint);
      if (solution.some(value => value === null)) {
        errors.push('solutionFingerprint must be fully solved');
      }
      solution.forEach((value, cell) => {
        if (value === null) {
          return;
        }
        if (board[cell] !== null && board[cell] !== value) {
          errors.push(`board cell ${cell} contradicts the solution`);
        }
        if (
          board[cell] === null &&
          !hasCandidate(request.hintCandidates[cell], value)
        ) {
          errors.push(
            `hintCandidates at cell ${cell} no longer contains the solution`,
          );
        }
        const conflictingPeer = solution?.findIndex(
          (peerValue, peer) =>
            peer > cell && peerValue === value && arePeers(cell, peer),
        );
        if (conflictingPeer !== undefined && conflictingPeer >= 0) {
          errors.push(
            `solution contains conflicting digit ${value} at cells ${cell} and ${conflictingPeer}`,
          );
        }
      });
    } catch {
      errors.push('solutionFingerprint must contain exactly 81 digits');
    }
  }
  const seenActions = new Set<string>();

  for (const premise of step.premiseCandidates) {
    if (
      !hasCandidate(request.hintCandidates[premise.cell] ?? 0, premise.digit)
    ) {
      errors.push(
        `premise candidate ${candidateKey(
          premise.cell,
          premise.digit,
        )} is not present`,
      );
    }
  }

  for (const action of [...step.placements, ...step.eliminations]) {
    const key = candidateKey(action.cell, action.digit);
    if (seenActions.has(key)) {
      errors.push(`duplicate hint action ${key}`);
    }
    seenActions.add(key);

    if (board[action.cell] !== null) {
      errors.push(`hint action targets filled cell ${action.cell}`);
    }
    if (!hasCandidate(request.hintCandidates[action.cell] ?? 0, action.digit)) {
      errors.push(`hint action ${key} is not present in hintCandidates`);
    }
  }

  for (const placement of step.placements) {
    if (solution && solution[placement.cell] !== placement.digit) {
      errors.push(
        `placement ${candidateKey(
          placement.cell,
          placement.digit,
        )} contradicts the solution`,
      );
    }
  }

  for (const elimination of step.eliminations) {
    if (solution && solution[elimination.cell] === elimination.digit) {
      errors.push(
        `elimination ${candidateKey(
          elimination.cell,
          elimination.digit,
        )} removes the solution`,
      );
    }
  }

  const resultingMasks = [...request.hintCandidates];
  for (const elimination of step.eliminations) {
    resultingMasks[elimination.cell] = removeCandidate(
      resultingMasks[elimination.cell] ?? 0,
      elimination.digit,
    );
    if (resultingMasks[elimination.cell] === 0) {
      errors.push(
        `elimination ${candidateKey(
          elimination.cell,
          elimination.digit,
        )} empties the cell`,
      );
    }
  }

  return errors;
}

export function applyHintStep(
  request: HintEngineRequest,
  step: HintStep,
  solutionFingerprint: string,
): HintCandidateState {
  const errors = validateHintStepForState(request, step, solutionFingerprint);
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  const board = [...boardFromFingerprint(request.boardFingerprint)];
  const hintCandidates = [...request.hintCandidates];

  for (const elimination of step.eliminations) {
    hintCandidates[elimination.cell] = removeCandidate(
      hintCandidates[elimination.cell],
      elimination.digit,
    );
  }

  for (const placement of step.placements) {
    board[placement.cell] = placement.digit;
    hintCandidates[placement.cell] = 0;
    hintCandidates.forEach((mask, cell) => {
      if (board[cell] === null && arePeers(placement.cell, cell)) {
        hintCandidates[cell] = removeCandidate(mask, placement.digit);
      }
    });
  }

  return {
    boardFingerprint: createBoardFingerprint(board),
    hintCandidates,
  };
}
