import {
  addCandidate,
  removeCandidate,
  candidateMaskFor,
} from '../src/domain/sudoku/board';
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
    'provides a positive legacy template for $code',
    technique => {
      const presentation = buildHintPresentation(stepFor(technique));

      expect(presentation.techniqueName.length).toBeGreaterThan(0);
      expect(presentation.nameKey).toBe(technique.nameKey);
      expect(presentation.explanationKey).toBe(technique.explanationKey);
      expect(presentation.pages[0].kind).toBe('observe');
      expect(presentation.pages.at(-1)?.kind).toBe('apply');
      if (
        !['fullHouse', 'nakedSingle', 'hiddenSingle'].includes(technique.code)
      ) {
        expect(presentation.pages[0].body).toContain('does not contain enough');
        expect(presentation.pages[0].visuals.showPremises).toBe(false);
      }
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

  test('builds a variable hidden-single proof without revealing the answer first', () => {
    const fingerprint = `${'0'.repeat(16)}4${'0'.repeat(28)}4${'0'.repeat(35)}`;
    const step: HintStep = {
      ...stepFor(TECHNIQUES[2], 'placement'),
      boardFingerprint: fingerprint,
      focusCells: [44],
      focusRegions: [{ kind: 'box', index: 5 }],
      premiseCandidates: [{ cell: 44, digit: 4 }],
      placements: [{ cell: 44, digit: 4 }],
      humanCost: 214,
      proofSteps: [
        {
          kind: 'observe',
          reason: 'scan_region',
          focusCells: [],
          focusRegions: [{ kind: 'box', index: 5 }],
          premiseCandidates: [],
          valueEvidence: [],
          eliminations: [],
          placements: [],
        },
        {
          kind: 'reason',
          reason: 'value_blocks_cells',
          focusCells: [34, 52],
          focusRegions: [{ kind: 'box', index: 5 }],
          premiseCandidates: [],
          valueEvidence: [{ cell: 16, digit: 4 }],
          eliminations: [],
          placements: [],
        },
        {
          kind: 'reason',
          reason: 'value_blocks_cells',
          focusCells: [51, 53],
          focusRegions: [{ kind: 'box', index: 5 }],
          premiseCandidates: [],
          valueEvidence: [{ cell: 45, digit: 4 }],
          eliminations: [],
          placements: [],
        },
        {
          kind: 'conclusion',
          reason: 'forced_placement',
          focusCells: [44],
          focusRegions: [{ kind: 'box', index: 5 }],
          premiseCandidates: [{ cell: 44, digit: 4 }],
          valueEvidence: [],
          eliminations: [],
          placements: [{ cell: 44, digit: 4 }],
        },
      ],
    };

    const presentation = buildHintPresentation(step);

    expect(presentation.pages).toHaveLength(4);
    expect(presentation.pages.map(page => page.kind)).toEqual([
      'observe',
      'reason',
      'reason',
      'apply',
    ]);
    expect(presentation.pages[0].body).not.toContain('R5C9');
    expect(presentation.pages[1].body).toContain('4 at R2C8');
    expect(presentation.pages[3].body).toContain('R5C9');
    expect(presentation.pages[0].visuals.candidateMarks).toEqual([]);
    expect(presentation.pages[1].visuals.regionMarks).toEqual([
      { region: { kind: 'box', index: 5 }, role: 'source' },
      { region: { kind: 'column', index: 7 }, role: 'affected' },
    ]);
    expect(presentation.pages[1].visuals.candidateMarks).toEqual([
      {
        cell: 34,
        digit: 4,
        role: 'excluded',
        exclusionKind: 'explanation',
      },
      {
        cell: 52,
        digit: 4,
        role: 'excluded',
        exclusionKind: 'explanation',
      },
    ]);
    expect(presentation.pages[1].visuals.cellMarks).toEqual([
      { cell: 34, role: 'eliminationTarget' },
      { cell: 52, role: 'eliminationTarget' },
    ]);
    expect(presentation.pages[3].visuals.cellMarks).toContainEqual({
      cell: 44,
      role: 'result',
    });
  });

  test('stages hidden-pair candidates before establishing and eliminating', () => {
    const premises = [
      { cell: 3, digit: 6 as const },
      { cell: 3, digit: 8 as const },
      { cell: 4, digit: 6 as const },
      { cell: 4, digit: 8 as const },
    ];
    const eliminations = [
      { cell: 3, digit: 7 as const },
      { cell: 3, digit: 9 as const },
      { cell: 4, digit: 3 as const },
      { cell: 4, digit: 9 as const },
    ];
    const region = { kind: 'box' as const, index: 1 };
    const step: HintStep = {
      ...stepFor(TECHNIQUES[8]),
      focusCells: [3, 4],
      focusRegions: [region],
      premiseCandidates: premises,
      eliminations,
      proofSteps: [
        {
          kind: 'observe',
          reason: 'scan_region',
          focusCells: [],
          focusRegions: [region],
          premiseCandidates: [],
          valueEvidence: [],
          eliminations: [],
          placements: [],
        },
        {
          kind: 'reason',
          reason: 'pattern_constraint',
          focusCells: [3, 4],
          focusRegions: [region],
          premiseCandidates: premises,
          valueEvidence: [],
          eliminations: [],
          placements: [],
        },
        {
          kind: 'conclusion',
          reason: 'valid_elimination',
          focusCells: [3, 4],
          focusRegions: [region],
          premiseCandidates: premises,
          valueEvidence: [],
          eliminations,
          placements: [],
        },
      ],
    };

    const grid = Array.from({ length: 81 }, () =>
      removeCandidate(removeCandidate(511, 6), 8),
    );
    grid[3] = [6, 8, 7, 9].reduce(
      (mask, d) => mask + candidateMaskFor(d as 6 | 8 | 7 | 9),
      0,
    );
    grid[4] = [6, 8, 3, 9].reduce(
      (mask, d) => mask + candidateMaskFor(d as 6 | 8 | 3 | 9),
      0,
    );
    const pages = buildHintPresentation(step, undefined, 'game', grid).pages;
    expect(
      pages.find(p => p.teaching?.rule === 'hidden')?.teaching?.params.digits,
    ).toBe('6, 8');
    expect(pages.at(-1)?.visuals.candidateMarks).toEqual(
      expect.arrayContaining(
        eliminations.map(candidate => ({
          ...candidate,
          role: 'excluded',
          exclusionKind: 'result',
        })),
      ),
    );
  });

  test('reveals the locked-candidate source before its affected line', () => {
    const source = { kind: 'box' as const, index: 0 };
    const affected = { kind: 'column' as const, index: 0 };
    const premises = [
      { cell: 9, digit: 1 as const },
      { cell: 18, digit: 1 as const },
    ];
    const eliminations = [
      { cell: 27, digit: 1 as const },
      { cell: 36, digit: 1 as const },
    ];
    const step: HintStep = {
      ...stepFor(TECHNIQUES[3]),
      focusCells: [9, 18],
      focusRegions: [source, affected],
      premiseCandidates: premises,
      eliminations,
      proofSteps: [
        {
          kind: 'observe',
          reason: 'scan_region',
          focusCells: [],
          focusRegions: [source, affected],
          premiseCandidates: [],
          valueEvidence: [],
          eliminations: [],
          placements: [],
        },
        {
          kind: 'reason',
          reason: 'pattern_constraint',
          focusCells: [9, 18],
          focusRegions: [source, affected],
          premiseCandidates: premises,
          valueEvidence: [],
          eliminations: [],
          placements: [],
        },
        {
          kind: 'conclusion',
          reason: 'valid_elimination',
          focusCells: [9, 18],
          focusRegions: [source, affected],
          premiseCandidates: premises,
          valueEvidence: [],
          eliminations,
          placements: [],
        },
      ],
    };

    const grid = Array.from({ length: 81 }, () => 511);
    for (const cell of [0, 1, 2, 9, 10, 11, 18, 19, 20])
      grid[cell] = removeCandidate(grid[cell], 1);
    for (const cell of [9, 18]) grid[cell] = addCandidate(grid[cell], 1);
    const [observe, establish, apply] = buildHintPresentation(
      { ...step, focusRegions: [affected, source] },
      undefined,
      'game',
      grid,
    ).pages;
    expect(observe.visuals.regionMarks).toEqual([
      { region: source, role: 'source' },
    ]);
    expect(establish.visuals.regionMarks).toEqual([
      { region: source, role: 'source' },
      { region: affected, role: 'affected' },
    ]);
    expect(apply.visuals.eliminations).toEqual(eliminations);
  });
});

test.each(TECHNIQUES)(
  'read-only $code conclusions do not instruct application or undo',
  technique => {
    const step = stepFor(technique);
    const game = buildHintPresentation(step);
    const replay = buildHintPresentation(step, undefined, 'replay');
    expect(game.pages[game.pages.length - 1].body).toContain('Apply this step');
    const conclusion = replay.pages[replay.pages.length - 1];
    expect(conclusion.body).not.toMatch(/apply|undo/i);
    expect(conclusion.title).not.toMatch(/apply/i);
    expect(replay.pages.map(page => page.visuals)).toEqual(
      game.pages.map(page => page.visuals),
    );
  },
);
