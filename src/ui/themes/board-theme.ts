import type { AppPalette } from '../theme';

/** Visual tokens only. Technique rules and board state do not belong here. */
export type BoardColors = AppPalette & {
  batchSelection: string;
  batchSelectionSoft: string;
  alternateBoxSurface: string;
  fishFin: string;
  fishFinSoft: string;
  fishBase: string;
  fishBaseSoft: string;
  fishCover: string;
  fishCoverSoft: string;
  hatch: string;
  excludedSoft: string;
  colorGroup1Soft: string;
  colorGroup2Soft: string;
  colorGroup3Soft: string;
  colorGroup4Soft: string;
  reasoningPathA: string;
  reasoningPathASoft: string;
  reasoningPathB: string;
  reasoningPathBSoft: string;
  reasoningAssumption: string;
  reasoningAssumptionSoft: string;
  reasoningSharedElimination: string;
  reasoningSharedEliminationSoft: string;
  reasoningConclusionSoft: string;
  reasoningContradiction: string;
  reasoningContradictionSoft: string;
  reasoningSelection: string;
  /** Neutral candidate attention; it never asserts a logical truth. */
  candidateAttentionBackground: string;
  candidateAttentionText: string;
};

export type BoardTheme = {
  colors: BoardColors;
  marks: {
    selectionWidth: number;
    candidateRadius: number;
    strikeWidth: number;
    strikeAngle: `${number}deg`;
    reasoningCandidateWidth: number;
    hatchOpacity: number;
    contextOpacity: number;
  };
};

/** Shade boxes 2, 4, 6 and 8; adjacent boxes differ along both axes. */
export function boardCellSurface(colors: BoardColors, cell: number): string {
  const box = Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3);
  return box % 2 === 1 ? colors.alternateBoxSurface : colors.surface;
}
