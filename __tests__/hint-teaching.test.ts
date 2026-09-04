import {
  deserializeGameState,
  serializeGameState,
} from '../src/data/user/game-serialization';
import { removeCandidate } from '../src/domain/sudoku/board';
import { teachingPeers } from '../src/domain/hints/teaching-presentation';
import {
  HINT_LAB_FIXTURES,
  HINT_LAB_TEACHING_VARIANTS,
  createHintLabSession,
} from '../src/debug/hint-lab';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import { HINT_PRESENTATION_COPIES } from '../src/localization/hint-presentation-copy';

const preserved = [
  'fullHouse',
  'nakedSingle',
  'hiddenSingle',
  'twoStringKite',
  'turbotFish',
  'skyscraper',
  'emptyRectangle',
];
describe('verified teaching across the catalog', () => {
  test.each(HINT_LAB_FIXTURES)(
    '$techniqueCode preserves the actual result and proves its teaching',
    fixture => {
      const before = JSON.stringify(fixture.step);
      for (const locale of ['en', 'ja', 'de', 'zh-Hans'] as const) {
        const copy = HINT_PRESENTATION_COPIES[locale];
        const p = buildHintPresentation(
          fixture.step,
          copy,
          'game',
          fixture.candidateMasks,
        );
        expect(p.pages.some(page => page.body === copy.teaching.legacy)).toBe(
          false,
        );
        if (!preserved.includes(fixture.techniqueCode))
          expect(p.pages.some(page => !!page.teaching)).toBe(true);
        const final = p.pages[p.pages.length - 1];
        expect(final.visuals.eliminations).toEqual(fixture.step.eliminations);
        expect(final.visuals.placements).toEqual(fixture.step.placements);
        expect(final.visuals.hypotheticalValues ?? []).toEqual([]);
        expect(p.pages.every(page => !/{[a-zA-Z]+}/.test(page.body))).toBe(
          true,
        );
        const replay = buildHintPresentation(
          fixture.step,
          copy,
          'replay',
          fixture.candidateMasks,
        );
        expect(replay.pages.map(page => page.visuals)).toEqual(
          p.pages.map(page => page.visuals),
        );
        expect(replay.pages[replay.pages.length - 1].body).not.toMatch(
          /Apply|undoable/,
        );
      }
      expect(JSON.stringify(fixture.step)).toBe(before);
    },
  );
});

const fixtureFor = (code: string) =>
  HINT_LAB_FIXTURES.find(f => f.techniqueCode === code)!;
const pagesFor = (code: string) => {
  const f = fixtureFor(code);
  return buildHintPresentation(f.step, undefined, 'game', f.candidateMasks)
    .pages;
};

test.each(['lockedCandidates.pointing', 'lockedCandidates.claiming'])(
  '%s derives source role independently of normalized order',
  code => {
    const f = fixtureFor(code);
    const original = buildHintPresentation(
      f.step,
      undefined,
      'game',
      f.candidateMasks,
    );
    const reversed = buildHintPresentation(
      { ...f.step, focusRegions: [...f.step.focusRegions].reverse() },
      undefined,
      'game',
      f.candidateMasks,
    );
    expect(reversed.pages).toEqual(original.pages);
    const source = original.pages[0].visuals.regionMarks![0];
    expect(source.role).toBe('source');
    expect(source.region.kind === 'box').toBe(code.endsWith('pointing'));
  },
);

test.each([
  'lockedTriple',
  'nakedTriple',
  'hiddenTriple',
  'nakedQuad',
  'hiddenQuad',
])('%s reserves the full digit set in a genuine common region', code => {
  const f = fixtureFor(code);
  const pages = pagesFor(code);
  const reason = pages.find(
    p => p.teaching?.rule === 'naked' || p.teaching?.rule === 'hidden',
  )!;
  const expected = [...new Set(f.step.premiseCandidates.map(c => c.digit))]
    .sort()
    .join(', ');
  expect(reason.teaching?.params.digits).toBe(expected);
  expect(reason.teaching?.params.count).toBe(code.endsWith('Quad') ? 4 : 3);
  expect(
    reason.visuals.focusRegions?.every(r =>
      f.step.focusCells.every(cell =>
        r.kind === 'row'
          ? Math.floor(cell / 9) === r.index
          : r.kind === 'column'
          ? cell % 9 === r.index
          : Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3) === r.index,
      ),
    ),
  ).toBe(true);
});

test('XYZ covers the shared digit at the pivot as well as both wings', () => {
  const f = fixtureFor('xyzWing');
  const pages = pagesFor('xyzWing');
  const assumptions = pages
    .filter(p => p.teaching?.rule === 'assume')
    .flatMap(p => p.visuals.hypotheticalValues ?? []);
  expect(assumptions).toHaveLength(3);
  expect(new Set(assumptions.map(c => c.cell)).size).toBe(1);
  expect(assumptions.some(c => c.digit === f.step.eliminations[0].digit)).toBe(
    true,
  );
  expect(pages.filter(p => p.teaching?.rule === 'reset')).toHaveLength(3);
  for (const target of f.step.eliminations)
    for (const cell of f.step.focusCells)
      expect(teachingPeers(cell, target.cell)).toBe(true);
  const grid = [...f.candidateMasks];
  const pivot = assumptions[0].cell;
  grid[pivot] = removeCandidate(grid[pivot], f.step.eliminations[0].digit);
  expect(
    buildHintPresentation(f.step, undefined, 'game', grid).pages[0].body,
  ).toContain('does not contain enough');
});

test.each([
  'xChain',
  'xyChain',
  'aic',
  'groupedAic',
  'forcingChain',
  'forcingNet',
])(
  '%s rejects missing or reordered dependencies and retains true candidate states',
  code => {
    const f = fixtureFor(code);
    const step = JSON.parse(JSON.stringify(f.step)) as typeof f.step;
    const branch = step.teaching!.branches[0];
    expect(branch.nodes[0].rule).toBe('assume');
    expect(branch.nodes.every((n, i) => n.parents.every(p => p < i))).toBe(
      true,
    );
    const altered = {
      ...step,
      teaching: {
        ...step.teaching!,
        branches: [
          { nodes: [branch.nodes[0], { ...branch.nodes[1], parents: [999] }] },
          ...step.teaching!.branches.slice(1),
        ],
      },
    };
    expect(
      buildHintPresentation(altered, undefined, 'game', f.candidateMasks)
        .pages[0].body,
    ).toContain('does not contain enough');
    const noEvidence = { ...step, teaching: undefined };
    expect(
      buildHintPresentation(noEvidence, undefined, 'replay', f.candidateMasks)
        .pages[0].body,
    ).toContain('does not contain enough');
  },
);

test.each(HINT_LAB_FIXTURES.filter(f => !preserved.includes(f.techniqueCode)))(
  '$techniqueCode safely declines a missing or changed candidate snapshot',
  f => {
    expect(buildHintPresentation(f.step).pages[0].body).toContain(
      'does not contain enough',
    );
    const grid = [...f.candidateMasks];
    const c = f.step.eliminations[0] ?? f.step.placements[0];
    grid[c.cell] = removeCandidate(grid[c.cell], c.digit);
    expect(
      buildHintPresentation(f.step, undefined, 'game', grid).pages[0].body,
    ).toContain('does not contain enough');
  },
);

test.each(HINT_LAB_TEACHING_VARIANTS)(
  '$sourcePuzzleId verifies its distinct native branch outcome',
  f => {
    const p = buildHintPresentation(
      f.step,
      undefined,
      'game',
      f.candidateMasks,
    );
    expect(p.pages[0].body).not.toContain('does not contain enough');
    if (f.techniqueCode === 'forcingNet') {
      expect(f.step.teaching?.mode).toBe('common');
      expect(f.step.teaching?.branches).toHaveLength(3);
      const placement =
        f.sourcePuzzleId.endsWith('placement') &&
        !f.sourcePuzzleId.endsWith('elimination');
      expect(f.step.placements.length > 0).toBe(placement);
      for (const branch of f.step.teaching!.branches) {
        expect(branch.nodes.at(-1)?.truth).toBe(placement);
        expect(branch.nodes.at(-1)?.candidates).toEqual(
          placement ? f.step.placements : f.step.eliminations,
        );
      }
    }
    if (f.sourcePuzzleId === 'color-same-side-conflict')
      expect(f.step.teaching?.mode).toBe('color_conflict');
    for (const locale of ['en', 'ja', 'de', 'zh-Hans'] as const)
      expect(
        buildHintPresentation(
          f.step,
          HINT_PRESENTATION_COPIES[locale],
          'replay',
          f.candidateMasks,
        ).pages.every(page => !/{[a-zA-Z]+}/.test(page.body)),
      ).toBe(true);
  },
);

test('forcing net batches direct eliminations from the same true fact', () => {
  const fixture = HINT_LAB_TEACHING_VARIANTS.find(
    variant => variant.sourcePuzzleId === 'net-common-placement',
  )!;
  const pages = buildHintPresentation(
    fixture.step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'game',
    fixture.candidateMasks,
  ).pages;

  expect(pages).toHaveLength(33);
  const assumptions = pages.filter(page => page.teaching?.rule === 'assume');
  expect(assumptions).toHaveLength(3);
  expect(assumptions.map(page => page.body)).toEqual([
    '分支 1：假设 R1C1=5 成立。',
    '分支 2：假设 R1C1=6 成立。',
    '分支 3：假设 R1C1=7 成立。',
  ]);

  const firstAssumptionIndex = pages.indexOf(assumptions[0]);
  const firstDeletion = pages[firstAssumptionIndex + 1];
  expect(firstDeletion.teaching).toMatchObject({
    rule: 'weak',
    params: { from: 'R1C1=5', candidates: '{R1C2=5, R1C3=5}' },
  });
  expect(firstDeletion.visuals.eliminations).toEqual([
    { cell: 1, digit: 5 },
    { cell: 2, digit: 5 },
  ]);
  expect(firstDeletion.visuals.links?.filter(link => link.active)).toHaveLength(
    2,
  );
});

test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
  '%s assumption copy trusts the question-mark symbol without repeating its meaning',
  locale => {
    expect(HINT_PRESENTATION_COPIES[locale].teaching.assume).not.toMatch(
      /\?|问号/,
    );
  },
);

test('saved records retain the complete teaching evidence at the serialization boundary', () => {
  const f = fixtureFor('forcingNet');
  const session = createHintLabSession(f);
  const restored = deserializeGameState(serializeGameState(session.state));
  expect(restored.activeHint?.teaching).toEqual(f.step.teaching);
  expect(
    buildHintPresentation(
      restored.activeHint!,
      undefined,
      'replay',
      restored.candidates.hintCandidates,
    ).pages,
  ).toEqual(
    buildHintPresentation(f.step, undefined, 'replay', f.candidateMasks).pages,
  );
});

test('avoidable rectangle cannot swap given clues or records without clue identity', () => {
  const f = fixtureFor('avoidableRectangle');
  const given = f.step.teaching!.branches[0].nodes[0].candidates[0].cell;
  for (const teaching of [
    { ...f.step.teaching!, givenCells: [given] },
    { ...f.step.teaching!, givenCells: undefined },
  ]) {
    expect(
      buildHintPresentation(
        { ...f.step, teaching },
        undefined,
        'game',
        f.candidateMasks,
      ).pages[0].body,
    ).toContain('does not contain enough');
  }
});

test('AIC reverse contradiction produces a placement, not an endpoint deletion', () => {
  const f = HINT_LAB_TEACHING_VARIANTS.find(
    v => v.sourcePuzzleId === 'aic-forced-placement',
  )!;
  expect(f.step.teaching?.branches[0].nodes[0].truth).toBe(false);
  expect(f.step.teaching?.branches[0].nodes.at(-1)?.truth).toBe(true);
  expect(f.step.placements).toHaveLength(1);
  expect(
    buildHintPresentation(
      f.step,
      undefined,
      'game',
      f.candidateMasks,
    ).pages.some(p => p.teaching?.rule === 'opposite'),
  ).toBe(true);
});

test('hidden subsets reject an incomplete occurrence set even when every digit remains named', () => {
  const f = fixtureFor('hiddenPair');
  const candidate = f.step.premiseCandidates.find(
    c => f.step.premiseCandidates.filter(p => p.digit === c.digit).length > 1,
  )!;
  const premises = f.step.premiseCandidates.filter(c => c !== candidate);
  expect(new Set(premises.map(c => c.digit)).size).toBe(2);
  expect(
    buildHintPresentation(
      { ...f.step, premiseCandidates: premises },
      undefined,
      'game',
      f.candidateMasks,
    ).pages[0].body,
  ).toContain('does not contain enough');
});

test('sashimi retains its verified missing corner as stable empty context', () => {
  const f = HINT_LAB_TEACHING_VARIANTS.find(
    v => v.sourcePuzzleId === 'sashimi-two-fins',
  )!;
  const pages = buildHintPresentation(
    f.step,
    undefined,
    'game',
    f.candidateMasks,
  ).pages;
  const missing = pages[0].visuals.diagramEmptyCells!;
  expect(missing).toHaveLength(1);
  for (const page of pages) {
    expect(page.visuals.diagramEmptyCells).toEqual(missing);
    expect(page.visuals.spotlightCells).toEqual(
      expect.arrayContaining(missing),
    );
    expect(
      page.visuals.premiseCandidates?.some(
        c => missing.includes(c.cell) && c.digit === page.visuals.diagramDigit,
      ),
    ).toBe(false);
  }
});
