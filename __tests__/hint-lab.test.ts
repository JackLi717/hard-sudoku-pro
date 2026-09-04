import {
  HINT_LAB_FIXTURES,
  applyHintLabStep,
  createHintLabSession,
  undoHintLabStep,
} from '../src/debug/hint-lab';
import { TECHNIQUES, buildHintPresentation } from '../src/domain';
import { HINT_PRESENTATION_COPIES } from '../src/localization';

describe('Hint Lab fixture catalog', () => {
  test.each(Object.entries(HINT_PRESENTATION_COPIES))(
    '%s provides complete localized copy for every authentic fixture',
    (_locale, copy) => {
      expect(Object.keys(copy.techniques)).toEqual(
        TECHNIQUES.map(technique => technique.code),
      );
      for (const fixture of HINT_LAB_FIXTURES) {
        const presentation = buildHintPresentation(fixture.step, copy);
        expect(presentation.techniqueName.length).toBeGreaterThan(0);
        expect(presentation.pages.length).toBeGreaterThanOrEqual(2);
        for (const page of presentation.pages) {
          expect(page.title.length).toBeGreaterThan(0);
          expect(page.body.length).toBeGreaterThan(0);
          expect(page.accessibilitySummary.length).toBeGreaterThan(0);
          expect(page.body).not.toMatch(/\{[a-zA-Z]+\}/);
          expect(page.accessibilitySummary).not.toMatch(/\{[a-zA-Z]+\}/);
        }
      }
    },
  );

  test('renders hidden-single reasoning in each supported product language', () => {
    const fixture = HINT_LAB_FIXTURES.find(
      item => item.techniqueCode === 'hiddenSingle',
    );
    expect(fixture).toBeDefined();

    const expected = {
      en: ['Hidden Single', 'Where to look'],
      ja: ['ヒドゥンシングル', '注目する場所'],
      de: ['Versteckter Single', 'Wo du suchen solltest'],
      'zh-Hans': ['隐性唯一数', '观察位置'],
    } as const;
    for (const [locale, copy] of Object.entries(HINT_PRESENTATION_COPIES)) {
      const presentation = buildHintPresentation(fixture!.step, copy);
      expect([presentation.techniqueName, presentation.pages[0].title]).toEqual(
        expected[locale as keyof typeof expected],
      );
    }

    const chinese = buildHintPresentation(
      fixture!.step,
      HINT_PRESENTATION_COPIES['zh-Hans'],
    );
    expect(chinese.pages[0].body).toContain('观察数字');
    expect(chinese.pages[1].body).toContain('排除了');
    expect(chinese.pages.at(-1)?.body).toContain('应用这一步');
    expect(chinese.pages.some(page => page.body.includes('rules out'))).toBe(
      false,
    );
  });

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

  test.each(
    HINT_LAB_FIXTURES.filter(
      fixture => fixture.techniqueCode !== 'twoStringKite',
    ),
  )(
    '$techniqueCode explains every structural inference with page-local evidence',
    fixture => {
      const presentation = buildHintPresentation(fixture.step);
      const structuralIndexes =
        fixture.step.proofSteps
          ?.map((proof, index) => ({ proof, index }))
          .filter(
            ({ proof }) =>
              proof.reason === 'pattern_constraint' ||
              proof.reason === 'chain_inference',
          ) ?? [];

      fixture.step.proofSteps?.forEach((proof, index) => {
        if (
          proof.reason !== 'pattern_constraint' &&
          proof.reason !== 'chain_inference'
        ) {
          return;
        }

        const page = presentation.pages[index];
        expect(page.body).not.toBe(
          `The highlighted candidates establish the ${presentation.techniqueName} constraint.`,
        );
        if (proof.premiseCandidates.length > 0) {
          const first = proof.premiseCandidates[0];
          const row = Math.floor(first.cell / 9) + 1;
          const column = (first.cell % 9) + 1;
          expect(page.body).toContain(`${first.digit} in R${row}C${column}`);
        } else if (proof.valueEvidence.length > 0) {
          const first = proof.valueEvidence[0];
          const row = Math.floor(first.cell / 9) + 1;
          const column = (first.cell % 9) + 1;
          expect(page.body).toContain(`${first.digit} in R${row}C${column}`);
        } else {
          expect(page.body).toContain('Focus on R');
        }
      });

      structuralIndexes.slice(0, -1).forEach(({ index }) => {
        expect(presentation.pages[index].body).toContain('remaining');
      });
      if (structuralIndexes.length > 1) {
        expect(
          presentation.pages[structuralIndexes.at(-1)!.index].body,
        ).not.toContain('remaining');
      }
    },
  );
});
