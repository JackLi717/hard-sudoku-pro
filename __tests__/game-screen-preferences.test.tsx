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
  boardFromFingerprint,
  createGameSession,
  createSolverCandidates,
} from '../src/domain';
import { LocalizationProvider } from '../src/localization';
import {
  GameScreen,
  formatDifficultyScore,
  gameScreenTextScale,
} from '../src/ui/screens/GameScreen';
import { ThemeProvider, darkPalette, lightPalette } from '../src/ui/theme';
import { kiteGame, kiteHint } from './helpers/ipad-hint-assistance';

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
    completionResult: null,
  };
}

const noOp = () => undefined;

describe('GameScreen preferences', () => {
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
            onCompleteFullHouse={noOp}
            onColorCells={color}
            onClearBoardColors={clear}
            onDigit={noOp}
            onRemoveCandidateFromCells={noOp}
            onMultiSelectOnboardingSeen={noOp}
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
  test('long-press multi-selection works while Color is open and after it closes', async () => {
    const current = snapshot();
    const onColorCells = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <GameScreen
              snapshot={current}
              preferences={{
                ...DEFAULT_PRODUCT_PREFERENCES,
                boardColoring: true,
                multiSelectOnboardingSeen: true,
              }}
              onAbandon={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onCompleteFullHouse={noOp}
              onColorCells={onColorCells}
              onDigit={noOp}
              onRemoveCandidateFromCells={noOp}
              onMultiSelectOnboardingSeen={noOp}
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
    const cell = (index: number) =>
      renderer.root.findByProps({ testID: `sudoku-cell-index-${index}` });
    const colorTool = () => renderer.root.findByProps({ testID: 'color-tool' });
    await ReactTestRenderer.act(async () => colorTool().props.onPress());
    await ReactTestRenderer.act(async () => cell(2).props.onLongPress());
    expect(
      renderer.root.findAllByProps({ testID: 'color-palette' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'sudoku-selection-2' }),
    ).toBeTruthy();
    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    expect(
      renderer.root.findByProps({ testID: 'sudoku-selection-3' }),
    ).toBeTruthy();
    expect(onColorCells).not.toHaveBeenCalled();
    expect(colorTool().props.disabled).toBe(true);
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'multi-candidate-done' })
        .props.onPress(),
    );
    expect(colorTool().props.disabled).toBe(false);
    expect(
      renderer.root.findAllByProps({ testID: 'color-palette' }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(async () => cell(5).props.onLongPress());
    expect(
      renderer.root.findByProps({ testID: 'sudoku-selection-5' }),
    ).toBeTruthy();
    expect(onColorCells).not.toHaveBeenCalled();
    await ReactTestRenderer.act(async () => renderer.unmount());
  });
  test('offers Auto complete in the strip and renders progress one cell at a time', async () => {
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
    const renderScreen = (visibleCount: number | null) => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onCompleteFullHouse={noOp}
            onDigit={noOp}
            onRemoveCandidateFromCells={noOp}
            onMultiSelectOnboardingSeen={noOp}
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
              autoFinish: { placements, visibleCount },
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

    await ReactTestRenderer.act(async () => renderer.update(renderScreen(1)));
    expect(board().props.state.values[2]).toBe(4);
    expect(board().props.state.values[3]).toBeNull();

    await ReactTestRenderer.act(async () => renderer.update(renderScreen(2)));
    expect(board().props.state.values[2]).toBe(4);
    expect(board().props.state.values[3]).toBe(6);
    ReactTestRenderer.act(() => renderer.unmount());
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
            onCompleteFullHouse={noOp}
            onDigit={noOp}
            onRemoveCandidateFromCells={noOp}
            onMultiSelectOnboardingSeen={noOp}
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
            onCompleteFullHouse={noOp}
            onDigit={noOp}
            onRemoveCandidateFromCells={noOp}
            onMultiSelectOnboardingSeen={noOp}
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
    expect(StyleSheet.flatten(pause.findByType(Text).props.style).color).toBe(
      lightPalette.muted,
    );
    expect(
      renderer.root.findByProps({ testID: 'game-difficulty' }).props.children,
    ).toBe('Hard');
    expect(
      renderer.root.findByProps({ testID: 'game-mistakes' }).props.children,
    ).toBe('Mistakes 0');
    const quickTool = () =>
      renderer.root.findByProps({ testID: 'quick-pencil-tool' });
    ReactTestRenderer.act(() => {
      quickTool().props.onPress();
      quickTool().props.onLongPress();
    });
    expect(quickPress).toHaveBeenCalledTimes(1);
    expect(quickLongPress).toHaveBeenCalledTimes(1);
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
      StyleSheet.flatten(
        renderer.root
          .findByProps({ accessibilityLabel: 'Pause' })
          .findByType(Text).props.style,
      ).color,
    ).toBe(darkPalette.muted);
    expect(
      StyleSheet.flatten(
        hintTool().findByProps({ testID: 'tool-low-balance-badge' }).props
          .style,
      ).backgroundColor,
    ).toBe(darkPalette.selected);
    ReactTestRenderer.act(() => renderer.unmount());
  });

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
            onRemoveCandidateFromCells={noOp}
            onMultiSelectOnboardingSeen={noOp}
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
              onRemoveCandidateFromCells={noOp}
              onMultiSelectOnboardingSeen={noOp}
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

  test('long press selects multiple empty cells and keeps selection after remove', async () => {
    const source = snapshot();
    const onRemove = jest.fn();
    const onDigit = jest.fn();
    const onSelectCell = jest.fn();
    const onOnboardingSeen = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <GameScreen
              snapshot={source}
              preferences={{
                ...DEFAULT_PRODUCT_PREFERENCES,
                inputMode: 'digit_first',
              }}
              onAbandon={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onCompleteFullHouse={noOp}
              onDigit={onDigit}
              onRemoveCandidateFromCells={onRemove}
              onMultiSelectOnboardingSeen={onOnboardingSeen}
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
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onLongPress(),
    );
    expect(onOnboardingSeen).not.toHaveBeenCalled();
    expect(
      renderer.root.findAllByProps({ testID: 'multi-select-onboarding' })
        .length,
    ).toBeGreaterThan(0);
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'multi-select-onboarding-got-it' })
        .props.onPress(),
    );
    expect(
      renderer.root.findByProps({ testID: 'multi-select-count' }).props
        .children,
    ).toBe('1 cell selected');
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-3' })
        .props.onPress(),
    );
    expect(
      renderer.root.findByProps({ testID: 'multi-select-count' }).props
        .children,
    ).toBe('2 cells selected');
    const digit = renderer.root.find(
      node =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel ===
          'Remove candidate 4 from selected cells',
    );
    await ReactTestRenderer.act(async () => digit.props.onPress());
    expect(onRemove).toHaveBeenCalledWith([2, 3], 4);
    expect(onDigit).not.toHaveBeenCalled();
    expect(onSelectCell).not.toHaveBeenCalled();
    expect(onOnboardingSeen).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findAllByProps({ testID: 'game-mistakes' }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({ testID: 'multi-select-onboarding' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'multi-candidate-done' }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-3' }).length,
    ).toBeGreaterThan(0);
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'multi-candidate-done' })
        .props.onPress(),
    );
    expect(
      renderer.root.findAllByProps({ testID: 'contextual-action-strip' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-3' }),
    ).toHaveLength(0);
    ReactTestRenderer.act(() => renderer.unmount());
  });

  test('prioritizes Multi-select over Auto complete and hides the strip for busy and Hint states', async () => {
    const current = snapshot();
    const renderScreen = () => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            snapshot={current}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              showTimer: false,
              multiSelectOnboardingSeen: true,
            }}
            onAbandon={noOp}
            onApplyHint={noOp}
            onAutoComplete={noOp}
            onBack={noOp}
            onCompleteFullHouse={noOp}
            onDigit={noOp}
            onRemoveCandidateFromCells={noOp}
            onMultiSelectOnboardingSeen={noOp}
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
    expect(
      renderer.root.findAllByProps({ testID: 'contextual-action-strip' }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'sudoku-cell-index-2' })
        .props.onLongPress(),
    );
    expect(
      renderer.root.findByProps({ testID: 'multi-select-count' }).props
        .children,
    ).toBe('1 cell selected');
    current.autoFinish = { placements: [], visibleCount: null };
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(
      renderer.root.findByProps({ testID: 'multi-select-count' }).props
        .children,
    ).toBe('1 cell selected');
    expect(
      renderer.root.findAllByProps({ testID: 'auto-complete-action' }),
    ).toHaveLength(0);
    current.busy = true;
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(
      renderer.root.findAllByProps({ testID: 'contextual-action-strip' }),
    ).toHaveLength(0);
    current.busy = false;
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(
      renderer.root.findAllByProps({ testID: 'contextual-action-strip' })
        .length,
    ).toBeGreaterThan(0);
    current.autoFinish = { placements: [], visibleCount: 0 };
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(
      renderer.root.findAllByProps({ testID: 'contextual-action-strip' }),
    ).toHaveLength(0);
    current.autoFinish = { placements: [], visibleCount: null };
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(
      renderer.root.findByProps({ testID: 'multi-select-count' }).props
        .children,
    ).toBe('1 cell selected');
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'multi-candidate-done' })
        .props.onPress(),
    );
    expect(
      renderer.root.findByProps({ testID: 'auto-complete-status' }).props
        .children,
    ).toBe('Simple steps remain');
    current.session!.state.activeHint = kiteHint;
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(
      renderer.root.findAllByProps({ testID: 'contextual-action-strip' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);
    current.session!.state.activeHint = null;
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(
      renderer.root.findAllByProps({ testID: 'auto-complete-action' }).length,
    ).toBeGreaterThan(0);
    current.autoFinish = undefined;
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(
      renderer.root.findAllByProps({ testID: 'contextual-action-strip' }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('blocks game actions until the one-time teaching overlay is dismissed', async () => {
    jest.useFakeTimers();
    const base = snapshot();
    const onSeen = jest.fn();
    const onReplayUsed = jest.fn();
    const onSelectCell = jest.fn();
    const renderScreen = (
      gameSnapshot: OfflineGameSnapshot,
      seen = false,
      replay = false,
    ) => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            snapshot={gameSnapshot}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              showTimer: false,
              multiSelectOnboardingSeen: seen,
            }}
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onCompleteFullHouse={noOp}
            onDigit={noOp}
            onRemoveCandidateFromCells={noOp}
            onMultiSelectOnboardingSeen={onSeen}
            onMultiSelectOnboardingReplayUsed={onReplayUsed}
            replayMultiSelectOnboarding={replay}
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
    try {
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(renderScreen(base));
      });
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'sudoku-cell-index-0' })
          .props.onLongPress(),
      );
      expect(onSeen).not.toHaveBeenCalled();
      expect(
        renderer.root.findAllByProps({ testID: 'multi-select-onboarding' }),
      ).toHaveLength(0);
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'sudoku-cell-index-2' })
          .props.onLongPress(),
      );
      expect(onSeen).not.toHaveBeenCalled();
      expect(
        renderer.root.findAllByProps({ testID: 'multi-select-onboarding' })
          .length,
      ).toBeGreaterThan(0);
      expect(
        renderer.root.findAllByProps({ testID: 'contextual-action-strip' }),
      ).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
      ).toBeGreaterThan(0);
      await ReactTestRenderer.act(async () => {
        jest.advanceTimersByTime(10_000);
      });
      expect(
        renderer.root.findAllByProps({ testID: 'multi-select-onboarding' })
          .length,
      ).toBeGreaterThan(0);
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'sudoku-cell-index-3' })
          .props.onPress(),
      );
      expect(onSelectCell).not.toHaveBeenCalled();
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'multi-select-onboarding-backdrop' })
          .props.onPress(),
      );
      expect(onSeen).not.toHaveBeenCalled();
      expect(onSelectCell).not.toHaveBeenCalled();
      expect(
        renderer.root.findAllByProps({ testID: 'multi-select-onboarding' })
          .length,
      ).toBeGreaterThan(0);
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'multi-select-onboarding-got-it' })
          .props.onPress(),
      );
      expect(onSeen).toHaveBeenCalledTimes(1);
      expect(onSelectCell).not.toHaveBeenCalled();
      expect(
        renderer.root.findAllByProps({ testID: 'multi-select-onboarding' }),
      ).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
      ).toBeGreaterThan(0);
      expect(
        renderer.root.findAllByProps({ testID: 'contextual-action-strip' })
          .length,
      ).toBeGreaterThan(0);
      const pencilOn: OfflineGameSnapshot = {
        ...base,
        session: {
          ...base.session!,
          state: {
            ...base.session!.state,
            candidates: { ...base.session!.state.candidates, pencilMode: true },
          },
        },
      };
      await ReactTestRenderer.act(async () =>
        renderer.update(renderScreen(pencilOn, true)),
      );
      expect(
        renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
      ).toBeGreaterThan(0);
      await ReactTestRenderer.act(async () =>
        renderer.update(renderScreen(pencilOn, true, true)),
      );
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'sudoku-cell-index-2' })
          .props.onLongPress(),
      );
      expect(
        renderer.root.findAllByProps({ testID: 'multi-select-onboarding' })
          .length,
      ).toBeGreaterThan(0);
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'multi-select-onboarding-got-it' })
          .props.onPress(),
      );
      expect(onReplayUsed).toHaveBeenCalledTimes(1);
      expect(onSeen).toHaveBeenCalledTimes(1);
      await ReactTestRenderer.act(async () =>
        renderer.update(renderScreen(pencilOn, true)),
      );
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'sudoku-cell-index-3' })
          .props.onLongPress(),
      );
      expect(onSeen).toHaveBeenCalledTimes(1);

      const pencilOff: OfflineGameSnapshot = {
        ...pencilOn,
        session: {
          ...pencilOn.session!,
          state: {
            ...pencilOn.session!.state,
            candidates: {
              ...pencilOn.session!.state.candidates,
              pencilMode: false,
            },
          },
        },
      };
      await ReactTestRenderer.act(async () =>
        renderer.update(renderScreen(pencilOff, true)),
      );
      expect(
        renderer.root.findAllByProps({ testID: 'sudoku-selection-3' }).length,
      ).toBeGreaterThan(0);
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'multi-candidate-done' })
          .props.onPress(),
      );
      expect(
        renderer.root.findAllByProps({ testID: 'sudoku-selection-3' }),
      ).toHaveLength(0);
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'sudoku-cell-index-3' })
          .props.onPress(),
      );
      expect(onSelectCell).toHaveBeenCalledWith(3);
      await ReactTestRenderer.act(async () => renderer.unmount());

      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(renderScreen(base, true));
      });
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'sudoku-cell-index-2' })
          .props.onLongPress(),
      );
      expect(
        renderer.root.findAllByProps({ testID: 'multi-select-onboarding' }),
      ).toHaveLength(0);
    } finally {
      ReactTestRenderer.act(() => renderer?.unmount());
      jest.useRealTimers();
    }
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
              onRemoveCandidateFromCells={noOp}
              onMultiSelectOnboardingSeen={noOp}
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
              onCompleteFullHouse={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onDigit={noOp}
              onRemoveCandidateFromCells={noOp}
              onMultiSelectOnboardingSeen={noOp}
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
      renderer.root.find(
        node =>
          node.props.accessibilityElementsHidden === true &&
          node.props.importantForAccessibility === 'no-hide-descendants',
      ),
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
    let pageCount = 8;
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
      pageCount = technique === 'skyscraper' ? 10 : 9;
    }
    session.state.candidates.hintCandidates =
      session.state.candidates.quickCandidates;
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
              onCompleteFullHouse={noOp}
              onDigit={noOp}
              onRemoveCandidateFromCells={noOp}
              onMultiSelectOnboardingSeen={noOp}
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
          n.props.testID.startsWith('sudoku-hypothetical-'),
      ),
    ).toHaveLength(0);
    expect(JSON.stringify(session)).toBe(before);
    await press('应用这一步');
    expect(apply).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(async () => renderer.unmount());
  },
);
