import {
  HINT_STEP_CONTRACT_VERSION,
  HintStep,
  TECHNIQUES,
  TechniqueDefinition,
  buildHintPresentation,
} from '../src/domain';

const boardFingerprint = '0'.repeat(81);

function stepFor(
  technique: TechniqueDefinition,
  result: 'placement' | 'elimination' = 'elimination',
): HintStep {
  return {
    contractVersion: HINT_STEP_CONTRACT_VERSION,
    boardFingerprint,
    techniqueCode: technique.code,
    difficultyLevel: technique.level,
    focusCells: [0, 1],
    focusRegions: [{ kind: 'row', index: 0 }],
    premiseCandidates: [{ cell: 0, digit: 1 }],
    eliminations: result === 'elimination' ? [{ cell: 1, digit: 1 }] : [],
    placements: result === 'placement' ? [{ cell: 1, digit: 2 }] : [],
    explanationKey: technique.explanationKey,
    explanationParams: {},
  };
}

describe('hint presentation catalog', () => {
  test.each(TECHNIQUES)(
    'provides a positive three-stage template for $code',
    technique => {
      const presentation = buildHintPresentation(stepFor(technique));

      expect(presentation.techniqueName.length).toBeGreaterThan(0);
      expect(presentation.nameKey).toBe(technique.nameKey);
      expect(presentation.explanationKey).toBe(technique.explanationKey);
      expect(presentation.pages.map(page => page.kind)).toEqual([
        'observe',
        'reason',
        'apply',
      ]);
      expect(presentation.pages.every(page => page.body.length > 0)).toBe(true);
    },
  );

  test.each(TECHNIQUES)(
    'rejects a negative result-free $code step',
    technique => {
      const invalid = {
        ...stepFor(technique),
        eliminations: [],
        placements: [],
      };

      expect(() => buildHintPresentation(invalid)).toThrow(
        'a hint must contain an elimination or placement',
      );
    },
  );

  test.each(['placement', 'elimination'] as const)(
    'describes an atomic %s result with accessible evidence',
    result => {
      const presentation = buildHintPresentation(
        stepFor(TECHNIQUES[0], result),
      );
      const [observe, reason, apply] = presentation.pages;

      expect(observe.visuals.showEliminations).toBe(false);
      expect(observe.visuals.showPlacements).toBe(false);
      expect(reason.visuals.showPremises).toBe(true);
      expect(reason.accessibilitySummary).toContain('R1C2');
      expect(apply.body).toContain('one undoable move');
      expect(presentation.params.resultCount).toBe(1);
    },
  );
});
