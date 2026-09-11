import { TRANSLATIONS } from '../src/localization';
import { createResultPresentation } from '../src/ui/screens/result-presentation';
import type { ResultPresentationFacts } from '../src/ui/screens/result-presentation';

const baseFacts: ResultPresentationFacts = {
  sessionId: 'session-1',
  difficultyLevel: 4,
  completionKind: 'independent',
  isFirstCompletion: false,
  isNewLevelBest: false,
  totalCompletions: 7,
};

describe('result presentation', () => {
  test.each([
    [
      'new_best',
      {
        isNewLevelBest: true,
        isFirstCompletion: true,
        completionKind: 'perfect',
      },
    ],
    ['perfect', { isFirstCompletion: true, completionKind: 'perfect' }],
    ['first_completion', { isFirstCompletion: true }],
    ['independent', {}],
    ['hint_assisted', { completionKind: 'hint_assisted' }],
    ['generic', { completionKind: 'future_completion_kind' }],
  ] as const)('uses the %s title priority', (expected, overrides) => {
    expect(
      createResultPresentation({ ...baseFacts, ...overrides }).titleGroup,
    ).toBe(expected);
  });

  test('keeps perfect as one honor instead of duplicating independent', () => {
    const presentation = createResultPresentation({
      ...baseFacts,
      completionKind: 'perfect',
      isFirstCompletion: true,
      isNewLevelBest: true,
    });

    expect(presentation.honors.map(honor => honor.kind)).toEqual([
      'new_best',
      'first_completion',
      'perfect',
    ]);
    expect(presentation.honors).toHaveLength(3);
  });

  test.each([
    ['independent', ['independent']],
    ['hint_assisted', ['hint_assisted']],
    ['future_completion_kind', []],
  ] as const)('only reports provable %s honors', (completionKind, expected) => {
    expect(
      createResultPresentation({
        ...baseFacts,
        completionKind,
      }).honors.map(honor => honor.kind),
    ).toEqual(expected);
  });

  test('keeps copy stable for the same session while rotating across sessions', () => {
    const first = createResultPresentation(baseFacts);
    expect(createResultPresentation(baseFacts)).toEqual(first);

    const selectedKeys = new Set(
      Array.from(
        { length: 32 },
        (_, index) =>
          createResultPresentation({
            ...baseFacts,
            sessionId: `session-${index}`,
          }).encouragement.key,
      ),
    );
    expect(selectedKeys.size).toBeGreaterThan(1);
  });

  test('shows a stable quote only on every fourth post-settlement completion', () => {
    for (const totalCompletions of [0, 1, 2, 3, 5, 6, 7]) {
      expect(
        createResultPresentation({ ...baseFacts, totalCompletions }).quote,
      ).toBeNull();
    }
    const fourth = createResultPresentation({
      ...baseFacts,
      totalCompletions: 4,
    }).quote;
    expect(fourth).not.toBeNull();
    expect(
      createResultPresentation({ ...baseFacts, totalCompletions: 4 }).quote,
    ).toEqual(fourth);
    expect(
      createResultPresentation({ ...baseFacts, totalCompletions: 8 }).quote,
    ).not.toBeNull();
  });

  test('keeps all four locale key sets aligned', () => {
    const englishKeys = Object.keys(TRANSLATIONS.en).sort();
    for (const resource of Object.values(TRANSLATIONS)) {
      expect(Object.keys(resource).sort()).toEqual(englishKeys);
    }
  });
});
