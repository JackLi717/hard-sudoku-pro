import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
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
