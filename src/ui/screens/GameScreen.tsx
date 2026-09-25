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
  Easing,
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
  InferenceActionValidationRequest,
  InferencePath,
  InferenceSession,
  InferenceTruth,
  applyInferenceAction,
  createInferenceSession,
  deriveInferenceBranch,
  inferenceConclusions,
  inferenceConclusionsMatchSolution,
  inferenceProofVerification,
  undoInferenceAction,
  updateInferenceActionVerification,
  validateInferenceEntry,
} from '../../domain/game/inference-session';
import { getElapsedMs } from '../../domain/game/engine';
import type { HintStep } from '../../domain/hints/contracts';
import { buildHintPresentation } from '../../domain/hints/presentation';
import type { ReasoningCandidateMark } from '../../domain/reasoning/contracts';
import { CellIndex, Digit } from '../../domain/sudoku/contracts';
import {
  arePeers,
  boardFromFingerprint,
  createSolverCandidates,
  hasCandidate,
} from '../../domain/sudoku/board';
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
  addSelectedCandidateCells,
  candidateBatchRemoval,
  toggleSelectedCandidateCell,
  toggleSelectedCandidateDigit,
} from '../candidate-multi-selection';
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
  onRemoveCandidates(
    cells: readonly CellIndex[],
    digits: readonly Digit[],
  ): void;
  onApplyInferenceConclusions?(
    conclusions: readonly InferenceConclusion[],
  ): void | Promise<void>;
  onValidateInferenceAction?(
    request: InferenceActionValidationRequest,
  ): Promise<boolean>;
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
  onHint(preferredDigit: Digit | null): void;
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
const DIGIT_FIRST_CANDIDATE_FEEDBACK_MS = 480;

type ContextualActionStripState = { kind: 'auto_complete' } | null;

type InferencePathDisplay = 'current' | 'both';

export function resolveHintCompletionFocus(
  step: HintStep,
  currentDigit: Digit | null,
): { cell: CellIndex | null; digit: Digit } | null {
  const placement = step.placements[0];
  if (placement) return { cell: placement.cell, digit: placement.digit };
  if (step.eliminations.length === 0) return null;
  const digit =
    currentDigit !== null &&
    step.eliminations.some(candidate => candidate.digit === currentDigit)
      ? currentDigit
      : step.eliminations[0].digit;
  return { cell: null, digit };
}

export type NumberKeyAction =
  | 'enter_digit'
  | 'add_candidate'
  | 'remove_candidate'
  | 'select_candidate_toggle'
  | 'select_candidate_remove'
  | 'unavailable';

export type NumberKeyFeedback =
  | { kind: 'remaining'; count: number }
  | { kind: 'candidate_add'; count: 1 }
  | { kind: 'candidate_remove'; count: number }
  | { kind: 'candidate_toggle'; count: 1 }
  | null;

type DigitFirstCandidateFeedback = {
  digit: Digit;
  kind: 'add' | 'remove';
};

export type NumberKeyState = {
  action: NumberKeyAction;
  disabled: boolean;
  feedback: NumberKeyFeedback;
};

export function resolveNumberKeyState({
  inputMode,
  hasSelectedCell,
  selectedCellFilled,
  pencilMode,
  candidateSource,
  candidatePresent,
  batchCandidateCount,
  remainingCount,
  digitFirstCandidateFeedback = null,
}: {
  inputMode: ProductPreferences['inputMode'];
  hasSelectedCell: boolean;
  selectedCellFilled: boolean;
  pencilMode: boolean;
  candidateSource: 'manual' | 'quick';
  candidatePresent: boolean;
  batchCandidateCount: number | null;
  remainingCount: number;
  digitFirstCandidateFeedback?: 'add' | 'remove' | null;
}): NumberKeyState {
  if (inputMode === 'digit_first') {
    if (pencilMode) {
      if (candidateSource === 'quick') {
        return {
          action: 'select_candidate_remove',
          disabled: false,
          feedback: { kind: 'candidate_remove', count: 1 },
        };
      }
      return {
        action: 'select_candidate_toggle',
        disabled: false,
        feedback:
          digitFirstCandidateFeedback === 'add'
            ? { kind: 'candidate_add', count: 1 }
            : digitFirstCandidateFeedback === 'remove'
            ? { kind: 'candidate_remove', count: 1 }
            : { kind: 'candidate_toggle', count: 1 },
      };
    }
    return {
      action: 'enter_digit',
      disabled: false,
      feedback: { kind: 'remaining', count: remainingCount },
    };
  }
  if (batchCandidateCount !== null) {
    return batchCandidateCount > 0
      ? {
          action: 'remove_candidate',
          disabled: false,
          feedback: {
            kind: 'candidate_remove',
            count: batchCandidateCount,
          },
        }
      : { action: 'unavailable', disabled: true, feedback: null };
  }
  if (!hasSelectedCell) {
    return {
      action: 'unavailable',
      disabled: true,
      feedback: { kind: 'remaining', count: remainingCount },
    };
  }
  if (selectedCellFilled) {
    return {
      action: 'unavailable',
      disabled: true,
      feedback: { kind: 'remaining', count: remainingCount },
    };
  }
  if (!pencilMode) {
    return {
      action: 'enter_digit',
      disabled: false,
      feedback: { kind: 'remaining', count: remainingCount },
    };
  }
  if (candidatePresent) {
    return {
      action: 'remove_candidate',
      disabled: false,
      feedback: { kind: 'candidate_remove', count: 1 },
    };
  }
  if (candidateSource === 'manual') {
    return {
      action: 'add_candidate',
      disabled: false,
      feedback: { kind: 'candidate_add', count: 1 },
    };
  }
  return { action: 'unavailable', disabled: true, feedback: null };
}

export function numberKeyFeedbackText(
  feedback: NumberKeyFeedback,
): string | null {
  if (feedback === null) return null;
  if (feedback.kind === 'candidate_add') return `+${feedback.count}`;
  if (feedback.kind === 'candidate_remove') return `−${feedback.count}`;
  if (feedback.kind === 'candidate_toggle') return `±${feedback.count}`;
  return String(feedback.count);
}

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

export function gameBoardMetaEdgeInset(
  platform: string,
  useLandscapeTabletLayout: boolean,
): number {
  return platform === 'android' && !useLandscapeTabletLayout
    ? PHONE_BOARD_EDGE_INSET
    : 0;
}

export function gameInferenceEntryRightInset(
  platform: string,
  useLandscapeTabletLayout: boolean,
): number {
  return gameBoardMetaEdgeInset(platform, useLandscapeTabletLayout);
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

function AutoCompleteSwitch({
  autoCompleteRunning,
  onAutoComplete,
  textScale,
}: {
  autoCompleteRunning: boolean;
  onAutoComplete?: () => void;
  textScale: number;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(
    () => createStyles(palette, textScale),
    [palette, textScale],
  );
  const [autoCompleteRequested, setAutoCompleteRequested] = useState(false);
  const autoCompleteActive = autoCompleteRequested || autoCompleteRunning;
  useEffect(() => {
    if (!autoCompleteRunning) setAutoCompleteRequested(false);
  }, [autoCompleteRunning]);

  return (
    <Pressable
      accessibilityHint={t('game.autoCompleteHint')}
      accessibilityLabel={t('game.autoComplete')}
      accessibilityRole="switch"
      accessibilityState={{
        checked: autoCompleteActive,
        disabled: autoCompleteActive,
      }}
      disabled={autoCompleteActive}
      hitSlop={{ bottom: 12, left: 5, right: 5, top: 12 }}
      onPress={() => {
        setAutoCompleteRequested(true);
        onAutoComplete?.();
      }}
      style={({ pressed }) => [
        styles.autoCompleteSwitch,
        autoCompleteActive && styles.autoCompleteSwitchActive,
        pressed && !autoCompleteActive && styles.pressed,
      ]}
      testID="auto-complete-action"
    >
      <View
        style={[
          styles.autoCompleteSwitchThumb,
          autoCompleteActive && styles.autoCompleteSwitchThumbActive,
        ]}
        testID="auto-complete-switch-thumb"
      >
        <AppIcon
          color={autoCompleteActive ? palette.accent : palette.surface}
          name="bolt"
          size={(APP_ICON_SIZE.micro * 2 * textScale) / 3}
        />
      </View>
    </Pressable>
  );
}

type GameControlsPaneProps = Omit<
  React.ComponentProps<typeof View>,
  'testID'
> & {
  paneTestID?: string;
  dockAutoComplete: boolean;
  autoCompleteVisible: boolean;
  autoCompleteRunning: boolean;
  onAutoComplete?: () => void;
  textScale: number;
};

function GameControlsPane({
  dockAutoComplete,
  autoCompleteVisible,
  autoCompleteRunning,
  onAutoComplete,
  textScale,
  paneTestID,
  ...paneProps
}: GameControlsPaneProps): React.JSX.Element {
  const { palette } = useAppTheme();
  const styles = useMemo(
    () => createStyles(palette, textScale),
    [palette, textScale],
  );
  const pane = <View {...paneProps} testID={paneTestID} />;
  if (!dockAutoComplete) return pane;

  return (
    <View style={styles.controlsDock} testID="tablet-controls-dock">
      {pane}
      {autoCompleteVisible ? (
        <View
          style={styles.autoCompleteDockSwitchPosition}
          testID="auto-complete-switch-position"
        >
          <AutoCompleteSwitch
            autoCompleteRunning={autoCompleteRunning}
            onAutoComplete={onAutoComplete}
            textScale={textScale}
          />
        </View>
      ) : null}
    </View>
  );
}

type ToolButtonProps = {
  label: string;
  icon: AppIconName;
  accessibilityHint?: string;
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
  accessibilityHint,
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
      accessibilityHint={accessibilityHint}
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
  onRemoveCandidates,
  onApplyInferenceConclusions,
  onValidateInferenceAction,
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
  const boardMetaEdgeInset = gameBoardMetaEdgeInset(
    Platform.OS,
    useLandscapeTabletLayout,
  );
  const inferenceEntryRightInset = boardMetaEdgeInset;
  const textScale = gameScreenTextScale(width, height);
  const styles = useMemo(
    () => createStyles(palette, textScale, boardTheme.colors),
    [boardTheme.colors, palette, textScale],
  );
  const reduceMotion = useReducedMotion(preferences.hintAnimations);
  const session = snapshot.session;
  const currentSessionId = session?.state.sessionId;
  const sessionKey = `game:${currentSessionId ?? 'none'}`;
  const gameplayFeedback = resolveGameplayFeedback(snapshot);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const inferenceFeedbackOpacity = useRef(new Animated.Value(0)).current;
  const multiSelectBlockedOpacity = useRef(new Animated.Value(0)).current;
  const autoFinishRemovalOpacity = useRef(new Animated.Value(1)).current;
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
  const [candidateBatchActive, setCandidateBatchActive] = useScreenState(
    `${sessionKey}:candidate-batch-active`,
    false,
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
    useState<InferencePathDisplay>('current');
  const [forcingPathBRevealed, setForcingPathBRevealed] = useState(false);
  const [forcingTruth, setForcingTruth] = useState<InferenceTruth>('true');
  const [forcingCells, setForcingCells] = useState<readonly CellIndex[]>([]);
  const [forcingMultiSelect, setForcingMultiSelect] = useState(false);
  const [forcingFocusCell, setForcingFocusCell] = useState<CellIndex | null>(
    null,
  );
  const [forcingFocusDigit, setForcingFocusDigit] = useState<Digit | null>(
    null,
  );
  const [forcingApplying, setForcingApplying] = useState(false);
  const [forcingInvalidCells, setForcingInvalidCells] = useState<
    readonly CellIndex[]
  >([]);
  const forcingFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const forcingActionSequenceRef = useRef(0);
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
    setForcingPathDisplay('current');
    setForcingPathBRevealed(false);
    setForcingTruth('true');
    setForcingCells([]);
    setForcingMultiSelect(false);
    setForcingFocusCell(null);
    setForcingFocusDigit(null);
    setForcingApplying(false);
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
  const autoFinishDisplay = useMemo(() => {
    if (!values || !autoFinish || autoFinish.visibleCount === null) {
      return null;
    }
    const visibleCount = autoFinish.visibleCount;
    const currentPlacement = autoFinish.placements[visibleCount - 1];
    const previouslyCompletedCount = Math.max(0, visibleCount - 1);
    const beforePlacementValues = [...values];
    autoFinish.placements
      .slice(0, previouslyCompletedCount)
      .forEach(({ cell, digit }) => {
        beforePlacementValues[cell] = digit;
      });
    const beforePlacementCandidates = createSolverCandidates(
      beforePlacementValues,
    );
    const next = [...beforePlacementValues];
    if (autoFinish.phase !== 'selection' && currentPlacement) {
      next[currentPlacement.cell] = currentPlacement.digit;
    }
    const showEliminations =
      autoFinish.phase === 'strike' || autoFinish.phase === 'elimination';
    const eliminations =
      showEliminations && currentPlacement
        ? beforePlacementCandidates.flatMap((mask, cell) =>
            beforePlacementValues[cell] === null &&
            arePeers(currentPlacement.cell, cell as CellIndex) &&
            hasCandidate(mask, currentPlacement.digit)
              ? [
                  {
                    cell: cell as CellIndex,
                    digit: currentPlacement.digit,
                  },
                ]
              : [],
          )
        : [];
    return {
      candidates:
        autoFinish.phase === 'elimination'
          ? createSolverCandidates(next)
          : beforePlacementCandidates,
      eliminationAnimationKey: eliminations.length
        ? autoFinish.phase === 'strike'
          ? `auto-finish-${visibleCount}`
          : undefined
        : undefined,
      eliminations,
      removingEliminations: autoFinish.phase === 'elimination',
      selectedCell: currentPlacement?.cell ?? null,
      values: next,
    };
  }, [autoFinish, values]);
  useEffect(() => {
    autoFinishRemovalOpacity.stopAnimation();
    autoFinishRemovalOpacity.setValue(1);
    if (
      autoFinish?.phase !== 'elimination' ||
      !autoFinishDisplay?.eliminations.length
    ) {
      return;
    }
    const animation = Animated.timing(autoFinishRemovalOpacity, {
      duration: 140,
      easing: Easing.out(Easing.cubic),
      toValue: 0,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [
    autoFinish?.phase,
    autoFinish?.visibleCount,
    autoFinishDisplay?.eliminations.length,
    autoFinishRemovalOpacity,
  ]);
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const selectedCellRef = useRef(session?.state.selectedCell ?? null);
  selectedCellRef.current = session?.state.selectedCell ?? null;
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
  const defaultGivenDigit =
    session?.state.givens.find(value => value !== null) ?? null;
  const hintKey = useMemo(
    () => `${sessionKey}:hint:${hintUseCount}:${JSON.stringify(activeHint)}`,
    [sessionKey, activeHint, hintUseCount],
  );
  const [hintPageIndex, setHintPageIndex] = useScreenState(hintKey, 0);
  const [hintApplying, setHintApplying] = useState(false);
  const [selectedDigits, setSelectedDigits] = useScreenState<readonly Digit[]>(
    `${sessionKey}:digits`,
    () =>
      preferences.inputMode === 'digit_first' && defaultGivenDigit !== null
        ? [defaultGivenDigit]
        : [],
  );
  const selectedDigit = selectedDigits.length === 1 ? selectedDigits[0] : null;
  const setSelectedDigit = useCallback(
    (digit: Digit | null) => setSelectedDigits(digit === null ? [] : [digit]),
    [setSelectedDigits],
  );
  const [focusedDigit, setFocusedDigit] = useScreenState<Digit | null>(
    `${sessionKey}:focused-digit`,
    null,
  );
  const [digitFirstCandidateFeedback, setDigitFirstCandidateFeedback] =
    useState<DigitFirstCandidateFeedback | null>(null);
  const digitFirstCandidateFeedbackTimer = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const clearDigitFirstCandidateFeedback = useCallback(() => {
    if (digitFirstCandidateFeedbackTimer.current !== null) {
      clearTimeout(digitFirstCandidateFeedbackTimer.current);
      digitFirstCandidateFeedbackTimer.current = null;
    }
    setDigitFirstCandidateFeedback(null);
  }, []);
  const showDigitFirstCandidateFeedback = useCallback(
    (digit: Digit, kind: DigitFirstCandidateFeedback['kind']) => {
      if (digitFirstCandidateFeedbackTimer.current !== null) {
        clearTimeout(digitFirstCandidateFeedbackTimer.current);
      }
      setDigitFirstCandidateFeedback({ digit, kind });
      digitFirstCandidateFeedbackTimer.current = setTimeout(() => {
        digitFirstCandidateFeedbackTimer.current = null;
        setDigitFirstCandidateFeedback(null);
      }, DIGIT_FIRST_CANDIDATE_FEEDBACK_MS);
    },
    [],
  );
  useEffect(
    () => () => {
      if (digitFirstCandidateFeedbackTimer.current !== null) {
        clearTimeout(digitFirstCandidateFeedbackTimer.current);
      }
    },
    [],
  );
  const fillOneTapCell = useCallback(
    (cell: CellIndex, kind: OneTapFillKind, digit: Digit) => {
      if (preferences.inputMode === 'cell_first') {
        setFocusedDigit(digit);
      }
      onReplayFocusChange?.(cell, digit);
      onOneTapFill(cell, kind);
    },
    [onOneTapFill, onReplayFocusChange, preferences.inputMode, setFocusedDigit],
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

  const initializedInputModeRef = useRef<string | null>(null);
  useEffect(() => {
    const initializationKey = `${sessionKey}:${preferences.inputMode}`;
    if (initializedInputModeRef.current === initializationKey) return;
    initializedInputModeRef.current = initializationKey;
    if (preferences.inputMode === 'cell_first') {
      setSelectedDigit(null);
    } else {
      setFocusedDigit(null);
      if (selectedDigit === null && defaultGivenDigit !== null) {
        setSelectedDigit(defaultGivenDigit);
      }
    }
  }, [
    defaultGivenDigit,
    preferences.inputMode,
    selectedDigit,
    sessionKey,
    setFocusedDigit,
    setSelectedDigit,
  ]);

  useEffect(() => {
    clearDigitFirstCandidateFeedback();
  }, [
    clearDigitFirstCandidateFeedback,
    preferences.inputMode,
    selectedDigit,
    session?.state.candidates.activeCandidateSource,
    session?.state.candidates.pencilMode,
  ]);

  const activeCandidateGrid = session
    ? session.state.candidates.activeCandidateSource === 'quick'
      ? session.state.candidates.quickCandidates
      : session.state.candidates.manualCandidates
    : null;
  const candidateSource =
    session?.state.candidates.activeCandidateSource ?? 'manual';
  const pencilMode = session?.state.candidates.pencilMode ?? false;
  const activeCandidateGridRef = useRef(activeCandidateGrid);
  activeCandidateGridRef.current = activeCandidateGrid;
  const candidateSourceRef = useRef(candidateSource);
  candidateSourceRef.current = candidateSource;
  const pencilModeRef = useRef(pencilMode);
  pencilModeRef.current = pencilMode;
  const onRemoveCandidatesRef = useRef(onRemoveCandidates);
  onRemoveCandidatesRef.current = onRemoveCandidates;
  const multiSelectEnabled = preferences.multiSelectEnabled;
  const cellMultiSelectEnabled =
    preferences.inputMode === 'cell_first' &&
    multiSelectEnabled &&
    pencilMode &&
    candidateBatchActive;
  const digitMultiSelectEnabled =
    preferences.inputMode === 'digit_first' &&
    multiSelectEnabled &&
    pencilMode &&
    candidateBatchActive;

  const applyHintWithFocus = () => {
    if (activeHint) {
      const selectedCell = selectedCellRef.current;
      const selectedValue =
        selectedCell === null
          ? null
          : valuesRef.current?.[selectedCell] ?? null;
      const currentDigit =
        preferences.inputMode === 'digit_first'
          ? selectedDigit ?? focusedDigit ?? selectedValue
          : focusedDigit ?? selectedValue;
      const focus = resolveHintCompletionFocus(activeHint, currentDigit);
      if (focus) {
        setSelectedDigit(null);
        setFocusedDigit(focus.digit);
        onReplayFocusChange?.(
          focus.cell ?? selectedCellRef.current,
          focus.digit,
        );
      }
    }
    onApplyHint();
  };

  const applyPresentedHint = () => {
    if (hintApplying || snapshot.busy) {
      return;
    }
    if (reduceMotion) {
      applyHintWithFocus();
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
        applyHintWithFocus();
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
  const previousInputModeRef = useRef(preferences.inputMode);
  useEffect(() => {
    const inputModeChanged =
      previousInputModeRef.current !== preferences.inputMode;
    previousInputModeRef.current = preferences.inputMode;
    if (!multiSelectEnabled || !pencilMode || inputModeChanged) {
      if (candidateBatchActive) setCandidateBatchActive(false);
      if (multiCells.length > 0) clearCandidateSelection();
      if (selectedDigits.length > 1) setSelectedDigit(null);
    }
  }, [
    candidateBatchActive,
    clearCandidateSelection,
    multiCells.length,
    multiSelectEnabled,
    pencilMode,
    preferences.inputMode,
    selectedDigits.length,
    setCandidateBatchActive,
    setSelectedDigit,
  ]);
  const clearSelectionFromBackground = useCallback(
    (event: GestureResponderEvent) => {
      if (
        cellMultiSelectEnabled &&
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
      cellMultiSelectEnabled,
    ],
  );
  useEffect(() => {
    if (!cellMultiSelectEnabled) {
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
      setMultiCells(next);
      if (next.length === 1) {
        onSelectCell(next[0]);
      } else if (multiCells.length > 1) {
        onSelectCell(null);
      }
    }
  }, [
    activeCandidateGrid,
    clearCandidateSelection,
    multiCells,
    cellMultiSelectEnabled,
    onSelectCell,
    setMultiCells,
    values,
  ]);
  const selectCell = useCallback(
    (cell: CellIndex) => {
      const grid = activeCandidateGridRef.current;
      const previousSelectedCell = selectedCellRef.current;
      const previousSelectedValue =
        previousSelectedCell === null
          ? null
          : valuesRef.current?.[previousSelectedCell] ?? null;
      if (
        cellMultiSelectEnabled &&
        !interactionDisabled &&
        !coloringFocused &&
        !forcingSession &&
        !autoFinishRunning &&
        valuesRef.current?.[cell] === null &&
        grid?.[cell] !== 0
      ) {
        if (focusedDigit === null && previousSelectedValue !== null) {
          setFocusedDigit(previousSelectedValue);
        }
        const next = toggleSelectedCandidateCell(multiCellsRef.current, cell);
        syncCandidateSelection(next);
        onReplayFocusChange?.(
          next.length === 1 ? next[0] : null,
          focusedDigit ?? previousSelectedValue,
        );
        return;
      }
      if (
        (cellMultiSelectEnabled || digitMultiSelectEnabled) &&
        !interactionDisabled &&
        !coloringFocused &&
        !forcingSession &&
        !autoFinishRunning
      ) {
        if (digitMultiSelectEnabled && valuesRef.current?.[cell] === null) {
          onSelectCell(cell);
          onReplayFocusChange?.(cell, selectedDigit);
          const removal = candidateBatchRemoval([cell], selectedDigits);
          if (removal && grid?.[cell] !== 0) {
            onRemoveCandidatesRef.current(removal.cells, removal.digits);
          }
        } else {
          showMultiSelectBlockedFeedback(cell);
        }
        return;
      }
      if (multiCellsRef.current.length > 0) setMultiCells([]);
      const selectedValue = valuesRef.current?.[cell] ?? null;
      let nextFocusedDigit = focusedDigit;
      if (preferences.inputMode === 'cell_first') {
        const candidateCell =
          selectedValue === null && (grid?.[cell] ?? 0) !== 0;
        nextFocusedDigit = candidateCell
          ? focusedDigit ?? previousSelectedValue
          : selectedValue;
        if (focusedDigit !== nextFocusedDigit) {
          setFocusedDigit(nextFocusedDigit);
        }
      }
      onSelectCell(cell);
      onReplayFocusChange?.(
        cell,
        preferences.inputMode === 'cell_first'
          ? nextFocusedDigit
          : selectedDigit ?? selectedValue,
      );
      if (
        preferences.inputMode === 'digit_first' &&
        selectedDigit !== null &&
        !interactionDisabled
      ) {
        const candidateEdit = pencilModeRef.current;
        const targetIsEmpty = valuesRef.current?.[cell] === null;
        const candidatePresent = hasCandidate(grid?.[cell] ?? 0, selectedDigit);
        if (
          candidateEdit &&
          candidateSourceRef.current === 'quick' &&
          targetIsEmpty &&
          !candidatePresent
        ) {
          return;
        }
        if (candidateEdit && targetIsEmpty) {
          showDigitFirstCandidateFeedback(
            selectedDigit,
            candidatePresent ? 'remove' : 'add',
          );
        }
        onDigit(selectedDigit);
      }
    },
    [
      onSelectCell,
      onReplayFocusChange,
      onDigit,
      preferences.inputMode,
      cellMultiSelectEnabled,
      digitMultiSelectEnabled,
      selectedDigits,
      coloringFocused,
      forcingSession,
      autoFinishRunning,
      focusedDigit,
      selectedDigit,
      interactionDisabled,
      showDigitFirstCandidateFeedback,
      setFocusedDigit,
      setMultiCells,
      showMultiSelectBlockedFeedback,
      syncCandidateSelection,
    ],
  );
  const selectDraggedCells = useCallback(
    (cells: readonly CellIndex[]) => {
      const grid = activeCandidateGridRef.current;
      if (
        !cellMultiSelectEnabled ||
        interactionDisabled ||
        coloringFocused ||
        forcingSession ||
        autoFinishRunning ||
        !grid
      )
        return;
      const eligible = cells.filter(
        cell => valuesRef.current?.[cell] === null && grid[cell] !== 0,
      );
      if (eligible.length === 0) return;
      const next = addSelectedCandidateCells(multiCellsRef.current, eligible);
      syncCandidateSelection(next);
    },
    [
      autoFinishRunning,
      cellMultiSelectEnabled,
      coloringFocused,
      forcingSession,
      interactionDisabled,
      syncCandidateSelection,
    ],
  );

  const forcingBranchA = useMemo(
    () => (forcingSession ? deriveInferenceBranch(forcingSession, 'a') : null),
    [forcingSession],
  );
  const forcingBranchB = useMemo(
    () => (forcingSession ? deriveInferenceBranch(forcingSession, 'b') : null),
    [forcingSession],
  );
  const forcingBranch = forcingPath === 'a' ? forcingBranchA : forcingBranchB;
  const forcingResults = useMemo(
    () =>
      forcingSession &&
      (forcingPathBRevealed || Boolean(forcingBranch?.contradiction))
        ? inferenceConclusions(forcingSession)
        : [],
    [forcingBranch?.contradiction, forcingPathBRevealed, forcingSession],
  );
  const forcingResult = forcingResults[0] ?? null;
  const forcingConclusionSafe = useMemo(
    () =>
      !snapshot.puzzle ||
      inferenceConclusionsMatchSolution(
        forcingResults,
        boardFromFingerprint(snapshot.puzzle.solution),
      ),
    [forcingResults, snapshot.puzzle],
  );
  const forcingProofStatus = useMemo(
    () =>
      forcingSession
        ? inferenceProofVerification(forcingSession)
        : ('verified' as const),
    [forcingSession],
  );
  const forcingLatestActionStatus =
    forcingSession?.actions[forcingSession.actions.length - 1]?.verification ??
    'verified';
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
  const quickDraftGenerated = state.candidates.quickDraftGenerated;
  const quickCandidatesVisible =
    state.candidates.activeCandidateSource === 'quick';
  const quickToolLabel = !quickDraftGenerated
    ? t('game.quick')
    : quickCandidatesVisible
    ? t('game.hideCandidates')
    : t('game.showCandidates');
  const quickToolIcon: AppIconName = !quickDraftGenerated
    ? 'sparkle'
    : quickCandidatesVisible
    ? 'hide'
    : 'show';
  const hasCompleteVisibleCandidateGrid = state.values.every(
    (value, cell) => value !== null || activeCandidateGrid[cell] !== 0,
  );
  const useVisibleCandidatesForInference =
    (state.candidates.quickDraftGenerated &&
      state.candidates.activeCandidateSource === 'quick') ||
    hasCompleteVisibleCandidateGrid;
  const forcingActionTruth: InferenceTruth = forcingSession?.root
    ? forcingTruth
    : 'true';
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
    const initialFocusCell =
      multiCells.length === 1 ? multiCells[0] : state.selectedCell;
    const initialCellDigit =
      initialFocusCell === null ? null : state.values[initialFocusCell];
    const initialFocusDigit =
      preferences.inputMode === 'digit_first'
        ? selectedDigit ?? focusedDigit ?? initialCellDigit
        : focusedDigit ?? initialCellDigit;
    setColorMode(false);
    setForcingPath('a');
    setForcingPathDisplay('current');
    setForcingPathBRevealed(false);
    setForcingTruth('true');
    setForcingFocusCell(initialFocusCell);
    setForcingFocusDigit(initialFocusDigit);
    setForcingCells(
      initialFocusCell !== null && state.values[initialFocusCell] === null
        ? [initialFocusCell]
        : [],
    );
    setForcingMultiSelect(false);
    setForcingApplying(false);
    setForcingSession(
      createInferenceSession(state.values, validation.candidateGrid),
    );
  };
  const exitForcingMode = () => {
    setForcingSession(null);
    setForcingPath('a');
    setForcingPathDisplay('current');
    setForcingPathBRevealed(false);
    setForcingTruth('true');
    setForcingCells([]);
    setForcingMultiSelect(false);
    setForcingFocusCell(null);
    setForcingFocusDigit(null);
    setForcingApplying(false);
  };
  const clearForcingMode = () => {
    setForcingSession(current =>
      current
        ? createInferenceSession(current.board, current.baseCandidates)
        : current,
    );
    setForcingPath('a');
    setForcingPathDisplay('current');
    setForcingPathBRevealed(false);
    setForcingTruth('true');
    setForcingMultiSelect(false);
    setForcingCells(
      forcingFocusCell !== null && state.values[forcingFocusCell] === null
        ? [forcingFocusCell]
        : [],
    );
  };
  const selectForcingCell = (cell: CellIndex) => {
    if (state.values[cell] !== null) {
      showMultiSelectBlockedFeedback(cell);
      return;
    }
    setForcingFocusCell(cell);
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
    if (!forcingSession?.root || state.values[cell] !== null) return;
    setForcingFocusCell(cell);
    setForcingMultiSelect(true);
    setForcingCells(current =>
      current.includes(cell) ? current : [...current, cell],
    );
  };
  const selectForcingDraggedCells = (cells: readonly CellIndex[]) => {
    if (!forcingSession?.root) return;
    const eligible = cells.filter(cell => state.values[cell] === null);
    if (eligible.length === 0) return;
    setForcingFocusCell(eligible[eligible.length - 1]);
    setForcingCells(
      current => [...new Set([...current, ...eligible])] as CellIndex[],
    );
  };
  const selectForcingDigit = (digit: Digit) => {
    if (!forcingSession || forcingCells.length === 0) return;
    const isRootAction = !forcingSession.root;
    const actionId = isRootAction
      ? undefined
      : `forcing-action-${++forcingActionSequenceRef.current}`;
    const action = {
      id: actionId,
      path: forcingPath,
      cells: forcingCells,
      digit,
      truth: forcingActionTruth,
      verification: isRootAction ? ('verified' as const) : ('pending' as const),
    };
    const next = applyInferenceAction(forcingSession, action);
    if (next === forcingSession) return;
    const appliedAction = next.actions[next.actions.length - 1];
    const validationRequest = !isRootAction
      ? {
          board: forcingSession.board,
          candidates: [...forcingBranch!.candidates],
          givenCells: state.givens.map(value => value !== null),
          action: appliedAction,
        }
      : null;
    setForcingSession(next);
    setForcingFocusCell(forcingCells[forcingCells.length - 1]);
    setForcingFocusDigit(digit);
    if (!forcingMultiSelect || forcingActionTruth === 'true') {
      setForcingCells([]);
    }
    if (actionId && validationRequest) {
      const validation = onValidateInferenceAction
        ? onValidateInferenceAction(validationRequest)
        : Promise.resolve(false);
      validation
        .then(verified => {
          setForcingSession(current =>
            current
              ? updateInferenceActionVerification(
                  current,
                  actionId,
                  verified ? 'verified' : 'unverified',
                )
              : current,
          );
        })
        .catch(() => {
          setForcingSession(current =>
            current
              ? updateInferenceActionVerification(
                  current,
                  actionId,
                  'unverified',
                )
              : current,
          );
        });
    }
  };
  const undoForcingStep = () => {
    if (!forcingSession) return;
    const next = undoInferenceAction(forcingSession);
    setForcingSession(next);
    setForcingCells([]);
    if (!next.root) {
      setForcingPath('a');
      setForcingPathDisplay('current');
      setForcingPathBRevealed(false);
      setForcingTruth('true');
      setForcingMultiSelect(false);
      setForcingCells(
        forcingFocusCell !== null && state.values[forcingFocusCell] === null
          ? [forcingFocusCell]
          : [],
      );
    } else {
      const lastAction = next.actions[next.actions.length - 1];
      setForcingFocusCell(
        lastAction?.cells[lastAction.cells.length - 1] ?? forcingFocusCell,
      );
      setForcingFocusDigit(lastAction?.digit ?? forcingFocusDigit);
    }
  };
  const applyForcingResult = async () => {
    if (
      forcingApplying ||
      forcingResults.length === 0 ||
      !forcingConclusionSafe ||
      forcingProofStatus !== 'verified' ||
      !onApplyInferenceConclusions
    ) {
      return;
    }
    const finalResult = forcingResults[forcingResults.length - 1];
    setForcingApplying(true);
    try {
      await onApplyInferenceConclusions(forcingResults);
      setSelectedDigit(null);
      setFocusedDigit(finalResult.digit);
      onReplayFocusChange?.(finalResult.cell, finalResult.digit);
      exitForcingMode();
    } catch {
      return;
    } finally {
      setForcingApplying(false);
    }
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
    cellMultiSelectEnabled && !candidateSelectionSuspended;
  const batchCandidateSelection =
    candidateSelectionInteractive && multiCells.length > 0;
  const digitBatchSelection =
    digitMultiSelectEnabled && !candidateSelectionSuspended;
  const tabletCandidateModesVisible =
    useLandscapeTabletLayout &&
    multiSelectEnabled &&
    !forcingSession &&
    !hintOpen;
  const multiSelectCandidateCounts = DIGITS.reduce<Record<number, number>>(
    (result, digit) => {
      result[digit] = multiCells.filter(cell =>
        hasCandidate(activeCandidateGrid[cell], digit),
      ).length;
      return result;
    },
    {},
  );
  const selectedCell =
    multiCells.length === 1 ? multiCells[0] : state.selectedCell;
  const selectedCellFilled =
    selectedCell !== null && state.values[selectedCell] !== null;
  const selectedCellDigit =
    selectedCell === null ? null : state.values[selectedCell];
  const boardHighlightDigit =
    preferences.inputMode === 'digit_first'
      ? digitBatchSelection
        ? selectedDigit
        : selectedDigit ?? focusedDigit ?? selectedCellDigit
      : focusedDigit ?? selectedCellDigit;
  const actionStrip = forcingSession
    ? null
    : resolveContextualActionStrip({
        paused,
        hintOpen,
        busy: snapshot.busy || autoFinishRunning,
        autoCompleteAvailable:
          autoFinish?.visibleCount === null && onAutoComplete !== undefined,
      });
  const phoneAutoCompleteVisible =
    !useLandscapeTabletLayout && (actionStrip !== null || autoFinishRunning);
  const phoneBatchRemoveVisible =
    !useLandscapeTabletLayout &&
    multiSelectEnabled &&
    pencilMode &&
    !forcingSession &&
    !hintOpen;
  const phoneQuickActionsVisible =
    phoneAutoCompleteVisible || phoneBatchRemoveVisible;
  const displayedState = autoFinishDisplay
    ? {
        ...state,
        values: autoFinishDisplay.values,
        selectedCell: autoFinishDisplay.selectedCell,
        candidates: {
          ...state.candidates,
          manualCandidates: autoFinishDisplay.candidates,
          quickCandidates: autoFinishDisplay.candidates,
        },
      }
    : state;
  const forcingDisplayedState = forcingSession
    ? { ...displayedState, selectedCell: forcingFocusCell }
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
      setFocusedDigit(digit);
      const removal = candidateBatchRemoval(multiCells, [digit]);
      if (removal) onRemoveCandidates(removal.cells, removal.digits);
      onReplayFocusChange?.(null, digit);
      return;
    }
    if (cellMultiSelectEnabled && !candidateSelectionSuspended) return;
    if (digitBatchSelection) {
      const next = toggleSelectedCandidateDigit(selectedDigits, digit);
      clearDigitFirstCandidateFeedback();
      setSelectedDigits(next);
      onReplayFocusChange?.(
        state.selectedCell,
        next.length === 1 ? next[0] : null,
      );
      return;
    }
    if (preferences.inputMode === 'digit_first') {
      const next = selectedDigit === digit ? null : digit;
      clearDigitFirstCandidateFeedback();
      setSelectedDigit(next);
      onReplayFocusChange?.(state.selectedCell, next);
      return;
    }
    if (selectedCell !== null && state.values[selectedCell] !== null) return;
    setFocusedDigit(digit);
    onDigit(digit);
  };
  const toggleCandidateBatch = () => {
    if (candidateBatchActive) {
      setCandidateBatchActive(false);
      if (multiCells.length > 0) {
        setMultiCells([]);
        onSelectCell(multiCells.length === 1 ? multiCells[0] : null);
      }
      if (selectedDigits.length > 1) setSelectedDigit(null);
      return;
    }
    if (preferences.inputMode === 'cell_first') {
      const current = state.selectedCell;
      if (
        current !== null &&
        state.values[current] === null &&
        activeCandidateGrid[current] !== 0
      ) {
        setMultiCells([current]);
      }
    }
    setCandidateBatchActive(true);
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
                  accessibilityLabel={t('game.currentStreak', {
                    count: snapshot.completionStreak?.current ?? 0,
                  })}
                  maxFontSizeMultiplier={1.4}
                  numberOfLines={1}
                  style={[
                    styles.streakText,
                    boardMetaEdgeInset > 0 && styles.streakTextPhone,
                  ]}
                  testID="game-completion-streak"
                >
                  {t('game.streak', {
                    count: snapshot.completionStreak?.current ?? 0,
                  })}
                </Text>
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
                  hintAnimationDurationMs={autoFinishRunning ? 240 : undefined}
                  hintVisuals={hintPage?.visuals}
                  hintAnimations={preferences.hintAnimations}
                  replayEliminationAnimationKey={
                    autoFinishDisplay?.eliminationAnimationKey
                  }
                  replayEliminationOpacity={
                    autoFinishDisplay?.removingEliminations
                      ? autoFinishRemovalOpacity
                      : undefined
                  }
                  replayEliminations={autoFinishDisplay?.eliminations}
                  highlightDigit={
                    forcingSession
                      ? forcingFocusDigit
                      : coloringFocused || hintOpen || autoFinishRunning
                      ? null
                      : boardHighlightDigit
                  }
                  showSelection={
                    Boolean(forcingSession) ||
                    coloringFocused ||
                    candidateSelectionInteractive ||
                    digitBatchSelection ||
                    hintOpen ||
                    autoFinishRunning ||
                    preferences.inputMode === 'cell_first'
                  }
                  blendSelectionBackground={
                    !forcingSession && !coloringFocused && !hintOpen
                  }
                  highlightRegions={
                    !forcingSession &&
                    !coloringFocused &&
                    !autoFinishRunning &&
                    preferences.highlightRegions
                  }
                  highlightSameDigit={
                    forcingSession
                      ? forcingFocusDigit !== null
                      : !coloringFocused &&
                        !autoFinishRunning &&
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
                    !candidateBatchActive &&
                    preferences.oneTapFill &&
                    state.difficultyLevel >= 4
                  }
                  onOneTapFill={fillOneTapCell}
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

          <GameControlsPane
            dockAutoComplete={
              useLandscapeTabletLayout && !forcingSession && !hintOpen
            }
            autoCompleteVisible={actionStrip !== null || autoFinishRunning}
            autoCompleteRunning={autoFinishRunning}
            onAutoComplete={onAutoComplete}
            textScale={textScale}
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
            paneTestID={
              useLandscapeTabletLayout && hintOpen
                ? 'tablet-hint-panel'
                : useLandscapeTabletLayout
                ? 'tablet-game-controls'
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
                        setForcingPathDisplay('current');
                        if (path === 'b') setForcingPathBRevealed(true);
                        setForcingCells([]);
                      }}
                      style={[
                        styles.inferencePathButton,
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
                              forcingPath === path
                                ? path === 'a'
                                  ? boardTheme.colors.reasoningPathA
                                  : boardTheme.colors.reasoningPathB
                                : palette.muted,
                          },
                        ]}
                        testID={`inference-path-swatch-${path}`}
                      />
                      <Text
                        style={[
                          styles.inferencePathButtonText,
                          forcingPath === path
                            ? path === 'a'
                              ? styles.inferencePathAText
                              : styles.inferencePathBText
                            : styles.inferencePathInactiveText,
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
                      disabled: !forcingSession.root,
                    }}
                    disabled={!forcingSession.root}
                    onPress={() => {
                      const nextDisplay =
                        forcingPathDisplay === 'both' ? 'current' : 'both';
                      setForcingPathDisplay(nextDisplay);
                      if (nextDisplay === 'both' && forcingSession.root) {
                        setForcingPathBRevealed(true);
                      }
                    }}
                    style={[
                      styles.inferenceDisplaySwitch,
                      !forcingSession.root && styles.inferenceControlDisabled,
                    ]}
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
                  {!forcingSession.root ? (
                    <View
                      accessible
                      accessibilityLabel={t('game.inferenceAssume')}
                      style={styles.inferenceAssumeHint}
                      testID="inference-assume"
                    >
                      <Text style={styles.inferenceAssumeHintText}>
                        {t('game.inferenceAssume')}
                      </Text>
                    </View>
                  ) : (
                    <>
                      {(['true', 'false'] as const).map(truth => (
                        <Pressable
                          key={truth}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: forcingTruth === truth,
                          }}
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
                        accessibilityState={{
                          selected: forcingMultiSelect,
                        }}
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
                    </>
                  )}
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
            {phoneQuickActionsVisible ? (
              <View
                style={styles.phoneQuickActionRow}
                testID="phone-quick-action-row"
              >
                {phoneBatchRemoveVisible ? (
                  <Pressable
                    accessibilityLabel={t('game.candidateBatchToggle')}
                    accessibilityHint={t('game.candidateBatchHint')}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: candidateBatchActive,
                      disabled: interactionDisabled || coloringFocused,
                    }}
                    disabled={interactionDisabled || coloringFocused}
                    onPress={toggleCandidateBatch}
                    style={[
                      styles.candidateBatchButton,
                      candidateBatchActive && styles.candidateBatchButtonActive,
                    ]}
                    testID="multi-select-tool"
                  >
                    <View style={styles.candidateBatchButtonIcon}>
                      <AppIcon
                        color={
                          candidateBatchActive ? palette.accent : palette.muted
                        }
                        name="multiSelect"
                        size={APP_ICON_SIZE.compact * textScale}
                      />
                      <View style={styles.candidateBatchButtonMinusBadge}>
                        <AppIcon
                          color={palette.surface}
                          name="minus"
                          size={8 * textScale}
                        />
                      </View>
                    </View>
                    <Text
                      maxFontSizeMultiplier={1.4}
                      numberOfLines={1}
                      style={[
                        styles.candidateBatchButtonText,
                        candidateBatchActive &&
                          styles.candidateBatchButtonTextActive,
                      ]}
                    >
                      {t('game.candidateBatchToggle')}
                    </Text>
                  </Pressable>
                ) : null}
                {phoneAutoCompleteVisible ? (
                  <View
                    accessibilityLiveRegion="polite"
                    style={styles.phoneAutoCompleteSwitchSlot}
                  >
                    <AutoCompleteSwitch
                      autoCompleteRunning={autoFinishRunning}
                      onAutoComplete={onAutoComplete}
                      textScale={textScale}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}

            {tabletCandidateModesVisible ? (
              <View
                style={styles.candidateModeRow}
                testID="tablet-candidate-modes"
              >
                {([false, true] as const).map(batch => {
                  const selected = candidateBatchActive === batch;
                  const disabled =
                    interactionDisabled ||
                    coloringFocused ||
                    (batch && !pencilMode);
                  return (
                    <Pressable
                      key={String(batch)}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled }}
                      accessibilityHint={
                        batch ? t('game.candidateBatchModeHint') : undefined
                      }
                      disabled={disabled}
                      onPress={() => {
                        if (!selected) toggleCandidateBatch();
                      }}
                      style={[
                        styles.candidateModeButton,
                        batch && styles.candidateModeBatchButton,
                        selected && styles.candidateModeButtonActive,
                        disabled && styles.candidateModeButtonDisabled,
                      ]}
                      testID={
                        batch ? 'multi-select-tool' : 'candidate-normal-tool'
                      }
                    >
                      <Text
                        maxFontSizeMultiplier={1.4}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        style={[
                          styles.candidateBatchButtonText,
                          selected && styles.candidateBatchButtonTextActive,
                        ]}
                      >
                        {t(
                          batch
                            ? 'game.candidateBatchToggle'
                            : 'game.candidateNormalMode',
                        )}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View
              style={[
                styles.numberPad,
                useLandscapeTabletLayout && styles.numberPadLandscape,
                phoneQuickActionsVisible && styles.numberPadAfterPhoneActions,
                tabletCandidateModesVisible
                  ? styles.numberPadAfterCandidateModes
                  : null,
                forcingSession && styles.numberPadAfterInference,
                hintOpen && styles.controlsContentHidden,
              ]}
              testID="game-number-pad"
            >
              {DIGITS.map(digit => {
                const multiSelectCandidateCount =
                  multiSelectCandidateCounts[digit];
                const forcingCandidateCount = forcingDigitCounts[digit];
                const forcingCandidateAvailable =
                  forcingCandidateCount > 0 &&
                  forcingCells.length > 0 &&
                  !(forcingActionTruth === 'true' && forcingCells.length !== 1);
                const numberKeyState = resolveNumberKeyState({
                  inputMode: preferences.inputMode,
                  hasSelectedCell: selectedCell !== null,
                  selectedCellFilled,
                  pencilMode: state.candidates.pencilMode,
                  candidateSource: state.candidates.activeCandidateSource,
                  candidatePresent:
                    selectedCell !== null &&
                    hasCandidate(activeCandidateGrid[selectedCell], digit),
                  batchCandidateCount: batchCandidateSelection
                    ? multiSelectCandidateCount
                    : null,
                  remainingCount: 9 - counts[digit],
                  digitFirstCandidateFeedback:
                    digitFirstCandidateFeedback?.digit === digit
                      ? digitFirstCandidateFeedback.kind
                      : null,
                });
                const numberKeyFeedback = numberKeyFeedbackText(
                  numberKeyState.feedback,
                );
                const digitFirstLocked =
                  !forcingSession &&
                  !batchCandidateSelection &&
                  preferences.inputMode === 'digit_first' &&
                  selectedDigits.includes(digit);
                const forcingDigitFocused =
                  Boolean(forcingSession) && forcingFocusDigit === digit;
                const numberKeyFocused =
                  forcingDigitFocused || digitFirstLocked;
                const completedDigit =
                  numberKeyState.feedback?.kind === 'remaining' &&
                  counts[digit] >= 9;
                const digitDisabled = forcingSession
                  ? interactionDisabled || !forcingCandidateAvailable
                  : interactionDisabled ||
                    coloringFocused ||
                    (cellMultiSelectEnabled && multiCells.length === 0) ||
                    (!digitBatchSelection && numberKeyState.disabled);
                const accessibilityLabel = forcingSession
                  ? forcingSession.root
                    ? t(
                        forcingActionTruth === 'true'
                          ? 'game.inferenceMarkTrue'
                          : 'game.inferenceMarkFalse',
                        { digit, count: forcingCandidateCount },
                      )
                    : t('game.inferenceAssumeDigit', { digit })
                  : numberKeyState.action === 'add_candidate'
                  ? t('game.addCandidate', { digit })
                  : numberKeyState.action === 'remove_candidate'
                  ? batchCandidateSelection
                    ? t('game.removeCandidateFromSelected', {
                        digit,
                        count: multiSelectCandidateCount,
                      })
                    : t('game.removeCandidate', { digit })
                  : numberKeyState.action === 'unavailable'
                  ? numberKeyState.feedback?.kind === 'remaining'
                    ? t('game.digitUnavailable', {
                        digit,
                        count: numberKeyState.feedback.count,
                      })
                    : t('game.candidateUnavailable', { digit })
                  : t('game.enterDigit', {
                      digit,
                      count: 9 - counts[digit],
                    });
                const resolvedAccessibilityLabel = digitBatchSelection
                  ? t('game.candidateBatchSelectDigit', { digit })
                  : numberKeyState.action === 'select_candidate_toggle'
                  ? t('game.selectCandidateToggle', { digit })
                  : numberKeyState.action === 'select_candidate_remove'
                  ? t('game.selectCandidateRemove', { digit })
                  : accessibilityLabel;
                return (
                  <Pressable
                    key={digit}
                    accessibilityLabel={resolvedAccessibilityLabel}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: numberKeyFocused,
                      disabled: digitDisabled,
                    }}
                    disabled={digitDisabled}
                    onPress={() => selectDigit(digit)}
                    style={({ pressed }) => [
                      styles.numberKey,
                      useLandscapeTabletLayout && styles.numberKeyLandscape,
                      forcingSession &&
                        !forcingCandidateAvailable &&
                        styles.numberKeyMultiSelectUnavailable,
                      !forcingSession &&
                        !digitBatchSelection &&
                        numberKeyState.disabled &&
                        styles.numberKeyMultiSelectUnavailable,
                      !useLandscapeTabletLayout &&
                        !forcingSession &&
                        completedDigit &&
                        styles.numberKeyComplete,
                      !useLandscapeTabletLayout &&
                        numberKeyFocused &&
                        styles.numberKeySelected,
                      !useLandscapeTabletLayout && pressed && styles.pressed,
                    ]}
                    testID={`number-key-${digit}`}
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.numberKeyContent,
                          useLandscapeTabletLayout && styles.numberKeyCircle,
                          useLandscapeTabletLayout &&
                            forcingDigitFocused &&
                            styles.numberKeyCircleNavigation,
                          useLandscapeTabletLayout &&
                            digitFirstLocked &&
                            styles.numberKeyCircleLocked,
                          useLandscapeTabletLayout &&
                            pressed &&
                            styles.numberKeyCirclePressed,
                        ]}
                        testID={
                          useLandscapeTabletLayout
                            ? `number-key-circle-${digit}`
                            : undefined
                        }
                      >
                        <Text
                          allowFontScaling={false}
                          style={[
                            styles.numberValue,
                            useLandscapeTabletLayout &&
                              styles.numberValueLandscape,
                            useLandscapeTabletLayout &&
                              digitFirstLocked &&
                              styles.numberKeyLockedText,
                          ]}
                        >
                          {digit}
                        </Text>
                        {forcingSession ? (
                          <Text
                            allowFontScaling={false}
                            style={[
                              styles.numberMultiSelectCount,
                              useLandscapeTabletLayout &&
                                styles.numberAuxiliaryLandscape,
                            ]}
                            testID={`inference-number-count-${digit}`}
                          >
                            {forcingCandidateCount}
                          </Text>
                        ) : digitBatchSelection ? null : numberKeyState.feedback
                            ?.kind === 'candidate_add' ||
                          numberKeyState.feedback?.kind ===
                            'candidate_remove' ||
                          numberKeyState.feedback?.kind ===
                            'candidate_toggle' ? (
                          <Text
                            allowFontScaling={false}
                            style={[
                              styles.numberMultiSelectCount,
                              useLandscapeTabletLayout &&
                                styles.numberAuxiliaryLandscape,
                              useLandscapeTabletLayout &&
                                digitFirstLocked &&
                                styles.numberKeyLockedText,
                            ]}
                            testID={
                              batchCandidateSelection
                                ? `number-multi-select-count-${digit}`
                                : `number-candidate-action-${digit}`
                            }
                          >
                            {numberKeyFeedback}
                          </Text>
                        ) : numberKeyState.feedback?.kind === 'remaining' &&
                          preferences.showRemainingDigits ? (
                          <Text
                            allowFontScaling={false}
                            style={[
                              styles.numberRemaining,
                              useLandscapeTabletLayout &&
                                styles.numberRemainingLandscape,
                              useLandscapeTabletLayout &&
                                styles.numberAuxiliaryLandscape,
                              useLandscapeTabletLayout &&
                                completedDigit &&
                                styles.numberRemainingComplete,
                              useLandscapeTabletLayout &&
                                digitFirstLocked &&
                                styles.numberKeyLockedText,
                            ]}
                            testID={`number-remaining-${digit}`}
                          >
                            {numberKeyFeedback}
                          </Text>
                        ) : null}
                      </View>
                    )}
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
                    ellipsizeMode="tail"
                    numberOfLines={2}
                    style={styles.inferenceResultDetail}
                    testID={
                      forcingResult
                        ? 'inference-conclusion'
                        : forcingBranch?.complete
                        ? 'inference-path-complete'
                        : undefined
                    }
                  >
                    {forcingProofStatus === 'pending'
                      ? t('game.inferenceProofPending')
                      : forcingProofStatus === 'unverified'
                      ? t('game.inferenceProofUnverified')
                      : forcingResult && !forcingConclusionSafe
                      ? t('game.inferenceInvalidProcess')
                      : forcingResult
                      ? `${t(
                          forcingResult.reason === 'path_contradiction'
                            ? 'game.inferenceConclusionContradiction'
                            : 'game.inferenceConclusionShared',
                        )} · ${t(
                          forcingResult.action === 'place'
                            ? 'game.inferenceConclusionPlace'
                            : 'game.inferenceConclusionRemove',
                        )}`
                      : forcingBranch?.contradiction
                      ? t('game.inferenceSwitchPath')
                      : forcingLatestActionStatus === 'pending'
                      ? t('game.inferenceStepPending')
                      : forcingLatestActionStatus === 'unverified'
                      ? t('game.inferenceStepUnverified')
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
                      forcingApplying ||
                      forcingResults.length === 0 ||
                      !forcingConclusionSafe ||
                      forcingProofStatus !== 'verified' ||
                      !onApplyInferenceConclusions,
                  }}
                  disabled={
                    forcingApplying ||
                    forcingResults.length === 0 ||
                    !forcingConclusionSafe ||
                    forcingProofStatus !== 'verified' ||
                    !onApplyInferenceConclusions
                  }
                  onPress={applyForcingResult}
                  style={[
                    styles.inferenceApplyButton,
                    (forcingApplying ||
                      forcingResults.length === 0 ||
                      !forcingConclusionSafe ||
                      forcingProofStatus !== 'verified' ||
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
                  accessibilityHint={
                    quickDraftGenerated
                      ? t('game.regenerateQuickCandidatesHint')
                      : undefined
                  }
                  active={quickCandidatesVisible}
                  feedbackOpacity={
                    gameplayFeedback?.target === 'quick'
                      ? feedbackOpacity
                      : undefined
                  }
                  badge={
                    quickDraftGenerated
                      ? undefined
                      : snapshot.wallet.quick_pencil.balance
                  }
                  disabled={interactionDisabled}
                  label={quickToolLabel}
                  icon={quickToolIcon}
                  onPress={onQuickPencil}
                  onLongPress={
                    quickDraftGenerated ? onRegenerateQuickPencil : undefined
                  }
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
                  onPress={() => onHint(boardHighlightDigit)}
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
          </GameControlsPane>
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
    // The switch is positioned outside the panel so it never shifts the
    // vertically centered tablet controls.
    controlsDock: {
      alignSelf: 'center',
    },
    autoCompleteDockSwitchPosition: {
      bottom: -(20 * textScale + 6),
      position: 'absolute',
      right: 0,
    },
    autoCompleteSwitch: {
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: 10 * textScale,
      borderWidth: 1,
      height: 20 * textScale,
      justifyContent: 'center',
      width: 36 * textScale,
    },
    autoCompleteSwitchActive: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    autoCompleteSwitchThumb: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 8 * textScale,
      height: 16 * textScale,
      justifyContent: 'center',
      left: 2 * textScale,
      position: 'absolute',
      width: 16 * textScale,
    },
    autoCompleteSwitchThumbActive: {
      backgroundColor: palette.surface,
      left: 18 * textScale,
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
    streakText: {
      color: palette.accent,
      fontSize: 12 * textScale,
      fontWeight: '700',
      left: 0,
      position: 'absolute',
    },
    streakTextPhone: {
      left: PHONE_BOARD_EDGE_INSET,
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
    numberPadAfterPhoneActions: {
      marginTop: 8,
    },
    numberPadAfterCandidateModes: {
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
      backgroundColor: palette.surface,
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
    inferencePathInactiveText: {
      color: palette.ink,
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
    inferenceAssumeHint: {
      alignItems: 'center',
      flexBasis: '100%',
      flexGrow: 1,
      justifyContent: 'center',
      minHeight: 38 * textScale,
      paddingHorizontal: 5,
    },
    inferenceAssumeHintText: {
      color: palette.muted,
      fontSize: 11 * textScale,
      fontWeight: '600',
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
    phoneQuickActionRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 12,
      justifyContent: 'flex-end',
      marginHorizontal: 12,
      marginTop: 8,
      minHeight: 44 * textScale,
    },
    // Reserve the same space in fill, notes and batch modes so the centered
    // tablet panel and all controls below this row keep their positions.
    candidateModeRow: {
      backgroundColor: palette.background,
      borderRadius: 12,
      flexDirection: 'row',
      height: 50 * textScale,
      padding: 3 * textScale,
    },
    candidateModeButton: {
      alignItems: 'center',
      borderRadius: 9,
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    candidateModeBatchButton: {
      flex: 1.4,
    },
    candidateModeButtonActive: {
      backgroundColor: palette.accentSoft,
    },
    candidateModeButtonDisabled: {
      opacity: 0.4,
    },
    candidateBatchButton: {
      alignItems: 'center',
      borderColor: palette.line,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 6,
      justifyContent: 'center',
      minHeight: 30 * textScale,
      paddingHorizontal: 12,
    },
    candidateBatchButtonActive: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
    },
    candidateBatchButtonText: {
      color: palette.muted,
      fontSize: 12 * textScale,
      fontWeight: '700',
    },
    candidateBatchButtonTextActive: {
      color: palette.accent,
    },
    candidateBatchButtonIcon: {
      alignItems: 'center',
      height: 18 * textScale,
      justifyContent: 'center',
      position: 'relative',
      width: 18 * textScale,
    },
    candidateBatchButtonMinusBadge: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 5 * textScale,
      bottom: -2 * textScale,
      height: 10 * textScale,
      justifyContent: 'center',
      position: 'absolute',
      right: -3 * textScale,
      width: 10 * textScale,
    },
    phoneAutoCompleteSwitchSlot: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44 * textScale,
      minWidth: 44 * textScale,
    },
    numberKey: {
      alignItems: 'center',
      borderRadius: 10,
      flex: 1,
      marginHorizontal: 2,
      paddingVertical: 6,
    },
    numberKeyLandscape: {
      borderRadius: 0,
      flexBasis: '30%',
      flexGrow: 1,
      flexShrink: 0,
      justifyContent: 'center',
      marginHorizontal: 0,
      minHeight: 70 * textScale,
      paddingVertical: 0,
    },
    numberKeyContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberKeyCircle: {
      backgroundColor: palette.background,
      borderColor: palette.line,
      borderRadius: 999,
      borderWidth: StyleSheet.hairlineWidth,
      height: 64 * textScale,
      width: 64 * textScale,
    },
    numberKeyCircleNavigation: {
      borderColor: palette.accent,
      borderWidth: 2.5,
    },
    numberKeyCircleLocked: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
      borderWidth: 2.5,
    },
    numberKeyCirclePressed: {
      opacity: 0.72,
      transform: [{ scale: 0.96 }],
    },
    numberKeyComplete: {
      opacity: 0.38,
    },
    numberKeySelected: {
      backgroundColor: palette.accentSoft,
      opacity: 1,
    },
    numberKeyMultiSelectUnavailable: {
      opacity: 0.38,
    },
    numberValue: {
      color: palette.accent,
      fontSize: 25 * textScale,
      fontWeight: '700',
    },
    numberValueLandscape: {
      fontSize: 23 * textScale,
      includeFontPadding: false,
      lineHeight: 25 * textScale,
      textAlign: 'center',
      textAlignVertical: 'center',
      transform: [{ translateY: 1 * textScale }],
    },
    numberKeyLockedText: {
      color: palette.background,
    },
    numberRemaining: {
      color: palette.muted,
      fontSize: 10 * textScale,
      fontWeight: '600',
      marginTop: -2,
    },
    numberRemainingLandscape: {
      fontSize: 9 * textScale,
    },
    numberAuxiliaryLandscape: {
      bottom: 7 * textScale,
      includeFontPadding: false,
      left: 0,
      marginTop: 0,
      position: 'absolute',
      right: 0,
      textAlign: 'center',
      textAlignVertical: 'center',
    },
    numberRemainingComplete: {
      opacity: 0.42,
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
