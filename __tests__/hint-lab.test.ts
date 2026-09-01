import {
  HINT_LAB_FIXTURES,
  applyHintLabStep,
  createHintLabSession,
  undoHintLabStep,
} from '../src/debug/hint-lab';
import { TECHNIQUES, buildHintPresentation } from '../src/domain';

describe('Hint Lab fixture catalog', () => {
  test('contains one ordered, validated fixture for every technique', () => {
    expect(HINT_LAB_FIXTURES).toHaveLength(39);
    expect(HINT_LAB_FIXTURES.map(fixture => fixture.techniqueCode)).toEqual(
      TECHNIQUES.map(technique => technique.code),
    );
    expect(
      HINT_LAB_FIXTURES.reduce<Record<number, number>>((counts, fixture) => {
        counts[fixture.difficultyLevel] =
          (counts[fixture.difficultyLevel] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({ 1: 3, 2: 6, 3: 5, 4: 17, 5: 8 });
  });

  test.each(HINT_LAB_FIXTURES)(
    '$techniqueCode presents, applies and undoes its authentic fixture',
    fixture => {
      const presentation = buildHintPresentation(fixture.step);
      const initial = createHintLabSession(fixture, 1_000);

      expect(presentation.pages.length).toBeGreaterThanOrEqual(2);
      expect(presentation.pages[0].kind).toBe('observe');
      expect(presentation.pages.at(-1)?.kind).toBe('apply');
      expect(initial.state.activeHint?.techniqueCode).toBe(
        fixture.techniqueCode,
      );
      expect(initial.state.candidates.hintCandidates).toEqual(
        fixture.candidateMasks,
      );

      const applied = applyHintLabStep(fixture, initial, 2_000);
      expect(applied.state.activeHint).toBeNull();
      expect(applied.history).toHaveLength(1);

      const undone = undoHintLabStep(fixture, applied, 3_000);
      expect(undone.state.activeHint?.techniqueCode).toBe(
        fixture.techniqueCode,
      );
      expect(undone.history).toHaveLength(0);
      expect(undone.state.values).toEqual(initial.state.values);
      expect(undone.state.candidates.hintCandidates).toEqual(
        initial.state.candidates.hintCandidates,
      );
    },
  );
});
