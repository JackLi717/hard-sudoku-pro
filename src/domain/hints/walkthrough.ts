import type { HintStep } from './contracts';
import type { Board, CandidateGrid } from '../sudoku/contracts';

/** A validated, immutable starting position; no solution or game session. */
export type HintWalkthroughSnapshot = Readonly<{
  id: string;
  values: Board;
  givens: Board;
  candidateMasks: CandidateGrid;
  step: HintStep;
}>;
