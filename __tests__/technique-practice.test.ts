jest.mock('../src/native/NativeHintEngine', () => ({
  __esModule: true,
  default: { enumerateSteps: jest.fn(), cancel: jest.fn() },
}));

import { DEFAULT_PRODUCT_PREFERENCES } from '../src/application/app/product-preferences';
import {
  evaluatePractice,
  hasPracticeAnswer,
  practiceRuleFor,
} from '../src/application/practice/practice-evaluator';
import {
  createPracticeGameSession,
  practiceDefinition,
} from '../src/application/practice/practice-session';
import {
  practiceReferenceSnapshot,
  practiceScenesFor,
} from '../src/data/practice/practice-catalog';
import { dispatchGameCommand } from '../src/domain/game/engine';
import { buildLessonPresentation } from '../src/domain/lessons/presentation';
import { HINT_PRESENTATION_COPIES } from '../src/localization';
import { TECHNIQUES } from '../src/domain/hints/techniques';
import NativeHintEngine from '../src/native/NativeHintEngine';
import { digitsFromMask } from '../src/domain/sudoku/board';

const PRACTICE_TECHNIQUES = TECHNIQUES.filter(item => item.level <= 3).map(
  item => item.code,
);

test.each(PRACTICE_TECHNIQUES)(
  '%s scenes use one board session and the registered rule',
  async technique => {
    const scenes = practiceScenesFor(technique);
    expect(scenes.filter(item => item.role === 'demo')).toHaveLength(
      technique === 'hiddenSingle' || technique === 'nakedPair' ? 1 : 0,
    );
    expect(scenes.filter(item => item.role === 'exercise')).toHaveLength(3);
    const rule = practiceRuleFor(technique);
    for (const scene of scenes) {
      const definition = practiceDefinition(scene);
      let session = createPracticeGameSession(
        scene,
        DEFAULT_PRODUCT_PREFERENCES,
        1000,
      );
      expect(hasPracticeAnswer(scene, session)).toBe(false);
      expect((await evaluatePractice(scene, session)).status).toBe('enter');
      expect(session.state.candidates.activeCandidateSource).toBe(
        rule.initialCandidates === 'verified' ? 'quick' : 'manual',
      );
      const target = (
        rule.answerKind === 'placement'
          ? scene.explanation.placements
          : scene.explanation.eliminations
      )[0];
      if (rule.answerKind === 'placement') {
        session = dispatchGameCommand(session, definition, {
          type: 'select_cell',
          cell: target.cell,
          atEpochMs: 1001,
        }).session;
        session = dispatchGameCommand(session, definition, {
          type: 'input_digit',
          digit: target.digit,
          moveId: `test:${scene.id}`,
          atEpochMs: 1002,
        }).session;
      } else {
        session = dispatchGameCommand(session, definition, {
          type: 'edit_candidates',
          cells: [target.cell],
          candidates: [target.digit],
          action: 'remove',
          source: 'quick',
          moveId: `test:${scene.id}`,
          atEpochMs: 1002,
        }).session;
      }
      expect(hasPracticeAnswer(scene, session)).toBe(true);
      const result = await evaluatePractice(scene, session);
      expect(result.status).toBe('correct');
      if (result.status !== 'correct') continue;
      expect(
        rule.answerKind === 'placement'
          ? result.proof.step.placements
          : result.proof.step.eliminations,
      ).toContainEqual(target);
      for (const copy of Object.values(HINT_PRESENTATION_COPIES)) {
        expect(
          buildLessonPresentation(
            result.proof,
            copy,
            rule.answerKind === 'elimination' ? result.target : undefined,
          ).pages.length,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  },
);

test('bundled demonstrations and exercises retain complete explanations', () => {
  for (const technique of PRACTICE_TECHNIQUES) {
    for (const scene of practiceScenesFor(technique)) {
      for (const copy of Object.values(HINT_PRESENTATION_COPIES)) {
        const presentation = buildLessonPresentation(
          practiceReferenceSnapshot(scene),
          copy,
        );
        expect(presentation.pages.length).toBeGreaterThanOrEqual(2);
      }
    }
  }
});

test('an alternate removal waits for a complete native verdict', async () => {
  const scene = practiceScenesFor('xWing').find(
    item => item.role === 'exercise',
  )!;
  const target = scene.board.candidateMasks
    .flatMap((mask, cell) =>
      digitsFromMask(mask).map(digit => ({ cell, digit })),
    )
    .find(
      candidate =>
        scene.board.solutionFingerprint[candidate.cell] !==
          String(candidate.digit) &&
        !scene.explanation.eliminations.some(
          effect =>
            effect.cell === candidate.cell && effect.digit === candidate.digit,
        ),
    )!;
  const definition = practiceDefinition(scene);
  let session = createPracticeGameSession(
    scene,
    DEFAULT_PRODUCT_PREFERENCES,
    1000,
  );
  session = dispatchGameCommand(session, definition, {
    type: 'edit_candidates',
    cells: [target.cell],
    candidates: [target.digit],
    action: 'remove',
    source: 'quick',
    moveId: `test:${scene.id}`,
    atEpochMs: 1002,
  }).session;
  (NativeHintEngine.enumerateSteps as jest.Mock).mockImplementation(
    async (_id, board, candidates, givens) =>
      JSON.stringify({
        board,
        snapshotKey: `${board}|${candidates}|${givens}`,
        complete: false,
        steps: [],
      }),
  );
  expect((await evaluatePractice(scene, session)).status).toBe('unavailable');
  (NativeHintEngine.enumerateSteps as jest.Mock).mockImplementation(
    async (_id, board, candidates, givens) =>
      JSON.stringify({
        board,
        snapshotKey: `${board}|${candidates}|${givens}`,
        complete: true,
        steps: [],
      }),
  );
  expect((await evaluatePractice(scene, session)).status).toBe('other');
});

test.each(['fullHouse', 'xWing'] as const)(
  '%s rejects a conflicting board answer',
  async technique => {
    const scene = practiceScenesFor(technique).find(
      item => item.role === 'exercise',
    )!;
    const definition = practiceDefinition(scene);
    let session = createPracticeGameSession(
      scene,
      DEFAULT_PRODUCT_PREFERENCES,
      1000,
    );
    if (technique === 'fullHouse') {
      const cell = scene.explanation.placements[0].cell;
      const correct = Number(scene.board.solutionFingerprint[cell]);
      const wrong = correct === 9 ? 1 : correct + 1;
      session = dispatchGameCommand(session, definition, {
        type: 'select_cell',
        cell,
        atEpochMs: 1001,
      }).session;
      session = dispatchGameCommand(session, definition, {
        type: 'input_digit',
        digit: wrong,
        moveId: 'test:wrong',
        atEpochMs: 1002,
      }).session;
    } else {
      const cell = scene.board.candidateMasks.findIndex((mask, index) =>
        digitsFromMask(mask).includes(
          Number(scene.board.solutionFingerprint[index]),
        ),
      );
      expect(cell).toBeGreaterThanOrEqual(0);
      session = dispatchGameCommand(session, definition, {
        type: 'edit_candidates',
        cells: [cell],
        candidates: [Number(scene.board.solutionFingerprint[cell])],
        action: 'remove',
        source: 'quick',
        moveId: 'test:wrong',
        atEpochMs: 1002,
      }).session;
    }
    expect((await evaluatePractice(scene, session)).status).toBe('incorrect');
  },
);
