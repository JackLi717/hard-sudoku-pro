import React from 'react';
import Renderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import {
  HINT_LAB_ALL_FIXTURES,
  createHintLabSession,
} from '../src/debug/hint-lab';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import { teachingCellsIn } from '../src/domain/hints/teaching-presentation';
import { HINT_PRESENTATION_COPIES } from '../src/localization/hint-presentation-copy';
import {
  boardFromFingerprint,
  candidateMaskFor,
  createSolverCandidates,
} from '../src/domain/sudoku/board';
import type { RegionRef } from '../src/domain/sudoku/contracts';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import { ThemeProvider } from '../src/ui/theme';
import { warmPaperTheme } from '../src/ui/themes/warm-paper';

const fixture = HINT_LAB_ALL_FIXTURES.find(
  f => f.techniqueCode === 'nakedPair',
)!;
const copy = HINT_PRESENTATION_COPIES['zh-Hans'];
const build = () =>
  buildHintPresentation(fixture.step, copy, 'game', fixture.candidateMasks);

test('teaches the actual column pair in three scenes with no premature deletion', () => {
  const before = JSON.stringify(fixture);
  const { pages } = build();
  expect(pages.map(p => p.teaching?.rule)).toEqual([
    'nakedPairObserve',
    'nakedPairReserve',
    'nakedPairExclude',
  ]);
  expect(pages.map(p => p.title)).toEqual(['观察数对', '理解占位', '展示排除']);
  expect(pages.map(p => p.body)).toEqual([
    '这两格都只有2和4。',
    '第5列内数字不能重复，必然一格填2，另一格填4。',
    '所以，可以删除第5列其他格中标出的2、4候选。',
  ]);
  expect(pages[0].visuals.spotlightCells).toEqual([4, 31]);
  expect(pages[0].visuals.focusRegions).toEqual([]);
  const region = { kind: 'column' as const, index: 4 };
  expect(pages[1].visuals.regionRevealOrder).toEqual([region]);
  for (const page of pages.slice(1)) {
    expect(page.visuals.focusRegions).toEqual([region]);
    expect(page.visuals.spotlightCells).toEqual(teachingCellsIn(region));
  }
  for (const page of pages.slice(0, 2)) {
    expect(page.visuals.showEliminations).toBe(false);
    expect(page.visuals.candidateMarks).toEqual(
      fixture.step.premiseCandidates.map(candidate => ({
        ...candidate,
        role: 'potential',
      })),
    );
  }
  expect(pages[2].visuals.eliminations).toEqual(fixture.step.eliminations);
  expect(pages[2].visuals.placements).toEqual([]);
  expect(JSON.stringify(fixture)).toBe(before);
});

test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
  '%s shares the same concise scenes in game and replay',
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

const sample = (focusCells: number[], target: number) => {
  const boardFingerprint = '0'.repeat(81);
  const candidates = [
    ...createSolverCandidates(boardFromFingerprint(boardFingerprint)),
  ];
  for (const cell of focusCells)
    candidates[cell] = candidateMaskFor(2) + candidateMaskFor(4);
  const step = {
    ...fixture.step,
    proofSteps: undefined,
    boardFingerprint,
    focusCells,
    premiseCandidates: focusCells.flatMap(cell => [
      { cell, digit: 2 as const },
      { cell, digit: 4 as const },
    ]),
    eliminations: [{ cell: target, digit: 2 as const }],
  };
  return { step, candidates };
};

test.each([
  [[0, 3], 6, { kind: 'row', index: 0 }],
  [[0, 27], 54, { kind: 'column', index: 0 }],
  [[0, 10], 20, { kind: 'box', index: 0 }],
  [[0, 1], 10, { kind: 'box', index: 0 }], // Pair also shares a row, but deletion is in the box.
] as [number[], number, RegionRef][])(
  'uses only the shared region supporting the deletion for %j',
  (focus, target, region) => {
    const { step, candidates } = sample(focus, target);
    const { pages } = buildHintPresentation(step, copy, 'game', candidates);
    expect(pages).toHaveLength(3);
    expect(pages[1].visuals.focusRegions).toEqual([region]);
    expect(pages[2].visuals.eliminations).toEqual(step.eliminations);
    expect(pages[2].teaching?.params.digits).toBe('2');
    expect(pages[2].body).not.toContain('2、4');
  },
);

test('rejects shared digits with an extra candidate, and deletions outside the common region', () => {
  const { step, candidates } = sample([0, 3], 6);
  candidates[0] += candidateMaskFor(5);
  expect(
    buildHintPresentation(step, copy, 'game', candidates).pages[0].body,
  ).toBe(copy.teaching.legacy);
  const other = sample([0, 3], 9);
  expect(
    buildHintPresentation(other.step, copy, 'game', other.candidates).pages[0]
      .body,
  ).toBe(copy.teaching.legacy);
});

test.each(['light', 'dark'] as const)(
  '%s keeps the whole column in the selected theme and cleans up on back',
  async mode => {
    const source = warmPaperTheme.appearances[mode];
    const colors = { ...source.boardTheme.colors, hintRegion: '#123456' };
    const theme = {
      ...warmPaperTheme,
      appearances: {
        ...warmPaperTheme.appearances,
        [mode]: { ...source, boardTheme: { ...source.boardTheme, colors } },
      },
    };
    const state = createHintLabSession(fixture).state;
    const before = JSON.stringify(state);
    const { pages } = build();
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
      const style = StyleSheet.flatten(
        tree.root.findByProps({ testID: `sudoku-region-reveal-${cell}` }).props
          .style,
      );
      expect(style.backgroundColor).toBe(colors.hintRegion);
      expect(style.opacity.__getValue()).toBe(1);
    }
    expect(
      tree.root.findAllByProps({ testID: 'sudoku-region-reveal-0' }),
    ).toHaveLength(0);
    await Renderer.act(async () => tree.update(render(2)));
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
