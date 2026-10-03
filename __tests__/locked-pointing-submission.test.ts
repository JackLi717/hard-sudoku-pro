import {
  practiceReferenceSnapshot,
  practiceScenesFor,
} from '../src/data/practice/practice-catalog';
import { buildLessonPresentation } from '../src/domain/lessons/presentation';
import { submitLockedPointing } from '../src/domain/practice/locked-pointing-submission';
import { digitsFromMask } from '../src/domain/sudoku/board';
import type { Digit } from '../src/domain/sudoku/contracts';
import { HINT_PRESENTATION_COPIES } from '../src/localization';

test('each Pointing exercise accepts its verified elimination and explains the actual target', () => {
  for (const scene of practiceScenesFor('lockedCandidates.pointing')) {
    const reference = practiceReferenceSnapshot(scene);
    const official = scene.explanation.eliminations[0];
    const result = submitLockedPointing(
      reference,
      scene.board.solutionFingerprint,
      reference.values,
      official,
    );
    expect(result.status).toBe('correct');
    if (result.status !== 'correct') continue;
    expect(result.proof.step.eliminations).toEqual([official]);
    for (const copy of Object.values(HINT_PRESENTATION_COPIES)) {
      const pages = buildLessonPresentation(result.proof, copy).pages;
      expect(pages.length).toBeGreaterThanOrEqual(2);
      expect(pages.at(-1)?.visuals.eliminations).toEqual([official]);
    }
  }
});

test('valid alternate Pointing eliminations are accepted, while solution candidates are rejected', () => {
  const scene = practiceScenesFor('lockedCandidates.pointing').find(
    item => item.explanation.eliminations.length > 1,
  )!;
  const reference = practiceReferenceSnapshot(scene);
  const official = scene.explanation.eliminations[0];
  const possible = reference.candidateMasks.flatMap((mask, cell) =>
    digitsFromMask(mask).map(digit => ({ cell, digit })),
  );
  const alternate = possible.find(
    target =>
      (target.cell !== official.cell || target.digit !== official.digit) &&
      submitLockedPointing(
        reference,
        scene.board.solutionFingerprint,
        reference.values,
        target,
      ).status === 'correct',
  );
  expect(alternate).toBeDefined();
  const result = submitLockedPointing(
    reference,
    scene.board.solutionFingerprint,
    reference.values,
    alternate!,
  );
  expect(result.status).toBe('correct');
  if (result.status === 'correct')
    expect(result.proof.step.eliminations).toEqual([alternate]);

  const answer = scene.explanation.eliminations[0];
  const solutionDigit = Number(
    scene.board.solutionFingerprint[answer.cell],
  ) as Digit;
  expect(
    submitLockedPointing(
      reference,
      scene.board.solutionFingerprint,
      reference.values,
      { cell: answer.cell, digit: solutionDigit },
    ),
  ).toEqual({ status: 'incorrect' });
});
