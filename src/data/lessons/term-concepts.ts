import type {
  HintLinkMark,
  HintRegionMark,
} from '../../domain/hints/presentation';
import type { CandidateRef, Digit } from '../../domain/sudoku/contracts';
import {
  branchConceptScene,
  chainConceptScene,
  colorConceptScene,
  conceptQuestionCount,
  fishConceptScene,
  groupConceptScene,
  linkConceptScene,
  lockedConceptScene,
  relationConceptScene,
  rectangleConceptScene,
  setQuestionScene,
  simpleConceptScene,
  transformTermScene,
} from './term-concept-scenarios';

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
  'fish',
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
  fish: ['fish', 'fishBase', 'fishCover', 'fishFin'],
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
  referenceCell?: number;
  relatedCells?: readonly number[];
  regions?: readonly HintRegionMark[];
  fins?: readonly CandidateRef[];
  links?: readonly HintLinkMark[];
  colors?: readonly (CandidateRef & { component: number; color: 0 | 1 })[];
  group?: readonly CandidateRef[];
  target?: CandidateRef;
  branchResults?: readonly boolean[];
  checkedBranches?: number;
  diagramDigit?: Digit;
}>;
export type TermQuestion = Readonly<{
  id: string;
  valid: boolean;
  scene: TermScene;
}>;

export function conceptScene(
  concept: TermConcept,
  variant: number,
  valid: boolean,
): TermScene {
  if (concept === 'nakedSet' || concept === 'hiddenSet')
    return setQuestionScene(concept, variant, valid);
  const scenario = Math.floor(variant / 2);
  const size = (scenario % 2 === 0 ? 2 : 3) as 2 | 3;
  const positionSymmetry = ([0, 2, 4, 5] as const)[scenario % 4];
  if (
    concept === 'candidate' ||
    concept === 'bivalue' ||
    concept === 'assumption'
  )
    return transformTermScene(
      simpleConceptScene(concept, scenario, valid),
      scenario % 8,
    );
  if (concept === 'peer' || concept === 'elimination')
    return transformTermScene(
      relationConceptScene(
        concept,
        (['row', 'column', 'box'] as const)[scenario % 3],
        valid,
      ),
      positionSymmetry,
    );
  if (concept === 'lockedCandidate')
    return transformTermScene(
      lockedConceptScene(
        (
          [
            'pointing-row',
            'pointing-column',
            'claiming-row',
            'claiming-column',
            'pointing-row',
            'claiming-column',
          ] as const
        )[scenario],
        valid,
      ),
      positionSymmetry,
    );
  if (
    concept === 'bilocation' ||
    concept === 'strongLink' ||
    concept === 'weakLink'
  )
    return transformTermScene(
      linkConceptScene(
        concept,
        (concept === 'bilocation'
          ? (['row', 'column', 'box'] as const)[scenario % 3]
          : (['row', 'column', 'box', 'cell'] as const)[scenario % 4])!,
        valid,
      ),
      positionSymmetry,
    );
  if (
    concept === 'fish' ||
    concept === 'fishBase' ||
    concept === 'fishCover' ||
    concept === 'fishFin'
  )
    return transformTermScene(
      fishConceptScene(concept, scenario % 4 < 2 ? 2 : 3, valid),
      scenario % 2 === 0 ? positionSymmetry : 1,
    );
  if (
    concept === 'alternatingChain' ||
    concept === 'endpoint' ||
    concept === 'chainTarget' ||
    concept === 'loop'
  )
    return transformTermScene(
      chainConceptScene(concept, size === 2 ? 4 : 6, valid),
      scenario % 8,
    );
  if (concept === 'colorState' || concept === 'colorComponent')
    return transformTermScene(
      colorConceptScene(concept, (2 + (scenario % 3)) as 2 | 3 | 4, valid),
      scenario % 8,
    );
  if (concept === 'groupNode' || concept === 'atLeastOne')
    return transformTermScene(
      groupConceptScene(concept, size, valid),
      scenario % 8,
    );
  if (concept === 'exhaustiveBranches' || concept === 'commonConclusion')
    return transformTermScene(
      branchConceptScene(concept, (2 + (scenario % 3)) as 2 | 3 | 4, valid),
      scenario % 8,
    );
  if (concept === 'deadlyRectangle')
    return transformTermScene(
      rectangleConceptScene(valid, scenario),
      scenario % 8,
    );
  if (concept === 'uniqueness')
    return transformTermScene(
      rectangleConceptScene(true, scenario),
      scenario % 8,
    );
  const unhandledConcept: never = concept;
  throw new Error(`Missing concept scene: ${unhandledConcept}`);
}

export const TERM_CONCEPT_QUESTIONS: Readonly<
  Record<TermConcept, readonly TermQuestion[]>
> = Object.fromEntries(
  TERM_CONCEPTS.map(concept => [
    concept,
    Array.from({ length: conceptQuestionCount(concept) }, (_, index) => {
      const valid = index % 2 === 0;
      return {
        id: `${concept}-${index + 1}`,
        valid,
        scene: conceptScene(concept, index, valid),
      };
    }),
  ]),
) as unknown as Record<TermConcept, readonly TermQuestion[]>;
