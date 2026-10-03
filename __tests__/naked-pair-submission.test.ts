import {
  practiceReferenceSnapshot,
  practiceScenesFor,
} from '../src/data/practice/practice-catalog';
import { buildLessonPresentation } from '../src/domain/lessons/presentation';
import { submitNakedPair } from '../src/domain/practice/naked-pair-submission';
import { digitsFromMask } from '../src/domain/sudoku/board';
import type { Digit } from '../src/domain/sudoku/contracts';
import { HINT_PRESENTATION_COPIES } from '../src/localization';

const scene = practiceScenesFor('nakedPair').find(
  item => item.id === 'naked-pair-1',
)!;
const reference = practiceReferenceSnapshot(scene);

test('the actual removed candidate gets its own valid explanation', () => {
  const official = scene.explanation.eliminations[0];
  const possible = reference.candidateMasks.flatMap((mask, cell) =>
    digitsFromMask(mask).map(digit => ({ cell, digit })),
  );
  const valid = possible.filter(
    target =>
      submitNakedPair(
        reference,
        scene.board.solutionFingerprint,
        reference.values,
        target,
      ).status === 'correct',
  );
  expect(valid).toContainEqual(official);
  const alternative = valid.find(
    target => target.cell !== official.cell || target.digit !== official.digit,
  );
  expect(alternative).toBeDefined();
  const result = submitNakedPair(
    reference,
    scene.board.solutionFingerprint,
    reference.values,
    alternative!,
  );
  expect(result.status).toBe('correct');
  if (result.status !== 'correct') return;
  expect(result.proof.step.eliminations).toEqual([alternative]);
  for (const copy of Object.values(HINT_PRESENTATION_COPIES)) {
    const pages = buildLessonPresentation(result.proof, copy).pages;
    expect(pages.length).toBeGreaterThanOrEqual(2);
    expect(pages.at(-1)?.visuals.eliminations).toEqual([alternative]);
  }
});

test('a removed solution candidate or incorrect supporting value is rejected', () => {
  const answer = scene.explanation.eliminations[0];
  const solutionDigit = Number(
    scene.board.solutionFingerprint[answer.cell],
  ) as Digit;
  expect(
    submitNakedPair(
      reference,
      scene.board.solutionFingerprint,
      reference.values,
      { cell: answer.cell, digit: solutionDigit },
    ),
  ).toEqual({ status: 'incorrect' });
  const wrongBoard = [...reference.values];
  wrongBoard[answer.cell] = 6;
  expect(
    submitNakedPair(
      reference,
      scene.board.solutionFingerprint,
      wrongBoard,
      answer,
    ),
  ).toEqual({ status: 'incorrect' });
});
