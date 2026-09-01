import { CandidateRef, CellIndex, RegionRef } from '../sudoku/contracts';
import {
  HintProofStep,
  HintStep,
  ExplanationValue,
  validateHintStep,
} from './contracts';
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
    observe: 'Consider where {targetDigit} can still go in {regions}.',
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

export type HintRegionRole = 'source' | 'affected';
export type HintCellRole =
  | 'potential'
  | 'established'
  | 'eliminationTarget'
  | 'result';
export type HintCandidateRole = 'potential' | 'excluded' | 'result';

export type HintRegionMark = {
  region: RegionRef;
  role: HintRegionRole;
};

export type HintCellMark = {
  cell: CellIndex;
  role: HintCellRole;
};

export type HintCandidateMark = CandidateRef &
  (
    | { role: 'potential' | 'result' }
    | {
        role: 'excluded';
        exclusionKind: 'explanation' | 'result';
      }
  );

export type HintPageVisuals = {
  showFocusCells: boolean;
  showFocusRegions: boolean;
  showPremises: boolean;
  showEliminations: boolean;
  showPlacements: boolean;
  /** Page-local evidence. Absent fields preserve legacy all-or-nothing hints. */
  focusCells?: readonly CellIndex[];
  focusRegions?: readonly RegionRef[];
  premiseCandidates?: readonly CandidateRef[];
  valueEvidence?: readonly CandidateRef[];
  eliminations?: readonly CandidateRef[];
  placements?: readonly CandidateRef[];
  /** Semantic scene marks drive staged board-native explanations. */
  regionMarks?: readonly HintRegionMark[];
  cellMarks?: readonly HintCellMark[];
  candidateMarks?: readonly HintCandidateMark[];
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

function formatCells(cells: readonly CellIndex[]): string {
  if (cells.length === 0) {
    return 'the highlighted cells';
  }
  return cells.map(formatCell).join(', ');
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

function proofBody(
  proof: HintProofStep,
  template: HintTechniqueTemplate,
  params: Readonly<Record<string, ExplanationValue>>,
  applyBody: string,
): string {
  switch (proof.reason) {
    case 'scan_region':
      return interpolate(template.observe, {
        ...params,
        regions: formatRegions(proof.focusRegions),
      });
    case 'single_candidate':
      return `${formatCells(proof.focusCells)} has only ${formatCandidates(
        proof.premiseCandidates,
      )} left.`;
    case 'value_blocks_cells': {
      const evidence = proof.valueEvidence[0];
      if (!evidence) {
        return 'A placed value rules out the highlighted cells.';
      }
      return `${evidence.digit} at ${formatCell(evidence.cell)} rules out ${
        evidence.digit
      } from ${formatCells(proof.focusCells)}.`;
    }
    case 'pattern_constraint':
      return `The highlighted candidates establish the ${template.name} constraint.`;
    case 'chain_inference':
      return `Follow these linked candidates: ${formatCandidates(
        proof.premiseCandidates,
      )}.`;
    case 'forced_placement':
    case 'valid_elimination':
      return applyBody;
  }
}

function proofTitle(proof: HintProofStep): string {
  if (proof.kind === 'observe') {
    return 'Where to look';
  }
  if (proof.kind === 'conclusion') {
    return 'Conclusion';
  }
  if (proof.reason === 'value_blocks_cells') {
    return 'Rule out one group';
  }
  if (proof.reason === 'chain_inference') {
    return 'Follow the link';
  }
  return 'What follows';
}

function candidateIdentity(candidate: CandidateRef): string {
  return `${candidate.cell}:${candidate.digit}`;
}

function uniqueCandidates(
  candidates: readonly CandidateRef[],
): readonly CandidateRef[] {
  const seen = new Set<string>();
  return candidates.filter(candidate => {
    const identity = candidateIdentity(candidate);
    if (seen.has(identity)) {
      return false;
    }
    seen.add(identity);
    return true;
  });
}

function linkedRegionForEvidence(
  evidence: CandidateRef | undefined,
  cells: readonly CellIndex[],
): RegionRef | null {
  if (!evidence || cells.length === 0) {
    return null;
  }
  const evidenceRow = Math.floor(evidence.cell / 9);
  const evidenceColumn = evidence.cell % 9;
  if (cells.every(cell => Math.floor(cell / 9) === evidenceRow)) {
    return { kind: 'row', index: evidenceRow };
  }
  if (cells.every(cell => cell % 9 === evidenceColumn)) {
    return { kind: 'column', index: evidenceColumn };
  }
  return null;
}

function regionMarksForProof(
  step: HintStep,
  proof: HintProofStep,
): readonly HintRegionMark[] {
  const lockedCandidates =
    step.techniqueCode === 'lockedCandidates.pointing' ||
    step.techniqueCode === 'lockedCandidates.claiming';
  if (lockedCandidates) {
    if (proof.kind === 'observe') {
      return step.focusRegions.slice(0, 1).map(region => ({
        region,
        role: 'source' as const,
      }));
    }
    return step.focusRegions.map((region, index) => ({
      region,
      role: index === 0 ? ('source' as const) : ('affected' as const),
    }));
  }

  const marks: HintRegionMark[] = proof.focusRegions.map(region => ({
    region,
    role: 'source',
  }));
  if (proof.reason === 'value_blocks_cells') {
    const linkedRegion = linkedRegionForEvidence(
      proof.valueEvidence[0],
      proof.focusCells,
    );
    if (linkedRegion) {
      marks.push({ region: linkedRegion, role: 'affected' });
    }
  }
  return marks;
}

function sceneMarksForProof(
  step: HintStep,
  proof: HintProofStep,
  proofIndex: number,
): Pick<HintPageVisuals, 'regionMarks' | 'cellMarks' | 'candidateMarks'> {
  const precedingProofs = step.proofSteps?.slice(0, proofIndex + 1) ?? [proof];
  const accumulatedPremises = uniqueCandidates(
    precedingProofs.flatMap(item => item.premiseCandidates),
  );
  const canRevealPremisesOnObserve =
    step.techniqueCode !== 'hiddenSingle' && step.techniqueCode !== 'fullHouse';
  const potentialCandidates =
    proof.kind === 'observe'
      ? canRevealPremisesOnObserve
        ? step.premiseCandidates
        : proof.premiseCandidates
      : proof.kind === 'conclusion'
      ? step.premiseCandidates
      : accumulatedPremises;
  const explanatoryExclusions =
    proof.reason === 'value_blocks_cells' && proof.valueEvidence[0]
      ? proof.focusCells.map(cell => ({
          cell,
          digit: proof.valueEvidence[0].digit,
        }))
      : [];
  const resultExclusionKeys = new Set(
    proof.eliminations.map(candidateIdentity),
  );
  const explanatoryCandidates = uniqueCandidates(explanatoryExclusions).filter(
    candidate => !resultExclusionKeys.has(candidateIdentity(candidate)),
  );
  const resultExclusions = uniqueCandidates(proof.eliminations);
  const excludedCandidates = [...explanatoryCandidates, ...resultExclusions];
  const candidateMarks: HintCandidateMark[] = [
    ...potentialCandidates.map(candidate => ({
      ...candidate,
      role: 'potential' as const,
    })),
    ...explanatoryCandidates.map(candidate => ({
      ...candidate,
      role: 'excluded' as const,
      exclusionKind: 'explanation' as const,
    })),
    ...resultExclusions.map(candidate => ({
      ...candidate,
      role: 'excluded' as const,
      exclusionKind: 'result' as const,
    })),
    ...proof.placements.map(candidate => ({
      ...candidate,
      role: 'result' as const,
    })),
  ];

  const cellRolePriority: Readonly<Record<HintCellRole, number>> = {
    potential: 1,
    eliminationTarget: 2,
    established: 3,
    result: 4,
  };
  const cellRoles = new Map<CellIndex, HintCellRole>();
  const markCell = (cell: CellIndex, role: HintCellRole) => {
    const current = cellRoles.get(cell);
    if (!current || cellRolePriority[role] > cellRolePriority[current]) {
      cellRoles.set(cell, role);
    }
  };
  potentialCandidates.forEach(candidate =>
    markCell(candidate.cell, 'potential'),
  );
  excludedCandidates.forEach(candidate =>
    markCell(candidate.cell, 'eliminationTarget'),
  );
  const establishesPattern =
    proof.reason === 'pattern_constraint' ||
    proof.reason === 'chain_inference' ||
    (proof.kind === 'conclusion' && step.eliminations.length > 0);
  if (establishesPattern) {
    proof.focusCells.forEach(cell => markCell(cell, 'established'));
    if (proof.kind === 'conclusion') {
      step.focusCells.forEach(cell => markCell(cell, 'established'));
    }
  }
  proof.placements.forEach(placement => markCell(placement.cell, 'result'));

  return {
    regionMarks: regionMarksForProof(step, proof),
    cellMarks: Array.from(cellRoles, ([cell, role]) => ({ cell, role })),
    candidateMarks,
  };
}

function visualsForProof(
  step: HintStep,
  proof: HintProofStep,
  proofIndex: number,
): HintPageVisuals {
  const sceneMarks = sceneMarksForProof(step, proof, proofIndex);
  const potentialCandidates =
    sceneMarks.candidateMarks?.filter(mark => mark.role === 'potential') ?? [];
  const excludedCandidates =
    sceneMarks.candidateMarks?.filter(mark => mark.role === 'excluded') ?? [];
  return {
    showFocusCells: proof.focusCells.length > 0,
    showFocusRegions: proof.focusRegions.length > 0,
    showPremises: potentialCandidates.length > 0,
    showEliminations: excludedCandidates.length > 0,
    showPlacements: proof.placements.length > 0,
    focusCells: proof.focusCells,
    focusRegions: proof.focusRegions,
    premiseCandidates: potentialCandidates,
    valueEvidence: proof.valueEvidence,
    eliminations: excludedCandidates,
    placements: proof.placements,
    ...sceneMarks,
  };
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
    targetDigit: step.placements[0]?.digit ?? step.eliminations[0]?.digit ?? '',
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

  if (step.proofSteps && step.proofSteps.length >= 2) {
    return {
      techniqueName: template.name,
      nameKey: `technique.${step.techniqueCode}.name`,
      explanationKey: step.explanationKey,
      params,
      pages: step.proofSteps.map((proof, proofIndex) => {
        const body = proofBody(proof, template, params, applyBody);
        return {
          kind: proof.kind === 'conclusion' ? 'apply' : proof.kind,
          title: proofTitle(proof),
          body,
          accessibilitySummary: body,
          visuals: visualsForProof(step, proof, proofIndex),
        };
      }),
    };
  }

  const legacyObserve: HintProofStep = {
    kind: 'observe',
    reason:
      step.techniqueCode === 'nakedSingle' ? 'single_candidate' : 'scan_region',
    focusCells: [],
    focusRegions: step.focusRegions,
    premiseCandidates: [],
    valueEvidence: [],
    eliminations: [],
    placements: [],
  };
  const legacyReason: HintProofStep = {
    kind: 'reason',
    reason: 'pattern_constraint',
    focusCells: step.focusCells,
    focusRegions: step.focusRegions,
    premiseCandidates: step.premiseCandidates,
    valueEvidence: [],
    eliminations: step.eliminations,
    placements: step.placements,
  };
  const legacyConclusion: HintProofStep = {
    ...legacyReason,
    kind: 'conclusion',
    reason:
      step.placements.length > 0 ? 'forced_placement' : 'valid_elimination',
  };

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
        visuals: visualsForProof(step, legacyObserve, 0),
      },
      {
        kind: 'reason',
        title: 'What follows',
        body: resultBody,
        accessibilitySummary: resultBody,
        visuals: visualsForProof(step, legacyReason, 1),
      },
      {
        kind: 'apply',
        title: 'Apply one step',
        body: applyBody,
        accessibilitySummary: applyBody,
        visuals: visualsForProof(step, legacyConclusion, 2),
      },
    ],
  };
}
