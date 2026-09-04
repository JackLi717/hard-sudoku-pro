import { HintStep } from './contracts';
import {
  CandidateGrid,
  CellIndex,
  Digit,
  RegionRef,
} from '../sudoku/contracts';
import {
  boardFromFingerprint,
  createSolverCandidates,
  hasCandidate,
  intersectCandidateMasks,
} from '../sudoku/board';
import { inTurbotRegion } from './turbot-fish-proof';

export type EmptyRectangleProof = {
  digit: Digit;
  box: number;
  row: number;
  column: number;
  intersection: CellIndex;
  emptyCells: readonly CellIndex[];
  boxCandidates: readonly CellIndex[];
  drainedArm: readonly CellIndex[];
  remainingArm: readonly CellIndex[];
  pairNear: CellIndex;
  pairFar: CellIndex;
  target: CellIndex;
  pairRegion: RegionRef;
  fromTargetRegion: RegionRef;
  toBoxRegion: RegionRef;
  conflictRegion: RegionRef;
};
const rowOf = (cell: number) => Math.floor(cell / 9);
const columnOf = (cell: number) => cell % 9;
const boxOf = (cell: number) =>
  Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3);

/** Verify the original pattern and exact external pair; never infer a forced
 * cell from a multi-candidate arm, or modify the original hint's result. */
export function emptyRectangleProofs(
  step: HintStep,
  supplied?: CandidateGrid | null,
): readonly EmptyRectangleProof[] | null {
  if (
    step.techniqueCode !== 'emptyRectangle' ||
    !step.eliminations.length ||
    step.placements.length
  )
    return null;
  const digit = step.eliminations[0].digit;
  const refs = [...step.premiseCandidates, ...step.eliminations];
  const cells = [...new Set(step.premiseCandidates.map(c => c.cell))];
  if (cells.length < 4 || cells.length > 6 || refs.some(c => c.digit !== digit))
    return null;
  const board = boardFromFingerprint(step.boardFingerprint);
  const legal = createSolverCandidates(board);
  const candidates = supplied ?? legal;
  if (
    candidates.length !== 81 ||
    candidates.some(
      (mask, cell) =>
        !Number.isInteger(mask) ||
        mask < 0 ||
        mask > 511 ||
        intersectCandidateMasks(mask, legal[cell]) !== mask,
    )
  )
    return null;
  if (
    refs.some(
      c => board[c.cell] !== null || !hasCandidate(candidates[c.cell], digit),
    )
  )
    return null;
  function find(target: CellIndex): EmptyRectangleProof | null {
    for (let box = 0; box < 9; box++) {
      if (boxOf(target) === box) continue;
      const boxCells = Array.from({ length: 81 }, (_, c) => c).filter(
        c => boxOf(c) === box,
      );
      const boxCandidates = boxCells.filter(c =>
        hasCandidate(candidates[c], digit),
      );
      if (
        boxCandidates.length < 2 ||
        boxCandidates.some(c => !cells.includes(c))
      )
        continue;
      for (const intersection of boxCells) {
        if (hasCandidate(candidates[intersection], digit)) continue;
        const row = rowOf(intersection),
          column = columnOf(intersection);
        if (
          !boxCandidates.every(c => rowOf(c) === row || columnOf(c) === column)
        )
          continue;
        const rowArm = boxCandidates.filter(c => rowOf(c) === row);
        const columnArm = boxCandidates.filter(c => columnOf(c) === column);
        if (!rowArm.length || !columnArm.length) continue;
        const emptyCells = boxCells.filter(
          c => rowOf(c) !== row && columnOf(c) !== column,
        );
        for (const pairNear of cells.filter(c => boxOf(c) !== box)) {
          for (const pairFar of cells.filter(
            c => c !== pairNear && boxOf(c) !== box,
          )) {
            if (
              new Set([...boxCandidates, pairNear, pairFar]).size !==
              cells.length
            )
              continue;
            const horizontal =
              columnOf(pairNear) === column &&
              rowOf(pairNear) === rowOf(pairFar) &&
              target === row * 9 + columnOf(pairFar);
            const vertical =
              rowOf(pairNear) === row &&
              columnOf(pairNear) === columnOf(pairFar) &&
              target === rowOf(pairFar) * 9 + column;
            if (!horizontal && !vertical) continue;
            const pairRegion: RegionRef = horizontal
              ? { kind: 'row', index: rowOf(pairNear) }
              : { kind: 'column', index: columnOf(pairNear) };
            if (
              candidates.filter(
                (mask, c) =>
                  inTurbotRegion(c, pairRegion) && hasCandidate(mask, digit),
              ).length !== 2
            )
              continue;
            if (cells.includes(target)) continue;
            return {
              digit,
              box,
              row,
              column,
              intersection,
              emptyCells,
              boxCandidates,
              drainedArm: horizontal ? columnArm : rowArm,
              remainingArm: horizontal ? rowArm : columnArm,
              pairNear,
              pairFar,
              target,
              pairRegion,
              fromTargetRegion: horizontal
                ? { kind: 'column', index: columnOf(pairFar) }
                : { kind: 'row', index: rowOf(pairFar) },
              toBoxRegion: horizontal
                ? { kind: 'column', index: column }
                : { kind: 'row', index: row },
              conflictRegion: horizontal
                ? { kind: 'row', index: row }
                : { kind: 'column', index: column },
            };
          }
        }
      }
    }
    return null;
  }
  const proofs = [...new Set(step.eliminations.map(c => c.cell))].map(find);
  return proofs.every((proof): proof is EmptyRectangleProof => proof !== null)
    ? proofs
    : null;
}
