import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import { ThemeProvider } from '../src/ui/theme';
import { warmPaperTheme } from '../src/ui/themes/warm-paper';
import { HintLab } from '../src/debug/HintLab';
import { HINT_LAB_EXPERIMENTS } from '../src/debug/hint-lab';
import { buildHintPresentation } from '../src/domain';
import { LocalizationProvider } from '../src/localization';

jest.mock('../src/domain', () => ({
  ...jest.requireActual('../src/domain'),
  buildHintPresentation: jest.fn(
    jest.requireActual('../src/domain').buildHintPresentation,
  ),
}));
jest.mock('../src/ui/components/SudokuBoard', () => ({
  SudokuBoard: () => null,
}));
jest.mock('../src/debug/hint-lab-store', () => ({
  ...jest.requireActual('../src/debug/hint-lab-store'),
  HintLabStore: jest.fn().mockImplementation(() => ({
    initialize: async () => undefined,
    readAll: async () => new Map(),
    save: async () => undefined,
    close: jest.fn(),
  })),
}));

let tree: Renderer.ReactTestRenderer;
beforeEach(async () => {
  jest.mocked(buildHintPresentation).mockClear();
  await act(async () => {
    tree = Renderer.create(
      <LocalizationProvider locale="en">
        <HintLab onClose={jest.fn()} />
      </LocalizationProvider>,
    );
  });
});
afterEach(() => {
  act(() => tree.unmount());
});

function press(text: string) {
  const button = tree.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(
      node => node.findAll(child => child.props.children === text).length > 0,
    );
  expect(button).toBeDefined();
  act(() => button!.props.onPress());
}
function cards() {
  return tree.root
    .findAll(node => typeof node.props.onPress === 'function')
    .filter(node => node.props.accessibilityLabel?.startsWith('Open '));
}

test('catalog does not build walkthroughs on initial load or filtering', () => {
  expect(cards()).toHaveLength(HINT_LAB_EXPERIMENTS.length);
  expect(buildHintPresentation).not.toHaveBeenCalled();
  press('L5');
  expect(cards()).toHaveLength(
    HINT_LAB_EXPERIMENTS.filter(experiment => experiment.difficultyLevel === 5)
      .length,
  );
  expect(buildHintPresentation).not.toHaveBeenCalled();
});

test('retains the level filter after opening and returning from an experiment', () => {
  press('L5');
  const labels = cards().map(card => card.props.accessibilityLabel);
  act(() => cards()[0].props.onPress());
  expect(buildHintPresentation).toHaveBeenCalledTimes(1);
  press('‹ Catalog');
  expect(cards().map(card => card.props.accessibilityLabel)).toEqual(labels);
  expect(buildHintPresentation).toHaveBeenCalledTimes(1);
});

test('selects multiple boards inside one technique experiment', () => {
  press('L5');
  const levelFive = HINT_LAB_EXPERIMENTS.filter(
    experiment => experiment.difficultyLevel === 5,
  );
  const groupedIndex = levelFive.findIndex(
    experiment => experiment.techniqueCode === 'groupedAic',
  );
  act(() => cards()[groupedIndex].props.onPress());
  expect(buildHintPresentation).toHaveBeenCalledTimes(1);
  const chooser = tree.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(node => node.props.accessibilityLabel?.startsWith('Choose example'));
  expect(chooser).toBeDefined();
  act(() => chooser!.props.onPress());
  const secondExample = tree.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(node => node.props.accessibilityLabel?.startsWith('Open example 2'));
  expect(secondExample).toBeDefined();
  act(() => secondExample!.props.onPress());
  expect(buildHintPresentation).toHaveBeenCalledTimes(2);
});

test('lab catalog and open walkthrough follow the current appearance', async () => {
  const render = (mode: 'light' | 'dark') => (
    <ThemeProvider preference={mode}>
      <LocalizationProvider locale="en">
        <HintLab onClose={jest.fn()} />
      </LocalizationProvider>
    </ThemeProvider>
  );
  await act(async () => {
    tree.update(render('dark'));
  });
  const title = (value: string) =>
    tree.root.findAllByType(Text).find(node => node.props.children === value)!;
  expect(StyleSheet.flatten(title('Hint Lab').props.style).color).toBe(
    warmPaperTheme.appearances.dark.palette.ink,
  );
  act(() => {
    cards()[0].props.onPress();
  });
  expect(
    StyleSheet.flatten(title('Acceptance checklist').props.style).color,
  ).toBe(warmPaperTheme.appearances.dark.palette.ink);
  await act(async () => {
    tree.update(render('light'));
  });
  expect(
    StyleSheet.flatten(title('Acceptance checklist').props.style).color,
  ).toBe(warmPaperTheme.appearances.light.palette.ink);
});
