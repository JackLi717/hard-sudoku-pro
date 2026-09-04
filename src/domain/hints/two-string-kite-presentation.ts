import type {
  CandidateGrid,
  CandidateRef,
  RegionRef,
} from '../sudoku/contracts';
import type { HintStep } from './contracts';
import type {
  HintHypotheticalValue,
  HintLinkMark,
  HintPageVisuals,
  HintPresentationCopy,
  HintPresentationPage,
} from './presentation';
import { sharedKiteRegion, twoStringKiteProof } from './two-string-kite-proof';

export type TwoStringKiteCopy = {
  overviewTitle: string;
  overviewBody: string;
  rowTitle: string;
  rowBody: string;
  columnTitle: string;
  columnBody: string;
  assumeTitle: string;
  assumeBody: string;
  excludeTitle: string;
  excludeBody: string;
  forceTitle: string;
  forceBody: string;
  conflictTitle: string;
  conflictBody: string;
  conclusionTitle: string;
  conclusionBody: string;
};

export const ENGLISH_KITE_COPY: TwoStringKiteCopy = {
  overviewTitle: 'See the whole kite first',
  overviewBody:
    'Follow the highlighted candidates for {digit}. The two solid lines connect pairs in a row and a column; the two inner candidates share a box. The outlined cell is the one we will check.',
  rowTitle: 'Two places in this row',
  rowBody:
    'In row {row}, {digit} can only go in {rowEnd} or {rowBase}. One of them must be {digit}. Other candidates in these cells do not matter here.',
  columnTitle: 'Two places in this column',
  columnBody:
    'In column {column}, {digit} can only go in {columnEnd} or {columnBase}. One of them must be {digit}.',
  assumeTitle: 'Try an assumption',
  assumeBody:
    'What if {target} were {digit}? Numbers marked ? are part of this assumption, not confirmed answers.',
  excludeTitle: 'Under this assumption',
  excludeBody:
    '{end} shares {region} with {target}, so it cannot also be {digit}.',
  forceTitle: 'One place left in the row',
  forceBody:
    '{rowEnd} cannot be {digit}, so row {row} has only {rowBase} left. Under this assumption, {rowBase} must be {digit}.',
  conflictTitle: 'This creates a conflict',
  conflictBody:
    '{columnEnd} cannot be {digit}, so column {column} forces {columnBase} to be {digit}. But {rowBase} and {columnBase} share box {box}. A box cannot contain two {digit}s.',
  conclusionTitle: 'Why we can remove it',
  conclusionBody:
    'The assumption creates two {digit}s in one box, so it cannot be right. Remove {digit} from {targets}.',
};

const cellName = (cell: number) =>
  `R${Math.floor(cell / 9) + 1}C${(cell % 9) + 1}`;
const fill = (text: string, params: Record<string, string | number>) =>
  text.replace(/\{([a-zA-Z]+)\}/g, (_, key: string) =>
    String(params[key] ?? ''),
  );

export function buildTwoStringKitePages(
  step: HintStep,
  copy: HintPresentationCopy,
  candidates?: CandidateGrid | null,
): readonly HintPresentationPage[] | null {
  const proof = twoStringKiteProof(step, candidates);
  if (!proof) return null;
  const { digit, row, column, box, rowBase, rowEnd, columnBase, columnEnd } =
    proof;
  const rowRegion: RegionRef = { kind: 'row', index: row };
  const columnRegion: RegionRef = { kind: 'column', index: column };
  const boxRegion: RegionRef = { kind: 'box', index: box };
  const ref = (cell: number): CandidateRef => ({ cell, digit });
  const params = {
    digit,
    row: row + 1,
    column: column + 1,
    box: box + 1,
    rowBase: cellName(rowBase),
    rowEnd: cellName(rowEnd),
    columnBase: cellName(columnBase),
    columnEnd: cellName(columnEnd),
  };
  const targets = [...new Set(step.eliminations.map(c => c.cell))];
  const patternCells = [...new Set([rowBase, rowEnd, columnBase, columnEnd])];
  const contextCells = [...patternCells, ...targets];
  const baseLinks: readonly HintLinkMark[] = [
    { from: rowEnd, to: rowBase, kind: 'pair', extendFrom: true },
    { from: columnEnd, to: columnBase, kind: 'pair', extendFrom: true },
    { from: rowBase, to: columnBase, kind: 'peer' },
    ...targets.flatMap(target =>
      [...new Set([rowEnd, columnEnd])].map(end => ({
        from: target,
        to: end,
        kind: 'target' as const,
      })),
    ),
  ];
  // Match the original hint backdrop: show the full rows, columns and boxes
  // containing the pattern, rather than narrow corridors around its links.
  // Keep this same context for every page of the causal explanation.
  const rows = new Set(patternCells.map(cell => Math.floor(cell / 9)));
  const columns = new Set(patternCells.map(cell => cell % 9));
  const boxes = new Set(
    patternCells.map(
      cell => Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3),
    ),
  );
  const spotlight = new Set(contextCells);
  for (let cell = 0; cell < 81; cell++) {
    if (
      rows.has(Math.floor(cell / 9)) ||
      columns.has(cell % 9) ||
      boxes.has(Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3))
    )
      spotlight.add(cell);
  }
  const text = copy.twoStringKite;
  const pages: HintPresentationPage[] = [];
  const add = (
    kind: HintPresentationPage['kind'],
    title: string,
    body: string,
    regions: readonly RegionRef[],
    potential: readonly CandidateRef[],
    excluded: readonly CandidateRef[] = [],
    hypotheticalValues: readonly HintHypotheticalValue[] = [],
  ) => {
    const excludedCells = new Set(
      [...excluded, ...hypotheticalValues].map(c => c.cell),
    );
    const visiblePremises = patternCells
      .filter(cell => !excludedCells.has(cell))
      .map(ref);
    const activeCells = new Set(potential.map(c => c.cell));
    const visuals: HintPageVisuals = {
      spotlightCells: [...spotlight],
      questionCells: targets,
      links: baseLinks.map(link => ({
        ...link,
        active:
          (link.kind === 'pair' &&
            regions.some(region =>
              region.kind === 'row'
                ? Math.floor(link.from / 9) === region.index &&
                  Math.floor(link.to / 9) === region.index
                : region.kind === 'column' &&
                  link.from % 9 === region.index &&
                  link.to % 9 === region.index,
            )) ||
          (activeCells.has(link.from) && activeCells.has(link.to)) ||
          (link.kind === 'target' && excluded.length > 0 && kind !== 'apply') ||
          (link.kind === 'peer' && hypotheticalValues.some(c => c.conflict)),
      })),
      focusDigits: [digit],
      showFocusCells: true,
      showFocusRegions: false,
      showPremises: visiblePremises.length > 0,
      showEliminations: excluded.length > 0,
      showPlacements: false,
      focusCells: contextCells,
      focusRegions: [],
      premiseCandidates: visiblePremises,
      eliminations: excluded,
      placements: [],
      valueEvidence: [],
      regionMarks: [],
      cellMarks: [
        ...visiblePremises.map(c => ({
          cell: c.cell,
          role: 'potential' as const,
        })),
        ...excluded.map(c => ({
          cell: c.cell,
          role: 'eliminationTarget' as const,
        })),
      ],
      candidateMarks: [
        ...visiblePremises.map(c => ({ ...c, role: 'potential' as const })),
        ...excluded.map(c => ({
          ...c,
          role: 'excluded' as const,
          exclusionKind:
            kind === 'apply' ? ('result' as const) : ('explanation' as const),
        })),
      ],
      hypotheticalValues,
    };
    pages.push({ kind, title, body, accessibilitySummary: body, visuals });
  };
  add(
    'observe',
    text.overviewTitle,
    fill(text.overviewBody, params),
    [],
    patternCells.map(ref),
  );
  add(
    'observe',
    text.rowTitle,
    fill(text.rowBody, params),
    [rowRegion],
    [ref(rowEnd), ref(rowBase)],
  );
  add(
    'observe',
    text.columnTitle,
    fill(text.columnBody, params),
    [columnRegion],
    [ref(columnEnd), ref(columnBase)],
  );
  for (const target of targets) {
    const p = { ...params, target: cellName(target) };
    const assumption: HintHypotheticalValue = {
      ...ref(target),
      role: 'assumption',
    };
    const endpoints = [...new Set([rowEnd, columnEnd])];
    const peerRegions = endpoints.map(end => sharedKiteRegion(end, target));
    add(
      'reason',
      text.assumeTitle,
      fill(text.assumeBody, p),
      [],
      [],
      [],
      [assumption],
    );
    add(
      'reason',
      text.excludeTitle,
      endpoints
        .map((end, index) => {
          const region = peerRegions[index];
          return fill(text.excludeBody, {
            ...p,
            end: cellName(end),
            region: fill(
              region.kind === 'row'
                ? copy.regionRow
                : region.kind === 'column'
                ? copy.regionColumn
                : copy.regionBox,
              { index: region.index + 1 },
            ),
          });
        })
        .join(' '),
      peerRegions,
      [],
      endpoints.map(ref),
      [assumption],
    );
    const forcedRow: HintHypotheticalValue = {
      ...ref(rowBase),
      role: 'consequence',
    };
    add(
      'reason',
      text.forceTitle,
      fill(text.forceBody, p),
      [rowRegion],
      [],
      endpoints.map(ref),
      [assumption, forcedRow],
    );
    add(
      'reason',
      text.conflictTitle,
      fill(text.conflictBody, p),
      [columnRegion, boxRegion],
      [],
      endpoints.map(ref),
      [
        assumption,
        { ...forcedRow, conflict: true },
        { ...ref(columnBase), role: 'consequence', conflict: true },
      ],
    );
  }
  add(
    'apply',
    text.conclusionTitle,
    fill(text.conclusionBody, {
      ...params,
      targets: targets.map(cellName).join(copy.candidateSeparator),
    }),
    [boxRegion],
    [ref(rowBase), ref(columnBase)],
    step.eliminations,
  );
  return pages;
}
