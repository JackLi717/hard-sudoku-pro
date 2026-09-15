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
  assumeTitle: string;
  assumeBody: string;
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
  assumeTitle: 'Try an assumption',
  assumeBody: 'Assume {target} is {digit} (? means temporary).',
  excludeBody: '{end} shares {region} with {target}, so it cannot be {digit}.',
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
  const rowLink: HintLinkMark = {
    from: rowEnd,
    to: rowBase,
    kind: 'pair',
  };
  const columnLink: HintLinkMark = {
    from: columnEnd,
    to: columnBase,
    kind: 'pair',
  };
  const boxLink: HintLinkMark = {
    from: rowBase,
    to: columnBase,
    kind: 'peer',
  };
  const targetLinks = (target: number): readonly HintLinkMark[] =>
    [...new Set([rowEnd, columnEnd])].map(end => ({
      from: target,
      to: end,
      kind: 'target' as const,
    }));
  const completeLinks: readonly HintLinkMark[] = [
    rowLink,
    columnLink,
    boxLink,
    ...targets.flatMap(target => targetLinks(target)),
  ];
  const linkKey = (link: HintLinkMark) =>
    `${link.kind}:${link.from}:${link.to}`;
  const emphasize = (
    activeLinks: readonly HintLinkMark[],
  ): readonly HintLinkMark[] => {
    const activeKeys = new Set(activeLinks.map(linkKey));
    return completeLinks.map(link => ({
      ...link,
      active: activeKeys.has(linkKey(link)),
      muted: !activeKeys.has(linkKey(link)),
    }));
  };
  const text = copy.twoStringKite;
  const pages: HintPresentationPage[] = [];
  const add = (
    kind: HintPresentationPage['kind'],
    title: string,
    body: string,
    regions: readonly RegionRef[],
    excluded: readonly CandidateRef[] = [],
    hypotheticalValues: readonly HintHypotheticalValue[] = [],
    links: readonly HintLinkMark[] = [],
    questionCells: readonly number[] = [],
  ) => {
    const excludedCells = new Set(
      [...excluded, ...hypotheticalValues].map(c => c.cell),
    );
    const visiblePremises = patternCells
      .filter(cell => !excludedCells.has(cell))
      .map(ref);
    const spotlightCells = [
      ...new Set([
        ...contextCells,
        ...Array.from({ length: 81 }, (_, cell) => cell).filter(cell =>
          regions.some(region =>
            region.kind === 'row'
              ? Math.floor(cell / 9) === region.index
              : region.kind === 'column'
              ? cell % 9 === region.index
              : Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3) ===
                region.index,
          ),
        ),
      ]),
    ];
    const visuals: HintPageVisuals = {
      spotlightCells,
      questionCells,
      links,
      focusDigits: [digit],
      showFocusCells: true,
      showFocusRegions: regions.length > 0,
      showPremises: visiblePremises.length > 0,
      showEliminations: excluded.length > 0,
      showPlacements: false,
      focusCells: contextCells,
      focusRegions: regions,
      premiseCandidates: visiblePremises,
      eliminations: excluded,
      placements: [],
      valueEvidence: [],
      regionMarks: regions.map(region => ({ region, role: 'source' as const })),
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
    [],
    [],
    emphasize(completeLinks),
    targets,
  );
  for (const target of targets) {
    const p = { ...params, target: cellName(target) };
    const assumption: HintHypotheticalValue = {
      ...ref(target),
      role: 'assumption',
    };
    const endpoints = [...new Set([rowEnd, columnEnd])];
    const linksToTarget = targetLinks(target);
    const peerRegions = endpoints.map(end => sharedKiteRegion(end, target));
    add(
      'reason',
      text.assumeTitle,
      [
        fill(text.assumeBody, p),
        ...endpoints.map((end, index) => {
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
        }),
      ].join(' '),
      peerRegions,
      endpoints.map(ref),
      [assumption],
      emphasize(linksToTarget),
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
      [ref(rowEnd)],
      [assumption, forcedRow],
      emphasize([linksToTarget[0], rowLink]),
    );
    add(
      'reason',
      text.conflictTitle,
      fill(text.conflictBody, p),
      [columnRegion, boxRegion],
      endpoints.map(ref),
      [
        assumption,
        { ...forcedRow, conflict: true },
        { ...ref(columnBase), role: 'consequence', conflict: true },
      ],
      emphasize([linksToTarget[1] ?? linksToTarget[0], columnLink, boxLink]),
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
    step.eliminations,
    [],
    emphasize(completeLinks),
  );
  return pages;
}
