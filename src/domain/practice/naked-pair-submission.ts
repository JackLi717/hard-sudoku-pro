import type { HintStep } from '../hints/contracts';
import type { HintWalkthroughSnapshot } from '../hints/walkthrough';
import {
  boxOf,
  columnOf,
  createBoardFingerprint,
  digitsFromMask,
  hasCandidate,
  rowOf,
} from '../sudoku/board';
import type { Board, CandidateRef, RegionRef } from '../sudoku/contracts';
import {
  practiceCandidatesBeforeMove,
  practiceRegionCells,
} from './practice-board';

export type NakedPairSubmission =
  | { status: 'correct'; proof: HintWalkthroughSnapshot }
  | { status: 'incorrect' | 'not_naked_pair' };

/** Judge the removed candidate against the verified starting candidates. */
export function submitNakedPair(
  initial: HintWalkthroughSnapshot,
  solutionFingerprint: string,
  values: Board,
  target: CandidateRef,
): NakedPairSubmission {
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

  const regions: RegionRef[] = [
    { kind: 'row', index: rowOf(target.cell) },
    { kind: 'column', index: columnOf(target.cell) },
    { kind: 'box', index: boxOf(target.cell) },
  ];
  const witness = regions
    .map(region => {
      const cells = practiceRegionCells(region).filter(
        cell =>
          cell !== target.cell &&
          values[cell] === null &&
          digitsFromMask(masks[cell]).length === 2 &&
          hasCandidate(masks[cell], target.digit),
      );
      const pair = cells.find(first =>
        cells.some(
          second =>
            second !== first &&
            masks[second] === masks[first] &&
            cells.filter(cell => masks[cell] === masks[first]).length === 2,
        ),
      );
      return pair === undefined
        ? null
        : {
            region,
            sources: cells.filter(cell => masks[cell] === masks[pair]),
          };
    })
    .find(result => result !== null);
  if (!witness) return { status: 'not_naked_pair' };

  const premises = witness.sources.flatMap(cell =>
    digitsFromMask(masks[cell]).map(digit => ({ cell, digit })),
  );
  const step: HintStep = {
    contractVersion: 1,
    boardFingerprint: createBoardFingerprint(values),
    techniqueCode: 'nakedPair',
    difficultyLevel: 2,
    focusCells: witness.sources,
    focusRegions: [witness.region],
    premiseCandidates: premises,
    eliminations: [target],
    placements: [],
    teaching: { mode: '', givenCells: [], branches: [] },
    proofSteps: [
      {
        kind: 'observe',
        reason: 'scan_region',
        focusCells: [],
        focusRegions: [witness.region],
        premiseCandidates: [],
        valueEvidence: [],
        eliminations: [],
        placements: [],
      },
      {
        kind: 'reason',
        reason: 'pattern_constraint',
        focusCells: witness.sources,
        focusRegions: [witness.region],
        premiseCandidates: premises,
        valueEvidence: [],
        eliminations: [],
        placements: [],
      },
      {
        kind: 'conclusion',
        reason: 'valid_elimination',
        focusCells: witness.sources,
        focusRegions: [witness.region],
        premiseCandidates: premises,
        valueEvidence: [],
        eliminations: [target],
        placements: [],
      },
    ],
    explanationKey: 'hint.nakedPair',
    explanationParams: {
      focusCellCount: 2,
      focusCells: witness.sources.join(','),
      focusRegions: `${witness.region.kind}:${witness.region.index}`,
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
