import type { HintWalkthroughSnapshot } from '../hints/walkthrough';
import {
  boxOf,
  columnOf,
  createSolverCandidates,
  intersectCandidateMasks,
  rowOf,
} from '../sudoku/board';
import type { Board, CandidateGrid, RegionRef } from '../sudoku/contracts';

/** Rebuild trusted candidates after any supporting placements. Player notes are not proof. */
export function practiceCandidatesBeforeMove(
  initial: HintWalkthroughSnapshot,
  values: Board,
): CandidateGrid {
  const legal = createSolverCandidates(values);
  return values.map((value, cell) =>
    value === null
      ? intersectCandidateMasks(legal[cell], initial.candidateMasks[cell])
      : 0,
  );
}

export function practiceRegionCells(region: RegionRef): readonly number[] {
  return Array.from({ length: 81 }, (_, cell) => cell).filter(cell =>
    region.kind === 'row'
      ? rowOf(cell) === region.index
      : region.kind === 'column'
      ? columnOf(cell) === region.index
      : boxOf(cell) === region.index,
  );
}
