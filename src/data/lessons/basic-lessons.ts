import catalog from './generated/basic-lessons.json';
import type { BasicCourse } from '../../localization/basic-lesson-copy';

export type BasicRegion = { kind: 'row' | 'column' | 'box'; index: number };
export type BasicScene = {
  values: number[];
  givens: number[];
  selected: number | null;
  notes: Record<number, number[]>;
  regions: BasicRegion[];
  evidence: number[];
  excluded: number[];
  struckNotes: number[];
  digit?: number;
  pointer?: string;
  pencil: boolean;
};
export const BASIC_FRAME_COUNTS = [4, 6, 10, 3];
export const basicParams = (course: BasicCourse): Record<string, number> => {
  const data = catalog.certainty;
  return course === 'certainty'
    ? {
        a: data.candidates[0],
        b: data.candidates[1],
        digit: data.digit,
        remaining: data.remaining,
      }
    : { digit: catalog.scanning.digit };
};
export function regionCells({ kind, index }: BasicRegion): number[] {
  return Array.from({ length: 9 }, (_, n) =>
    kind === 'row'
      ? index * 9 + n
      : kind === 'column'
      ? n * 9 + index
      : (Math.floor(index / 3) * 3 + Math.floor(n / 3)) * 9 +
        (index % 3) * 3 +
        (n % 3),
  );
}
function cellRegions(cell: number): BasicRegion[] {
  return [
    { kind: 'row', index: Math.floor(cell / 9) },
    { kind: 'column', index: cell % 9 },
    {
      kind: 'box',
      index: Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3),
    },
  ];
}
export function basicScene(
  course: BasicCourse,
  page: number,
  frame = 0,
  tapped = false,
): BasicScene {
  const data =
    course === 'how-to-play'
      ? catalog.operations
      : course === 'certainty'
      ? catalog.certainty
      : catalog.scanning;
  const scene: BasicScene = {
    values: [...data.board],
    givens: data.board,
    selected: null,
    notes: {},
    regions: [],
    evidence: [],
    excluded: [],
    struckNotes: [],
    pencil: false,
  };
  if (course === 'how-to-play') {
    const op = catalog.operations;
    if (page === 0) {
      scene.values = op.solution;
      scene.givens = op.solution;
      const regions: BasicRegion[] = [
        { kind: 'row', index: 1 },
        { kind: 'column', index: 4 },
        { kind: 'box', index: 8 },
      ];
      scene.regions = frame < 3 ? [regions[frame]] : regions;
    } else if (page === 1) {
      if (frame === 0) scene.values = Array(81).fill(0);
      if (frame >= 3 || (frame === 2 && tapped)) scene.selected = op.fill;
      if (frame === 2) scene.pointer = `cell-${op.fill}`;
      if (frame === 4) scene.pointer = 'digit-6';
      if (frame >= 5 || (frame === 4 && tapped)) scene.values[op.fill] = 6;
    } else if (page === 2) {
      scene.values[op.fill] = 6;
      scene.selected = frame > 0 || tapped ? op.notes : null;
      scene.pencil = frame >= 2 || (frame === 1 && tapped);
      if (frame === 0) scene.pointer = `cell-${op.notes}`;
      if (frame === 1) scene.pointer = 'pencil';
      if (frame >= 3 && frame <= 8 && frame % 2 === 1)
        scene.pointer = `digit-${[1, 2, 7][Math.floor((frame - 3) / 2)]}`;
      scene.notes[op.notes] = [1, 2, 7].slice(
        0,
        Math.max(
          0,
          Math.min(
            3,
            Math.floor((frame - 2) / 2) + (frame % 2 === 1 && tapped ? 1 : 0),
          ),
        ),
      );
    } else if (frame === 1) scene.pointer = 'hint';
  } else if (course === 'certainty') {
    const c = catalog.certainty;
    scene.selected = page === 2 ? c.source : c.target;
    scene.regions = cellRegions(scene.selected);
    if (page >= 1 && page < 4) scene.notes[c.target] = c.candidates;
    if (page >= 3) {
      scene.values[c.source] = c.digit;
      scene.evidence = [c.source];
      scene.struckNotes = [c.digit];
    }
    if (page === 4) scene.values[c.target] = c.remaining;
  } else {
    const s = catalog.scanning;
    scene.digit = s.digit;
    if (page >= 1) {
      const step = page >= 3 ? s.second : s.first;
      scene.regions = [{ kind: 'box', index: step.box }];
      scene.selected = step.cell;
      scene.evidence = step.evidence;
      if (page < 4) scene.excluded = step.excluded;
    }
    if (page >= 2) scene.values[s.first.cell] = s.digit;
    if (page >= 3) scene.values[s.second.cell] = s.digit;
    if (page === 4) scene.regions = [];
  }
  return scene;
}
