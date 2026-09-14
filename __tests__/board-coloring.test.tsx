import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { createGameSession } from '../src/domain/game/engine';
import { LocalizationProvider } from '../src/localization';
import {
  BOARD_COLOR_SWATCHES,
  SudokuBoard,
  boardVisualLayers,
} from '../src/ui/components/SudokuBoard';
import { ThemeProvider, lightPalette } from '../src/ui/theme';

const session = createGameSession({
  sessionId: 'colors',
  definition: {
    puzzleId: 'colors',
    contentVersion: 1,
    difficultyLevel: 1,
    puzzleFingerprint: '0'.repeat(81),
    solutionFingerprint:
      '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  },
  startedAtEpochMs: 1,
});

const event = (x: number, y: number) => ({
  nativeEvent: { pageX: x, pageY: y, locationX: 999, locationY: 999 },
});

test('visual layer policy gives Hint priority and keeps selection outlines visible', () => {
  expect(boardVisualLayers(false, true)).toMatchObject({
    playerAnnotations: true,
    ordinaryBackgrounds: false,
    hintOverlays: false,
    selectionOutlines: true,
  });
  expect(boardVisualLayers(true, true)).toMatchObject({
    playerAnnotations: false,
    hintOverlays: true,
    selectionOutlines: true,
  });
});

test('one drag paints every crossed cell as a single action, including skipped move events', async () => {
  const onColorCells = jest.fn();
  const onSelectCell = jest.fn();
  const origin = { x: 42, y: 180 };
  let measured: ((x: number, y: number) => void) | null = null;
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <SudokuBoard
            state={session.state}
            coloringColor={3}
            measureBoardInWindow={callback => {
              measured = callback;
            }}
            onColorCells={onColorCells}
            onSelectCell={onSelectCell}
          />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
  const board = renderer.root.findByProps({ testID: 'sudoku-board' });
  const size = StyleSheet.flatten(board.props.style).width as number;
  const center = size / 18;
  expect(board.props.onMoveShouldSetResponderCapture).toBeUndefined();
  await act(async () => {
    board.props.onTouchStart(event(origin.x + center, origin.y + center));
    board.props.onTouchMove(event(origin.x + center + 2, origin.y + center));
    board.props.onTouchMove(event(origin.x + center * 5, origin.y + center));
    board.props.onTouchEnd(event(origin.x + center * 5, origin.y + center));
    expect(onColorCells).not.toHaveBeenCalled();
    measured?.(origin.x, origin.y);
  });
  expect(onColorCells).toHaveBeenCalledTimes(1);
  expect(onSelectCell).toHaveBeenCalledTimes(1);
  expect(onSelectCell).toHaveBeenCalledWith(0);
  expect(onColorCells).toHaveBeenCalledWith([0, 1, 2], false);
  expect(BOARD_COLOR_SWATCHES).toHaveLength(6);
  await act(async () => renderer.unmount());
});

test('a coloring tap focuses the touched cell and marks the action as a toggle', async () => {
  const onColorCells = jest.fn();
  const onSelectCell = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <SudokuBoard
            state={session.state}
            coloringColor={3}
            onColorCells={onColorCells}
            onSelectCell={onSelectCell}
          />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
  const board = renderer.root.findByProps({ testID: 'sudoku-board' });
  const cell = renderer.root.findByProps({ testID: 'sudoku-cell-index-0' });
  await act(async () => {
    board.props.onTouchStart(event(42, 180));
    board.props.onTouchMove(event(44, 181));
    board.props.onTouchEnd(event(44, 181));
    cell.props.onPress();
    expect(onSelectCell).toHaveBeenCalledWith(0);
  });
  expect(onColorCells).toHaveBeenCalledWith([0], true);
  await act(async () => renderer.unmount());
});

test('long press retains cell handling in Color and after Color closes', async () => {
  const onLongPressCell = jest.fn();
  const onColorCells = jest.fn();
  const render = (coloringColor: 3 | null) => (
    <LocalizationProvider locale="en">
      <ThemeProvider preference="light">
        <SudokuBoard
          state={session.state}
          coloringColor={coloringColor}
          onColorCells={onColorCells}
          onLongPressCell={onLongPressCell}
          onSelectCell={jest.fn()}
        />
      </ThemeProvider>
    </LocalizationProvider>
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(render(3));
  });
  let board = renderer.root.findByProps({ testID: 'sudoku-board' });
  await act(async () => {
    board.props.onTouchStart(event(42, 180));
    renderer.root
      .findByProps({ testID: 'sudoku-cell-index-0' })
      .props.onLongPress();
    board.props.onTouchMove(event(80, 180));
    board.props.onTouchEnd(event(80, 180));
  });
  expect(board.props.onMoveShouldSetResponderCapture).toBeUndefined();
  expect(onLongPressCell).toHaveBeenCalledWith(0);
  expect(onColorCells).not.toHaveBeenCalled();
  await act(async () => renderer.update(render(null)));
  board = renderer.root.findByProps({ testID: 'sudoku-board' });
  expect(board.props.onTouchStart).toBeUndefined();
  expect(board.props.onMoveShouldSetResponderCapture).toBeUndefined();
  await act(async () => {
    renderer.root
      .findByProps({ testID: 'sudoku-cell-index-1' })
      .props.onLongPress();
  });
  expect(onLongPressCell).toHaveBeenCalledWith(1);
  await act(async () => renderer.unmount());
});

test('annotation focus suppresses ordinary cell backgrounds but retains color and selection outline', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <SudokuBoard
            state={{
              ...session.state,
              selectedCell: 0,
              annotations: [{ type: 'cell', cell: 1, color: 4 }],
            }}
            coloringFocused
            highlightRegions
            showSelection
            onSelectCell={jest.fn()}
          />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
  const selected = renderer.root.findByProps({ testID: 'sudoku-cell-index-0' });
  const colored = renderer.root.findByProps({ testID: 'sudoku-cell-index-1' });
  expect(StyleSheet.flatten(selected.props.style).backgroundColor).toBe(
    lightPalette.surface,
  );
  expect(StyleSheet.flatten(colored.props.style).backgroundColor).toBe(
    lightPalette.surface,
  );
  expect(
    renderer.root.findByProps({ testID: 'sudoku-selection-0' }),
  ).toBeTruthy();
  expect(
    renderer.root.findByProps({ testID: 'sudoku-board-color-1' }),
  ).toBeTruthy();
  await act(async () => renderer.unmount());
});

test('hint visuals hide player annotations so semantic overlays own the board', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <SudokuBoard
            state={{
              ...session.state,
              annotations: [{ type: 'cell', cell: 0, color: 4 }],
            }}
            hintVisuals={{
              showFocusCells: true,
              showFocusRegions: false,
              showPremises: false,
              showEliminations: false,
              showPlacements: false,
              focusCells: [0],
            }}
            onSelectCell={jest.fn()}
          />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
  expect(
    renderer.root.findAllByProps({ testID: 'sudoku-board-color-0' }),
  ).toHaveLength(0);
  await act(async () => renderer.unmount());
});
