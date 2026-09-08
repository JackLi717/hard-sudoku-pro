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
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import { ThemeProvider } from '../src/ui/theme';
import { warmPaperTheme } from '../src/ui/themes/warm-paper';
import {
  candidateMaskFor,
  createSolverCandidates,
  boardFromFingerprint,
} from '../src/domain/sudoku/board';

const fixture = HINT_LAB_ALL_FIXTURES.find(
  f => f.techniqueCode === 'lockedPair',
)!;
const copy = HINT_PRESENTATION_COPIES['zh-Hans'];
const build = () =>
  buildHintPresentation(fixture.step, copy, 'game', fixture.candidateMasks);

test('teaches the pair and both shared regions before showing any deletion', () => {
  const before = JSON.stringify(fixture);
  const { pages } = build();
  expect(pages.map(page => page.teaching?.rule)).toEqual([
    'lockedPairObserve',
    'lockedPairLock',
    'lockedPairExclude',
  ]);
  expect(pages.map(page => page.title)).toEqual([
    '观察数对',
    '理解锁定',
    '展示排除',
  ]);
  expect(pages[0].visuals.spotlightCells).toEqual(fixture.step.focusCells);
  expect(pages[0].visuals.focusRegions).toEqual([]);
  expect(pages[0].body).toContain('必然一格填');
  const regions = pages[1].visuals.focusRegions!;
  expect(regions).toHaveLength(2);
  expect(regions[0].kind).not.toBe('box');
  expect(regions[1].kind).toBe('box');
  expect(pages[1].visuals.regionRevealOrder).toEqual(regions);
  const cells = [...new Set(regions.flatMap(teachingCellsIn))];
  for (const page of pages.slice(1))
    expect(page.visuals.spotlightCells).toEqual(cells);
  for (const page of pages.slice(0, 2)) {
    expect(page.visuals.showEliminations).toBe(false);
    expect(
      page.visuals.candidateMarks?.every(mark => mark.role === 'potential'),
    ).toBe(true);
    expect(page.visuals.placements ?? []).toEqual([]);
  }
  expect(pages[2].visuals.eliminations).toEqual(fixture.step.eliminations);
  expect(pages[2].visuals.placements).toEqual([]);
  expect(pages[2].body).not.toMatch(/R\dC\d|并集|已验证/);
  expect(JSON.stringify(fixture)).toBe(before);
});

test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
  '%s uses the same three scenes in live play and replay',
  locale => {
    const localized = HINT_PRESENTATION_COPIES[locale];
    const game = buildHintPresentation(
      fixture.step,
      localized,
      'game',
      fixture.candidateMasks,
    );
    const replay = buildHintPresentation(
      fixture.step,
      localized,
      'replay',
      fixture.candidateMasks,
    );
    expect(replay.pages).toEqual(game.pages);
    for (const page of game.pages)
      expect(page.body + page.title).not.toMatch(/\{\w+\}/);
  },
);

test.each([
  [0, 3], // Same row, different boxes: ordinary naked pair.
  [0, 10], // Same box, different rows and columns.
])('rejects a mislabeled ordinary pair at %j and %j', (a, b) => {
  const boardFingerprint = '0'.repeat(81);
  const candidates = [
    ...createSolverCandidates(boardFromFingerprint(boardFingerprint)),
  ];
  candidates[a] = candidateMaskFor(2) + candidateMaskFor(4);
  candidates[b] = candidates[a];
  const step = {
    ...fixture.step,
    proofSteps: undefined,
    boardFingerprint,
    focusCells: [a, b],
    premiseCandidates: [a, b].flatMap(cell => [
      { cell, digit: 2 as const },
      { cell, digit: 4 as const },
    ]),
    eliminations: [{ cell: 1, digit: 2 as const }],
  };
  expect(
    buildHintPresentation(step, copy, 'game', candidates).pages[0].body,
  ).toBe(copy.teaching.legacy);
});

test.each(['light', 'dark'] as const)(
  '%s region reveal respects the selected theme and back navigation',
  async mode => {
    const { pages } = build();
    const source = warmPaperTheme.appearances[mode];
    const colors = {
      ...source.boardTheme.colors,
      hintRegion: '#123456',
      hintExcluded: '#AB3456',
    };
    const theme = {
      ...warmPaperTheme,
      appearances: {
        ...warmPaperTheme.appearances,
        [mode]: { ...source, boardTheme: { ...source.boardTheme, colors } },
      },
    };
    const state = createHintLabSession(fixture).state;
    const before = JSON.stringify(state);
    let tree!: Renderer.ReactTestRenderer;
    const render = (index: number) => (
      <ThemeProvider preference={mode} theme={theme}>
        <SudokuBoard
          state={state}
          hintVisuals={pages[index].visuals}
          hintAnimations={false}
          onSelectCell={jest.fn()}
        />
      </ThemeProvider>
    );
    await Renderer.act(async () => {
      tree = Renderer.create(render(1));
    });
    for (const cell of pages[1].visuals.spotlightCells!) {
      const reveal = tree.root.findByProps({
        testID: `sudoku-region-reveal-${cell}`,
      });
      const style = StyleSheet.flatten(reveal.props.style);
      expect(style.backgroundColor).toBe(colors.hintRegion);
      expect(style.opacity.__getValue()).toBe(1);
    }
    await Renderer.act(async () => tree.update(render(2)));
    expect(
      tree.root.findAll(node =>
        String(node.props.testID).startsWith('sudoku-region-reveal-'),
      ),
    ).toHaveLength(0);
    await Renderer.act(async () => tree.update(render(0)));
    expect(
      tree.root.findAll(node =>
        String(node.props.testID).startsWith('sudoku-region-reveal-'),
      ),
    ).toHaveLength(0);
    expect(JSON.stringify(state)).toBe(before);
    await Renderer.act(async () => tree.unmount());
  },
);

test('the generated teaching example demonstrates exclusions on both sides of the intersection', () => {
  const pages = build().pages;
  const [line, box] = pages[1].visuals.focusRegions!;
  const lineCells = teachingCellsIn(line);
  const boxCells = teachingCellsIn(box);
  expect(
    fixture.step.eliminations.some(
      c => lineCells.includes(c.cell) && !boxCells.includes(c.cell),
    ),
  ).toBe(true);
  expect(
    fixture.step.eliminations.some(
      c => boxCells.includes(c.cell) && !lineCells.includes(c.cell),
    ),
  ).toBe(true);
  expect(pages[0].body).toContain('3和6');
  expect(pages[2].body).toBe('所以，可以删除标出的3候选。');
});

test('reveals the line before the box without layering the intersection twice', async () => {
  const page = build().pages[1];
  const [line, box] = page.visuals.focusRegions!;
  const lineCells = teachingCellsIn(line);
  const boxCells = teachingCellsIn(box);
  const intersection = lineCells.find(cell => boxCells.includes(cell))!;
  const boxOnly = boxCells.find(cell => !lineCells.includes(cell))!;
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
          hintVisuals={page.visuals}
          hintAnimations
          hintAnimationDurationMs={140}
          onSelectCell={jest.fn()}
        />,
      );
    });
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: 900 }),
    );
    const opacity = (cell: number) =>
      StyleSheet.flatten(
        tree.root.findByProps({ testID: `sudoku-region-reveal-${cell}` }).props
          .style,
      ).opacity.__getValue();
    await Renderer.act(async () => transition.setValue(0.4));
    expect(opacity(intersection)).toBe(1);
    expect(opacity(boxOnly)).toBe(0);
    await Renderer.act(async () => transition.setValue(1));
    expect(opacity(intersection)).toBe(1);
    expect(opacity(boxOnly)).toBe(1);
  } finally {
    if (tree) await Renderer.act(async () => tree.unmount());
    timing.mockRestore();
  }
});

test('the transposed pair teaches a shared column and box', () => {
  const transpose = (cell: number) => (cell % 9) * 9 + Math.floor(cell / 9);
  const step = fixture.step;
  const transposed = {
    ...step,
    boardFingerprint: Array.from(
      { length: 81 },
      (_, cell) => step.boardFingerprint[transpose(cell)],
    ).join(''),
    proofSteps: undefined,
    focusCells: step.focusCells.map(transpose),
    focusRegions: step.focusRegions.map(region => ({
      kind:
        region.kind === 'row'
          ? ('column' as const)
          : region.kind === 'column'
          ? ('row' as const)
          : ('box' as const),
      index:
        region.kind === 'box'
          ? (region.index % 3) * 3 + Math.floor(region.index / 3)
          : region.index,
    })),
    premiseCandidates: step.premiseCandidates.map(candidate => ({
      ...candidate,
      cell: transpose(candidate.cell),
    })),
    eliminations: step.eliminations.map(candidate => ({
      ...candidate,
      cell: transpose(candidate.cell),
    })),
  };
  const candidates = Array.from(
    { length: 81 },
    (_, cell) => fixture.candidateMasks[transpose(cell)],
  );
  const { pages } = buildHintPresentation(transposed, copy, 'game', candidates);
  expect(pages).toHaveLength(3);
  expect(
    pages[1].visuals.regionRevealOrder?.map(region => region.kind),
  ).toEqual(['column', 'box']);
  expect(pages[1].body).toContain('列');
  expect(pages[2].visuals.eliminations).toEqual(transposed.eliminations);
});
