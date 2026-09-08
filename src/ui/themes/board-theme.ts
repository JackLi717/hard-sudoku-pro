import type { AppPalette } from '../theme';

/** Visual tokens only. Technique rules and board state do not belong here. */
export type BoardColors = AppPalette & {
  alternateBoxSurface: string;
  fishBase: string;
  fishBaseSoft: string;
  fishCover: string;
  fishCoverSoft: string;
  assumption: string;
  assumptionSoft: string;
  hatch: string;
  excludedSoft: string;
  groupA: string;
  groupB: string;
};

export type BoardTheme = {
  colors: BoardColors;
  marks: {
    selectionWidth: number;
    candidateRadius: number;
    strikeWidth: number;
    strikeAngle: `${number}deg`;
    hatchOpacity: number;
    contextOpacity: number;
  };
};

/** Shade boxes 2, 4, 6 and 8; adjacent boxes differ along both axes. */
export function boardCellSurface(colors: BoardColors, cell: number): string {
  const box = Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3);
  return box % 2 === 1 ? colors.alternateBoxSurface : colors.surface;
}
