import type { CandidateRef, Digit } from '../../domain/sudoku/contracts';
import {
  conceptScene,
  type TermConcept,
  type TermScene,
} from './term-concepts';
import {
  branchConceptScene,
  chainConceptScene,
  colorConceptScene,
  fishConceptScene,
  groupConceptScene,
  lockedConceptScene,
  rectangleConceptScene,
  setConceptScene,
  transformTermScene,
  type LockedPattern,
  type SetSize,
  type SetUnit,
} from './term-concept-scenarios';

type SetArticlePattern = `${'pair' | 'triple' | 'quad'}-${SetUnit}`;
type FishArticlePattern = `${'xWing' | 'swordfish'}-${'row' | 'column'}`;
type BranchArticlePattern = `${'two' | 'three' | 'four'}-branches`;

export type TermConceptArticlePattern =
  | 'default'
  | 'row'
  | 'column'
  | 'box'
  | 'cell'
  | 'short'
  | 'long'
  | 'two-nodes'
  | 'three-nodes'
  | 'four-nodes'
  | 'horizontal'
  | 'vertical'
  | SetArticlePattern
  | FishArticlePattern
  | BranchArticlePattern
  | LockedPattern;

const setPatterns: readonly SetArticlePattern[] = [
  'pair-row',
  'pair-column',
  'pair-box',
  'triple-row',
  'triple-column',
  'triple-box',
  'quad-row',
  'quad-column',
  'quad-box',
];
const fishPatterns: readonly FishArticlePattern[] = [
  'xWing-row',
  'xWing-column',
  'swordfish-row',
  'swordfish-column',
];
const groupPatterns: readonly SetArticlePattern[] = [
  'pair-row',
  'pair-column',
  'triple-row',
  'triple-column',
];

const multiplePatterns: Partial<
  Record<TermConcept, readonly TermConceptArticlePattern[]>
> = {
  peer: ['row', 'column', 'box'],
  elimination: ['row', 'column', 'box'],
  nakedSet: setPatterns,
  hiddenSet: setPatterns,
  lockedCandidate: [
    'pointing-row',
    'pointing-column',
    'claiming-row',
    'claiming-column',
  ],
  bilocation: ['row', 'column', 'box'],
  strongLink: ['row', 'column', 'box', 'cell'],
  weakLink: ['row', 'column', 'box', 'cell'],
  fishBase: fishPatterns,
  fishCover: fishPatterns,
  fishFin: fishPatterns,
  alternatingChain: ['short', 'long'],
  endpoint: ['short', 'long'],
  chainTarget: ['short', 'long'],
  loop: ['short', 'long'],
  colorState: ['two-nodes', 'three-nodes', 'four-nodes'],
  colorComponent: ['two-nodes', 'three-nodes', 'four-nodes'],
  deadlyRectangle: ['horizontal', 'vertical'],
  groupNode: groupPatterns,
  atLeastOne: groupPatterns,
  exhaustiveBranches: ['two-branches', 'three-branches', 'four-branches'],
  commonConclusion: ['two-branches', 'three-branches', 'four-branches'],
};

export function conceptArticlePatterns(
  concept: TermConcept,
): readonly TermConceptArticlePattern[] {
  return multiplePatterns[concept] ?? ['default'];
}

const ref = (r: number, c: number, digit: Digit): CandidateRef => ({
  cell: (r - 1) * 9 + c - 1,
  digit,
});

function transposeScene(original: TermScene): TermScene {
  const cell = (index: number) => (index % 9) * 9 + Math.floor(index / 9);
  const candidate = (item: CandidateRef): CandidateRef => ({
    ...item,
    cell: cell(item.cell),
  });
  return {
    ...original,
    values: original.values.map(candidate),
    candidates: original.candidates.map(candidate),
    focus: original.focus.map(candidate),
    regions: original.regions?.map(mark => ({
      ...mark,
      region: {
        ...mark.region,
        kind:
          mark.region.kind === 'row'
            ? 'column'
            : mark.region.kind === 'column'
            ? 'row'
            : 'box',
        index:
          mark.region.kind === 'box'
            ? (mark.region.index % 3) * 3 + Math.floor(mark.region.index / 3)
            : mark.region.index,
      },
    })),
    fins: original.fins?.map(candidate),
    links: original.links?.map(link => ({
      ...link,
      from: cell(link.from),
      to: cell(link.to),
    })),
    colors: original.colors?.map(item => ({
      ...item,
      cell: cell(item.cell),
    })),
    group: original.group?.map(candidate),
    target: original.target ? candidate(original.target) : undefined,
  };
}

function boxScene(concept: TermConcept): TermScene {
  const a = ref(2, 1, 2);
  const b = ref(3, 2, 2);
  const otherA = ref(2, 1, 3);
  const otherB = ref(3, 2, 3);
  const source = [
    { region: { kind: 'box' as const, index: 0 }, role: 'source' as const },
  ];
  if (concept === 'peer') {
    return {
      values: [],
      candidates: [a, b],
      focus: [a, b],
      regions: source,
      links: [{ from: a.cell, to: b.cell, kind: 'peer' }],
    };
  }
  if (concept === 'elimination') {
    return {
      values: [a],
      candidates: [b],
      focus: [b],
      regions: source,
      target: b,
    };
  }
  if (concept === 'nakedSet' || concept === 'hiddenSet') {
    const pair = [a, otherA, b, otherB];
    return {
      values: [],
      candidates:
        concept === 'hiddenSet' ? [...pair, ref(2, 1, 4), ref(3, 2, 4)] : pair,
      focus: pair,
      regions: source,
    };
  }
  const candidates = concept === 'weakLink' ? [a, b, ref(1, 3, 2)] : [a, b];
  return {
    values: [],
    candidates,
    focus: [a, b],
    regions: source,
    links: [
      {
        from: a.cell,
        to: b.cell,
        kind: concept === 'weakLink' ? 'peer' : 'pair',
      },
    ],
  };
}

function rowScene(concept: TermConcept): TermScene {
  const a = ref(2, 1, 2);
  const b = ref(2, 5, 2);
  const otherA = ref(2, 1, 3);
  const otherB = ref(2, 5, 3);
  const source = [
    { region: { kind: 'row' as const, index: 1 }, role: 'source' as const },
  ];
  if (concept === 'peer') {
    return {
      values: [],
      candidates: [a, b],
      focus: [a, b],
      regions: source,
      links: [{ from: a.cell, to: b.cell, kind: 'peer' }],
    };
  }
  if (concept === 'elimination') {
    return {
      values: [a],
      candidates: [b],
      focus: [b],
      regions: source,
      target: b,
    };
  }
  if (concept === 'nakedSet' || concept === 'hiddenSet') {
    const pair = [a, otherA, b, otherB];
    return {
      values: [],
      candidates:
        concept === 'hiddenSet' ? [...pair, ref(2, 1, 4), ref(2, 5, 4)] : pair,
      focus: pair,
      regions: source,
    };
  }
  return {
    values: [],
    candidates: concept === 'weakLink' ? [a, b, ref(2, 8, 2)] : [a, b],
    focus: [a, b],
    regions: source,
    links: [
      {
        from: a.cell,
        to: b.cell,
        kind: concept === 'weakLink' ? 'peer' : 'pair',
      },
    ],
  };
}

function cellLinkScene(concept: TermConcept): TermScene {
  const first = ref(2, 2, 2);
  const second = ref(2, 2, 3);
  return {
    values: [],
    candidates:
      concept === 'weakLink' ? [first, second, ref(2, 2, 4)] : [first, second],
    focus: [first, second],
  };
}

/** Article modes depict distinct Sudoku structures; practice variants stay separate. */
export function conceptArticleScene(
  concept: TermConcept,
  pattern: TermConceptArticlePattern,
): TermScene {
  if (concept === 'nakedSet' || concept === 'hiddenSet') {
    const selected =
      pattern === 'row' || pattern === 'column' || pattern === 'box'
        ? `pair-${pattern}`
        : pattern === 'default'
        ? 'pair-row'
        : pattern;
    const [sizeName, unit] = selected.split('-') as [
      'pair' | 'triple' | 'quad',
      SetUnit,
    ];
    const size: SetSize =
      sizeName === 'pair' ? 2 : sizeName === 'triple' ? 3 : 4;
    return setConceptScene(concept, size, unit, true);
  }
  if (concept === 'lockedCandidate') {
    const selected: LockedPattern =
      pattern === 'column'
        ? 'pointing-column'
        : pattern.startsWith('claiming-') || pattern.startsWith('pointing-')
        ? (pattern as LockedPattern)
        : 'pointing-row';
    return lockedConceptScene(selected, true);
  }
  if (
    concept === 'fishBase' ||
    concept === 'fishCover' ||
    concept === 'fishFin'
  ) {
    const size: SetSize = pattern.startsWith('swordfish-') ? 3 : 2;
    const scene = fishConceptScene(concept, size, true);
    return pattern.endsWith('column') ? transformTermScene(scene, 1) : scene;
  }
  if (
    concept === 'alternatingChain' ||
    concept === 'endpoint' ||
    concept === 'chainTarget' ||
    concept === 'loop'
  )
    return chainConceptScene(concept, pattern === 'long' ? 6 : 4, true);
  if (concept === 'colorState' || concept === 'colorComponent')
    return colorConceptScene(
      concept,
      pattern === 'four-nodes' ? 4 : pattern === 'three-nodes' ? 3 : 2,
      true,
    );
  if (concept === 'deadlyRectangle') {
    const scene = rectangleConceptScene(true, 0);
    return pattern === 'vertical' ? transformTermScene(scene, 1) : scene;
  }
  if (concept === 'groupNode' || concept === 'atLeastOne') {
    const scene = groupConceptScene(
      concept,
      pattern.startsWith('triple-') ? 3 : 2,
      true,
    );
    return pattern.endsWith('column') ? transformTermScene(scene, 1) : scene;
  }
  if (concept === 'exhaustiveBranches' || concept === 'commonConclusion')
    return branchConceptScene(
      concept,
      pattern === 'four-branches' ? 4 : pattern === 'three-branches' ? 3 : 2,
      true,
    );
  if (pattern === 'default') return conceptScene(concept, 0, true);
  if (pattern === 'cell') return cellLinkScene(concept);
  if (
    concept === 'peer' ||
    concept === 'elimination' ||
    concept === 'bilocation' ||
    concept === 'strongLink' ||
    concept === 'weakLink'
  ) {
    if (pattern === 'box') return boxScene(concept);
    const row = rowScene(concept);
    return pattern === 'column' ? transposeScene(row) : row;
  }
  if (pattern === 'row') return conceptScene(concept, 0, true);
  return transposeScene(conceptScene(concept, 0, true));
}
