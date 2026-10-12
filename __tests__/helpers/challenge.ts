import type { ChallengeLevel } from '../../src/domain/challenge/contracts';
import type { CandidateRef, Digit } from '../../src/domain/sudoku/contracts';
import { digitsFromMask } from '../../src/domain/sudoku/board';

export function challengeTarget(level: ChallengeLevel) {
  const cell = level.source.board_fingerprint.indexOf('0');
  return {
    cell,
    digit: Number(level.source.solution_fingerprint[cell]) as Digit,
  };
}

// The reported naked-pair position, used to exercise separate and combined edits.
export function compositeEdits(level: ChallengeLevel): readonly {
  target?: CandidateRef;
  snapshot: { step: { placements: readonly CandidateRef[] } };
}[] {
  const cell = 76;
  const digit = Number(level.source.solution_fingerprint[cell]) as Digit;
  return [
    ...digitsFromMask(level.source.candidate_masks[cell])
      .filter(value => value !== digit)
      .map(value => ({
        target: { cell, digit: value },
        snapshot: { step: { placements: [] } },
      })),
    { snapshot: { step: { placements: [{ cell, digit }] } } },
  ];
}
