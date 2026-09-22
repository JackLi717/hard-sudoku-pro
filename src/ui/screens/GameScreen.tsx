import { useScreenState, useScreenScroll } from '../screen-state';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Animated,
  GestureResponderEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  CoordinatorMessage,
  OfflineGameSnapshot,
  ProductLocale,
  ProductPreferences,
} from '../../application';
import { BoardColor, GameState } from '../../domain/game/contracts';
import {
  InferenceConclusion,
  InferencePath,
  InferenceSession,
  InferenceTruth,
  applyInferenceAction,
  createInferenceSession,
  deriveInferenceBranch,
  inferenceConclusions,
  undoInferenceAction,
  validateInferenceEntry,
} from '../../domain/game/inference-session';
import { getElapsedMs } from '../../domain/game/engine';
import { buildHintPresentation } from '../../domain/hints/presentation';
import type { ReasoningCandidateMark } from '../../domain/reasoning/contracts';
import { CellIndex, Digit } from '../../domain/sudoku/contracts';
import { hasCandidate } from '../../domain/sudoku/board';
import { OneTapFillKind } from '../../domain/sudoku/one-tap-fill';
import {
  HINT_PRESENTATION_COPIES,
  translateCoordinatorMessage,
  useLocalization,
} from '../../localization';
import {
  BOARD_COLOR_SWATCHES,
  SudokuBoard,
  sudokuBoardLayout,
} from '../components/SudokuBoard';
import { APP_ICON_SIZE, AppIcon, AppIconName } from '../components/AppIcon';
import {
  isGameplayFeedbackMessage,
  resolveGameplayFeedback,
} from '../game-feedback';
import { AppPalette, useAppTheme } from '../theme';
import { BoardColors } from '../themes/board-theme';
import { useReducedMotion } from '../use-reduced-motion';
import {
  fitSquareWithin,
  TABLET_SAFE_BOTTOM_CLEARANCE,
  useAdaptiveLayout,
} from '../layout/adaptive-layout';

type GameScreenProps = {
  snapshot: OfflineGameSnapshot;
  preferences: ProductPreferences;
  onBack(): void;
  onPause(): void;
  onResume(): void;
  onAbandon(): void;
  onSelectCell(cell: number | null): void;
  onReplayFocusChange?(cell: number | null, digit: Digit | null): void;
  onOneTapFill(cell: number, kind: OneTapFillKind): void;
  onDigit(digit: Digit): void;
  onRemoveCandidateFromCells(cells: readonly CellIndex[], digit: Digit): void;
  onApplyInferenceConclusions?(
    conclusions: readonly InferenceConclusion[],
  ): void;
  onMultiSelectEnabledChange?(enabled: boolean): void;
  onUndo(): void;
  onColorCells?(
    cells: readonly CellIndex[],
    color: BoardColor,
    toggleSameColor: boolean,
  ): void;
  onClearBoardColors?(): void;
  onErase(): void;
  onQuickPencil(): void;
  onRegenerateQuickPencil?(): void;
  onAutoComplete?(): void;
  onPencil(): void;
  onHint(): void;
  onApplyHint(): void;
  onDismissHint(): void;
  onDismissGameplayMessage?(message: CoordinatorMessage): void;
};

const DIGITS: readonly Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const TABLET_SHORTEST_SIDE = 600;
const BADGE_BALANCE_THRESHOLD = 10;
const LANDSCAPE_GAME_META_HEIGHT = 38;
const LANDSCAPE_MIN_GUTTER = 12;
const PHONE_HINT_MAX_HEIGHT = 360;
const PHONE_HINT_MIN_HEIGHT = 240;
const PHONE_HINT_VERTICAL_GAP = 12;
const PHONE_CONTENT_BOTTOM_PADDING = 28;
const PHONE_BOARD_EDGE_INSET = 12;

type ContextualActionStripState = { kind: 'auto_complete' } | null;

type InferencePathDisplay = 'current' | 'both';

function resolveContextualActionStrip({
  paused,
  hintOpen,
  busy,
  autoCompleteAvailable,
}: {
  paused: boolean;
  hintOpen: boolean;
  busy: boolean;
  autoCompleteAvailable: boolean;
}): ContextualActionStripState {
  if (paused) return null;
  if (hintOpen) return null;
  if (busy) return null;
  return autoCompleteAvailable ? { kind: 'auto_complete' } : null;
}

export function gameScreenTextScale(width: number, height: number): number {
  return Math.min(width, height) >= TABLET_SHORTEST_SIDE ? 1.25 : 1;
}

export function gameLandscapeBoardMaxSize(
  width: number,
  height: number,
  textScale: number,
): number {
  return fitSquareWithin({
    availableWidth: width * 0.62,
    availableHeight: height,
    horizontalInset: 60,
    verticalInset: 56 * textScale + 104 + TABLET_SAFE_BOTTOM_CLEARANCE,
    maxSize: 700,
  });
}

export function gameLandscapeControlsWidth(width: number): number {
  return Math.min(Math.max(width * 0.34, 300), 400);
}

export function gameLandscapeHorizontalGutter(
  width: number,
  boardSize: number,
  controlsWidth: number,
): number {
  return Math.max(
    LANDSCAPE_MIN_GUTTER,
    (width - boardSize - controlsWidth) / 3,
  );
}

export function gameLandscapeHintPanelHeight(boardSize: number): number {
  return (boardSize * 7) / 9;
}

export function gamePhoneHintPanelHeight(
  width: number,
  height: number,
  textScale: number,
): number {
  const availableHeight = gamePhoneHintAvailableHeight(
    width,
    height,
    textScale,
  );
  return Math.min(
    Math.max(availableHeight, PHONE_HINT_MIN_HEIGHT),
    PHONE_HINT_MAX_HEIGHT,
  );
}

export function gamePhoneHintAvailableHeight(
  width: number,
  height: number,
  textScale: number,
): number {
  const boardSize = sudokuBoardLayout(width, height).boardSize;
  return Math.max(
    0,
    height -
      56 * textScale -
      LANDSCAPE_GAME_META_HEIGHT -
      boardSize -
      PHONE_HINT_VERTICAL_GAP -
      PHONE_CONTENT_BOTTOM_PADDING,
  );
}

export function gameInferenceEntryRightInset(
  platform: string,
  useLandscapeTabletLayout: boolean,
): number {
  return platform === 'android' && !useLandscapeTabletLayout
    ? PHONE_BOARD_EDGE_INSET
    : 0;
}

function formatElapsed(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(
    2,
    '0',
  )}`;
}

export function formatDifficultyScore(
  score: number,
  locale: ProductLocale,
): string {
  return new Intl.NumberFormat(locale).format(score);
}

function GameTimer({
  state,
  textScale,
}: {
  state: GameState;
  textScale: number;
}): React.JSX.Element {
  const [nowEpochMs, setNowEpochMs] = useState(Date.now());
  const { palette } = useAppTheme();
  const styles = useMemo(
    () => createStyles(palette, textScale),
    [palette, textScale],
  );

  useEffect(() => {
    if (state.status !== 'active') {
      return undefined;
    }
    const timer = setInterval(() => setNowEpochMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.status]);

  return (
    <Text maxFontSizeMultiplier={1.4} style={styles.timer} testID="game-timer">
      {formatElapsed(getElapsedMs(state, nowEpochMs))}
    </Text>
  );
}

type ToolButtonProps = {
  label: string;
  icon: AppIconName;
  feedbackOpacity?: Animated.Value;
  active?: boolean;
  badge?: number;
  disabled?: boolean;
  landscape?: boolean;
  testID?: string;
  textScale: number;
  onPress(): void;
  onLongPress?(): void;
};

function ToolButton({
  label,
  icon,
  active = false,
  badge,
  disabled = false,
  landscape = false,
  testID,
  textScale,
  feedbackOpacity,
  onPress,
  onLongPress,
}: ToolButtonProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(
    () => createStyles(palette, textScale),
    [palette, textScale],
  );
  const accessibilityParts = [label];
  if (active) {
    accessibilityParts.push(t('game.active'));
  }
  if (badge !== undefined) {
    accessibilityParts.push(t('game.remaining', { count: badge }));
  }
  return (
    <Pressable
      accessibilityLabel={accessibilityParts.join(', ')}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.tool,
        landscape && styles.toolLandscape,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <View style={styles.toolIcon}>
        <AppIcon
          color={active ? palette.accent : palette.ink}
          name={icon}
          size={APP_ICON_SIZE.navigation}
        />
      </View>
      <Text
        maxFontSizeMultiplier={1.3}
        numberOfLines={2}
        style={[styles.toolLabel, active && styles.toolLabelActive]}
      >
        {label}
      </Text>
      {badge !== undefined && badge < BADGE_BALANCE_THRESHOLD ? (
        <View
          style={[styles.badge, badge === 0 && styles.badgeEmpty]}
          testID="tool-low-balance-badge"
        >
          <Text
            allowFontScaling={false}
            style={[styles.badgeText, badge === 0 && styles.badgeTextEmpty]}
          >
            {badge === 0 ? 'AD' : badge}
          </Text>
        </View>
      ) : null}
      {feedbackOpacity ? (
        <Animated.View
          accessible={false}
          pointerEvents="none"
          style={[styles.toolFeedback, { opacity: feedbackOpacity }]}
          testID={`game-tool-feedback-${testID ?? label}`}
        />
      ) : null}
    </Pressable>
  );
}

export function GameScreen({
  snapshot,
  preferences,
  onBack,
  onPause,
  onResume,
  onAbandon,
  onSelectCell,
  onReplayFocusChange,
  onOneTapFill,
  onDigit,
  onRemoveCandidateFromCells,
  onApplyInferenceConclusions,
  onMultiSelectEnabledChange,
  onUndo,
  onColorCells,
  onClearBoardColors,
  onErase,
  onQuickPencil,
  onRegenerateQuickPencil,
  onAutoComplete,
  onPencil,
  onHint,
  onApplyHint,
  onDismissHint,
  onDismissGameplayMessage,
}: GameScreenProps): React.JSX.Element | null {
  const { locale, t } = useLocalization();
  const { boardTheme, palette } = useAppTheme();
  const { height, width } = useWindowDimensions();
  const { useLandscapeTabletLayout } = useAdaptiveLayout();
  const inferenceEntryRightInset = gameInferenceEntryRightInset(
    Platform.OS,
    useLandscapeTabletLayout,
  );
  const textScale = gameScreenTextScale(width, height);
  const styles = useMemo(
    () => createStyles(palette, textScale, boardTheme.colors),
    [boardTheme.colors, palette, textScale],
  );
  const reduceMotion = useReducedMotion(preferences.hintAnimations);
  const reduceAutoFinishMotion = useReducedMotion();
  const session = snapshot.session;
  const currentSessionId = session?.state.sessionId;
  const sessionKey = `game:${currentSessionId ?? 'none'}`;
  const gameplayFeedback = resolveGameplayFeedback(snapshot);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const inferenceFeedbackOpacity = useRef(new Animated.Value(0)).current;
  const multiSelectBlockedOpacity = useRef(new Animated.Value(0)).current;
  const multiSelectBlockedTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const dismissGameplayMessageRef = useRef(onDismissGameplayMessage);
  dismissGameplayMessageRef.current = onDismissGameplayMessage;
  useEffect(() => {
    const message = snapshot.message;
    if (!currentSessionId || !isGameplayFeedbackMessage(message)) return;
    AccessibilityInfo.announceForAccessibility(
      translateCoordinatorMessage(t, message),
    );
    if (reduceMotion) {
      feedbackOpacity.setValue(1);
      const timeout = setTimeout(() => {
        feedbackOpacity.setValue(0);
        dismissGameplayMessageRef.current?.(message);
      }, 650);
      return () => {
        clearTimeout(timeout);
        feedbackOpacity.setValue(0);
      };
    }
    feedbackOpacity.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(feedbackOpacity, {
        toValue: 1,
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.delay(320),
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) dismissGameplayMessageRef.current?.(message);
    });
    return () => {
      animation.stop();
      feedbackOpacity.setValue(0);
    };
  }, [feedbackOpacity, reduceMotion, currentSessionId, snapshot.message, t]);
  const [multiCells, setMultiCells] = useScreenState<readonly CellIndex[]>(
    `${sessionKey}:candidate-multi-cells`,
    [],
  );
  const [multiSelectBlockedCell, setMultiSelectBlockedCell] =
    useState<CellIndex | null>(null);
  const [colorMode, setColorMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState<BoardColor>(0);
  const [forcingSession, setForcingSession] = useState<InferenceSession | null>(
    null,
  );
  const [forcingPath, setForcingPath] = useState<InferencePath>('a');
  const [forcingPathDisplay, setForcingPathDisplay] =
    useState<InferencePathDisplay>('both');
  const [forcingPathBRevealed, setForcingPathBRevealed] = useState(false);
  const [forcingTruth, setForcingTruth] = useState<InferenceTruth>('true');
  const [forcingCells, setForcingCells] = useState<readonly CellIndex[]>([]);
  const [forcingMultiSelect, setForcingMultiSelect] = useState(false);
  const [forcingInvalidCells, setForcingInvalidCells] = useState<
    readonly CellIndex[]
  >([]);
  const forcingFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [screenLayoutHeight, setScreenLayoutHeight] = useState<number | null>(
    null,
  );
  const rootRef = useRef<React.ComponentRef<typeof View>>(null);
  const boardRef = useRef<React.ComponentRef<typeof View>>(null);
  const multiCellsRef = useRef(multiCells);
  multiCellsRef.current = multiCells;
  useEffect(
    () => () => {
      if (multiSelectBlockedTimerRef.current) {
        clearTimeout(multiSelectBlockedTimerRef.current);
      }
      multiSelectBlockedOpacity.stopAnimation();
      if (forcingFeedbackTimerRef.current) {
        clearTimeout(forcingFeedbackTimerRef.current);
      }
      inferenceFeedbackOpacity.stopAnimation();
    },
    [inferenceFeedbackOpacity, multiSelectBlockedOpacity],
  );
  useEffect(() => {
    if (!preferences.boardColoring) setColorMode(false);
  }, [preferences.boardColoring]);
  useEffect(() => {
    if (session?.state.activeHint) setColorMode(false);
  }, [session?.state.activeHint]);
  useEffect(() => {
    setColorMode(false);
  }, [session?.state.sessionId]);
  useEffect(() => {
    setMultiSelectBlockedCell(null);
    multiSelectBlockedOpacity.setValue(0);
    setForcingSession(null);
    setForcingPath('a');
    setForcingPathBRevealed(false);
    setForcingTruth('true');
    setForcingCells([]);
    setForcingMultiSelect(false);
    setForcingInvalidCells([]);
    inferenceFeedbackOpacity.setValue(0);
  }, [
    inferenceFeedbackOpacity,
    multiSelectBlockedOpacity,
    session?.state.sessionId,
  ]);
  const showMultiSelectBlockedFeedback = useCallback(
    (cell: CellIndex) => {
      if (multiSelectBlockedTimerRef.current) {
        clearTimeout(multiSelectBlockedTimerRef.current);
      }
      multiSelectBlockedOpacity.stopAnimation();
      multiSelectBlockedOpacity.setValue(reduceMotion ? 1 : 0);
      setMultiSelectBlockedCell(cell);
      AccessibilityInfo.announceForAccessibility(
        t('game.multiSelectFilledCell'),
      );
      if (preferences.haptics) {
        try {
          Vibration.vibrate(12);
        } catch {
          // Optional feedback must never block selection.
        }
      }
      if (!reduceMotion) {
        Animated.sequence([
          Animated.timing(multiSelectBlockedOpacity, {
            duration: 120,
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.delay(320),
          Animated.timing(multiSelectBlockedOpacity, {
            duration: 220,
            toValue: 0,
            useNativeDriver: true,
          }),
        ]).start();
      }
      multiSelectBlockedTimerRef.current = setTimeout(() => {
        setMultiSelectBlockedCell(null);
        multiSelectBlockedOpacity.setValue(0);
        multiSelectBlockedTimerRef.current = null;
      }, 850);
    },
    [multiSelectBlockedOpacity, preferences.haptics, reduceMotion, t],
  );
  const values = session?.state.values;
  const autoFinish = snapshot.autoFinish;
  const autoFinishRunning =
    autoFinish !== undefined && autoFinish.visibleCount !== null;
  const autoFinishValues = useMemo(() => {
    if (!values || !autoFinish || autoFinish.visibleCount === null) {
      return values;
    }
    const next = [...values];
    autoFinish.placements
      .slice(
        0,
        reduceAutoFinishMotion
          ? autoFinish.placements.length
          : autoFinish.visibleCount,
      )
      .forEach(({ cell, digit }) => {
        next[cell] = digit;
      });
    return next;
  }, [autoFinish, reduceAutoFinishMotion, values]);
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const counts = useMemo(
    () =>
      DIGITS.reduce<Record<number, number>>((result, digit) => {
        result[digit] = values?.filter(value => value === digit).length ?? 0;
        return result;
      }, {}),
    [values],
  );
  const activeHint = session?.state.activeHint ?? null;
  const hintPresentation = useMemo(
    () =>
      activeHint
        ? buildHintPresentation(
            activeHint,
            HINT_PRESENTATION_COPIES[locale],
            'game',
            session?.state.candidates.hintCandidates,
            undefined,
            session?.state.candidates.hintCandidateOrigin === 'quick'
              ? { kind: 'currentQuick' }
              : session?.state.candidates.hintCandidateOrigin ===
                  'applied_hint' &&
                session.state.candidates.appliedHintSteps?.length
              ? {
                  kind: 'appliedHints',
                  steps: session.state.candidates.appliedHintSteps,
                }
              : undefined,
          )
        : null,
    [
      activeHint,
      locale,
      session?.state.candidates.appliedHintSteps,
      session?.state.candidates.hintCandidateOrigin,
      session?.state.candidates.hintCandidates,
    ],
  );
  const scroll = useScreenScroll(sessionKey);
  const hintUseCount = session?.state.hintUseCount ?? 0;
  const hintKey = useMemo(
    () => `${sessionKey}:hint:${hintUseCount}:${JSON.stringify(activeHint)}`,
    [sessionKey, activeHint, hintUseCount],
  );
  const [hintPageIndex, setHintPageIndex] = useScreenState(hintKey, 0);
  const [hintApplying, setHintApplying] = useState(false);
  const [selectedDigit, setSelectedDigit] = useScreenState<Digit | null>(
    `${sessionKey}:digit`,
    null,
  );
  const hintEntrance = useRef(new Animated.Value(0)).current;
  const hintApplyScale = useRef(new Animated.Value(1)).current;
  const hintPage = hintPresentation?.pages[hintPageIndex] ?? null;
  useEffect(() => {
    if (!hintPresentation || !hintPage) {
      return;
    }
    AccessibilityInfo.announceForAccessibility(
      `${hintPresentation.techniqueName}. ${hintPage.accessibilitySummary}`,
    );
  }, [hintPage, hintPresentation]);

  useEffect(() => {
    if (!hintPresentation) {
      setHintPageIndex(0);
      setHintApplying(false);
      hintEntrance.setValue(0);
      hintApplyScale.setValue(1);
      return;
    }
    if (reduceMotion) {
      hintEntrance.setValue(1);
      return;
    }
    hintEntrance.setValue(0);
    Animated.timing(hintEntrance, {
      duration: 220,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [
    hintApplyScale,
    hintEntrance,
    hintPresentation,
    reduceMotion,
    setHintPageIndex,
  ]);

  useEffect(() => {
    if (preferences.inputMode === 'cell_first') {
      setSelectedDigit(null);
    }
  }, [preferences.inputMode, setSelectedDigit]);

  const activeCandidateGrid = session
    ? session.state.candidates.activeCandidateSource === 'quick'
      ? session.state.candidates.quickCandidates
      : session.state.candidates.manualCandidates
    : null;
  const activeCandidateGridRef = useRef(activeCandidateGrid);
  activeCandidateGridRef.current = activeCandidateGrid;
  const multiSelectEnabled =
    preferences.inputMode === 'cell_first' && preferences.multiSelectEnabled;

  const applyPresentedHint = () => {
    if (hintApplying || snapshot.busy) {
      return;
    }
    if (reduceMotion) {
      onApplyHint();
      return;
    }
    setHintApplying(true);
    Animated.sequence([
      Animated.timing(hintApplyScale, {
        duration: 110,
        toValue: 1.025,
        useNativeDriver: true,
      }),
      Animated.timing(hintApplyScale, {
        duration: 140,
        toValue: 0.97,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        onApplyHint();
      }
      setHintApplying(false);
      hintApplyScale.setValue(1);
    });
  };

  const paused = session?.state.status === 'paused';
  const hintOpen = activeHint !== null;
  const interactionDisabled = snapshot.busy || paused || hintOpen;
  const coloringFocused = preferences.boardColoring && colorMode && !hintOpen;
  const syncCandidateSelection = useCallback(
    (next: readonly CellIndex[]) => {
      setMultiCells(next);
      onSelectCell(next.length === 1 ? next[0] : null);
    },
    [onSelectCell, setMultiCells],
  );
  const clearCandidateSelection = useCallback(() => {
    syncCandidateSelection([]);
    setMultiSelectBlockedCell(null);
    multiSelectBlockedOpacity.setValue(0);
  }, [multiSelectBlockedOpacity, syncCandidateSelection]);
  const toggleMultiSelect = useCallback(() => {
    const enabled = !preferences.multiSelectEnabled;
    if (!enabled) clearCandidateSelection();
    onMultiSelectEnabledChange?.(enabled);
  }, [
    clearCandidateSelection,
    onMultiSelectEnabledChange,
    preferences.multiSelectEnabled,
  ]);
  const clearSelectionFromBackground = useCallback(
    (event: GestureResponderEvent) => {
      if (
        multiSelectEnabled &&
        !coloringFocused &&
        !interactionDisabled &&
        !forcingSession &&
        !autoFinishRunning &&
        multiCellsRef.current.length > 0 &&
        event.target === event.currentTarget
      ) {
        clearCandidateSelection();
      }
    },
    [
      autoFinishRunning,
      clearCandidateSelection,
      coloringFocused,
      forcingSession,
      interactionDisabled,
      multiSelectEnabled,
    ],
  );
  useEffect(() => {
    if (!multiSelectEnabled) {
      if (multiCells.length > 0) clearCandidateSelection();
      return;
    }
    const grid = activeCandidateGrid;
    const boardValues = values;
    if (!grid || !boardValues) return;
    const next = multiCells.filter(
      cell => boardValues[cell] === null && grid[cell] !== 0,
    );
    if (
      next.length !== multiCells.length ||
      next.some((cell, index) => cell !== multiCells[index])
    ) {
      syncCandidateSelection(next);
    }
  }, [
    activeCandidateGrid,
    clearCandidateSelection,
    multiCells,
    multiSelectEnabled,
    syncCandidateSelection,
    values,
  ]);
  const selectCell = useCallback(
    (cell: CellIndex) => {
      const grid = activeCandidateGridRef.current;
      if (
        multiSelectEnabled &&
        valuesRef.current?.[cell] === null &&
        grid?.[cell] !== 0
      ) {
        const current = multiCellsRef.current;
        const next = current.includes(cell)
          ? current.filter(selected => selected !== cell)
          : [...current, cell].sort((left, right) => left - right);
        syncCandidateSelection(next);
        onReplayFocusChange?.(next.length === 1 ? next[0] : null, null);
        return;
      }
      if (multiCellsRef.current.length > 0) setMultiCells([]);
      onSelectCell(cell);
      onReplayFocusChange?.(
        cell,
        selectedDigit ?? valuesRef.current?.[cell] ?? null,
      );
      if (
        preferences.inputMode === 'digit_first' &&
        selectedDigit !== null &&
        !interactionDisabled
      ) {
        onDigit(selectedDigit);
      }
    },
    [
      onSelectCell,
      onReplayFocusChange,
      onDigit,
      preferences.inputMode,
      multiSelectEnabled,
      selectedDigit,
      interactionDisabled,
      setMultiCells,
      syncCandidateSelection,
    ],
  );
  const selectDraggedCells = useCallback(
    (cells: readonly CellIndex[]) => {
      const grid = activeCandidateGridRef.current;
      if (!multiSelectEnabled || !grid) return;
      const eligible = cells.filter(
        cell => valuesRef.current?.[cell] === null && grid[cell] !== 0,
      );
      if (eligible.length === 0) return;
      const next = [...new Set([...multiCellsRef.current, ...eligible])].sort(
        (left, right) => left - right,
      ) as CellIndex[];
      syncCandidateSelection(next);
    },
    [multiSelectEnabled, syncCandidateSelection],
  );

  const forcingBranchA = useMemo(
    () => (forcingSession ? deriveInferenceBranch(forcingSession, 'a') : null),
    [forcingSession],
  );
  const forcingBranchB = useMemo(
    () => (forcingSession ? deriveInferenceBranch(forcingSession, 'b') : null),
    [forcingSession],
  );
  const forcingResults = useMemo(
    () =>
      forcingSession && forcingPathBRevealed
        ? inferenceConclusions(forcingSession)
        : [],
    [forcingPathBRevealed, forcingSession],
  );
  const forcingResult = forcingResults[0] ?? null;
  const forcingSharedEliminations = useMemo(
    () =>
      new Set(
        forcingResults
          .filter(
            result =>
              result.reason === 'shared_result' && result.action === 'remove',
          )
          .map(result => `${result.cell}:${result.digit}`),
      ),
    [forcingResults],
  );
  const forcingVisibleContradictions = useMemo(() => {
    const branches = [
      { path: 'a' as const, branch: forcingBranchA },
      { path: 'b' as const, branch: forcingBranchB },
    ];
    return branches.filter(
      ({ path, branch }) =>
        branch?.contradiction &&
        (forcingPathDisplay === 'both' || forcingPath === path) &&
        (path === 'a' || forcingPathBRevealed),
    );
  }, [
    forcingBranchA,
    forcingBranchB,
    forcingPath,
    forcingPathBRevealed,
    forcingPathDisplay,
  ]);
  const forcingCandidateVisuals = useMemo<readonly ReasoningCandidateMark[]>(
    () => [
      ...(forcingPathDisplay === 'both' || forcingPath === 'a'
        ? forcingBranchA?.truths.map(candidate => ({
            ...candidate,
            role:
              forcingSession?.root?.cell === candidate.cell &&
              forcingSession.root.digit === candidate.digit
                ? ('assumption' as const)
                : ('consequence' as const),
            path: 'a' as const,
            truth: 'true' as const,
          })) ?? []
        : []),
      ...(forcingPathDisplay === 'both' || forcingPath === 'a'
        ? forcingBranchA?.eliminations.map(candidate => ({
            ...candidate,
            role: 'consequence' as const,
            path: 'a' as const,
            truth: 'false' as const,
            conclusion: forcingSharedEliminations.has(
              `${candidate.cell}:${candidate.digit}`,
            ),
          })) ?? []
        : []),
      ...(forcingPathBRevealed &&
      (forcingPathDisplay === 'both' || forcingPath === 'b')
        ? forcingBranchB?.truths.map(candidate => ({
            ...candidate,
            role:
              forcingSession?.root?.cell === candidate.cell &&
              forcingSession.root.digit === candidate.digit
                ? ('assumption' as const)
                : ('consequence' as const),
            path: 'b' as const,
            truth: 'true' as const,
          })) ?? []
        : []),
      ...(forcingPathBRevealed &&
      (forcingPathDisplay === 'both' || forcingPath === 'b')
        ? forcingBranchB?.eliminations.map(candidate => ({
            ...candidate,
            role: 'consequence' as const,
            path: 'b' as const,
            truth: 'false' as const,
            conclusion: forcingSharedEliminations.has(
              `${candidate.cell}:${candidate.digit}`,
            ),
          })) ?? []
        : []),
      ...forcingVisibleContradictions.flatMap(({ path, branch }) =>
        branch!.contradiction!.evidence.map(evidence => ({
          ...evidence,
          role: 'consequence' as const,
          path,
        })),
      ),
    ],
    [
      forcingBranchA,
      forcingBranchB,
      forcingPath,
      forcingPathBRevealed,
      forcingPathDisplay,
      forcingSession?.root,
      forcingSharedEliminations,
      forcingVisibleContradictions,
    ],
  );
  const forcingConflicts = useMemo(
    () =>
      forcingVisibleContradictions.map(({ branch }) => branch!.contradiction!),
    [forcingVisibleContradictions],
  );
  const forcingConclusionCells = useMemo<readonly CellIndex[]>(
    () =>
      forcingResult?.reason === 'shared_result'
        ? [...new Set(forcingResults.map(result => result.cell))]
        : [],
    [forcingResult, forcingResults],
  );
  if (!session) {
    return null;
  }
  const state = session.state;
  if (!activeCandidateGrid) {
    return null;
  }
  const hasCompleteVisibleCandidateGrid = state.values.every(
    (value, cell) => value !== null || activeCandidateGrid[cell] !== 0,
  );
  const useVisibleCandidatesForInference =
    (state.candidates.quickDraftGenerated &&
      state.candidates.activeCandidateSource === 'quick') ||
    hasCompleteVisibleCandidateGrid;
  const forcingBranch = forcingPath === 'a' ? forcingBranchA : forcingBranchB;
  const enterForcingMode = () => {
    const validation = validateInferenceEntry(
      state.values,
      activeCandidateGrid,
      state.candidates.inferenceEliminations ?? [],
      useVisibleCandidatesForInference ? 'visible' : 'solver',
    );
    if (validation.invalidCells.length > 0) {
      if (forcingFeedbackTimerRef.current) {
        clearTimeout(forcingFeedbackTimerRef.current);
      }
      setForcingInvalidCells(validation.invalidCells);
      inferenceFeedbackOpacity.setValue(1);
      AccessibilityInfo.announceForAccessibility(
        t('game.inferenceInvalidCandidates'),
      );
      forcingFeedbackTimerRef.current = setTimeout(() => {
        setForcingInvalidCells([]);
        inferenceFeedbackOpacity.setValue(0);
        forcingFeedbackTimerRef.current = null;
      }, 1200);
      return;
    }
    setColorMode(false);
    setSelectedDigit(null);
    setForcingPath('a');
    setForcingPathDisplay('both');
    setForcingPathBRevealed(false);
    setForcingTruth('true');
    setForcingCells([]);
    setForcingMultiSelect(false);
    setForcingSession(
      createInferenceSession(state.values, validation.candidateGrid),
    );
  };
  const exitForcingMode = () => {
    setForcingSession(null);
    setForcingPath('a');
    setForcingPathDisplay('both');
    setForcingPathBRevealed(false);
    setForcingTruth('true');
    setForcingCells([]);
    setForcingMultiSelect(false);
  };
  const clearForcingMode = () => {
    setForcingSession(current =>
      current
        ? createInferenceSession(current.board, current.baseCandidates)
        : current,
    );
    setForcingPath('a');
    setForcingPathDisplay('both');
    setForcingPathBRevealed(false);
    setForcingTruth('true');
    setForcingCells([]);
    setForcingMultiSelect(false);
  };
  const selectForcingCell = (cell: CellIndex) => {
    if (state.values[cell] !== null) {
      showMultiSelectBlockedFeedback(cell);
      return;
    }
    if (forcingMultiSelect) {
      setForcingCells(current =>
        current.includes(cell)
          ? current.filter(selected => selected !== cell)
          : [...current, cell],
      );
    } else {
      setForcingCells([cell]);
    }
  };
  const startForcingMultiSelection = (cell: CellIndex) => {
    if (state.values[cell] !== null) return;
    setForcingMultiSelect(true);
    setForcingCells(current =>
      current.includes(cell) ? current : [...current, cell],
    );
  };
  const selectForcingDraggedCells = (cells: readonly CellIndex[]) => {
    const eligible = cells.filter(cell => state.values[cell] === null);
    setForcingCells(
      current => [...new Set([...current, ...eligible])] as CellIndex[],
    );
  };
  const selectForcingDigit = (digit: Digit) => {
    if (!forcingSession || forcingCells.length === 0) return;
    const next = applyInferenceAction(forcingSession, {
      path: forcingPath,
      cells: forcingCells,
      digit,
      truth: forcingTruth,
    });
    if (next === forcingSession) return;
    setForcingSession(next);
    if (!forcingSession.root && next.root && forcingPathDisplay === 'both') {
      setForcingPathBRevealed(true);
    }
    if (!forcingMultiSelect || forcingTruth === 'true') setForcingCells([]);
  };
  const undoForcingStep = () => {
    if (!forcingSession) return;
    const next = undoInferenceAction(forcingSession);
    setForcingSession(next);
    setForcingCells([]);
    if (!next.root) {
      setForcingPath('a');
      setForcingPathDisplay('both');
      setForcingPathBRevealed(false);
    }
  };
  const applyForcingResult = () => {
    if (forcingResults.length === 0 || !onApplyInferenceConclusions) return;
    onApplyInferenceConclusions(forcingResults);
    exitForcingMode();
  };
  const forcingCandidateGrid =
    forcingBranch?.candidates ?? forcingSession?.baseCandidates;
  const candidateSelectionSuspended =
    Boolean(forcingSession) ||
    coloringFocused ||
    hintOpen ||
    paused ||
    snapshot.busy ||
    autoFinishRunning;
  const candidateSelectionInteractive =
    multiSelectEnabled && !candidateSelectionSuspended;
  const batchCandidateSelection =
    candidateSelectionInteractive && multiCells.length >= 2;
  const multiSelectCandidateCounts = DIGITS.reduce<Record<number, number>>(
    (result, digit) => {
      result[digit] = multiCells.filter(cell =>
        hasCandidate(activeCandidateGrid[cell], digit),
      ).length;
      return result;
    },
    {},
  );
  const actionStrip = forcingSession
    ? null
    : resolveContextualActionStrip({
        paused,
        hintOpen,
        busy: snapshot.busy || autoFinishRunning,
        autoCompleteAvailable:
          autoFinish?.visibleCount === null && onAutoComplete !== undefined,
      });
  const displayedState =
    autoFinishRunning && autoFinishValues
      ? { ...state, values: autoFinishValues, selectedCell: null }
      : state;
  const forcingDisplayedState = forcingSession
    ? { ...displayedState, selectedCell: null }
    : displayedState;
  const difficultyScore =
    snapshot.puzzle?.id === state.puzzleId
      ? snapshot.puzzle.difficultyScore
      : null;
  const difficultyLabel =
    difficultyScore === null
      ? t('game.level', { level: state.difficultyLevel })
      : `${t('game.level', { level: state.difficultyLevel })} · ${t(
          'game.difficultyScore',
          { score: formatDifficultyScore(difficultyScore, locale) },
        )}`;
  const selectDigit = (digit: Digit) => {
    if (forcingSession) {
      selectForcingDigit(digit);
      return;
    }
    if (coloringFocused) return;
    if (batchCandidateSelection) {
      onRemoveCandidateFromCells(multiCells, digit);
      onReplayFocusChange?.(null, digit);
      return;
    }
    if (preferences.inputMode === 'digit_first') {
      const next = selectedDigit === digit ? null : digit;
      setSelectedDigit(next);
      onReplayFocusChange?.(state.selectedCell, next);
      return;
    }
    onDigit(digit);
  };
  const forcingDigitCounts = DIGITS.reduce<Record<number, number>>(
    (result, digit) => {
      result[digit] = forcingCells.filter(cell =>
        hasCandidate(forcingCandidateGrid?.[cell] ?? 0, digit),
      ).length;
      return result;
    },
    {},
  );
  const landscapeBoardMaxSize = useLandscapeTabletLayout
    ? gameLandscapeBoardMaxSize(width, height, textScale)
    : undefined;
  const phoneLayoutHeight = screenLayoutHeight ?? height;
  const phoneHintAvailableHeight = !useLandscapeTabletLayout
    ? gamePhoneHintAvailableHeight(width, phoneLayoutHeight, textScale)
    : undefined;
  const phoneHintPanelHeight = !useLandscapeTabletLayout
    ? gamePhoneHintPanelHeight(width, phoneLayoutHeight, textScale)
    : undefined;
  const phoneHintNeedsPageScroll =
    phoneHintAvailableHeight !== undefined &&
    phoneHintAvailableHeight < PHONE_HINT_MIN_HEIGHT;
  const landscapeControlsWidth = useLandscapeTabletLayout
    ? gameLandscapeControlsWidth(width)
    : undefined;
  const landscapeHorizontalGutter =
    useLandscapeTabletLayout &&
    landscapeBoardMaxSize !== undefined &&
    landscapeControlsWidth !== undefined
      ? gameLandscapeHorizontalGutter(
          width,
          landscapeBoardMaxSize,
          landscapeControlsWidth,
        )
      : undefined;
  const renderHintProgress = () =>
    hintPresentation ? (
      <View
        accessible
        accessibilityLabel={t('hint.stepProgress', {
          current: hintPageIndex + 1,
          total: hintPresentation.pages.length,
        })}
        style={styles.hintDots}
      >
        {hintPresentation.pages.length <= 9 ? (
          hintPresentation.pages.map((page, index) => (
            <View
              key={`${page.kind}:${index}`}
              style={[
                styles.hintDot,
                index === hintPageIndex && styles.hintDotActive,
              ]}
            />
          ))
        ) : (
          <Text style={styles.hintProgressText}>
            {t('hint.stepProgress', {
              current: hintPageIndex + 1,
              total: hintPresentation.pages.length,
            })}
          </Text>
        )}
      </View>
    ) : null;
  const renderHintActions = () =>
    hintPresentation ? (
      <View style={styles.hintActions} testID="hint-actions">
        <Pressable
          accessibilityRole="button"
          disabled={hintApplying}
          onPress={
            hintPageIndex === 0
              ? onDismissHint
              : () => setHintPageIndex(index => index - 1)
          }
          style={styles.secondaryButton}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.secondaryButtonText}>
            {hintPageIndex === 0 ? t('hint.close') : t('hint.back')}
          </Text>
        </Pressable>
        {hintPageIndex < hintPresentation.pages.length - 1 ? (
          <Pressable
            accessibilityLabel={t('hint.showResultAccessibility')}
            accessibilityRole="button"
            disabled={hintApplying}
            onPress={() => setHintPageIndex(hintPresentation.pages.length - 1)}
            style={styles.conclusionButton}
          >
            <Text
              maxFontSizeMultiplier={1.4}
              style={styles.conclusionButtonText}
            >
              {t('hint.showResult')}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={hintApplying}
          onPress={
            hintPageIndex === hintPresentation.pages.length - 1
              ? applyPresentedHint
              : () => setHintPageIndex(index => index + 1)
          }
          style={styles.primaryCompact}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.primaryButtonText}>
            {hintPageIndex === hintPresentation.pages.length - 1
              ? hintApplying
                ? t('hint.applying')
                : t('hint.applyStep')
              : t('hint.next')}
          </Text>
        </Pressable>
      </View>
    ) : null;
  return (
    <View
      collapsable={false}
      onLayout={event => {
        const nextHeight = event.nativeEvent.layout.height;
        setScreenLayoutHeight(currentHeight =>
          currentHeight === nextHeight ? currentHeight : nextHeight,
        );
      }}
      onTouchEnd={clearSelectionFromBackground}
      ref={rootRef}
      style={styles.root}
      testID="game-screen-root"
    >
      <View style={styles.header} testID="game-header">
        <Pressable
          accessibilityLabel={
            forcingSession ? t('game.inferenceExit') : t('game.home')
          }
          accessibilityRole="button"
          onPress={forcingSession ? exitForcingMode : onBack}
          style={styles.headerButton}
          testID={forcingSession ? 'inference-exit' : undefined}
        >
          <View style={styles.headerButtonContent}>
            <AppIcon
              color={palette.accent}
              name="back"
              size={APP_ICON_SIZE.standard}
            />
            <Text maxFontSizeMultiplier={1.4} style={styles.headerButtonText}>
              {forcingSession ? t('game.inferenceExit') : t('game.home')}
            </Text>
          </View>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text
            accessibilityLabel={difficultyLabel}
            maxFontSizeMultiplier={1.25}
            numberOfLines={1}
            style={styles.level}
            testID="game-difficulty"
          >
            {forcingSession
              ? t('game.inferencePathTitle', {
                  path: forcingPath.toUpperCase(),
                })
              : t('game.level', { level: state.difficultyLevel })}
          </Text>
        </View>
        <View style={styles.headerEnd}>
          {!forcingSession && preferences.showTimer ? (
            <GameTimer state={state} textScale={textScale} />
          ) : null}
          {!forcingSession ? (
            <Pressable
              accessibilityLabel={t('game.pause')}
              accessibilityRole="button"
              hitSlop={16}
              onPress={onPause}
              style={styles.pauseButton}
            >
              <AppIcon
                color={palette.muted}
                name="pause"
                size={APP_ICON_SIZE.standard}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        {...scroll}
        contentContainerStyle={[
          styles.content,
          useLandscapeTabletLayout && styles.contentLandscape,
        ]}
        scrollEnabled={
          !hintOpen || useLandscapeTabletLayout || phoneHintNeedsPageScroll
        }
        showsVerticalScrollIndicator={false}
        testID="game-scroll-view"
      >
        <View
          style={[
            styles.playArea,
            useLandscapeTabletLayout && styles.playAreaLandscape,
            useLandscapeTabletLayout &&
              landscapeHorizontalGutter !== undefined && {
                columnGap: landscapeHorizontalGutter,
                paddingHorizontal: landscapeHorizontalGutter,
              },
          ]}
          onTouchEnd={clearSelectionFromBackground}
          testID={
            useLandscapeTabletLayout
              ? 'game-landscape-layout'
              : 'game-portrait-layout'
          }
        >
          <View
            style={[
              styles.boardPane,
              useLandscapeTabletLayout && styles.boardPaneLandscape,
              useLandscapeTabletLayout &&
                landscapeBoardMaxSize !== undefined && {
                  width: landscapeBoardMaxSize,
                },
            ]}
          >
            {!forcingSession ? (
              <View style={styles.gameMeta} testID="game-meta">
                <Text
                  maxFontSizeMultiplier={1.4}
                  numberOfLines={1}
                  style={styles.metaText}
                  testID="game-mistakes"
                >
                  {forcingInvalidCells.length > 0
                    ? t('game.inferenceInvalidCandidates')
                    : t('game.mistakes', { count: state.errorCount })}
                </Text>
                {!hintOpen &&
                !paused &&
                !snapshot.busy &&
                !autoFinishRunning ? (
                  <Pressable
                    accessibilityLabel={t('game.inferenceStart')}
                    accessibilityRole="button"
                    hitSlop={10}
                    onPress={enterForcingMode}
                    style={[
                      styles.inferenceEntry,
                      { right: inferenceEntryRightInset },
                    ]}
                    testID="inference-start"
                  >
                    <Text style={styles.inferenceEntryText}>
                      {t('game.inferenceStart')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <View>
              <View>
                <SudokuBoard
                  feedbackCells={
                    multiSelectBlockedCell !== null
                      ? [multiSelectBlockedCell]
                      : forcingInvalidCells.length > 0
                      ? forcingInvalidCells
                      : gameplayFeedback?.target === 'board'
                      ? gameplayFeedback.cells
                      : []
                  }
                  feedbackOpacity={
                    multiSelectBlockedCell !== null
                      ? multiSelectBlockedOpacity
                      : forcingInvalidCells.length > 0
                      ? inferenceFeedbackOpacity
                      : gameplayFeedback?.target === 'board'
                      ? feedbackOpacity
                      : undefined
                  }
                  feedbackTone={
                    multiSelectBlockedCell !== null
                      ? 'notice'
                      : forcingInvalidCells.length > 0
                      ? 'error'
                      : gameplayFeedback?.tone
                  }
                  feedbackWholeBoard={
                    multiSelectBlockedCell === null &&
                    gameplayFeedback?.target === 'board' &&
                    gameplayFeedback.cells.length === 0
                  }
                  coloringFocused={!forcingSession && coloringFocused}
                  coloringColor={
                    !forcingSession && coloringFocused && !interactionDisabled
                      ? selectedColor
                      : null
                  }
                  onColorCells={(cells, toggleSameColor) =>
                    onColorCells?.(cells, selectedColor, toggleSameColor)
                  }
                  boardRef={boardRef}
                  accessibilityHidden={paused}
                  disabled={interactionDisabled}
                  hintVisuals={hintPage?.visuals}
                  hintAnimations={preferences.hintAnimations}
                  highlightDigit={
                    forcingSession || coloringFocused ? null : selectedDigit
                  }
                  showSelection={
                    Boolean(forcingSession) ||
                    coloringFocused ||
                    candidateSelectionInteractive ||
                    hintOpen ||
                    preferences.inputMode === 'cell_first'
                  }
                  blendSelectionBackground={
                    !forcingSession && !coloringFocused && !hintOpen
                  }
                  highlightRegions={
                    !forcingSession &&
                    !coloringFocused &&
                    preferences.highlightRegions
                  }
                  highlightSameDigit={
                    !forcingSession &&
                    !coloringFocused &&
                    preferences.highlightSameDigit
                  }
                  highlightCandidateNotes={
                    !forcingSession &&
                    !coloringFocused &&
                    preferences.highlightCandidateNotes
                  }
                  outlineUniqueCandidateNotes={
                    !forcingSession &&
                    !coloringFocused &&
                    preferences.outlineUniqueCandidateNotes
                  }
                  oneTapFill={
                    !forcingSession &&
                    !coloringFocused &&
                    !batchCandidateSelection &&
                    preferences.oneTapFill &&
                    state.difficultyLevel >= 4
                  }
                  onOneTapFill={onOneTapFill}
                  onSelectCell={forcingSession ? selectForcingCell : selectCell}
                  onLongPressCell={
                    forcingSession ? startForcingMultiSelection : undefined
                  }
                  multiSelectActive={
                    forcingSession
                      ? forcingMultiSelect
                      : candidateSelectionInteractive
                  }
                  onDragSelectCells={
                    forcingSession
                      ? selectForcingDraggedCells
                      : selectDraggedCells
                  }
                  selectedCells={
                    forcingSession
                      ? forcingCells
                      : candidateSelectionSuspended || multiCells.length < 2
                      ? []
                      : multiCells
                  }
                  reasoningCandidateGrid={forcingSession?.baseCandidates}
                  reasoningCandidates={forcingCandidateVisuals}
                  reasoningConflicts={forcingConflicts}
                  reasoningConclusionCells={forcingConclusionCells}
                  reasoningSelectionPath={
                    forcingSession ? forcingPath : undefined
                  }
                  state={forcingDisplayedState}
                  maxSize={landscapeBoardMaxSize}
                />
              </View>
            </View>
          </View>

          <View
            style={[
              styles.controlsPane,
              useLandscapeTabletLayout && styles.controlsPaneLandscape,
              useLandscapeTabletLayout &&
                landscapeControlsWidth !== undefined && {
                  width: landscapeControlsWidth,
                },
              useLandscapeTabletLayout &&
                hintOpen &&
                landscapeBoardMaxSize !== undefined && [
                  styles.controlsPaneLandscapeHint,
                  {
                    height: gameLandscapeHintPanelHeight(landscapeBoardMaxSize),
                    transform: [{ translateY: LANDSCAPE_GAME_META_HEIGHT / 2 }],
                  },
                ],
            ]}
            testID={
              useLandscapeTabletLayout && hintOpen
                ? 'tablet-hint-panel'
                : undefined
            }
          >
            {forcingSession ? (
              <View
                style={[
                  styles.inferencePanel,
                  useLandscapeTabletLayout && styles.inferencePanelLandscape,
                ]}
                testID="inference-controls"
              >
                <View
                  style={styles.inferenceSegmentRow}
                  testID="inference-edit-controls"
                >
                  {(['a', 'b'] as const).map(path => (
                    <Pressable
                      key={path}
                      accessibilityLabel={t('game.inferencePath', {
                        path: path.toUpperCase(),
                      })}
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: forcingPath === path,
                        disabled: path === 'b' && !forcingSession.root,
                      }}
                      disabled={path === 'b' && !forcingSession.root}
                      onPress={() => {
                        setForcingPath(path);
                        if (path === 'b') setForcingPathBRevealed(true);
                        setForcingCells([]);
                      }}
                      style={[
                        styles.inferencePathButton,
                        path === 'a'
                          ? styles.inferencePathA
                          : styles.inferencePathB,
                        forcingPath === path &&
                          (path === 'a'
                            ? styles.inferencePathASelected
                            : styles.inferencePathBSelected),
                        path === 'b' &&
                          !forcingSession.root &&
                          styles.inferenceControlDisabled,
                      ]}
                      testID={`inference-path-${path}`}
                    >
                      <View
                        style={[
                          styles.inferencePathSwatch,
                          {
                            backgroundColor:
                              path === 'a'
                                ? boardTheme.colors.reasoningPathA
                                : boardTheme.colors.reasoningPathB,
                          },
                        ]}
                        testID={`inference-path-swatch-${path}`}
                      />
                      <Text
                        style={[
                          styles.inferencePathButtonText,
                          path === 'a'
                            ? styles.inferencePathAText
                            : styles.inferencePathBText,
                        ]}
                      >
                        {t('game.inferencePath', {
                          path: path.toUpperCase(),
                        })}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    accessibilityLabel={`${t('game.inferenceDisplay')} ${
                      forcingPathDisplay === 'both'
                        ? 'A+B'
                        : forcingPath.toUpperCase()
                    }`}
                    accessibilityRole="switch"
                    accessibilityState={{
                      checked: forcingPathDisplay === 'both',
                    }}
                    onPress={() => {
                      const nextDisplay =
                        forcingPathDisplay === 'both' ? 'current' : 'both';
                      setForcingPathDisplay(nextDisplay);
                      if (nextDisplay === 'both' && forcingSession.root) {
                        setForcingPathBRevealed(true);
                      }
                    }}
                    style={styles.inferenceDisplaySwitch}
                    testID="inference-display-toggle"
                  >
                    <View
                      style={[
                        styles.inferenceDisplaySwitchOption,
                        forcingPathDisplay === 'current' &&
                          (forcingPath === 'a'
                            ? styles.inferenceDisplayCurrentA
                            : styles.inferenceDisplayCurrentB),
                      ]}
                    >
                      <Text
                        style={[
                          styles.inferenceDisplaySwitchText,
                          forcingPathDisplay === 'current' &&
                            (forcingPath === 'a'
                              ? styles.inferencePathAText
                              : styles.inferencePathBText),
                        ]}
                      >
                        {forcingPath.toUpperCase()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.inferenceDisplaySwitchOption,
                        forcingPathDisplay === 'both' &&
                          styles.inferenceDisplayBoth,
                      ]}
                    >
                      <Text
                        style={[
                          styles.inferenceDisplaySwitchText,
                          forcingPathDisplay === 'both' &&
                            styles.inferenceDisplayBothText,
                        ]}
                      >
                        A+B
                      </Text>
                    </View>
                  </Pressable>
                </View>
                <View style={styles.inferenceSegmentRow}>
                  {(['true', 'false'] as const).map(truth => (
                    <Pressable
                      key={truth}
                      accessibilityRole="button"
                      accessibilityState={{ selected: forcingTruth === truth }}
                      onPress={() => setForcingTruth(truth)}
                      style={[
                        styles.inferenceTruthButton,
                        forcingTruth === truth &&
                          (truth === 'true'
                            ? styles.inferenceTrueSelected
                            : styles.inferenceFalseSelected),
                      ]}
                      testID={`inference-truth-${truth}`}
                    >
                      <Text style={styles.inferenceTruthButtonText}>
                        {t(
                          truth === 'true'
                            ? 'game.inferenceTrue'
                            : 'game.inferenceFalse',
                        )}
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: forcingMultiSelect }}
                    onPress={() => {
                      setForcingMultiSelect(current => !current);
                      setForcingCells([]);
                    }}
                    style={[
                      styles.inferenceMultiButton,
                      forcingMultiSelect && styles.inferenceMultiSelected,
                    ]}
                    testID="inference-multi-select"
                  >
                    <View style={styles.inferenceMultiContent}>
                      <AppIcon
                        color={palette.ink}
                        name="multiSelect"
                        size={APP_ICON_SIZE.compact}
                      />
                      <Text style={styles.inferenceTruthButtonText}>
                        {t('game.inferenceMulti')}
                      </Text>
                    </View>
                  </Pressable>
                </View>
                <View
                  style={styles.inferenceUtilityRow}
                  testID="inference-utility-controls"
                >
                  <View style={styles.inferenceUtilitySpacer} />
                  <Pressable
                    accessibilityLabel={t('game.inferenceUndo')}
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: forcingSession.actions.length === 0,
                    }}
                    disabled={forcingSession.actions.length === 0}
                    onPress={undoForcingStep}
                    style={[
                      styles.inferenceUtilityButton,
                      forcingSession.actions.length === 0 &&
                        styles.inferenceControlDisabled,
                    ]}
                    testID="inference-undo"
                  >
                    <AppIcon
                      color={palette.accent}
                      name="undo"
                      size={APP_ICON_SIZE.standard}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityLabel={t('game.inferenceClear')}
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: forcingSession.actions.length === 0,
                    }}
                    disabled={forcingSession.actions.length === 0}
                    onPress={clearForcingMode}
                    style={[
                      styles.inferenceUtilityButton,
                      forcingSession.actions.length === 0 &&
                        styles.inferenceControlDisabled,
                    ]}
                    testID="inference-clear"
                  >
                    <Text style={styles.inferenceClearButtonText}>
                      {t('game.inferenceClear')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {actionStrip ? (
              <View
                accessibilityLiveRegion="polite"
                style={styles.contextualActionStrip}
                testID="contextual-action-strip"
              >
                <Text
                  maxFontSizeMultiplier={1.4}
                  numberOfLines={1}
                  style={styles.contextualActionStatus}
                  testID="auto-complete-status"
                >
                  {t('game.autoCompleteReady')}
                </Text>
                <Pressable
                  accessibilityHint={t('game.autoCompleteHint')}
                  accessibilityLabel={t('game.autoComplete')}
                  accessibilityRole="button"
                  onPress={onAutoComplete}
                  style={styles.contextualActionButton}
                  testID="auto-complete-action"
                >
                  <View style={styles.contextualActionContent}>
                    <Text
                      maxFontSizeMultiplier={1.4}
                      numberOfLines={1}
                      style={styles.contextualActionButtonText}
                    >
                      {t('game.autoComplete')}
                    </Text>
                  </View>
                </Pressable>
              </View>
            ) : null}

            <View
              style={[
                styles.numberPad,
                useLandscapeTabletLayout && styles.numberPadLandscape,
                actionStrip && styles.numberPadAfterActionStrip,
                forcingSession && styles.numberPadAfterInference,
                hintOpen && styles.controlsContentHidden,
              ]}
              testID="game-number-pad"
            >
              {DIGITS.map(digit => {
                const multiSelectCandidateCount =
                  multiSelectCandidateCounts[digit];
                const multiSelectCandidateAvailable =
                  multiSelectCandidateCount > 0;
                const forcingCandidateCount = forcingDigitCounts[digit];
                const forcingCandidateAvailable =
                  forcingCandidateCount > 0 &&
                  forcingCells.length > 0 &&
                  !(forcingTruth === 'true' && forcingCells.length !== 1) &&
                  !forcingBranch?.contradiction;
                const digitDisabled = forcingSession
                  ? interactionDisabled || !forcingCandidateAvailable
                  : interactionDisabled ||
                    coloringFocused ||
                    (batchCandidateSelection && !multiSelectCandidateAvailable);
                return (
                  <Pressable
                    key={digit}
                    accessibilityLabel={
                      forcingSession
                        ? t(
                            forcingTruth === 'true'
                              ? 'game.inferenceMarkTrue'
                              : 'game.inferenceMarkFalse',
                            { digit, count: forcingCandidateCount },
                          )
                        : batchCandidateSelection
                        ? t('game.removeCandidateFromSelected', { digit })
                        : t('game.enterDigit', {
                            digit,
                            count: 9 - counts[digit],
                          })
                    }
                    accessibilityRole="button"
                    accessibilityState={{
                      selected:
                        !forcingSession &&
                        !batchCandidateSelection &&
                        preferences.inputMode === 'digit_first' &&
                        selectedDigit === digit,
                      disabled: digitDisabled,
                    }}
                    disabled={digitDisabled}
                    onPress={() => selectDigit(digit)}
                    style={({ pressed }) => [
                      styles.numberKey,
                      useLandscapeTabletLayout && styles.numberKeyLandscape,
                      !batchCandidateSelection &&
                        !forcingSession &&
                        selectedDigit === digit &&
                        styles.numberKeySelected,
                      forcingSession &&
                        !forcingCandidateAvailable &&
                        styles.numberKeyMultiSelectUnavailable,
                      batchCandidateSelection &&
                        !multiSelectCandidateAvailable &&
                        styles.numberKeyMultiSelectUnavailable,
                      !batchCandidateSelection &&
                        counts[digit] >= 9 &&
                        styles.numberKeyComplete,
                      pressed && styles.pressed,
                    ]}
                    testID={`number-key-${digit}`}
                  >
                    <Text allowFontScaling={false} style={styles.numberValue}>
                      {digit}
                    </Text>
                    {forcingSession ? (
                      <Text
                        allowFontScaling={false}
                        style={styles.numberMultiSelectCount}
                        testID={`inference-number-count-${digit}`}
                      >
                        {forcingCandidateCount}
                      </Text>
                    ) : batchCandidateSelection ? (
                      <Text
                        allowFontScaling={false}
                        style={styles.numberMultiSelectCount}
                        testID={`number-multi-select-count-${digit}`}
                      >
                        {multiSelectCandidateCount}
                      </Text>
                    ) : preferences.showRemainingDigits ? (
                      <Text
                        allowFontScaling={false}
                        style={styles.numberRemaining}
                        testID={`number-remaining-${digit}`}
                      >
                        {9 - counts[digit]}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {forcingSession ? (
              <View
                style={[
                  styles.inferenceResultBar,
                  useLandscapeTabletLayout &&
                    styles.inferenceResultBarLandscape,
                ]}
                testID="inference-result-bar"
              >
                <View style={styles.inferenceResultCopy}>
                  <Text
                    numberOfLines={1}
                    style={styles.inferenceResultDetail}
                    testID={
                      forcingResult
                        ? 'inference-conclusion'
                        : forcingBranch?.complete
                        ? 'inference-path-complete'
                        : undefined
                    }
                  >
                    {forcingResults.length > 0
                      ? forcingResults
                          .map(result =>
                            t(
                              result.action === 'place'
                                ? 'game.inferenceConclusionPlace'
                                : 'game.inferenceConclusionRemove',
                              {
                                row: Math.floor(result.cell / 9) + 1,
                                column: (result.cell % 9) + 1,
                                digit: result.digit,
                              },
                            ),
                          )
                          .join(' · ')
                      : forcingBranch?.contradiction
                      ? t('game.inferenceSwitchPath')
                      : forcingBranch?.complete
                      ? t('game.inferencePathComplete', {
                          path: forcingPath.toUpperCase(),
                          nextPath: forcingPath === 'a' ? 'B' : 'A',
                        })
                      : t('game.inferenceNoConclusion')}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled:
                      forcingResults.length === 0 ||
                      !onApplyInferenceConclusions,
                  }}
                  disabled={
                    forcingResults.length === 0 || !onApplyInferenceConclusions
                  }
                  onPress={applyForcingResult}
                  style={[
                    styles.inferenceApplyButton,
                    (forcingResults.length === 0 ||
                      !onApplyInferenceConclusions) &&
                      styles.inferenceControlDisabled,
                  ]}
                  testID="inference-apply"
                >
                  <Text style={styles.inferenceApplyButtonText}>
                    {t('game.inferenceApply')}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View
                style={[
                  styles.toolbar,
                  useLandscapeTabletLayout && styles.toolbarLandscape,
                  hintOpen && styles.controlsContentHidden,
                ]}
                testID="game-toolbar"
              >
                <ToolButton
                  feedbackOpacity={
                    gameplayFeedback?.target === 'undo'
                      ? feedbackOpacity
                      : undefined
                  }
                  disabled={interactionDisabled}
                  label={t('game.undo')}
                  icon="undo"
                  onPress={onUndo}
                  textScale={textScale}
                  landscape={useLandscapeTabletLayout}
                />
                <ToolButton
                  disabled={interactionDisabled}
                  label={t('game.erase')}
                  icon="erase"
                  onPress={onErase}
                  textScale={textScale}
                  landscape={useLandscapeTabletLayout}
                />
                <ToolButton
                  active={state.candidates.activeCandidateSource === 'quick'}
                  feedbackOpacity={
                    gameplayFeedback?.target === 'quick'
                      ? feedbackOpacity
                      : undefined
                  }
                  badge={snapshot.wallet.quick_pencil.balance}
                  disabled={interactionDisabled}
                  label={t('game.quick')}
                  icon="sparkle"
                  onPress={onQuickPencil}
                  onLongPress={onRegenerateQuickPencil}
                  testID="quick-pencil-tool"
                  textScale={textScale}
                  landscape={useLandscapeTabletLayout}
                />
                <ToolButton
                  active={state.candidates.pencilMode}
                  disabled={interactionDisabled}
                  label={t('game.pencil')}
                  icon="pencil"
                  onPress={onPencil}
                  testID="pencil-tool"
                  textScale={textScale}
                  landscape={useLandscapeTabletLayout}
                />
                <ToolButton
                  badge={snapshot.wallet.smart_hint.balance}
                  disabled={interactionDisabled}
                  label={t('game.hint')}
                  icon="hint"
                  onPress={onHint}
                  testID="hint-tool"
                  textScale={textScale}
                  landscape={useLandscapeTabletLayout}
                />
                {preferences.boardColoring ? (
                  <ToolButton
                    active={colorMode && !hintOpen}
                    disabled={interactionDisabled}
                    label={t('game.color')}
                    icon="color"
                    onPress={() => {
                      setColorMode(current => !current);
                    }}
                    testID="color-tool"
                    textScale={textScale}
                    landscape={useLandscapeTabletLayout}
                  />
                ) : null}
                {preferences.inputMode === 'cell_first' ? (
                  <ToolButton
                    active={preferences.multiSelectEnabled}
                    disabled={interactionDisabled}
                    label={t('game.multiSelectStart')}
                    icon="multiSelect"
                    onPress={toggleMultiSelect}
                    testID="multi-select-tool"
                    textScale={textScale}
                    landscape={useLandscapeTabletLayout}
                  />
                ) : null}
              </View>
            )}
            {!forcingSession &&
            preferences.boardColoring &&
            colorMode &&
            !hintOpen ? (
              <View style={styles.colorPalette} testID="color-palette">
                {BOARD_COLOR_SWATCHES.map((swatch, index) => (
                  <Pressable
                    key={index}
                    accessibilityLabel={t('game.colorNumber', {
                      number: index + 1,
                    })}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: selectedColor === index,
                    }}
                    onPress={() => setSelectedColor(index as BoardColor)}
                    style={[
                      styles.colorSwatch,
                      { backgroundColor: swatch },
                      selectedColor === index && styles.colorSwatchSelected,
                    ]}
                    testID={`color-swatch-${index}`}
                  />
                ))}
                <Pressable
                  accessibilityRole="button"
                  onPress={onClearBoardColors}
                  style={styles.clearColors}
                  testID="color-clear-all"
                >
                  <Text style={styles.clearColorsText}>
                    {t('game.clearColors')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {useLandscapeTabletLayout &&
            hintOpen &&
            hintPresentation &&
            hintPage ? (
              <Animated.View
                style={[
                  styles.hintPanelLandscape,
                  {
                    opacity: hintEntrance,
                    transform: [
                      {
                        translateY: hintEntrance.interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, 0],
                        }),
                      },
                      { scale: hintApplyScale },
                    ],
                  },
                ]}
              >
                <View style={styles.hintHeaderLandscape}>
                  <Text style={styles.hintEyebrow}>{t('hint.smart')}</Text>
                  <Text accessibilityRole="header" style={styles.hintTitle}>
                    {hintPresentation.techniqueName}
                  </Text>
                </View>
                <ScrollView
                  contentContainerStyle={styles.hintCopyContentLandscape}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  style={styles.hintCopyLandscape}
                  testID="tablet-hint-scroll"
                >
                  <Text accessibilityRole="header" style={styles.hintPageTitle}>
                    {hintPage.title}
                  </Text>
                  <Text style={styles.hintBody}>{hintPage.body}</Text>
                  {renderHintProgress()}
                </ScrollView>
                {renderHintActions()}
              </Animated.View>
            ) : null}
            {!useLandscapeTabletLayout &&
            hintOpen &&
            hintPresentation &&
            hintPage &&
            phoneHintPanelHeight !== undefined ? (
              <Animated.View
                style={[
                  styles.hintCard,
                  {
                    height: phoneHintPanelHeight,
                    opacity: hintEntrance,
                    transform: [
                      {
                        translateY: hintEntrance.interpolate({
                          inputRange: [0, 1],
                          outputRange: [18, 0],
                        }),
                      },
                      { scale: hintApplyScale },
                    ],
                  },
                ]}
                testID="phone-hint-card"
              >
                <View
                  style={styles.phoneHintHeading}
                  testID="phone-hint-heading"
                >
                  <Text
                    accessibilityRole="header"
                    numberOfLines={1}
                    style={[styles.hintTitle, styles.phoneHintTechnique]}
                  >
                    {hintPresentation.techniqueName}
                  </Text>
                  <Text
                    accessibilityRole="header"
                    numberOfLines={1}
                    style={styles.phoneHintPageTitle}
                    testID="phone-hint-page-title"
                  >
                    {hintPage.title}
                  </Text>
                </View>
                <ScrollView
                  contentContainerStyle={styles.hintCopyContentFixed}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  style={styles.hintCopyFixed}
                  testID="phone-hint-scroll"
                >
                  <Text style={styles.hintBody}>{hintPage.body}</Text>
                  {renderHintProgress()}
                </ScrollView>
                {renderHintActions()}
              </Animated.View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      {paused ? (
        <Modal
          animationType="fade"
          onRequestClose={onResume}
          statusBarTranslucent
          transparent
          visible
        >
          <View style={styles.pauseBackdrop} testID="game-paused">
            <View
              accessibilityViewIsModal
              style={[
                styles.pauseDialog,
                { width: Math.min(Math.max(width * 0.68, 280), 360) },
              ]}
            >
              <View style={styles.pauseSymbolDisc}>
                <View style={styles.pauseSymbolBar} />
                <View style={styles.pauseSymbolBar} />
              </View>
              <Text accessibilityRole="header" style={styles.pauseHeading}>
                {t('game.paused')}
              </Text>
              <Text style={styles.pauseDescription}>
                {t('game.boardHidden')}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={onResume}
                style={styles.pauseContinueButton}
                testID="game-resume-button"
              >
                <Text
                  maxFontSizeMultiplier={1.4}
                  style={styles.pauseContinueText}
                >
                  {t('game.continue')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onAbandon}
                style={styles.pauseAbandonButton}
                testID="game-abandon-button"
              >
                <Text
                  maxFontSizeMultiplier={1.4}
                  style={styles.pauseAbandonText}
                >
                  {t('game.abandon')}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}

      {snapshot.busy && !autoFinishRunning ? (
        <View
          accessibilityLabel={t('app.working')}
          accessibilityLiveRegion="polite"
          pointerEvents="none"
          style={styles.busyIndicator}
        >
          <ActivityIndicator color={palette.accent} size="small" />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(
  palette: AppPalette,
  textScale = 1,
  inferencePalette?: BoardColors,
) {
  return StyleSheet.create({
    root: {
      backgroundColor: palette.background,
      flex: 1,
    },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 56 * textScale,
      paddingHorizontal: 12,
    },
    headerButton: {
      flex: 1,
      paddingVertical: 10 * textScale,
    },
    headerButtonContent: { alignItems: 'center', flexDirection: 'row', gap: 4 },
    headerButtonText: {
      color: palette.accent,
      fontSize: 15 * textScale,
      fontWeight: '700',
    },
    headerCenter: {
      alignItems: 'center',
      flex: 1,
      flexShrink: 1,
      minWidth: 0,
    },
    headerEnd: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      minWidth: 0,
    },
    level: {
      color: palette.ink,
      fontSize: 14 * textScale,
      fontWeight: '700',
    },
    timer: {
      color: palette.muted,
      fontSize: 15 * textScale,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    pauseButton: {
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
      minHeight: 44,
    },
    content: {
      paddingBottom: 28,
    },
    contentLandscape: {
      flexGrow: 1,
      paddingBottom: 12,
    },
    playArea: {
      alignSelf: 'center',
      maxWidth: 720,
      width: '100%',
    },
    playAreaLandscape: {
      alignItems: 'center',
      alignSelf: 'stretch',
      flex: 1,
      flexDirection: 'row',
      maxWidth: '100%',
    },
    boardPane: {},
    boardPaneLandscape: {
      alignItems: 'center',
      flexShrink: 0,
      minWidth: 0,
    },
    controlsPane: {},
    controlsPaneLandscape: {
      alignSelf: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 20,
      borderWidth: 1,
      justifyContent: 'center',
      maxWidth: 400,
      minWidth: 300,
      padding: 12,
    },
    controlsPaneLandscapeHint: {
      justifyContent: 'flex-start',
    },
    controlsContentHidden: {
      display: 'none',
    },
    gameMeta: {
      alignItems: 'center',
      alignSelf: 'stretch',
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 10,
      minHeight: 28,
      paddingHorizontal: 48,
      position: 'relative',
    },
    metaText: {
      color: palette.muted,
      fontSize: 12 * textScale,
      fontWeight: '600',
    },
    inferenceEntry: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 7,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 26 * textScale,
      paddingHorizontal: 9,
      position: 'absolute',
      right: 0,
      top: 1,
    },
    inferenceEntryText: {
      color: palette.accent,
      fontSize: 10 * textScale,
      fontWeight: '700',
    },
    pauseBackdrop: {
      alignItems: 'center',
      backgroundColor: 'rgba(20, 24, 22, 0.72)',
      flex: 1,
      justifyContent: 'center',
    },
    pauseDialog: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderRadius: 16,
      paddingBottom: 24,
      paddingHorizontal: 22,
      paddingTop: 21,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 16,
      transform: [{ translateY: -28 }],
    },
    pauseSymbolDisc: {
      alignItems: 'center',
      backgroundColor: palette.accentSoft,
      borderRadius: 30,
      flexDirection: 'row',
      height: 60,
      justifyContent: 'center',
      width: 60,
    },
    pauseSymbolBar: {
      backgroundColor: palette.accent,
      borderRadius: 1,
      height: 24,
      marginHorizontal: 3,
      width: 5,
    },
    pauseHeading: {
      color: palette.ink,
      fontSize: 23 * textScale,
      fontWeight: '800',
      marginTop: 14,
      textAlign: 'center',
    },
    pauseDescription: {
      color: palette.muted,
      fontSize: 14 * textScale,
      lineHeight: 21 * textScale,
      marginBottom: 20,
      marginTop: 8,
      textAlign: 'center',
    },
    pauseContinueButton: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 12,
      justifyContent: 'center',
      minHeight: 48 * textScale,
      width: '100%',
    },
    pauseContinueText: {
      color: palette.white,
      fontSize: 17 * textScale,
      fontWeight: '800',
    },
    primaryButtonText: {
      color: palette.white,
      fontSize: 15 * textScale,
      fontWeight: '800',
    },
    pauseAbandonButton: {
      alignItems: 'center',
      borderColor: palette.error,
      borderRadius: 12,
      borderWidth: 1,
      justifyContent: 'center',
      marginTop: 10,
      minHeight: 46 * textScale,
      width: '100%',
    },
    pauseAbandonText: {
      color: palette.error,
      fontSize: 14 * textScale,
      fontWeight: '700',
    },
    numberPad: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 30,
      paddingHorizontal: 12,
    },
    numberPadLandscape: {
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 0,
      paddingHorizontal: 0,
    },
    numberPadAfterActionStrip: {
      marginTop: 12,
    },
    numberPadAfterInference: {
      marginTop: 6,
    },
    inferencePanel: {
      marginHorizontal: 12,
      marginTop: 8,
    },
    inferencePanelLandscape: {
      marginHorizontal: 0,
      marginTop: 0,
    },
    inferenceSegmentRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 6,
    },
    inferencePathButton: {
      alignItems: 'center',
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.line,
      borderRadius: 11,
      borderWidth: 1,
      flexBasis: '30%',
      flexDirection: 'row',
      flexGrow: 1,
      flexShrink: 0,
      gap: 5,
      justifyContent: 'center',
      minHeight: 38 * textScale,
      paddingHorizontal: 5,
    },
    inferencePathA: {
      borderColor: inferencePalette?.reasoningPathA ?? palette.focus,
    },
    inferencePathB: {
      borderColor: inferencePalette?.reasoningPathB ?? palette.hintCandidate,
    },
    inferencePathASelected: {
      backgroundColor:
        inferencePalette?.reasoningPathASoft ?? palette.focusSoft,
      borderColor: inferencePalette?.reasoningPathA ?? palette.focus,
    },
    inferencePathBSelected: {
      backgroundColor:
        inferencePalette?.reasoningPathBSoft ?? palette.hintRegion,
      borderColor: inferencePalette?.reasoningPathB ?? palette.hintCandidate,
    },
    inferencePathButtonText: {
      fontSize: 12 * textScale,
      fontWeight: '800',
    },
    inferencePathAText: {
      color: inferencePalette?.reasoningPathA ?? palette.focus,
    },
    inferencePathBText: {
      color: inferencePalette?.reasoningPathB ?? palette.hintCandidate,
    },
    inferencePathSwatch: {
      borderRadius: 999,
      height: 8 * textScale,
      width: 8 * textScale,
    },
    inferenceClearButtonText: {
      color: palette.error,
      fontSize: 10 * textScale,
      fontWeight: '800',
    },
    inferenceDisplaySwitch: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 10,
      borderWidth: 1,
      flexBasis: '30%',
      flexDirection: 'row',
      flexGrow: 1,
      flexShrink: 0,
      minHeight: 38 * textScale,
      padding: 2,
    },
    inferenceDisplaySwitchOption: {
      alignItems: 'center',
      alignSelf: 'stretch',
      borderRadius: 7,
      flex: 1,
      justifyContent: 'center',
    },
    inferenceDisplayCurrentA: {
      backgroundColor:
        inferencePalette?.reasoningPathASoft ?? palette.focusSoft,
    },
    inferenceDisplayCurrentB: {
      backgroundColor:
        inferencePalette?.reasoningPathBSoft ?? palette.hintRegion,
    },
    inferenceDisplayBoth: {
      backgroundColor: palette.accentSoft,
    },
    inferenceDisplaySwitchText: {
      color: palette.muted,
      fontSize: 10 * textScale,
      fontWeight: '700',
    },
    inferenceDisplayBothText: {
      color: palette.accent,
      fontWeight: '800',
    },
    inferenceTruthButton: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 11,
      borderWidth: 1,
      flexBasis: '30%',
      flexGrow: 1,
      flexShrink: 0,
      justifyContent: 'center',
      minHeight: 38 * textScale,
      paddingHorizontal: 5,
    },
    inferenceTrueSelected: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
    },
    inferenceFalseSelected: {
      backgroundColor: palette.errorSoft,
      borderColor: palette.error,
    },
    inferenceTruthButtonText: {
      color: palette.ink,
      fontSize: 11 * textScale,
      fontWeight: '800',
    },
    inferenceMultiButton: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 11,
      borderWidth: 1,
      flexBasis: '30%',
      flexGrow: 1,
      flexShrink: 0,
      justifyContent: 'center',
      minHeight: 38 * textScale,
      paddingHorizontal: 5,
    },
    inferenceMultiContent: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 4,
    },
    inferenceMultiSelected: {
      backgroundColor: palette.selected,
      borderColor: palette.focus,
    },
    inferenceControlDisabled: {
      opacity: 0.38,
    },
    inferenceUtilityRow: {
      flexDirection: 'row',
      gap: 8,
    },
    inferenceUtilitySpacer: {
      flexBasis: '30%',
      flexGrow: 1,
      flexShrink: 0,
    },
    inferenceUtilityButton: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 8,
      borderWidth: 1,
      flexBasis: '30%',
      flexGrow: 1,
      flexShrink: 0,
      justifyContent: 'center',
      minHeight: 28 * textScale,
      paddingHorizontal: 5,
    },
    inferenceResultBar: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: 12,
      marginTop: 14,
      minHeight: 58 * textScale,
      paddingLeft: 14,
      paddingRight: 6,
    },
    inferenceResultBarLandscape: {
      marginHorizontal: 0,
    },
    inferenceResultCopy: {
      flex: 1,
      marginRight: 8,
      minWidth: 0,
    },
    inferenceResultDetail: {
      color: palette.ink,
      fontSize: 12 * textScale,
      fontWeight: '700',
    },
    inferenceApplyButton: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 9,
      justifyContent: 'center',
      minHeight: 44 * textScale,
      minWidth: 76 * textScale,
      paddingHorizontal: 10,
    },
    inferenceApplyButtonText: {
      color: palette.white,
      fontSize: 13 * textScale,
      fontWeight: '800',
    },
    contextualActionStrip: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 12,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: 12,
      marginTop: 14,
      minHeight: 44 * textScale,
      paddingLeft: 14,
      paddingRight: 5,
    },
    contextualActionStatus: {
      color: palette.ink,
      flexShrink: 1,
      fontSize: 13 * textScale,
      fontWeight: '600',
    },
    contextualActionButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44 * textScale,
      minWidth: 64 * textScale,
      paddingHorizontal: 10,
    },
    contextualActionButtonText: {
      color: palette.accent,
      fontSize: 14 * textScale,
      fontWeight: '700',
    },
    contextualActionContent: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 5,
    },
    numberKey: {
      alignItems: 'center',
      borderRadius: 10,
      flex: 1,
      marginHorizontal: 2,
      paddingVertical: 6,
    },
    numberKeyLandscape: {
      backgroundColor: palette.background,
      borderColor: palette.line,
      borderWidth: StyleSheet.hairlineWidth,
      flexBasis: '30%',
      flexGrow: 1,
      flexShrink: 0,
      marginHorizontal: 0,
      minHeight: 56 * textScale,
      paddingVertical: 2,
    },
    numberKeyComplete: {
      opacity: 0.38,
    },
    numberKeySelected: {
      backgroundColor: palette.accentSoft,
    },
    numberKeyMultiSelectUnavailable: {
      opacity: 0.38,
    },
    numberValue: {
      color: palette.accent,
      fontSize: 25 * textScale,
      fontWeight: '700',
    },
    numberRemaining: {
      color: palette.muted,
      fontSize: 10 * textScale,
      fontWeight: '600',
      marginTop: -2,
    },
    numberMultiSelectCount: {
      color: palette.accent,
      fontSize: 10 * textScale,
      fontWeight: '700',
      marginTop: -2,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 14,
      paddingHorizontal: 8,
    },
    toolbarLandscape: {
      flexWrap: 'wrap',
      gap: 0,
      paddingHorizontal: 0,
    },
    colorPalette: {
      alignItems: 'center',
      alignSelf: 'stretch',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: 12,
      marginTop: 20,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    colorSwatch: {
      borderColor: palette.line,
      borderRadius: 16,
      borderWidth: 1,
      height: 28,
      width: 28,
    },
    colorSwatchSelected: {
      borderColor: palette.accent,
      borderRadius: 13,
      borderWidth: 2,
      height: 26,
      margin: 1,
      width: 26,
    },
    clearColors: {
      borderLeftColor: palette.line,
      borderLeftWidth: 1,
      marginLeft: 6,
      paddingLeft: 10,
      paddingVertical: 8,
    },
    clearColorsText: { color: palette.muted, fontSize: 11 * textScale },
    tool: {
      alignItems: 'center',
      borderRadius: 13,
      flex: 1,
      marginHorizontal: 2,
      minHeight: 68 * textScale,
      paddingBottom: 7 * textScale,
      paddingTop: 8 * textScale,
      position: 'relative',
    },
    toolLandscape: {
      flexBasis: '33.333333%',
      flexGrow: 0,
      flexShrink: 0,
      marginHorizontal: 0,
      minHeight: 64 * textScale,
      paddingBottom: 5 * textScale,
      paddingTop: 6 * textScale,
    },
    toolFeedback: {
      backgroundColor: palette.selected,
      borderColor: palette.focus,
      borderRadius: 13,
      borderWidth: 1.5,
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    toolIcon: {
      alignItems: 'center',
      height: APP_ICON_SIZE.navigation,
      justifyContent: 'center',
    },
    toolLabel: {
      color: palette.muted,
      fontSize: 10 * textScale,
      fontWeight: '700',
      marginTop: 3,
    },
    toolLabelActive: {
      color: palette.accent,
    },
    badge: {
      alignItems: 'center',
      backgroundColor: palette.selected,
      borderRadius: 9 * textScale,
      height: 18 * textScale,
      justifyContent: 'center',
      minWidth: 18 * textScale,
      paddingHorizontal: 4 * textScale,
      position: 'absolute',
      right: 5,
      top: 4,
    },
    badgeEmpty: {
      backgroundColor: palette.surfaceStrong,
    },
    badgeText: {
      color: palette.ink,
      fontSize: 9 * textScale,
      fontWeight: '900',
    },
    badgeTextEmpty: {
      color: palette.muted,
    },
    hintCard: {
      alignSelf: 'stretch',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 18,
      borderWidth: 1,
      elevation: 8,
      marginHorizontal: 12,
      marginTop: PHONE_HINT_VERTICAL_GAP,
      padding: 18,
      shadowColor: palette.ink,
      shadowOffset: { height: -3, width: 0 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
    },
    hintPanelLandscape: {
      flex: 1,
      width: '100%',
    },
    hintHeaderLandscape: {
      flexShrink: 0,
    },
    hintCopyLandscape: {
      flex: 1,
      marginTop: 12,
    },
    hintCopyContentLandscape: {
      paddingBottom: 12,
    },
    phoneHintHeading: {
      alignItems: 'baseline',
      flexDirection: 'row',
      flexShrink: 0,
      justifyContent: 'flex-start',
      minWidth: 0,
    },
    phoneHintTechnique: {
      flexShrink: 1,
      marginTop: 0,
      minWidth: 0,
    },
    phoneHintPageTitle: {
      color: palette.accent,
      flexShrink: 1,
      fontSize: 13 * textScale,
      fontWeight: '800',
      marginLeft: 8,
      maxWidth: '46%',
    },
    hintCopyFixed: {
      flex: 1,
      marginTop: 12,
    },
    hintCopyContentFixed: {
      paddingBottom: 12,
    },
    hintEyebrow: {
      color: palette.accent,
      fontSize: 10 * textScale,
      fontWeight: '900',
      letterSpacing: 1.4 * textScale,
    },
    hintTitle: {
      color: palette.ink,
      fontSize: 20 * textScale,
      fontWeight: '800',
      marginTop: 4,
      textTransform: 'capitalize',
    },
    hintPageTitle: {
      color: palette.accent,
      fontSize: 13 * textScale,
      fontWeight: '800',
      marginTop: 13,
    },
    hintBody: {
      color: palette.muted,
      fontSize: 14 * textScale,
      lineHeight: 20 * textScale,
      marginTop: 7,
    },
    hintActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'flex-end',
      marginTop: 16,
    },
    hintDots: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 15,
    },
    hintDot: {
      backgroundColor: palette.line,
      borderRadius: 4,
      height: 7,
      marginHorizontal: 3,
      width: 7,
    },
    hintDotActive: {
      backgroundColor: palette.accent,
      width: 18,
    },
    hintProgressText: {
      color: palette.muted,
      fontSize: 11 * textScale,
      fontWeight: '700',
    },
    secondaryButton: {
      borderColor: palette.line,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 18,
      paddingVertical: 11,
    },
    secondaryButtonText: {
      color: palette.ink,
      fontSize: 14 * textScale,
      fontWeight: '700',
    },
    conclusionButton: {
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    conclusionButtonText: {
      color: palette.accent,
      fontSize: 12 * textScale,
      fontWeight: '800',
    },
    primaryCompact: {
      backgroundColor: palette.accent,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 11,
    },
    busyIndicator: {
      backgroundColor: palette.surface,
      borderRadius: 18,
      padding: 8,
      position: 'absolute',
      right: 14,
      top: 68 * textScale,
    },
    pressed: {
      opacity: 0.65,
    },
  });
}
