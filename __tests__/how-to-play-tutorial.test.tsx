import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { LocalizationProvider } from '../src/localization';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import { HelpScreen } from '../src/ui/screens/ProductInfoScreens';
import { ThemeProvider } from '../src/ui/theme';

jest.mock('../src/ui/components/SudokuBoard', () => ({
  SudokuBoard: jest.fn(() => null),
}));
jest.mock('../src/ui/use-reduced-motion', () => ({
  useReducedMotion: () => true,
}));

async function renderHelp(
  props: Partial<React.ComponentProps<typeof HelpScreen>> = {},
) {
  let tree!: Renderer.ReactTestRenderer;
  await act(() => {
    tree = Renderer.create(
      <LocalizationProvider locale="zh-Hans">
        <ThemeProvider preference="light">
          <HelpScreen onBack={jest.fn()} {...props} />
        </ThemeProvider>
      </LocalizationProvider>,
    );
  });
  return tree;
}

function pressText(tree: Renderer.ReactTestRenderer, text: string) {
  const control = tree.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(
      node => node.findAll(child => child.props.children === text).length > 0,
    );
  expect(control).toBeDefined();
  act(() => control!.props.onPress());
}

function pressId(tree: Renderer.ReactTestRenderer, testID: string) {
  const control = tree.root.findByProps({ testID });
  act(() => control.props.onPress());
}

function boardProps() {
  return jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
}

describe('interactive how-to-play tutorial', () => {
  beforeEach(() => jest.mocked(SudokuBoard).mockClear());

  test('requires the guided actions and completes an isolated board', async () => {
    const changes = jest.fn();
    const startLevelOne = jest.fn();
    const tree = await renderHelp({
      onProgressChange: changes,
      onStartLevelOne: startLevelOne,
    });

    pressText(tree, '开始互动教学');
    expect(boardProps().state.values[2]).toBeNull();
    expect(boardProps().state.values[10]).toBeNull();

    act(() => boardProps().onSelectCell(2));
    pressId(tree, 'tutorial-digit-4');
    expect(boardProps().state.values[2]).toBe(4);

    act(() => boardProps().onSelectCell(10));
    pressId(tree, 'tutorial-pencil');
    pressId(tree, 'tutorial-digit-2');
    pressId(tree, 'tutorial-digit-7');
    expect(boardProps().state.candidates.manualCandidates[10]).toBe(66);

    pressId(tree, 'tutorial-digit-2');
    expect(boardProps().state.candidates.manualCandidates[10]).toBe(64);
    pressId(tree, 'tutorial-pencil');
    pressId(tree, 'tutorial-digit-7');
    expect(boardProps().state.values[10]).toBe(7);

    pressId(tree, 'tutorial-undo');
    expect(boardProps().state.values[10]).toBeNull();
    pressId(tree, 'tutorial-digit-7');

    expect(
      tree.root.findByProps({ testID: 'how-to-play-complete' }),
    ).toBeTruthy();
    expect(changes).toHaveBeenLastCalledWith({
      howToPlayCompleted: true,
      howToPlayProgress: 0,
    });
    pressText(tree, '开始 Level 1');
    expect(startLevelOne).toHaveBeenCalledTimes(1);
  });

  test('restores the board state needed by a saved tutorial step', async () => {
    const tree = await renderHelp({ progress: 7 });
    pressText(tree, '继续教学');

    expect(boardProps().state.values[2]).toBe(4);
    expect(boardProps().state.selectedCell).toBe(10);
    expect(boardProps().state.candidates.pencilMode).toBe(true);
    expect(boardProps().state.candidates.manualCandidates[10]).toBe(66);
    expect(
      tree.root.findByProps({ testID: 'tutorial-instruction' }).props.children,
    ).toBe('这一行已经有数字 2。再次点击 2，把它从候选数中删除。');
  });

  test('an incorrect action does not advance progress', async () => {
    const changes = jest.fn();
    const tree = await renderHelp({ onProgressChange: changes });
    pressText(tree, '开始互动教学');
    changes.mockClear();

    pressId(tree, 'tutorial-digit-4');

    expect(changes).not.toHaveBeenCalled();
    expect(
      tree.root.findByProps({ testID: 'tutorial-instruction' }).props.children,
    ).toBe('请点击高亮的格子或按钮。');
  });
});
