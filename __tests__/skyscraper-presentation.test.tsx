import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { HintStep } from '../src/domain/hints/contracts';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import { skyscraperProof } from '../src/domain/hints/turbot-fish-proof';
import {
  HINT_PRESENTATION_COPIES,
  LocalizationProvider,
} from '../src/localization';
import { HINT_LAB_FIXTURES } from '../src/debug/hint-lab';
import {
  boardFromFingerprint,
  createSolverCandidates,
  removeCandidate,
  addCandidate,
} from '../src/domain/sudoku/board';
import { kiteGame } from './helpers/ipad-hint-assistance';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import { ThemeProvider } from '../src/ui/theme';

const board =
  '627419538139285700485637219574391682213800490968042301892063100351904800746108903';
const step: HintStep = {
  contractVersion: 1,
  boardFingerprint: board,
  techniqueCode: 'skyscraper',
  difficultyLevel: 4,
  focusCells: [48, 57, 44, 62],
  focusRegions: [],
  premiseCandidates: [48, 57, 44, 62].map(cell => ({ cell, digit: 5 })),
  eliminations: [{ cell: 40, digit: 5 }],
  placements: [],
  explanationKey: 'hint.skyscraper',
  explanationParams: {},
};
const candidates = createSolverCandidates(boardFromFingerprint(board));

test.each(Object.entries(HINT_PRESENTATION_COPIES))(
  '%s shares the structure once and preserves the original result',
  (locale, copy) => {
    const saved = JSON.stringify({ step, candidates });
    const pages = buildHintPresentation(step, copy, 'game', candidates).pages;
    expect(pages).toHaveLength(5);
    expect(skyscraperProof(step)).toMatchObject({
      firstEnd: 48,
      firstInner: 57,
      secondEnd: 44,
      secondInner: 62,
      firstRegion: { kind: 'column', index: 3 },
      secondRegion: { kind: 'column', index: 8 },
      conflictRegion: { kind: 'row', index: 6 },
    });
    for (const page of pages) {
      expect(page.body).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(page.visuals.diagramDigit).toBe(5);
      expect(page.visuals.placements).toEqual([]);
      expect(page.visuals.spotlightCells).toEqual(
        pages[0].visuals.spotlightCells,
      );
      expect(page.visuals.links?.map(l => [l.from, l.to, l.kind])).toEqual(
        pages[0].visuals.links?.map(l => [l.from, l.to, l.kind]),
      );
    }
    for (const cell of ['R6C4', 'R7C4', 'R5C9', 'R7C9']) {
      expect(pages[0].body).toContain(cell);
    }
    expect(pages[0].visuals.spotlightCells).not.toContain(46);
    expect(pages[0].visuals.spotlightCells).not.toContain(43);
    const structureTerms = {
      en: ['strong link', 'if one end is false'],
      ja: ['強リンク', '一方が偽'],
      de: ['stark verknüpft', 'ein Ende falsch'],
      'zh-Hans': ['强链', '一端不成立'],
    }[locale as keyof typeof HINT_PRESENTATION_COPIES];
    for (const term of structureTerms) expect(pages[0].body).toContain(term);
    expect(pages[1].visuals.focusRegions).toEqual([{ kind: 'row', index: 6 }]);
    expect(
      pages[1].visuals.links?.find(link => link.kind === 'peer'),
    ).toMatchObject({ active: true });
    expect(pages[2].visuals.eliminations).toEqual([
      { cell: 48, digit: 5 },
      { cell: 62, digit: 5 },
    ]);
    expect(pages[2].visuals.reasoningCandidates).toEqual([
      { cell: 57, digit: 5, role: 'consequence' },
      { cell: 44, digit: 5, role: 'consequence' },
    ]);
    expect(
      pages[3].visuals.links?.filter(l => l.kind === 'target' && l.active),
    ).toEqual([
      { from: 40, to: 48, kind: 'target', active: true, conflict: false },
      { from: 40, to: 44, kind: 'target', active: true, conflict: false },
    ]);
    expect(pages[3].visuals.eliminations).toEqual(step.eliminations);
    expect(pages[3].visuals.reasoningCandidates).toEqual([]);
    expect(pages[4].visuals.eliminations).toEqual(step.eliminations);
    expect(pages[4].visuals.reasoningCandidates).toEqual([]);
    expect(JSON.stringify({ step, candidates })).toBe(saved);
  },
);

test('rotates the towers into rows and renumbers every deduction', () => {
  const rotate = (cell: number) => (cell % 9) * 9 + 8 - Math.floor(cell / 9);
  const transformed = Array(81).fill('0');
  [...board].forEach((v, c) => {
    transformed[rotate(c)] = v === '5' ? '2' : v === '2' ? '5' : v;
  });
  const rotated: HintStep = {
    ...step,
    boardFingerprint: transformed.join(''),
    focusCells: step.focusCells.map(rotate),
    premiseCandidates: [...step.premiseCandidates]
      .reverse()
      .map(c => ({ cell: rotate(c.cell), digit: 2 })),
    eliminations: [{ cell: rotate(40), digit: 2 }],
  };
  expect(skyscraperProof(rotated)).toMatchObject({
    firstRegion: { kind: 'row', index: 3 },
    secondRegion: { kind: 'row', index: 8 },
    conflictRegion: { kind: 'column', index: 2 },
  });
  const pages = buildHintPresentation(rotated).pages;
  expect(pages).toHaveLength(5);
  expect(pages[2].visuals.reasoningCandidates?.every(c => c.digit === 2)).toBe(
    true,
  );
});

test('summarizes both targets through one shared proof, then keeps the apply result', () => {
  const multiple: HintStep = {
    ...step,
    eliminations: [...step.eliminations, { cell: 52, digit: 5 }],
  };
  const pages = buildHintPresentation(multiple).pages;
  expect(pages).toHaveLength(5);
  expect(pages[3].title).toBe('At least one roof is true');
  expect(pages[3].body).toContain('R5C5, R6C8');
  expect(pages[3].visuals.reasoningCandidates).toEqual([]);
  expect(pages[3].visuals.eliminations).toEqual(multiple.eliminations);
  expect(
    pages[3].visuals.links?.filter(
      link => link.kind === 'target' && link.active,
    ),
  ).toHaveLength(4);
  expect(pages.filter(p => p.kind === 'apply')).toHaveLength(1);
  expect(pages[4].visuals.eliminations).toEqual(multiple.eliminations);
  expect(pages[4].visuals.reasoningCandidates).toEqual([]);
});

test('requires exact parallel pairs and validates the saved candidate snapshot', () => {
  const empty: HintStep = { ...step, boardFingerprint: '0'.repeat(81) };
  const snapshot = Array.from({ length: 81 }, (_, cell) =>
    [3, 8].includes(cell % 9) && !step.focusCells.includes(cell)
      ? removeCandidate(511, 5)
      : 511,
  );
  expect(skyscraperProof(empty)).toBeNull();
  expect(
    buildHintPresentation(empty, undefined, 'replay', snapshot).pages,
  ).toHaveLength(5);
  const extra = [...snapshot];
  extra[3] = addCandidate(extra[3], 5);
  expect(skyscraperProof(empty, extra)).toBeNull();
  expect(
    skyscraperProof({ ...step, eliminations: [{ cell: 76, digit: 5 }] }),
  ).toBeNull();
  expect(
    skyscraperProof({ ...step, eliminations: [{ cell: 40, digit: 4 }] }),
  ).toBeNull();
  const fish = {
    ...step,
    focusCells: [44, 52, 76, 79],
    premiseCandidates: [44, 52, 76, 79].map(cell => ({
      cell,
      digit: 5 as const,
    })),
  };
  expect(skyscraperProof(fish)).toBeNull();
  expect(
    buildHintPresentation(empty, undefined, 'game', extra).pages.every(
      p => p.visuals.diagramDigit === undefined,
    ),
  ).toBe(true);
});

test('native skyscraper fixture receives the diagram and keeps its solver result', () => {
  const fixture = HINT_LAB_FIXTURES.find(
    f => f.techniqueCode === 'skyscraper',
  )!;
  const pages = buildHintPresentation(
    fixture.step,
    undefined,
    'game',
    fixture.candidateMasks,
  ).pages;
  expect(pages).toHaveLength(5);
  expect(pages[0].visuals.diagramDigit).toBeDefined();
  expect(pages.at(-1)?.visuals.eliminations).toEqual(fixture.step.eliminations);
});

test('uses the aligned row even when the bases also share a box, and rejects an X-Wing', () => {
  const pattern = [0, 27, 10, 28];
  const sameBox: HintStep = {
    ...step,
    boardFingerprint: '0'.repeat(81),
    focusCells: pattern,
    premiseCandidates: pattern.map(cell => ({ cell, digit: 5 })),
    eliminations: [{ cell: 20, digit: 5 }],
  };
  const snapshot = Array.from({ length: 81 }, (_, cell) =>
    [0, 1].includes(cell % 9) && !pattern.includes(cell)
      ? removeCandidate(511, 5)
      : 511,
  );
  expect(skyscraperProof(sameBox, snapshot)?.conflictRegion).toEqual({
    kind: 'row',
    index: 3,
  });
  const xwingPattern = [0, 27, 1, 28];
  const xwing = {
    ...sameBox,
    focusCells: xwingPattern,
    premiseCandidates: xwingPattern.map(cell => ({ cell, digit: 5 as const })),
  };
  const xwingSnapshot = Array.from({ length: 81 }, (_, cell) =>
    [0, 1].includes(cell % 9) && !xwingPattern.includes(cell)
      ? removeCandidate(511, 5)
      : 511,
  );
  expect(skyscraperProof(xwing, xwingSnapshot)).toBeNull();
});

test.each(['light', 'dark'] as const)(
  'shows the strong-weak-strong chain and clears it in %s',
  async theme => {
    const state = {
      ...kiteGame().state,
      values: boardFromFingerprint(board),
      activeHint: step,
    };
    state.candidates = { ...state.candidates, hintCandidates: candidates };
    const saved = JSON.stringify(state);
    const pages = buildHintPresentation(
      step,
      HINT_PRESENTATION_COPIES['zh-Hans'],
    ).pages;
    let renderer!: Renderer.ReactTestRenderer;
    const render = (page: number) => (
      <LocalizationProvider locale="zh-Hans">
        <ThemeProvider preference={theme}>
          <SudokuBoard
            state={state}
            hintVisuals={pages[page].visuals}
            hintAnimations={false}
            disabled
            onSelectCell={jest.fn()}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    await act(async () => {
      renderer = Renderer.create(render(2));
    });
    const get = (testID: string) => renderer.root.findAllByProps({ testID })[0];
    expect(get('sudoku-diagram-cross-48')).toBeDefined();
    expect(get('sudoku-diagram-cross-62')).toBeDefined();
    expect(get('sudoku-reasoning-true-single-57-5')).toBeDefined();
    expect(get('sudoku-reasoning-true-single-44-5')).toBeDefined();
    await act(async () => renderer.update(render(3)));
    expect(get('sudoku-diagram-cross-40')).toBeDefined();
    for (const page of [0, 1, 3, 4]) {
      await act(async () => renderer.update(render(page)));
      expect(
        renderer.root.findAll(
          n =>
            typeof n.props.testID === 'string' &&
            (n.props.testID.startsWith('sudoku-reasoning-true-single-') ||
              n.props.testID.startsWith('sudoku-reasoning-false-single-')),
        ),
      ).toHaveLength(0);
    }
    expect(JSON.stringify(state)).toBe(saved);
    await act(async () => renderer.unmount());
  },
);
