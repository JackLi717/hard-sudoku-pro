import type { HintStep } from '../hints/contracts';
import type { HintWalkthroughSnapshot } from '../hints/walkthrough';
import {
  boxOf,
  columnOf,
  createBoardFingerprint,
  hasCandidate,
  rowOf,
} from '../sudoku/board';
import type { Board, CandidateRef, RegionRef } from '../sudoku/contracts';
import {
  practiceCandidatesBeforeMove,
  practiceRegionCells,
} from './practice-board';

export type LockedPointingSubmission =
  | { status: 'correct'; proof: HintWalkthroughSnapshot }
  | { status: 'incorrect' | 'not_pointing' };

/** Find a box whose candidate positions force this digit onto the target line. */
export function submitLockedPointing(
  initial: HintWalkthroughSnapshot,
  solutionFingerprint: string,
  values: Board,
  target: CandidateRef,
): LockedPointingSubmission {
  if (
    !/^[1-9]{81}$/.test(solutionFingerprint) ||
    values.length !== 81 ||
    !Number.isInteger(target.cell) ||
    target.cell < 0 ||
    target.cell >= 81 ||
    !Number.isInteger(target.digit) ||
    target.digit < 1 ||
    target.digit > 9 ||
    values[target.cell] !== null ||
    initial.values[target.cell] !== null ||
    solutionFingerprint[target.cell] === String(target.digit) ||
    values.some(
      (value, cell) =>
        value !== null && solutionFingerprint[cell] !== String(value),
    )
  )
    return { status: 'incorrect' };

  const masks = practiceCandidatesBeforeMove(initial, values);
  if (!hasCandidate(masks[target.cell], target.digit))
    return { status: 'incorrect' };

  const witness = Array.from({ length: 9 }, (_, index) => index)
    .filter(index => index !== boxOf(target.cell))
    .flatMap(index => {
      const box: RegionRef = { kind: 'box', index };
      const sources = practiceRegionCells(box).filter(
        cell =>
          values[cell] === null && hasCandidate(masks[cell], target.digit),
      );
      if (sources.length < 2) return [];
      const line: RegionRef | null = sources.every(
        cell => rowOf(cell) === rowOf(target.cell),
      )
        ? { kind: 'row', index: rowOf(target.cell) }
        : sources.every(cell => columnOf(cell) === columnOf(target.cell))
        ? { kind: 'column', index: columnOf(target.cell) }
        : null;
      return line ? [{ box, line, sources }] : [];
    })[0];
  if (!witness) return { status: 'not_pointing' };

  const premises = witness.sources.map(cell => ({
    cell,
    digit: target.digit,
  }));
  const regions = [witness.line, witness.box];
  const step: HintStep = {
    contractVersion: 1,
    boardFingerprint: createBoardFingerprint(values),
    techniqueCode: 'lockedCandidates.pointing',
    difficultyLevel: 2,
    focusCells: witness.sources,
    focusRegions: regions,
    premiseCandidates: premises,
    eliminations: [target],
    placements: [],
    teaching: { mode: '', givenCells: [], branches: [] },
    proofSteps: [
      {
        kind: 'observe',
        reason: 'scan_region',
        focusCells: [],
        focusRegions: regions,
        premiseCandidates: [],
        valueEvidence: [],
        eliminations: [],
        placements: [],
      },
      {
        kind: 'reason',
        reason: 'pattern_constraint',
        focusCells: witness.sources,
        focusRegions: regions,
        premiseCandidates: premises,
        valueEvidence: [],
        eliminations: [],
        placements: [],
      },
      {
        kind: 'conclusion',
        reason: 'valid_elimination',
        focusCells: witness.sources,
        focusRegions: regions,
        premiseCandidates: premises,
        valueEvidence: [],
        eliminations: [target],
        placements: [],
      },
    ],
    explanationKey: 'hint.lockedCandidates.pointing',
    explanationParams: {
      focusCellCount: witness.sources.length,
      focusCells: witness.sources.join(','),
      focusRegions: regions
        .map(region => `${region.kind}:${region.index}`)
        .join(','),
      premiseCandidates: premises
        .map(item => `${item.cell}:${item.digit}`)
        .join(','),
      eliminations: `${target.cell}:${target.digit}`,
      placements: '',
      resultCount: 1,
    },
  };
  return {
    status: 'correct',
    proof: {
      id: `${initial.id}:${target.cell}:${target.digit}`,
      values: [...values],
      givens: initial.givens,
      candidateMasks: masks,
      step,
    },
  };
}
