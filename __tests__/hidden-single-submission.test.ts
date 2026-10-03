import {
  practiceReferenceSnapshot,
  practiceScenesFor,
} from '../src/data/practice/practice-catalog';
import { submitHiddenSingle } from '../src/domain/practice/hidden-single-submission';
import { buildLessonPresentation } from '../src/domain/lessons/presentation';
import { HINT_PRESENTATION_COPIES } from '../src/localization';
import type { Digit } from '../src/domain/sudoku/contracts';

const scene = practiceScenesFor('hiddenSingle').find(
  item => item.id === 'hidden-single-3',
)!;

test('each listed exercise accepts its verified hidden single on the real starting board', () => {
  for (const exercise of practiceScenesFor('hiddenSingle').filter(
    item => item.role === 'exercise',
  )) {
    const snapshot = practiceReferenceSnapshot(exercise);
    const placement = snapshot.step.placements[0]!;
    expect(
      submitHiddenSingle(
        snapshot,
        exercise.board.solutionFingerprint,
        snapshot.values,
        placement,
      ).status,
    ).toBe('correct');
  }
});

test.each([
  [43, 4],
  [62, 5],
] as const)(
  'submitted hidden single %i=%i gets its own proof',
  (cell, digit) => {
    const result = submitHiddenSingle(
      practiceReferenceSnapshot(scene),
      scene.board.solutionFingerprint,
      scene.board.values,
      {
        cell,
        digit,
      },
    );
    expect(result.status).toBe('correct');
    if (result.status !== 'correct') return;
    expect(result.proof.step.placements).toEqual([{ cell, digit }]);
    for (const copy of Object.values(HINT_PRESENTATION_COPIES)) {
      const pages = buildLessonPresentation(result.proof, copy).pages;
      expect(pages.length).toBeGreaterThanOrEqual(2);
      expect(pages.at(-1)?.visuals.placements).toEqual([{ cell, digit }]);
    }
  },
);

test('a wrong value cannot manufacture a valid hidden single', () => {
  expect(
    submitHiddenSingle(
      practiceReferenceSnapshot(scene),
      scene.board.solutionFingerprint,
      scene.board.values,
      {
        cell: 62,
        digit: 4,
      },
    ),
  ).toEqual({ status: 'incorrect' });
  const wrongBoard = [...scene.board.values];
  wrongBoard[62] = 4 as Digit;
  expect(
    submitHiddenSingle(
      practiceReferenceSnapshot(scene),
      scene.board.solutionFingerprint,
      wrongBoard,
      {
        cell: 43,
        digit: 4,
      },
    ),
  ).toEqual({ status: 'incorrect' });
});
