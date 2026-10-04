import type {
  HintLinkMark,
  HintRegionMark,
} from '../../domain/hints/presentation';
import type { CandidateRef, Digit } from '../../domain/sudoku/contracts';

export const TERM_CONCEPTS = [
  'candidate',
  'peer',
  'elimination',
  'nakedSet',
  'hiddenSet',
  'lockedCandidate',
  'bivalue',
  'bilocation',
  'strongLink',
  'weakLink',
  'fishBase',
  'fishCover',
  'fishFin',
  'alternatingChain',
  'endpoint',
  'chainTarget',
  'loop',
  'colorState',
  'colorComponent',
  'uniqueness',
  'deadlyRectangle',
  'groupNode',
  'atLeastOne',
  'assumption',
  'exhaustiveBranches',
  'commonConclusion',
] as const;
export type TermConcept = (typeof TERM_CONCEPTS)[number];

export const TERM_CONCEPT_PLACEMENTS = {
  basics: ['candidate', 'peer', 'elimination'],
  level2: ['nakedSet', 'hiddenSet', 'lockedCandidate'],
  fish: ['fishBase', 'fishCover', 'fishFin'],
  shortChain: [
    'bivalue',
    'bilocation',
    'strongLink',
    'weakLink',
    'alternatingChain',
    'endpoint',
    'chainTarget',
    'loop',
  ],
  coloring: ['colorState', 'colorComponent'],
  uniqueness: ['uniqueness', 'deadlyRectangle'],
  level5: [
    'groupNode',
    'atLeastOne',
    'assumption',
    'exhaustiveBranches',
    'commonConclusion',
  ],
} as const satisfies Readonly<Record<string, readonly TermConcept[]>>;

export const PREMIUM_TERM_CONCEPTS: ReadonlySet<TermConcept> = new Set([
  ...TERM_CONCEPT_PLACEMENTS.uniqueness,
  ...TERM_CONCEPT_PLACEMENTS.level5,
]);

export type TermScene = Readonly<{
  values: readonly CandidateRef[];
  candidates: readonly CandidateRef[];
  focus: readonly CandidateRef[];
  regions?: readonly HintRegionMark[];
  fins?: readonly CandidateRef[];
  links?: readonly HintLinkMark[];
  colors?: readonly (CandidateRef & { component: number; color: 0 | 1 })[];
  group?: readonly CandidateRef[];
  target?: CandidateRef;
  branchResults?: readonly boolean[];
  diagramDigit?: Digit;
}>;
export type TermQuestion = Readonly<{
  id: string;
  valid: boolean;
  scene: TermScene;
}>;

const at = (r: number, c: number) => (r - 1) * 9 + c - 1;
const ref = (r: number, c: number, d: number): CandidateRef => ({
  cell: at(r, c),
  digit: d as Digit,
});
const row = (n: number) => ({ kind: 'row' as const, index: n - 1 });
const column = (n: number) => ({ kind: 'column' as const, index: n - 1 });
const box = (n: number) => ({ kind: 'box' as const, index: n - 1 });
const base = (n: number): HintRegionMark => ({
  region: row(n),
  role: 'fishBase',
});
const cover = (n: number): HintRegionMark => ({
  region: column(n),
  role: 'fishCover',
});
const strong = (a: CandidateRef, b: CandidateRef): HintLinkMark => ({
  from: a.cell,
  to: b.cell,
  kind: 'pair',
});
const weak = (a: CandidateRef, b: CandidateRef): HintLinkMark => ({
  from: a.cell,
  to: b.cell,
  kind: 'peer',
});
const scene = (
  candidates: readonly CandidateRef[],
  focus: readonly CandidateRef[],
  more: Partial<TermScene> = {},
): TermScene => ({ values: [], candidates, focus, ...more });

/** Explicit local candidate diagrams, never shipped puzzle data. */
export function conceptScene(
  concept: TermConcept,
  variant: number,
  valid: boolean,
): TermScene {
  const d = 2 + (variant % 6);
  const e = d + 1;
  const f = d === 7 ? 1 : d + 2;
  const r = [2, 5, 8][variant % 3];
  const c = [1, 4, 7][Math.floor(variant / 3) % 3];
  const a = ref(r, c, d),
    b = ref(r, c + 1, d),
    x = ref(r, c + 2, d);
  const far = ref(r === 8 ? 2 : r + 3, c === 7 ? 1 : c + 3, d);
  const fishTransposed = Math.floor(variant / 2) % 2 === 1;
  const fishRef = (fishRow: number, fishColumn: number) =>
    fishTransposed ? ref(fishColumn, fishRow, d) : ref(fishRow, fishColumn, d);
  const fish = [fishRef(2, 2), fishRef(2, 8), fishRef(6, 2), fishRef(6, 8)];
  const fishLines: HintRegionMark[] = fishTransposed
    ? [
        { region: column(2), role: 'fishBase' },
        { region: column(6), role: 'fishBase' },
        { region: row(2), role: 'fishCover' },
        { region: row(8), role: 'fishCover' },
      ]
    : [base(2), base(6), cover(2), cover(8)];
  const chain = [ref(2, 2, d), ref(2, 7, d), ref(6, 7, d), ref(6, 2, d)];
  const chainLinks = valid
    ? [
        strong(chain[0], chain[1]),
        weak(chain[1], chain[2]),
        strong(chain[2], chain[3]),
      ]
    : [
        weak(chain[0], chain[1]),
        strong(chain[1], chain[2]),
        weak(chain[2], chain[3]),
      ];
  switch (concept) {
    case 'candidate':
      return valid
        ? scene([a, ref(r, c, e)], [a])
        : scene([], [a], { values: [a] });
    case 'peer': {
      const peer = valid
        ? variant % 3 === 0
          ? x
          : variant % 3 === 1
          ? ref(r + 1, c, d)
          : ref(r + 1, c + 1, d)
        : far;
      return scene([a, peer], [a, peer], {
        links: valid ? [weak(a, peer)] : [],
      });
    }
    case 'elimination': {
      const target = valid ? x : far;
      return scene([target], [target], {
        values: [a],
        target: valid ? target : undefined,
      });
    }
    case 'nakedSet': {
      const pair = [a, ref(r, c, e), x, ref(r, c + 2, e)];
      return scene(valid ? pair : [...pair, ref(r, c + 2, f)], pair, {
        regions: [{ region: row(r), role: 'source' }],
      });
    }
    case 'hiddenSet': {
      const pair = [a, ref(r, c, e), x, ref(r, c + 2, e)];
      const candidates = [...pair, ref(r, c, f), ref(r, c + 2, f)];
      return scene(valid ? candidates : [...candidates, b], pair, {
        regions: [{ region: row(r), role: 'source' }],
      });
    }
    case 'lockedCandidate': {
      const candidates = valid ? [a, b] : [a, b, ref(r + 1, c + 2, d)];
      const target = ref(r, c === 1 ? 5 : 1, d);
      const boxNumber =
        Math.floor((r - 1) / 3) * 3 + Math.floor((c - 1) / 3) + 1;
      return scene([...candidates, target], [a, b], {
        regions: [
          { region: box(boxNumber), role: 'source' },
          { region: row(r), role: 'affected' },
        ],
        target: valid ? target : undefined,
      });
    }
    case 'bivalue': {
      const pair = [a, ref(r, c, e)];
      return scene(valid ? pair : [...pair, ref(r, c, f)], pair);
    }
    case 'bilocation':
    case 'strongLink':
      return scene(valid ? [a, x] : [a, b, x], [a, x], {
        regions: [{ region: row(r), role: 'source' }],
        links: [valid ? strong(a, x) : weak(a, x)],
      });
    case 'weakLink': {
      const second = valid ? x : { ...far, digit: e as Digit };
      return scene(valid ? [a, b, second] : [a, second], [a, second], {
        links: valid ? [weak(a, second)] : [],
      });
    }
    case 'fishBase':
    case 'fishCover': {
      const candidates = valid ? fish : [...fish, fishRef(2, 5)];
      return scene(candidates, fish, {
        regions: fishLines,
        diagramDigit: d as Digit,
      });
    }
    case 'fishFin': {
      const fin = valid ? fishRef(2, 3) : fishRef(2, 5);
      const target = fishRef(1, 2);
      return scene([...fish, fin, target], [...fish, fin], {
        regions: fishLines,
        fins: valid ? [fin] : [],
        diagramDigit: d as Digit,
        target: valid ? target : undefined,
      });
    }
    case 'alternatingChain':
    case 'endpoint':
    case 'chainTarget':
    case 'loop': {
      const target = valid ? ref(1, 2, d) : ref(1, 4, d);
      const links =
        concept === 'loop'
          ? valid
            ? [...chainLinks, weak(chain[3], chain[0])]
            : [
                strong(chain[0], chain[1]),
                weak(chain[1], chain[2]),
                strong(chain[2], chain[3]),
              ]
          : concept === 'chainTarget'
          ? [
              strong(chain[0], chain[1]),
              weak(chain[1], chain[2]),
              strong(chain[2], chain[3]),
            ]
          : chainLinks;
      return scene(
        concept === 'chainTarget' ? [...chain, target] : chain,
        concept === 'chainTarget' ? [...chain, target] : chain,
        {
          links,
          target: concept === 'chainTarget' && valid ? target : undefined,
          diagramDigit: d as Digit,
        },
      );
    }
    case 'colorState':
    case 'colorComponent': {
      const colors = [
        { ...a, component: 0, color: 0 as const },
        {
          ...x,
          component: concept === 'colorComponent' && !valid ? 1 : 0,
          color: valid ? (1 as const) : (0 as const),
        },
      ];
      return scene(colors, colors, {
        colors,
        links: concept === 'colorState' || valid ? [strong(a, x)] : [],
        diagramDigit: d as Digit,
      });
    }
    case 'uniqueness':
    case 'deadlyRectangle': {
      const bottom = concept === 'uniqueness' || valid ? 2 : 4;
      const corners = [
        ref(1, 2, d),
        ref(1, 7, d),
        ref(bottom, 2, d),
        ref(bottom, 7, d),
      ];
      const candidates = corners.flatMap(item => [
        item,
        { ...item, digit: e as Digit },
      ]);
      return scene(candidates, candidates, {
        regions: [
          { region: row(1), role: 'source' },
          { region: row(bottom), role: 'source' },
        ],
      });
    }
    case 'groupNode':
    case 'atLeastOne': {
      const group = [ref(3, 1, d), ref(3, 2, d)];
      const outside = ref(3, 6, d);
      if (concept === 'groupNode' && !valid) {
        const remote = ref(3, 5, d);
        return scene([group[0], remote, outside], [group[0], remote], {
          diagramDigit: d as Digit,
          regions: [{ region: row(3), role: 'source' }],
        });
      }
      const candidates = valid
        ? [...group, outside]
        : [...group, outside, ref(3, 8, d)];
      return scene(candidates, group, {
        group,
        target: undefined,
        diagramDigit: d as Digit,
        regions: [{ region: row(3), role: 'source' }],
      });
    }
    case 'exhaustiveBranches':
    case 'commonConclusion': {
      const first = ref(2, 2, d),
        second = ref(2, 2, e);
      const target = ref(6, 6, d);
      const candidates =
        valid || concept === 'commonConclusion'
          ? [first, second, target]
          : [first, second, ref(2, 2, f), target];
      return scene(candidates, [first, second], {
        target: concept === 'commonConclusion' && valid ? target : undefined,
        branchResults:
          concept === 'commonConclusion'
            ? valid
              ? [true, true]
              : [true, false]
            : undefined,
      });
    }
    case 'assumption':
      return valid
        ? scene([a, ref(r, c, e)], [a])
        : scene([], [], { values: [a] });
  }
}

export const TERM_CONCEPT_QUESTIONS: Readonly<
  Record<TermConcept, readonly TermQuestion[]>
> = Object.fromEntries(
  TERM_CONCEPTS.map(concept => [
    concept,
    Array.from(
      { length: concept === 'strongLink' || concept === 'weakLink' ? 15 : 12 },
      (_, index) => {
        const valid = index % 2 === 0;
        return {
          id: `${concept}-${index + 1}`,
          valid,
          scene: conceptScene(concept, index, valid),
        };
      },
    ),
  ]),
) as unknown as Record<TermConcept, readonly TermQuestion[]>;
