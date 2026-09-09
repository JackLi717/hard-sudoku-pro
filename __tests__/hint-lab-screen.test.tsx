import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { HintLab } from '../src/debug/HintLab';
import { HINT_LAB_ALL_FIXTURES } from '../src/debug/hint-lab';
import { buildHintPresentation } from '../src/domain';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import { LocalizationProvider } from '../src/localization';

jest.mock('../src/domain', () => ({
  ...jest.requireActual('../src/domain'),
  buildHintPresentation: jest.fn(
    jest.requireActual('../src/domain').buildHintPresentation,
  ),
}));
jest.mock('../src/ui/components/SudokuBoard', () => ({
  SudokuBoard: jest.fn(() => null),
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
    .filter(
      node =>
        node.props.accessibilityLabel?.startsWith('Open ') &&
        !node.props.accessibilityLabel?.startsWith('Open example '),
    );
}

test('catalog does not build walkthroughs on initial load or filtering', () => {
  expect(cards()).toHaveLength(39);
  expect(new Set(cards().map(card => card.props.accessibilityLabel)).size).toBe(
    39,
  );
  expect(buildHintPresentation).not.toHaveBeenCalled();
  press('L5');
  expect(cards()).toHaveLength(
    new Set(
      HINT_LAB_ALL_FIXTURES.filter(
        fixture => fixture.difficultyLevel === 5,
      ).map(fixture => fixture.techniqueCode),
    ).size,
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
  expect(cards()).toHaveLength(labels.length);
  act(() => cards()[0].props.onPress());
  const nextUntested = HINT_LAB_ALL_FIXTURES.filter(
    fixture => fixture.difficultyLevel === 5,
  )[1];
  expect(
    jest.mocked(SudokuBoard).mock.calls.at(-1)![0].state.activeHint,
  ).toEqual(nextUntested.step);
  press('‹ Catalog');
  press('Issue');
  expect(cards()).toHaveLength(1);
  act(() => cards()[0].props.onPress());
  const issue = HINT_LAB_ALL_FIXTURES.find(
    fixture => fixture.difficultyLevel === 5,
  )!;
  expect(
    jest.mocked(SudokuBoard).mock.calls.at(-1)![0].state.activeHint,
  ).toEqual(issue.step);
});

test('switching examples resets the walkthrough and retains each original board', () => {
  act(() => cards()[0].props.onPress());
  const first = HINT_LAB_ALL_FIXTURES[0];
  const firstPresentation = jest
    .requireActual('../src/domain')
    .buildHintPresentation(first.step);
  for (let page = 1; page < firstPresentation.pages.length; page += 1)
    press('Next');
  let board = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
  expect(board.state.activeHint).toEqual(first.step);
  press('Next example →');
  const second = HINT_LAB_ALL_FIXTURES[1];
  board = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
  expect(board.state.activeHint).toEqual(second.step);
  expect(board.state.candidates.hintCandidates).toEqual(second.candidateMasks);
  expect(
    tree.root.findAll(node => node.props.children === 'Applied'),
  ).toHaveLength(0);
  press('← Previous');
  board = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
  expect(board.state.activeHint).toEqual(first.step);
  expect(board.state.candidates.hintCandidates).toEqual(first.candidateMasks);
});

test('technique selectors open arbitrary examples and navigation stays in the technique', () => {
  act(() => cards()[0].props.onPress());
  const picker = tree.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(node =>
      node.props.accessibilityLabel?.startsWith('Choose example,'),
    )!;
  act(() => picker.props.onPress());
  const examples = HINT_LAB_ALL_FIXTURES.filter(
    fixture => fixture.techniqueCode === HINT_LAB_ALL_FIXTURES[0].techniqueCode,
  );
  const selectors = () =>
    tree.root.findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        node.props.accessibilityLabel?.startsWith('Open example '),
    );
  expect(selectors()).toHaveLength(examples.length);
  expect(selectors()[0].props.accessibilityState.selected).toBe(true);
  const previous = tree.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(
      node =>
        node.findAll(child => child.props.children === '← Previous').length > 0,
    )!;
  expect(previous.props.disabled).toBe(true);
  act(() => selectors().at(-1)!.props.onPress());
  expect(
    jest.mocked(SudokuBoard).mock.calls.at(-1)![0].state.activeHint,
  ).toEqual(examples.at(-1)!.step);
  expect(selectors()).toHaveLength(0);
  const reopenedPicker = tree.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(node =>
      node.props.accessibilityLabel?.startsWith('Choose example,'),
    )!;
  act(() => reopenedPicker.props.onPress());
  expect(selectors().at(-1)!.props.accessibilityState.selected).toBe(true);
  const dismiss = tree.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(node => node.props.accessibilityLabel === 'Close example list')!;
  act(() => dismiss.props.onPress());
  const next = tree.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(
      node =>
        node.findAll(child => child.props.children === 'Next example →')
          .length > 0,
    )!;
  expect(next.props.disabled).toBe(true);
  press('← Previous');
  expect(
    jest.mocked(SudokuBoard).mock.calls.at(-1)![0].state.activeHint,
  ).toEqual(examples.at(-2)!.step);
});

test('reopening a technique returns to its last selected example', () => {
  act(() => cards()[0].props.onPress());
  press('Next example →');
  const saved = jest.mocked(SudokuBoard).mock.calls.at(-1)![0].state.activeHint;
  press('‹ Catalog');
  act(() => cards()[0].props.onPress());
  expect(
    jest.mocked(SudokuBoard).mock.calls.at(-1)![0].state.activeHint,
  ).toEqual(saved);
});

test('baseline Back and Restart replay the lesson without applying it', () => {
  act(() => cards()[0].props.onPress());
  press('Next example →');
  const original = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
  press('Next');
  press('Back');
  expect(jest.mocked(SudokuBoard).mock.calls.at(-1)![0].hintVisuals).toEqual(
    original.hintVisuals,
  );

  press('Next');
  press('Restart');
  const board = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
  expect(board.state.activeHint).toEqual(original.state.activeHint);
  expect(board.state.candidates).toEqual(original.state.candidates);
  expect(board.state.values).toEqual(original.state.values);
  expect(board.hintVisuals).toEqual(original.hintVisuals);
});

test('Jellyfish selects a target on the board and resets target state between examples', () => {
  const card = cards().find(node =>
    node.props.accessibilityLabel.startsWith('Open Jellyfish,'),
  )!;
  act(() => card.props.onPress());
  const fixture = HINT_LAB_ALL_FIXTURES.find(
    f => f.techniqueCode === 'jellyfish',
  )!;
  let board = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
  expect(board.disabled).toBe(false);
  expect(board.hintAnimations).toBe(false);
  expect(board.hintVisuals?.selectedQuestionCell).toBe(
    fixture.step.eliminations[0].cell,
  );
  press('Next');
  press('Next');
  press('Next');
  const target = fixture.step.eliminations.at(-1)!;
  act(() => board.onSelectCell(target.cell));
  board = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
  expect(board.hintVisuals?.selectedQuestionCell).toBe(target.cell);
  expect(board.hintVisuals?.hypotheticalValues ?? []).toEqual([]);
  expect(board.state.activeHint).toEqual(fixture.step);
  press('Next example →');
  const next = HINT_LAB_ALL_FIXTURES.filter(
    f => f.techniqueCode === 'jellyfish',
  )[1];
  board = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
  expect(board.hintVisuals?.selectedQuestionCell).toBe(
    next.step.eliminations[0].cell,
  );
  expect(board.state.activeHint).toEqual(next.step);
});
