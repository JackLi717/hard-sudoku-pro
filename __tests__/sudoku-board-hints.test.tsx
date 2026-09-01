import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import {
  GameDefinition,
  HINT_STEP_CONTRACT_VERSION,
  HintPageVisuals,
  HintStep,
  createGameSession,
} from '../src/domain';

const puzzle =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

const definition: GameDefinition = {
  puzzleId: 'hint-board',
  contentVersion: 4,
  difficultyLevel: 3,
  puzzleFingerprint: puzzle,
  solutionFingerprint: solution,
};

const visuals: HintPageVisuals = {
  showFocusCells: true,
  showFocusRegions: true,
  showPremises: true,
  showEliminations: true,
  showPlacements: true,
};

function renderStep(step: HintStep) {
  const session = createGameSession({
    sessionId: 'hint-board-session',
    definition,
    startedAtEpochMs: 1_000,
  });
  const state = { ...session.state, activeHint: step };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SudokuBoard
        disabled
        hintVisuals={visuals}
        onSelectCell={() => undefined}
        state={state}
      />,
    );
  });
  return renderer;
}

describe('SudokuBoard hint evidence', () => {
  test('draws a complete independent grid with stable line weights', () => {
    const step: HintStep = {
      contractVersion: HINT_STEP_CONTRACT_VERSION,
      boardFingerprint: puzzle,
      techniqueCode: 'nakedSingle',
      difficultyLevel: 1,
      focusCells: [],
      focusRegions: [],
      premiseCandidates: [],
      eliminations: [],
      placements: [{ cell: 40, digit: 5 }],
      explanationKey: 'hint.nakedSingle',
      explanationParams: {},
    };
    const renderer = renderStep(step);
    const vertical = Array.from({ length: 10 }, (_, index) =>
      renderer.root.findByProps({ testID: `sudoku-grid-vertical-${index}` }),
    );
    const horizontal = Array.from({ length: 10 }, (_, index) =>
      renderer.root.findByProps({ testID: `sudoku-grid-horizontal-${index}` }),
    );

    expect(vertical).toHaveLength(10);
    expect(horizontal).toHaveLength(10);
    expect(StyleSheet.flatten(vertical[1].props.style).width).toBe(1);
    expect(StyleSheet.flatten(vertical[3].props.style).width).toBe(2.5);
    expect(StyleSheet.flatten(vertical[9].props.style).width).toBe(3);
    expect(StyleSheet.flatten(horizontal[1].props.style).height).toBe(1);
    expect(StyleSheet.flatten(horizontal[6].props.style).height).toBe(2.5);
    expect(StyleSheet.flatten(horizontal[0].props.style).height).toBe(3);
  });

  test('does not mount empty candidate grids', () => {
    const session = createGameSession({
      sessionId: 'empty-candidates',
      definition,
      startedAtEpochMs: 1_000,
    });
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SudokuBoard onSelectCell={() => undefined} state={session.state} />,
      );
    });

    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-candidate-grid' }),
    ).toHaveLength(0);
  });

  test('announces premise and crossed-out elimination candidates', () => {
    const step: HintStep = {
      contractVersion: HINT_STEP_CONTRACT_VERSION,
      boardFingerprint: puzzle,
      techniqueCode: 'lockedCandidates.pointing',
      difficultyLevel: 2,
      focusCells: [2],
      focusRegions: [{ kind: 'row', index: 0 }],
      premiseCandidates: [{ cell: 2, digit: 2 }],
      eliminations: [{ cell: 2, digit: 1 }],
      placements: [],
      explanationKey: 'hint.lockedCandidates.pointing',
      explanationParams: {},
    };
    const renderer = renderStep(step);
    const cell = renderer.root.find(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Row 1, column 3,'),
    );

    expect(cell.props.accessibilityLabel).toContain('hint premise 2');
    expect(cell.props.accessibilityLabel).toContain('remove candidate 1');
    expect(cell.props.accessibilityLabel).toContain('hint focus region');
    expect(cell.props.accessibilityLabel).toContain('hint focus cell');
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-candidate-slot-1' }),
    ).not.toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-candidate-slot-2' }),
    ).not.toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-candidate-slot-3' }),
    ).toHaveLength(0);
  });

  test('announces a placement before the user applies it', () => {
    const step: HintStep = {
      contractVersion: HINT_STEP_CONTRACT_VERSION,
      boardFingerprint: puzzle,
      techniqueCode: 'nakedSingle',
      difficultyLevel: 1,
      focusCells: [40],
      focusRegions: [{ kind: 'box', index: 4 }],
      premiseCandidates: [{ cell: 40, digit: 5 }],
      eliminations: [],
      placements: [{ cell: 40, digit: 5 }],
      explanationKey: 'hint.nakedSingle',
      explanationParams: {},
    };
    const renderer = renderStep(step);
    const cell = renderer.root.find(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Row 5, column 5,'),
    );

    expect(cell.props.accessibilityLabel).toContain('place 5');
  });
});
