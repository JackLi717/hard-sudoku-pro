export const BOARD_SIZE = 9;
export const BOX_SIZE = 3;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
export const ALL_CANDIDATES_MASK = 0b1_1111_1111;

export type Digit = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type CellValue = Digit | null;
export type Board = readonly CellValue[];
export type CellIndex = number;
export type CandidateMask = number;
export type CandidateGrid = readonly CandidateMask[];
export type BoardFingerprint = string;

export type RegionKind = 'row' | 'column' | 'box';

export type CellRef = {
  cell: CellIndex;
};

export type CandidateRef = CellRef & {
  digit: Digit;
};

export type Placement = CandidateRef;

export type RegionRef = {
  kind: RegionKind;
  index: number;
};
