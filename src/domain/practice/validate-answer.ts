import { boxOf, columnOf, hasCandidate, rowOf } from '../sudoku/board';
import type { HintWalkthroughSnapshot } from '../hints/walkthrough';
import type { CandidateRef, RegionRef } from '../sudoku/contracts';

export type PracticeAnswer = {
  region: RegionRef;
  sources: readonly number[];
  target: CandidateRef;
};

function inRegion(cell: number, region: RegionRef): boolean {
  return region.kind === 'row'
    ? rowOf(cell) === region.index
    : region.kind === 'column'
    ? columnOf(cell) === region.index
    : boxOf(cell) === region.index;
}

/** Check the visible candidate state, so another valid deduction is accepted. */
export function validatePracticeAnswer(
  snapshot: HintWalkthroughSnapshot,
  answer: PracticeAnswer,
): 'correct' | 'evidence' | 'target' {
  const { values, candidateMasks, step } = snapshot;
  const { cell, digit } = answer.target;
  if (values[cell] !== null || !hasCandidate(candidateMasks[cell], digit))
    return 'target';
  if (step.techniqueCode === 'hiddenSingle') {
    if (!inRegion(cell, answer.region)) return 'evidence';
    const positions = values.reduce<number[]>((all, value, index) => {
      if (
        value === null &&
        inRegion(index, answer.region) &&
        hasCandidate(candidateMasks[index], digit)
      )
        all.push(index);
      return all;
    }, []);
    return positions.length === 1 && positions[0] === cell
      ? 'correct'
      : 'evidence';
  }
  if (step.techniqueCode === 'nakedPair') {
    const [first, second] = answer.sources;
    if (
      answer.sources.length !== 2 ||
      first === second ||
      first === cell ||
      second === cell ||
      !inRegion(first, answer.region) ||
      !inRegion(second, answer.region) ||
      !inRegion(cell, answer.region)
    )
      return 'evidence';
    const mask = candidateMasks[first];
    if (
      values[first] !== null ||
      values[second] !== null ||
      mask !== candidateMasks[second] ||
      mask.toString(2).replace(/0/g, '').length !== 2 ||
      values.some(
        (value, index) =>
          index !== first &&
          index !== second &&
          value === null &&
          inRegion(index, answer.region) &&
          candidateMasks[index] === mask,
      )
    )
      return 'evidence';
    return hasCandidate(mask, digit) ? 'correct' : 'target';
  }
  return 'evidence';
}
