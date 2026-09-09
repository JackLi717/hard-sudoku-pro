import { hintLabExampleLabel } from '../src/debug/hint-lab-labels';
import rawFixtures from '../src/debug/generated/hint-lab-fixtures.json';
import { hasCandidate } from '../src/domain/sudoku/board';
import {
  HINT_LAB_FIXTURES,
  HINT_LAB_ALL_FIXTURES,
  EncodedHintLabCatalog,
  loadHintLabCatalog,
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
      for (const fixture of HINT_LAB_ALL_FIXTURES) {
        const presentation = buildHintPresentation(
          fixture.step,
          copy,
          'game',
          fixture.candidateMasks,
        );
        expect(presentation.techniqueName.length).toBeGreaterThan(0);
        expect(presentation.pages.length).toBeGreaterThanOrEqual(2);
        for (const page of presentation.pages) {
          expect(page.title.length).toBeGreaterThan(0);
          expect(page.body.length).toBeGreaterThan(0);
          expect(page.body).not.toBe(copy.teaching.legacy);
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

  test.each(HINT_LAB_ALL_FIXTURES)(
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
      for (const placement of fixture.step.placements) {
        expect(applied.state.values[placement.cell]).toBe(placement.digit);
      }
      for (const elimination of fixture.step.eliminations) {
        expect(
          hasCandidate(
            applied.state.candidates.hintCandidates![elimination.cell],
            elimination.digit,
          ),
        ).toBe(false);
      }

      const undone = undoHintLabStep(fixture, applied, 3_000);
      expect(undone.state.activeHint?.techniqueCode).toBe(
        fixture.techniqueCode,
      );
      expect(undone.history).toHaveLength(0);
      expect(undone.state.values).toEqual(initial.state.values);
      expect(undone.state.candidates).toEqual(initial.state.candidates);
      expect(undone.state.candidates.hintCandidates).toEqual(
        initial.state.candidates.hintCandidates,
      );
    },
  );

  test.each(
    HINT_LAB_ALL_FIXTURES.filter(
      fixture =>
        ![
          'twoStringKite',
          'turbotFish',
          'emptyRectangle',
          'skyscraper',
        ].includes(fixture.techniqueCode),
    ),
  )(
    '$techniqueCode explains every structural inference with page-local evidence',
    fixture => {
      const presentation = buildHintPresentation(fixture.step);
      const verified = buildHintPresentation(
        fixture.step,
        undefined,
        'game',
        fixture.candidateMasks,
      );
      expect(
        verified.pages.some(page =>
          page.body.includes('does not contain enough'),
        ),
      ).toBe(false);
      for (const page of verified.pages) {
        for (const candidate of page.visuals.premiseCandidates ?? []) {
          expect(
            hasCandidate(
              fixture.candidateMasks[candidate.cell],
              candidate.digit,
            ),
          ).toBe(true);
        }
      }
      expect(verified.pages.at(-1)?.visuals.eliminations).toEqual(
        fixture.step.eliminations,
      );
      expect(presentation.pages.at(-1)?.kind).toBe('apply');
    },
  );
});

describe('Hint Lab catalog boundary validation', () => {
  const encoded = rawFixtures as unknown as EncodedHintLabCatalog;
  test('uses unique IDs across primary examples and variants', () => {
    expect(new Set(HINT_LAB_ALL_FIXTURES.map(fixture => fixture.id)).size).toBe(
      HINT_LAB_ALL_FIXTURES.length,
    );
    expect(
      HINT_LAB_ALL_FIXTURES.map(fixture => fixture.difficultyLevel),
    ).toEqual(
      [...HINT_LAB_ALL_FIXTURES].map(fixture => fixture.difficultyLevel).sort(),
    );
  });
  test('rejects duplicate IDs across catalog sections', () => {
    expect(() =>
      loadHintLabCatalog({ ...encoded, variants: [encoded.fixtures[0]] }),
    ).toThrow('Duplicate');
  });
  test('rejects a variant labeled with a different technique', () => {
    expect(() =>
      loadHintLabCatalog({
        ...encoded,
        variants: [
          {
            ...encoded.fixtures[0],
            id: 'mismatched-variant',
            techniqueCode: 'hiddenSingle',
          },
        ],
      }),
    ).toThrow('Invalid Hint Lab technique');
  });
  test.each([
    ['synthetic source', { sourceKind: 'synthetic' }],
    ['missing coverage', { coverage: undefined }],
    ['missing replay', { replaySteps: undefined }],
    ['wrong replay count', { sourceIteration: Number.MAX_SAFE_INTEGER }],
    [
      'malformed replay action',
      {
        sourceIteration: 1,
        replaySteps: [
          {
            techniqueCode: 'fullHouse',
            placements: [{ cell: 81, digit: 0 }],
            eliminations: [],
          },
        ],
      },
    ],
  ])('rejects %s from the formal catalog', (_name, patch) => {
    const changed = { ...encoded.fixtures[0], ...patch };
    expect(() =>
      loadHintLabCatalog({
        ...encoded,
        fixtures: [changed, ...encoded.fixtures.slice(1)],
      } as EncodedHintLabCatalog),
    ).toThrow();
  });
  test('rejects source givens that do not match the displayed state', () => {
    const original = encoded.fixtures[0];
    expect(() =>
      loadHintLabCatalog({
        ...encoded,
        variants: [
          {
            ...original,
            id: 'mismatched-source',
            givenCells: original.givenCells.map((given, cell) =>
              cell === 0 ? !given : given,
            ),
          },
        ],
      }),
    ).toThrow();
  });
});

test.each(Object.keys(HINT_PRESENTATION_COPIES))(
  '%s distinguishes examples with localized mode labels',
  locale => {
    for (const technique of TECHNIQUES) {
      const fixtures = HINT_LAB_ALL_FIXTURES.filter(
        fixture => fixture.techniqueCode === technique.code,
      );
      const labels = fixtures.map(fixture =>
        hintLabExampleLabel(fixture, locale),
      );
      expect(new Set(labels).size).toBe(fixtures.length);
      fixtures.forEach((fixture, index) => {
        expect(labels[index]).not.toContain(fixture.sourcePuzzleId);
        expect(labels[index]).not.toContain('undefined');
      });
    }
  },
);
