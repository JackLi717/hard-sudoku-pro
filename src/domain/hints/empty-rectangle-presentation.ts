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
import { emptyRectangleProofs } from './empty-rectangle-proof';
import { inTurbotRegion, turbotRegions } from './turbot-fish-proof';

export type EmptyRectangleCopy = {
  overviewTitle: string;
  overviewBody: string;
  emptyTitle: string;
  emptyBody: string;
  drainTitle: string;
  drainBody: string;
  conflictTitle: string;
  singleConflictBody: string;
  groupConflictBody: string;
  conclusionTitle: string;
  conclusionBody: string;
};
export const ENGLISH_EMPTY_RECTANGLE_COPY: EmptyRectangleCopy = {
  overviewTitle: 'See the candidates inside the box',
  overviewBody:
    'In {box}, the candidates for {digit} are all on {row} and {column}. Follow the circles inside the outlined box.',
  emptyTitle: 'Recognize the empty rectangle',
  emptyBody:
    'Within a box, all candidates for a digit lie on one row and one column. The four cells outside that row and column contain no candidate for that digit and form the empty rectangle. Here, the hatched cells contain no candidate {digit}.',
  drainTitle: 'One side of the box is ruled out',
  drainBody:
    'Under our assumption, {near} is {digit}. It shares {toBox} with {drained}, so those candidates are ruled out. This side of {box} has no {digit} left.',
  conflictTitle: 'The assumption creates a conflict',
  singleConflictBody:
    '{box} still needs a {digit}, and only {remaining} is left. It must be {digit}, but it shares {conflictRegion} with our assumed {target}: that would put {digit} there twice!',
  groupConflictBody:
    '{box} still needs a {digit} in {remaining}. But all these cells share {conflictRegion} with our assumed {target}, so none can be {digit}. The box has nowhere left for {digit}!',
  conclusionTitle: 'The original assumption cannot be right',
  conclusionBody:
    'Assuming {targets} contains {digit} leads to a contradiction. Remove that candidate; all hypothetical numbers are withdrawn.',
};
const cellName = (cell: number) =>
  `R${Math.floor(cell / 9) + 1}C${(cell % 9) + 1}`;
const fill = (text: string, params: Record<string, string | number>) =>
  text.replace(/\{([a-zA-Z]+)\}/g, (_, key: string) =>
    String(params[key] ?? ''),
  );

export function buildEmptyRectanglePages(
  step: HintStep,
  copy: HintPresentationCopy,
  candidates?: CandidateGrid | null,
): readonly HintPresentationPage[] | null {
  const proofs = emptyRectangleProofs(step, candidates);
  if (!proofs) return null;
  const text = copy.emptyRectangle;
  const common = copy.turbotFish;
  const name = (r: RegionRef) =>
    fill(
      r.kind === 'row'
        ? copy.regionRow
        : r.kind === 'column'
        ? copy.regionColumn
        : copy.regionBox,
      { index: r.index + 1 },
    );
  const pages: HintPresentationPage[] = [];
  for (const proof of proofs) {
    const {
      digit,
      box,
      row,
      column,
      boxCandidates,
      drainedArm,
      remainingArm,
      pairNear,
      pairFar,
      target,
      pairRegion,
      fromTargetRegion,
      toBoxRegion,
      conflictRegion,
      emptyCells,
    } = proof;
    const ref = (cell: number): CandidateRef => ({ cell, digit });
    const boxRegion: RegionRef = { kind: 'box', index: box };
    const pattern = [...boxCandidates, pairNear, pairFar];
    const context = [...pattern, target];
    const houses = pattern.flatMap(turbotRegions);
    const spotlight = Array.from({ length: 81 }, (_, cell) => cell).filter(
      cell =>
        context.includes(cell) || houses.some(r => inTurbotRegion(cell, r)),
    );
    const links: HintLinkMark[] = [
      { from: pairFar, to: pairNear, kind: 'pair' },
      { from: target, to: pairFar, kind: 'target' },
      ...drainedArm.map(cell => ({
        from: pairNear,
        to: cell,
        kind: 'peer' as const,
      })),
      ...remainingArm.map(cell => ({
        from: target,
        to: cell,
        kind: 'target' as const,
      })),
    ];
    const params = {
      digit,
      box: name(boxRegion),
      row: name({ kind: 'row', index: row }),
      column: name({ kind: 'column', index: column }),
      target: cellName(target),
      near: cellName(pairNear),
      toBox: name(toBoxRegion),
      drained: drainedArm.map(cellName).join(copy.candidateSeparator),
      remaining: remainingArm.map(cellName).join(copy.candidateSeparator),
      conflictRegion: name(conflictRegion),
    };
    function add(
      kind: HintPresentationPage['kind'],
      title: string,
      body: string,
      regions: readonly RegionRef[] = [],
      excluded: readonly CandidateRef[] = [],
      hypotheticals: readonly HintHypotheticalValue[] = [],
      conflict = false,
      showEmpty = false,
    ) {
      const hidden = new Set([...excluded, ...hypotheticals].map(c => c.cell));
      const premises = pattern.filter(c => !hidden.has(c)).map(ref);
      const visuals: HintPageVisuals = {
        diagramDigit: digit,
        diagramBox: box,
        diagramEmptyCells: showEmpty ? emptyCells : [],
        spotlightCells: spotlight,
        questionCells: [target],
        links: links.map(link => ({
          ...link,
          active: link.kind === 'pair' || excluded.length > 0,
          conflict:
            conflict && link.from === target && remainingArm.includes(link.to),
        })),
        focusDigits: [digit],
        focusCells: context,
        focusRegions: regions,
        showFocusCells: true,
        showFocusRegions: regions.length > 0,
        showPremises: true,
        showEliminations: excluded.length > 0,
        showPlacements: false,
        premiseCandidates: premises,
        eliminations: excluded,
        placements: [],
        valueEvidence: [],
        diagramRegions: regions.map(region => ({ region, conflict })),
        regionMarks: [],
        cellMarks: [
          ...premises.map(c => ({ cell: c.cell, role: 'potential' as const })),
          ...excluded.map(c => ({
            cell: c.cell,
            role: 'eliminationTarget' as const,
          })),
        ],
        candidateMarks: [
          ...premises.map(c => ({ ...c, role: 'potential' as const })),
          ...excluded.map(c => ({
            ...c,
            role: 'excluded' as const,
            exclusionKind:
              kind === 'apply' ? ('result' as const) : ('explanation' as const),
          })),
        ],
        hypotheticalValues: hypotheticals,
      };
      pages.push({ kind, title, body, accessibilitySummary: body, visuals });
    }
    add(
      'observe',
      text.overviewTitle,
      fill(text.overviewBody, params),
      [boxRegion],
      [],
      [],
      false,
      true,
    );
    add(
      'observe',
      text.emptyTitle,
      fill(text.emptyBody, params),
      [boxRegion],
      [],
      [],
      false,
      true,
    );
    const pairParams = {
      ...params,
      region: name(pairRegion),
      end: cellName(pairFar),
      inner: cellName(pairNear),
    };
    add(
      'observe',
      fill(common.pairTitle, pairParams),
      fill(common.pairBody, pairParams),
      [pairRegion],
    );
    const assumption: HintHypotheticalValue = {
      ...ref(target),
      role: 'assumption',
    };
    add(
      'reason',
      common.assumeTitle,
      fill(common.assumeBody, params),
      [],
      [],
      [assumption],
    );
    add(
      'reason',
      copy.titleReason,
      fill(common.excludeBody, {
        ...params,
        end: cellName(pairFar),
        region: name(fromTargetRegion),
      }),
      [fromTargetRegion],
      [ref(pairFar)],
      [assumption],
    );
    const forced: HintHypotheticalValue = {
      ...ref(pairNear),
      role: 'consequence',
    };
    add(
      'reason',
      common.forceTitle,
      fill(common.forceBody, pairParams),
      [pairRegion],
      [ref(pairFar)],
      [assumption, forced],
    );
    const excluded = [pairFar, ...drainedArm].map(ref);
    add(
      'reason',
      text.drainTitle,
      fill(text.drainBody, params),
      [toBoxRegion],
      excluded,
      [assumption, forced],
    );
    if (remainingArm.length === 1) {
      add(
        'reason',
        text.conflictTitle,
        fill(text.singleConflictBody, params),
        [conflictRegion],
        excluded,
        [
          {
            ...assumption,
            conflict: true,
            conflictRegion: name(conflictRegion),
          },
          forced,
          {
            ...ref(remainingArm[0]),
            role: 'consequence',
            conflict: true,
            conflictRegion: name(conflictRegion),
          },
        ],
        true,
      );
    } else {
      // A group is required to contain the digit, but no individual cell is forced.
      add(
        'reason',
        text.conflictTitle,
        fill(text.groupConflictBody, params),
        [boxRegion],
        [...excluded, ...remainingArm.map(ref)],
        [assumption, forced],
        true,
      );
    }
  }
  const last = pages[pages.length - 1];
  const targets = step.eliminations
    .map(c => cellName(c.cell))
    .join(copy.candidateSeparator);
  const body = fill(text.conclusionBody, { targets, digit: proofs[0].digit });
  pages.push({
    kind: 'apply',
    title: text.conclusionTitle,
    body,
    accessibilitySummary: body,
    visuals: {
      ...last.visuals,
      diagramEmptyCells: [],
      diagramRegions: [],
      focusRegions: [],
      showFocusRegions: false,
      hypotheticalValues: [],
      links: last.visuals.links?.map(link => ({
        ...link,
        conflict: false,
        active: link.kind === 'pair',
      })),
      focusCells: [
        ...new Set(
          [...step.premiseCandidates, ...step.eliminations].map(c => c.cell),
        ),
      ],
      questionCells: step.eliminations.map(c => c.cell),
      premiseCandidates: step.premiseCandidates,
      showEliminations: true,
      eliminations: step.eliminations,
      cellMarks: [
        ...step.premiseCandidates.map(c => ({
          cell: c.cell,
          role: 'potential' as const,
        })),
        ...step.eliminations.map(c => ({
          cell: c.cell,
          role: 'eliminationTarget' as const,
        })),
      ],
      candidateMarks: [
        ...step.premiseCandidates.map(c => ({
          ...c,
          role: 'potential' as const,
        })),
        ...step.eliminations.map(c => ({
          ...c,
          role: 'excluded' as const,
          exclusionKind: 'result' as const,
        })),
      ],
    },
  });
  return pages;
}
