import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { HintLab } from '../src/debug/HintLab';
import {
  hintWalkthroughBoardMaxSize,
  hintWalkthroughWorkspaceLayout,
} from '../src/ui/components/HintWalkthroughPlayer';
import { StyleSheet } from 'react-native';
import {
  HINT_LAB_ALL_FIXTURES,
  createHintLabSession,
} from '../src/debug/hint-lab';
import { buildHintPresentation } from '../src/domain';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import {
  HINT_PRESENTATION_COPIES,
  LocalizationProvider,
} from '../src/localization';
import { HintLabStore } from '../src/debug/hint-lab-store';
import { TextInput } from 'react-native';

let mockRenderRealBoard = false;

jest.mock('../src/domain', () => ({
  ...jest.requireActual('../src/domain'),
  buildHintPresentation: jest.fn(
    jest.requireActual('../src/domain').buildHintPresentation,
  ),
}));
jest.mock('../src/ui/components/SudokuBoard', () => ({
  ...jest.requireActual('../src/ui/components/SudokuBoard'),
  SudokuBoard: jest.fn(props =>
    mockRenderRealBoard
      ? require('react').createElement(
          jest.requireActual('../src/ui/components/SudokuBoard').SudokuBoard,
          props,
        )
      : null,
  ),
}));
jest.mock('../src/debug/hint-lab-store', () => ({
  ...jest.requireActual('../src/debug/hint-lab-store'),
  HintLabStore: jest.fn().mockImplementation(() => ({
    initialize: async () => undefined,
    readAll: async () => new Map(),
    readLevelFilter: async () => null,
    save: jest.fn(async () => undefined),
    saveLevelFilter: async () => undefined,
    close: jest.fn(),
  })),
}));

test.each([
  [960, 544],
  [840, 540],
  [1280, 744],
  [1920, 1000],
  [800, 320],
  [390, 800],
  [600, 904],
  [700, 600],
  [500, 320],
])('fits measured workspace %i x %i', (width, height) => {
  const layout = hintWalkthroughWorkspaceLayout(width, height);
  const size = hintWalkthroughBoardMaxSize(
    layout.boardPaneWidth,
    layout.sideBySide ? height : Infinity,
    layout.sideBySide,
  );
  expect(size).toBeGreaterThan(0);
  expect(size).toBeLessThanOrEqual(layout.boardPaneWidth);
  if (layout.sideBySide) {
    expect(layout.boardPaneWidth + layout.infoWidth + 52).toBeCloseTo(width);
    expect(size).toBeLessThanOrEqual(height - 16);
  }
});

let tree: Renderer.ReactTestRenderer;
let workspaceDimensions = [390, 800];
beforeEach(async () => {
  mockRenderRealBoard = false;
  workspaceDimensions = [390, 800];
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
  measureOpenFixture();
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

function layoutEvent(width: number, height: number) {
  return { nativeEvent: { layout: { x: 0, y: 0, width, height } } };
}
function measureOpenFixture() {
  if (tree.root.findAllByProps({ testID: 'hint-lab-workspace' }).length) {
    measureWorkspace(workspaceDimensions[0], workspaceDimensions[1]);
  }
}
function measureWorkspace(width: number, height: number) {
  workspaceDimensions = [width, height];
  act(() =>
    tree.root
      .findByProps({ testID: 'hint-lab-workspace' })
      .props.onLayout(layoutEvent(width, height)),
  );
  const layout = hintWalkthroughWorkspaceLayout(width, height);
  act(() =>
    tree.root
      .findByProps({
        testID: layout.sideBySide
          ? 'hint-lab-landscape-board'
          : 'hint-lab-stacked-board',
      })
      .props.onLayout(layoutEvent(layout.boardPaneWidth, height)),
  );
}

test('constrains the real board and preserves the example while resizing', async () => {
  mockRenderRealBoard = true;
  act(() => cards()[0].props.onPress());
  measureOpenFixture();
  measureWorkspace(960, 544);
  const fixtureId = jest.mocked(SudokuBoard).mock.calls.at(-1)![0].state.values;
  press('Next');
  for (const [width, height] of [
    [960, 544],
    [800, 320],
    [390, 800],
    [700, 600],
    [1280, 744],
  ]) {
    measureWorkspace(width, height);
    const layout = hintWalkthroughWorkspaceLayout(width, height);
    act(() =>
      tree.root
        .findByProps({ testID: 'sudoku-board-container' })
        .props.onLayout(
          layoutEvent(
            layout.boardPaneWidth - (layout.sideBySide ? 8 : 32),
            height,
          ),
        ),
    );
    const style = StyleSheet.flatten(
      tree.root.findByProps({ testID: 'sudoku-board' }).props.style,
    );
    expect(style.width).toBeGreaterThan(0);
    expect(style.width).toBe(style.height);
    expect(style.width).toBeLessThanOrEqual(layout.boardPaneWidth);
    if (layout.sideBySide)
      expect(style.height).toBeLessThanOrEqual(height - 16);
    expect(jest.mocked(SudokuBoard).mock.calls.at(-1)![0].state.values).toBe(
      fixtureId,
    );
    expect(
      tree.root
        .findByProps({ testID: 'hint-lab-proof-step' })
        .props.children.join(''),
    ).toMatch(/^STEP 2 \/ \d+$/);
  }
  await act(async () => {});
});

test('puts scrollable fixture information beside the left board on landscape tablets', () => {
  act(() => cards()[0].props.onPress());
  measureOpenFixture();
  measureWorkspace(960, 544);

  const layout = tree.root.findByProps({
    testID: 'hint-lab-landscape-layout',
  });
  expect(
    layout.findAllByProps({ testID: 'hint-lab-landscape-info' }),
  ).not.toHaveLength(0);
  expect(
    layout.findAllByProps({ testID: 'hint-lab-landscape-board' }),
  ).not.toHaveLength(0);

  const information = tree.root.findByProps({
    testID: 'hint-lab-landscape-info',
  });
  expect(
    information.findAll(node =>
      node.props.accessibilityLabel?.startsWith('Choose example, current'),
    ),
  ).not.toHaveLength(0);
  expect(
    information.findAll(node => node.props.children === 'Acceptance checklist'),
  ).not.toHaveLength(0);

  const board = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
  expect(board.showHintLegend).toBe(false);
  expect(
    information.findAllByProps({
      testID: 'hint-lab-walkthrough-side-legend',
    }),
  ).not.toHaveLength(0);
  expect(
    layout
      .findByProps({ testID: 'hint-lab-landscape-board' })
      .findAllByProps({ testID: 'hint-lab-walkthrough-side-legend' }),
  ).toHaveLength(0);
});

test('keeps the landscape tablet board size fixed while changing pages', () => {
  act(() => cards()[0].props.onPress());
  measureOpenFixture();
  measureWorkspace(960, 544);

  const first = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
  press('Next');
  const second = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];

  expect(second.maxSize).toBe(first.maxSize);
  expect(second.showHintLegend).toBe(false);
});

test('catalog does not build walkthroughs on initial load or filtering', () => {
  expect(cards()).toHaveLength(40);
  expect(new Set(cards().map(card => card.props.accessibilityLabel)).size).toBe(
    40,
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

test('retains the level filter after opening and returning from a fixture', () => {
  press('L5');
  const labels = cards().map(card => card.props.accessibilityLabel);
  act(() => cards()[0].props.onPress());
  measureOpenFixture();
  expect(buildHintPresentation).toHaveBeenCalledTimes(1);
  press('‹ Catalog');
  expect(cards().map(card => card.props.accessibilityLabel)).toEqual(labels);
  expect(buildHintPresentation).toHaveBeenCalledTimes(1);

  act(() => cards()[0].props.onPress());
  measureOpenFixture();
  press('Issue');
  press('‹ Catalog');
  expect(cards()).toHaveLength(labels.length);
});

test('does not show export or status filters', () => {
  expect(tree.root.findAll(node => node.props.children === 'Export')).toEqual(
    [],
  );
  expect(tree.root.findAll(node => node.props.children === 'STATUS')).toEqual(
    [],
  );
  expect(tree.root.findAll(node => node.props.children === 'Untested')).toEqual(
    [],
  );
});

test('switching examples resets the walkthrough and retains each original board', () => {
  act(() => cards()[0].props.onPress());
  measureOpenFixture();
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
  measureOpenFixture();
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
  measureOpenFixture();
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
  measureOpenFixture();
  press('Next example →');
  const saved = jest.mocked(SudokuBoard).mock.calls.at(-1)![0].state.activeHint;
  press('‹ Catalog');
  act(() => cards()[0].props.onPress());
  measureOpenFixture();
  expect(
    jest.mocked(SudokuBoard).mock.calls.at(-1)![0].state.activeHint,
  ).toEqual(saved);
});

test('baseline Back and Restart replay the lesson without applying it', () => {
  act(() => cards()[0].props.onPress());
  measureOpenFixture();
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
  measureOpenFixture();
  const fixture = HINT_LAB_ALL_FIXTURES.find(
    f => f.techniqueCode === 'jellyfish',
  )!;
  let board = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
  expect(board.disabled).toBe(false);
  expect(board.hintAnimations).toBe(true);
  expect(board.hintVisuals?.selectedQuestionCell).toBe(
    fixture.step.eliminations[0].cell,
  );
  expect(board.hintVisuals?.questionCells).toEqual(
    fixture.step.eliminations.map(candidate => candidate.cell),
  );
  press('Next');
  press('Next');
  press('Next');
  const target = fixture.step.eliminations.at(-1)!;
  act(() => board.onSelectCell(target.cell));
  board = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
  expect(board.hintVisuals?.selectedQuestionCell).toBe(target.cell);
  expect(board.hintVisuals?.reasoningCandidates ?? []).toEqual([]);
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

test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
  'preserves the original board and all representative proof pages in %s',
  locale => {
    act(() => {
      tree.update(
        <LocalizationProvider locale={locale}>
          <HintLab onClose={jest.fn()} />
        </LocalizationProvider>,
      );
    });
    const copy = HINT_PRESENTATION_COPIES[locale];
    for (const technique of [
      'hiddenSingle',
      'nakedPair',
      'xWing',
      'jellyfish',
    ] as const) {
      const fixture = HINT_LAB_ALL_FIXTURES.find(
        f => f.techniqueCode === technique,
      )!;
      const card = cards().find(node =>
        node.props.accessibilityLabel.startsWith(
          `Open ${copy.techniques[technique].name},`,
        ),
      )!;
      act(() => card.props.onPress());
      measureOpenFixture();
      const expected = jest
        .requireActual('../src/domain')
        .buildHintPresentation(
          fixture.step,
          copy,
          'game',
          fixture.candidateMasks,
          technique === 'jellyfish' ? fixture.step.eliminations[0] : undefined,
          undefined,
          true,
        );
      const originalState = createHintLabSession(fixture).state;
      const actualState = jest.mocked(SudokuBoard).mock.calls.at(-1)![0].state;
      for (const field of [
        'values',
        'givens',
        'selectedCell',
        'incorrectCells',
        'annotations',
        'status',
        'activeHint',
        'candidates',
      ] as const) {
        expect(actualState[field]).toEqual(originalState[field]);
      }
      for (let pageIndex = 0; pageIndex < expected.pages.length; pageIndex++) {
        const board = jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
        const page = expected.pages[pageIndex];
        expect(board.hintVisuals).toEqual(page.visuals);
        expect(board.state).toBe(actualState);
        expect(
          tree.root.findAll(node => node.props.children === page.title),
        ).not.toHaveLength(0);
        expect(
          tree.root.findAll(node => node.props.children === page.body),
        ).not.toHaveLength(0);
        if (pageIndex < expected.pages.length - 1) press('Next');
      }
      press('Restart');
      expect(
        jest.mocked(SudokuBoard).mock.calls.at(-1)![0].hintVisuals,
      ).toEqual(expected.pages[0].visuals);
      press('‹ Catalog');
    }
  },
);

test('keeps acceptance gating, proof position and notes in the Lab store', () => {
  act(() => cards()[0].props.onPress());
  measureOpenFixture();
  const passButton = () =>
    tree.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(
        node =>
          node.findAll(child => child.props.children === 'Pass').length > 0,
      )!;
  expect(passButton().props.disabled).toBe(true);
  for (const label of [
    'Reasoning is correct and does not reveal early',
    'Mask, cell colors and candidates are correct',
    'Placement or eliminations are correct',
    'Restart and Back behave correctly',
  ])
    press(label);
  expect(passButton().props.disabled).toBe(false);
  press('Next');
  act(() =>
    tree.root
      .findByType(TextInput)
      .props.onChangeText('Checked all proof pages'),
  );
  act(() => tree.root.findByType(TextInput).props.onBlur());
  press('Pass');
  const store = jest.mocked(HintLabStore).mock.results.at(-1)!.value;
  expect(store.save).toHaveBeenLastCalledWith(
    expect.objectContaining({
      fixtureId: HINT_LAB_ALL_FIXTURES[0].id,
      status: 'passed',
      reasoningOk: true,
      visualsOk: true,
      resultOk: true,
      applyUndoOk: true,
      proofPage: 1,
      note: 'Checked all proof pages',
    }),
  );
  press('‹ Catalog');
  act(() => cards()[0].props.onPress());
  measureOpenFixture();
  expect(passButton().props.disabled).toBe(false);
  expect(tree.root.findByType(TextInput).props.value).toBe(
    'Checked all proof pages',
  );
  // Existing behavior replays from the start; acceptance proofPage is evidence.
  expect(
    tree.root
      .findByProps({ testID: 'hint-lab-proof-step' })
      .props.children.join(''),
  ).toMatch(/^STEP 1 \/ \d+$/);
});
