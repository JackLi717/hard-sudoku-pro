import { resolveCandidateVisualState } from '../src/ui/candidate-visual-state';

describe('candidate visual state', () => {
  test('uses the same neutral attention state for selection and hint focus', () => {
    expect(resolveCandidateVisualState({ selected: true })).toMatchObject({
      attentionSources: ['selection'],
      showAttention: true,
      showRing: false,
      showStrike: false,
    });
    expect(
      resolveCandidateVisualState({ focused: true, premise: true }),
    ).toMatchObject({
      attentionSources: ['hint-focus', 'premise'],
      showAttention: true,
      showRing: false,
      showStrike: false,
    });
  });

  test('replaces attention with a dashed ring for a provisional assumption', () => {
    expect(
      resolveCandidateVisualState({
        focused: true,
        reasoningMarks: [
          { cell: 0, digit: 6, role: 'assumption', truth: 'true' },
        ],
      }),
    ).toMatchObject({
      showAttention: false,
      showRing: true,
      ringKind: 'assumption',
      showStrike: false,
    });
  });

  test('uses a solid ring for a true consequence and a strike for falsehood', () => {
    expect(
      resolveCandidateVisualState({
        premise: true,
        reasoningMarks: [{ cell: 0, digit: 1, role: 'consequence' }],
      }),
    ).toMatchObject({
      showAttention: false,
      showRing: true,
      ringKind: 'consequence',
      showStrike: false,
    });
    expect(
      resolveCandidateVisualState({
        premise: true,
        reasoningMarks: [
          { cell: 0, digit: 1, role: 'consequence', truth: 'false' },
        ],
      }),
    ).toMatchObject({
      showAttention: false,
      showRing: false,
      showStrike: true,
    });
  });

  test('lets conflict override neutral attention', () => {
    expect(
      resolveCandidateVisualState({ focused: true, conflict: true }),
    ).toMatchObject({
      showAttention: false,
      conflict: true,
    });
  });
});
