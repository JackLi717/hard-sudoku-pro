import type { AppPalette } from '../theme';

/** Visual tokens only. Technique rules and board state do not belong here. */
export type BoardColors = AppPalette & {
  alternateBoxSurface: string;
  fishFin: string;
  fishFinSoft: string;
  fishBase: string;
  fishBaseSoft: string;
  fishCover: string;
  fishCoverSoft: string;
  assumption: string;
  assumptionSoft: string;
  hatch: string;
  excludedSoft: string;
  groupASoft: string;
  groupBSoft: string;
  group2ASoft: string;
  group2BSoft: string;
  group3ASoft: string;
  group3BSoft: string;
  group4ASoft: string;
  group4BSoft: string;
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
