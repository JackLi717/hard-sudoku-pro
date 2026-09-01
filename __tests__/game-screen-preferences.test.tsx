import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  OfflineGameSnapshot,
} from '../src/application';
import { GameDefinition, createGameSession } from '../src/domain';
import { LocalizationProvider } from '../src/localization';
import { GameScreen } from '../src/ui/screens/GameScreen';
import { ThemeProvider } from '../src/ui/theme';

const puzzle =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

const definition: GameDefinition = {
  puzzleId: 'game-screen-preferences',
  contentVersion: 4,
  difficultyLevel: 3,
  puzzleFingerprint: puzzle,
  solutionFingerprint: solution,
};

function snapshot(): OfflineGameSnapshot {
  return {
    screen: 'game',
    session: createGameSession({
      sessionId: 'game-screen-session',
      definition,
      startedAtEpochMs: Date.now(),
    }),
    puzzle: null,
    resumable: false,
    busy: false,
    message: null,
    replacementRequest: null,
    quickDraftConfirmation: false,
    wallet: {
      quick_pencil: {
        resource: 'quick_pencil',
        balance: 0,
        earnedTotal: 0,
        spentTotal: 0,
      },
      smart_hint: {
        resource: 'smart_hint',
        balance: 0,
        earnedTotal: 0,
        spentTotal: 0,
      },
    },
    statistics: {
      attempts: 0,
      completions: 0,
      failures: 0,
      abandonments: 0,
      totalElapsedMs: 0,
      totalHintsUsed: 0,
      totalQuickPencilsUsed: 0,
    },
    completedByLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    reward: null,
  };
}

const noOp = () => undefined;

describe('GameScreen preferences', () => {
  test('uses digit-first input and hides optional counters', async () => {
    const onDigit = jest.fn();
    const onSelectCell = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <GameScreen
              onAbandon={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onDigit={onDigit}
              onDismissHint={noOp}
              onErase={noOp}
              onHint={noOp}
              onPause={noOp}
              onPencil={noOp}
              onQuickPencil={noOp}
              onResume={noOp}
              onSelectCell={onSelectCell}
              onUndo={noOp}
              preferences={{
                ...DEFAULT_PRODUCT_PREFERENCES,
                inputMode: 'digit_first',
                showRemainingDigits: false,
                showTimer: false,
              }}
              snapshot={snapshot()}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });

    expect(renderer.root.findAllByProps({ testID: 'game-timer' })).toHaveLength(
      0,
    );
    expect(
      renderer.root.findAllByProps({ testID: 'number-remaining-4' }),
    ).toHaveLength(0);

    const digitFour = renderer.root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Enter 4,'),
    );
    await ReactTestRenderer.act(async () => digitFour.props.onPress());
    expect(digitFour.props.accessibilityState.selected).toBe(true);

    const emptyCell = renderer.root.findByProps({
      testID: 'sudoku-cell-index-2',
    });
    await ReactTestRenderer.act(async () => emptyCell.props.onPress());
    expect(onSelectCell).toHaveBeenCalledWith(2);
    expect(onDigit).toHaveBeenCalledWith(4);

    ReactTestRenderer.act(() => renderer.unmount());
  });
});
