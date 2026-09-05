import {
  deserializeGameState,
  serializeGameState,
} from '../src/data/user/game-serialization';
import { removeCandidate } from '../src/domain/sudoku/board';
import { teachingPeers } from '../src/domain/hints/teaching-presentation';
import {
  HINT_LAB_ALL_FIXTURES,
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

test('Hint Lab keeps the two teachable forcing net examples', () => {
  expect(HINT_LAB_ALL_FIXTURES).toHaveLength(46);
  expect(
    HINT_LAB_ALL_FIXTURES.filter(f => f.techniqueCode === 'forcingNet').map(
      f => f.sourcePuzzleId,
    ),
  ).toEqual(['net-common-placement', 'net-common-elimination']);
  expect(new Set(HINT_LAB_ALL_FIXTURES.map(f => f.id)).size).toBe(
    HINT_LAB_ALL_FIXTURES.length,
  );
});

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
  const fixture = HINT_LAB_ALL_FIXTURES.find(
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

test('simple chain consequences use direct elimination language before contradiction language', () => {
  const copy = HINT_PRESENTATION_COPIES['zh-Hans'].teaching;
  expect(copy.weak).toBe('{from} 已经成立，排除 {candidates}。');
  expect(copy.endpoints).toContain('因此可以直接排除');
  expect(copy.colorPropagation).toContain('就排除 {b}');
  expect(
    [copy.weak, copy.endpoints, copy.colorPropagation].join(''),
  ).not.toContain('冲突');
});

test('forcing chain uses a level-five frontier and presents two concise exhaustive branches', () => {
  const f = fixtureFor('forcingChain');
  const pages = buildHintPresentation(
    f.step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'game',
    f.candidateMasks,
  ).pages;

  expect(f.id).toBe('hint-lab-forcing-chain-curated-v1');
  expect(f.sourcePuzzleId).toBe('hsp-f503d82852766877c4ab');
  expect(f.sourceIteration).toBe(11);
  expect(f.step.eliminations).toEqual([{ cell: 39, digit: 4 }]);
  expect(f.step.teaching?.branches.map(branch => branch.nodes.length)).toEqual([
    6, 3,
  ]);
  expect(pages).toHaveLength(12);
  expect(pages[0].teaching?.rule).toBe('forcingChainSnapshot');
  expect(pages[0].body).toContain('目标候选 R5C4=4');
  expect(pages[0].body).toContain('成立和不成立');
  expect(pages[0].body).toContain('覆盖全部可能');
  expect(pages.filter(page => page.teaching?.rule === 'reset')).toHaveLength(1);
  expect(
    pages.filter(page => page.teaching?.rule === 'forcingChainWeak'),
  ).toHaveLength(3);
  expect(
    pages.filter(page => page.teaching?.rule === 'cellStrong'),
  ).toHaveLength(2);
  expect(
    pages
      .filter(page => page.teaching?.rule === 'cellStrong')
      .map(page => page.body),
  ).toEqual([
    'R1C6=7 不成立。R1C6 现在只剩 R1C6=2，因此它必须成立。',
    'R2C4=2 不成立。R2C4 现在只剩 R2C4=4，因此它必须成立。',
  ]);
  const common = pages.find(page => page.teaching?.rule === 'common')!;
  expect(common.body).toContain('R5C4=4 不成立');
  expect(common.visuals.showEliminations).toBe(true);
  expect(common.visuals.eliminations).toEqual(f.step.eliminations);
  expect(pages[6].body).toBe('R2C4=4 已经成立，排除第4列中的 R5C4=4。');
  expect(pages.at(-1)?.body).toBe(
    '已验证的结论是 R5C4=4 不成立。所有临时假设均已撤回。',
  );
  expect(pages[0].visuals.focusRegions?.length).toBeGreaterThan(0);
  for (const page of pages) {
    expect(page.visuals.focusRegions).toEqual(pages[0].visuals.focusRegions);
    expect(page.visuals.diagramRegions).toEqual(
      pages[0].visuals.diagramRegions,
    );
  }
});

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
  const pages = buildHintPresentation(
    f.step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'game',
    f.candidateMasks,
  ).pages;
  const replayPages = buildHintPresentation(
    f.step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'replay',
    f.candidateMasks,
  ).pages;
  expect(replayPages.map(page => page.visuals)).toEqual(
    pages.map(page => page.visuals),
  );
  expect(pages.some(p => p.teaching?.rule === 'opposite')).toBe(true);
  const contradictionPages = pages.filter(
    page =>
      page.visuals.hypotheticalValues?.filter(value => value.conflict)
        .length === 2,
  );
  expect(pages).toHaveLength(13);
  expect(pages.some(page => page.teaching?.rule === 'reset')).toBe(false);
  expect(contradictionPages).toHaveLength(2);
  for (const page of contradictionPages) {
    expect(
      page.visuals.hypotheticalValues
        ?.filter(value => value.conflict)
        .map(value => ({ cell: value.cell, digit: value.digit })),
    ).toEqual([
      { cell: 30, digit: 8 },
      { cell: 3, digit: 1 },
    ]);
    expect(page.visuals.focusRegions).toEqual([{ kind: 'column', index: 3 }]);
    expect(page.visuals.diagramRegions).toEqual([
      { region: { kind: 'column', index: 3 }, conflict: true },
    ]);
    expect(page.visuals.links).toContainEqual({
      from: 30,
      to: 3,
      kind: 'pair',
      active: true,
      conflict: true,
    });
  }
});

test('AIC keeps its chain context, omits same-cell exclusions, and ends with a red contradiction', () => {
  const f = fixtureFor('aic');
  const pages = buildHintPresentation(
    f.step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'game',
    f.candidateMasks,
  ).pages;
  const regions = [
    { kind: 'column' as const, index: 3 },
    { kind: 'row' as const, index: 3 },
    { kind: 'column' as const, index: 6 },
    { kind: 'row' as const, index: 0 },
  ];
  const cells = regions.flatMap(region =>
    region.kind === 'row'
      ? Array.from({ length: 9 }, (_, column) => region.index * 9 + column)
      : Array.from({ length: 9 }, (_, row) => row * 9 + region.index),
  );

  expect(f.id).toBe('hint-lab-aic-curated-v1');
  expect(f.sourcePuzzleId).toBe('hsp-50f5fd53565162cd6d7c');
  expect(f.sourceIteration).toBe(27);
  expect(pages).toHaveLength(10);
  expect(pages.some(page => page.teaching?.rule === 'reset')).toBe(false);
  expect(pages[0].body).toContain('先看高亮的第4列、第4行、第7列、第1行');
  expect(pages[0].title).toBe('观察位置');
  expect(pages.slice(1, -1).every(page => page.title === '推理过程')).toBe(
    true,
  );
  expect(pages.at(-1)?.title).toBe('结论');
  expect(pages.filter(page => page.teaching?.rule === 'weak')).toHaveLength(3);
  expect(
    pages.filter(page =>
      ['strong', 'cellStrong'].includes(page.teaching?.rule ?? ''),
    ),
  ).toHaveLength(3);
  const contradictionPages = pages.filter(
    page =>
      page.visuals.hypotheticalValues?.filter(value => value.conflict)
        .length === 2,
  );
  expect(contradictionPages).toHaveLength(2);
  for (const page of contradictionPages) {
    expect(page.visuals.hypotheticalValues).toEqual([
      {
        cell: 3,
        digit: 1,
        role: 'assumption',
        conflict: true,
        conflictRegion: '第1行',
      },
      {
        cell: 6,
        digit: 1,
        role: 'consequence',
        conflict: true,
        conflictRegion: '第1行',
      },
    ]);
    expect(page.visuals.focusRegions).toEqual([{ kind: 'row', index: 0 }]);
    expect(page.visuals.diagramRegions).toEqual([
      { region: { kind: 'row', index: 0 }, conflict: true },
    ]);
    expect(page.visuals.links).toContainEqual({
      from: 6,
      to: 3,
      kind: 'peer',
      active: true,
      conflict: true,
    });
  }
  for (const page of pages.filter(item => !contradictionPages.includes(item))) {
    expect(page.visuals.focusRegions).toEqual(regions);
    expect(page.visuals.diagramRegions).toEqual(
      regions.map(region => ({ region, conflict: false })),
    );
    expect(page.visuals.spotlightCells).toEqual(expect.arrayContaining(cells));
  }
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
  const f = HINT_LAB_ALL_FIXTURES.find(
    v => v.sourcePuzzleId === 'sashimi-hodoku-two-fins',
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

test('sashimi examples cover fins, orientation and batch targets with the same two branches', () => {
  const examples = HINT_LAB_ALL_FIXTURES.filter(
    fixture => fixture.techniqueCode === 'sashimiXWing',
  );
  expect(examples.map(fixture => fixture.sourcePuzzleId)).toEqual([
    'sashimi-hodoku-two-fins',
    'sashimi-single-fin',
    'sashimi-row-two-fins',
    'sashimi-two-targets',
  ]);
  expect(
    examples.find(f => f.sourcePuzzleId === 'sashimi-two-targets')?.step
      .eliminations,
  ).toHaveLength(2);

  for (const fixture of examples) {
    const pages = buildHintPresentation(
      fixture.step,
      undefined,
      'game',
      fixture.candidateMasks,
    ).pages;
    expect(pages.map(page => page.teaching?.rule)).toEqual([
      'fins',
      'sashimiPair',
      'sashimiDirect',
      'sashimiFin',
      'result',
    ]);
    for (const branch of [pages[2], pages[3]]) {
      expect(branch.visuals.hypotheticalValues).toHaveLength(1);
      expect(branch.visuals.eliminations).toEqual(
        expect.arrayContaining(fixture.step.eliminations),
      );
      expect(branch.visuals.candidateMarks).toEqual(
        expect.arrayContaining(
          fixture.step.eliminations.map(candidate => ({
            ...candidate,
            role: 'excluded',
            exclusionKind: 'explanation',
          })),
        ),
      );
    }
    expect(pages[3].visuals.eliminations!.length).toBeGreaterThan(
      fixture.step.eliminations.length,
    );
    expect(pages.at(-1)?.visuals.eliminations).toEqual(
      fixture.step.eliminations,
    );
    expect(pages.at(-1)?.visuals.hypotheticalValues).toEqual([]);
  }
});
