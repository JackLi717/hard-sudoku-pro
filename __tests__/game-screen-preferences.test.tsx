import {
  openGameMenu,
  pressGameMenuTool,
  batchNotesSelected,
} from './helpers/game-menu';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  AccessibilityInfo,
  AppState,
  AppStateStatus,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  OfflineGameSnapshot,
  ProductLocale,
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
  gameBoardMetaEdgeInset,
  gameLandscapeBoardMaxSize,
  gameLandscapeControlsWidth,
  gameLandscapeHorizontalGutter,
  gameLandscapeHintPanelHeight,
  gameInferenceEntryRightInset,
  gamePhoneHintAvailableHeight,
  gamePhoneHintPanelHeight,
  gameScreenTextScale,
  gameSideRailBoardSize,
  numberKeyFeedbackText,
  resolveHintCompletionFocus,
  resolveNumberKeyState,
} from '../src/ui/screens/GameScreen';
import { ThemeProvider, darkPalette, lightPalette } from '../src/ui/theme';
import * as AdaptiveLayout from '../src/ui/layout/adaptive-layout';
import { HardwareGameInput } from '../src/ui/hardware-game-input';
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
  const session = createGameSession({
    sessionId: 'game-screen-session',
    definition,
    startedAtEpochMs: Date.now(),
  });
  // Most interaction tests establish their own selection explicitly.
  session.state.selectedCell = null;
  return {
    screen: 'game',
    session,
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

function gameScreenElement(
  gameSnapshot: OfflineGameSnapshot,
  preferences = DEFAULT_PRODUCT_PREFERENCES,
  overrides: Partial<React.ComponentProps<typeof GameScreen>> = {},
  locale: ProductLocale = 'zh-Hans',
) {
  return (
    <LocalizationProvider locale={locale}>
      <ThemeProvider preference="light">
        <GameScreen
          snapshot={gameSnapshot}
          preferences={preferences}
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
          onEditCandidates={noOp}
          onResume={noOp}
          onSelectCell={noOp}
          onUndo={noOp}
          {...overrides}
        />
      </ThemeProvider>
    </LocalizationProvider>
  );
}

function renderGameScreen(...args: Parameters<typeof gameScreenElement>) {
  return ReactTestRenderer.create(gameScreenElement(...args));
}

describe('GameScreen preferences', () => {
  const originalAppState = AppState.currentState;
  beforeEach(() => {
    AppState.currentState = 'active';
  });
  afterEach(() => {
    AppState.currentState = originalAppState;
  });
  async function measureGame(renderer: ReactTestRenderer.ReactTestRenderer) {
    const event = (height: number) => ({
      nativeEvent: { layout: { width: 360, height, x: 0, y: 0 } },
    });
    for (let pass = 0; pass < 2; pass++) {
      await ReactTestRenderer.act(async () => {
        renderer.root
          .findByProps({ testID: 'game-screen-root' })
          .props.onLayout(event(640));
        renderer.root
          .findByProps({ testID: 'game-header' })
          .props.onLayout(event(56));
        renderer.root
          .findByProps({ testID: 'game-number-pad' })
          .parent!.props.onLayout(event(158));
      });
    }
  }

  test.each(['cell_first', 'digit_first'] as const)(
    'hardware input edits the selected cell in %s mode and stops when paused',
    async inputMode => {
      const source = snapshot();
      source.session!.state.selectedCell = 2;
      const onDigit = jest.fn();
      const onSelectCell = jest.fn();
      const onUndo = jest.fn();
      const preferences = { ...DEFAULT_PRODUCT_PREFERENCES, inputMode };
      const handlers = { onDigit, onSelectCell, onUndo };
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => {
        renderer = renderGameScreen(source, preferences, handlers);
      });
      await measureGame(renderer);
      const input = () => renderer.root.findByType(HardwareGameInput);
      expect(input().props.enabled).toBe(true);
      await ReactTestRenderer.act(async () => {
        input().props.onCommand({ type: 'digit', digit: 8 });
        input().props.onCommand({ type: 'move', row: 0, column: 1 });
        input().props.onCommand({ type: 'undo' });
      });
      expect(onDigit).toHaveBeenCalledWith(8);
      expect(onSelectCell).toHaveBeenCalledWith(3);
      expect(onUndo).toHaveBeenCalledTimes(1);
      source.session!.state.status = 'paused';
      await ReactTestRenderer.act(async () => {
        renderer.update(gameScreenElement(source, preferences, handlers));
      });
      expect(input().props.enabled).toBe(false);
      await ReactTestRenderer.act(async () => renderer.unmount());
    },
  );

  test.each(['manual', 'off'] as const)(
    'shows the %s finish state without empty advanced tools',
    async autoFinishMode => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => {
        renderer = renderGameScreen(
          snapshot(),
          { ...DEFAULT_PRODUCT_PREFERENCES, autoFinishMode },
          { onAutoComplete: jest.fn() },
        );
      });
      await measureGame(renderer);
      for (const testID of [
        'game-more',
        'game-additional-toolbar',
        'color-tool',
        'inference-start',
      ]) {
        expect(renderer.root.findAllByProps({ testID })).toHaveLength(0);
      }
      const tools = renderer.root.findAllByProps({
        testID: 'auto-complete-action',
      });
      expect(tools).toHaveLength(0);
      expect(
        renderer.root
          .findByProps({ testID: 'game-toolbar' })
          .findAll(node => node.props.accessibilityRole === 'button', {
            deep: false,
          }),
      ).toHaveLength(5);
      await ReactTestRenderer.act(async () => renderer.unmount());
    },
  );

  test.each([
    { width: 600, height: 912 },
    { width: 744, height: 1133 },
    { width: 834, height: 1194 },
  ])(
    'keeps portrait tablet tool positions fixed at $width × $height',
    async ({ width, height }) => {
      const previous = {
        window: Dimensions.get('window'),
        screen: Dimensions.get('screen'),
      };
      const source = snapshot();
      const clearColors = jest.fn();
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      const render = (
        boardColoring: boolean,
        forcingEnabled: boolean,
        multiSelectEnabled: boolean,
        autoFinishMode: 'manual' | 'off' = 'off',
      ) =>
        gameScreenElement(
          source,
          {
            ...DEFAULT_PRODUCT_PREFERENCES,
            boardColoring,
            forcingEnabled,
            multiSelectEnabled,
            autoFinishMode,
          },
          { onClearBoardColors: clearColors },
        );
      const rowSlots = (testID: string) =>
        renderer.root
          .findAllByProps({ testID })
          .at(-1)!
          .children.map(child =>
            typeof child === 'string' ? child : child.props.testID,
          );
      try {
        await ReactTestRenderer.act(async () => {
          const dimensions = { width, height, scale: 2, fontScale: 1 };
          Dimensions.set({ window: dimensions, screen: dimensions });
          renderer = ReactTestRenderer.create(render(false, true, false));
        });
        const root = renderer.root;
        const controls = root.findByProps({ testID: 'game-number-pad' })
          .parent!;
        await ReactTestRenderer.act(async () => {
          root.findByProps({ testID: 'game-header' }).props.onLayout({
            nativeEvent: { layout: { width, height: 56, x: 0, y: 0 } },
          });
          controls.props.onLayout({
            nativeEvent: { layout: { width, height: 158, x: 0, y: 0 } },
          });
        });
        expect(rowSlots('game-toolbar')).toHaveLength(5);
        expect(rowSlots('game-additional-toolbar')).toEqual([
          'game-empty-slot-leading',
          'game-empty-slot-color-tool',
          'game-empty-slot-color-clear-menu',
          'inference-start',
          'game-empty-slot-multi-select-tool',
          'game-empty-slot-trailing',
        ]);

        await ReactTestRenderer.act(async () =>
          renderer.update(render(true, true, false)),
        );
        expect(rowSlots('game-additional-toolbar')).toEqual([
          'game-empty-slot-leading',
          'color-tool',
          'color-clear-menu',
          'inference-start',
          'game-empty-slot-multi-select-tool',
          'game-empty-slot-trailing',
        ]);
        expect(
          root.findByProps({ testID: 'color-clear-menu' }).props.disabled,
        ).toBe(true);

        source.session!.state.annotations = [
          { type: 'cell', cell: 2, color: 1 },
        ];
        await ReactTestRenderer.act(async () =>
          renderer.update(render(true, true, false)),
        );
        expect(
          root.findByProps({ testID: 'color-clear-menu' }).props.disabled,
        ).toBe(false);
        await ReactTestRenderer.act(async () =>
          root.findByProps({ testID: 'color-clear-menu' }).props.onPress(),
        );
        expect(clearColors).toHaveBeenCalledTimes(1);

        await ReactTestRenderer.act(async () =>
          renderer.update(render(true, true, true, 'manual')),
        );
        expect(rowSlots('game-toolbar')).toHaveLength(5);
        expect(
          root.findAllByProps({ testID: 'game-empty-slot-finish' }),
        ).toHaveLength(0);
        expect(
          root.findAllByProps({ testID: 'auto-complete-action' }),
        ).toHaveLength(0);
        expect(rowSlots('game-additional-toolbar')).toEqual([
          'game-empty-slot-leading',
          'color-tool',
          'color-clear-menu',
          'inference-start',
          'multi-select-tool',
          'game-empty-slot-trailing',
        ]);

        await ReactTestRenderer.act(async () =>
          root.findByProps({ testID: 'color-tool' }).props.onPress(),
        );
        expect(rowSlots('game-additional-toolbar')).toEqual([
          'game-empty-slot-leading',
          'color-tool',
          'color-clear-menu',
          'inference-start',
          'multi-select-tool',
          'game-empty-slot-trailing',
        ]);
      } finally {
        await ReactTestRenderer.act(async () => renderer?.unmount());
        Dimensions.set(previous);
      }
    },
  );

  test.each(['manual', 'off'] as const)(
    'offers a ready tail in %s without starting until tapped',
    async autoFinishMode => {
      const source = snapshot();
      source.autoFinish = {
        placements: [{ cell: 2, digit: 4, technique: 'nakedSingle', round: 0 }],
        visibleCount: null,
        phase: null,
      };
      const finish = jest.fn();
      const preferences = { ...DEFAULT_PRODUCT_PREFERENCES, autoFinishMode };
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => {
        renderer = renderGameScreen(source, preferences, {
          onAutoComplete: finish,
        });
      });
      expect(finish).not.toHaveBeenCalled();
      await measureGame(renderer);
      await ReactTestRenderer.act(async () =>
        renderer.update(
          gameScreenElement(source, preferences, {
            onAutoComplete: () => finish(),
          }),
        ),
      );
      expect(finish).not.toHaveBeenCalled();
      if (autoFinishMode === 'manual') {
        const action = renderer.root.findByProps({
          testID: 'auto-complete-action',
        });
        expect(action.props.disabled).toBe(false);
        await ReactTestRenderer.act(async () => action.props.onPress());
        expect(finish).toHaveBeenCalledTimes(1);
      }
      await ReactTestRenderer.act(async () => renderer.unmount());
    },
  );

  test.each(['paused', 'hint', 'busy', 'background'] as const)(
    'hides the finish action while %s and never starts on returning',
    async blocked => {
      const source = snapshot();
      source.autoFinish = {
        placements: [{ cell: 2, digit: 4, technique: 'nakedSingle', round: 0 }],
        visibleCount: null,
        phase: null,
      };
      if (blocked === 'paused') source.session!.state.status = 'paused';
      if (blocked === 'hint') source.session!.state.activeHint = kiteHint;
      if (blocked === 'busy') source.busy = true;
      let changeState: ((state: AppStateStatus) => void) | undefined;
      const originalListener = AppState.addEventListener;
      AppState.addEventListener = jest.fn((_event, listener) => {
        changeState = listener as unknown as (state: AppStateStatus) => void;
        return { remove: jest.fn() };
      });
      const finish = jest.fn();
      const preferences = {
        ...DEFAULT_PRODUCT_PREFERENCES,
        autoFinishMode: 'manual' as const,
      };
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      try {
        await ReactTestRenderer.act(async () => {
          renderer = renderGameScreen(source, preferences, {
            onAutoComplete: finish,
          });
        });
        if (blocked === 'background')
          await ReactTestRenderer.act(async () => changeState!('background'));
        await measureGame(renderer);
        expect(finish).not.toHaveBeenCalled();
        const ready = {
          ...source,
          busy: false,
          session: {
            ...source.session!,
            state: {
              ...source.session!.state,
              status: 'active' as const,
              activeHint: null,
            },
          },
        };
        await ReactTestRenderer.act(async () => {
          changeState!('active');
          renderer.update(
            gameScreenElement(ready, preferences, { onAutoComplete: finish }),
          );
        });
        expect(finish).not.toHaveBeenCalled();
        expect(
          renderer.root.findByProps({ testID: 'auto-complete-action' }).props
            .disabled,
        ).toBe(false);
      } finally {
        await ReactTestRenderer.act(async () => renderer?.unmount());
        AppState.addEventListener = originalListener;
      }
    },
  );

  test('hides finish assistance in forcing and preserves annotations when advanced tools are disabled', async () => {
    const source = snapshot();
    source.session!.state.annotations = [{ type: 'cell', cell: 2, color: 1 }];
    const before = JSON.stringify(source.session);
    const finish = jest.fn();
    const clearColors = jest.fn();
    const preferences = {
      ...DEFAULT_PRODUCT_PREFERENCES,
      forcingEnabled: true,
      boardColoring: true,
      autoFinishMode: 'manual' as const,
    };
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        renderer = renderGameScreen(source, preferences, {
          onAutoComplete: finish,
          onClearBoardColors: clearColors,
        });
      });
      await measureGame(renderer);
      await openGameMenu(renderer);
      await pressGameMenuTool(renderer, 'inference-start');
      expect(
        renderer.root.findByProps({ testID: 'inference-exit' }),
      ).toBeTruthy();
      const ready: OfflineGameSnapshot = {
        ...source,
        autoFinish: {
          placements: [
            { cell: 2, digit: 4, technique: 'nakedSingle' as const, round: 0 },
          ],
          visibleCount: null,
          phase: null,
        },
      };
      await ReactTestRenderer.act(async () =>
        renderer.update(
          gameScreenElement(ready, preferences, {
            onAutoComplete: finish,
            onClearBoardColors: clearColors,
          }),
        ),
      );
      expect(finish).not.toHaveBeenCalled();
      await ReactTestRenderer.act(async () =>
        renderer.root.findByProps({ testID: 'inference-exit' }).props.onPress(),
      );
      expect(finish).not.toHaveBeenCalled();
      expect(
        renderer.root.findByProps({ testID: 'auto-complete-action' }).props
          .disabled,
      ).toBe(false);
      await ReactTestRenderer.act(async () =>
        renderer.update(
          gameScreenElement(
            source,
            { ...preferences, forcingEnabled: false, boardColoring: false },
            { onClearBoardColors: clearColors },
          ),
        ),
      );
      expect(
        renderer.root.findAllByProps({ testID: 'game-more' }),
      ).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({ testID: 'game-additional-toolbar' }),
      ).toHaveLength(0);
      expect(clearColors).not.toHaveBeenCalled();
      expect(JSON.stringify(source.session)).toBe(before);
    } finally {
      await ReactTestRenderer.act(async () => renderer?.unmount());
    }
  });

  test('independently hides timer and mistakes while retaining left-hand difficulty and pause', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    const back = jest.fn();
    const pause = jest.fn();
    const current = snapshot();
    current.session!.state.errorCount = 2;
    const render = (showTimer: boolean, showMistakes: boolean) =>
      gameScreenElement(
        current,
        { ...DEFAULT_PRODUCT_PREFERENCES, showTimer, showMistakes },
        { onBack: back, onPause: pause },
        'zh-Hans',
      );
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(render(true, true));
    });
    try {
      const root = renderer.root;
      const header = root.findByProps({ testID: 'game-header' });
      const boardStyle = () =>
        StyleSheet.flatten(
          root.findByProps({ testID: 'sudoku-board' }).props.style,
        );
      const initialBoard = boardStyle();
      const initialHeader = StyleSheet.flatten(header.props.style);
      for (const [showTimer, showMistakes] of [
        [true, true],
        [true, false],
        [false, true],
        [false, false],
      ]) {
        await ReactTestRenderer.act(async () =>
          renderer.update(render(showTimer, showMistakes)),
        );
        expect(header.findAllByProps({ testID: 'game-timer' }).length > 0).toBe(
          showTimer,
        );
        expect(
          header.findAllByProps({ testID: 'game-mistakes' }).length > 0,
        ).toBe(showMistakes);
        expect(
          header.findAllByProps({ testID: 'game-status-divider' }),
        ).toHaveLength(0);
        expect(
          header.findByProps({ testID: 'game-home-label' }).props.children,
        ).toBe('首页');
        expect(
          header
            .findByProps({ testID: 'game-back' })
            .findByProps({ testID: 'game-difficulty' }),
        ).toBeTruthy();
        expect(StyleSheet.flatten(header.props.style)).toEqual(initialHeader);
        expect(boardStyle()).toEqual(initialBoard);
        if (showMistakes)
          expect(
            header.findByProps({ testID: 'game-mistakes' }).props.children,
          ).toBe('错误 2');
      }
      expect(root.findAllByProps({ testID: 'game-more' })).toHaveLength(0);
      await ReactTestRenderer.act(async () => {
        header.findByProps({ testID: 'game-back' }).props.onPress();
        header.findByProps({ accessibilityLabel: '暂停' }).props.onPress();
      });
      expect(back).toHaveBeenCalledTimes(1);
      expect(pause).toHaveBeenCalledTimes(1);
    } finally {
      await ReactTestRenderer.act(async () => renderer.unmount());
    }
  });
  test.each(
    (['en', 'ja', 'de', 'zh-Hans'] as const).flatMap(locale =>
      [
        { width: 360, height: 592 },
        { width: 411, height: 866 },
        { width: 600, height: 912 },
        { width: 800, height: 1232 },
      ].map(size => ({ ...size, locale })),
    ),
  )(
    'keeps five portrait tools and a full-width board at $width × $height in $locale',
    async ({ width, height, locale }) => {
      const previous = {
        window: Dimensions.get('window'),
        screen: Dimensions.get('screen'),
      };
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      let frame: jest.SpyInstance | undefined;
      const clearColors = jest.fn();
      const source = snapshot();
      source.session!.state.candidates.pencilMode = true;
      source.session!.state.annotations = [{ type: 'cell', cell: 2, color: 1 }];
      const preferences = {
        ...DEFAULT_PRODUCT_PREFERENCES,
        autoFinishMode: 'off' as const,
        boardColoring: true,
        forcingEnabled: true,
        multiSelectEnabled: true,
      };
      try {
        await ReactTestRenderer.act(async () => {
          const dimensions = { width, height, scale: 2, fontScale: 1 };
          Dimensions.set({ window: dimensions, screen: dimensions });
          renderer = ReactTestRenderer.create(
            gameScreenElement(
              source,
              preferences,
              { onClearBoardColors: clearColors },
              locale,
            ),
          );
        });
        const root = renderer.root;
        const controls = root.findByProps({ testID: 'game-number-pad' })
          .parent!;
        await ReactTestRenderer.act(async () => {
          root.findByProps({ testID: 'game-header' }).props.onLayout({
            nativeEvent: { layout: { width, height: 56, x: 0, y: 0 } },
          });
          controls.props.onLayout({
            nativeEvent: { layout: { width, height: 158, x: 0, y: 0 } },
          });
        });
        const expanded = height > 592;
        expect(root.findAllByProps({ testID: 'game-more' }).length > 0).toBe(
          !expanded,
        );
        expect(
          root.findAllByProps({ testID: 'game-additional-toolbar' }).length > 0,
        ).toBe(expanded);
        expect(
          root.findAllByProps({ testID: 'color-clear-menu' }).length > 0,
        ).toBe(expanded);
        if (expanded) {
          expect(
            root.findByProps({ testID: 'color-clear-menu' }).props.disabled,
          ).toBe(false);
        }
        if (expanded) {
          expect(
            root.findByProps({ testID: 'inference-start' }).findByType(AppIcon)
              .props.name,
          ).toBe('tactic');
          expect(
            root
              .findByProps({ testID: 'multi-select-tool' })
              .findByType(AppIcon).props.name,
          ).toBe('multiSelect');
          const extraHeight = StyleSheet.flatten(
            root.findByProps({ testID: 'game-additional-toolbar' }).props.style,
          ).height;
          // Repeated native measurements must not alternate between two and
          // three rows or count the extra row twice.
          for (let pass = 0; pass < 3; pass++) {
            await ReactTestRenderer.act(async () => {
              controls.props.onLayout({
                nativeEvent: {
                  layout: { width, height: 158 + extraHeight, x: 0, y: 0 },
                },
              });
            });
            expect(root.findAllByProps({ testID: 'game-more' })).toHaveLength(
              0,
            );
          }
        }
        const boardStyle = () =>
          StyleSheet.flatten(
            root.findByProps({ testID: 'sudoku-board' }).props.style,
          );
        const toolbar = () => root.findByProps({ testID: 'game-toolbar' });
        const originalBoard = boardStyle();
        const panelStyle = StyleSheet.flatten(controls.props.style);
        expect(panelStyle.alignSelf).toBe('stretch');
        expect(panelStyle.marginHorizontal).toBe(6);
        expect(panelStyle.marginTop).toBeGreaterThanOrEqual(6);
        expect(panelStyle.marginTop).toBeLessThanOrEqual(24);
        expect(panelStyle.borderWidth ?? 0).toBe(0);
        expect(panelStyle.backgroundColor).toBeUndefined();
        expect(
          StyleSheet.flatten(toolbar().props.style).borderTopWidth ?? 0,
        ).toBe(0);
        const pauseStyle = StyleSheet.flatten(
          root.findByProps({ testID: 'game-pause' }).props.style,
        );
        expect(pauseStyle.paddingLeft).toBe(12);
        expect(pauseStyle.alignItems).toBe('flex-start');
        expect(
          StyleSheet.flatten(toolbar().props.style).maxWidth,
        ).toBeUndefined();
        expect(originalBoard.width).toBe(width - 12);
        expect(originalBoard.height).toBe(width - 12);
        expect(root.findAllByProps({ testID: 'game-meta' })).toHaveLength(0);
        expect(
          root.findAllByProps({ testID: 'phone-quick-action-row' }),
        ).toHaveLength(0);
        expect(
          toolbar().findAll(node => node.props.accessibilityRole === 'button', {
            deep: false,
          }),
        ).toHaveLength(5);
        expect(
          root.findAllByProps({ testID: 'auto-complete-action' }),
        ).toHaveLength(0);
        const numericHeight = StyleSheet.flatten(
          root.findByProps({ testID: 'game-number-pad' }).props.style,
        ).height;
        await pressGameMenuTool(renderer, 'multi-select-tool');
        expect(boardStyle()).toEqual(originalBoard);
        await pressGameMenuTool(renderer, 'color-tool');
        expect(root.findAllByProps({ testID: 'game-more-panel' })).toHaveLength(
          0,
        );
        expect(root.findAllByProps({ testID: 'game-number-pad' })).toHaveLength(
          0,
        );
        expect(root.findAllByProps({ testID: 'number-key-9' })).toHaveLength(0);
        expect(
          root.findAllByProps({ testID: 'color-clear-all' }).length > 0,
        ).toBe(!expanded);
        expect(root.findAllByProps({ testID: 'color-exit' }).length > 0).toBe(
          !expanded,
        );
        if (expanded) {
          expect(
            root
              .findByProps({ testID: 'game-additional-toolbar' })
              .findAll(node => node.props.accessibilityRole === 'button', {
                deep: false,
              })
              .map(node => node.props.testID),
          ).toEqual([
            'color-tool',
            'color-clear-menu',
            'inference-start',
            'multi-select-tool',
          ]);
        }
        expect(toolbar().findByProps({ icon: 'erase' }).props.disabled).toBe(
          true,
        );
        expect(
          root
            .findByProps({ testID: 'color-palette' })
            .findAll(node => node.props.accessibilityRole === 'button', {
              deep: false,
            }),
        ).toHaveLength(expanded ? 6 : 8);
        await ReactTestRenderer.act(async () => {
          root
            .findByProps({
              testID: expanded ? 'color-clear-menu' : 'color-clear-all',
            })
            .props.onPress();
        });
        expect(clearColors).toHaveBeenCalledTimes(1);
        expect(
          root
            .findByProps({
              testID: expanded ? 'color-clear-menu' : 'color-clear-all',
            })
            .findByType(AppIcon).props.name,
        ).toBe('clearColors');
        expect(root.findByProps({ testID: 'color-palette' })).toBeTruthy();
        expect(
          StyleSheet.flatten(
            root.findByProps({ testID: 'color-palette' }).props.style,
          ).height,
        ).toBe(numericHeight);
        expect(boardStyle()).toEqual(originalBoard);
        expect(
          toolbar().findAll(node => node.props.accessibilityRole === 'button', {
            deep: false,
          }),
        ).toHaveLength(5);
        if (expanded) {
          await ReactTestRenderer.act(async () => {
            root.findByProps({ testID: 'color-tool' }).props.onPress();
          });
        } else {
          let closeFrame!: (timestamp: number) => void;
          frame = jest
            .spyOn(global, 'requestAnimationFrame')
            .mockImplementation(callback => {
              closeFrame = callback;
              return 17;
            });
          await ReactTestRenderer.act(async () => {
            root.findByProps({ testID: 'color-exit' }).props.onPress();
          });
          expect(root.findAllByProps({ testID: 'number-key-9' })).toHaveLength(
            0,
          );
          await ReactTestRenderer.act(async () => closeFrame(0));
        }
        expect(root.findAllByProps({ testID: 'color-palette' })).toHaveLength(
          0,
        );
        expect(boardStyle()).toEqual(originalBoard);
        expect(root.findAllByType(ScrollView)).toHaveLength(0);
        expect(toolbar().findByProps({ icon: 'erase' }).props.disabled).toBe(
          false,
        );
        if (expanded) {
          expect(
            root.findAllByProps({ testID: 'color-clear-menu' }).length,
          ).toBeGreaterThan(0);
          await pressGameMenuTool(renderer, 'inference-start');
          expect(
            root.findAllByProps({ testID: 'game-additional-toolbar' }),
          ).toHaveLength(0);
          expect(root.findByProps({ testID: 'inference-exit' })).toBeTruthy();
        }
      } finally {
        await ReactTestRenderer.act(async () => {
          renderer?.unmount();
          Dimensions.set(previous);
        });
        frame?.mockRestore();
      }
    },
  );

  test.each([
    { width: 320, height: 520, controlsHeight: 190 },
    { width: 360, height: 592, controlsHeight: 190 },
    { width: 390, height: 700, controlsHeight: 180 },
    { width: 744, height: 1050, controlsHeight: 200 },
    { width: 1024, height: 1260, controlsHeight: 200 },
  ])(
    'maximizes the portrait board while keeping the controls visible at $width × $height',
    async size => {
      const previous = {
        window: Dimensions.get('window'),
        screen: Dimensions.get('screen'),
      };
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      try {
        await ReactTestRenderer.act(async () => {
          const dimensions = {
            width: size.width,
            height: size.height,
            scale: 2,
            fontScale: 1,
          };
          Dimensions.set({ window: dimensions, screen: dimensions });
          renderer = renderGameScreen(snapshot());
        });
        const root = renderer.root;
        const headerHeight = 56;
        const controls = root.findByProps({ testID: 'game-number-pad' })
          .parent!;
        await ReactTestRenderer.act(async () => {
          controls.props.onLayout({
            nativeEvent: {
              layout: {
                width: size.width,
                height: size.controlsHeight,
                x: 0,
                y: 0,
              },
            },
          });
          root.findByProps({ testID: 'game-header' }).props.onLayout({
            nativeEvent: {
              layout: { width: size.width, height: headerHeight, x: 0, y: 0 },
            },
          });
        });
        const board = StyleSheet.flatten(
          root.findByProps({ testID: 'sudoku-board' }).props.style,
        );
        const gap = StyleSheet.flatten(controls.props.style).marginTop;
        expect(board.width).toBe(
          Math.min(
            size.width - 12,
            size.height - headerHeight - size.controlsHeight - gap - 6 - 31,
          ),
        );
        expect(
          headerHeight + board.height + size.controlsHeight + gap + 6 + 31,
        ).toBeLessThanOrEqual(size.height);
        expect(
          StyleSheet.flatten(
            root.findByProps({ testID: 'sudoku-board-container' }).props.style,
          ).paddingHorizontal,
        ).toBe(6);
        expect(root.findAllByType(ScrollView)).toHaveLength(0);
        expect(root.findByProps({ testID: 'game-toolbar' })).toBeTruthy();
        expect(
          StyleSheet.flatten(
            root.findByProps({ testID: 'game-number-pad' }).props.style,
          ).alignItems,
        ).toBe('flex-start');
        const digit = root.findByProps({ testID: 'number-key-1' });
        expect(
          StyleSheet.flatten(digit.props.style({ pressed: false })),
        ).toMatchObject({ paddingTop: 2, paddingBottom: 10 });
      } finally {
        await ReactTestRenderer.act(async () => {
          renderer?.unmount();
          Dimensions.set(previous);
        });
      }
    },
  );
  test.each([
    { platform: 'ios', width: 759, height: 369 },
    { platform: 'ios', width: 667, height: 354 },
    { platform: 'android', width: 568, height: 260 },
    { platform: 'android', width: 600, height: 520 },
    { platform: 'android', width: 800, height: 360 },
    { platform: 'android', width: 960, height: 544 },
    { platform: 'android', width: 1280, height: 752 },
  ] as const)(
    'maximizes equal landscape frames on $platform at $width × $height without a scrolling keypad',
    async ({ platform: platformName, ...size }) => {
      const platform = jest.replaceProperty(Platform, 'OS', platformName);
      const ipad = jest
        .spyOn(Platform as { isPad: boolean }, 'isPad', 'get')
        .mockReturnValue(false);
      const previous = {
        window: Dimensions.get('window'),
        screen: Dimensions.get('screen'),
      };
      const back = jest.fn();
      const digit = jest.fn();
      const source = snapshot();
      source.session!.state.selectedCell = 2;
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      try {
        await ReactTestRenderer.act(async () => {
          const dimensions = { ...size, scale: 2, fontScale: 1 };
          Dimensions.set({ window: dimensions, screen: dimensions });
          renderer = renderGameScreen(
            source,
            { ...DEFAULT_PRODUCT_PREFERENCES, autoFinishMode: 'off' },
            {
              onBack: back,
              onDigit: digit,
            },
          );
        });
        const root = renderer.root;
        const expectedSize = gameSideRailBoardSize(size.width, size.height);
        const outerSize = expectedSize + 6;
        const board = StyleSheet.flatten(
          root.findByProps({ testID: 'sudoku-board' }).props.style,
        );
        const frame = root.findByProps({ testID: 'game-controls-fit' });
        expect(board.width).toBeCloseTo(expectedSize);
        expect(board.height).toBeCloseTo(expectedSize);
        expect(StyleSheet.flatten(frame.props.style)).toMatchObject({
          width: outerSize,
          height: outerSize,
        });
        expect(root.findAllByProps({ testID: 'game-header' })).toHaveLength(0);
        expect(root.findAllByProps({ testID: 'game-meta' })).toHaveLength(0);
        expect(
          root
            .findByProps({ testID: 'game-landscape-rail' })
            .findByProps({ testID: 'game-back' }),
        ).toBeTruthy();
        expect(
          root
            .findByProps({ testID: 'tablet-game-controls' })
            .findByProps({ testID: 'game-difficulty' }),
        ).toBeTruthy();
        expect(
          StyleSheet.flatten(
            root.findByProps({ testID: 'game-board-pane' }).props.style,
          ).borderWidth,
        ).toBeUndefined();
        expect(root.findAllByType(ScrollView)).toHaveLength(0);
        expect(
          StyleSheet.flatten(
            root
              .find(
                node =>
                  node.props.testID === 'hint-tool' &&
                  typeof node.props.style === 'function',
              )
              .props.style({ pressed: false }),
          ),
        ).toMatchObject({ flexBasis: 0, flexGrow: 1, flexShrink: 1 });
        await ReactTestRenderer.act(async () => {
          root.findByProps({ testID: 'game-screen-root' }).props.onLayout({
            nativeEvent: { layout: { ...size, x: 0, y: 0 } },
          });
          root.findByProps({ testID: 'tablet-game-controls' }).props.onLayout({
            nativeEvent: {
              layout: { width: outerSize, height: 330, x: 0, y: 0 },
            },
          });
        });
        expect(
          root.findByProps({ testID: 'game-screen-root' }).props.pointerEvents,
        ).toBe('auto');
        expect(
          StyleSheet.flatten(
            root.findByProps({ testID: 'sudoku-board' }).props.style,
          ).width,
        ).toBeCloseTo(expectedSize);
        await ReactTestRenderer.act(async () =>
          root.findByProps({ testID: 'number-key-4' }).props.onPress(),
        );
        expect(digit).toHaveBeenCalledTimes(1);
        expect(digit).toHaveBeenCalledWith(4);
        await ReactTestRenderer.act(async () =>
          root.findByProps({ testID: 'game-back' }).props.onPress(),
        );
        expect(back).toHaveBeenCalledTimes(1);
      } finally {
        await ReactTestRenderer.act(async () => renderer?.unmount());
        Dimensions.set(previous);
        ipad.mockRestore();
        platform.restore();
      }
    },
  );

  test('keeps the side-rail board fixed while hint text scrolls inside the right frame', async () => {
    const platform = jest.replaceProperty(Platform, 'OS', 'android');
    const previous = {
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen'),
    };
    const source = snapshot();
    source.session!.state.activeHint = {
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
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        const dimensions = { width: 800, height: 360, scale: 2, fontScale: 1 };
        Dimensions.set({ window: dimensions, screen: dimensions });
        renderer = renderGameScreen(source);
      });
      const root = renderer.root;
      const board = StyleSheet.flatten(
        root.findByProps({ testID: 'sudoku-board' }).props.style,
      );
      const panel = root.findByProps({ testID: 'tablet-hint-panel' });
      expect(StyleSheet.flatten(panel.props.style).height).toBe(
        board.height + 6,
      );
      expect(
        StyleSheet.flatten(
          root.findByProps({ testID: 'game-controls-fit' }).props.style,
        ),
      ).toMatchObject({ width: board.width + 6, height: board.height + 6 });
      expect(root.findAllByType(ScrollView)).toHaveLength(1);
      expect(panel.findByProps({ testID: 'tablet-hint-scroll' })).toBeTruthy();
      expect(
        StyleSheet.flatten(
          root.findByProps({ testID: 'game-number-pad' }).props.style,
        ).display,
      ).toBe('none');
      expect(root.findByProps({ testID: 'game-landscape-rail' })).toBeTruthy();
    } finally {
      await ReactTestRenderer.act(async () => renderer?.unmount());
      Dimensions.set(previous);
      platform.restore();
    }
  });

  test.each([
    { width: 960, height: 544 },
    { width: 1280, height: 800 },
    { width: 1600, height: 900 },
  ])('preserves iPad landscape spacing at $width × $height', async size => {
    const ipad = jest
      .spyOn(Platform as { isPad: boolean }, 'isPad', 'get')
      .mockReturnValue(true);
    const previous = {
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen'),
    };
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        const dimensions = { ...size, scale: 2, fontScale: 1 };
        Dimensions.set({ window: dimensions, screen: dimensions });
        renderer = renderGameScreen(snapshot());
      });
      const root = renderer.root;
      const area = StyleSheet.flatten(
        root.findByProps({ testID: 'game-landscape-layout' }).props.style,
      );
      const boardPane = StyleSheet.flatten(
        root.findByProps({ testID: 'game-board-pane' }).props.style,
      );
      const controls = StyleSheet.flatten(
        root.findByProps({ testID: 'tablet-game-controls' }).props.style,
      );
      expect(area.paddingLeft + 6).toBeCloseTo(area.paddingRight);
      expect(area.columnGap + 6).toBeCloseTo(area.paddingRight);
      expect(area.paddingRight).toBeGreaterThanOrEqual(6);
      expect(
        area.paddingLeft +
          boardPane.width +
          area.columnGap +
          controls.width +
          area.paddingRight,
      ).toBeCloseTo(size.width);
    } finally {
      await ReactTestRenderer.act(async () => {
        renderer?.unmount();
        Dimensions.set(previous);
        ipad.mockRestore();
      });
    }
  });

  test('preserves the iPad comparison layout in a fixed short window', async () => {
    const ipad = jest
      .spyOn(Platform as { isPad: boolean }, 'isPad', 'get')
      .mockReturnValue(true);
    const previous = {
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen'),
    };
    const size = { width: 960, height: 394, scale: 2, fontScale: 1 };
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        Dimensions.set({ window: size, screen: size });
        renderer = renderGameScreen(snapshot(), DEFAULT_PRODUCT_PREFERENCES);
      });
      const root = renderer.root;
      const area = StyleSheet.flatten(
        root.findByProps({ testID: 'game-landscape-layout' }).props.style,
      );
      expect(area).toMatchObject({ flex: 1, flexShrink: 1, minHeight: 0 });
      expect(
        StyleSheet.flatten(
          root.findByProps({ testID: 'game-content-view' }).props.style,
        ),
      ).toMatchObject({ flexShrink: 1, minHeight: 0 });
      const controls = root.findByProps({ testID: 'tablet-game-controls' });
      await ReactTestRenderer.act(async () =>
        controls.props.onLayout({
          nativeEvent: { layout: { width: 326, height: 440, x: 0, y: 0 } },
        }),
      );
      const fit = root.findByProps({ testID: 'game-controls-fit' });
      expect(StyleSheet.flatten(fit.props.style).height).toBe(301);
      const scaledControls = fit.find(
        node =>
          StyleSheet.flatten(node.props.style)?.transformOrigin ===
          'top center',
      );
      expect(StyleSheet.flatten(scaledControls.props.style)).toMatchObject({
        transform: [{ scale: 301 / 440 }],
        transformOrigin: 'top center',
      });
      expect(root.findAllByType(ScrollView)).toHaveLength(0);
      await ReactTestRenderer.act(async () =>
        root.findByProps({ testID: 'tablet-game-controls' }).props.onLayout({
          nativeEvent: { layout: { width: 326, height: 280, x: 0, y: 0 } },
        }),
      );
      expect(StyleSheet.flatten(fit.props.style).height).toBe(280);
      expect(
        StyleSheet.flatten(
          root.findByProps({ testID: 'game-controls-scaled' }).props.style,
        ).transform,
      ).toEqual([{ scale: 1 }]);
    } finally {
      await ReactTestRenderer.act(async () => {
        renderer?.unmount();
        Dimensions.set(previous);
        ipad.mockRestore();
      });
    }
  });

  test('shows only the measured, fitted entry layout when the parent changes the text scale', async () => {
    const ipad = jest
      .spyOn(Platform as { isPad: boolean }, 'isPad', 'get')
      .mockReturnValue(true);
    const previous = {
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen'),
    };
    const size = { width: 960, height: 600, scale: 2, fontScale: 1 };
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        Dimensions.set({ window: size, screen: size });
        renderer = renderGameScreen(snapshot());
      });
      const root = renderer.root;
      const screen = () => root.findByProps({ testID: 'game-screen-root' });
      const isHidden = () =>
        StyleSheet.flatten(screen().props.style).opacity === 0;
      const measure = (testID: string, width: number, height: number) =>
        root.findByProps({ testID }).props.onLayout({
          nativeEvent: { layout: { width, height, x: 0, y: 0 } },
        });
      expect(isHidden()).toBe(true);
      expect(screen().props.pointerEvents).toBe('none');
      await ReactTestRenderer.act(async () => {
        measure('game-header', 960, 70);
        measure('tablet-game-controls', 326, 550);
        measure('game-screen-root', 960, 544);
      });
      // The first measurements used the larger fallback font size. Wait for
      // actual control sizes at the parent allocation before revealing them.
      expect(isHidden()).toBe(true);
      await ReactTestRenderer.act(async () => measure('game-header', 960, 56));
      expect(isHidden()).toBe(true);
      await ReactTestRenderer.act(async () =>
        measure('tablet-game-controls', 326, 500),
      );
      expect(isHidden()).toBe(false);
      expect(screen().props.pointerEvents).toBe('auto');
      expect(
        StyleSheet.flatten(
          root.findByProps({ testID: 'game-controls-scaled' }).props.style,
        ).transform,
      ).toEqual([{ scale: 451 / 500 }]);
      expect(root.findAllByType(ScrollView)).toHaveLength(0);
    } finally {
      await ReactTestRenderer.act(async () => {
        renderer?.unmount();
        Dimensions.set(previous);
        ipad.mockRestore();
      });
    }
  });

  test.each([
    { width: 960, height: 544 },
    { width: 320, height: 520 },
  ])(
    'keeps game sizes while saving or pausing at $width × $height',
    async size => {
      const previous = {
        window: Dimensions.get('window'),
        screen: Dimensions.get('screen'),
      };
      const source = snapshot();
      source.autoFinish = { placements: [], visibleCount: null, phase: null };
      const render = () =>
        gameScreenElement(source, DEFAULT_PRODUCT_PREFERENCES, {
          onAutoComplete: noOp,
        });
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      try {
        await ReactTestRenderer.act(async () => {
          const dimensions = { ...size, scale: 2, fontScale: 1 };
          Dimensions.set({ window: dimensions, screen: dimensions });
          renderer = ReactTestRenderer.create(render());
        });
        const geometry = () =>
          [
            'sudoku-board',
            'game-content-view',
            'game-number-pad',
            'game-toolbar',
          ].map(testID =>
            StyleSheet.flatten(
              renderer.root.findByProps({ testID }).props.style,
            ),
          );
        const initial = geometry();
        source.busy = true;
        await ReactTestRenderer.act(async () => renderer.update(render()));
        expect(geometry()).toEqual(initial);
        source.session!.state.status = 'paused';
        await ReactTestRenderer.act(async () => renderer.update(render()));
        expect(geometry()).toEqual(initial);
      } finally {
        await ReactTestRenderer.act(async () => {
          renderer?.unmount();
          Dimensions.set(previous);
        });
      }
    },
  );

  test('reserves room for the keyboard and toolbar by fitting the portrait board', async () => {
    const previous = {
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen'),
    };
    const size = { width: 320, height: 520, scale: 2, fontScale: 1 };
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        Dimensions.set({ window: size, screen: size });
        renderer = renderGameScreen(snapshot());
      });
      const root = renderer.root;
      const controls = root.findByProps({ testID: 'game-number-pad' }).parent!;
      await ReactTestRenderer.act(async () =>
        controls.props.onLayout({
          nativeEvent: { layout: { width: 320, height: 196, x: 0, y: 0 } },
        }),
      );
      const board = StyleSheet.flatten(
        root.findByProps({ testID: 'sudoku-board' }).props.style,
      );
      expect(board.width).toBe(231);
      expect(board.height).toBe(231);
      expect(56 + board.height + 196 + 6 + 31).toBe(520);
      expect(root.findAllByType(ScrollView)).toHaveLength(0);
      expect(root.findByProps({ testID: 'game-toolbar' })).toBeTruthy();
      expect(root.findByProps({ testID: 'number-key-9' })).toBeTruthy();
    } finally {
      await ReactTestRenderer.act(async () => {
        renderer?.unmount();
        Dimensions.set(previous);
      });
    }
  });

  test.each([
    { platform: 'android', width: 1280, height: 800 },
    { platform: 'android', width: 800, height: 360 },
    { platform: 'ios', width: 759, height: 369 },
  ] as const)(
    'rotates $platform at $width × $height without resetting play',
    async size => {
      const platform = jest.replaceProperty(Platform, 'OS', size.platform);
      const ipad = jest
        .spyOn(Platform as { isPad: boolean }, 'isPad', 'get')
        .mockReturnValue(false);
      const previousDimensions = {
        window: Dimensions.get('window'),
        screen: Dimensions.get('screen'),
      };
      const source = snapshot();
      source.session!.state.selectedCell = 2;
      source.session!.state.candidates.manualCandidates =
        source.session!.state.candidates.manualCandidates.map((mask, cell) =>
          cell === 2 ? addCandidate(mask, 4) : mask,
        );
      const rotate = (width: number, height: number) => {
        const dimensions = { width, height, scale: 1, fontScale: 1 };
        Dimensions.set({ window: dimensions, screen: dimensions });
      };
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      try {
        await ReactTestRenderer.act(async () => {
          rotate(size.width, size.height);
          renderer = renderGameScreen(source, {
            ...DEFAULT_PRODUCT_PREFERENCES,
            inputMode: 'digit_first',
          });
        });
        const root = renderer!.root;
        const game = root.findByType(GameScreen);
        await ReactTestRenderer.act(async () => {
          root.findByProps({ testID: 'number-key-4' }).props.onPress();
        });

        for (const [width, height] of [
          [size.height, size.width],
          [size.width, size.height],
          [size.height, size.width],
        ]) {
          await ReactTestRenderer.act(async () => rotate(width, height));
          const landscape = width > height;
          const layout = root.findByProps({
            testID: landscape
              ? 'game-landscape-layout'
              : 'game-portrait-layout',
          });
          expect(
            StyleSheet.flatten(layout.props.style).flexDirection ?? 'column',
          ).toBe(landscape ? 'row' : 'column');
          expect(
            StyleSheet.flatten(
              layout.findByProps({ testID: 'game-board-container' }).props
                .style,
            ).alignSelf,
          ).toBe('stretch');
          expect(
            layout.findByProps({ testID: 'game-number-pad' }),
          ).toBeTruthy();
          expect(root.findByType(GameScreen)).toBe(game);
          expect(
            root.findAllByProps({ testID: 'game-landscape-rail' }).length > 0,
          ).toBe(landscape);
          expect(
            layout.findAllByProps({ state: source.session!.state }).length,
          ).toBeGreaterThan(0);
          expect(
            root.findByProps({ testID: 'number-key-4' }).props
              .accessibilityState.selected,
          ).toBe(true);
        }
      } finally {
        await ReactTestRenderer.act(async () => {
          renderer?.unmount();
          Dimensions.set(previousDimensions);
        });
        ipad.mockRestore();
        platform.restore();
      }
    },
  );

  test('switches at the height boundary without shrinking the board or reopening a stale menu', async () => {
    const previous = {
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen'),
    };
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        const dimensions = { width: 360, height: 649, scale: 2, fontScale: 1 };
        Dimensions.set({ window: dimensions, screen: dimensions });
        renderer = renderGameScreen(snapshot(), {
          ...DEFAULT_PRODUCT_PREFERENCES,
          autoFinishMode: 'off',
          boardColoring: true,
          multiSelectEnabled: true,
        });
      });
      const root = renderer.root;
      const controls = root.findByProps({ testID: 'game-number-pad' }).parent!;
      await ReactTestRenderer.act(async () => {
        root.findByProps({ testID: 'game-header' }).props.onLayout({
          nativeEvent: { layout: { width: 360, height: 56 } },
        });
        controls.props.onLayout({
          nativeEvent: { layout: { width: 360, height: 158 } },
        });
      });
      const boardSize = () =>
        StyleSheet.flatten(
          root.findByProps({ testID: 'sudoku-board' }).props.style,
        ).width;
      expect(boardSize()).toBe(348);
      await openGameMenu(renderer);
      expect(root.findByProps({ testID: 'game-more-panel' })).toBeTruthy();
      const resize = async (height: number) => {
        await ReactTestRenderer.act(async () => {
          root.findByProps({ testID: 'game-screen-root' }).props.onLayout({
            nativeEvent: { layout: { width: 360, height, x: 0, y: 0 } },
          });
        });
      };
      await resize(650);
      expect(root.findAllByProps({ testID: 'game-more' })).toHaveLength(0);
      expect(root.findAllByProps({ testID: 'game-more-panel' })).toHaveLength(
        0,
      );
      expect(
        root.findByProps({ testID: 'game-additional-toolbar' }),
      ).toBeTruthy();
      expect(boardSize()).toBe(348);
      await ReactTestRenderer.act(async () => {
        controls.props.onLayout({
          nativeEvent: { layout: { width: 360, height: 234 } },
        });
      });
      await resize(649);
      expect(
        root.findAllByProps({ testID: 'game-additional-toolbar' }),
      ).toHaveLength(0);
      expect(root.findByProps({ testID: 'game-more' })).toBeTruthy();
      expect(root.findAllByProps({ testID: 'game-more-panel' })).toHaveLength(
        0,
      );
      expect(boardSize()).toBe(348);
      await ReactTestRenderer.act(async () => {
        controls.props.onLayout({
          nativeEvent: { layout: { width: 360, height: 158 } },
        });
      });
      expect(boardSize()).toBe(348);
    } finally {
      await ReactTestRenderer.act(async () => renderer?.unmount());
      Dimensions.set(previous);
    }
  });

  test('keeps the more menu limited to actions', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = renderGameScreen(snapshot(), {
        ...DEFAULT_PRODUCT_PREFERENCES,
        forcingEnabled: true,
      });
    });
    await openGameMenu(renderer);
    const menu = renderer.root.findByProps({ testID: 'game-more-panel' });
    expect(
      menu.findAllByProps({ testID: 'game-completion-streak' }),
    ).toHaveLength(0);
    expect(
      menu.findAllByProps({ testID: 'game-info-difficulty' }),
    ).toHaveLength(0);
    expect(menu.findAllByProps({ children: '连胜 25' })).toHaveLength(0);
    expect(menu.findByProps({ testID: 'inference-start' })).toBeTruthy();
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('aligns Android phone metadata with the board edges only', () => {
    expect(gameBoardMetaEdgeInset('android', false)).toBe(12);
    expect(gameBoardMetaEdgeInset('android', true)).toBe(0);
    expect(gameBoardMetaEdgeInset('ios', false)).toBe(0);
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
      action: 'unavailable',
      disabled: true,
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
      batchCandidateEdit: { action: 'remove' as const, count: 2 },
    });
    expect(batch).toEqual({
      action: 'remove_candidate',
      disabled: false,
      feedback: { kind: 'candidate_remove', count: 2 },
    });
    expect(numberKeyFeedbackText(batch.feedback)).toBe('−2');
    expect(
      resolveNumberKeyState({ ...base, batchCandidateEdit: null }),
    ).toEqual({
      action: 'unavailable',
      disabled: true,
      feedback: null,
    });
    const batchAdd = resolveNumberKeyState({
      ...base,
      batchCandidateEdit: { action: 'add', count: 2 },
    });
    expect(batchAdd).toEqual({
      action: 'add_candidate',
      disabled: false,
      feedback: { kind: 'candidate_add', count: 2 },
    });
    expect(numberKeyFeedbackText(batchAdd.feedback)).toBe('+2');
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
            onEditCandidates={noOp}
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

  test('keeps the selected digit focused after applying a hint in digit-first mode', async () => {
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
              inputMode: 'digit_first',
              hintAnimations: false,
            }}
            onAbandon={noOp}
            onApplyHint={apply}
            onBack={noOp}
            onDigit={noOp}
            onOneTapFill={noOp}
            onEditCandidates={noOp}
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
      renderer.root.findByProps({ testID: 'number-key-8' }).props.onPress(),
    );
    expect(
      renderer.root.findByProps({ testID: 'number-key-8' }).props
        .accessibilityState.selected,
    ).toBe(true);
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
    expect(board.props.highlightDigit).toBe(8);
    expect(
      renderer.root.findByProps({ testID: 'number-key-8' }).props
        .accessibilityState.selected,
    ).toBe(true);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('shows remaining counts while disabling digits for a filled cell', async () => {
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
            onEditCandidates={noOp}
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
    expect(key().props.disabled).toBe(true);
    expect(key().props.accessibilityLabel).toBe(
      'Digit 5, 6 remaining, unavailable',
    );
    expect(key().props.accessibilityState.selected).toBe(false);
    expect(remaining().props.children).toBe('6');
    const disabledCircle = renderer.root.findByProps({
      testID: 'number-key-circle-5',
    });
    expect(StyleSheet.flatten(disabledCircle.props.style)).toMatchObject({
      backgroundColor: lightPalette.background,
      borderColor: lightPalette.line,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      height: 80,
      width: 80,
    });
    expect(
      StyleSheet.flatten(disabledCircle.findAllByType(Text)[0].props.style),
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

  test('does not navigate or input from a filled cell in either Note state', async () => {
    const current = snapshot();
    current.session!.state.selectedCell = 0;
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
            onEditCandidates={noOp}
            onReplayFocusChange={onReplayFocusChange}
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
    for (const pencilMode of [false, true]) {
      current.session!.state.candidates.pencilMode = pencilMode;
      await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
      expect(
        renderer.root.findByProps({ testID: 'number-key-7' }).props
          .accessibilityState.disabled,
      ).toBe(true);
      await ReactTestRenderer.act(async () =>
        renderer.root.findByProps({ testID: 'number-key-7' }).props.onPress(),
      );
      expect(onSelectCell).not.toHaveBeenCalled();
      expect(onDigit).not.toHaveBeenCalled();
      expect(onReplayFocusChange).not.toHaveBeenCalled();
    }
    current.session!.state.selectedCell = 2;
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
    expect(
      renderer.root.findByProps({ testID: 'number-key-7' }).props
        .accessibilityState.disabled,
    ).toBe(false);
    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'number-key-7' }).props.onPress(),
    );
    expect(onDigit).toHaveBeenCalledWith(7);
    await ReactTestRenderer.act(async () => renderer.unmount());
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
            onEditCandidates={noOp}
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
            onEditCandidates={noOp}
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
              onEditCandidates={noOp}
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
                onEditCandidates={noOp}
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
                onEditCandidates={noOp}
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
              onEditCandidates={noOp}
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
                onEditCandidates={noOp}
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
  test.each([false, true])(
    'coloring never enters the selected digit in digit-first mode (Notes %s)',
    async pencilMode => {
      const current = snapshot();
      current.session!.state.selectedCell = 3;
      current.session!.state.candidates.pencilMode = pencilMode;
      const digit = jest.fn();
      const color = jest.fn();
      const select = jest.fn();
      const replayFocus = jest.fn();
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(async () => {
        renderer = renderGameScreen(
          current,
          {
            ...DEFAULT_PRODUCT_PREFERENCES,
            inputMode: 'digit_first',
            boardColoring: true,
          },
          {
            onDigit: digit,
            onColorCells: color,
            onSelectCell: select,
            onReplayFocusChange: replayFocus,
          },
        );
      });
      await ReactTestRenderer.act(async () =>
        renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress(),
      );
      replayFocus.mockClear();
      await pressGameMenuTool(renderer, 'color-tool');
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'sudoku-cell-index-2' })
          .props.onPress(),
      );
      expect(select).not.toHaveBeenCalled();
      expect(replayFocus).not.toHaveBeenCalled();
      expect(current.session!.state.selectedCell).toBe(3);
      expect(color).toHaveBeenCalledWith([2], 0, true);
      expect(digit).not.toHaveBeenCalled();
      await pressGameMenuTool(renderer, 'color-tool');
      expect(
        renderer.root.findByProps({ testID: 'number-key-4' }).props
          .accessibilityState.selected,
      ).toBe(true);
      await ReactTestRenderer.act(async () =>
        renderer.root
          .findByProps({ testID: 'sudoku-cell-index-2' })
          .props.onPress(),
      );
      expect(digit).toHaveBeenCalledWith(4);
      await ReactTestRenderer.act(async () => renderer.unmount());
    },
  );
  test('shows Clear Colors in More whenever board coloring is enabled and enables it only for painted cells', async () => {
    const current = snapshot();
    const clearColors = jest.fn();
    const render = (boardColoring: boolean) =>
      gameScreenElement(
        current,
        { ...DEFAULT_PRODUCT_PREFERENCES, boardColoring },
        { onClearBoardColors: clearColors },
      );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(render(true));
      });
      await openGameMenu(renderer);
      const root = renderer.root;
      expect(root.findAllByProps({ testID: 'color-palette' })).toHaveLength(0);
      expect(
        root.findByProps({ testID: 'color-clear-menu' }).props.disabled,
      ).toBe(true);

      current.session!.state.annotations = [
        { type: 'cell', cell: 2, color: 1 },
      ];
      await ReactTestRenderer.act(async () => renderer.update(render(true)));
      expect(
        root.findByProps({ testID: 'color-clear-menu' }).props.disabled,
      ).toBe(false);
      await ReactTestRenderer.act(async () =>
        root.findByProps({ testID: 'color-clear-menu' }).props.onPress(),
      );
      expect(clearColors).toHaveBeenCalledTimes(1);
      expect(root.findAllByProps({ testID: 'color-palette' })).toHaveLength(0);

      await ReactTestRenderer.act(async () => renderer.update(render(false)));
      expect(root.findAllByProps({ testID: 'color-clear-menu' })).toHaveLength(
        0,
      );
    } finally {
      await ReactTestRenderer.act(async () => renderer?.unmount());
    }
  });

  test('coloring is off by default and opens six swatches with annotation-only backgrounds when enabled', async () => {
    const current = snapshot();
    current.session!.state.annotations = [{ type: 'cell', cell: 2, color: 1 }];
    const clear = jest.fn();
    const color = jest.fn();
    const erase = jest.fn();
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
            onEditCandidates={noOp}
            onDismissHint={noOp}
            onErase={erase}
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
    await openGameMenu(renderer);
    expect(
      renderer.root.findAllByProps({
        testID: 'app-icon-color-material-symbol',
      }),
    ).not.toHaveLength(0);
    await pressGameMenuTool(renderer, 'color-tool');
    expect(renderer.root.findByProps({ testID: 'color-palette' })).toBeTruthy();
    const eraseTool = renderer.root.findByProps({ icon: 'erase' });
    expect(eraseTool.props.disabled).toBe(true);
    await ReactTestRenderer.act(async () => eraseTool.props.onPress());
    expect(erase).not.toHaveBeenCalled();
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
    expect(
      renderer.root.findAllByProps({ testID: 'color-clear-menu' }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID: 'color-clear-all' }).props.onPress();
    });
    expect(clear).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findByProps({ testID: 'color-clear-all' }).props
        .accessibilityLabel,
    ).toBe('Clear Colors');
    current.session!.state.annotations = [];
    await ReactTestRenderer.act(async () => renderer.update(render(true)));
    expect(
      renderer.root.findByProps({ testID: 'color-clear-all' }).props.disabled,
    ).toBe(true);
    current.session!.state.activeHint = kiteHint;
    await ReactTestRenderer.act(async () => renderer.update(render(true)));
    expect(
      renderer.root.findAllByProps({ testID: 'color-palette' }),
    ).toHaveLength(0);
    expect(board().props.coloringFocused).toBe(false);
    await ReactTestRenderer.act(async () => renderer.unmount());
  });
  test('clears colors in the palette and restores digits only after the close touch has finished', async () => {
    const current = snapshot();
    current.session!.state.annotations = [{ type: 'cell', cell: 2, color: 1 }];
    current.session!.state.selectedCell = 2;
    const values = [...current.session!.state.values];
    const digit = jest.fn();
    const clear = jest.fn();
    const stopPropagation = jest.fn();
    let closeFrame!: (timestamp: number) => void;
    const frame = jest
      .spyOn(global, 'requestAnimationFrame')
      .mockImplementation(callback => {
        closeFrame = callback;
        return 17;
      });
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        renderer = renderGameScreen(
          current,
          { ...DEFAULT_PRODUCT_PREFERENCES, boardColoring: true },
          { onDigit: digit, onClearBoardColors: clear },
        );
      });
      await pressGameMenuTool(renderer, 'color-tool');
      const root = renderer.root;
      expect(root.findAllByProps({ testID: 'number-key-9' })).toHaveLength(0);
      await ReactTestRenderer.act(async () => {
        root.findByProps({ testID: 'color-clear-all' }).props.onPress();
      });
      expect(clear).toHaveBeenCalledTimes(1);
      expect(root.findByProps({ testID: 'color-palette' })).toBeTruthy();
      await ReactTestRenderer.act(async () => {
        root
          .findByProps({ testID: 'color-exit' })
          .props.onPress({ stopPropagation });
      });
      expect(stopPropagation).toHaveBeenCalledTimes(1);
      expect(root.findAllByProps({ testID: 'number-key-9' })).toHaveLength(0);
      expect(digit).not.toHaveBeenCalled();
      await ReactTestRenderer.act(async () => closeFrame(0));
      expect(root.findAllByProps({ testID: 'color-palette' })).toHaveLength(0);
      expect(digit).not.toHaveBeenCalled();
      expect(current.session!.state.values).toEqual(values);
      await ReactTestRenderer.act(async () => {
        root.findByProps({ testID: 'number-key-9' }).props.onPress();
      });
      expect(digit).toHaveBeenCalledTimes(1);
      expect(digit).toHaveBeenCalledWith(9);
    } finally {
      await ReactTestRenderer.act(async () => renderer?.unmount());
      frame.mockRestore();
    }
  });
  test('renders Auto complete one step at a time when Android reports reduced motion', async () => {
    const reducedMotion = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
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
            onEditCandidates={noOp}
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
      renderer.root.findAllByProps({ testID: 'auto-complete-status' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'contextual-action-strip' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'phone-quick-action-row' }).length,
    ).toBe(0);
    expect(
      renderer.root.findAllByProps({ testID: 'quick-finish-button' }),
    ).toHaveLength(0);
    const autoCompleteAction = renderer.root.find(
      node =>
        node.props.testID === 'auto-complete-action' &&
        node.props.accessibilityRole === 'button',
    );
    expect(autoCompleteAction.props.accessibilityLabel).toBe('Finish');
    expect(autoCompleteAction.props.accessibilityRole).toBe('button');
    expect(autoCompleteAction.props.accessibilityState.disabled).toBe(false);
    ReactTestRenderer.act(() => autoCompleteAction.props.onPress());
    expect(autoComplete).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.find(
        node =>
          node.props.testID === 'auto-complete-action' &&
          node.props.accessibilityRole === 'button',
      ).props.accessibilityState.disabled,
    ).toBe(true);
    expect(board().props.state.values[2]).toBeNull();
    expect(board().props.state.values[3]).toBeNull();

    await ReactTestRenderer.act(async () => renderer.update(renderScreen(0)));
    expect(
      renderer.root.findAllByProps({ testID: 'contextual-action-strip' })
        .length,
    ).toBe(0);
    expect(
      renderer.root.findAllByProps({ testID: 'phone-quick-action-row' }).length,
    ).toBe(0);
    expect(
      renderer.root.find(
        node =>
          node.props.testID === 'auto-complete-action' &&
          node.props.accessibilityRole === 'button',
      ).props.accessibilityState.disabled,
    ).toBe(true);
    expect(
      renderer.root.find(
        node =>
          node.props.testID === 'auto-complete-action' &&
          node.props.accessibilityRole === 'button',
      ).props.disabled,
    ).toBe(true);
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
    expect(board().props.highlightSameDigit).toBe(false);
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
    expect(board().props.state.selectedCell).toBe(2);
    expect(board().props.state.candidates.manualCandidates).toEqual(
      initialCandidates,
    );
    expect(board().props.replayEliminations).toEqual([]);

    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen(1, 'strike')),
    );
    expect(board().props.state.values[2]).toBe(4);
    expect(board().props.state.selectedCell).toBe(2);
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
    expect(board().props.state.selectedCell).toBe(2);
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

  test.each([false, true])(
    'keeps tablet finish on the board edge without changing layout (multi-select %s)',
    async multiSelectEnabled => {
      const adaptiveLayout = jest
        .spyOn(AdaptiveLayout, 'useAdaptiveLayout')
        .mockReturnValue({
          isAndroidTablet: true,
          isLandscape: true,
          useLandscapeTabletLayout: true,
          widthClass: 'expanded',
        });
      const source = snapshot();
      const autoComplete = jest.fn();
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      const renderScreen = (available: boolean, running = false) => (
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <GameScreen
              snapshot={{
                ...source,
                autoFinish: available
                  ? {
                      placements: [],
                      visibleCount: running ? 0 : null,
                      phase: null,
                    }
                  : undefined,
              }}
              preferences={{
                ...DEFAULT_PRODUCT_PREFERENCES,
                multiSelectEnabled,
              }}
              onAbandon={noOp}
              onApplyHint={noOp}
              onBack={noOp}
              onDigit={noOp}
              onOneTapFill={noOp}
              onEditCandidates={noOp}
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
            />
          </ThemeProvider>
        </LocalizationProvider>
      );
      const layout = () =>
        [
          'tablet-controls-dock',
          'tablet-game-controls',
          'game-number-pad',
          'game-toolbar',
        ].map(testID =>
          StyleSheet.flatten(renderer.root.findByProps({ testID }).props.style),
        );
      const expectNoAction = () =>
        expect(
          renderer.root.findAllByProps({ testID: 'auto-complete-action' }),
        ).toHaveLength(0);
      try {
        await ReactTestRenderer.act(async () => {
          renderer = ReactTestRenderer.create(renderScreen(false));
        });
        expectNoAction();
        const initialLayout = layout();
        const pane = renderer.root.findByProps({
          testID: 'tablet-game-controls',
        });
        await ReactTestRenderer.act(async () =>
          renderer.update(renderScreen(true)),
        );
        const action = renderer.root.findByProps({
          testID: 'auto-complete-action',
        });
        expect(action.props.accessibilityLabel).toBe('Finish');
        expect(action.props.accessibilityRole).toBe('button');
        expect(action.props.accessibilityState.disabled).toBe(false);
        expect(action.props.disabled).toBe(false);
        const dockStyle = StyleSheet.flatten(
          renderer.root.findByProps({
            testID: 'tablet-controls-dock',
          }).props.style,
        );
        expect(dockStyle.alignSelf).toBe('center');
        expect(dockStyle.paddingBottom).toBeUndefined();
        const edgeStyle = StyleSheet.flatten(
          renderer.root.findByProps({ testID: 'auto-complete-edge-space' })
            .props.style,
        );
        expect(edgeStyle.height).toBe(31);
        const buttonStyle = StyleSheet.flatten(
          action.props.style({ pressed: false }),
        );
        expect(buttonStyle.height).toBe(31);
        const faceStyle = StyleSheet.flatten(
          renderer.root.findByProps({ testID: 'auto-complete-button-face' })
            .props.style,
        );
        expect(faceStyle.height).toBe(24);
        expect(faceStyle.borderColor).toBe(lightPalette.accent);
        expect(
          renderer.root
            .findByProps({ testID: 'game-board-pane' })
            .findAll(node => node.props.testID === 'auto-complete-action', {
              deep: false,
            }),
        ).toHaveLength(1);
        expect(
          pane.findAllByProps({ testID: 'auto-complete-action' }),
        ).toHaveLength(0);
        expect(
          renderer.root.findAllByProps({ testID: 'contextual-action-strip' }),
        ).toHaveLength(0);
        expect(layout()).toEqual(initialLayout);
        await ReactTestRenderer.act(async () => action.props.onPress());
        expect(autoComplete).toHaveBeenCalledTimes(1);
        expect(
          renderer.root.findByProps({ testID: 'auto-complete-action' }).props
            .accessibilityState.disabled,
        ).toBe(true);
        expect(
          renderer.root.findByProps({ testID: 'auto-complete-action' }).props
            .disabled,
        ).toBe(true);

        await ReactTestRenderer.act(async () =>
          renderer.update(renderScreen(true, true)),
        );
        const runningAction = renderer.root.findByProps({
          testID: 'auto-complete-action',
        });
        expect(runningAction.props.accessibilityState.busy).toBe(true);
        expect(runningAction.props.disabled).toBe(true);
        expect(layout()).toEqual(initialLayout);
        await ReactTestRenderer.act(async () =>
          renderer.update(renderScreen(false)),
        );
        expectNoAction();
        expect(layout()).toEqual(initialLayout);
        expect(
          renderer.root.findByProps({ testID: 'tablet-game-controls' }),
        ).toBe(pane);

        source.busy = true;
        await ReactTestRenderer.act(async () =>
          renderer.update(renderScreen(true)),
        );
        expectNoAction();
        source.busy = false;
        source.session!.state.status = 'paused';
        await ReactTestRenderer.act(async () =>
          renderer.update(renderScreen(true)),
        );
        expectNoAction();
        source.session!.state.status = 'active';
        source.session!.state.activeHint = kiteHint;
        await ReactTestRenderer.act(async () =>
          renderer.update(renderScreen(true)),
        );
        expectNoAction();
      } finally {
        await ReactTestRenderer.act(async () => renderer?.unmount());
        adaptiveLayout.mockRestore();
      }
    },
  );

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
            onEditCandidates={noOp}
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
    const difficulty = renderer.root.findByProps({ testID: 'game-difficulty' });
    expect(difficulty.props.children).toBe('困难');
    expect(difficulty.props.accessibilityLabel).toBe('困难 · 难度分 53,648');
    await ReactTestRenderer.act(async () => {
      renderer.update(renderScreen({ ...next, puzzle: null }));
    });
    expect(
      renderer.root.findByProps({ testID: 'game-difficulty' }).props
        .accessibilityLabel,
    ).toBe('困难');
    ReactTestRenderer.act(() => renderer.unmount());
  });

  test.each([
    { width: 360, height: 592 },
    { width: 411, height: 866 },
    { width: 600, height: 912 },
    { width: 800, height: 1232 },
  ])('anchors tool balances to their icons at $width × $height', async size => {
    const previous = {
      window: Dimensions.get('window'),
      screen: Dimensions.get('screen'),
    };
    const next = snapshot();
    const hint = jest.fn();
    const quick = jest.fn();
    const render = () =>
      gameScreenElement(next, DEFAULT_PRODUCT_PREFERENCES, {
        onHint: hint,
        onQuickPencil: quick,
      });
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    try {
      await ReactTestRenderer.act(async () => {
        const dimensions = { ...size, scale: 2, fontScale: 1 };
        Dimensions.set({ window: dimensions, screen: dimensions });
        renderer = ReactTestRenderer.create(render());
      });
      const tools = () =>
        ['quick-pencil-tool', 'hint-tool'].map(testID =>
          renderer.root.findByProps({ testID }),
        );
      const textScale = gameScreenTextScale(size.width, size.height);
      for (const balance of [9, 10, 99, 100]) {
        next.wallet.quick_pencil.balance = balance;
        next.wallet.smart_hint.balance = balance;
        await ReactTestRenderer.act(async () => renderer.update(render()));
        for (const tool of [tools()[1]]) {
          const icon = tool.findByProps({ testID: 'tool-icon-frame' });
          const badges = icon.findAllByProps({
            testID: 'tool-low-balance-badge',
          });
          if (balance === 100) {
            expect(badges).toHaveLength(0);
          } else {
            const badge = icon.findByProps({
              testID: 'tool-low-balance-badge',
            });
            const badgeText = badge.findByType(Text);
            expect(badgeText.props.children).toBe(balance);
            expect(StyleSheet.flatten(icon.props.style)).toMatchObject({
              width: 24,
              height: 24,
            });
            const badgeStyle = StyleSheet.flatten(badge.props.style);
            expect(badgeStyle).toMatchObject({
              left: '100%',
              marginLeft: 4,
              top: -4,
            });
            expect(badgeStyle.height).toBe(
              (balance >= 10 ? 20 : 18) * textScale,
            );
            expect(badgeStyle.borderRadius * 2).toBe(badgeStyle.height);
            if (balance >= 10) {
              expect(badgeStyle.width).toBe(20 * textScale);
              expect(badgeStyle.paddingHorizontal).toBe(0);
            }
            expect(StyleSheet.flatten(badgeText.props.style)).toMatchObject({
              includeFontPadding: false,
              lineHeight: 12 * textScale,
              textAlign: 'center',
            });
            expect(badge.props.pointerEvents).toBe('none');
          }
        }
      }
      await ReactTestRenderer.act(async () => {
        for (const tool of tools()) tool.props.onPress();
      });
      expect(hint).toHaveBeenCalledTimes(1);
      expect(quick).toHaveBeenCalledTimes(1);
      next.wallet.quick_pencil.balance = 99;
      await ReactTestRenderer.act(async () => renderer.update(render()));
      expect(
        tools()[1].findAllByProps({ testID: 'tool-low-balance-badge' }),
      ).toHaveLength(0);
      expect(
        tools()[0].findAllByProps({ testID: 'tool-low-balance-badge' }),
      ).toHaveLength(0);
    } finally {
      await ReactTestRenderer.act(async () => {
        renderer?.unmount();
        Dimensions.set(previous);
      });
    }
  });

  test('keeps timer and pause in a compact secondary tone without a background', async () => {
    const next = snapshot();
    const quickPress = jest.fn();
    const quickLongPress = jest.fn();
    next.wallet.quick_pencil.balance = 932;
    next.wallet.smart_hint.balance = 769;
    const renderScreen = (
      theme: 'light' | 'dark' = 'light',
      premium = false,
    ) => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference={theme}>
          <GameScreen
            premium={premium}
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onOneTapFill={noOp}
            onDigit={noOp}
            onEditCandidates={noOp}
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
      header.findAllByProps({ testID: 'game-mistakes' }).length,
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
      marginLeft: 0,
      minHeight: 48,
    });
    expect(
      StyleSheet.flatten(pause.props.style).backgroundColor,
    ).toBeUndefined();
    expect(StyleSheet.flatten(pause.props.style).minWidth).toBeUndefined();
    expect(pause.props.hitSlop).toBeUndefined();
    expect(pause.findByType(AppIcon).props.color).toBe(lightPalette.muted);
    expect(
      renderer.root.findAllByProps({ testID: 'game-difficulty' }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findByProps({ testID: 'game-mistakes' }).props
        .accessibilityLabel,
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
    expect(quickTool().props.label).toBe('Candidates');
    expect(quickTool().props.accessibilityLabel).toBe('Quick Candidates');
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
      quickTool().findAllByProps({ testID: 'tool-low-balance-badge' }),
    ).toHaveLength(0);
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
      renderer.update(renderScreen('light', true)),
    );
    expect(
      renderer.root.findAllByProps({ testID: 'tool-low-balance-badge' }),
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
    expect(quickTool().props.label).toBe('Candidates');
    expect(quickTool().props.accessibilityLabel).toBe('Hide candidates');
    expect(quickTool().props.active).toBe(true);
    expect(quickTool().props.accessibilityHint).toBe(
      'Long press to regenerate Quick Candidates for free.',
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
    expect(quickTool().props.label).toBe('Candidates');
    expect(quickTool().props.accessibilityLabel).toBe('Show candidates');
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
            onEditCandidates={noOp}
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
    { width: 390, height: 844, expected: 354 },
    { width: 430, height: 932, expected: 360 },
  ])(
    'fits the phone hint panel into the remaining $width x $height space',
    ({ width, height, expected }) => {
      expect(gamePhoneHintPanelHeight(width, height, 1)).toBe(expected);
    },
  );

  test('uses the safe-area height and reserves a readable hint panel on short screens', () => {
    expect(gamePhoneHintAvailableHeight(360, 752, 1)).toBe(292);
    expect(gamePhoneHintPanelHeight(360, 752, 1)).toBe(292);
    expect(gamePhoneHintAvailableHeight(320, 520, 1)).toBe(100);
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
    'shares landscape whitespace equally at $width x $height',
    ({ width, height }) => {
      const board = gameLandscapeBoardMaxSize(width, height, 1.25);
      const controls = gameLandscapeControlsWidth(width);
      const gutter = gameLandscapeHorizontalGutter(width, board, controls);

      expect(board + controls + gutter * 3).toBeCloseTo(width);
      expect(gutter).toBeGreaterThanOrEqual(6);
    },
  );

  test('maximizes the board after accounting for measured headers and content', () => {
    expect(gameLandscapeBoardMaxSize(960, 544, 1)).toBe(438);
    expect(gameLandscapeBoardMaxSize(960, 544, 1, 140)).toBe(404);
    expect(gameLandscapeBoardMaxSize(960, 394, 1)).toBe(288);
  });

  test('uses larger text on iPad mini without changing phone text', () => {
    expect(gameScreenTextScale(390, 844)).toBe(1);
    expect(gameScreenTextScale(744, 1133)).toBe(1.25);
  });

  test.each([
    { width: 840, height: 600, expected: 480 },
    { width: 1024, height: 640, expected: 520 },
    { width: 1280, height: 800, expected: 680 },
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
              onEditCandidates={noOp}
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
    expect(
      renderer.root.findByProps({ testID: 'number-key-5' }).props
        .accessibilityState.selected,
    ).toBe(true);
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

  test('uses a temporary button for cell-first batch removal', async () => {
    const source = snapshot();
    source.autoFinish = { placements: [], visibleCount: null, phase: null };
    source.session!.state.candidates.pencilMode = true;
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
              onAutoComplete={noOp}
              onBack={noOp}
              onDigit={onDigit}
              onOneTapFill={noOp}
              onEditCandidates={onRemove}
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
    expect(
      renderer.root.findAllByProps({ testID: 'phone-quick-action-row' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'auto-complete-action' }),
    ).toBeTruthy();
    await openGameMenu(renderer);
    const batchIcons = renderer.root
      .findByProps({ testID: 'multi-select-tool' })
      .findAllByType(AppIcon)
      .map(icon => icon.props.name);
    expect(batchIcons).toEqual(['multiSelect']);
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    expect(onSelectCell).toHaveBeenLastCalledWith(2);
    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    expect(onSelectCell).toHaveBeenLastCalledWith(3);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);
    await pressGameMenuTool(renderer, 'multi-select-tool');
    expect(batchNotesSelected(renderer)).toBe(true);
    expect(
      renderer.root.findByProps({ testID: 'number-key-4' }).props
        .accessibilityState.disabled,
    ).toBe(true);
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
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
      [[2, 3], [4], 'remove'],
      [[2, 3], [7], 'remove'],
    ]);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
    ).toBeGreaterThan(0);
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    expect(onSelectCell).toHaveBeenLastCalledWith(2);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-3' }),
    ).toHaveLength(0);
    expect(batchNotesSelected(renderer)).toBe(false);
    expect(onDigit).not.toHaveBeenCalled();
    expect(onRemove).toHaveBeenCalledTimes(2);

    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    expect(onSelectCell).toHaveBeenLastCalledWith(3);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);

    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ testID: 'game-portrait-layout' })
        .props.onTouchEnd({ target: 1, currentTarget: 1 }),
    );
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  test('selects several digits and removes them from one cell in digit-first mode', async () => {
    const source = snapshot();
    source.session!.state.candidates.pencilMode = true;
    source.session!.state.candidates.manualCandidates =
      source.session!.state.candidates.manualCandidates.map((mask, cell) =>
        cell === 2 ? addCandidate(addCandidate(mask, 4), 7) : mask,
      );
    const onDigit = jest.fn();
    const onRemove = jest.fn();
    const renderScreen = () => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <GameScreen
            snapshot={source}
            preferences={{
              ...DEFAULT_PRODUCT_PREFERENCES,
              inputMode: 'digit_first',
              multiSelectEnabled: true,
            }}
            onAbandon={noOp}
            onApplyHint={noOp}
            onBack={noOp}
            onDigit={onDigit}
            onOneTapFill={noOp}
            onEditCandidates={onRemove}
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
    const digit = (value: number) =>
      renderer.root.findByProps({ testID: `number-key-${value}` });
    const cell = (index: number) =>
      renderer.root.findByProps({ testID: `sudoku-cell-index-${index}` });

    await ReactTestRenderer.act(async () => digit(4).props.onPress());
    expect(digit(4).props.accessibilityState.selected).toBe(true);
    await pressGameMenuTool(renderer, 'multi-select-tool');
    await ReactTestRenderer.act(async () => digit(7).props.onPress());
    expect(digit(4).props.accessibilityState.selected).toBe(true);
    expect(digit(7).props.accessibilityState.selected).toBe(true);
    expect(
      renderer.root.find(
        node =>
          Array.isArray(node.props.state?.values) &&
          typeof node.props.multiSelectActive === 'boolean',
      ).props.highlightDigit,
    ).toBeNull();
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    expect(onRemove).toHaveBeenCalledWith([2], [4, 7], 'remove');
    expect(onDigit).not.toHaveBeenCalled();
    await ReactTestRenderer.act(async () => digit(7).props.onPress());
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onDigit).toHaveBeenLastCalledWith(7);
    expect(digit(4).props.accessibilityState.selected).toBe(false);
    expect(digit(7).props.accessibilityState.selected).toBe(true);
    expect(batchNotesSelected(renderer)).toBe(false);

    source.session!.state.candidates.pencilMode = false;
    await ReactTestRenderer.act(async () => renderer.update(renderScreen()));
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
            onEditCandidates={noOp}
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
    source.session!.state.candidates.pencilMode = true;
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
              onEditCandidates={onRemove}
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
    await pressGameMenuTool(renderer, 'multi-select-tool');
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    expect(board().props.highlightDigit).toBe(5);
    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    expect(board().props.highlightDigit).toBe(5);

    await pressGameMenuTool(renderer, 'color-tool');
    expect(board().props.highlightDigit).toBeNull();
    await pressGameMenuTool(renderer, 'color-tool');
    expect(board().props.highlightDigit).toBe(5);

    await ReactTestRenderer.act(async () =>
      renderer.root.findByProps({ testID: 'number-key-4' }).props.onPress(),
    );
    expect(onRemove).toHaveBeenCalledWith([2, 3], [4], 'remove');
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
              onEditCandidates={noOp}
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
              onEditCandidates={noOp}
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
    source.session!.state.candidates.pencilMode = true;
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
            onEditCandidates={noOp}
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
    await pressGameMenuTool(renderer, 'multi-select-tool');
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
    ).toBeGreaterThan(0);

    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen('digit_first')),
    );
    expect(batchNotesSelected(renderer)).toBe(false);
    expect(onSelectCell).toHaveBeenLastCalledWith(null);

    await ReactTestRenderer.act(async () =>
      renderer.update(renderScreen('cell_first')),
    );
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);
    expect(batchNotesSelected(renderer)).toBe(false);

    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    await pressGameMenuTool(renderer, 'multi-select-tool');
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
    source.session!.state.candidates.pencilMode = true;
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
                onEditCandidates={noOp}
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
    await pressGameMenuTool(renderer, 'multi-select-tool');
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

  test.each(['cell_first', 'digit_first'] as const)(
    'keeps tablet mode controls mounted across fill, notes and batch in %s',
    async inputMode => {
      const adaptiveLayout = jest
        .spyOn(AdaptiveLayout, 'useAdaptiveLayout')
        .mockReturnValue({
          isAndroidTablet: true,
          isLandscape: true,
          useLandscapeTabletLayout: true,
          widthClass: 'expanded',
        });
      const source = snapshot();
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      const renderScreen = (pencilMode: boolean) => {
        source.session!.state.candidates.pencilMode = pencilMode;
        return (
          <LocalizationProvider locale="en">
            <ThemeProvider preference="light">
              <GameScreen
                snapshot={source}
                preferences={{
                  ...DEFAULT_PRODUCT_PREFERENCES,
                  inputMode,
                  multiSelectEnabled: true,
                }}
                onAbandon={noOp}
                onApplyHint={noOp}
                onBack={noOp}
                onDigit={noOp}
                onOneTapFill={noOp}
                onEditCandidates={noOp}
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
      };
      try {
        await ReactTestRenderer.act(async () => {
          renderer = ReactTestRenderer.create(renderScreen(false));
        });
        const batch = () =>
          renderer.root.findByProps({ testID: 'multi-select-tool' });
        const normal = () =>
          renderer.root.findByProps({ testID: 'candidate-normal-tool' });
        const modeRow = renderer.root.findByProps({
          testID: 'tablet-candidate-modes',
        });
        const layoutStyles = () =>
          ['tablet-candidate-modes', 'game-number-pad', 'game-toolbar'].map(
            testID =>
              StyleSheet.flatten(
                renderer.root.findByProps({ testID }).props.style,
              ),
          );
        const fillLayout = layoutStyles();
        expect(batch().props.disabled).toBe(true);
        expect(normal().props.accessibilityState.selected).toBe(true);

        await ReactTestRenderer.act(async () =>
          renderer.update(renderScreen(true)),
        );
        expect(batch().props.disabled).toBe(false);
        await ReactTestRenderer.act(async () => batch().props.onPress());
        expect(batch().props.accessibilityState.selected).toBe(true);
        expect(normal().props.accessibilityState.selected).toBe(false);
        await ReactTestRenderer.act(async () => batch().props.onPress());
        expect(batch().props.accessibilityState.selected).toBe(true);
        expect(layoutStyles()).toEqual(fillLayout);

        await ReactTestRenderer.act(async () => normal().props.onPress());
        await ReactTestRenderer.act(async () => normal().props.onPress());
        expect(normal().props.accessibilityState.selected).toBe(true);
        expect(batch().props.accessibilityState.selected).toBe(false);
        await ReactTestRenderer.act(async () => batch().props.onPress());
        await ReactTestRenderer.act(async () =>
          renderer.update(renderScreen(false)),
        );
        expect(batch().props.accessibilityState).toEqual({
          selected: false,
          disabled: true,
        });
        expect(
          renderer.root.findByProps({ testID: 'tablet-candidate-modes' }),
        ).toBe(modeRow);
        expect(layoutStyles()).toEqual(fillLayout);
      } finally {
        await ReactTestRenderer.act(async () => renderer?.unmount());
        adaptiveLayout.mockRestore();
      }
    },
  );

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
    source.session!.state.candidates.pencilMode = true;
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
                onEditCandidates={noOp}
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
      await pressGameMenuTool(renderer, 'multi-select-tool');
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
      expect(batchNotesSelected(renderer)).toBe(true);
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
    source.session!.state.candidates.pencilMode = true;
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
            onEditCandidates={noOp}
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
    await pressGameMenuTool(renderer, 'multi-select-tool');
    await ReactTestRenderer.act(async () => cell(2).props.onPress());
    await ReactTestRenderer.act(async () => cell(3).props.onPress());
    expect(
      renderer.root.findAllByProps({ testID: 'auto-complete-action' }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }).length,
    ).toBeGreaterThan(0);

    await pressGameMenuTool(renderer, 'color-tool');
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-selection-2' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'number-key-4' }),
    ).toHaveLength(0);
    await pressGameMenuTool(renderer, 'color-tool');
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
              onEditCandidates={noOp}
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
    expect(renderer.root.findAllByType(ScrollView)).toHaveLength(1);
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
            onEditCandidates={noOp}
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
              onEditCandidates={noOp}
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

  test('keeps the board visible and timer stopped during a rewarded ad', async () => {
    const next = snapshot();
    next.session = {
      ...next.session!,
      state: {
        ...next.session!.state,
        status: 'paused',
        timer: { elapsedMs: 125_000, runningSinceEpochMs: null },
      },
    };
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = renderGameScreen(next, DEFAULT_PRODUCT_PREFERENCES, {
        adPlaybackActive: true,
      });
    });

    expect(
      renderer.root.findByProps({ testID: 'game-board-container' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'game-timer' }).props.children,
    ).toBe('02:05');
    expect(
      renderer.root.findAllByProps({ testID: 'game-paused' }),
    ).toHaveLength(0);

    await ReactTestRenderer.act(async () => {
      renderer.update(gameScreenElement(next));
    });
    expect(renderer.root.findByProps({ testID: 'game-paused' })).toBeTruthy();
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
              onEditCandidates={noOp}
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
