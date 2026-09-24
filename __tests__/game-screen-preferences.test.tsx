import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  OfflineGameSnapshot,
} from '../src/application';
import {
  GameDefinition,
  HINT_STEP_CONTRACT_VERSION,
  HintStep,
  CellIndex,
  addCandidate,
  arePeers,
  boardFromFingerprint,
  buildHintPresentation,
  createGameSession,
  createSolverCandidates,
  hasCandidate,
} from '../src/domain';
import { LocalizationProvider } from '../src/localization';
import { AppIcon } from '../src/ui/components/AppIcon';
import { ScreenStateProvider } from '../src/ui/screen-state';
import {
  GameScreen,
  formatDifficultyScore,
  gameLandscapeBoardMaxSize,
  gameLandscapeControlsWidth,
  gameLandscapeHorizontalGutter,
  gameLandscapeHintPanelHeight,
  gameInferenceEntryRightInset,
  gamePhoneHintAvailableHeight,
  gamePhoneHintPanelHeight,
  gameScreenTextScale,
  nextFilledCellForDigit,
  numberKeyFeedbackText,
  resolveHintCompletionFocus,
  resolveNumberKeyState,
} from '../src/ui/screens/GameScreen';
import { ThemeProvider, darkPalette, lightPalette } from '../src/ui/theme';
import * as AdaptiveLayout from '../src/ui/layout/adaptive-layout';
import {
  isGameplayFeedbackMessage,
  resolveGameplayFeedback,
} from '../src/ui/game-feedback';
import { kiteGame, kiteHint } from './helpers/ipad-hint-assistance';

const puzzle =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

const definition: GameDefinition = {
  puzzleId: 'game-screen-preferences',
  contentVersion: 4,
  difficultyLevel: 3,
  difficultyScore: 6_000,
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
    completionStreak: { current: 25, best: 31 },
    reward: null,
    completionResult: null,
  };
}

const noOp = () => undefined;

function renderGameScreen(gameSnapshot: OfflineGameSnapshot) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale="zh-Hans">
      <ThemeProvider preference="light">
        <GameScreen
          snapshot={gameSnapshot}
          preferences={DEFAULT_PRODUCT_PREFERENCES}
          onAbandon={noOp}
          onApplyHint={noOp}
          onBack={noOp}
          onDigit={noOp}
          onDismissHint={noOp}
          onErase={noOp}
          onHint={noOp}
          onOneTapFill={noOp}
          onPause={noOp}
          onPencil={noOp}
          onQuickPencil={noOp}
          onRemoveCandidateFromCells={noOp}
          onResume={noOp}
          onSelectCell={noOp}
          onUndo={noOp}
        />
      </ThemeProvider>
    </LocalizationProvider>,
  );
}

describe('GameScreen preferences', () => {
  test('shows the current completion streak above the board', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = renderGameScreen(snapshot());
      await Promise.resolve();
    });

    const streak = renderer.root.findByProps({
      testID: 'game-completion-streak',
    });
    expect(streak.props.children).toBe('连胜 25');
    expect(streak.props.accessibilityLabel).toBe('当前连胜 25 局');
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('aligns the Android phone inference entry with the board edge only', () => {
    expect(gameInferenceEntryRightInset('android', false)).toBe(12);
    expect(gameInferenceEntryRightInset('android', true)).toBe(0);
    expect(gameInferenceEntryRightInset('ios', false)).toBe(0);
  });

  test('resolves number-key actions from the board context', () => {
    const base = {
      inputMode: 'cell_first' as const,
      hasSelectedCell: true,
      selectedCellFilled: false,
      pencilMode: false,
      candidateSource: 'manual' as const,
      candidatePresent: false,
      batchCandidateCount: null,
      remainingCount: 6,
    };

    expect(resolveNumberKeyState(base)).toEqual({
      action: 'enter_digit',
      disabled: false,
      feedback: { kind: 'remaining', count: 6 },
    });
    expect(resolveNumberKeyState({ ...base, hasSelectedCell: false })).toEqual({
      action: 'unavailable',
      disabled: true,
      feedback: { kind: 'remaining', count: 6 },
    });
    expect(
      resolveNumberKeyState({ ...base, selectedCellFilled: true }),
    ).toEqual({
      action: 'navigate_digit',
      disabled: false,
      feedback: { kind: 'remaining', count: 6 },
    });
    expect(
      resolveNumberKeyState({
        ...base,
        pencilMode: true,
        candidatePresent: true,
      }),
    ).toEqual({
      action: 'remove_candidate',
      disabled: false,
      feedback: { kind: 'candidate_remove', count: 1 },
    });
    expect(resolveNumberKeyState({ ...base, pencilMode: true })).toEqual({
      action: 'add_candidate',
      disabled: false,
      feedback: { kind: 'candidate_add', count: 1 },
    });
    expect(
      resolveNumberKeyState({
        ...base,
        pencilMode: true,
        candidateSource: 'quick',
      }),
    ).toEqual({ action: 'unavailable', disabled: true, feedback: null });
    const batch = resolveNumberKeyState({
      ...base,
      batchCandidateCount: 2,
    });
    expect(batch).toEqual({
      action: 'remove_candidate',
      disabled: false,
      feedback: { kind: 'candidate_remove', count: 2 },
    });
    expect(numberKeyFeedbackText(batch.feedback)).toBe('−2');
    expect(resolveNumberKeyState({ ...base, batchCandidateCount: 0 })).toEqual({
      action: 'unavailable',
      disabled: true,
      feedback: null,
    });
    expect(
      resolveNumberKeyState({
        ...base,
        inputMode: 'digit_first',
        hasSelectedCell: false,
      }),
    ).toEqual({
      action: 'enter_digit',
      disabled: false,
      feedback: { kind: 'remaining', count: 6 },
    });
    const digitFirstToggle = resolveNumberKeyState({
      ...base,
      inputMode: 'digit_first',
      pencilMode: true,
    });
    expect(digitFirstToggle).toEqual({
      action: 'select_candidate_toggle',
      disabled: false,
      feedback: { kind: 'candidate_toggle', count: 1 },
    });
    expect(numberKeyFeedbackText(digitFirstToggle.feedback)).toBe('±1');
    expect(
      resolveNumberKeyState({
        ...base,
        inputMode: 'digit_first',
        pencilMode: true,
        digitFirstCandidateFeedback: 'add',
      }).feedback,
    ).toEqual({ kind: 'candidate_add', count: 1 });
    expect(
      resolveNumberKeyState({
        ...base,
        inputMode: 'digit_first',
        pencilMode: true,
        digitFirstCandidateFeedback: 'remove',
      }).feedback,
    ).toEqual({ kind: 'candidate_remove', count: 1 });
    expect(
      resolveNumberKeyState({
        ...base,
        inputMode: 'digit_first',
        pencilMode: true,
        candidateSource: 'quick',
      }),
    ).toEqual({
      action: 'select_candidate_remove',
      disabled: false,
      feedback: { kind: 'candidate_remove', count: 1 },
    });
  });

  test('finds the next filled digit in reading order and wraps', () => {
    const values = [5, null, 7, 5, null] as const;

    expect(nextFilledCellForDigit(values, 0, 5)).toBe(3);
    expect(nextFilledCellForDigit(values, 3, 5)).toBe(0);
    expect(nextFilledCellForDigit(values, 2, 7)).toBe(2);
    expect(nextFilledCellForDigit(values, 0, 9)).toBeNull();
  });

  test('resolves a stable digit focus after applying a hint', () => {
    const eliminationHint: HintStep = {
      ...kiteHint,
      eliminations: [
        { cell: 2, digit: 8 },
        { cell: 3, digit: 9 },
      ],
      placements: [],
    };
    expect(resolveHintCompletionFocus(eliminationHint, 9)).toEqual({
      cell: null,
      digit: 9,
    });
    expect(resolveHintCompletionFocus(eliminationHint, 5)).toEqual({
      cell: null,
      digit: 8,
    });
    expect(
      resolveHintCompletionFocus(
        {
          ...eliminationHint,
          eliminations: [],
          placements: [{ cell: 12, digit: 4 }],
        },
        8,
      ),
    ).toEqual({ cell: 12, digit: 4 });
  });

  test('shows the applied hint result as the next board digit focus', async () => {
    const source = snapshot();
    source.session = kiteGame();
    source.session.state.activeHint = kiteHint;
    const apply = jest.fn();
    const renderScreen = () => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            snapshot={source}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              hintAnimations: false,
            }}
            onAbandon={noOp}
            onApplyHint={apply}
            onBack={noOp}
            onDigit={noOp}
            onOneTapFill={noOp}
            onRemoveCandidateFromCells={noOp}
            onDismissHint={noOp}
            onErase={noOp}
            onHint={noOp}
            onPause={noOp}
            onPencil={noOp}
            onQuickPencil={noOp}
            onResume={noOp}
            onSelectCell={noOp}
            onUndo={noOp}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderScreen());
    });
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({
          accessibilityLabel: 'Show the hint conclusion directly',
        })
        .props.onPress(),
    );
    const applyButton = renderer.root
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          typeof node.props.onPress === 'function',
      )
      .find(node =>
        node
          .findAllByType(Text)
          .some(text => text.props.children === 'Apply step'),
      );
    expect(applyButton).toBeDefined();
    await ReactTestRenderer.act(async () => applyButton!.props.onPress());
    expect(apply).toHaveBeenCalledTimes(1);

    source.session.state.activeHint = null;
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    const board = renderer.root.find(
      node =>
        Array.isArray(node.props.state?.values) &&
        typeof node.props.multiSelectActive === 'boolean',
    );
    expect(board.props.highlightDigit).toBe(3);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('shows remaining counts while enabling filled-cell number navigation', async () => {
    const adaptiveLayout = jest
      .spyOn(AdaptiveLayout, 'useAdaptiveLayout')
      .mockReturnValue({
        isAndroidTablet: true,
        isLandscape: true,
        useLandscapeTabletLayout: true,
        widthClass: 'expanded',
      });
    const current = snapshot();
    const renderScreen = () => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            snapshot={current}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              inputMode: 'cell_first',
              showRemainingDigits: true,
              showTimer: false,
            }}
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onDigit={noOp}
            onDismissHint={noOp}
            onErase={noOp}
            onHint={noOp}
            onOneTapFill={noOp}
            onPause={noOp}
            onPencil={noOp}
            onQuickPencil={noOp}
            onRemoveCandidateFromCells={noOp}
            onResume={noOp}
            onSelectCell={noOp}
            onUndo={noOp}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderScreen());
    });
    const key = () => renderer.root.findByProps({ testID: 'number-key-5' });
    const remaining = () =>
      renderer.root.findByProps({ testID: 'number-remaining-5' });

    expect(key().props.disabled).toBe(true);
    expect(remaining().props.children).toBe('6');

    current.session!.state = {
      ...current.session!.state,
      selectedCell: 0,
    };
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(key().props.disabled).toBe(false);
    expect(key().props.accessibilityLabel).toBe('Go to the next 5');
    expect(key().props.accessibilityState.selected).toBe(true);
    expect(remaining().props.children).toBe('6');
    const navigationCircle = renderer.root.findByProps({
      testID: 'number-key-circle-5',
    });
    expect(StyleSheet.flatten(navigationCircle.props.style)).toMatchObject({
      backgroundColor: lightPalette.background,
      borderColor: lightPalette.accent,
      borderRadius: 999,
      borderWidth: 2.5,
      height: 80,
      width: 80,
    });
    expect(
      StyleSheet.flatten(navigationCircle.findAllByType(Text)[0].props.style),
    ).toMatchObject({
      includeFontPadding: false,
      textAlign: 'center',
      textAlignVertical: 'center',
      transform: [{ translateY: 1.25 }],
    });
    expect(StyleSheet.flatten(remaining().props.style)).toMatchObject({
      bottom: 8.75,
      position: 'absolute',
      textAlign: 'center',
    });

    current.session!.state = {
      ...current.session!.state,
      selectedCell: 2,
    };
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(key().props.disabled).toBe(false);
    expect(remaining().props.children).toBe('6');

    await ReactTestRenderer.act(async () => renderer.unmount());
    adaptiveLayout.mockRestore();
  });

  test('moves a filled selection to the next matching digit and rejects a missing digit', async () => {
    jest.useFakeTimers();
    const current = snapshot();
    current.session!.state = {
      ...current.session!.state,
      selectedCell: 0,
      values: current.session!.state.values.map(value =>
        value === 2 ? null : value,
      ),
    };
    const onDigit = jest.fn();
    const onReplayFocusChange = jest.fn();
    const onSelectCell = jest.fn();
    const renderScreen = () => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            snapshot={current}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              inputMode: 'cell_first',
              haptics: false,
              showTimer: false,
            }}
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onDigit={onDigit}
            onDismissHint={noOp}
            onErase={noOp}
            onHint={noOp}
            onOneTapFill={noOp}
            onPause={noOp}
            onPencil={noOp}
            onQuickPencil={noOp}
            onRemoveCandidateFromCells={noOp}
            onReplayFocusChange={onReplayFocusChange}
            onResume={noOp}
            onSelectCell={onSelectCell}
            onUndo={noOp}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(renderScreen());
      });

      await ReactTestRenderer.act(async () =>
        renderer.root.findByProps({ testID: 'number-key-7' }).props.onPress(),
      );
      expect(onSelectCell).toHaveBeenCalledWith(4);
      expect(onReplayFocusChange).toHaveBeenCalledWith(4, 7);
      expect(onDigit).not.toHaveBeenCalled();

      current.session!.state = {
        ...current.session!.state,
        selectedCell: 4,
      };
      await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
      expect(
        renderer.root.findByProps({ testID: 'number-key-7' }).props
          .accessibilityState.selected,
      ).toBe(true);
      expect(
        renderer.root.findByProps({ testID: 'number-key-5' }).props
          .accessibilityState.selected,
      ).toBe(false);
      expect(
        renderer.root.find(
          node =>
            Array.isArray(node.props.state?.values) &&
            typeof node.props.multiSelectActive === 'boolean',
        ).props.highlightDigit,
      ).toBe(7);

      onSelectCell.mockClear();
      await ReactTestRenderer.act(async () =>
        renderer.root.findByProps({ testID: 'number-key-2' }).props.onPress(),
      );
      expect(onSelectCell).not.toHaveBeenCalled();
      expect(onDigit).not.toHaveBeenCalled();
      const unavailableNumberKeyStyle = renderer.root.findByProps({
        testID: 'number-key-2',
      }).props.style;
      expect(
        StyleSheet.flatten(
          typeof unavailableNumberKeyStyle === 'function'
            ? unavailableNumberKeyStyle({ pressed: false })
            : unavailableNumberKeyStyle,
        ).opacity,
      ).toBe(0.38);
    } finally {
      ReactTestRenderer.act(() => renderer?.unmount());
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  });

  test('shows candidate additions and removals for manual notes but only removals for Quick Candidates', async () => {
    const current = snapshot();
    current.session!.state.selectedCell = 2;
    current.session!.state.candidates.pencilMode = true;
    current.session!.state.candidates.manualCandidates =
      current.session!.state.candidates.manualCandidates.map((mask, cell) =>
        cell === 2 ? addCandidate(mask, 4) : mask,
      );
    const renderScreen = () => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            snapshot={current}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              inputMode: 'cell_first',
              showTimer: false,
            }}
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onDigit={noOp}
            onDismissHint={noOp}
            onErase={noOp}
            onHint={noOp}
            onOneTapFill={noOp}
            onPause={noOp}
            onPencil={noOp}
            onQuickPencil={noOp}
            onRemoveCandidateFromCells={noOp}
            onResume={noOp}
            onSelectCell={noOp}
            onUndo={noOp}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderScreen());
    });

    expect(
      renderer.root.findByProps({ testID: 'number-candidate-action-4' }).props
        .children,
    ).toBe('−1');
    expect(
      renderer.root.findByProps({ testID: 'number-candidate-action-5' }).props
        .children,
    ).toBe('+1');
    expect(
      renderer.root.findByProps({ testID: 'number-key-5' }).props.disabled,
    ).toBe(false);

    current.session!.state = {
      ...current.session!.state,
      candidates: {
        ...current.session!.state.candidates,
        activeCandidateSource: 'quick',
        quickDraftGenerated: true,
        quickCandidates: current.session!.state.candidates.quickCandidates.map(
          (mask, cell) => (cell === 2 ? addCandidate(mask, 4) : mask),
        ),
      },
    };
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));

    expect(
      renderer.root.findByProps({ testID: 'number-candidate-action-4' }).props
        .children,
    ).toBe('−1');
    expect(
      renderer.root.findByProps({ testID: 'number-key-5' }).props.disabled,
    ).toBe(true);
    expect(
      renderer.root.findAllByProps({ testID: 'number-candidate-action-5' }),
    ).toHaveLength(0);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('uses toggle feedback for digit-first notes and makes Quick Candidates removal-only', async () => {
    const current = snapshot();
    current.session!.state.candidates = {
      ...current.session!.state.candidates,
      pencilMode: true,
      manualCandidates: current.session!.state.candidates.manualCandidates.map(
        (mask, cell) =>
          cell === 2
            ? addCandidate(addCandidate(mask, 4), 5)
            : cell === 3
            ? addCandidate(mask, 5)
            : mask,
      ),
    };
    const onDigit = jest.fn();
    const onSelectCell = jest.fn();
    const renderScreen = () => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            snapshot={current}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              inputMode: 'digit_first',
              oneTapFill: false,
              showTimer: false,
            }}
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onDigit={onDigit}
            onDismissHint={noOp}
            onErase={noOp}
            onHint={noOp}
            onOneTapFill={noOp}
            onPause={noOp}
            onPencil={noOp}
            onQuickPencil={noOp}
            onRemoveCandidateFromCells={noOp}
            onResume={noOp}
            onSelectCell={onSelectCell}
            onUndo={noOp}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderScreen());
    });

    const keyFour = () => renderer.root.findByProps({ testID: 'number-key-4' });
    const feedbackFour = () =>
      renderer.root.findByProps({ testID: 'number-candidate-action-4' });
    expect(feedbackFour().props.children).toBe('±1');
    expect(keyFour().props.accessibilityLabel).toBe(
      'Select candidate 4 to add or remove',
    );

    await ReactTestRenderer.act(async () => keyFour().props.onPress());
    expect(keyFour().props.accessibilityState.selected).toBe(true);

    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress(),
    );
    expect(onDigit).toHaveBeenLastCalledWith(4);
    expect(feedbackFour().props.children).toBe('−1');

    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-3' })
        .props.onPress(),
    );
    expect(onDigit).toHaveBeenCalledTimes(2);
    expect(feedbackFour().props.children).toBe('+1');

    current.session!.state = {
      ...current.session!.state,
      candidates: {
        ...current.session!.state.candidates,
        activeCandidateSource: 'quick',
        quickDraftGenerated: true,
        quickCandidates: current.session!.state.candidates.quickCandidates.map(
          (mask, cell) =>
            cell === 2
              ? addCandidate(addCandidate(mask, 4), 5)
              : cell === 3
              ? addCandidate(mask, 5)
              : mask,
        ),
      },
    };
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(feedbackFour().props.children).toBe('−1');
    expect(keyFour().props.accessibilityLabel).toBe(
      'Select candidate 4 to remove',
    );

    onDigit.mockClear();
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-3' })
        .props.onPress(),
    );
    expect(onSelectCell).toHaveBeenLastCalledWith(3);
    expect(onDigit).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress(),
    );
    expect(onDigit).toHaveBeenCalledWith(4);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test.each(['cell_first', 'digit_first'] as const)(
    'One-tap Fill uses the shown single note in %s mode and can be disabled',
    async inputMode => {
      const current = snapshot();
      const state = current.session!.state;
      state.difficultyLevel = 4;
      state.candidates.manualCandidates = state.candidates.manualCandidates.map(
        (mask, cell) => (cell === 2 ? addCandidate(0, 4) : mask),
      );
      const onOneTapFill = jest.fn();
      const onSelectCell = jest.fn();
      const render = (oneTapFill: boolean) => (
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <GameScreen
              snapshot={current}
              preferences={{
                ...DEFAULT_PRODUCT_PREFERENCES,
                inputMode,
                oneTapFill,
                showTimer: false,
              }}
              onAbandon={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onOneTapFill={onOneTapFill}
              onDigit={noOp}
              onRemoveCandidateFromCells={noOp}
              onDismissHint={noOp}
              onErase={noOp}
              onHint={noOp}
              onPause={noOp}
              onPencil={noOp}
              onQuickPencil={noOp}
              onResume={noOp}
              onSelectCell={onSelectCell}
              onUndo={noOp}
            />
          </ThemeProvider>
        </LocalizationProvider>
      );
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(render(true));
      });
      const cell = () =>
        renderer.root.findByProps({ testID: 'sudoku-cell-index-2' });
      expect(StyleSheet.flatten(cell().props.style).backgroundColor).toBe(
        lightPalette.focusSoft,
      );
      expect(cell().props.accessibilityHint).toBe('Tap to fill 4.');
      await ReactTestRenderer.act(async () => cell().props.onPress());
      expect(onOneTapFill).toHaveBeenCalledWith(2, 'single_candidate');

      onOneTapFill.mockClear();
      await ReactTestRenderer.act(async () => renderer.update(render(false)));
      expect(cell().props.accessibilityHint).toBeUndefined();
      await ReactTestRenderer.act(async () => cell().props.onPress());
      expect(onSelectCell).toHaveBeenCalledWith(2);
      expect(onOneTapFill).not.toHaveBeenCalled();

      state.candidates.quickCandidates = state.candidates.quickCandidates.map(
        (mask, index) => (index === 2 ? addCandidate(0, 1) : mask),
      );
      state.candidates.activeCandidateSource = 'quick';
      await ReactTestRenderer.act(async () => renderer.update(render(true)));
      expect(cell().props.accessibilityHint).toBe('Tap to fill 1.');
      await ReactTestRenderer.act(async () => cell().props.onPress());
      expect(onOneTapFill).toHaveBeenCalledWith(2, 'single_candidate');
      await ReactTestRenderer.act(async () => renderer.unmount());
    },
  );
  test.each([1, 2, 3, 4, 5] as const)(
    'One-tap Fill follows the difficulty boundary at Level %i',
    async difficultyLevel => {
      const current = snapshot();
      const state = current.session!.state;
      state.difficultyLevel = difficultyLevel;
      state.candidates.manualCandidates = state.candidates.manualCandidates.map(
        (mask, cell) => (cell === 2 ? addCandidate(0, 4) : mask),
      );
      const onOneTapFill = jest.fn();
      const onSelectCell = jest.fn();
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <LocalizationProvider locale="en">
            <ThemeProvider preference="light">
              <GameScreen
                snapshot={current}
                preferences={DEFAULT_PRODUCT_PREFERENCES}
                onAbandon={noOp}
                onApplyHint={noOp}
                onBack={noOp}
                onOneTapFill={onOneTapFill}
                onDigit={noOp}
                onRemoveCandidateFromCells={noOp}
                onDismissHint={noOp}
                onErase={noOp}
                onHint={noOp}
                onPause={noOp}
                onPencil={noOp}
                onQuickPencil={noOp}
                onResume={noOp}
                onSelectCell={onSelectCell}
                onUndo={noOp}
              />
            </ThemeProvider>
          </LocalizationProvider>,
        );
      });
      const cell = renderer.root.findByProps({
        testID: 'sudoku-cell-index-2',
      });
      expect(cell.props.accessibilityHint).toBe(
        difficultyLevel >= 4 ? 'Tap to fill 4.' : undefined,
      );
      await ReactTestRenderer.act(async () => cell.props.onPress());
      if (difficultyLevel >= 4) {
        expect(onOneTapFill).toHaveBeenCalledWith(2, 'single_candidate');
        expect(onSelectCell).not.toHaveBeenCalled();
      } else {
        expect(onSelectCell).toHaveBeenCalledWith(2);
        expect(onOneTapFill).not.toHaveBeenCalled();
      }
      await ReactTestRenderer.act(async () => renderer.unmount());
    },
  );
  test.each([1, 2, 3, 4, 5] as const)(
    'One-tap Full House follows the difficulty boundary at Level %i',
    async difficultyLevel => {
      const current = snapshot();
      current.session = createGameSession({
        sessionId: `full-house-level-${difficultyLevel}`,
        definition: {
          ...definition,
          difficultyLevel,
          puzzleFingerprint: `${solution.slice(0, 80)}0`,
        },
        startedAtEpochMs: 1_000,
      });
      const onOneTapFill = jest.fn();
      const onSelectCell = jest.fn();
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <LocalizationProvider locale="en">
            <ThemeProvider preference="light">
              <GameScreen
                snapshot={current}
                preferences={DEFAULT_PRODUCT_PREFERENCES}
                onAbandon={noOp}
                onApplyHint={noOp}
                onBack={noOp}
                onOneTapFill={onOneTapFill}
                onDigit={noOp}
                onRemoveCandidateFromCells={noOp}
                onDismissHint={noOp}
                onErase={noOp}
                onHint={noOp}
                onPause={noOp}
                onPencil={noOp}
                onQuickPencil={noOp}
                onResume={noOp}
                onSelectCell={onSelectCell}
                onUndo={noOp}
              />
            </ThemeProvider>
          </LocalizationProvider>,
        );
      });
      const cell = renderer.root.findByProps({
        testID: 'sudoku-cell-index-80',
      });
      expect(cell.props.accessibilityHint).toBe(
        difficultyLevel >= 4 ? 'Tap to fill 9.' : undefined,
      );
      if (difficultyLevel >= 4) {
        expect(StyleSheet.flatten(cell.props.style).backgroundColor).toBe(
          lightPalette.focusSoft,
        );
        expect(
          cell.findByProps({ testID: 'sudoku-one-tap-full-house-80' }).props
            .children,
        ).toBe(9);
      } else {
        expect(
          cell.findAllByProps({ testID: 'sudoku-one-tap-full-house-80' }),
        ).toHaveLength(0);
      }
      await ReactTestRenderer.act(async () => cell.props.onPress());
      if (difficultyLevel >= 4) {
        expect(onOneTapFill).toHaveBeenCalledWith(80, 'full_house');
        expect(onSelectCell).not.toHaveBeenCalled();
      } else {
        expect(onSelectCell).toHaveBeenCalledWith(80);
        expect(onOneTapFill).not.toHaveBeenCalled();
      }
      await ReactTestRenderer.act(async () => renderer.unmount());
    },
  );
  test('One-tap Fill moves the digit focus to the value it enters', async () => {
    const current = snapshot();
    current.session = createGameSession({
      sessionId: 'one-tap-digit-focus',
      definition: {
        ...definition,
        difficultyLevel: 4,
        puzzleFingerprint: `${solution.slice(0, 80)}0`,
      },
      startedAtEpochMs: 1_000,
    });
    const onOneTapFill = jest.fn();
    const onReplayFocusChange = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <GameScreen
              snapshot={current}
              preferences={{
                ...DEFAULT_PRODUCT_PREFERENCES,
                inputMode: 'cell_first',
                multiSelectEnabled: true,
                showTimer: false,
              }}
              onAbandon={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onOneTapFill={onOneTapFill}
              onDigit={noOp}
              onRemoveCandidateFromCells={noOp}
              onDismissHint={noOp}
              onErase={noOp}
              onHint={noOp}
              onPause={noOp}
              onPencil={noOp}
              onQuickPencil={noOp}
              onReplayFocusChange={onReplayFocusChange}
              onResume={noOp}
              onSelectCell={noOp}
              onUndo={noOp}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });
    const board = () =>
      renderer.root.find(
        node =>
          Array.isArray(node.props.state?.values) &&
          typeof node.props.multiSelectActive === 'boolean',
      );

    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress(),
    );
    expect(board().props.highlightDigit).toBe(4);

    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-80' })
        .props.onPress(),
    );
    expect(onOneTapFill).toHaveBeenCalledWith(80, 'full_house');
    expect(onReplayFocusChange).toHaveBeenLastCalledWith(80, 9);
    expect(board().props.highlightDigit).toBe(9);

    await ReactTestRenderer.act(async () => renderer.unmount());
  });
  test('gameplay feedback asks to clear its message after a brief flash', async () => {
    jest.useFakeTimers();
    const current = snapshot();
    current.message = { code: 'given_cell' };
    current.session!.state.selectedCell = 0;
    const onDismissGameplayMessage = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <LocalizationProvider locale="en">
            <ThemeProvider preference="light">
              <GameScreen
                snapshot={current}
                preferences={{
                  ...DEFAULT_PRODUCT_PREFERENCES,
                  hintAnimations: false,
                }}
                onAbandon={noOp}
                onApplyHint={noOp}
                onBack={noOp}
                onOneTapFill={noOp}
                onDigit={noOp}
                onRemoveCandidateFromCells={noOp}
                onDismissHint={noOp}
                onDismissGameplayMessage={onDismissGameplayMessage}
                onErase={noOp}
                onHint={noOp}
                onPause={noOp}
                onPencil={noOp}
                onQuickPencil={noOp}
                onResume={noOp}
                onSelectCell={noOp}
                onUndo={noOp}
              />
            </ThemeProvider>
          </LocalizationProvider>,
        );
      });
      expect(
        renderer.root.findAllByProps({ testID: 'sudoku-cell-feedback-0' }),
      ).not.toHaveLength(0);
      expect(onDismissGameplayMessage).not.toHaveBeenCalled();
      await ReactTestRenderer.act(async () => {
        jest.advanceTimersByTime(650);
      });
      expect(onDismissGameplayMessage).toHaveBeenCalledWith(current.message);
      await ReactTestRenderer.act(async () => renderer.unmount());
    } finally {
      jest.useRealTimers();
    }
  });
  test('routes gameplay mistakes to their cells or controls without exposing solution mismatches', () => {
    const current = snapshot();
    current.session!.state.values = current.session!.state.values.map(
      (value, cell) => (cell === 2 ? 5 : value),
    );
    current.message = { code: 'conflicting_values' };
    expect(resolveGameplayFeedback(current)).toEqual({
      cells: [0, 2],
      tone: 'error',
      target: 'board',
    });
    current.message = { code: 'unsolvable_values' };
    expect(resolveGameplayFeedback(current)).toEqual({
      cells: [],
      tone: 'notice',
      target: 'board',
    });
    current.message = {
      code: 'quick_candidates_inconsistent',
      cells: [2, 8],
    };
    expect(resolveGameplayFeedback(current)).toEqual({
      cells: [2, 8],
      tone: 'error',
      target: 'board',
    });
    current.message = { code: 'nothing_to_undo' };
    expect(resolveGameplayFeedback(current)?.target).toBe('undo');
    current.message = { code: 'unexpected_error' };
    expect(isGameplayFeedbackMessage(current.message)).toBe(false);
    expect(resolveGameplayFeedback(current)).toBeNull();
  });
  test('coloring is off by default and opens six swatches with annotation-only backgrounds when enabled', async () => {
    const current = snapshot();
    const clear = jest.fn();
    const color = jest.fn();
    const render = (boardColoring: boolean) => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onOneTapFill={noOp}
            onColorCells={color}
            onClearBoardColors={clear}
            onDigit={noOp}
            onRemoveCandidateFromCells={noOp}
            onDismissHint={noOp}
            onErase={noOp}
            onHint={noOp}
            onPause={noOp}
            onPencil={noOp}
            onQuickPencil={noOp}
            onResume={noOp}
            onSelectCell={noOp}
            onUndo={noOp}
            preferences={{ ...DEFAULT_PRODUCT_PREFERENCES, boardColoring }}
            snapshot={current}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(render(false));
    });
    expect(DEFAULT_PRODUCT_PREFERENCES.boardColoring).toBe(false);
    expect(renderer.root.findAllByProps({ testID: 'color-tool' })).toHaveLength(
      0,
    );
    await ReactTestRenderer.act(async () => renderer.update(render(true)));
    expect(
      renderer.root.findAllByProps({
        testID: 'app-icon-color-material-symbol',
      }),
    ).not.toHaveLength(0);
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'color-tool' }).props.onPress();
    });
    expect(renderer.root.findByProps({ testID: 'color-palette' })).toBeTruthy();
    expect(
      new Set(
        renderer.root
          .findAll(
            node =>
              typeof node.props.testID === 'string' &&
              node.props.testID.startsWith('color-swatch-'),
          )
          .map(node => node.props.testID),
      ).size,
    ).toBe(6);
    const board = () =>
      renderer.root.find(
        node =>
          Array.isArray(node.props.state?.values) &&
          typeof node.props.coloringFocused === 'boolean',
      );
    expect(board().props.coloringFocused).toBe(true);
    expect(board().props.highlightRegions).toBe(false);
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'color-clear-all' }).props.onPress();
    });
    expect(clear).toHaveBeenCalledTimes(1);
    current.session!.state.activeHint = kiteHint;
    await ReactTestRenderer.act(async () => renderer.update(render(true)));
    expect(
      renderer.root.findAllByProps({ testID: 'color-palette' }),
    ).toHaveLength(0);
    expect(board().props.coloringFocused).toBe(false);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });
  test('offers Auto complete in the strip and renders progress one cell at a time', async () => {
    const reducedMotion = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    const next = snapshot();
    const autoComplete = jest.fn();
    const placements = [
      {
        cell: 2 as const,
        digit: 4 as const,
        technique: 'nakedSingle' as const,
        round: 0,
      },
      {
        cell: 3 as const,
        digit: 6 as const,
        technique: 'nakedSingle' as const,
        round: 1,
      },
    ];
    const renderScreen = (
      visibleCount: number | null,
      phase: 'selection' | 'strike' | 'elimination' | 'placement' | null = null,
    ) => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onOneTapFill={noOp}
            onDigit={noOp}
            onRemoveCandidateFromCells={noOp}
            onDismissHint={noOp}
            onErase={noOp}
            onHint={noOp}
            onPause={noOp}
            onPencil={noOp}
            onQuickPencil={noOp}
            onAutoComplete={autoComplete}
            onResume={noOp}
            onSelectCell={noOp}
            onUndo={noOp}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              hintAnimations: false,
            }}
            snapshot={{
              ...next,
              busy: visibleCount !== null,
              autoFinish: { placements, visibleCount, phase },
            }}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    const board = () =>
      renderer.root.find(
        node =>
          Array.isArray(node.props.state?.values) &&
          typeof node.props.onSelectCell === 'function',
      );

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderScreen(null));
    });
    expect(
      renderer.root.findByProps({ testID: 'auto-complete-status' }).props
        .children,
    ).toBe('Simple steps remain');
    expect(
      renderer.root.findAllByProps({ testID: 'quick-finish-button' }),
    ).toHaveLength(0);
    const autoCompleteAction = renderer.root.findByProps({
      testID: 'auto-complete-action',
    });
    expect(autoCompleteAction.props.accessibilityLabel).toBe('Auto complete');
    ReactTestRenderer.act(() => autoCompleteAction.props.onPress());
    expect(autoComplete).toHaveBeenCalledTimes(1);
    expect(board().props.state.values[2]).toBeNull();
    expect(board().props.state.values[3]).toBeNull();

    await ReactTestRenderer.act(async () => renderer.update(renderScreen(0)));
    expect(
      renderer.root.findAllByProps({ testID: 'contextual-action-strip' }),
    ).toHaveLength(0);
    expect(board().props.state.values[2]).toBeNull();
    expect(board().props.state.values[3]).toBeNull();

    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen(1, 'selection')),
    );
    expect(board().props.state.values[2]).toBeNull();
    expect(board().props.state.selectedCell).toBe(2);
    expect(board().props.showSelection).toBe(true);
    expect(board().props.highlightDigit).toBeNull();
    expect(board().props.highlightRegions).toBe(false);
    expect(board().props.replayEliminations).toEqual([]);
    const initialValues = boardFromFingerprint(puzzle);
    const initialCandidates = createSolverCandidates(initialValues);
    const peerEliminations = initialCandidates.flatMap((mask, cell) =>
      initialValues[cell] === null &&
      arePeers(2, cell as CellIndex) &&
      hasCandidate(mask, 4)
        ? [{ cell, digit: 4 }]
        : [],
    );

    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen(1, 'placement')),
    );
    expect(board().props.state.values[2]).toBe(4);
    expect(board().props.state.values[3]).toBeNull();
    expect(board().props.state.selectedCell).toBeNull();
    expect(board().props.state.candidates.manualCandidates).toEqual(
      initialCandidates,
    );
    expect(board().props.replayEliminations).toEqual([]);

    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen(1, 'strike')),
    );
    expect(board().props.state.values[2]).toBe(4);
    expect(board().props.state.selectedCell).toBeNull();
    expect(board().props.state.candidates.manualCandidates).toEqual(
      initialCandidates,
    );
    expect(board().props.replayEliminations).toEqual(peerEliminations);
    expect(board().props.replayEliminationAnimationKey).toBe('auto-finish-1');

    const afterFirstPlacement = initialValues.map((value, cell) =>
      cell === 2 ? 4 : value,
    );
    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen(1, 'elimination')),
    );
    expect(board().props.state.values[2]).toBe(4);
    expect(board().props.state.selectedCell).toBeNull();
    expect(board().props.state.candidates.manualCandidates).toEqual(
      createSolverCandidates(afterFirstPlacement),
    );
    expect(board().props.replayEliminations).toEqual(peerEliminations);
    expect(board().props.replayEliminationOpacity).toBeDefined();

    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen(2, 'selection')),
    );
    expect(board().props.state.values[2]).toBe(4);
    expect(board().props.state.values[3]).toBeNull();
    expect(board().props.state.selectedCell).toBe(3);
    ReactTestRenderer.act(() => renderer.unmount());
    reducedMotion.mockRestore();
  });

  test('shows only the difficulty name while retaining the score in its accessibility label', async () => {
    expect(formatDifficultyScore(53_648, 'en')).toBe('53,648');
    expect(formatDifficultyScore(53_648, 'de')).toBe('53.648');
    const next = snapshot();
    next.puzzle = {
      checksum: 'tutorial-score',
      contentVersion: 4,
      difficultyLevel: 3,
      difficultyScore: 53_648,
      enabled: true,
      hardestTechnique: 'hiddenSingle',
      id: definition.puzzleId,
      puzzle,
      ratingVersion: '1',
      solution,
      source: 'test',
    };
    const renderScreen = (gameSnapshot: OfflineGameSnapshot) => (
      <LocalizationProvider locale="zh-Hans">
        <ThemeProvider preference="light">
          <GameScreen
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onOneTapFill={noOp}
            onDigit={noOp}
            onRemoveCandidateFromCells={noOp}
            onDismissHint={noOp}
            onErase={noOp}
            onHint={noOp}
            onPause={noOp}
            onPencil={noOp}
            onQuickPencil={noOp}
            onResume={noOp}
            onSelectCell={noOp}
            onUndo={noOp}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              showTimer: false,
            }}
            snapshot={gameSnapshot}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderScreen(next));
    });
    const difficulty = renderer.root.findByProps({
      testID: 'game-difficulty',
    });
    expect(difficulty.props.children).toBe('困难');
    expect(difficulty.props.accessibilityLabel).toBe('困难 · 难度分 53,648');

    await ReactTestRenderer.act(async () => {
      renderer.update(renderScreen({ ...next, puzzle: null }));
    });
    expect(
      renderer.root.findByProps({ testID: 'game-difficulty' }).props.children,
    ).toBe('困难');
    ReactTestRenderer.act(() => renderer.unmount());
  });

  test('keeps timer and pause in a compact secondary tone without a background', async () => {
    const next = snapshot();
    const quickPress = jest.fn();
    const quickLongPress = jest.fn();
    next.wallet.quick_pencil.balance = 932;
    next.wallet.smart_hint.balance = 769;
    const renderScreen = (theme: 'light' | 'dark' = 'light') => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference={theme}>
          <GameScreen
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onOneTapFill={noOp}
            onDigit={noOp}
            onRemoveCandidateFromCells={noOp}
            onDismissHint={noOp}
            onErase={noOp}
            onHint={noOp}
            onPause={noOp}
            onPencil={noOp}
            onQuickPencil={quickPress}
            onRegenerateQuickPencil={quickLongPress}
            onResume={noOp}
            onSelectCell={noOp}
            onUndo={noOp}
            preferences={DEFAULT_PRODUCT_PREFERENCES}
            snapshot={{ ...next }}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderScreen());
    });

    const header = renderer.root.findByProps({ testID: 'game-header' });
    expect(
      header.findAllByProps({ testID: 'game-difficulty' }).length,
    ).toBeGreaterThan(0);
    expect(
      header.findAllByProps({ testID: 'game-timer' }).length,
    ).toBeGreaterThan(0);
    expect(
      header.findAllByProps({ accessibilityLabel: 'Pause' }).length,
    ).toBeGreaterThan(0);
    expect(
      StyleSheet.flatten(
        header.findByProps({ testID: 'game-timer' }).props.style,
      ).color,
    ).toBe(lightPalette.muted);
    const pause = header.findByProps({ accessibilityLabel: 'Pause' });
    expect(StyleSheet.flatten(pause.props.style)).toMatchObject({
      marginLeft: 6,
      minHeight: 44,
    });
    expect(
      StyleSheet.flatten(pause.props.style).backgroundColor,
    ).toBeUndefined();
    expect(StyleSheet.flatten(pause.props.style).minWidth).toBeUndefined();
    expect(pause.props.hitSlop).toBe(16);
    expect(pause.findByType(AppIcon).props.color).toBe(lightPalette.muted);
    expect(
      renderer.root.findByProps({ testID: 'game-difficulty' }).props.children,
    ).toBe('Hard');
    expect(
      renderer.root.findByProps({ testID: 'game-mistakes' }).props.children,
    ).toBe('Mistakes 0');
    const eraseTool = renderer.root.findByProps({
      accessibilityLabel: 'Erase',
    });
    expect(
      eraseTool.findAllByProps({ testID: 'app-icon-erase-outline' }),
    ).not.toHaveLength(0);
    const quickTool = () =>
      renderer.root.findByProps({ testID: 'quick-pencil-tool' });
    expect(quickTool().findByType(AppIcon).props.name).toBe('sparkle');
    expect(quickTool().props.label).toBe('Quick Candidates');
    expect(quickTool().props.accessibilityHint).toBeUndefined();
    expect(quickTool().props.onLongPress).toBeUndefined();
    ReactTestRenderer.act(() => {
      quickTool().props.onPress();
    });
    expect(quickPress).toHaveBeenCalledTimes(1);
    expect(quickLongPress).not.toHaveBeenCalled();
    const hintTool = () => renderer.root.findByProps({ testID: 'hint-tool' });
    expect(
      renderer.root.findAllByProps({ testID: 'tool-balance' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'tool-low-balance-badge' }),
    ).toHaveLength(0);

    next.wallet.quick_pencil.balance = 9;
    next.wallet.smart_hint.balance = 0;
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(
      quickTool()
        .findByProps({ testID: 'tool-low-balance-badge' })
        .findByType(Text).props.children,
    ).toBe(9);
    expect(
      StyleSheet.flatten(
        quickTool().findByProps({ testID: 'tool-low-balance-badge' }).props
          .style,
      ).backgroundColor,
    ).toBe(lightPalette.selected);
    const emptyBadge = hintTool().findByProps({
      testID: 'tool-low-balance-badge',
    });
    expect(emptyBadge.findByType(Text).props.children).toBe('AD');
    expect(StyleSheet.flatten(emptyBadge.props.style).backgroundColor).toBe(
      lightPalette.surfaceStrong,
    );
    expect(
      StyleSheet.flatten(emptyBadge.findByType(Text).props.style).color,
    ).toBe(lightPalette.muted);

    next.wallet.quick_pencil.balance = 10;
    next.wallet.smart_hint.balance = 1;
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(
      quickTool().findAllByProps({ testID: 'tool-low-balance-badge' }),
    ).toHaveLength(0);
    expect(
      hintTool()
        .findByProps({ testID: 'tool-low-balance-badge' })
        .findByType(Text).props.children,
    ).toBe(1);
    expect(
      renderer.root.findAllByProps({ testID: 'tool-balance' }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen('dark')),
    );
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'game-timer' }).props.style,
      ).color,
    ).toBe(darkPalette.muted);
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ accessibilityLabel: 'Pause' }).props.style,
      ).backgroundColor,
    ).toBeUndefined();
    expect(
      renderer.root
        .findByProps({ accessibilityLabel: 'Pause' })
        .findByType(AppIcon).props.color,
    ).toBe(darkPalette.muted);
    expect(
      StyleSheet.flatten(
        hintTool().findByProps({ testID: 'tool-low-balance-badge' }).props
          .style,
      ).backgroundColor,
    ).toBe(darkPalette.selected);

    next.wallet.quick_pencil.balance = 0;
    next.session!.state = {
      ...next.session!.state,
      candidates: {
        ...next.session!.state.candidates,
        activeCandidateSource: 'quick',
        quickDraftGenerated: true,
      },
    };
    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen('dark')),
    );
    expect(quickTool().props.label).toBe('Hide candidates');
    expect(quickTool().props.active).toBe(true);
    expect(quickTool().props.accessibilityHint).toBe(
      'Long press to regenerate Quick Candidates. Regenerating uses one Quick Candidates use.',
    );
    expect(quickTool().findByType(AppIcon).props.name).toBe('hide');
    expect(
      quickTool().findAllByProps({ testID: 'tool-low-balance-badge' }),
    ).toHaveLength(0);
    ReactTestRenderer.act(() => quickTool().props.onLongPress());
    expect(quickLongPress).toHaveBeenCalledTimes(1);

    next.session!.state = {
      ...next.session!.state,
      candidates: {
        ...next.session!.state.candidates,
        activeCandidateSource: 'manual',
      },
    };
    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen('dark')),
    );
    expect(quickTool().props.label).toBe('Show candidates');
    expect(quickTool().props.active).toBe(false);
    expect(quickTool().findByType(AppIcon).props.name).toBe('show');
    expect(quickTool().props.onLongPress).toBe(quickLongPress);
    ReactTestRenderer.act(() => renderer.unmount());
  });

  test.each([
    ['light', 'cell_first', lightPalette],
    ['dark', 'cell_first', darkPalette],
    ['light', 'digit_first', lightPalette],
    ['dark', 'digit_first', darkPalette],
  ] as const)(
    'uses unified blue Full House prompts and tap-to-fill in %s theme with %s input',
    async (theme, inputMode, palette) => {
      const onOneTapFill = jest.fn();
      const onSelectCell = jest.fn();
      const onDigit = jest.fn();
      const next = snapshot();
      const game = createGameSession({
        sessionId: 'full-house-ui',
        definition: {
          ...definition,
          difficultyLevel: 4,
          puzzleFingerprint: `${solution.slice(0, 80)}0`,
        },
        startedAtEpochMs: 1_000,
      });
      next.session = {
        ...game,
        state: {
          ...game.state,
          selectedCell: 80,
          candidates: { ...game.state.candidates, pencilMode: true },
        },
      };
      const renderScreen = (oneTapFill: boolean) => (
        <ThemeProvider preference={theme}>
          <GameScreen
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onOneTapFill={onOneTapFill}
            onDigit={onDigit}
            onRemoveCandidateFromCells={noOp}
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
              oneTapFill,
              inputMode,
              showTimer: false,
            }}
            snapshot={{ ...next }}
          />
        </ThemeProvider>
      );
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          renderScreen(DEFAULT_PRODUCT_PREFERENCES.oneTapFill),
        );
      });
      expect(onOneTapFill).not.toHaveBeenCalled();
      if (inputMode === 'digit_first') {
        const digitFour = renderer.root.findByProps({ testID: 'number-key-4' });
        await ReactTestRenderer.act(async () => digitFour.props.onPress());
      }
      const cell = renderer.root.findByProps({
        testID: 'sudoku-cell-index-80',
      });
      expect(StyleSheet.flatten(cell.props.style).backgroundColor).toBe(
        palette.focusSoft,
      );
      expect(
        cell.findByProps({ testID: 'sudoku-one-tap-full-house-80' }).props
          .children,
      ).toBe(9);
      expect(cell.props.accessibilityHint).toBe('Tap to fill 9.');
      await ReactTestRenderer.act(async () => cell.props.onPress());
      expect(onOneTapFill).toHaveBeenCalledWith(80, 'full_house');
      expect(onSelectCell).not.toHaveBeenCalled();
      expect(onDigit).not.toHaveBeenCalled();

      onOneTapFill.mockClear();
      await ReactTestRenderer.act(async () => {
        renderer.update(renderScreen(false));
      });
      expect(StyleSheet.flatten(cell.props.style).backgroundColor).toBe(
        palette.peer,
      );
      const selection = renderer.root.findAllByProps({
        testID: 'sudoku-selection-80',
      });
      if (inputMode === 'cell_first') {
        expect(selection.length).toBeGreaterThan(0);
        expect(StyleSheet.flatten(selection[0].props.style).borderColor).toBe(
          palette.focus,
        );
      } else {
        expect(selection).toHaveLength(0);
      }
      expect(cell.props.accessibilityState.selected).toBe(true);
      expect(cell.props.accessibilityHint).toBeUndefined();
      await ReactTestRenderer.act(async () => cell.props.onPress());
      expect(onSelectCell).toHaveBeenCalledWith(80);
      expect(onOneTapFill).not.toHaveBeenCalled();

      next.busy = true;
      await ReactTestRenderer.act(async () => {
        renderer.update(renderScreen(true));
      });
      expect(StyleSheet.flatten(cell.props.style).backgroundColor).not.toBe(
        palette.hintResult,
      );
      expect(cell.props.disabled).toBe(true);
      await ReactTestRenderer.act(async () => cell.props.onPress());
      expect(onOneTapFill).not.toHaveBeenCalled();
      ReactTestRenderer.act(() => renderer.unmount());
    },
  );

  test.each([
    { width: 320, height: 568, expected: 240 },
    { width: 390, height: 844, expected: 344 },
    { width: 430, height: 932, expected: 360 },
  ])(
    'fits the phone hint panel into the remaining $width x $height space',
    ({ width, height, expected }) => {
      expect(gamePhoneHintPanelHeight(width, height, 1)).toBe(expected);
    },
  );

  test('uses the safe-area layout height and only falls back to page scrolling on short screens', () => {
    expect(gamePhoneHintAvailableHeight(360, 752, 1)).toBe(282);
    expect(gamePhoneHintPanelHeight(360, 752, 1)).toBe(282);
    expect(gamePhoneHintAvailableHeight(320, 520, 1)).toBe(90);
    expect(gamePhoneHintPanelHeight(320, 520, 1)).toBe(240);
  });

  test.each([
    { boardSize: 450, expected: 350 },
    { boardSize: 630, expected: 490 },
  ])(
    'limits the tablet hint panel to board rows 2 through 8',
    ({ boardSize, expected }) => {
      expect(gameLandscapeHintPanelHeight(boardSize)).toBe(expected);
    },
  );

  test.each([
    { width: 840, height: 600 },
    { width: 1024, height: 640 },
    { width: 1280, height: 800 },
  ])(
    'keeps all three horizontal tablet gutters equal at $width x $height',
    ({ width, height }) => {
      const board = gameLandscapeBoardMaxSize(width, height, 1.25);
      const controls = gameLandscapeControlsWidth(width);
      const gutter = gameLandscapeHorizontalGutter(width, board, controls);

      expect(board + controls + gutter * 3).toBeCloseTo(width);
    },
  );

  test('uses larger text on iPad mini without changing phone text', () => {
    expect(gameScreenTextScale(390, 844)).toBe(1);
    expect(gameScreenTextScale(744, 1133)).toBe(1.25);
  });

  test.each([
    { width: 840, height: 600, expected: 406 },
    { width: 1024, height: 640, expected: 446 },
    { width: 1280, height: 800, expected: 606 },
  ])(
    'keeps the landscape board inside the $width x $height tablet workspace',
    ({ width, height, expected }) => {
      expect(gameLandscapeBoardMaxSize(width, height, 1.25)).toBeCloseTo(
        expected,
      );
    },
  );

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
              onOneTapFill={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onDigit={onDigit}
              onRemoveCandidateFromCells={noOp}
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
    expect(
      renderer.root.findAllByProps({ testID: 'number-key-circle-4' }),
    ).toHaveLength(0);
    expect(
      StyleSheet.flatten(digitFour.props.style({ pressed: false })),
    ).toMatchObject({
      backgroundColor: lightPalette.accentSoft,
      borderRadius: 10,
      opacity: 1,
    });

    const emptyCell = renderer.root.findByProps({
      testID: 'sudoku-cell-index-2',
    });
    await ReactTestRenderer.act(async () => emptyCell.props.onPress());
    expect(onSelectCell).toHaveBeenCalledWith(2);
    expect(onDigit).toHaveBeenCalledWith(4);

    ReactTestRenderer.act(() => renderer.unmount());
  });

  test('restarts candidate selection after completed batch input', async () => {
    const source = snapshot();
    source.session!.state.candidates.manualCandidates =
      source.session!.state.candidates.manualCandidates.map((mask, cell) =>
        cell === 2 || cell === 3
          ? addCandidate(addCandidate(mask, 4), 7)
          : mask,
      );
    const onDigit = jest.fn();
    const onRemove = jest.fn();
    const onSelectCell = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <GameScreen
              snapshot={source}
              preferences={{
                ...DEFAULT_PRODUCT_PREFERENCES,
                multiSelectEnabled: true,
              }}
              onAbandon={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onDigit={onDigit}
              onOneTapFill={noOp}
              onRemoveCandidateFromCells={onRemove}
              onDismissHint={noOp}
              onErase={noOp}
              onHint={noOp}
              onPause={noOp}
              onPencil={noOp}
              onQuickPencil={noOp}
              onResume={noOp}
              onSelectCell={onSelectCell}
              onUndo={noOp}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });

    const cell = (index: number) =>
      renderer.root.findByProps({ testID: `sudoku-cell-index-${index}` });
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    expect(onSelectCell).toHaveBeenLastCalledWith(2);
    expect(
      renderer.root.findByProps({ testID: 'number-key-4' }).props
        .accessibilityLabel,
    ).toMatch(/^Enter 4,/);
    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress(),
    );
    expect(onDigit).toHaveBeenLastCalledWith(4);
    expect(onRemove).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    expect(onSelectCell).toHaveBeenLastCalledWith(null);
    expect(
      renderer.root.findByProps({ testID: 'number-multi-select-count-4' }).props
        .children,
    ).toBe('−2');
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-3' }).length,
    ).toBeGreaterThan(0);
    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress(),
    );
    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'number-key-7' }).props.onPress(),
    );
    expect(onRemove.mock.calls).toEqual([
      [[2, 3], 4],
      [[2, 3], 7],
    ]);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
    ).toBeGreaterThan(0);

    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    expect(onSelectCell).toHaveBeenLastCalledWith(3);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress(),
    );
    expect(onDigit).toHaveBeenCalledTimes(2);
    expect(onRemove).toHaveBeenCalledTimes(2);

    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'game-portrait-layout' })
        .props.onTouchEnd({ target: 1, currentTarget: 1 }),
    );
    expect(onSelectCell).toHaveBeenLastCalledWith(null);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);

    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    await ReactTestRenderer.act(async () => cell(5).props.onPress());
    expect(onSelectCell).toHaveBeenLastCalledWith(5);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);

    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    await ReactTestRenderer.act(async () => cell(0).props.onPress());
    expect(onSelectCell).toHaveBeenLastCalledWith(0);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'contextual-action-strip' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'multi-candidate-done' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'multi-select-onboarding' }),
    ).toHaveLength(0);

    expect(
      renderer.root.findAllByProps({ testID: 'multi-select-tool' }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('keeps a singly filled cell selected after candidate eligibility ends', async () => {
    const source = snapshot();
    source.session!.state.candidates.manualCandidates =
      source.session!.state.candidates.manualCandidates.map((mask, cell) =>
        cell === 2 ? addCandidate(mask, 2) : mask,
      );
    const onDigit = jest.fn();
    const onSelectCell = jest.fn();
    const renderScreen = () => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            snapshot={source}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              multiSelectEnabled: true,
            }}
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onDigit={onDigit}
            onOneTapFill={noOp}
            onRemoveCandidateFromCells={noOp}
            onDismissHint={noOp}
            onErase={noOp}
            onHint={noOp}
            onPause={noOp}
            onPencil={noOp}
            onQuickPencil={noOp}
            onResume={noOp}
            onSelectCell={onSelectCell}
            onUndo={noOp}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderScreen());
    });
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onPress(),
    );
    expect(onSelectCell).toHaveBeenLastCalledWith(2);
    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'number-key-2' }).props.onPress(),
    );
    expect(onDigit).toHaveBeenCalledWith(2);
    onSelectCell.mockClear();

    source.session!.state = {
      ...source.session!.state,
      selectedCell: 2,
      values: source.session!.state.values.map((value, cell) =>
        cell === 2 ? (2 as const) : value,
      ),
      candidates: {
        ...source.session!.state.candidates,
        manualCandidates: source.session!.state.candidates.manualCandidates.map(
          (mask, cell) => (cell === 2 ? 0 : mask),
        ),
      },
    };
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));

    expect(onSelectCell).not.toHaveBeenCalledWith(null);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
    ).toBeGreaterThan(0);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('keeps the focused digit highlighted while candidate cells change', async () => {
    const source = snapshot();
    source.session!.state.candidates.manualCandidates =
      source.session!.state.candidates.manualCandidates.map((mask, cell) =>
        cell === 2 || cell === 3
          ? addCandidate(addCandidate(mask, 4), 5)
          : mask,
      );
    const onRemove = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <GameScreen
              snapshot={source}
              preferences={{
                ...DEFAULT_PRODUCT_PREFERENCES,
                boardColoring: true,
                multiSelectEnabled: true,
              }}
              onAbandon={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onDigit={noOp}
              onOneTapFill={noOp}
              onRemoveCandidateFromCells={onRemove}
              onDismissHint={noOp}
              onErase={noOp}
              onHint={noOp}
              onPause={noOp}
              onPencil={noOp}
              onQuickPencil={noOp}
              onResume={noOp}
              onSelectCell={noOp}
              onUndo={noOp}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });
    const board = () =>
      renderer.root.find(
        node =>
          Array.isArray(node.props.state?.values) &&
          typeof node.props.multiSelectActive === 'boolean',
      );
    const cell = (index: number) =>
      renderer.root.findByProps({ testID: `sudoku-cell-index-${index}` });

    await ReactTestRenderer.act(async () => cell(0).props.onPress());
    expect(board().props.highlightDigit).toBe(5);
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    expect(board().props.highlightDigit).toBe(5);
    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    expect(board().props.highlightDigit).toBe(5);

    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'color-tool' }).props.onPress(),
    );
    expect(board().props.highlightDigit).toBeNull();
    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'color-tool' }).props.onPress(),
    );
    expect(board().props.highlightDigit).toBe(5);

    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress(),
    );
    expect(onRemove).toHaveBeenCalledWith([2, 3], 4);
    expect(board().props.highlightDigit).toBe(4);

    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'game-portrait-layout' })
        .props.onTouchEnd({ target: 1, currentTarget: 1 }),
    );
    expect(board().props.highlightDigit).toBe(4);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('keeps the focused digit and matching notes highlighted for one candidate cell', async () => {
    const source = snapshot();
    source.session!.state.candidates.manualCandidates =
      source.session!.state.candidates.manualCandidates.map((mask, cell) =>
        cell === 2 ? addCandidate(addCandidate(mask, 4), 5) : mask,
      );
    const onSelectCell = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <GameScreen
              snapshot={source}
              preferences={DEFAULT_PRODUCT_PREFERENCES}
              onAbandon={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onDigit={noOp}
              onOneTapFill={noOp}
              onRemoveCandidateFromCells={noOp}
              onDismissHint={noOp}
              onErase={noOp}
              onHint={noOp}
              onPause={noOp}
              onPencil={noOp}
              onQuickPencil={noOp}
              onResume={noOp}
              onSelectCell={onSelectCell}
              onUndo={noOp}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });
    const board = () =>
      renderer.root.find(
        node =>
          Array.isArray(node.props.state?.values) &&
          typeof node.props.multiSelectActive === 'boolean',
      );
    const cell = (index: number) =>
      renderer.root.findByProps({ testID: `sudoku-cell-index-${index}` });

    await ReactTestRenderer.act(async () => cell(0).props.onPress());
    expect(board().props.highlightDigit).toBe(5);
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    expect(onSelectCell).toHaveBeenLastCalledWith(2);
    expect(board().props.highlightDigit).toBe(5);
    expect(
      renderer.root.findByProps({
        testID: 'sudoku-candidate-attention-2-5',
      }),
    ).toBeDefined();

    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    expect(board().props.highlightDigit).toBeNull();
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('keeps a filled-cell digit focused when the board background is tapped', async () => {
    const source = snapshot();
    const onSelectCell = jest.fn();
    const onHint = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <GameScreen
              snapshot={source}
              preferences={{
                ...DEFAULT_PRODUCT_PREFERENCES,
                multiSelectEnabled: true,
              }}
              onAbandon={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onDigit={noOp}
              onOneTapFill={noOp}
              onRemoveCandidateFromCells={noOp}
              onDismissHint={noOp}
              onErase={noOp}
              onHint={onHint}
              onPause={noOp}
              onPencil={noOp}
              onQuickPencil={noOp}
              onResume={noOp}
              onSelectCell={onSelectCell}
              onUndo={noOp}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });

    const board = () =>
      renderer.root.find(
        node =>
          Array.isArray(node.props.state?.values) &&
          typeof node.props.multiSelectActive === 'boolean',
      );
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-0' })
        .props.onPress(),
    );
    expect(onSelectCell).toHaveBeenLastCalledWith(0);
    expect(board().props.highlightDigit).toBe(5);
    onSelectCell.mockClear();

    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'game-portrait-layout' })
        .props.onTouchEnd({ target: 1, currentTarget: 1 }),
    );

    expect(onSelectCell).not.toHaveBeenCalled();
    expect(board().props.highlightDigit).toBe(5);
    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'hint-tool' }).props.onPress(),
    );
    expect(onHint).toHaveBeenCalledWith(5);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('keeps the preference across input modes while clearing the candidate selection', async () => {
    const source = snapshot();
    source.session!.state.candidates.manualCandidates =
      source.session!.state.candidates.manualCandidates.map((mask, cell) =>
        cell === 2 || cell === 3 ? addCandidate(mask, 4) : mask,
      );
    const onSelectCell = jest.fn();
    const renderScreen = (
      inputMode: 'cell_first' | 'digit_first',
      multiSelectEnabled = true,
    ) => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            snapshot={source}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              inputMode,
              multiSelectEnabled,
            }}
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onDigit={noOp}
            onOneTapFill={noOp}
            onRemoveCandidateFromCells={noOp}
            onDismissHint={noOp}
            onErase={noOp}
            onHint={noOp}
            onPause={noOp}
            onPencil={noOp}
            onQuickPencil={noOp}
            onResume={noOp}
            onSelectCell={onSelectCell}
            onUndo={noOp}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderScreen('cell_first'));
    });
    const cell = (index: number) =>
      renderer.root.findByProps({ testID: `sudoku-cell-index-${index}` });
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
    ).toBeGreaterThan(0);

    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen('digit_first')),
    );
    expect(
      renderer.root.findAllByProps({ testID: 'multi-select-tool' }),
    ).toHaveLength(0);
    expect(onSelectCell).toHaveBeenLastCalledWith(null);

    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen('cell_first')),
    );
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'multi-select-tool' }),
    ).toHaveLength(0);

    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen('cell_first', false)),
    );
    expect(onSelectCell).toHaveBeenLastCalledWith(null);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('restores a same-game selection after navigation but not for a new game', async () => {
    const source = snapshot();
    source.session!.state.candidates.manualCandidates =
      source.session!.state.candidates.manualCandidates.map((mask, cell) =>
        cell === 2 || cell === 3 ? addCandidate(mask, 4) : mask,
      );
    const renderScreen = (visible: boolean) => (
      <ScreenStateProvider>
        {visible ? (
          <LocalizationProvider locale="en">
            <ThemeProvider preference="light">
              <GameScreen
                snapshot={source}
                preferences={{
                  ...DEFAULT_PRODUCT_PREFERENCES,
                  multiSelectEnabled: true,
                }}
                onAbandon={noOp}
                onApplyHint={noOp}
                onBack={noOp}
                onDigit={noOp}
                onOneTapFill={noOp}
                onRemoveCandidateFromCells={noOp}
                onDismissHint={noOp}
                onErase={noOp}
                onHint={noOp}
                onPause={noOp}
                onPencil={noOp}
                onQuickPencil={noOp}
                onResume={noOp}
                onSelectCell={noOp}
                onUndo={noOp}
              />
            </ThemeProvider>
          </LocalizationProvider>
        ) : null}
      </ScreenStateProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderScreen(true));
    });
    const cell = (index: number) =>
      renderer.root.findByProps({ testID: `sudoku-cell-index-${index}` });
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen(false)),
    );
    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen(true)),
    );
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
    ).toBeGreaterThan(0);

    source.session!.state.sessionId = 'different-game-session';
    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen(true)),
    );
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('dragging adds only eligible candidate cells and works on tablet', async () => {
    const adaptiveLayout = jest
      .spyOn(AdaptiveLayout, 'useAdaptiveLayout')
      .mockReturnValue({
        isAndroidTablet: true,
        isLandscape: true,
        useLandscapeTabletLayout: true,
        widthClass: 'expanded',
      });
    const source = snapshot();
    source.session!.state.candidates.manualCandidates =
      source.session!.state.candidates.manualCandidates.map((mask, cell) =>
        cell === 2 || cell === 3 ? addCandidate(mask, 4) : mask,
      );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <LocalizationProvider locale="en">
            <ThemeProvider preference="light">
              <GameScreen
                snapshot={source}
                preferences={{
                  ...DEFAULT_PRODUCT_PREFERENCES,
                  multiSelectEnabled: true,
                }}
                onAbandon={noOp}
                onApplyHint={noOp}
                onBack={noOp}
                onDigit={noOp}
                onOneTapFill={noOp}
                onRemoveCandidateFromCells={noOp}
                onDismissHint={noOp}
                onErase={noOp}
                onHint={noOp}
                onPause={noOp}
                onPencil={noOp}
                onQuickPencil={noOp}
                onResume={noOp}
                onSelectCell={noOp}
                onUndo={noOp}
              />
            </ThemeProvider>
          </LocalizationProvider>,
        );
      });
      const board = renderer.root.find(
        node =>
          Array.isArray(node.props.state?.values) &&
          typeof node.props.multiSelectActive === 'boolean',
      );
      await ReactTestRenderer.act(async () =>
        board.props.onDragSelectCells([2, 0, 4, 3]),
      );
      expect(
        renderer.root.find(
          node =>
            Array.isArray(node.props.state?.values) &&
            typeof node.props.multiSelectActive === 'boolean',
        ).props.selectedCells,
      ).toEqual([2, 3]);
      await ReactTestRenderer.act(async () =>
        renderer.root
          .find(
            node =>
              Array.isArray(node.props.state?.values) &&
              typeof node.props.multiSelectActive === 'boolean',
          )
          .props.onDragSelectCells([3]),
      );
      expect(
        renderer.root.find(
          node =>
            Array.isArray(node.props.state?.values) &&
            typeof node.props.multiSelectActive === 'boolean',
        ).props.selectedCells,
      ).toEqual([2, 3]);
      expect(
        renderer.root.findAllByProps({ testID: 'multi-select-tool' }),
      ).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({ testID: 'contextual-action-strip' }),
      ).toHaveLength(0);
    } finally {
      await ReactTestRenderer.act(async () => renderer?.unmount());
      adaptiveLayout.mockRestore();
    }
  });

  test('lets higher-priority tools suspend and restore candidate selection', async () => {
    const source = snapshot();
    source.session!.state.candidates.manualCandidates =
      source.session!.state.candidates.manualCandidates.map((mask, cell) =>
        cell === 2 || cell === 3 ? addCandidate(mask, 4) : mask,
      );
    source.autoFinish = { placements: [], visibleCount: null, phase: null };
    const renderScreen = () => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            snapshot={source}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              boardColoring: true,
              multiSelectEnabled: true,
            }}
            onAbandon={noOp}
            onApplyHint={noOp}
            onAutoComplete={noOp}
            onBack={noOp}
            onDigit={noOp}
            onOneTapFill={noOp}
            onRemoveCandidateFromCells={noOp}
            onDismissHint={noOp}
            onErase={noOp}
            onHint={noOp}
            onPause={noOp}
            onPencil={noOp}
            onQuickPencil={noOp}
            onResume={noOp}
            onSelectCell={noOp}
            onUndo={noOp}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderScreen());
    });
    const cell = (index: number) =>
      renderer.root.findByProps({ testID: `sudoku-cell-index-${index}` });
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    expect(
      renderer.root.findAllByProps({ testID: 'auto-complete-action' }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
    ).toBeGreaterThan(0);

    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'color-tool' }).props.onPress(),
    );
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'number-key-4' }).props
        .accessibilityState.disabled,
    ).toBe(true);
    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'color-tool' }).props.onPress(),
    );
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
    ).toBeGreaterThan(0);

    source.session!.state.activeHint = kiteHint;
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);
    source.session!.state.activeHint = null;
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
    ).toBeGreaterThan(0);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('announces hint pages and makes long hint copy scrollable', async () => {
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    const activeHint: HintStep = {
      contractVersion: HINT_STEP_CONTRACT_VERSION,
      boardFingerprint: puzzle,
      techniqueCode: 'hiddenSingle',
      difficultyLevel: 1,
      focusCells: [2],
      focusRegions: [{ kind: 'row', index: 0 }],
      premiseCandidates: [{ cell: 2, digit: 4 }],
      eliminations: [],
      placements: [{ cell: 2, digit: 4 }],
      explanationKey: 'hint.hiddenSingle',
      explanationParams: {},
    };
    const next = snapshot();
    next.session = {
      ...next.session!,
      state: { ...next.session!.state, activeHint },
    };
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <GameScreen
              onAbandon={noOp}
              onOneTapFill={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onDigit={noOp}
              onRemoveCandidateFromCells={noOp}
              onDismissHint={noOp}
              onErase={noOp}
              onHint={noOp}
              onPause={noOp}
              onPencil={noOp}
              onQuickPencil={noOp}
              onResume={noOp}
              onSelectCell={noOp}
              onUndo={noOp}
              preferences={{
                ...DEFAULT_PRODUCT_PREFERENCES,
                showTimer: false,
              }}
              snapshot={next}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });
    expect(announce).toHaveBeenCalledWith(
      expect.stringContaining('Hidden Single'),
    );
    expect(
      renderer.root.findAll(node => node.props.nestedScrollEnabled === true),
    ).not.toHaveLength(0);
    const portrait = renderer.root.findByProps({
      testID: 'game-portrait-layout',
    });
    const phoneCard = portrait.findByProps({ testID: 'phone-hint-card' });
    const phoneCardStyle = StyleSheet.flatten(phoneCard.props.style);
    expect(phoneCardStyle.position).toBeUndefined();
    expect(phoneCardStyle.height).toBeGreaterThanOrEqual(240);
    expect(phoneCardStyle.height).toBeLessThanOrEqual(360);
    const phoneCopy = phoneCard.findByProps({ testID: 'phone-hint-scroll' });
    expect(phoneCopy.props.nestedScrollEnabled).toBe(true);
    expect(
      phoneCard
        .findAllByType(Text)
        .some(text => text.props.children === 'SMART HINT'),
    ).toBe(false);
    expect(
      StyleSheet.flatten(
        phoneCard.findByProps({ testID: 'phone-hint-heading' }).props.style,
      ),
    ).toMatchObject({
      alignItems: 'baseline',
      flexDirection: 'row',
      justifyContent: 'flex-start',
    });
    const phonePageTitle = phoneCard.findByProps({
      testID: 'phone-hint-page-title',
    });
    expect(phonePageTitle.props.numberOfLines).toBe(1);
    expect(StyleSheet.flatten(phonePageTitle.props.style)).toMatchObject({
      marginLeft: 8,
      maxWidth: '46%',
    });
    expect(phoneCard.findByProps({ testID: 'hint-actions' })).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'game-scroll-view' }).props
        .scrollEnabled,
    ).toBe(false);
    expect(
      StyleSheet.flatten(
        portrait.findByProps({ testID: 'game-number-pad' }).props.style,
      ),
    ).toMatchObject({ display: 'none' });
    expect(
      StyleSheet.flatten(
        portrait.findByProps({ testID: 'game-toolbar' }).props.style,
      ),
    ).toMatchObject({ display: 'none' });
    announce.mockRestore();
    ReactTestRenderer.act(() => renderer.unmount());
  });

  test('keeps tablet hint header and actions fixed around a scrollable middle', async () => {
    const adaptiveLayout = jest
      .spyOn(AdaptiveLayout, 'useAdaptiveLayout')
      .mockReturnValue({
        isAndroidTablet: true,
        isLandscape: true,
        useLandscapeTabletLayout: true,
        widthClass: 'expanded',
      });
    const next = snapshot();
    const session = kiteGame();
    session.state.activeHint = kiteHint;
    next.session = session;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    const renderScreen = (
      source: OfflineGameSnapshot,
      boardColoring = DEFAULT_PRODUCT_PREFERENCES.boardColoring,
    ) => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            onAbandon={noOp}
            onOneTapFill={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onDigit={noOp}
            onRemoveCandidateFromCells={noOp}
            onDismissHint={noOp}
            onErase={noOp}
            onHint={noOp}
            onPause={noOp}
            onPencil={noOp}
            onQuickPencil={noOp}
            onResume={noOp}
            onSelectCell={noOp}
            onUndo={noOp}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              boardColoring,
              hintAnimations: false,
            }}
            snapshot={source}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );

    try {
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(renderScreen(next));
      });

      const panel = renderer.root.findByProps({ testID: 'tablet-hint-panel' });
      expect(StyleSheet.flatten(panel.props.style)).toMatchObject({
        backgroundColor: lightPalette.surface,
        borderColor: lightPalette.line,
        borderRadius: 20,
        borderWidth: 1,
        padding: 12,
        transform: [{ translateY: 19 }],
      });
      expect(
        panel
          .findAllByType(Text)
          .some(text => text.props.children === 'SMART HINT'),
      ).toBe(true);
      const middle = renderer.root.findByProps({
        testID: 'tablet-hint-scroll',
      });
      expect(middle.props.nestedScrollEnabled).toBe(true);
      expect(
        middle
          .findAllByType(Text)
          .some(text => text.props.children === 'SMART HINT'),
      ).toBe(false);
      expect(
        renderer.root.findAllByProps({ testID: 'phone-hint-card' }),
      ).toHaveLength(0);
      expect(
        StyleSheet.flatten(
          renderer.root.findByProps({ testID: 'game-number-pad' }).props.style,
        ),
      ).toMatchObject({ display: 'none' });
      expect(
        StyleSheet.flatten(
          renderer.root.findByProps({ testID: 'game-toolbar' }).props.style,
        ),
      ).toMatchObject({ display: 'none' });

      const normal = {
        ...next,
        session: {
          ...session,
          state: { ...session.state, activeHint: null },
        },
      };
      await ReactTestRenderer.act(async () => {
        renderer.update(renderScreen(normal, false));
      });
      expect(
        StyleSheet.flatten(
          renderer.root.findByProps({ testID: 'game-toolbar' }).props.style,
        ),
      ).toMatchObject({ flexWrap: 'wrap', gap: 0 });
      expect(
        renderer.root.findAllByProps({ testID: 'color-tool' }),
      ).toHaveLength(0);
      for (const testID of ['pencil-tool', 'hint-tool']) {
        const matches = renderer.root.findAllByProps({ testID });
        expect(
          StyleSheet.flatten(matches[matches.length - 1].props.style),
        ).toMatchObject({
          flexBasis: '33.333333%',
          flexGrow: 0,
        });
      }
    } finally {
      ReactTestRenderer.act(() => renderer?.unmount());
      adaptiveLayout.mockRestore();
    }
  });

  test('hides the board accessibility tree while paused', async () => {
    const next = snapshot();
    const resume = jest.fn();
    const abandon = jest.fn();
    next.session = {
      ...next.session!,
      state: { ...next.session!.state, status: 'paused' },
    };
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <GameScreen
              onAbandon={abandon}
              onOneTapFill={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onDigit={noOp}
              onRemoveCandidateFromCells={noOp}
              onDismissHint={noOp}
              onErase={noOp}
              onHint={noOp}
              onPause={noOp}
              onPencil={noOp}
              onQuickPencil={noOp}
              onResume={resume}
              onSelectCell={noOp}
              onUndo={noOp}
              preferences={DEFAULT_PRODUCT_PREFERENCES}
              snapshot={next}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });
    expect(
      renderer.root.findByProps({ testID: 'sudoku-board' }).props
        .accessibilityElementsHidden,
    ).toBeTruthy();
    expect(
      renderer.root.find(node => node.props.accessibilityViewIsModal === true),
    ).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'game-paused' })).toBeTruthy();
    expect(
      renderer.root
        .findAllByType(Text)
        .some(
          node => node.props.children === 'Your board is hidden while paused.',
        ),
    ).toBe(true);
    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({ testID: 'game-resume-button' })
        .props.onPress();
      renderer.root
        .findByProps({ testID: 'game-abandon-button' })
        .props.onPress();
    });
    expect(resume).toHaveBeenCalledTimes(1);
    expect(abandon).toHaveBeenCalledTimes(1);
    ReactTestRenderer.act(() => renderer.unmount());
  });
});

test.each(['kite', 'empty rectangle', 'skyscraper'])(
  '%s walkthrough never applies hypothetical digits while paging',
  async technique => {
    const session = kiteGame();
    session.state.activeHint = kiteHint;
    if (technique !== 'kite') {
      const techniqueCode =
        technique === 'skyscraper' ? 'skyscraper' : 'emptyRectangle';
      const pattern =
        technique === 'skyscraper' ? [48, 57, 44, 62] : [44, 52, 76, 79];
      const board =
        '627419538139285700485637219574391682213800490968042301892063100351904800746108903';
      session.state.values = boardFromFingerprint(board);
      session.state.candidates.quickCandidates = createSolverCandidates(
        session.state.values,
      );
      session.state.activeHint = {
        ...kiteHint,
        boardFingerprint: board,
        techniqueCode,
        explanationKey: `hint.${techniqueCode}`,
        focusCells: pattern,
        premiseCandidates: pattern.map(cell => ({ cell, digit: 5 })),
        eliminations: [{ cell: 40, digit: 5 }],
      };
    }
    session.state.candidates.hintCandidates =
      session.state.candidates.quickCandidates;
    const pageCount = buildHintPresentation(
      session.state.activeHint,
      undefined,
      'game',
      session.state.candidates.hintCandidates,
    ).pages.length;
    const source = { ...snapshot(), session };
    const before = JSON.stringify(session);
    const apply = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    const press = async (label: string) => {
      const node = renderer.root
        .findAll(
          n =>
            n.props.accessibilityRole === 'button' &&
            typeof n.props.onPress === 'function',
        )
        .find(n =>
          n
            .findAllByType(Text)
            .some(t => [t.props.children].flat(Infinity).join('') === label),
        );
      if (!node) throw new Error('Missing button: ' + label);
      await ReactTestRenderer.act(async () => node.props.onPress());
    };
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="zh-Hans">
          <ThemeProvider preference="light">
            <GameScreen
              snapshot={source}
              preferences={{
                ...DEFAULT_PRODUCT_PREFERENCES,
                hintAnimations: false,
              }}
              onAbandon={noOp}
              onApplyHint={apply}
              onBack={noOp}
              onOneTapFill={noOp}
              onDigit={noOp}
              onRemoveCandidateFromCells={noOp}
              onDismissHint={noOp}
              onErase={noOp}
              onHint={noOp}
              onPause={noOp}
              onPencil={noOp}
              onQuickPencil={noOp}
              onResume={noOp}
              onSelectCell={noOp}
              onUndo={noOp}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-hint-links' }).length,
    ).toBeGreaterThan(0);
    for (let page = 0; page < pageCount - 1; page++) {
      expect(apply).not.toHaveBeenCalled();
      await press('下一步');
    }
    expect(
      renderer.root.findAll(
        n =>
          typeof n.props.testID === 'string' &&
          (n.props.testID.startsWith('sudoku-reasoning-true-single-') ||
            n.props.testID.startsWith('sudoku-reasoning-false-single-')),
      ),
    ).toHaveLength(0);
    expect(JSON.stringify(session)).toBe(before);
    await press('应用这一步');
    expect(apply).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(async () => renderer.unmount());
  },
);
