import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { HintLab } from '../src/debug/HintLab';
import { HINT_LAB_ALL_FIXTURES } from '../src/debug/hint-lab';
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
  expect(cards()).toHaveLength(HINT_LAB_ALL_FIXTURES.length);
  expect(buildHintPresentation).not.toHaveBeenCalled();
  press('L5');
  expect(cards()).toHaveLength(
    HINT_LAB_ALL_FIXTURES.filter(fixture => fixture.difficultyLevel === 5)
      .length,
  );
  expect(buildHintPresentation).not.toHaveBeenCalled();
});

test('retains level and status filters after opening and returning from a fixture', () => {
  press('L5');
  press('Untested');
  const labels = cards().map(card => card.props.accessibilityLabel);
  act(() => cards()[0].props.onPress());
  expect(buildHintPresentation).toHaveBeenCalledTimes(1);
  press('‹ Catalog');
  expect(cards().map(card => card.props.accessibilityLabel)).toEqual(labels);
  expect(buildHintPresentation).toHaveBeenCalledTimes(1);

  // Changing an acceptance status must still affect the preserved status filter.
  act(() => cards()[0].props.onPress());
  press('Issue');
  press('‹ Catalog');
  expect(cards()).toHaveLength(labels.length - 1);
});
