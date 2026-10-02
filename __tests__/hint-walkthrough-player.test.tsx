import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import rawFixtures from '../src/debug/generated/hint-lab-fixtures.json';
import type { HintStep } from '../src/domain/hints/contracts';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import { boardFromFingerprint } from '../src/domain/sudoku/board';
import { LocalizationProvider } from '../src/localization';
import {
  HintWalkthroughPlayer,
  HintWalkthroughPlayerProps,
  HintWalkthroughSnapshot,
  hintWalkthroughWorkspaceLayout,
} from '../src/ui/components/HintWalkthroughPlayer';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';

jest.mock('../src/ui/components/SudokuBoard', () => ({
  ...jest.requireActual('../src/ui/components/SudokuBoard'),
  SudokuBoard: jest.fn(() => null),
}));
// A second caller supplies only snapshots and pages, without Lab or a session.
jest.mock('../src/debug/hint-lab', () => {
  throw new Error('The walkthrough must not load the Lab catalog');
});
jest.mock('../src/debug/hint-lab-store', () => {
  throw new Error('The walkthrough must not open acceptance storage');
});
jest.mock('../src/domain/game/engine', () => ({
  ...jest.requireActual('../src/domain/game/engine'),
  createGameSession: () => {
    throw new Error('The walkthrough must not create a game session');
  },
}));

function snapshotFor(
  source: (typeof rawFixtures.fixtures)[number],
): HintWalkthroughSnapshot {
  return Object.freeze({
    id: source.id,
    values: Object.freeze(boardFromFingerprint(source.boardFingerprint)),
    givens: Object.freeze(boardFromFingerprint(source.puzzleFingerprint)),
    candidateMasks: Object.freeze([...source.candidateMasks]),
    step: source.engineResult.step as HintStep,
  });
}

const snapshot = snapshotFor(rawFixtures.fixtures[0]);
const presentation = buildHintPresentation(
  snapshot.step,
  undefined,
  'game',
  snapshot.candidateMasks,
);
const labels = {
  step: 'Part',
  back: 'Previous step',
  next: 'Continue',
  restart: 'Replay',
};
let tree: Renderer.ReactTestRenderer;
let props: HintWalkthroughPlayerProps;

function render() {
  return (
    <LocalizationProvider locale="en">
      <HintWalkthroughPlayer {...props} />
    </LocalizationProvider>
  );
}

function update(next: Partial<HintWalkthroughPlayerProps>) {
  props = { ...props, ...next };
  act(() => tree.update(render()));
}

function layoutEvent(width: number, height: number) {
  return { nativeEvent: { layout: { x: 0, y: 0, width, height } } };
}

function measure(width = 390, height = 800) {
  act(() =>
    tree.root
      .findByProps({ testID: 'hint-walkthrough-workspace' })
      .props.onLayout(layoutEvent(width, height)),
  );
  const layout = hintWalkthroughWorkspaceLayout(width, height);
  act(() =>
    tree.root
      .findByProps({
        testID: layout.sideBySide
          ? 'hint-walkthrough-landscape-board'
          : 'hint-walkthrough-stacked-board',
      })
      .props.onLayout(layoutEvent(layout.boardPaneWidth, height)),
  );
}

function button(label: string) {
  return tree.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(node =>
      node.findAllByType(Text).some(t => t.props.children === label),
    )!;
}

function board() {
  return jest.mocked(SudokuBoard).mock.calls.at(-1)![0];
}

beforeEach(() => {
  jest.mocked(SudokuBoard).mockClear();
  props = {
    snapshot,
    presentation,
    pageIndex: 0,
    onPageChange: jest.fn(),
    labels,
  };
  act(() => {
    tree = Renderer.create(render());
  });
  measure();
});
afterEach(() => act(() => tree.unmount()));

test('supports caller-owned navigation and translated controls without Lab UI', () => {
  expect(button(labels.back).props.disabled).toBe(true);
  const originalState = board().state;
  const originalSnapshot = JSON.stringify(snapshot);
  act(() => button(labels.next).props.onPress());
  expect(props.onPageChange).toHaveBeenLastCalledWith(1);
  // The caller decides when to accept a navigation request.
  expect(board().hintVisuals).toBe(presentation.pages[0].visuals);

  for (let pageIndex = 0; pageIndex < presentation.pages.length; pageIndex++) {
    update({ pageIndex });
    const page = presentation.pages[pageIndex];
    expect(board().hintVisuals).toBe(page.visuals);
    expect(
      tree.root.findAllByType(Text).some(t => t.props.children === page.title),
    ).toBe(true);
    expect(
      tree.root.findAllByType(Text).some(t => t.props.children === page.body),
    ).toBe(true);
    expect(board().state).toBe(originalState);
    expect(board().state.values).toEqual(snapshot.values);
    expect(board().state.candidates.hintCandidates).toEqual(
      snapshot.candidateMasks,
    );
  }
  act(() => button(labels.back).props.onPress());
  expect(props.onPageChange).toHaveBeenLastCalledWith(
    presentation.pages.length - 2,
  );
  act(() => button(labels.restart).props.onPress());
  expect(props.onPageChange).toHaveBeenLastCalledWith(0);
  update({
    pageIndex: 0,
    labels: { step: '步骤', back: '上一步', next: '下一步', restart: '重播' },
  });
  expect(button('上一步').props.disabled).toBe(true);
  act(() => button('下一步').props.onPress());
  expect(props.onPageChange).toHaveBeenLastCalledWith(1);
  expect(JSON.stringify(snapshot)).toBe(originalSnapshot);
  expect(
    tree.root
      .findAllByType(Text)
      .some(t => t.props.children === 'Acceptance checklist'),
  ).toBe(false);
});

test('only forwards allowed targets and replaces the starting position with the caller', () => {
  const source = rawFixtures.fixtures.find(
    f => f.engineResult.step.techniqueCode === 'jellyfish',
  )!;
  const fish = snapshotFor(source);
  const fishPresentation = buildHintPresentation(
    fish.step,
    undefined,
    'game',
    fish.candidateMasks,
  );
  const targets = fish.step.eliminations;
  const onSelectTarget = jest.fn();
  update({
    snapshot: fish,
    presentation: fishPresentation,
    targets,
    onSelectTarget,
  });
  expect(board().disabled).toBe(false);
  const oldState = board().state;
  const target = targets.at(-1)!;
  const unmarkedCell = fish.values.findIndex((_, cell) =>
    targets.every(t => t.cell !== cell),
  );
  act(() => board().onSelectCell(unmarkedCell));
  expect(onSelectTarget).not.toHaveBeenCalled();
  act(() => board().onSelectCell(target.cell));
  expect(onSelectTarget).toHaveBeenCalledWith(target);
  expect(props.onPageChange).not.toHaveBeenCalled();
  expect(board().state).toBe(oldState);

  update({
    snapshot,
    presentation,
    pageIndex: 0,
    targets: undefined,
    onSelectTarget: undefined,
  });
  expect(board().disabled).toBe(true);
  expect(board().state).not.toBe(oldState);
  expect(board().state.values).toEqual(snapshot.values);
  expect(board().state.givens).toEqual(snapshot.givens);
  expect(board().state.candidates.hintCandidates).toEqual(
    snapshot.candidateMasks,
  );
  expect(board().hintVisuals).toBe(presentation.pages[0].visuals);
});

test('keeps caller-provided surroundings and moves the legend with the layout', () => {
  update({
    renderHeader: sideBySide => (
      <Text>{sideBySide ? 'Side header' : 'Stacked header'}</Text>
    ),
    renderFooter: sideBySide => (
      <Text>{sideBySide ? 'Side footer' : 'Stacked footer'}</Text>
    ),
  });
  expect(board().showHintLegend).toBe(true);
  expect(
    tree.root
      .findAllByType(Text)
      .some(t => t.props.children === 'Stacked header'),
  ).toBe(true);
  measure(960, 544);
  const info = tree.root.findByProps({
    testID: 'hint-walkthrough-landscape-info',
  });
  expect(
    info.findAllByType(Text).some(t => t.props.children === 'Side header'),
  ).toBe(true);
  expect(
    info.findAllByType(Text).some(t => t.props.children === 'Side footer'),
  ).toBe(true);
  expect(
    info.findAllByProps({ testID: 'hint-walkthrough-walkthrough-side-legend' }),
  ).not.toHaveLength(0);
  expect(board().showHintLegend).toBe(false);
});
