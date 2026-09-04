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
import {
  inTurbotRegion,
  turbotFishProof,
  turbotRegions,
} from './turbot-fish-proof';

export type TurbotFishCopy = {
  overviewTitle: string;
  overviewBody: string;
  pairTitle: string;
  pairBody: string;
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
export const ENGLISH_TURBOT_COPY: TurbotFishCopy = {
  overviewTitle: 'See the four linked candidates',
  overviewBody:
    'Follow the four circles for {digit}. We will check whether the outlined cell can be {digit}.',
  pairTitle: 'Two places in {region}',
  pairBody:
    'In {region}, {digit} can only go in {end} or {inner}. One of them must be {digit}.',
  assumeTitle: 'Try an assumption',
  assumeBody:
    'What if {target} were {digit}? Numbers marked ? are part of this assumption, not confirmed answers.',
  excludeTitle: 'These two candidates are ruled out',
  excludeBody:
    '{end} shares {region} with {target}, so it cannot also be {digit}.',
  forceTitle: 'Only one place left',
  forceBody:
    '{end} cannot be {digit}, so {region} has only {inner} left. Under this assumption, it must be {digit}.',
  conflictTitle: 'Two identical digits in one region',
  conflictBody:
    '{end} cannot be {digit}, so {region} forces {inner} to be {digit}. But {firstInner} and {inner} share {conflictRegion}: that would put {digit} there twice!',
  conclusionTitle: 'The assumption cannot be right',
  conclusionBody:
    'The assumption repeats {digit} in {conflictRegion}. Remove the candidate {digit} from {targets}; all the hypothetical numbers are withdrawn.',
};
const cellName = (cell: number) =>
  `R${Math.floor(cell / 9) + 1}C${(cell % 9) + 1}`;
const fill = (text: string, params: Record<string, string | number>) =>
  text.replace(/\{([a-zA-Z]+)\}/g, (_, key: string) =>
    String(params[key] ?? ''),
  );

export function buildTurbotFishPages(
  step: HintStep,
  copy: HintPresentationCopy,
  candidates?: CandidateGrid | null,
): readonly HintPresentationPage[] | null {
  const proof = turbotFishProof(step, candidates);
  if (!proof) return null;
  const {
    digit,
    firstEnd,
    firstInner,
    secondInner,
    secondEnd,
    firstRegion,
    secondRegion,
    conflictRegion,
  } = proof;
  const text = copy.turbotFish;
  const name = (r: RegionRef) =>
    fill(
      r.kind === 'row'
        ? copy.regionRow
        : r.kind === 'column'
        ? copy.regionColumn
        : copy.regionBox,
      { index: r.index + 1 },
    );
  const ref = (cell: number): CandidateRef => ({ cell, digit });
  const pattern = [firstEnd, firstInner, secondInner, secondEnd];
  const targets = [...new Set(step.eliminations.map(c => c.cell))];
  const context = [...pattern, ...targets];
  const houses = pattern.flatMap(turbotRegions);
  const spotlight = Array.from({ length: 81 }, (_, cell) => cell).filter(
    cell => context.includes(cell) || houses.some(r => inTurbotRegion(cell, r)),
  );
  const links: HintLinkMark[] = [
    { from: firstEnd, to: firstInner, kind: 'pair' },
    { from: secondEnd, to: secondInner, kind: 'pair' },
    { from: firstInner, to: secondInner, kind: 'peer' },
    ...targets.flatMap(target =>
      [firstEnd, secondEnd].map(end => ({
        from: target,
        to: end,
        kind: 'target' as const,
      })),
    ),
  ];
  const pages: HintPresentationPage[] = [];
  const params = {
    digit,
    firstInner: cellName(firstInner),
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
  ) {
    const hidden = new Set([...excluded, ...hypotheticals].map(c => c.cell));
    const premises = pattern.filter(c => !hidden.has(c)).map(ref);
    const visuals: HintPageVisuals = {
      diagramDigit: digit,
      spotlightCells: spotlight,
      questionCells: targets,
      links: links.map(link => ({
        ...link,
        active:
          link.kind === 'pair' ||
          (link.kind === 'target' && excluded.length > 0 && kind !== 'apply') ||
          (link.kind === 'peer' && conflict),
        conflict: link.kind === 'peer' && conflict,
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
  add('observe', text.overviewTitle, fill(text.overviewBody, params));
  for (const [end, inner, region] of [
    [firstEnd, firstInner, firstRegion],
    [secondEnd, secondInner, secondRegion],
  ] as const) {
    const p = {
      ...params,
      end: cellName(end),
      inner: cellName(inner),
      region: name(region),
    };
    add('observe', fill(text.pairTitle, p), fill(text.pairBody, p), [region]);
  }
  for (const target of targets) {
    const p = { ...params, target: cellName(target) };
    const assumption: HintHypotheticalValue = {
      ...ref(target),
      role: 'assumption',
    };
    add(
      'reason',
      text.assumeTitle,
      fill(text.assumeBody, p),
      [],
      [],
      [assumption],
    );
    const peerRegions = [firstEnd, secondEnd].map(
      end => turbotRegions(end).find(r => inTurbotRegion(target, r))!,
    );
    add(
      'reason',
      text.excludeTitle,
      [firstEnd, secondEnd]
        .map((end, i) =>
          fill(text.excludeBody, {
            ...p,
            end: cellName(end),
            region: name(peerRegions[i]),
          }),
        )
        .join(' '),
      peerRegions,
      [ref(firstEnd), ref(secondEnd)],
      [assumption],
    );
    const forced: HintHypotheticalValue = {
      ...ref(firstInner),
      role: 'consequence',
    };
    add(
      'reason',
      text.forceTitle,
      fill(text.forceBody, {
        ...p,
        end: cellName(firstEnd),
        inner: cellName(firstInner),
        region: name(firstRegion),
      }),
      [firstRegion],
      [ref(firstEnd), ref(secondEnd)],
      [assumption, forced],
    );
    add(
      'reason',
      text.conflictTitle,
      fill(text.conflictBody, {
        ...p,
        end: cellName(secondEnd),
        inner: cellName(secondInner),
        region: name(secondRegion),
      }),
      [conflictRegion],
      [ref(firstEnd), ref(secondEnd)],
      [
        assumption,
        { ...forced, conflict: true, conflictRegion: name(conflictRegion) },
        {
          ...ref(secondInner),
          role: 'consequence',
          conflict: true,
          conflictRegion: name(conflictRegion),
        },
      ],
      true,
    );
  }
  add(
    'apply',
    text.conclusionTitle,
    fill(text.conclusionBody, {
      ...params,
      targets: targets.map(cellName).join(copy.candidateSeparator),
    }),
    [],
    step.eliminations,
  );
  return pages;
}
