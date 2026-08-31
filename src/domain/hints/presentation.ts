import { CandidateRef, CellIndex, RegionRef } from '../sudoku/contracts';
import { HintStep, ExplanationValue, validateHintStep } from './contracts';
import { TechniqueCode } from './techniques';

type HintTechniqueTemplate = {
  name: string;
  observe: string;
};

export const ENGLISH_HINT_TEMPLATES: Readonly<
  Record<TechniqueCode, HintTechniqueTemplate>
> = {
  fullHouse: {
    name: 'Full House',
    observe: 'Only one value is missing from {regions}.',
  },
  nakedSingle: {
    name: 'Naked Single',
    observe: 'One highlighted cell has only one candidate left: {premises}.',
  },
  hiddenSingle: {
    name: 'Hidden Single',
    observe: 'In {regions}, a digit can appear in only one highlighted cell.',
  },
  'lockedCandidates.pointing': {
    name: 'Locked Candidates · Pointing',
    observe: 'In one box, {premises} are confined to the same row or column.',
  },
  'lockedCandidates.claiming': {
    name: 'Locked Candidates · Claiming',
    observe: 'In one row or column, {premises} are confined to the same box.',
  },
  lockedPair: {
    name: 'Locked Pair',
    observe: 'Two cells in {regions} are restricted to the same two digits.',
  },
  lockedTriple: {
    name: 'Locked Triple',
    observe:
      'Three cells in {regions} are restricted to the same three digits.',
  },
  nakedPair: {
    name: 'Naked Pair',
    observe: 'The highlighted pair reserves two digits in {regions}.',
  },
  hiddenPair: {
    name: 'Hidden Pair',
    observe: 'Two digits occur only in the highlighted pair within {regions}.',
  },
  nakedTriple: {
    name: 'Naked Triple',
    observe: 'Three highlighted cells reserve three digits in {regions}.',
  },
  hiddenTriple: {
    name: 'Hidden Triple',
    observe: 'Three digits occur only in three highlighted cells in {regions}.',
  },
  nakedQuad: {
    name: 'Naked Quad',
    observe: 'Four highlighted cells reserve four digits in {regions}.',
  },
  hiddenQuad: {
    name: 'Hidden Quad',
    observe: 'Four digits occur only in four highlighted cells in {regions}.',
  },
  xWing: {
    name: 'X-Wing',
    observe: 'One digit forms the corners of a rectangle across {regions}.',
  },
  swordfish: {
    name: 'Swordfish',
    observe: 'One digit is restricted across three matching rows or columns.',
  },
  skyscraper: {
    name: 'Skyscraper',
    observe: 'Two strong links form a skyscraper whose roofs share a target.',
  },
  twoStringKite: {
    name: 'Two-String Kite',
    observe: 'A row link and a column link meet through one box.',
  },
  turbotFish: {
    name: 'Turbot Fish',
    observe: 'Two strong links connect through a weak link to a shared target.',
  },
  wWing: {
    name: 'W-Wing',
    observe: 'Two matching bivalue cells are joined by a strong link.',
  },
  xyWing: {
    name: 'XY-Wing',
    observe: 'A bivalue pivot connects two wings that share an outer digit.',
  },
  xyzWing: {
    name: 'XYZ-Wing',
    observe: 'A three-candidate pivot and two wings share one digit.',
  },
  simpleColoring: {
    name: 'Simple Coloring',
    observe: 'Strong links divide one digit into two alternating colors.',
  },
  multiColoring: {
    name: 'Multi-Coloring',
    observe: 'Separate coloring chains for one digit interact.',
  },
  remotePair: {
    name: 'Remote Pair',
    observe: 'A chain of matching bivalue cells alternates two digits.',
  },
  emptyRectangle: {
    name: 'Empty Rectangle',
    observe: 'Candidates in a box form an empty-rectangle intersection.',
  },
  hiddenRectangle: {
    name: 'Hidden Rectangle',
    observe: 'Strong links resolve a potentially ambiguous rectangle.',
  },
  avoidableRectangle: {
    name: 'Avoidable Rectangle',
    observe:
      'Entered values and candidates would otherwise form two solutions.',
  },
  uniqueRectangle: {
    name: 'Unique Rectangle',
    observe: 'Four cells would form a deadly two-solution rectangle.',
  },
  bugPlusOne: {
    name: 'BUG + 1',
    observe: 'Every unsolved cell is bivalue except one highlighted cell.',
  },
  finnedXWing: {
    name: 'Finned X-Wing',
    observe: 'An X-Wing pattern has an extra candidate confined to one box.',
  },
  sashimiXWing: {
    name: 'Sashimi X-Wing',
    observe: 'A near X-Wing uses a fin to replace one missing corner.',
  },
  jellyfish: {
    name: 'Jellyfish',
    observe: 'One digit is restricted across four matching rows or columns.',
  },
  xChain: {
    name: 'X-Chain',
    observe:
      'Alternating strong and weak links connect candidates for one digit.',
  },
  xyChain: {
    name: 'XY-Chain',
    observe: 'A chain of bivalue cells links matching endpoint digits.',
  },
  aic: {
    name: 'Alternating Inference Chain',
    observe: 'Strong and weak candidate links alternate to force a conclusion.',
  },
  groupedAic: {
    name: 'Grouped AIC',
    observe:
      'Grouped candidates participate in an alternating inference chain.',
  },
  complexColoring: {
    name: 'Complex Coloring',
    observe: 'Multiple linked color components force the highlighted outcome.',
  },
  forcingChain: {
    name: 'Forcing Chain',
    observe: 'Each branch from one candidate reaches the same conclusion.',
  },
  forcingNet: {
    name: 'Forcing Net',
    observe: 'Several linked branches converge on one unavoidable result.',
  },
};

export type HintPageKind = 'observe' | 'reason' | 'apply';

export type HintPageVisuals = {
  showFocusCells: boolean;
  showFocusRegions: boolean;
  showPremises: boolean;
  showEliminations: boolean;
  showPlacements: boolean;
};

export type HintPresentationPage = {
  kind: HintPageKind;
  title: string;
  body: string;
  accessibilitySummary: string;
  visuals: HintPageVisuals;
};

export type HintPresentation = {
  techniqueName: string;
  nameKey: `technique.${TechniqueCode}.name`;
  explanationKey: `hint.${TechniqueCode}`;
  params: Readonly<Record<string, ExplanationValue>>;
  pages: readonly HintPresentationPage[];
};

function formatCell(cell: CellIndex): string {
  return `R${Math.floor(cell / 9) + 1}C${(cell % 9) + 1}`;
}

function formatCandidates(candidates: readonly CandidateRef[]): string {
  if (candidates.length === 0) {
    return 'the highlighted candidates';
  }
  return candidates
    .map(candidate => `${candidate.digit} in ${formatCell(candidate.cell)}`)
    .join(', ');
}

function formatRegions(regions: readonly RegionRef[]): string {
  if (regions.length === 0) {
    return 'the highlighted area';
  }
  return regions
    .map(region => {
      if (region.kind === 'box') {
        return `box ${region.index + 1}`;
      }
      return `${region.kind} ${region.index + 1}`;
    })
    .join(', ');
}

function interpolate(
  template: string,
  params: Readonly<Record<string, ExplanationValue>>,
): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (_, key: string) =>
    String(params[key] ?? ''),
  );
}

export function buildHintPresentation(step: HintStep): HintPresentation {
  const validationErrors = validateHintStep(step);
  if (validationErrors.length > 0) {
    throw new Error(
      `Cannot present an invalid hint: ${validationErrors.join('; ')}`,
    );
  }

  const template = ENGLISH_HINT_TEMPLATES[step.techniqueCode];
  const placements = formatCandidates(step.placements);
  const eliminations = formatCandidates(step.eliminations);
  const params: Readonly<Record<string, ExplanationValue>> = {
    regions: formatRegions(step.focusRegions),
    focusCells: step.focusCells.map(formatCell).join(', '),
    premises: formatCandidates(step.premiseCandidates),
    eliminations,
    placements,
    resultCount: step.eliminations.length + step.placements.length,
    ...step.explanationParams,
  };
  const resultBody =
    step.placements.length > 0
      ? `${placements} is forced by this pattern.`
      : `${eliminations} can be removed because it cannot be true in this pattern.`;
  const applyBody =
    step.placements.length > 0
      ? `Apply this step to place ${placements}. It remains one undoable move.`
      : `Apply this step to remove ${eliminations}. All removals remain one undoable move.`;

  return {
    techniqueName: template.name,
    nameKey: `technique.${step.techniqueCode}.name`,
    explanationKey: step.explanationKey,
    params,
    pages: [
      {
        kind: 'observe',
        title: 'Where to look',
        body: interpolate(template.observe, params),
        accessibilitySummary: `Observe ${params.regions}. ${params.premises}.`,
        visuals: {
          showFocusCells: true,
          showFocusRegions: true,
          showPremises: true,
          showEliminations: false,
          showPlacements: false,
        },
      },
      {
        kind: 'reason',
        title: 'What follows',
        body: resultBody,
        accessibilitySummary: resultBody,
        visuals: {
          showFocusCells: true,
          showFocusRegions: true,
          showPremises: true,
          showEliminations: true,
          showPlacements: true,
        },
      },
      {
        kind: 'apply',
        title: 'Apply one step',
        body: applyBody,
        accessibilitySummary: applyBody,
        visuals: {
          showFocusCells: true,
          showFocusRegions: true,
          showPremises: true,
          showEliminations: true,
          showPlacements: true,
        },
      },
    ],
  };
}
