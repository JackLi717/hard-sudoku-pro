import { candidateMaskFor, digitsFromMask } from '../sudoku/board';
import type {
  CandidateGrid,
  CandidateRef,
  Digit,
  RegionRef,
} from '../sudoku/contracts';
import type { HintStep } from './contracts';
import type {
  HintPageVisuals,
  HintPresentationCopy,
  HintPresentationPage,
} from './presentation';

const DIGITS = digitsFromMask(511);
const cellName = (cell: number) =>
  `R${Math.floor(cell / 9) + 1}C${(cell % 9) + 1}`;
const boxOf = (cell: number) =>
  Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3);
const interpolate = (text: string, params: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ''));

type RegionEvidence = {
  region: RegionRef;
  cells: number[];
  values: CandidateRef[];
};

/** Called after the shared teaching builder has validated the board and candidate snapshot. */
export function buildNakedSinglePages(
  step: HintStep,
  copy: HintPresentationCopy,
  grid: CandidateGrid,
): readonly HintPresentationPage[] | null {
  const target = step.placements[0];
  if (
    !target ||
    step.placements.length !== 1 ||
    step.eliminations.length ||
    grid[target.cell] !== candidateMaskFor(target.digit)
  )
    return null;

  const groups: RegionEvidence[] = (['row', 'column', 'box'] as const).map(
    kind => {
      const regionOf =
        kind === 'row'
          ? (cell: number) => Math.floor(cell / 9)
          : kind === 'column'
          ? (cell: number) => cell % 9
          : boxOf;
      const region = { kind, index: regionOf(target.cell) };
      const cells = Array.from({ length: 81 }, (_, cell) => cell).filter(
        cell => regionOf(cell) === region.index,
      );
      return {
        region,
        cells,
        values: cells.flatMap(cell => {
          const value = Number(step.boardFingerprint[cell]);
          return value ? [{ cell, digit: value as Digit }] : [];
        }),
      };
    },
  );
  const blocked = new Set(
    groups.flatMap(group => group.values.map(value => value.digit)),
  );
  if (blocked.has(target.digit)) return null;

  let remaining = [...DIGITS];
  const pages: HintPresentationPage[] = [];
  const baseVisuals = (): HintPageVisuals => ({
    showFocusCells: true,
    showFocusRegions: false,
    showPremises: false,
    showEliminations: false,
    showPlacements: false,
    focusCells: [target.cell],
    spotlightCells: [target.cell],
    focusRegions: [],
    premiseCandidates: [],
    candidateMarks: [],
    valueEvidence: [],
    eliminations: [],
    placements: [],
  });
  const add = (
    rule: 'singleRegion' | 'singleDirect' | 'singleEarlier',
    params: Record<string, string | number>,
    removed: Digit[],
    visuals: HintPageVisuals,
    title: string,
  ) => {
    remaining = remaining.filter(digit => !removed.includes(digit));
    params = {
      ...params,
      cells: cellName(target.cell),
      removed: removed.join(', '),
      remaining: remaining.join(', '),
    };
    const body = interpolate(copy.teaching[rule], params);
    pages.push({
      kind: pages.length ? 'reason' : 'observe',
      title,
      body,
      accessibilitySummary: `${cellName(target.cell)}. ${body} ${interpolate(
        copy.teaching.singleCheckSummary,
        params,
      )}`,
      teaching: { rule, params },
      visuals,
    });
  };
  const removed = DIGITS.filter(digit => blocked.has(digit));
  const values = groups.flatMap(group => group.values);
  // One real witness per digit; overlapping regions never count twice.
  const evidence = removed.map(
    digit => values.find(value => value.digit === digit)!,
  );
  add(
    removed.length === 8 ? 'singleDirect' : 'singleRegion',
    {},
    removed,
    {
      ...baseVisuals(),
      showFocusRegions: true,
      focusRegions: groups.map(group => group.region),
      regionMarks: groups.map(group => ({
        region: group.region,
        role: 'source',
      })),
      spotlightCells: [...new Set(groups.flatMap(group => group.cells))],
      questionCells: [target.cell],
      selectedQuestionCell: target.cell,
      valueEvidence: evidence,
    },
    copy.teaching.singleRegionTitle,
  );
  if (remaining.length > 1) {
    // Direct peer checks cannot explain these absences. Preserve the accepted
    // hint snapshot's earlier exclusions without inventing a blocking value.
    add(
      'singleEarlier',
      {},
      remaining.filter(digit => digit !== target.digit),
      baseVisuals(),
      copy.titleReason,
    );
  }
  if (remaining.length !== 1 || remaining[0] !== target.digit) return null;
  const body = interpolate(copy.teaching.singleConclusion, {
    cells: cellName(target.cell),
    digits: target.digit,
  });
  pages.push({
    kind: 'apply',
    title: copy.titleConclusion,
    body,
    accessibilitySummary: body,
    teaching: {
      rule: 'singleConclusion',
      params: { cells: cellName(target.cell), digits: target.digit },
    },
    visuals: {
      ...baseVisuals(),
      showPlacements: true,
      placements: step.placements,
      candidateMarks: [{ ...target, role: 'result' }],
      cellMarks: [{ cell: target.cell, role: 'result' }],
    },
  });
  return pages;
}
