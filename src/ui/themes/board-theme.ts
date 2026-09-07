import type { AppPalette } from '../theme';

/** Visual tokens only. Technique rules and board state do not belong here. */
export type BoardColors = AppPalette & {
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
