import React from 'react';
import Renderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { createGameSession } from '../src/domain';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import { RecordBoard } from '../src/ui/technique-growth/TechniqueGraphic';
import { ThemeProvider } from '../src/ui/theme';
import { warmPaperTheme } from '../src/ui/themes/warm-paper';

const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const session = createGameSession({
  sessionId: 'bands',
  startedAtEpochMs: 1000,
  definition: {
    puzzleId: 'bands',
    contentVersion: 4,
    difficultyLevel: 3,
    puzzleFingerprint: '0'.repeat(81),
    solutionFingerprint: solution,
  },
});

test.each(['light', 'dark'] as const)(
  '%s uses two alternating box shades on boards and thumbnails and can disable them',
  async mode => {
    let tree!: Renderer.ReactTestRenderer;
    const colors = warmPaperTheme.appearances[mode].boardTheme.colors;
    const preview = {
      values: session.state.values,
      givens: session.state.givens,
      focus: null,
    };
    const render = (enabled: boolean) => (
      <ThemeProvider preference={mode} alternatingBoxShading={enabled}>
        <SudokuBoard state={session.state} onSelectCell={jest.fn()} />
        <RecordBoard preview={preview} size={180} label="preview" />
      </ThemeProvider>
    );
    await Renderer.act(() => {
      tree = Renderer.create(render(true));
    });
    for (let cell = 0; cell < 81; cell++) {
      const expected = [1, 3, 5, 7].includes(
        Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3),
      )
        ? colors.alternateBoxSurface
        : colors.surface;
      expect(
        StyleSheet.flatten(
          tree.root.findByProps({ testID: `sudoku-cell-index-${cell}` }).props
            .style,
        ).backgroundColor,
      ).toBe(expected);
    }
    expect(colors.alternateBoxSurface).not.toBe(colors.surface);
    const miniatureCells = () =>
      tree.root
        .findByProps({ testID: 'growth-record-board' })
        .findAll(
          node =>
            StyleSheet.flatten(node.props.style)?.borderRightColor !==
              undefined && typeof node.type === 'string',
        );
    expect(miniatureCells()).toHaveLength(81);
    miniatureCells().forEach((cell, index) => {
      expect(StyleSheet.flatten(cell.props.style).backgroundColor).toBe(
        [1, 3, 5, 7].includes(
          Math.floor(index / 27) * 3 + Math.floor((index % 9) / 3),
        )
          ? colors.alternateBoxSurface
          : colors.surface,
      );
    });
    await Renderer.act(() => tree.update(render(false)));
    for (let cell = 0; cell < 81; cell++) {
      expect(
        StyleSheet.flatten(
          tree.root.findByProps({ testID: `sudoku-cell-index-${cell}` }).props
            .style,
        ).backgroundColor,
      ).toBe(colors.surface);
    }
    miniatureCells().forEach(cell =>
      expect(StyleSheet.flatten(cell.props.style).backgroundColor).toBe(
        colors.surface,
      ),
    );
    await Renderer.act(() => tree.unmount());
  },
);

test('semantic highlighting takes priority over the alternate box shade', async () => {
  let tree!: Renderer.ReactTestRenderer;
  const colors = warmPaperTheme.appearances.light.boardTheme.colors;
  await Renderer.act(() => {
    tree = Renderer.create(
      <ThemeProvider preference="light" alternatingBoxShading>
        <SudokuBoard
          state={{ ...session.state, selectedCell: 27, incorrectCells: [28] }}
          onSelectCell={jest.fn()}
        />
      </ThemeProvider>,
    );
  });
  const background = (cell: number) =>
    StyleSheet.flatten(
      tree.root.findByProps({ testID: `sudoku-cell-index-${cell}` }).props
        .style,
    ).backgroundColor;
  expect(background(28)).toBe(colors.errorSoft);
  expect(background(29)).toBe(colors.peer);
  expect(background(44)).toBe(colors.alternateBoxSurface);
  await Renderer.act(() => {
    tree.update(
      <ThemeProvider preference="light" alternatingBoxShading>
        <SudokuBoard
          state={session.state}
          onSelectCell={jest.fn()}
          hintVisuals={{
            showFocusCells: false,
            showFocusRegions: false,
            showPremises: false,
            showPlacements: false,
            showEliminations: false,
            regionMarks: [
              { region: { kind: 'row', index: 3 }, role: 'fishCover' },
            ],
          }}
        />
      </ThemeProvider>,
    );
  });
  expect(background(28)).toBe(colors.fishCoverSoft);
  expect(background(44)).toBe(colors.alternateBoxSurface);
  await Renderer.act(() => tree.unmount());
});

test.each(['light', 'dark'] as const)(
  '%s hides the live cursor and its background gap while retaining replay focus',
  async mode => {
    let tree!: Renderer.ReactTestRenderer;
    const colors = warmPaperTheme.appearances[mode].boardTheme.colors;
    const onSelect = jest.fn();
    const state = { ...session.state, selectedCell: 30 };
    const render = (showSelection: boolean, highlightRegions = true) => (
      <ThemeProvider preference={mode}>
        <SudokuBoard
          state={state}
          onSelectCell={onSelect}
          showSelection={showSelection}
          highlightRegions={highlightRegions}
        />
      </ThemeProvider>
    );
    await Renderer.act(() => {
      tree = Renderer.create(render(false));
    });
    const cell = () =>
      tree.root.findByProps({ testID: 'sudoku-cell-index-30' });
    const cursor = () =>
      tree.root.findAllByProps({ testID: 'sudoku-selection-30' });
    expect(cursor()).toHaveLength(0);
    expect(StyleSheet.flatten(cell().props.style).backgroundColor).toBe(
      colors.peer,
    );
    expect(cell().props.accessibilityState.selected).toBe(true);
    await Renderer.act(() => cell().props.onPress());
    expect(onSelect).toHaveBeenCalledWith(30);
    await Renderer.act(() => tree.update(render(false, false)));
    expect(StyleSheet.flatten(cell().props.style).backgroundColor).toBe(
      colors.surface,
    );
    await Renderer.act(() => tree.update(render(true)));
    expect(cursor().length).toBeGreaterThan(0);
    expect(StyleSheet.flatten(cursor()[0].props.style).borderColor).toBe(
      colors.focus,
    );
    await Renderer.act(() => tree.unmount());
  },
);
