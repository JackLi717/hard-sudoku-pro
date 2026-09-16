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
  skyscraperProof,
  turbotFishProof,
  turbotRegions,
} from './turbot-fish-proof';

export type TurbotFishCopy = {
  overviewTitle: string;
  overviewBody: string;
  pairTitle: string;
  pairBody: string;
  linkTitle: string;
  linkBody: string;
  assumeTitle: string;
  assumeBody: string;
  excludeTitle: string;
  excludeBody: string;
  forceTitle: string;
  forceBody: string;
  targetsTitle: string;
  targetsBody: string;
  conflictTitle: string;
  conflictBody: string;
  conclusionTitle: string;
  conclusionBody: string;
};
export type SkyscraperCopy = {
  overviewTitle: string;
  overviewBody: string;
  baseTitle: string;
  baseBody: string;
  targetTitle: string;
  targetBody: string;
  targetsTitle: string;
  targetsBody: string;
  conflictTitle: string;
  conflictBody: string;
  conclusionTitle: string;
  conclusionBody: string;
};
export const ENGLISH_SKYSCRAPER_COPY: SkyscraperCopy = {
  overviewTitle: 'Find the aligned ends and two roofs',
  overviewBody:
    '{firstInner} and {secondInner} are the aligned ends in {conflictRegion}. {firstEnd} and {secondEnd} are the two offset roofs. Each roof is strongly paired with its aligned end in {firstRegion} or {secondRegion} for {digit}.',
  baseTitle: 'The aligned ends cannot both be true',
  baseBody:
    '{firstInner} and {secondInner} share {conflictRegion}, so they cannot both be {digit}. This region may have other candidates for {digit}.',
  targetTitle: 'Assume target {target} is {digit}',
  targetBody:
    '{target} sees both roofs, {firstEnd} and {secondEnd}. Under this assumption both roofs are false.',
  targetsTitle: 'Check all targets through the same roofs',
  targetsBody:
    'Each target ({targets}) sees both roofs. Assuming any one target is {digit} makes both roofs false; the two strong links then force both aligned ends true in {conflictRegion}, a contradiction.',
  conflictTitle: 'Both aligned ends become true',
  conflictBody:
    'With both roofs false, {firstRegion} forces {firstInner} and {secondRegion} forces {secondInner} to be {digit}. The aligned ends share {conflictRegion}, creating two {digit}s there.',
  conclusionTitle: 'Remove the targets',
  conclusionBody:
    'Each target ({targets}) sees both roofs. Assuming any target is {digit} forces both aligned ends true in {conflictRegion}, a contradiction. Remove {digit} from these targets and withdraw the assumptions.',
};
export const ENGLISH_TURBOT_COPY: TurbotFishCopy = {
  overviewTitle: 'See the four linked candidates',
  overviewBody:
    'Follow the four circles for {digit}. We will check whether the outlined cell can be {digit}.',
  pairTitle: 'Two places in {region}',
  pairBody:
    'In {region}, {digit} can only go in {end} or {inner}. One of them must be {digit}.',
  linkTitle: 'Connect the two strong links',
  linkBody:
    '{firstInner} and {secondInner} see each other in {conflictRegion}. They form the weak link: they cannot both be {digit}. Together with the two strong links, this is a Turbot Fish.',
  assumeTitle: 'Try an assumption',
  assumeBody:
    'What if {target} were {digit}? Numbers marked ? are part of this assumption, not confirmed answers.',
  excludeTitle: 'These two candidates are ruled out',
  excludeBody:
    '{end} shares {region} with {target}, so it cannot also be {digit}.',
  forceTitle: 'Only one place left',
  forceBody:
    '{end} cannot be {digit}, so {region} has only {inner} left. Under this assumption, it must be {digit}.',
  targetsTitle: 'Check every target through the same chain',
  targetsBody:
    'Each target ({targets}) sees both outer ends. Assuming any one target is {digit} makes both outer ends false; the two strong links then force both inner ends true in {conflictRegion}, a contradiction.',
  conflictTitle: 'Two identical digits in one region',
  conflictBody:
    '{end} cannot be {digit}, so {region} forces {inner} to be {digit}. But {firstInner} and {inner} share {conflictRegion}: that would put {digit} there twice!',
  conclusionTitle: 'The assumption cannot be right',
  conclusionBody:
    'For each target, assuming {digit} repeats that digit in {conflictRegion}. Remove candidate {digit} from {targets}; all temporary assumptions are withdrawn.',
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
  return buildLinkedPairPages(step, copy, candidates, false);
}

export function buildSkyscraperPages(
  step: HintStep,
  copy: HintPresentationCopy,
  candidates?: CandidateGrid | null,
): readonly HintPresentationPage[] | null {
  return buildLinkedPairPages(step, copy, candidates, true);
}

function buildLinkedPairPages(
  step: HintStep,
  copy: HintPresentationCopy,
  candidates: CandidateGrid | null | undefined,
  skyscraper: boolean,
): readonly HintPresentationPage[] | null {
  const proof = skyscraper
    ? skyscraperProof(step, candidates)
    : turbotFishProof(step, candidates);
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
    firstEnd: cellName(firstEnd),
    firstInner: cellName(firstInner),
    secondInner: cellName(secondInner),
    secondEnd: cellName(secondEnd),
    firstRegion: name(firstRegion),
    secondRegion: name(secondRegion),
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
    showWeakLink = false,
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
          (link.kind === 'peer' && showWeakLink) ||
          (link.kind === 'target' &&
            hypotheticals.some(c => c.cell === link.from) &&
            excluded.some(c => c.cell === link.to) &&
            kind !== 'apply') ||
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
  const overview = skyscraper ? copy.skyscraper : text;
  add(
    'observe',
    overview.overviewTitle,
    fill(overview.overviewBody, params),
    skyscraper ? [firstRegion, secondRegion] : [],
  );
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
  if (skyscraper)
    add(
      'observe',
      copy.skyscraper.baseTitle,
      fill(copy.skyscraper.baseBody, params),
      [conflictRegion],
    );
  else
    add(
      'observe',
      text.linkTitle,
      fill(text.linkBody, params),
      [conflictRegion],
      [],
      [],
      false,
      true,
    );
  if (skyscraper) {
    if (targets.length > 1) {
      const targetsText = targets.map(cellName).join(copy.candidateSeparator);
      const excludedRoofs = [ref(firstEnd), ref(secondEnd)];
      add(
        'reason',
        copy.skyscraper.targetsTitle,
        fill(copy.skyscraper.targetsBody, {
          ...params,
          targets: targetsText,
        }),
        [conflictRegion],
        excludedRoofs,
        [
          {
            ...ref(firstInner),
            role: 'consequence',
            conflict: true,
            conflictRegion: name(conflictRegion),
          },
          {
            ...ref(secondInner),
            role: 'consequence',
            conflict: true,
            conflictRegion: name(conflictRegion),
          },
        ],
        true,
      );
      const summary = pages[pages.length - 1];
      pages[pages.length - 1] = {
        ...summary,
        visuals: {
          ...summary.visuals,
          links: summary.visuals.links?.map(link => ({
            ...link,
            active: true,
          })),
        },
      };
    } else
      for (const target of targets) {
        const p = { ...params, target: cellName(target) };
        const assumption: HintHypotheticalValue = {
          ...ref(target),
          role: 'assumption',
        };
        const excludedRoofs = [ref(firstEnd), ref(secondEnd)];
        add(
          'reason',
          fill(copy.skyscraper.targetTitle, p),
          fill(copy.skyscraper.targetBody, p),
          [
            ...new Set(
              [firstEnd, secondEnd].flatMap(end =>
                turbotRegions(end).filter(region =>
                  inTurbotRegion(target, region),
                ),
              ),
            ),
          ],
          excludedRoofs,
          [assumption],
        );
        add(
          'reason',
          copy.skyscraper.conflictTitle,
          fill(copy.skyscraper.conflictBody, p),
          [conflictRegion],
          excludedRoofs,
          [
            assumption,
            {
              ...ref(firstInner),
              role: 'consequence',
              conflict: true,
              conflictRegion: name(conflictRegion),
            },
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
      copy.skyscraper.conclusionTitle,
      fill(copy.skyscraper.conclusionBody, {
        ...params,
        targets: targets.map(cellName).join(copy.candidateSeparator),
      }),
      [],
      step.eliminations,
    );
    return pages;
  }
  if (targets.length > 1) {
    const targetsText = targets.map(cellName).join(copy.candidateSeparator);
    add(
      'reason',
      text.targetsTitle,
      fill(text.targetsBody, { ...params, targets: targetsText }),
      [conflictRegion],
      [ref(firstEnd), ref(secondEnd)],
      [
        {
          ...ref(firstInner),
          role: 'consequence',
          conflict: true,
          conflictRegion: name(conflictRegion),
        },
        {
          ...ref(secondInner),
          role: 'consequence',
          conflict: true,
          conflictRegion: name(conflictRegion),
        },
      ],
      true,
    );
    const summary = pages[pages.length - 1];
    pages[pages.length - 1] = {
      ...summary,
      visuals: {
        ...summary.visuals,
        links: summary.visuals.links?.map(link => ({
          ...link,
          active: true,
        })),
      },
    };
  } else
    for (const target of targets) {
      const p = { ...params, target: cellName(target) };
      const assumption: HintHypotheticalValue = {
        ...ref(target),
        role: 'assumption',
      };
      const peerRegions = [firstEnd, secondEnd].map(
        end => turbotRegions(end).find(r => inTurbotRegion(target, r))!,
      );
      add(
        'reason',
        text.assumeTitle,
        [
          fill(text.assumeBody, p),
          ...[firstEnd, secondEnd].map((end, i) =>
            fill(text.excludeBody, {
              ...p,
              end: cellName(end),
              region: name(peerRegions[i]),
            }),
          ),
        ].join(' '),
        peerRegions,
        [ref(firstEnd), ref(secondEnd)],
        [assumption],
      );
      add(
        'reason',
        text.conflictTitle,
        [
          fill(text.forceBody, {
            ...p,
            end: cellName(firstEnd),
            inner: cellName(firstInner),
            region: name(firstRegion),
          }),
          fill(text.conflictBody, {
            ...p,
            end: cellName(secondEnd),
            inner: cellName(secondInner),
            region: name(secondRegion),
          }),
        ].join(' '),
        [conflictRegion],
        [ref(firstEnd), ref(secondEnd)],
        [
          assumption,
          {
            ...ref(firstInner),
            role: 'consequence',
            conflict: true,
            conflictRegion: name(conflictRegion),
          },
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
