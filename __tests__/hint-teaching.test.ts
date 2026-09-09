import {
  deserializeGameState,
  serializeGameState,
} from '../src/data/user/game-serialization';
import { removeCandidate } from '../src/domain/sudoku/board';
import { teachingPeers } from '../src/domain/hints/teaching-presentation';
import {
  HINT_LAB_ALL_FIXTURES as VERIFIED_LAB_FIXTURES,
  HINT_LAB_REGRESSION_FIXTURES,
  createHintLabSession,
} from '../src/debug/hint-lab';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import { HINT_PRESENTATION_COPIES } from '../src/localization/hint-presentation-copy';

// Exact page/coordinate regressions use generated structural cases. They are
// deliberately separate from the independently reachable teaching catalog.
const HINT_LAB_FIXTURES = HINT_LAB_REGRESSION_FIXTURES.slice(0, 39);
const HINT_LAB_TEACHING_VARIANTS = HINT_LAB_REGRESSION_FIXTURES.slice(39);
const HINT_LAB_ALL_FIXTURES = HINT_LAB_REGRESSION_FIXTURES;

const preserved = [
  'fullHouse',
  'nakedSingle',
  'hiddenSingle',
  'twoStringKite',
  'turbotFish',
  'skyscraper',
  'emptyRectangle',
];

test('structural regressions keep both forcing net branch outcomes', () => {
  expect(HINT_LAB_ALL_FIXTURES).toHaveLength(44);
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
  test.each([...VERIFIED_LAB_FIXTURES, ...HINT_LAB_REGRESSION_FIXTURES])(
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
    p =>
      p.teaching?.rule === `${code}Reserve` ||
      p.teaching?.rule === `${code}Lock`,
  )!;
  const expected = [...new Set(f.step.premiseCandidates.map(c => c.digit))]
    .sort()
    .join(HINT_PRESENTATION_COPIES.en.regionSeparator);
  expect(reason.teaching?.params.digits).toBe(expected);
  expect(pages).toHaveLength(3);
  expect(new Set(f.step.premiseCandidates.map(c => c.digit)).size).toBe(
    code.endsWith('Quad') ? 4 : 3,
  );
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

test('XY-Wing teaches its structure and two pivot cases in seven focused scenes', () => {
  const f = fixtureFor('xyWing');
  const pages = buildHintPresentation(
    f.step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'game',
    f.candidateMasks,
  ).pages;

  expect(pages).toHaveLength(7);
  expect(pages.map(page => page.teaching?.rule)).toEqual([
    'xyWingIntro',
    'xyWingStructure',
    'xyWingCase',
    'xyWingTarget',
    'xyWingCase',
    'xyWingTarget',
    'result',
  ]);
  expect(pages.map(page => page.title)).toEqual([
    '找到枢轴与两翼',
    '找到共同目标',
    expect.stringMatching(/^情况 1：R\dC\d 是 \d$/),
    expect.stringMatching(/^情况 1：排除目标 \d$/),
    expect.stringMatching(/^情况 2：R\dC\d 是 \d$/),
    expect.stringMatching(/^情况 2：排除目标 \d$/),
    '合并两种情况',
  ]);
  expect(pages[0].visuals.spotlightCells).toHaveLength(3);
  expect(pages[0].visuals.links).toHaveLength(2);
  const pivotMark = pages[0].visuals.cellMarks?.find(
    mark => mark.role === 'established',
  );
  expect(pivotMark).toBeDefined();
  const pivot = pivotMark!.cell;
  const wings = pages[0].visuals.cellMarks
    ?.filter(mark => mark.role === 'potential')
    .map(mark => mark.cell);
  expect(wings).toHaveLength(2);
  expect(pages[1].visuals.spotlightCells).toEqual(
    expect.arrayContaining([
      pivot,
      ...wings!,
      ...f.step.eliminations.map(candidate => candidate.cell),
    ]),
  );
  expect(pages[1].visuals.links).toHaveLength(
    2 + f.step.eliminations.length * 2,
  );
  for (const page of pages.slice(1)) {
    expect(
      page.visuals.cellMarks?.filter(mark => mark.role === 'result'),
    ).toEqual(
      f.step.eliminations.map(candidate => ({
        cell: candidate.cell,
        role: 'result',
      })),
    );
  }
  const casePages = [pages[2], pages[4]];
  const targetPages = [pages[3], pages[5]];
  expect(
    casePages.map(page => page.visuals.hypotheticalValues?.[0].cell),
  ).toEqual([pivot, pivot]);
  expect(
    new Set(casePages.map(page => page.visuals.hypotheticalValues?.[0].digit))
      .size,
  ).toBe(2);
  expect(
    new Set(casePages.map(page => page.visuals.hypotheticalValues?.[1].cell)),
  ).toEqual(new Set(wings));
  expect(
    casePages.every(
      page =>
        !page.visuals.candidateMarks?.some(mark =>
          f.step.eliminations.some(
            target => target.cell === mark.cell && target.digit === mark.digit,
          ),
        ),
    ),
  ).toBe(true);
  expect(
    targetPages.every(page =>
      page.visuals.candidateMarks?.some(
        mark =>
          f.step.eliminations.some(
            target => target.cell === mark.cell && target.digit === mark.digit,
          ) &&
          mark.role === 'excluded' &&
          mark.exclusionKind === 'explanation',
      ),
    ),
  ).toBe(true);
  expect(targetPages[0].visuals.hypotheticalValues).toEqual(
    casePages[0].visuals.hypotheticalValues,
  );
  expect(targetPages[1].visuals.hypotheticalValues).toEqual(
    casePages[1].visuals.hypotheticalValues,
  );
  expect(pages.some(page => page.teaching?.rule === 'reset')).toBe(false);
  expect(pages.at(-1)?.visuals.eliminations).toEqual(f.step.eliminations);
});

test('XYZ-Wing teaches all three pivot cases in six focused scenes', () => {
  const f = fixtureFor('xyzWing');
  const pages = buildHintPresentation(
    f.step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'game',
    f.candidateMasks,
  ).pages;

  expect(pages).toHaveLength(6);
  expect(pages.map(page => page.teaching?.rule)).toEqual([
    'xyzWingIntro',
    'xyzWingTarget',
    'xyzWingCase',
    'xyzWingCase',
    'xyzWingPivotCase',
    'result',
  ]);
  expect(pages.map(page => page.title)).toEqual([
    '找到枢轴与两翼',
    '找到三格共同目标',
    expect.stringMatching(/^情况 1：R\dC\d 是 \d$/),
    expect.stringMatching(/^情况 2：R\dC\d 是 \d$/),
    expect.stringMatching(/^情况 3：枢轴是 \d$/),
    '合并三种情况',
  ]);

  const pivotMark = pages[0].visuals.cellMarks?.find(
    mark => mark.role === 'established',
  );
  expect(pivotMark).toBeDefined();
  const pivot = pivotMark!.cell;
  const wings = pages[0].visuals.cellMarks
    ?.filter(mark => mark.role === 'potential')
    .map(mark => mark.cell);
  const targetDigit = f.step.eliminations[0].digit;
  expect(wings).toHaveLength(2);
  expect(pages[0].visuals.spotlightCells).toHaveLength(3);
  expect(pages[0].visuals.links).toHaveLength(2);
  expect(pages[1].visuals.links).toHaveLength(
    2 + f.step.eliminations.length * 3,
  );
  for (const page of pages.slice(1)) {
    expect(
      page.visuals.cellMarks?.filter(mark => mark.role === 'result'),
    ).toEqual(
      f.step.eliminations.map(candidate => ({
        cell: candidate.cell,
        role: 'result',
      })),
    );
  }

  const wingCases = [pages[2], pages[3]];
  expect(
    wingCases.map(page => page.visuals.hypotheticalValues?.[0].cell),
  ).toEqual([pivot, pivot]);
  expect(
    new Set(wingCases.map(page => page.visuals.hypotheticalValues?.[0].digit))
      .size,
  ).toBe(2);
  expect(
    new Set(wingCases.map(page => page.visuals.hypotheticalValues?.[1].cell)),
  ).toEqual(new Set(wings));
  expect(
    wingCases.every(
      page => page.visuals.hypotheticalValues?.[1].digit === targetDigit,
    ),
  ).toBe(true);
  expect(pages[4].visuals.hypotheticalValues).toEqual([
    { cell: pivot, digit: targetDigit, role: 'assumption' },
  ]);
  expect(pages.slice(0, 5).every(page => !page.visuals.showEliminations)).toBe(
    true,
  );
  expect(pages.some(page => page.teaching?.rule === 'reset')).toBe(false);
  for (const target of f.step.eliminations)
    for (const cell of f.step.focusCells)
      expect(teachingPeers(cell, target.cell)).toBe(true);
  expect(pages[5].visuals.eliminations).toEqual(f.step.eliminations);

  const grid = [...f.candidateMasks];
  grid[pivot] = removeCandidate(grid[pivot], f.step.eliminations[0].digit);
  expect(
    buildHintPresentation(f.step, undefined, 'game', grid).pages[0].body,
  ).toContain('does not contain enough');
});

test('simple coloring builds a color trap in six focused scenes', () => {
  const f = fixtureFor('simpleColoring');
  const pages = buildHintPresentation(
    f.step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'game',
    f.candidateMasks,
  ).pages;

  expect(f.step.teaching?.mode).toBe('color_trap');
  expect(pages).toHaveLength(6);
  expect(pages.map(page => page.teaching?.rule)).toEqual([
    'simpleColorStart',
    'simpleColorAlternate',
    'simpleColorNetwork',
    'simpleColorStates',
    'simpleColorTrap',
    'result',
  ]);
  expect(pages.map(page => page.title)).toEqual([
    '找到第一条强链',
    '沿强链交替染色',
    '完成染色网络',
    '理解两种颜色',
    '找到同时看见两色的目标',
    '删除被夹击的候选',
  ]);
  expect(pages[0].visuals.colorMarks).toHaveLength(2);
  expect(pages[0].visuals.links?.filter(link => link.active)).toHaveLength(1);
  expect(pages[0].visuals.spotlightCells).toEqual(
    expect.arrayContaining(
      f.step.eliminations.map(candidate => candidate.cell),
    ),
  );
  expect(pages[1].visuals.colorMarks).toHaveLength(f.step.focusCells.length);
  expect(pages[1].visuals.links?.filter(link => link.active)).toHaveLength(
    f.step.focusCells.length - 1,
  );
  expect(pages[2].visuals.links?.every(link => link.active)).toBe(true);
  expect(
    pages[4].visuals.links?.filter(
      link => link.kind === 'target' && link.active,
    ),
  ).toHaveLength(f.step.eliminations.length * 2);
  for (const page of pages) {
    expect(
      page.visuals.cellMarks?.filter(mark => mark.role === 'result'),
    ).toEqual(
      f.step.eliminations.map(candidate => ({
        cell: candidate.cell,
        role: 'result',
      })),
    );
  }
  expect(pages.slice(0, 5).every(page => !page.visuals.showEliminations)).toBe(
    true,
  );
  expect(pages[5].visuals.eliminations).toEqual(f.step.eliminations);
});

test('simple coloring teaches a same-color wrap separately', () => {
  const f = HINT_LAB_TEACHING_VARIANTS.find(
    fixture => fixture.sourcePuzzleId === 'color-same-side-conflict',
  )!;
  const pages = buildHintPresentation(
    f.step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'game',
    f.candidateMasks,
  ).pages;

  expect(f.step.teaching?.mode).toBe('color_conflict');
  expect(pages).toHaveLength(6);
  expect(pages.map(page => page.teaching?.rule)).toEqual([
    'simpleColorStart',
    'simpleColorAlternate',
    'simpleColorNetworkWithStates',
    'simpleColorWrap',
    'simpleColorWrapInvalid',
    'result',
  ]);
  expect(pages[3].title).toBe('找到同色冲突');
  expect(pages[4].title).toBe('A 色整体不成立');
  expect(pages[5].title).toBe('删除冲突颜色');
  expect(pages[2].body).toContain('所有 A 色候选状态相同');
  expect(pages[3].visuals.hypotheticalValues).toBeUndefined();
  expect(pages[3].visuals.focusRegions).toHaveLength(1);
  expect(pages[3].visuals.diagramRegions).toEqual([
    {
      region: pages[3].visuals.focusRegions?.[0],
      conflict: true,
    },
  ]);
  expect(
    pages[3].visuals.links?.some(link => link.conflict && link.active),
  ).toBe(true);
  expect(pages[3].visuals.showEliminations).toBe(false);
  expect(pages[4].visuals.showEliminations).toBe(true);
  expect(
    pages[4].visuals.candidateMarks?.filter(mark => mark.role === 'excluded'),
  ).toEqual(
    f.step.eliminations.map(candidate => ({
      ...candidate,
      role: 'excluded',
      exclusionKind: 'result',
    })),
  );
  expect(pages[4].visuals.links?.some(link => link.conflict)).toBe(false);
  expect(pages[5].visuals.eliminations).toEqual(f.step.eliminations);
});

test('multi coloring separates both components and visualizes the type-one inference', () => {
  const f = fixtureFor('multiColoring');
  const pages = buildHintPresentation(
    f.step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'game',
    f.candidateMasks,
  ).pages;

  expect(f.step.teaching?.mode).toBe('multi_color');
  expect(pages).toHaveLength(7);
  expect(pages.map(page => page.teaching?.rule)).toEqual([
    'multiOverview',
    'multiComponent',
    'multiComponent',
    'multiConflict',
    'multiOpposite',
    'multiTarget',
    'result',
  ]);
  expect(pages.map(page => page.title)).toEqual([
    '这是一个多重染色',
    '查看分量 1',
    '查看分量 2',
    '找到跨分量冲突',
    '至少一种反色成立',
    '目标看见两个反色',
    '删除目标候选',
  ]);
  expect(pages.every(page => page.visuals.showColorLegend)).toBe(true);
  for (const page of pages)
    expect(
      page.visuals.cellMarks?.filter(mark => mark.role === 'result'),
    ).toEqual(
      f.step.eliminations.map(candidate => ({
        cell: candidate.cell,
        role: 'result',
      })),
    );
  expect(
    pages[1].visuals.colorMarks?.every(
      mark => mark.active === (mark.component === 0),
    ),
  ).toBe(true);
  expect(
    pages[2].visuals.colorMarks?.every(
      mark => mark.active === (mark.component === 1),
    ),
  ).toBe(true);
  expect(
    pages[3].visuals.links?.filter(link => link.conflict && link.active),
  ).toHaveLength(1);
  expect(pages[3].visuals.focusRegions).toHaveLength(1);
  const forcedMarks = pages[4].visuals.colorMarks?.filter(mark => mark.active);
  expect(new Set(forcedMarks?.map(mark => mark.component))).toEqual(
    new Set([0, 1]),
  );
  for (const component of [0, 1])
    expect(
      new Set(
        forcedMarks
          ?.filter(mark => mark.component === component)
          .map(mark => mark.color),
      ).size,
    ).toBe(1);
  const pageFiveActiveCells = new Set(
    pages[4].visuals.colorMarks
      ?.filter(mark => mark.active)
      .map(mark => mark.cell),
  );
  for (const target of f.step.eliminations)
    pageFiveActiveCells.add(target.cell);
  expect(new Set(pages[4].visuals.spotlightCells)).toEqual(pageFiveActiveCells);
  expect(
    pages[5].visuals.links?.filter(
      link => link.kind === 'target' && link.active,
    ),
  ).toHaveLength(f.step.eliminations.length * 2);
  const pageSixTargetLinks =
    pages[5].visuals.links?.filter(
      link => link.kind === 'target' && link.active,
    ) ?? [];
  expect(new Set(pages[5].visuals.spotlightCells)).toEqual(
    new Set([
      ...pageSixTargetLinks.map(link => link.from),
      ...pageSixTargetLinks.map(link => link.to),
    ]),
  );
  expect(pages[5].visuals.spotlightCells).toHaveLength(3);
  expect(pages.slice(0, 6).every(page => !page.visuals.showEliminations)).toBe(
    true,
  );
  expect(pages[6].visuals.eliminations).toEqual(f.step.eliminations);
});

test('remote pair follows a witness path and shows both assignments', () => {
  const f = fixtureFor('remotePair');
  const pages = buildHintPresentation(
    f.step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'game',
    f.candidateMasks,
  ).pages;

  expect(f.step.teaching?.mode).toBe('remote_pair');
  expect(pages).toHaveLength(6);
  expect(pages.map(page => page.teaching?.rule)).toEqual([
    'remoteOverview',
    'remotePairCells',
    'remoteAlternate',
    'remoteCase',
    'remoteCase',
    'result',
  ]);
  const pairDigits = [
    ...new Set(f.step.premiseCandidates.map(candidate => candidate.digit)),
  ].sort();
  expect(pages.map(page => page.title)).toEqual([
    '这是一个远程数对',
    '确认相同的双值数对',
    '沿连续路径交替取值',
    `情况 1：A 是 ${pairDigits[0]}，B 是 ${pairDigits[1]}`,
    `情况 2：A 是 ${pairDigits[1]}，B 是 ${pairDigits[0]}`,
    '从目标删除远程数对',
  ]);
  expect(pages.every(page => page.visuals.showColorLegend)).toBe(true);
  const targetCells = new Set(
    f.step.eliminations.map(candidate => candidate.cell),
  );
  for (const page of pages)
    expect(
      new Set(
        page.visuals.cellMarks
          ?.filter(mark => mark.role === 'result')
          .map(mark => mark.cell),
      ),
    ).toEqual(targetCells);
  expect(pages[2].visuals.links?.some(link => link.active)).toBe(true);
  for (const page of pages.slice(3, 5)) {
    const targetLinks =
      page.visuals.links?.filter(
        link => link.kind === 'target' && link.active,
      ) ?? [];
    expect(targetLinks).toHaveLength(targetCells.size * 2);
    expect(new Set(page.visuals.spotlightCells)).toEqual(
      new Set([
        ...targetLinks.map(link => link.from),
        ...targetLinks.map(link => link.to),
      ]),
    );
    expect(
      new Set(page.visuals.hypotheticalValues?.map(value => value.cell)),
    ).toEqual(new Set(targetLinks.map(link => link.from)));
  }
  expect(pages.slice(0, 5).every(page => !page.visuals.showEliminations)).toBe(
    true,
  );
  expect(pages[5].visuals.eliminations).toEqual(f.step.eliminations);
});

test('complex coloring visualizes each cross-component implication and the closing contradiction', () => {
  const f = fixtureFor('complexColoring');
  const propagation = f.step.teaching?.branches.find(branch =>
    branch.nodes.every(node => node.rule === 'color_on'),
  )?.nodes;
  expect(propagation).toBeDefined();
  const pages = buildHintPresentation(
    f.step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'game',
    f.candidateMasks,
  ).pages;

  expect(f.step.teaching?.mode).toBe('complex_color');
  expect(pages).toHaveLength(propagation!.length + 3);
  expect(pages.map(page => page.teaching?.rule)).toEqual([
    'complexOverview',
    'complexAssume',
    ...propagation!.slice(1).map(() => 'complexPropagation'),
    'complexContradiction',
    'result',
  ]);
  expect(pages[0].title).toBe('这是一个复杂染色');
  expect(pages[1].title).toBe('假设目标颜色成立');
  expect(pages.at(-2)?.title).toBe('假设推出了它的反色');
  expect(pages.at(-1)?.title).toBe('删除不可能的颜色');
  expect(pages.every(page => page.visuals.showColorLegend)).toBe(true);

  const targetCells = new Set(
    f.step.eliminations.map(candidate => candidate.cell),
  );
  for (const page of pages)
    expect(
      new Set(
        page.visuals.cellMarks
          ?.filter(mark => mark.role === 'result')
          .map(mark => mark.cell),
      ),
    ).toEqual(targetCells);

  const propagationPages = pages.slice(2, -2);
  for (const [index, page] of propagationPages.entries()) {
    expect(page.title).toContain(
      `传播 ${index + 1}/${propagationPages.length}`,
    );
    expect(
      page.visuals.links?.filter(link => link.conflict && link.active),
    ).toHaveLength(1);
    expect(
      page.visuals.candidateMarks?.filter(
        mark =>
          mark.role === 'excluded' && mark.exclusionKind === 'explanation',
      ),
    ).toHaveLength(1);
    expect(page.visuals.showEliminations).toBe(false);
    for (const target of targetCells)
      expect(page.visuals.spotlightCells).toContain(target);
  }

  const contradiction = pages.at(-2)!;
  expect(
    new Set(
      contradiction.visuals.colorMarks
        ?.filter(mark => mark.conflict)
        .map(mark => `${mark.component}:${mark.color}`),
    ).size,
  ).toBe(2);
  expect(pages.slice(0, -1).every(page => !page.visuals.showEliminations)).toBe(
    true,
  );
  expect(pages.at(-1)?.visuals.eliminations).toEqual(f.step.eliminations);
});

test('W-Wing teaches the two strong-link cases as five focused scenes', () => {
  const f = fixtureFor('wWing');
  const pages = buildHintPresentation(
    f.step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'game',
    f.candidateMasks,
  ).pages;

  expect(pages).toHaveLength(5);
  expect(pages.map(page => page.teaching?.rule)).toEqual([
    'wWingWings',
    'wWingLink',
    'wWingCase',
    'wWingCase',
    'result',
  ]);
  expect(pages.map(page => page.title)).toEqual([
    '这是一个 W-Wing',
    '查看完整 W-Wing',
    expect.stringMatching(/^情况 1：R\dC\d 是 \d$/),
    expect.stringMatching(/^情况 2：R\dC\d 是 \d$/),
    '合并两种情况',
  ]);
  expect(pages[0].visuals.spotlightCells).toHaveLength(2);
  expect(pages[0].visuals.links).toEqual([]);
  expect(pages[1].visuals.focusRegions).toHaveLength(1);
  expect(pages[1].visuals.spotlightCells).toEqual(
    expect.arrayContaining([
      ...pages[0].visuals.spotlightCells!,
      ...f.step.eliminations.map(candidate => candidate.cell),
    ]),
  );
  expect(pages[1].visuals.links).toHaveLength(
    3 + f.step.eliminations.length * 2,
  );
  const strongLink = pages[1].visuals.links!.find(
    link => link.kind === 'pair',
  )!;
  expect(strongLink).toMatchObject({
    kind: 'pair',
    active: true,
  });
  expect(
    pages[1].visuals.cellMarks?.filter(mark => mark.role === 'potential'),
  ).toHaveLength(2);
  expect(
    pages[1].visuals.cellMarks?.filter(mark => mark.role === 'established'),
  ).toHaveLength(2);
  expect(
    pages[1].visuals.cellMarks?.filter(mark => mark.role === 'result'),
  ).toEqual(
    f.step.eliminations.map(candidate => ({
      cell: candidate.cell,
      role: 'result',
    })),
  );
  for (const page of pages.slice(2)) {
    expect(
      page.visuals.cellMarks?.filter(mark => mark.role === 'result'),
    ).toEqual(
      f.step.eliminations.map(candidate => ({
        cell: candidate.cell,
        role: 'result',
      })),
    );
  }
  const targetDigit = f.step.eliminations[0].digit;
  const firstCase = pages[2].visuals.hypotheticalValues!;
  const secondCase = pages[3].visuals.hypotheticalValues!;
  expect([firstCase[0].cell, secondCase[0].cell].sort((a, b) => a - b)).toEqual(
    [strongLink.from, strongLink.to].sort((a, b) => a - b),
  );
  expect(firstCase.map(value => value.role)).toEqual([
    'assumption',
    'consequence',
  ]);
  expect(secondCase.map(value => value.role)).toEqual([
    'assumption',
    'consequence',
  ]);
  expect(firstCase[1].digit).toBe(targetDigit);
  expect(secondCase[1].digit).toBe(targetDigit);
  expect(
    pages
      .slice(2, 4)
      .every(page =>
        page.visuals.candidateMarks?.some(
          mark =>
            f.step.eliminations.some(
              target =>
                target.cell === mark.cell && target.digit === mark.digit,
            ) &&
            mark.role === 'excluded' &&
            mark.exclusionKind === 'explanation',
        ),
      ),
  ).toBe(true);
  expect(pages[4].visuals.hypotheticalValues).toEqual([]);
  expect(pages[4].visuals.eliminations).toEqual(f.step.eliminations);
  expect(pages[4].body).toContain(`两翼至少一格是 ${targetDigit}`);
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

  expect(pages).toHaveLength(32);
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
  expect(
    pages.find(p => p.teaching?.rule === 'aicContradictionResult')?.body,
  ).toBe('推导结果与“R1C4=1 不成立”矛盾，所以R1C4=1 成立。');
  const contradictionPages = pages.filter(
    page =>
      page.visuals.hypotheticalValues?.filter(value => value.conflict)
        .length === 2,
  );
  expect(pages).toHaveLength(12);
  expect(pages.some(page => page.teaching?.rule === 'reset')).toBe(false);
  expect(contradictionPages).toHaveLength(1);
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
  expect(pages).toHaveLength(8);
  expect(
    pages.find(p => p.teaching?.rule === 'aicContradictionResult')?.body,
  ).toBe('推导结果与“R1C4=1 成立”矛盾，所以R1C4=1 不成立。');
  expect(pages[0].body).toContain('先看高亮的第4列、第4行、第7列、第1行');
  expect(pages[0].title).toBe('观察位置');
  expect(pages.slice(1, -1).every(page => page.title === '推理过程')).toBe(
    true,
  );
  expect(pages.at(-1)?.title).toBe('结论');
  expect(pages.filter(page => page.teaching?.rule === 'weak')).toHaveLength(2);
  expect(
    pages.filter(page =>
      ['strong', 'cellStrong'].includes(page.teaching?.rule ?? ''),
    ),
  ).toHaveLength(2);
  const contradictionPages = pages.filter(
    page =>
      page.visuals.hypotheticalValues?.filter(value => value.conflict)
        .length === 2,
  );
  expect(contradictionPages).toHaveLength(1);
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
