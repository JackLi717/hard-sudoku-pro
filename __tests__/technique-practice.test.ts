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

test.each(['hiddenSingle', 'nakedPair', 'lockedCandidates.pointing'] as const)(
  '%s scenes use one board session and the registered rule',
  technique => {
    const scenes = practiceScenesFor(technique);
    expect(scenes.filter(item => item.role === 'demo')).toHaveLength(
      technique === 'lockedCandidates.pointing' ? 0 : 1,
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
      expect(evaluatePractice(scene, session).status).toBe('enter');
      expect(session.state.candidates.activeCandidateSource).toBe(
        rule.initialCandidates === 'verified' ? 'quick' : 'manual',
      );
      const target = (
        technique === 'hiddenSingle'
          ? scene.explanation.placements
          : scene.explanation.eliminations
      )[0];
      if (technique === 'hiddenSingle') {
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
      const result = evaluatePractice(scene, session);
      expect(result.status).toBe('correct');
      if (result.status !== 'correct') continue;
      expect(
        technique === 'hiddenSingle'
          ? result.proof.step.placements
          : result.proof.step.eliminations,
      ).toEqual([target]);
      for (const copy of Object.values(HINT_PRESENTATION_COPIES)) {
        expect(
          buildLessonPresentation(result.proof, copy).pages.length,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  },
);

test('bundled demonstrations and exercises retain complete explanations', () => {
  for (const technique of [
    'hiddenSingle',
    'nakedPair',
    'lockedCandidates.pointing',
  ] as const) {
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
