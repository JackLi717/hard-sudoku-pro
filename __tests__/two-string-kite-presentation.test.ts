import { buildHintPresentation } from '../src/domain/hints/presentation';
import { twoStringKiteProof } from '../src/domain/hints/two-string-kite-proof';
import { HINT_PRESENTATION_COPIES } from '../src/localization';
import {
  boardFromFingerprint,
  createSolverCandidates,
  addCandidate,
  removeCandidate,
} from '../src/domain/sudoku/board';
import { HintStep } from '../src/domain/hints/contracts';
import { HINT_LAB_FIXTURES } from '../src/debug/hint-lab';
import { kiteBoard, kiteHint } from './helpers/ipad-hint-assistance';

const candidates = createSolverCandidates(boardFromFingerprint(kiteBoard));

test.each(Object.entries(HINT_PRESENTATION_COPIES))(
  '%s explains the actual kite without changing the hint or candidates',
  (_locale, copy) => {
    const before = JSON.stringify({ kiteHint, candidates });
    const { pages } = buildHintPresentation(kiteHint, copy, 'game', candidates);
    expect(pages).toHaveLength(5);
    expect(pages.map(p => p.kind)).toEqual([
      'observe',
      'reason',
      'reason',
      'reason',
      'apply',
    ]);
    for (const page of pages) {
      expect(page.body).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(page.body.length).toBeGreaterThan(20);
      expect(page.visuals.placements).toEqual([]);
      expect(page.visuals.showPlacements).toBe(false);
      expect(page.visuals.focusRegions).toEqual(
        page.visuals.regionMarks?.map(mark => mark.region),
      );
      expect(page.visuals.links?.every(link => !link.extendFrom)).toBe(true);
    }
    for (const page of pages) {
      expect(page.visuals.spotlightCells).toEqual(
        expect.arrayContaining([32, 35, 62, 77, 79]),
      );
    }
    expect(pages[0].visuals.spotlightCells).toHaveLength(5);
    expect(pages[1].visuals.spotlightCells).toEqual(
      expect.arrayContaining([
        27, 28, 29, 30, 31, 32, 33, 34, 35, 5, 14, 23, 41, 50, 59, 68, 77,
      ]),
    );
    expect(pages[2].visuals.spotlightCells).toEqual(
      expect.arrayContaining([72, 73, 74, 75, 76, 77, 78, 79, 80]),
    );
    expect(pages.map(page => page.visuals.links?.length)).toEqual(
      Array(5).fill(5),
    );
    expect(
      pages.map(page => page.visuals.links?.filter(link => link.active).length),
    ).toEqual([5, 2, 2, 3, 5]);
    expect(
      pages.map(page => page.visuals.links?.filter(link => link.muted).length),
    ).toEqual([0, 3, 3, 2, 0]);
    expect(pages[1].visuals.hypotheticalValues).toEqual([
      { cell: 32, digit: 3, role: 'assumption' },
    ]);
    expect(pages[1].visuals.eliminations).toEqual([
      { cell: 77, digit: 3 },
      { cell: 35, digit: 3 },
    ]);
    expect(pages[2].visuals.hypotheticalValues).toContainEqual({
      cell: 79,
      digit: 3,
      role: 'consequence',
    });
    expect(pages[3].visuals.hypotheticalValues).toEqual(
      expect.arrayContaining([
        { cell: 79, digit: 3, role: 'consequence', conflict: true },
        { cell: 62, digit: 3, role: 'consequence', conflict: true },
      ]),
    );
    expect(
      pages
        .slice(0, -1)
        .flatMap(p => p.visuals.candidateMarks ?? [])
        .filter(c => c.role === 'excluded' && c.exclusionKind === 'result'),
    ).toEqual([]);
    expect(pages[4].visuals.hypotheticalValues).toEqual([]);
    expect(pages[4].visuals.eliminations).toEqual(kiteHint.eliminations);
    expect(JSON.stringify({ kiteHint, candidates })).toBe(before);
  },
);

test('kite keeps its core cells visible and adds the house explained on each page', () => {
  const pages = buildHintPresentation(kiteHint).pages;
  expect(pages[0].visuals.spotlightCells).toHaveLength(5);
  expect(pages[1].visuals.spotlightCells).toEqual(
    expect.arrayContaining([
      27, 28, 29, 30, 31, 32, 33, 34, 35, 5, 14, 23, 41, 50, 59, 68, 77,
    ]),
  );
  expect(pages[2].visuals.spotlightCells).toEqual(
    expect.arrayContaining([72, 73, 74, 75, 76, 77, 78, 79, 80]),
  );
  expect(pages[1].visuals.regionMarks).toEqual([
    { region: { kind: 'column', index: 5 }, role: 'source' },
    { region: { kind: 'row', index: 3 }, role: 'source' },
  ]);
  expect(pages[2].visuals.regionMarks).toEqual([
    { region: { kind: 'row', index: 8 }, role: 'source' },
  ]);
  expect(pages[3].visuals.regionMarks).toEqual([
    { region: { kind: 'column', index: 8 }, role: 'source' },
    { region: { kind: 'box', index: 8 }, role: 'source' },
  ]);
  expect(pages[4].visuals.regionMarks).toEqual([
    { region: { kind: 'box', index: 8 }, role: 'source' },
  ]);
});

test('Chinese explains the because/therefore steps, including the exact conflicting cells', () => {
  const { pages } = buildHintPresentation(
    kiteHint,
    HINT_PRESENTATION_COPIES['zh-Hans'],
  );
  expect(pages[1].body).toContain('第6列');
  expect(pages[1].body).toContain('第4行');
  expect(pages[2].body).toContain('第9行');
  expect(pages[2].body).toContain('R9C6');
  expect(pages[3].body).toContain('R9C8和R7C9同在第9宫');
  expect(pages[4].body).toContain('假设不成立');
  expect(pages.map(p => p.body).join(' ')).not.toMatch(
    /强链|弱链|端点|必须成立/,
  );
});

test('rotated and renumbered kites explain their own cells, independent of premise order', () => {
  const rotate = (cell: number) => (cell % 9) * 9 + 8 - Math.floor(cell / 9);
  const digits = (value: string) =>
    value === '3' ? '8' : value === '8' ? '3' : value;
  const board = Array.from({ length: 81 }, () => '0');
  [...kiteBoard].forEach((v, cell) => {
    board[rotate(cell)] = digits(v);
  });
  const step: HintStep = {
    ...kiteHint,
    boardFingerprint: board.join(''),
    focusCells: kiteHint.focusCells.map(rotate),
    premiseCandidates: [...kiteHint.premiseCandidates]
      .reverse()
      .map(c => ({ cell: rotate(c.cell), digit: 8 })),
    eliminations: kiteHint.eliminations.map(c => ({
      cell: rotate(c.cell),
      digit: 8,
    })),
  };
  expect(twoStringKiteProof(step)?.digit).toBe(8);
  const pages = buildHintPresentation(step).pages;
  expect(pages).toHaveLength(5);
  expect(pages[1].visuals.hypotheticalValues?.[0]).toMatchObject({
    cell: rotate(32),
    digit: 8,
  });
  expect(pages.at(-1)?.visuals.eliminations).toEqual(step.eliminations);
});

test('uses the saved candidate snapshot and refuses unsupported or inconsistent assumptions', () => {
  const step: HintStep = { ...kiteHint, boardFingerprint: '0'.repeat(81) };
  const snapshot = Array.from({ length: 81 }, (_, cell) => {
    const inPairLine = Math.floor(cell / 9) === 8 || cell % 9 === 8;
    return inPairLine && ![77, 79, 35, 62].includes(cell)
      ? removeCandidate(511, 3)
      : 511;
  });
  expect(twoStringKiteProof(step)).toBeNull();
  expect(
    buildHintPresentation(step, undefined, 'replay', snapshot).pages,
  ).toHaveLength(5);
  const extra = [...snapshot];
  extra[72] = addCandidate(extra[72], 3);
  expect(twoStringKiteProof(step, extra)).toBeNull();
  const missing = [...snapshot];
  missing[77] = 0;
  expect(twoStringKiteProof(step, missing)).toBeNull();
  expect(
    twoStringKiteProof(
      { ...step, eliminations: [{ cell: 1, digit: 3 }] },
      snapshot,
    ),
  ).toBeNull();
  expect(
    twoStringKiteProof(
      { ...kiteHint, eliminations: [{ cell: 32, digit: 4 }] },
      candidates,
    ),
  ).toBeNull();
  expect(
    buildHintPresentation(step, undefined, 'game', extra).pages.every(
      p => !p.visuals.hypotheticalValues,
    ),
  ).toBe(true);
});

test('separate deletion targets get separate assumptions and one final atomic result', () => {
  const step: HintStep = {
    ...kiteHint,
    boardFingerprint: '0'.repeat(81),
    focusCells: [0, 1, 9],
    premiseCandidates: [0, 1, 9].map(cell => ({ cell, digit: 3 })),
    eliminations: [10, 11].map(cell => ({ cell, digit: 3 })),
  };
  const snapshot = Array.from({ length: 81 }, (_, cell) =>
    (Math.floor(cell / 9) === 0 || cell % 9 === 0) && ![0, 1, 9].includes(cell)
      ? removeCandidate(511, 3)
      : 511,
  );
  const pages = buildHintPresentation(step, undefined, 'game', snapshot).pages;
  expect(pages).toHaveLength(8);
  expect(pages[1].visuals.hypotheticalValues?.[0].cell).toBe(10);
  expect(pages[4].visuals.hypotheticalValues).toEqual([
    { cell: 11, digit: 3, role: 'assumption' },
  ]);
  expect(pages.filter(p => p.kind === 'apply')).toHaveLength(1);
  expect(pages.at(-1)?.visuals.eliminations).toEqual(step.eliminations);
});

test('the native-generated kite fixture gets the same complete causal walkthrough', () => {
  const fixture = HINT_LAB_FIXTURES.find(
    f => f.techniqueCode === 'twoStringKite',
  )!;
  const presentation = buildHintPresentation(
    fixture.step,
    undefined,
    'replay',
    fixture.candidateMasks,
  );
  expect(
    presentation.pages[0].visuals.links?.filter(link => link.kind === 'pair'),
  ).toHaveLength(2);
  expect(
    presentation.pages[0].visuals.links?.filter(link => link.kind === 'peer'),
  ).toHaveLength(1);
  expect(presentation.pages.length).toBeGreaterThanOrEqual(5);
  expect(presentation.pages.at(-1)?.visuals.eliminations).toEqual(
    fixture.step.eliminations,
  );
});
