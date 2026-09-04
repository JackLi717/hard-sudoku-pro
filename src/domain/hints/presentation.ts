import { CandidateRef, CellIndex, RegionRef } from '../sudoku/contracts';
import {
  HintProofStep,
  HintStep,
  ExplanationValue,
  validateHintStep,
} from './contracts';
import { TechniqueCode } from './techniques';

export type HintTechniqueTemplate = {
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

export type HintPresentationCopy = {
  techniques: Readonly<Record<TechniqueCode, HintTechniqueTemplate>>;
  candidateFallback: string;
  candidateEntry: string;
  candidateSeparator: string;
  digitFallback: string;
  cellFallback: string;
  regionFallback: string;
  regionRow: string;
  regionColumn: string;
  regionBox: string;
  regionSeparator: string;
  evidenceCandidates: string;
  evidenceValues: string;
  evidenceCells: string;
  progressRestrictedSet: string;
  progressFish: string;
  progressWing: string;
  progressRectangle: string;
  progressChain: string;
  progressGeneric: string;
  constraintPointing: string;
  constraintClaiming: string;
  constraintNakedSubset: string;
  constraintHiddenSubset: string;
  constraintFish: string;
  constraintStrongPairs: string;
  constraintWWing: string;
  constraintWing: string;
  constraintColoring: string;
  constraintRemotePair: string;
  constraintEmptyRectangle: string;
  constraintUniqueRectangle: string;
  constraintAvoidableRectangle: string;
  constraintBugPlusOne: string;
  constraintXChain: string;
  constraintXYChain: string;
  constraintAic: string;
  constraintForcingChain: string;
  constraintForcingNet: string;
  constraintSingle: string;
  singleCandidate: string;
  valueBlocksFallback: string;
  valueBlocks: string;
  titleObserve: string;
  titleConclusion: string;
  titleRuleOut: string;
  titleFollowLink: string;
  titleReason: string;
  titleApply: string;
  resultPlacement: string;
  resultElimination: string;
  applyPlacement: string;
  applyElimination: string;
  observeAccessibility: string;
};

export const ENGLISH_HINT_PRESENTATION_COPY: HintPresentationCopy = {
  techniques: ENGLISH_HINT_TEMPLATES,
  candidateFallback: 'the highlighted candidates',
  candidateEntry: '{digit} in {cell}',
  candidateSeparator: ', ',
  digitFallback: 'the highlighted digits',
  cellFallback: 'the highlighted cells',
  regionFallback: 'the highlighted area',
  regionRow: 'row {index}',
  regionColumn: 'column {index}',
  regionBox: 'box {index}',
  regionSeparator: ', ',
  evidenceCandidates: 'This page adds {premises}.',
  evidenceValues: 'The placed-value evidence is {evidence}.',
  evidenceCells: 'Focus on {cells}.',
  progressRestrictedSet:
    '{evidence} These candidates are part of the restricted digit set; keep them highlighted while the remaining subset evidence is added.',
  progressFish:
    '{evidence} These candidates identify one involved row-column crossing; keep it highlighted while the remaining fish positions are added.',
  progressWing:
    '{evidence} These candidates identify one part of the pivot-and-wing structure; keep it highlighted while the remaining wing evidence is added.',
  progressRectangle:
    '{evidence} These candidates identify part of the four-cell rectangle; keep them highlighted while the remaining corners are added.',
  progressChain:
    '{evidence} These candidates form the next link segment; keep it highlighted while the remaining chain evidence is added.',
  progressGeneric:
    '{evidence} Keep this part highlighted while the remaining {technique} evidence is added.',
  constraintPointing:
    '{evidence} Within the source box, digit {digits} is confined to {cells}, all on the intersecting line.',
  constraintClaiming:
    '{evidence} Within the source line, digit {digits} is confined to {cells}, all inside the intersecting box.',
  constraintNakedSubset:
    '{evidence} The highlighted cells in {regions} can contain only digits {digits}, so those digits are reserved for those cells.',
  constraintHiddenSubset:
    '{evidence} In {regions}, digits {digits} can appear only in the highlighted cells, so those cells are reserved for those digits.',
  constraintFish:
    '{evidence} For digit {digits}, the highlighted candidates are confined to matching crossing rows and columns, establishing the {technique} pattern.',
  constraintStrongPairs:
    '{evidence} These candidates for digit {digits} form two strong pairs joined by the highlighted intersection; at least one outer endpoint must be true.',
  constraintWWing:
    '{evidence} The matching bivalue cells are linked through a strong pair, so the shared outer candidate cannot be false in both wings.',
  constraintWing:
    '{evidence} Whichever value the pivot takes, one highlighted wing must contain their shared outer digit.',
  constraintColoring:
    '{evidence} Strong links for digit {digits} alternate truth values across the highlighted color components.',
  constraintRemotePair:
    '{evidence} The same two digits alternate along the highlighted bivalue chain, so its endpoints must take opposite values.',
  constraintEmptyRectangle:
    '{evidence} The box candidates for digit {digits} are confined to one row-column cross, which links the two highlighted outside candidates.',
  constraintUniqueRectangle:
    '{evidence} The highlighted rectangle would otherwise allow its two digits to swap and create a second solution.',
  constraintAvoidableRectangle:
    '{evidence} Together with the highlighted candidates, these entered values would complete a swappable rectangle and create a second solution.',
  constraintBugPlusOne:
    '{evidence} Every other unsolved cell is bivalue; the highlighted extra candidate is the only way to restore the required row, column and box candidate counts.',
  constraintXChain:
    '{evidence} Candidates for digit {digits} alternate through strong and weak links; if one endpoint is false, the other endpoint must be true.',
  constraintXYChain:
    '{evidence} Each bivalue cell passes the implication to the next cell, so one of the matching endpoint digits must be true.',
  constraintAic:
    '{evidence} Following the alternating weak and strong links makes one of the highlighted endpoints unavoidable.',
  constraintForcingChain:
    '{evidence} This branch propagates forced candidates and reaches the same highlighted conclusion as the other branch.',
  constraintForcingNet:
    '{evidence} This branch of the net propagates forced candidates; every possible branch converges on the same highlighted conclusion.',
  constraintSingle:
    '{evidence} The highlighted evidence establishes the {technique} result.',
  singleCandidate: '{cells} has only {candidates} left.',
  valueBlocksFallback: 'A placed value rules out the highlighted cells.',
  valueBlocks: '{digit} at {evidenceCell} rules out {digit} from {focusCells}.',
  titleObserve: 'Where to look',
  titleConclusion: 'Conclusion',
  titleRuleOut: 'Rule out one group',
  titleFollowLink: 'Follow the link',
  titleReason: 'What follows',
  titleApply: 'Apply one step',
  resultPlacement: '{placements} is forced by this pattern.',
  resultElimination:
    '{eliminations} can be removed because it cannot be true in this pattern.',
  applyPlacement:
    'Apply this step to place {placements}. It remains one undoable move.',
  applyElimination:
    'Apply this step to remove {eliminations}. All removals remain one undoable move.',
  observeAccessibility: 'Observe {regions}. {premises}.',
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

function formatCandidates(
  candidates: readonly CandidateRef[],
  copy: HintPresentationCopy,
): string {
  if (candidates.length === 0) {
    return copy.candidateFallback;
  }
  return candidates
    .map(candidate =>
      interpolate(copy.candidateEntry, {
        digit: candidate.digit,
        cell: formatCell(candidate.cell),
      }),
    )
    .join(copy.candidateSeparator);
}

function formatCandidateDigits(
  candidates: readonly CandidateRef[],
  copy: HintPresentationCopy,
): string {
  const digits = Array.from(
    new Set(candidates.map(candidate => candidate.digit)),
  ).sort((left, right) => left - right);
  return digits.length > 0
    ? digits.join(copy.candidateSeparator)
    : copy.digitFallback;
}

function patternEvidence(
  proof: HintProofStep,
  copy: HintPresentationCopy,
): string {
  if (proof.premiseCandidates.length > 0) {
    return interpolate(copy.evidenceCandidates, {
      premises: formatCandidates(proof.premiseCandidates, copy),
    });
  }
  if (proof.valueEvidence.length > 0) {
    return interpolate(copy.evidenceValues, {
      evidence: formatCandidates(proof.valueEvidence, copy),
    });
  }
  return interpolate(copy.evidenceCells, {
    cells: formatCells(proof.focusCells, copy),
  });
}

function patternConstraintBody(
  step: HintStep,
  proof: HintProofStep,
  template: HintTechniqueTemplate,
  progress: { index: number; total: number },
  copy: HintPresentationCopy,
): string {
  const evidence = patternEvidence(proof, copy);
  const digits = formatCandidateDigits(
    [...proof.premiseCandidates, ...proof.valueEvidence],
    copy,
  );
  const cells = formatCells(proof.focusCells, copy);
  const regions = formatRegions(proof.focusRegions, copy);
  const constraintParams = {
    evidence,
    digits,
    cells,
    regions,
    technique: template.name,
  };

  if (progress.total > 1 && progress.index < progress.total - 1) {
    switch (step.techniqueCode) {
      case 'lockedPair':
      case 'lockedTriple':
      case 'nakedPair':
      case 'nakedTriple':
      case 'nakedQuad':
      case 'hiddenPair':
      case 'hiddenTriple':
      case 'hiddenQuad':
        return interpolate(copy.progressRestrictedSet, constraintParams);
      case 'xWing':
      case 'swordfish':
      case 'finnedXWing':
      case 'sashimiXWing':
      case 'jellyfish':
        return interpolate(copy.progressFish, constraintParams);
      case 'wWing':
      case 'xyWing':
      case 'xyzWing':
        return interpolate(copy.progressWing, constraintParams);
      case 'hiddenRectangle':
      case 'avoidableRectangle':
      case 'uniqueRectangle':
        return interpolate(copy.progressRectangle, constraintParams);
      case 'simpleColoring':
      case 'multiColoring':
      case 'remotePair':
      case 'xChain':
      case 'xyChain':
      case 'aic':
      case 'groupedAic':
      case 'complexColoring':
      case 'forcingChain':
      case 'forcingNet':
        return interpolate(copy.progressChain, constraintParams);
      default:
        return interpolate(copy.progressGeneric, constraintParams);
    }
  }

  switch (step.techniqueCode) {
    case 'lockedCandidates.pointing':
      return interpolate(copy.constraintPointing, constraintParams);
    case 'lockedCandidates.claiming':
      return interpolate(copy.constraintClaiming, constraintParams);
    case 'lockedPair':
    case 'lockedTriple':
    case 'nakedPair':
    case 'nakedTriple':
    case 'nakedQuad':
      return interpolate(copy.constraintNakedSubset, constraintParams);
    case 'hiddenPair':
    case 'hiddenTriple':
    case 'hiddenQuad':
      return interpolate(copy.constraintHiddenSubset, constraintParams);
    case 'xWing':
    case 'swordfish':
    case 'finnedXWing':
    case 'sashimiXWing':
    case 'jellyfish':
      return interpolate(copy.constraintFish, constraintParams);
    case 'skyscraper':
    case 'twoStringKite':
    case 'turbotFish':
      return interpolate(copy.constraintStrongPairs, constraintParams);
    case 'wWing':
      return interpolate(copy.constraintWWing, constraintParams);
    case 'xyWing':
    case 'xyzWing':
      return interpolate(copy.constraintWing, constraintParams);
    case 'simpleColoring':
    case 'multiColoring':
    case 'complexColoring':
      return interpolate(copy.constraintColoring, constraintParams);
    case 'remotePair':
      return interpolate(copy.constraintRemotePair, constraintParams);
    case 'emptyRectangle':
      return interpolate(copy.constraintEmptyRectangle, constraintParams);
    case 'hiddenRectangle':
    case 'uniqueRectangle':
      return interpolate(copy.constraintUniqueRectangle, constraintParams);
    case 'avoidableRectangle':
      return interpolate(copy.constraintAvoidableRectangle, constraintParams);
    case 'bugPlusOne':
      return interpolate(copy.constraintBugPlusOne, constraintParams);
    case 'xChain':
      return interpolate(copy.constraintXChain, constraintParams);
    case 'xyChain':
      return interpolate(copy.constraintXYChain, constraintParams);
    case 'aic':
    case 'groupedAic':
      return interpolate(copy.constraintAic, constraintParams);
    case 'forcingChain':
      return interpolate(copy.constraintForcingChain, constraintParams);
    case 'forcingNet':
      return interpolate(copy.constraintForcingNet, constraintParams);
    case 'fullHouse':
    case 'nakedSingle':
    case 'hiddenSingle':
      return interpolate(copy.constraintSingle, constraintParams);
  }
}

function formatCells(
  cells: readonly CellIndex[],
  copy: HintPresentationCopy,
): string {
  if (cells.length === 0) {
    return copy.cellFallback;
  }
  return cells.map(formatCell).join(copy.candidateSeparator);
}

function formatRegions(
  regions: readonly RegionRef[],
  copy: HintPresentationCopy,
): string {
  if (regions.length === 0) {
    return copy.regionFallback;
  }
  return regions
    .map(region => {
      const template =
        region.kind === 'box'
          ? copy.regionBox
          : region.kind === 'row'
          ? copy.regionRow
          : copy.regionColumn;
      return interpolate(template, { index: region.index + 1 });
    })
    .join(copy.regionSeparator);
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
  step: HintStep,
  proof: HintProofStep,
  template: HintTechniqueTemplate,
  params: Readonly<Record<string, ExplanationValue>>,
  applyBody: string,
  progress: { index: number; total: number },
  copy: HintPresentationCopy,
): string {
  switch (proof.reason) {
    case 'scan_region':
      return interpolate(template.observe, {
        ...params,
        regions: formatRegions(proof.focusRegions, copy),
      });
    case 'single_candidate':
      return interpolate(copy.singleCandidate, {
        cells: formatCells(proof.focusCells, copy),
        candidates: formatCandidates(proof.premiseCandidates, copy),
      });
    case 'value_blocks_cells': {
      const evidence = proof.valueEvidence[0];
      if (!evidence) {
        return copy.valueBlocksFallback;
      }
      return interpolate(copy.valueBlocks, {
        digit: evidence.digit,
        evidenceCell: formatCell(evidence.cell),
        focusCells: formatCells(proof.focusCells, copy),
      });
    }
    case 'pattern_constraint':
      return patternConstraintBody(step, proof, template, progress, copy);
    case 'chain_inference':
      return patternConstraintBody(step, proof, template, progress, copy);
    case 'forced_placement':
    case 'valid_elimination':
      return applyBody;
  }
}

function proofTitle(proof: HintProofStep, copy: HintPresentationCopy): string {
  if (proof.kind === 'observe') {
    return copy.titleObserve;
  }
  if (proof.kind === 'conclusion') {
    return copy.titleConclusion;
  }
  if (proof.reason === 'value_blocks_cells') {
    return copy.titleRuleOut;
  }
  if (proof.reason === 'chain_inference') {
    return copy.titleFollowLink;
  }
  return copy.titleReason;
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

export function buildHintPresentation(
  step: HintStep,
  copy: HintPresentationCopy = ENGLISH_HINT_PRESENTATION_COPY,
  mode: 'game' | 'replay' = 'game',
): HintPresentation {
  const validationErrors = validateHintStep(step);
  if (validationErrors.length > 0) {
    throw new Error(
      `Cannot present an invalid hint: ${validationErrors.join('; ')}`,
    );
  }

  const template = copy.techniques[step.techniqueCode];
  const placements = formatCandidates(step.placements, copy);
  const eliminations = formatCandidates(step.eliminations, copy);
  const params: Readonly<Record<string, ExplanationValue>> = {
    regions: formatRegions(step.focusRegions, copy),
    focusCells: step.focusCells.map(formatCell).join(', '),
    premises: formatCandidates(step.premiseCandidates, copy),
    eliminations,
    placements,
    resultCount: step.eliminations.length + step.placements.length,
    targetDigit: step.placements[0]?.digit ?? step.eliminations[0]?.digit ?? '',
    ...step.explanationParams,
  };
  const resultBody =
    step.placements.length > 0
      ? interpolate(copy.resultPlacement, { placements })
      : interpolate(copy.resultElimination, { eliminations });
  const applyBody =
    mode === 'replay'
      ? resultBody
      : step.placements.length > 0
      ? interpolate(copy.applyPlacement, { placements })
      : interpolate(copy.applyElimination, { eliminations });

  if (step.proofSteps && step.proofSteps.length >= 2) {
    const structuralProofs = step.proofSteps.filter(
      proof =>
        proof.reason === 'pattern_constraint' ||
        proof.reason === 'chain_inference',
    );
    return {
      techniqueName: template.name,
      nameKey: `technique.${step.techniqueCode}.name`,
      explanationKey: step.explanationKey,
      params,
      pages: step.proofSteps.map((proof, proofIndex) => {
        const structuralIndex = structuralProofs.indexOf(proof);
        const body = proofBody(
          step,
          proof,
          template,
          params,
          applyBody,
          {
            index: structuralIndex,
            total: structuralProofs.length,
          },
          copy,
        );
        return {
          kind: proof.kind === 'conclusion' ? 'apply' : proof.kind,
          title: proofTitle(proof, copy),
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
        title: copy.titleObserve,
        body: interpolate(template.observe, params),
        accessibilitySummary: interpolate(copy.observeAccessibility, params),
        visuals: visualsForProof(step, legacyObserve, 0),
      },
      {
        kind: 'reason',
        title: copy.titleReason,
        body: resultBody,
        accessibilitySummary: resultBody,
        visuals: visualsForProof(step, legacyReason, 1),
      },
      {
        kind: 'apply',
        title: mode === 'replay' ? copy.titleConclusion : copy.titleApply,
        body: applyBody,
        accessibilitySummary: applyBody,
        visuals: visualsForProof(step, legacyConclusion, 2),
      },
    ],
  };
}
