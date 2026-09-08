import React from 'react';
import Renderer from 'react-test-renderer';
import {
  HINT_LAB_ALL_FIXTURES,
  createHintLabSession,
} from '../src/debug/hint-lab';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import { teachingCellsIn } from '../src/domain/hints/teaching-presentation';
import { HINT_PRESENTATION_COPIES } from '../src/localization/hint-presentation-copy';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import { ThemeProvider } from '../src/ui/theme';
import {
  boardFromFingerprint,
  candidateMaskFor,
  createSolverCandidates,
} from '../src/domain/sudoku/board';
import type { Digit } from '../src/domain/sudoku/contracts';

const fixture = HINT_LAB_ALL_FIXTURES.find(
  f => f.techniqueCode === 'lockedTriple',
)!;
const copy = HINT_PRESENTATION_COPIES['zh-Hans'];
const build = () =>
  buildHintPresentation(fixture.step, copy, 'game', fixture.candidateMasks);

test('teaches the unequal candidate sets in three scenes without revealing eliminations early', () => {
  const before = JSON.stringify(fixture);
  const { pages } = build();
  expect(pages.map(page => page.teaching?.rule)).toEqual([
    'lockedTripleObserve',
    'lockedTripleLock',
    'lockedTripleExclude',
  ]);
  expect(pages.map(page => page.title)).toEqual([
    '观察三数组',
    '理解锁定',
    '展示排除',
  ]);
  expect(pages[0].body).toBe('这三格只能用5、7、9，三个数字必然各占一格。');
  expect(pages[0].visuals.spotlightCells).toEqual([33, 34, 35]);
  expect(pages[0].visuals.focusRegions).toEqual([]);
  expect(pages[0].visuals.candidateMarks).toHaveLength(8);
  expect(pages[0].visuals.candidateMarks).not.toContainEqual({
    cell: 35,
    digit: 9,
    role: 'potential',
  });
  expect(pages[1].body).toBe(
    '它们同时在第4行、第6宫，两个区域里的5、7、9都被这三格占住了。',
  );
  const regions = [
    { kind: 'row' as const, index: 3 },
    { kind: 'box' as const, index: 5 },
  ];
  expect(pages[1].visuals.regionRevealOrder).toEqual(regions);
  for (const page of pages.slice(1)) {
    expect(page.visuals.focusRegions).toEqual(regions);
    expect(page.visuals.spotlightCells).toEqual([
      ...new Set(regions.flatMap(teachingCellsIn)),
    ]);
  }
  for (const page of pages.slice(0, 2)) {
    expect(page.visuals.showEliminations).toBe(false);
    expect(
      page.visuals.candidateMarks?.every(mark => mark.role === 'potential'),
    ).toBe(true);
  }
  expect(pages[2].body).toBe('所以，可以删除标出的5、7、9候选。');
  expect(pages[2].visuals.eliminations).toEqual(fixture.step.eliminations);
  expect(pages[2].visuals.placements).toEqual([]);
  expect(JSON.stringify(fixture)).toBe(before);
});

test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
  '%s shares concise scenes across game and replay',
  locale => {
    const localized = HINT_PRESENTATION_COPIES[locale];
    const game = buildHintPresentation(
      fixture.step,
      localized,
      'game',
      fixture.candidateMasks,
    );
    expect(game.pages).toHaveLength(3);
    expect(
      buildHintPresentation(
        fixture.step,
        localized,
        'replay',
        fixture.candidateMasks,
      ).pages,
    ).toEqual(game.pages);
    for (const page of game.pages)
      expect(page.body + page.title).not.toMatch(/\{\w+\}|R\dC\d|并集/);
  },
);

test.each([[[0, 3, 6]], [[0, 10, 20]]])(
  'rejects an ordinary triple mislabeled as locked at %j',
  focusCells => {
    const boardFingerprint = '0'.repeat(81);
    const candidates = [
      ...createSolverCandidates(boardFromFingerprint(boardFingerprint)),
    ];
    const sets: Digit[][] = [
      [5, 7],
      [7, 9],
      [5, 9],
    ];
    const premises = focusCells.flatMap((cell, i) => {
      candidates[cell] = sets[i].reduce(
        (mask, digit) => mask + candidateMaskFor(digit),
        0,
      );
      return sets[i].map(digit => ({ cell, digit }));
    });
    const step = {
      ...fixture.step,
      proofSteps: undefined,
      boardFingerprint,
      focusCells,
      premiseCandidates: premises,
      eliminations: [{ cell: 1, digit: 5 as const }],
    };
    expect(
      buildHintPresentation(step, copy, 'game', candidates).pages[0].body,
    ).toBe(copy.teaching.legacy);
  },
);

test('rejects a fourth candidate omitted from the claimed triple', () => {
  const candidates = [...fixture.candidateMasks];
  candidates[33] += candidateMaskFor(2);
  expect(
    buildHintPresentation(fixture.step, copy, 'game', candidates).pages[0].body,
  ).toBe(copy.teaching.legacy);
});

test.each(['light', 'dark'] as const)(
  '%s keeps the missing 9 absent through forward and back navigation',
  async mode => {
    const state = createHintLabSession(fixture).state;
    const before = JSON.stringify(state);
    const { pages } = build();
    let tree!: Renderer.ReactTestRenderer;
    for (const index of [0, 1, 2, 0]) {
      await Renderer.act(async () => {
        const view = (
          <ThemeProvider preference={mode}>
            <SudokuBoard
              state={state}
              hintVisuals={pages[index].visuals}
              hintAnimations={false}
              onSelectCell={jest.fn()}
            />
          </ThemeProvider>
        );
        if (tree) tree.update(view);
        else tree = Renderer.create(view);
      });
      const third = tree.root.findByProps({ testID: 'sudoku-cell-index-35' });
      expect(
        third.findAllByProps({ testID: 'sudoku-candidate-potential-9' }),
      ).toHaveLength(0);
      for (const digit of [5, 7])
        expect(
          third.findAllByProps({
            testID: `sudoku-candidate-potential-${digit}`,
          }).length,
        ).toBeGreaterThan(0);
    }
    expect(JSON.stringify(state)).toBe(before);
    await Renderer.act(async () => tree.unmount());
  },
);
