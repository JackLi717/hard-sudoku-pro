import { HintStep } from './contracts';
import {
  CandidateGrid,
  CellIndex,
  Digit,
  RegionRef,
} from '../sudoku/contracts';
import {
  arePeers,
  boardFromFingerprint,
  createSolverCandidates,
  hasCandidate,
  intersectCandidateMasks,
} from '../sudoku/board';

export type TwoStringKiteProof = {
  digit: Digit;
  row: number;
  column: number;
  box: number;
  rowBase: CellIndex;
  rowEnd: CellIndex;
  columnBase: CellIndex;
  columnEnd: CellIndex;
};

const rowOf = (cell: CellIndex) => Math.floor(cell / 9);
const columnOf = (cell: CellIndex) => cell % 9;
const boxOf = (cell: CellIndex) =>
  Math.floor(rowOf(cell) / 3) * 3 + Math.floor(columnOf(cell) / 3);

export function sharedKiteRegion(a: CellIndex, b: CellIndex): RegionRef {
  if (rowOf(a) === rowOf(b)) return { kind: 'row', index: rowOf(a) };
  if (columnOf(a) === columnOf(b))
    return { kind: 'column', index: columnOf(a) };
  return { kind: 'box', index: boxOf(a) };
}

/** Reconstruct and verify the explanation against the actual candidate snapshot.
 * This neither searches for a new move nor changes the saved hint or board. */
export function twoStringKiteProof(
  step: HintStep,
  suppliedCandidates?: CandidateGrid | null,
): TwoStringKiteProof | null {
  if (
    step.techniqueCode !== 'twoStringKite' ||
    !step.eliminations.length ||
    step.placements.length
  )
    return null;
  const digit = step.eliminations[0].digit;
  if (
    [...step.eliminations, ...step.premiseCandidates].some(
      c => c.digit !== digit,
    )
  )
    return null;
  const board = boardFromFingerprint(step.boardFingerprint);
  const legal = createSolverCandidates(board);
  const candidates = suppliedCandidates ?? legal;
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
  const cells = [...new Set(step.premiseCandidates.map(c => c.cell))];
  if (
    cells.length < 3 ||
    cells.length > 4 ||
    [...step.premiseCandidates, ...step.eliminations].some(
      c => board[c.cell] !== null || !hasCandidate(candidates[c.cell], digit),
    )
  )
    return null;
  for (let row = 0; row < 9; row++) {
    const rowCells = cells.filter(cell => rowOf(cell) === row);
    if (
      rowCells.length !== 2 ||
      candidates.filter(
        (mask, cell) => rowOf(cell) === row && hasCandidate(mask, digit),
      ).length !== 2
    )
      continue;
    for (let column = 0; column < 9; column++) {
      const columnCells = cells.filter(cell => columnOf(cell) === column);
      if (
        columnCells.length !== 2 ||
        candidates.filter(
          (mask, cell) =>
            columnOf(cell) === column && hasCandidate(mask, digit),
        ).length !== 2
      )
        continue;
      if (new Set([...rowCells, ...columnCells]).size !== cells.length)
        continue;
      for (const rowBase of rowCells)
        for (const columnBase of columnCells) {
          if (rowBase === columnBase || boxOf(rowBase) !== boxOf(columnBase))
            continue;
          const rowEnd = rowCells.find(cell => cell !== rowBase)!;
          const columnEnd = columnCells.find(cell => cell !== columnBase)!;
          if (
            step.eliminations.every(
              c =>
                !cells.includes(c.cell) &&
                arePeers(c.cell, rowEnd) &&
                arePeers(c.cell, columnEnd),
            )
          ) {
            return {
              digit,
              row,
              column,
              box: boxOf(rowBase),
              rowBase,
              rowEnd,
              columnBase,
              columnEnd,
            };
          }
        }
    }
  }
  return null;
}
