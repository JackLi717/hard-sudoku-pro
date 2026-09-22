import {
  Board,
  CandidateGrid,
  CandidateRef,
  CellIndex,
  Digit,
  RegionRef,
} from '../sudoku/contracts';
import {
  arePeers,
  boxOf,
  candidateMaskFor,
  columnOf,
  createSolverCandidates,
  digitsFromMask,
  findConflictingCells,
  hasCandidate,
  removeCandidate,
  rowOf,
} from '../sudoku/board';
import type {
  ReasoningConflict,
  ReasoningPath,
  ReasoningTruth,
} from '../reasoning/contracts';

export type InferencePath = Exclude<ReasoningPath, 'single'>;
export type InferenceTruth = ReasoningTruth;

export type InferenceAction = {
  path: InferencePath;
  cells: readonly CellIndex[];
  digit: Digit;
  truth: InferenceTruth;
};

export type InferenceRoot = CandidateRef & {
  truthOnPathA: InferenceTruth;
};

export type InferenceBranch = {
  candidates: CandidateGrid;
  truths: readonly CandidateRef[];
  eliminations: readonly CandidateRef[];
  affectedCells: readonly CellIndex[];
  contradiction: ReasoningConflict | null;
  complete: boolean;
};

export type InferenceConclusion = CandidateRef & {
  action: 'place' | 'remove';
  reason: 'path_contradiction' | 'shared_result';
};

export type InferenceSession = {
  board: Board;
  baseCandidates: CandidateGrid;
  root: InferenceRoot | null;
  actions: readonly InferenceAction[];
};

export type InferenceEntryValidation = {
  candidateGrid: CandidateGrid;
  invalidCells: readonly CellIndex[];
};

export type InferenceCandidateBasis = 'solver' | 'visible';

const HOUSE_INDICES = Array.from({ length: 9 }, (_, index) => index);
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function candidateKey(candidate: CandidateRef): string {
  return `${candidate.cell}:${candidate.digit}`;
}

export function createInferenceCandidates(
  board: Board,
  retainedEliminations: readonly CandidateRef[] = [],
): CandidateGrid {
  const candidates = [...createSolverCandidates(board)];
  for (const elimination of retainedEliminations) {
    if (
      board[elimination.cell] === null &&
      hasCandidate(candidates[elimination.cell], elimination.digit)
    ) {
      candidates[elimination.cell] = removeCandidate(
        candidates[elimination.cell],
        elimination.digit,
      );
    }
  }
  return candidates;
}

function cellsInHouse(
  kind: 'row' | 'column' | 'box',
  index: number,
): readonly CellIndex[] {
  const result: CellIndex[] = [];
  for (let cell = 0; cell < 81; cell += 1) {
    if (
      (kind === 'row' && rowOf(cell) === index) ||
      (kind === 'column' && columnOf(cell) === index) ||
      (kind === 'box' && boxOf(cell) === index)
    ) {
      result.push(cell);
    }
  }
  return result;
}

function sharedRegion(
  left: CellIndex,
  right: CellIndex,
): RegionRef | undefined {
  if (rowOf(left) === rowOf(right)) {
    return { kind: 'row', index: rowOf(left) };
  }
  if (columnOf(left) === columnOf(right)) {
    return { kind: 'column', index: columnOf(left) };
  }
  if (boxOf(left) === boxOf(right)) {
    return { kind: 'box', index: boxOf(left) };
  }
  return undefined;
}

/** Player notes may be partial, while a visible Quick draft is a complete premise. */
export function validateInferenceEntry(
  board: Board,
  visibleCandidates: CandidateGrid,
  retainedEliminations: readonly CandidateRef[] = [],
  basis: InferenceCandidateBasis = 'solver',
): InferenceEntryValidation {
  const legalCandidates = createInferenceCandidates(
    board,
    retainedEliminations,
  );
  const candidateGrid =
    basis === 'visible' ? [...visibleCandidates] : [...legalCandidates];
  if (basis === 'visible') {
    for (const elimination of retainedEliminations) {
      candidateGrid[elimination.cell] = removeCandidate(
        candidateGrid[elimination.cell],
        elimination.digit,
      );
    }
  }
  const invalid = new Set<CellIndex>(findConflictingCells(board));

  board.forEach((value, cell) => {
    if (value === null && candidateGrid[cell] === 0) invalid.add(cell);
    if (value !== null && visibleCandidates[cell] !== 0) invalid.add(cell);
    if (
      digitsFromMask(visibleCandidates[cell]).some(
        digit => !hasCandidate(legalCandidates[cell], digit),
      )
    ) {
      invalid.add(cell);
    }
  });

  return {
    candidateGrid,
    invalidCells: [...invalid].sort((left, right) => left - right),
  };
}

export function createInferenceSession(
  board: Board,
  candidateGrid = createSolverCandidates(board),
): InferenceSession {
  return {
    board: [...board],
    baseCandidates: [...candidateGrid],
    root: null,
    actions: [],
  };
}

export function oppositeInferenceTruth(truth: InferenceTruth): InferenceTruth {
  return truth === 'true' ? 'false' : 'true';
}

export function inferenceRootForPath(
  session: InferenceSession,
  path: InferencePath,
): (CandidateRef & { truth: InferenceTruth }) | null {
  if (!session.root) return null;
  return {
    cell: session.root.cell,
    digit: session.root.digit,
    truth:
      path === 'a'
        ? session.root.truthOnPathA
        : oppositeInferenceTruth(session.root.truthOnPathA),
  };
}

function deriveBranchActions(
  session: InferenceSession,
  path: InferencePath,
): readonly InferenceAction[] {
  const root = inferenceRootForPath(session, path);
  if (!root) return [];
  return [
    { path, cells: [root.cell], digit: root.digit, truth: root.truth },
    ...session.actions.slice(1).filter(action => action.path === path),
  ];
}

function firstContradiction(
  board: Board,
  baseCandidates: CandidateGrid,
  candidates: CandidateGrid,
  truths: ReadonlyMap<CellIndex, Digit>,
): ReasoningConflict | null {
  for (let cell = 0; cell < 81; cell += 1) {
    if (board[cell] === null && !truths.has(cell) && candidates[cell] === 0) {
      return {
        kind: 'empty_cell',
        cells: [cell],
        evidence: digitsFromMask(baseCandidates[cell]).map(digit => ({
          cell,
          digit,
          truth: 'false',
        })),
      };
    }
  }

  for (const kind of ['row', 'column', 'box'] as const) {
    for (const index of HOUSE_INDICES) {
      const cells = cellsInHouse(kind, index);
      for (const digit of DIGITS) {
        const alreadyPlaced = cells.some(
          cell => board[cell] === digit || truths.get(cell) === digit,
        );
        if (alreadyPlaced) continue;
        if (!cells.some(cell => hasCandidate(candidates[cell], digit))) {
          return {
            kind: 'missing_house_digit',
            cells,
            digit,
            region: { kind, index },
            evidence: cells
              .filter(cell => hasCandidate(baseCandidates[cell], digit))
              .map(cell => ({ cell, digit, truth: 'false' })),
          };
        }
      }
    }
  }
  return null;
}

export function deriveInferenceBranch(
  session: InferenceSession,
  path: InferencePath,
): InferenceBranch {
  const candidates = [...session.baseCandidates];
  const truths = new Map<CellIndex, Digit>();
  const eliminations = new Map<string, CandidateRef>();
  const affectedCells = new Set<CellIndex>();
  let contradiction: ReasoningConflict | null = null;

  const eliminate = (cell: CellIndex, digit: Digit) => {
    if (!hasCandidate(session.baseCandidates[cell], digit)) return;
    const truth = truths.get(cell);
    if (truth === digit && !contradiction) {
      contradiction = {
        kind: 'opposite_truth',
        cells: [cell],
        digit,
        evidence: [
          { cell, digit, truth: 'true' },
          { cell, digit, truth: 'false' },
        ],
      };
      return;
    }
    const next = removeCandidate(candidates[cell], digit);
    if (next !== candidates[cell]) {
      candidates[cell] = next;
      eliminations.set(candidateKey({ cell, digit }), { cell, digit });
      affectedCells.add(cell);
    }
  };

  for (const action of deriveBranchActions(session, path)) {
    if (contradiction) break;
    if (action.truth === 'false') {
      action.cells.forEach(cell => eliminate(cell, action.digit));
      contradiction =
        contradiction ??
        firstContradiction(
          session.board,
          session.baseCandidates,
          candidates,
          truths,
        );
      continue;
    }

    const cell = action.cells[0];
    const previousTruth = truths.get(cell);
    if (previousTruth !== undefined && previousTruth !== action.digit) {
      contradiction = {
        kind: 'multiple_values',
        cells: [cell],
        digit: action.digit,
        evidence: [
          { cell, digit: previousTruth, truth: 'true' },
          { cell, digit: action.digit, truth: 'true' },
        ],
      };
      break;
    }
    const peerTruth = [...truths.entries()].find(
      ([peer, digit]) => digit === action.digit && arePeers(cell, peer),
    );
    if (peerTruth) {
      contradiction = {
        kind: 'peer_values',
        cells: [peerTruth[0], cell],
        digit: action.digit,
        region: sharedRegion(peerTruth[0], cell),
        evidence: [
          { cell: peerTruth[0], digit: action.digit, truth: 'true' },
          { cell, digit: action.digit, truth: 'true' },
        ],
      };
      break;
    }
    if (!hasCandidate(candidates[cell], action.digit)) {
      contradiction = {
        kind: 'opposite_truth',
        cells: [cell],
        digit: action.digit,
        evidence: [
          { cell, digit: action.digit, truth: 'false' },
          { cell, digit: action.digit, truth: 'true' },
        ],
      };
      break;
    }

    truths.set(cell, action.digit);
    affectedCells.add(cell);
    digitsFromMask(candidates[cell]).forEach(digit => {
      if (digit !== action.digit) eliminate(cell, digit);
    });
    candidates[cell] = candidateMaskFor(action.digit);
    candidates.forEach((_mask, peer) => {
      if (session.board[peer] === null && arePeers(cell, peer)) {
        eliminate(peer, action.digit);
      }
    });
    contradiction =
      contradiction ??
      firstContradiction(
        session.board,
        session.baseCandidates,
        candidates,
        truths,
      );
  }

  return {
    candidates,
    truths: [...truths.entries()].map(([cell, digit]) => ({ cell, digit })),
    eliminations: [...eliminations.values()],
    affectedCells: [...affectedCells].sort((left, right) => left - right),
    contradiction,
    complete:
      contradiction === null &&
      session.board.every(
        (value, cell) =>
          value !== null || digitsFromMask(candidates[cell]).length === 1,
      ),
  };
}

export function applyInferenceAction(
  session: InferenceSession,
  action: InferenceAction,
): InferenceSession {
  const cells = [...new Set(action.cells)]
    .filter(
      cell =>
        session.board[cell] === null &&
        (action.truth === 'true' ||
          hasCandidate(session.baseCandidates[cell], action.digit)),
    )
    .sort((left, right) => left - right);
  if (!cells.length || (action.truth === 'true' && cells.length !== 1)) {
    return session;
  }
  if (
    action.truth === 'true' &&
    !hasCandidate(session.baseCandidates[cells[0]], action.digit)
  ) {
    return session;
  }

  if (!session.root) {
    if (cells.length !== 1) return session;
    return {
      ...session,
      root: {
        cell: cells[0],
        digit: action.digit,
        truthOnPathA: action.truth,
      },
      actions: [{ ...action, path: 'a', cells }],
    };
  }

  return {
    ...session,
    actions: [...session.actions, { ...action, cells }],
  };
}

export function undoInferenceAction(
  session: InferenceSession,
): InferenceSession {
  if (session.actions.length <= 1) {
    return { ...session, root: null, actions: [] };
  }
  return { ...session, actions: session.actions.slice(0, -1) };
}

export function inferenceConclusions(
  session: InferenceSession,
): readonly InferenceConclusion[] {
  if (!session.root) return [];
  const branchA = deriveInferenceBranch(session, 'a');
  const branchB = deriveInferenceBranch(session, 'b');
  if (branchA.contradiction && branchB.contradiction) return [];
  if (branchA.contradiction || branchB.contradiction) {
    const survivingPath: InferencePath = branchA.contradiction ? 'b' : 'a';
    const root = inferenceRootForPath(session, survivingPath)!;
    return [
      {
        cell: root.cell,
        digit: root.digit,
        action: root.truth === 'true' ? 'place' : 'remove',
        reason: 'path_contradiction',
      },
    ];
  }

  const aTruths = new Set(branchA.truths.map(candidateKey));
  const sharedTruths = branchB.truths.filter(candidate =>
    aTruths.has(candidateKey(candidate)),
  );
  if (sharedTruths.length > 0) {
    return sharedTruths.map(candidate => ({
      ...candidate,
      action: 'place' as const,
      reason: 'shared_result' as const,
    }));
  }

  const aEliminations = new Set(branchA.eliminations.map(candidateKey));
  return branchB.eliminations
    .filter(candidate => aEliminations.has(candidateKey(candidate)))
    .map(candidate => ({
      ...candidate,
      action: 'remove' as const,
      reason: 'shared_result' as const,
    }));
}
