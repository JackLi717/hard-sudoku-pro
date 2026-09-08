import React from 'react';
import Renderer from 'react-test-renderer';
import { Animated, StyleSheet } from 'react-native';
import {
  HINT_LAB_ALL_FIXTURES,
  createHintLabSession,
} from '../src/debug/hint-lab';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import { teachingCellsIn } from '../src/domain/hints/teaching-presentation';
import { HINT_PRESENTATION_COPIES } from '../src/localization/hint-presentation-copy';
import { candidateMaskFor } from '../src/domain/sudoku/board';
import type { RegionRef } from '../src/domain/sudoku/contracts';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import { ThemeProvider } from '../src/ui/theme';

const fixture = HINT_LAB_ALL_FIXTURES.find(
  f => f.techniqueCode === 'hiddenPair',
)!;
const copy = HINT_PRESENTATION_COPIES['zh-Hans'];
const build = () =>
  buildHintPresentation(fixture.step, copy, 'game', fixture.candidateMasks);

test('shows the entire row from the start and deletes only the pair cells extra candidates', () => {
  const before = JSON.stringify(fixture);
  const { pages } = build();
  expect(pages.map(p => p.teaching?.rule)).toEqual([
    'hiddenPairObserve',
    'hiddenPairReserve',
    'hiddenPairExclude',
  ]);
  expect(pages.map(p => p.body)).toEqual([
    '第3行里，2和4都只能出现在这两格。',
    '2和4必须各占一格，这两格不能再填其他数字。',
    '所以，可以删除这两格中标出的8候选。',
  ]);
  const region = { kind: 'row' as const, index: 2 };
  for (const page of pages) {
    expect(page.visuals.focusRegions).toEqual([region]);
    expect(page.visuals.spotlightCells).toEqual(teachingCellsIn(region));
    expect(page.visuals.focusCells).toEqual([18, 26]);
  }
  expect(pages[0].visuals.candidateRevealOrder).toEqual([2, 4]);
  expect(pages[1].visuals.candidateRevealOrder).toBeUndefined();
  for (const page of pages.slice(0, 2)) {
    expect(page.visuals.showEliminations).toBe(false);
    expect(
      page.visuals.candidateMarks?.every(mark => mark.role === 'potential'),
    ).toBe(true);
  }
  expect(pages[2].visuals.eliminations).toEqual([
    { cell: 18, digit: 8 },
    { cell: 26, digit: 8 },
  ]);
  expect(pages[2].visuals.placements).toEqual([]);
  expect(JSON.stringify(fixture)).toBe(before);
});

test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
  '%s has the same short scenes in game and replay',
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
      expect(page.body + page.title).not.toMatch(/\{\w+\}|R\dC\d|已验证/);
  },
);

test('rejects another occurrence outside the pair and a deletion outside the pair', () => {
  const candidates = [...fixture.candidateMasks];
  candidates[25] += candidateMaskFor(2);
  expect(
    buildHintPresentation(fixture.step, copy, 'game', candidates).pages[0].body,
  ).toBe(copy.teaching.legacy);
  const step = {
    ...fixture.step,
    proofSteps: undefined,
    eliminations: [{ cell: 25, digit: 8 as const }],
  };
  expect(
    buildHintPresentation(step, copy, 'game', fixture.candidateMasks).pages[0]
      .body,
  ).toBe(copy.teaching.legacy);
});

test.each([
  [{ kind: 'row', index: 0 }, [0, 3]],
  [{ kind: 'column', index: 0 }, [0, 27]],
  [{ kind: 'box', index: 0 }, [0, 10]],
] as [RegionRef, number[]][])(
  'recognizes all occurrence positions in %j',
  (region, focus) => {
    const candidates = Array(81).fill(511);
    for (const cell of teachingCellsIn(region))
      candidates[cell] -= candidateMaskFor(2) + candidateMaskFor(4);
    for (const cell of focus)
      candidates[cell] =
        candidateMaskFor(2) + candidateMaskFor(4) + candidateMaskFor(8);
    const step = {
      ...fixture.step,
      boardFingerprint: '0'.repeat(81),
      proofSteps: undefined,
      focusCells: focus,
      focusRegions: [region],
      premiseCandidates: focus.flatMap(cell => [
        { cell, digit: 2 as const },
        { cell, digit: 4 as const },
      ]),
      eliminations: focus.map(cell => ({ cell, digit: 8 as const })),
    };
    const { pages } = buildHintPresentation(step, copy, 'game', candidates);
    expect(pages).toHaveLength(3);
    expect(pages[0].visuals.focusRegions).toEqual([region]);
  },
);

test.each(['light', 'dark'] as const)(
  '%s preserves every real 8 and cleans up strikes on back',
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
      for (const cell of [18, 25, 26]) {
        const node = tree.root.findByProps({
          testID: `sudoku-cell-index-${cell}`,
        });
        expect(
          node.findAllByProps({ testID: 'sudoku-candidate-slot-8' }).length,
        ).toBeGreaterThan(0);
        expect(
          node.findAllByProps({ testID: 'sudoku-candidate-strike-8' }).length >
            0,
        ).toBe(index === 2 && cell !== 25);
      }
      if (index === 0) {
        const node = tree.root.findByProps({ testID: 'sudoku-cell-index-18' });
        for (const digit of [2, 4])
          expect(
            StyleSheet.flatten(
              node.findByProps({
                testID: `sudoku-candidate-potential-${digit}`,
              }).props.style,
            ).opacity.__getValue(),
          ).toBe(1);
      }
    }
    expect(JSON.stringify(state)).toBe(before);
    await Renderer.act(async () => tree.unmount());
  },
);

test('emphasizes 2 before 4 while keeping ordinary notes underneath', async () => {
  let transition!: Animated.Value;
  const timing = jest.spyOn(Animated, 'timing').mockImplementation(value => {
    transition = value as Animated.Value;
    return { start: jest.fn(), stop: jest.fn(), reset: jest.fn() };
  });
  let tree!: Renderer.ReactTestRenderer;
  try {
    await Renderer.act(async () => {
      tree = Renderer.create(
        <SudokuBoard
          state={createHintLabSession(fixture).state}
          hintVisuals={build().pages[0].visuals}
          hintAnimationDurationMs={140}
          hintAnimations
          onSelectCell={jest.fn()}
        />,
      );
    });
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: 900 }),
    );
    const node = tree.root.findByProps({ testID: 'sudoku-cell-index-18' });
    const opacity = (digit: number) =>
      StyleSheet.flatten(
        node.findByProps({ testID: `sudoku-candidate-potential-${digit}` })
          .props.style,
      ).opacity.__getValue();
    for (const digit of [2, 4])
      expect(
        node.findAllByProps({ testID: `sudoku-candidate-base-${digit}` })
          .length,
      ).toBeGreaterThan(0);
    await Renderer.act(async () => transition.setValue(0.4));
    expect(opacity(2)).toBe(1);
    expect(opacity(4)).toBe(0);
    await Renderer.act(async () => transition.setValue(1));
    expect(opacity(4)).toBe(1);
  } finally {
    if (tree) await Renderer.act(async () => tree.unmount());
    timing.mockRestore();
  }
});
