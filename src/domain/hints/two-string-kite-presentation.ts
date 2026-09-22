import type {
  CandidateGrid,
  CandidateRef,
  RegionRef,
} from '../sudoku/contracts';
import type { HintStep } from './contracts';
import type {
  ReasoningCandidateMark,
  ReasoningConflict,
} from '../reasoning/contracts';
import type {
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
  conflictTitle: string;
  conflictBody: string;
  conclusionTitle: string;
  conclusionBody: string;
};

export const ENGLISH_KITE_COPY: TwoStringKiteCopy = {
  overviewTitle: 'Find the row and column strong links',
  overviewBody:
    'For {digit}, {rowRegion} has the strong link {rowEnd}–{rowBase}, and {columnRegion} has the strong link {columnEnd}–{columnBase}. The inner ends {rowBase} and {columnBase} share {boxRegion}, connecting the two links. The outlined cell is the target.',
  assumeTitle: 'Try an assumption',
  assumeBody: 'Assume {target} is {digit} (? means temporary).',
  excludeBody: '{end} shares {region} with {target}, so it cannot be {digit}.',
  conflictTitle: 'This creates a conflict',
  conflictBody:
    'With {rowEnd} and {columnEnd} both ruled out, row {row} forces {rowBase} to be {digit}, while column {column} forces {columnBase} to be {digit}. But {rowBase} and {columnBase} share box {box}. A box cannot contain two {digit}s.',
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
    rowRegion: fill(copy.regionRow, { index: row + 1 }),
    columnRegion: fill(copy.regionColumn, { index: column + 1 }),
    boxRegion: fill(copy.regionBox, { index: box + 1 }),
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
    reasoningCandidates: readonly ReasoningCandidateMark[] = [],
    links: readonly HintLinkMark[] = [],
    questionCells: readonly number[] = [],
    reasoningConflicts: readonly ReasoningConflict[] = [],
  ) => {
    const excludedCells = new Set(
      [...excluded, ...reasoningCandidates].map(c => c.cell),
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
      reasoningCandidates,
      reasoningConflicts,
      diagramRegions: reasoningConflicts.flatMap(conflict =>
        conflict.region ? [{ region: conflict.region, conflict: true }] : [],
      ),
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
    const assumption: ReasoningCandidateMark = {
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
    const forcedRow: ReasoningCandidateMark = {
      ...ref(rowBase),
      role: 'consequence',
    };
    add(
      'reason',
      text.conflictTitle,
      fill(text.conflictBody, p),
      [rowRegion, columnRegion, boxRegion],
      endpoints.map(ref),
      [assumption, forcedRow, { ...ref(columnBase), role: 'consequence' }],
      emphasize([rowLink, columnLink, boxLink]),
      [],
      [
        {
          kind: 'peer_values',
          cells: [rowBase, columnBase],
          digit,
          region: boxRegion,
          evidence: [rowBase, columnBase].map(cell => ({
            ...ref(cell),
            truth: 'true' as const,
          })),
        },
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
    step.eliminations,
    [],
    emphasize(completeLinks),
  );
  return pages;
}
