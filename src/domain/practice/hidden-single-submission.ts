import type { HintStep } from '../hints/contracts';
import type { HintWalkthroughSnapshot } from '../hints/walkthrough';
import {
  boxOf,
  columnOf,
  createBoardFingerprint,
  hasCandidate,
  rowOf,
} from '../sudoku/board';
import type {
  Board,
  CandidateGrid,
  CandidateRef,
  RegionRef,
} from '../sudoku/contracts';
import {
  practiceCandidatesBeforeMove,
  practiceRegionCells,
} from './practice-board';

export type HiddenSingleSubmission =
  | { status: 'correct'; proof: HintWalkthroughSnapshot }
  | { status: 'incorrect' | 'not_hidden_single' };

function witnessRegion(
  values: Board,
  masks: CandidateGrid,
  target: CandidateRef,
): RegionRef | null {
  const regions: RegionRef[] = [
    { kind: 'row', index: rowOf(target.cell) },
    { kind: 'column', index: columnOf(target.cell) },
    { kind: 'box', index: boxOf(target.cell) },
  ];
  return (
    regions.find(region => {
      const possible = practiceRegionCells(region).filter(
        cell =>
          values[cell] === null && hasCandidate(masks[cell], target.digit),
      );
      return possible.length === 1 && possible[0] === target.cell;
    }) ?? null
  );
}

function proofStep(
  kind: 'observe' | 'reason' | 'conclusion',
  reason: 'scan_region' | 'pattern_constraint' | 'forced_placement',
  region: RegionRef,
  target?: CandidateRef,
): NonNullable<HintStep['proofSteps']>[number] {
  return {
    kind,
    reason,
    focusCells: target ? [target.cell] : [],
    focusRegions: [region],
    premiseCandidates: target ? [target] : [],
    valueEvidence: [],
    eliminations: [],
    placements: kind === 'conclusion' && target ? [target] : [],
  };
}

/** The explanation is built for the actual submitted move, never a catalog target. */
export function submitHiddenSingle(
  initial: HintWalkthroughSnapshot,
  solutionFingerprint: string,
  beforeValues: Board,
  target: CandidateRef,
): HiddenSingleSubmission {
  if (
    !/^[1-9]{81}$/.test(solutionFingerprint) ||
    beforeValues.length !== 81 ||
    beforeValues[target.cell] !== null ||
    initial.values[target.cell] !== null ||
    solutionFingerprint[target.cell] !== String(target.digit) ||
    beforeValues.some(
      (value, cell) =>
        value !== null && solutionFingerprint[cell] !== String(value),
    )
  )
    return { status: 'incorrect' };

  const masks = practiceCandidatesBeforeMove(initial, beforeValues);
  if (!hasCandidate(masks[target.cell], target.digit))
    return { status: 'incorrect' };
  const region = witnessRegion(beforeValues, masks, target);
  if (!region) return { status: 'not_hidden_single' };

  const fingerprint = createBoardFingerprint(beforeValues);
  const step: HintStep = {
    contractVersion: 1,
    boardFingerprint: fingerprint,
    techniqueCode: 'hiddenSingle',
    difficultyLevel: 1,
    focusCells: [target.cell],
    focusRegions: [region],
    premiseCandidates: [target],
    eliminations: [],
    placements: [target],
    teaching: { mode: '', givenCells: [], branches: [] },
    proofSteps: [
      proofStep('observe', 'scan_region', region),
      proofStep('reason', 'pattern_constraint', region, target),
      proofStep('conclusion', 'forced_placement', region, target),
    ],
    explanationKey: 'hint.hiddenSingle',
    explanationParams: {
      focusCellCount: 1,
      focusCells: String(target.cell),
      focusRegions: `${region.kind}:${region.index}`,
      premiseCandidates: `${target.cell}:${target.digit}`,
      eliminations: '',
      placements: `${target.cell}:${target.digit}`,
      resultCount: 1,
    },
  };
  return {
    status: 'correct',
    proof: {
      id: `${initial.id}:${target.cell}:${target.digit}`,
      values: [...beforeValues],
      givens: initial.givens,
      candidateMasks: masks,
      step,
    },
  };
}
