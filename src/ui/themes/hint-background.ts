import type {
  HintCellRole,
  HintRegionMark,
} from '../../domain/hints/presentation';
import type { BoardColors } from './board-theme';

/** One semantic background policy for normal notes and single-digit diagrams. */
export function hintBackground(
  colors: BoardColors,
  context: {
    baseSurface?: string;
    regions: readonly HintRegionMark[];
    cellRole: HintCellRole | null;
    focused: boolean;
    conflict: boolean;
  },
): string {
  if (context.conflict) return colors.errorSoft;
  if (context.cellRole === 'result') return colors.hintResult;
  if (context.cellRole === 'established') return colors.hintEstablished;
  // At intersections, retain the base fill; the legend identifies both line sets.
  if (context.regions.some(mark => mark.role === 'fishBase'))
    return colors.fishBaseSoft;
  if (context.regions.some(mark => mark.role === 'fishCover'))
    return colors.fishCoverSoft;
  if (
    context.regions.length ||
    context.focused ||
    context.cellRole === 'potential'
  )
    return colors.hintRegion;
  return context.baseSurface ?? colors.surface;
}
