import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  OfflineGameSnapshot,
} from '../src/application';
import {
  GameDefinition,
  HINT_STEP_CONTRACT_VERSION,
  HintStep,
  boardFromFingerprint,
  createGameSession,
} from '../src/domain';
import { LocalizationProvider } from '../src/localization';
import { GameScreen, gameScreenTextScale } from '../src/ui/screens/GameScreen';
import { ThemeProvider, darkPalette, lightPalette } from '../src/ui/theme';

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
  test.each([
    ['light', 'cell_first', lightPalette],
    ['dark', 'cell_first', darkPalette],
    ['light', 'digit_first', lightPalette],
    ['dark', 'digit_first', darkPalette],
  ] as const)(
    'uses Hint result colors and tap-to-fill in %s theme with %s input',
    async (theme, inputMode, palette) => {
      const onCompleteFullHouse = jest.fn();
      const onSelectCell = jest.fn();
      const onDigit = jest.fn();
      const next = snapshot();
      const game = createGameSession({
        sessionId: 'full-house-ui',
        definition: {
          ...definition,
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
      const renderScreen = (fullHouseAssist: boolean) => (
        <ThemeProvider preference={theme}>
          <GameScreen
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onCompleteFullHouse={onCompleteFullHouse}
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
              fullHouseAssist,
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
          renderScreen(DEFAULT_PRODUCT_PREFERENCES.fullHouseAssist),
        );
      });
      expect(onCompleteFullHouse).not.toHaveBeenCalled();
      if (inputMode === 'digit_first') {
        const digitFour = renderer.root.find(
          node =>
            node.props.accessibilityRole === 'button' &&
            typeof node.props.accessibilityLabel === 'string' &&
            node.props.accessibilityLabel.startsWith('Enter 4,'),
        );
        await ReactTestRenderer.act(async () => digitFour.props.onPress());
      }
      const cell = renderer.root.findByProps({
        testID: 'sudoku-cell-index-80',
      });
      expect(StyleSheet.flatten(cell.props.style).backgroundColor).toBe(
        palette.hintResult,
      );
      expect(cell.props.accessibilityHint).toBe('Tap to fill 9.');
      await ReactTestRenderer.act(async () => cell.props.onPress());
      expect(onCompleteFullHouse).toHaveBeenCalledWith(80);
      expect(onSelectCell).not.toHaveBeenCalled();
      expect(onDigit).not.toHaveBeenCalled();

      onCompleteFullHouse.mockClear();
      await ReactTestRenderer.act(async () => {
        renderer.update(renderScreen(false));
      });
      expect(StyleSheet.flatten(cell.props.style).backgroundColor).toBe(
        palette.selected,
      );
      expect(cell.props.accessibilityHint).toBeUndefined();
      await ReactTestRenderer.act(async () => cell.props.onPress());
      expect(onSelectCell).toHaveBeenCalledWith(80);
      expect(onCompleteFullHouse).not.toHaveBeenCalled();

      next.busy = true;
      await ReactTestRenderer.act(async () => {
        renderer.update(renderScreen(true));
      });
      expect(StyleSheet.flatten(cell.props.style).backgroundColor).not.toBe(
        palette.hintResult,
      );
      expect(cell.props.disabled).toBe(true);
      await ReactTestRenderer.act(async () => cell.props.onPress());
      expect(onCompleteFullHouse).not.toHaveBeenCalled();
      ReactTestRenderer.act(() => renderer.unmount());
    },
  );

  test('uses larger text on iPad mini without changing phone text', () => {
    expect(gameScreenTextScale(390, 844)).toBe(1);
    expect(gameScreenTextScale(744, 1133)).toBe(1.25);
  });

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
              onCompleteFullHouse={noOp}
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
              onCompleteFullHouse={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onDigit={noOp}
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
    announce.mockRestore();
    ReactTestRenderer.act(() => renderer.unmount());
  });

  test('hides the board accessibility tree while paused', async () => {
    const next = snapshot();
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
              onAbandon={noOp}
              onCompleteFullHouse={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onDigit={noOp}
              onDismissHint={noOp}
              onErase={noOp}
              onHint={noOp}
              onPause={noOp}
              onPencil={noOp}
              onQuickPencil={noOp}
              onResume={noOp}
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
      renderer.root.find(
        node =>
          node.props.accessibilityElementsHidden === true &&
          node.props.importantForAccessibility === 'no-hide-descendants',
      ),
    ).toBeTruthy();
    expect(
      renderer.root.find(node => node.props.accessibilityViewIsModal === true),
    ).toBeTruthy();
    ReactTestRenderer.act(() => renderer.unmount());
  });

  test('opens and ends candidate focus from the standard toolbar tool', async () => {
    const next = snapshot();
    const gameStateBeforeFocus = JSON.stringify(next.session!.state);
    const onSelectCell = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <GameScreen
              onAbandon={noOp}
              onCompleteFullHouse={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onDigit={noOp}
              onDismissHint={noOp}
              onErase={noOp}
              onHint={noOp}
              onPause={noOp}
              onPencil={noOp}
              onQuickPencil={noOp}
              onResume={noOp}
              onSelectCell={onSelectCell}
              onUndo={noOp}
              preferences={DEFAULT_PRODUCT_PREFERENCES}
              snapshot={next}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });

    const cell = renderer.root.findByProps({ testID: 'sudoku-cell-index-2' });
    expect(cell.props.onLongPress).toBeUndefined();
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'candidate-focus-tool' })
        .props.onPress(),
    );
    expect(
      renderer.root.findAllByProps({ testID: 'candidate-focus-panel' }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({ testID: 'candidate-focus-digit-1' }),
    ).not.toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'candidate-focus-tool' }).props
        .active,
    ).toBe(true);

    for (const digit of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: `candidate-focus-digit-${digit}` })
          .props.onPress(),
      );
      expect(
        renderer.root.findByProps({
          testID: `candidate-focus-digit-${digit}`,
        }).props.accessibilityState,
      ).toEqual({ selected: true, disabled: false });
    }
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'candidate-focus-tool' })
        .props.onPress(),
    );
    expect(
      renderer.root.findAllByProps({ testID: 'candidate-focus-panel' }),
    ).toHaveLength(0);
    expect(JSON.stringify(next.session!.state)).toBe(gameStateBeforeFocus);

    ReactTestRenderer.act(() => renderer.unmount());
  });

  test('disables completed Focus digits, clears their selection, and re-enables after undo', async () => {
    const next = snapshot();
    const values = boardFromFingerprint(solution).map(value =>
      value === 9 ? null : value,
    );
    values[0] = null;
    next.session = {
      ...next.session!,
      state: { ...next.session!.state, values },
    };
    const renderScreen = () => (
      <GameScreen
        onAbandon={noOp}
        onApplyHint={noOp}
        onBack={noOp}
        onCompleteFullHouse={noOp}
        onDigit={noOp}
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
          showRemainingDigits: false,
          showTimer: false,
        }}
        snapshot={{ ...next }}
      />
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(renderScreen());
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({ testID: 'candidate-focus-tool' })
        .props.onPress();
    });
    const button = (digit: number) =>
      renderer.root.findByProps({ testID: `candidate-focus-digit-${digit}` });
    expect(button(4).props.disabled).toBe(true);
    expect(button(4).props.accessibilityState).toEqual({
      selected: false,
      disabled: true,
    });
    expect(button(5).props.disabled).toBe(false);
    await ReactTestRenderer.act(async () => {
      button(4).props.onPress();
    });
    expect(
      renderer.root.find(node => Array.isArray(node.props.focusedDigits)).props
        .focusedDigits,
    ).toEqual([]);
    for (const digit of [5, 9]) {
      await ReactTestRenderer.act(async () => button(digit).props.onPress());
    }

    const completedValues = [...values];
    completedValues[0] = 5;
    next.session = {
      ...next.session!,
      state: { ...next.session!.state, values: completedValues },
    };
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(button(5).props.disabled).toBe(true);
    expect(button(5).props.accessibilityState.selected).toBe(false);
    expect(
      renderer.root.find(node => Array.isArray(node.props.focusedDigits)).props
        .focusedDigits,
    ).toEqual([9]);

    next.session = {
      ...next.session!,
      state: { ...next.session!.state, values },
    };
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(button(5).props.disabled).toBe(false);
    expect(button(5).props.accessibilityState.selected).toBe(false);
    await ReactTestRenderer.act(async () => button(5).props.onPress());
    expect(
      renderer.root.find(node => Array.isArray(node.props.focusedDigits)).props
        .focusedDigits,
    ).toEqual([5, 9]);
    ReactTestRenderer.act(() => renderer.unmount());
  });
});
