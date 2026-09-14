import { CellIndex, Digit } from '../sudoku/contracts';

/** Stable palette IDs are saved; theme-specific colors stay in the UI. */
export type ColorId = 0 | 1 | 2 | 3 | 4 | 5;
export type MarkerShape = 'circle' | 'triangle' | 'square';
export type BorderStyle = 'solid' | 'dashed';
export type LineStyle = 'solid' | 'dashed';

export type AnnotationAnchor =
  | { type: 'cell'; cell: CellIndex }
  | { type: 'candidate'; cell: CellIndex; digit: Digit };

export type Annotation =
  | {
      type: 'cell';
      cell: CellIndex;
      color?: ColorId;
      marker?: MarkerShape;
      borderStyle?: BorderStyle;
    }
  | {
      type: 'candidate';
      cell: CellIndex;
      digit: Digit;
      color?: ColorId;
      marker?: MarkerShape;
    }
  | {
      type: 'relation';
      id: string;
      from: AnnotationAnchor;
      to: AnnotationAnchor;
      relationType?: 'strong' | 'weak' | 'custom';
      color?: ColorId;
      lineStyle?: LineStyle;
    };

export type AnnotationCollection = readonly Annotation[];

export function cloneAnnotations(
  annotations: AnnotationCollection,
): AnnotationCollection {
  return annotations.map(annotation =>
    annotation.type === 'relation'
      ? {
          ...annotation,
          from: { ...annotation.from },
          to: { ...annotation.to },
        }
      : { ...annotation },
  );
}

/** Coloring changes only the color facet of cell annotations. */
export function colorCells(
  annotations: AnnotationCollection,
  cells: readonly CellIndex[],
  color: ColorId,
): AnnotationCollection {
  if (!cells.length) return annotations;
  const result = [...annotations];
  let changed = false;
  for (const cell of new Set(cells)) {
    const index = result.findIndex(
      annotation => annotation.type === 'cell' && annotation.cell === cell,
    );
    if (index < 0) {
      result.push({ type: 'cell', cell, color });
      changed = true;
    } else {
      const existing = result[index];
      if (existing.type === 'cell' && existing.color !== color) {
        result[index] = { ...existing, color };
        changed = true;
      }
    }
  }
  return changed ? result : annotations;
}

/** A single-cell tap toggles only its color, retaining other annotation facets. */
export function toggleCellColor(
  annotations: AnnotationCollection,
  cell: CellIndex,
  color: ColorId,
): AnnotationCollection {
  if (cellColor(annotations, cell) !== color) {
    return colorCells(annotations, [cell], color);
  }
  return annotations.flatMap(annotation => {
    if (annotation.type !== 'cell' || annotation.cell !== cell)
      return [annotation];
    const rest = { ...annotation };
    delete rest.color;
    return rest.marker || rest.borderStyle ? [rest] : [];
  });
}

/** Clear All removes cell colors without deleting future marker facets. */
export function clearCellColors(
  annotations: AnnotationCollection,
): AnnotationCollection {
  let changed = false;
  const result = annotations.flatMap(annotation => {
    if (annotation.type !== 'cell' || annotation.color === undefined)
      return [annotation];
    changed = true;
    const rest = { ...annotation };
    delete rest.color;
    return rest.marker || rest.borderStyle ? [rest] : [];
  });
  return changed ? result : annotations;
}

export function cellColor(
  annotations: AnnotationCollection | undefined,
  cell: CellIndex,
): ColorId | null {
  const annotation = annotations?.find(
    entry => entry.type === 'cell' && entry.cell === cell,
  );
  return annotation?.type === 'cell' ? annotation.color ?? null : null;
}
