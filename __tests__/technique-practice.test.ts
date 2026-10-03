import {
  practiceReferenceSnapshot,
  practiceScenesFor,
} from '../src/data/practice/practice-catalog';
import { validatePracticeAnswer } from '../src/domain/practice/validate-answer';
import { boxOf, columnOf, rowOf } from '../src/domain/sudoku/board';
import type { RegionRef } from '../src/domain/sudoku/contracts';
import { buildLessonPresentation } from '../src/domain/lessons/presentation';
import { HINT_PRESENTATION_COPIES } from '../src/localization';

function sharedRegion(cells: readonly number[]): RegionRef {
  for (const kind of ['row', 'column', 'box'] as const) {
    const indexOf =
      kind === 'row' ? rowOf : kind === 'column' ? columnOf : boxOf;
    if (cells.every(cell => indexOf(cell) === indexOf(cells[0])))
      return { kind, index: indexOf(cells[0]) };
  }
  throw new Error('No shared region');
}

test.each(['hiddenSingle', 'nakedPair'] as const)(
  '%s has a demonstration and independent exercises with valid answers',
  technique => {
    const scenes = practiceScenesFor(technique);
    expect(scenes[0].role).toBe('demo');
    expect(scenes.filter(item => item.role === 'demo')).toHaveLength(1);
    expect(
      scenes.filter(item => item.role === 'exercise').length,
    ).toBeGreaterThanOrEqual(3);
    for (const scene of scenes) {
      const snapshot = practiceReferenceSnapshot(scene);
      const { step } = snapshot;
      const target = (step.placements[0] ?? step.eliminations[0])!;
      const sources = technique === 'nakedPair' ? step.focusCells : [];
      const region =
        technique === 'hiddenSingle'
          ? step.focusRegions[0]
          : sharedRegion([...sources, target.cell]);
      expect(
        validatePracticeAnswer(snapshot, {
          region,
          sources,
          target,
        }),
      ).toBe('correct');
      expect(
        validatePracticeAnswer(snapshot, {
          region,
          sources,
          target: {
            cell: target.cell,
            digit: ((target.digit % 9) + 1) as typeof target.digit,
          },
        }),
      ).not.toBe('correct');
    }
  },
);

test('all practice scenes have a complete explanation in four languages', () => {
  for (const technique of ['hiddenSingle', 'nakedPair'] as const) {
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
