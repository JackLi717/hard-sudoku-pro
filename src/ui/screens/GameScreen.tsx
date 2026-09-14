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
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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
import { getElapsedMs } from '../../domain/game/engine';
import { buildHintPresentation } from '../../domain/hints/presentation';
import { CellIndex, Digit } from '../../domain/sudoku/contracts';
import { OneTapFillKind } from '../../domain/sudoku/one-tap-fill';
import {
  HINT_PRESENTATION_COPIES,
  translateCoordinatorMessage,
  useLocalization,
} from '../../localization';
import { BOARD_COLOR_SWATCHES, SudokuBoard } from '../components/SudokuBoard';
import {
  isGameplayFeedbackMessage,
  resolveGameplayFeedback,
} from '../game-feedback';
import {
  MultiSelectOnboardingOverlay,
  OnboardingBoardRect,
} from '../components/MultiSelectOnboardingOverlay';
import { AppPalette, useAppTheme } from '../theme';
import { useReducedMotion } from '../use-reduced-motion';

type GameScreenProps = {
  snapshot: OfflineGameSnapshot;
  preferences: ProductPreferences;
  onBack(): void;
  onPause(): void;
  onResume(): void;
  onAbandon(): void;
  onSelectCell(cell: number): void;
  onReplayFocusChange?(cell: number | null, digit: Digit | null): void;
  onOneTapFill(cell: number, kind: OneTapFillKind): void;
  onDigit(digit: Digit): void;
  onRemoveCandidateFromCells(cells: readonly CellIndex[], digit: Digit): void;
  onMultiSelectOnboardingSeen(): void;
  replayMultiSelectOnboarding?: boolean;
  onMultiSelectOnboardingReplayUsed?(): void;
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

type ContextualActionStripState =
  | { kind: 'multi_select'; selectedCount: number }
  | { kind: 'auto_complete' }
  | null;

function resolveContextualActionStrip({
  paused,
  hintOpen,
  onboardingOpen,
  busy,
  selectedCount,
  autoCompleteAvailable,
}: {
  paused: boolean;
  hintOpen: boolean;
  onboardingOpen: boolean;
  busy: boolean;
  selectedCount: number;
  autoCompleteAvailable: boolean;
}): ContextualActionStripState {
  if (paused) return null;
  if (hintOpen) return null;
  if (onboardingOpen) return null;
  if (busy) return null;
  if (selectedCount > 0) return { kind: 'multi_select', selectedCount };
  return autoCompleteAvailable ? { kind: 'auto_complete' } : null;
}

export function gameScreenTextScale(width: number, height: number): number {
  return Math.min(width, height) >= TABLET_SHORTEST_SIDE ? 1.25 : 1;
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
  mark: string;
  feedbackOpacity?: Animated.Value;
  active?: boolean;
  badge?: number;
  disabled?: boolean;
  testID?: string;
  textScale: number;
  onPress(): void;
  onLongPress?(): void;
};

function ToolButton({
  label,
  mark,
  active = false,
  badge,
  disabled = false,
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
      style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
      testID={testID}
    >
      <Text
        allowFontScaling={false}
        style={[styles.toolMark, active && styles.toolMarkActive]}
      >
        {mark}
      </Text>
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
  onMultiSelectOnboardingSeen,
  replayMultiSelectOnboarding = false,
  onMultiSelectOnboardingReplayUsed,
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
  const { palette } = useAppTheme();
  const { height, width } = useWindowDimensions();
  const textScale = gameScreenTextScale(width, height);
  const styles = useMemo(
    () => createStyles(palette, textScale),
    [palette, textScale],
  );
  const reduceMotion = useReducedMotion(preferences.hintAnimations);
  const reduceAutoFinishMotion = useReducedMotion();
  const session = snapshot.session;
  const currentSessionId = session?.state.sessionId;
  const gameplayFeedback = resolveGameplayFeedback(snapshot);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
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
  const [multiCells, setMultiCells] = useState<readonly CellIndex[]>([]);
  const [colorMode, setColorMode] = useState(false);
  const [selectedColor, setSelectedColor] = useState<BoardColor>(0);
  const [onboardingCell, setOnboardingCell] = useState<CellIndex | null>(null);
  const [onboardingBoardRect, setOnboardingBoardRect] =
    useState<OnboardingBoardRect | null>(null);
  const onboardingOpenRef = useRef(false);
  const rootRef = useRef<React.ComponentRef<typeof View>>(null);
  const boardRef = useRef<React.ComponentRef<typeof View>>(null);
  const multiCellsRef = useRef(multiCells);
  multiCellsRef.current = multiCells;
  const onboardingSeenRef = useRef(preferences.multiSelectOnboardingSeen);
  onboardingSeenRef.current ||= preferences.multiSelectOnboardingSeen;
  const onboardingSeenCallbackRef = useRef(onMultiSelectOnboardingSeen);
  onboardingSeenCallbackRef.current = onMultiSelectOnboardingSeen;
  const replayOnboardingRef = useRef(replayMultiSelectOnboarding);
  replayOnboardingRef.current = replayMultiSelectOnboarding;
  const replayUsedCallbackRef = useRef(onMultiSelectOnboardingReplayUsed);
  replayUsedCallbackRef.current = onMultiSelectOnboardingReplayUsed;
  const onboardingTextRef = useRef(t('game.multiSelectOnboarding'));
  onboardingTextRef.current = t('game.multiSelectOnboarding');
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
    setMultiCells(current => (current.length ? [] : current));
    onboardingOpenRef.current = false;
    setOnboardingCell(null);
    setOnboardingBoardRect(null);
  }, [session?.state.sessionId]);
  useEffect(() => {
    if (!onboardingOpenRef.current) {
      setMultiCells(current => (current.length ? [] : current));
    }
  }, [session?.state.status, session?.state.activeHint]);
  const measureOnboardingBoard = useCallback(() => {
    const root = rootRef.current;
    const board = boardRef.current;
    if (!root || !board) return;
    board.measureInWindow((x, y, width, height) => {
      root.measureInWindow((rootX, rootY) => {
        if (width > 0 && height > 0 && onboardingOpenRef.current) {
          setOnboardingBoardRect({
            x: x - rootX,
            y: y - rootY,
            width,
            height,
          });
        }
      });
    });
  }, []);
  const dismissMultiSelectOnboarding = useCallback(() => {
    if (!onboardingOpenRef.current) return;
    onboardingOpenRef.current = false;
    setOnboardingCell(null);
    setOnboardingBoardRect(null);
    if (!onboardingSeenRef.current) {
      onboardingSeenRef.current = true;
      onboardingSeenCallbackRef.current();
    }
    if (replayOnboardingRef.current) {
      replayUsedCallbackRef.current?.();
    }
  }, []);
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
  const longPressAllowedRef = useRef(false);
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
          )
        : null,
    [activeHint, locale, session?.state.candidates.hintCandidates],
  );
  const sessionKey = `game:${session?.state.sessionId ?? 'none'}`;
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
  const interactionDisabled =
    snapshot.busy || paused || hintOpen || onboardingCell !== null;
  const coloringFocused = preferences.boardColoring && colorMode && !hintOpen;
  longPressAllowedRef.current = !interactionDisabled;
  const selectCell = useCallback(
    (cell: number) => {
      if (onboardingOpenRef.current) return;
      if (multiCellsRef.current.length) {
        if (valuesRef.current?.[cell] !== null) {
          return;
        }
        setMultiCells(current =>
          current.includes(cell)
            ? current.filter(selected => selected !== cell)
            : [...current, cell],
        );
        return;
      }
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
      selectedDigit,
      interactionDisabled,
    ],
  );
  const startMultiSelection = useCallback(
    (cell: CellIndex) => {
      if (
        longPressAllowedRef.current &&
        valuesRef.current?.[cell] === null &&
        !onboardingOpenRef.current
      ) {
        setMultiCells([cell]);
        setColorMode(false);
        setSelectedDigit(null);
        if (!onboardingSeenRef.current || replayOnboardingRef.current) {
          onboardingOpenRef.current = true;
          setOnboardingCell(cell);
          setOnboardingBoardRect(null);
          measureOnboardingBoard();
          AccessibilityInfo.announceForAccessibility(onboardingTextRef.current);
        }
      }
    },
    [measureOnboardingBoard, setSelectedDigit],
  );

  if (!session) {
    return null;
  }
  const state = session.state;
  const actionStrip = resolveContextualActionStrip({
    paused,
    hintOpen,
    onboardingOpen: onboardingCell !== null,
    busy: snapshot.busy || autoFinishRunning,
    selectedCount: multiCells.length,
    autoCompleteAvailable:
      autoFinish?.visibleCount === null && onAutoComplete !== undefined,
  });
  const displayedState =
    autoFinishRunning && autoFinishValues
      ? { ...state, values: autoFinishValues, selectedCell: null }
      : state;
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
    if (onboardingOpenRef.current) return;
    if (multiCells.length) {
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
  return (
    <View collapsable={false} ref={rootRef} style={styles.root}>
      <View
        importantForAccessibility={
          onboardingCell !== null ? 'no-hide-descendants' : 'auto'
        }
        style={styles.header}
        testID="game-header"
      >
        <Pressable
          accessibilityLabel={t('game.home')}
          accessibilityRole="button"
          onPress={onBack}
          style={styles.headerButton}
        >
          <Text maxFontSizeMultiplier={1.4} style={styles.headerButtonText}>
            ‹ {t('game.home')}
          </Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text
            accessibilityLabel={difficultyLabel}
            maxFontSizeMultiplier={1.25}
            numberOfLines={1}
            style={styles.level}
            testID="game-difficulty"
          >
            {t('game.level', { level: state.difficultyLevel })}
          </Text>
        </View>
        <View style={styles.headerEnd}>
          {preferences.showTimer ? (
            <GameTimer state={state} textScale={textScale} />
          ) : null}
          <Pressable
            accessibilityLabel={t('game.pause')}
            accessibilityRole="button"
            hitSlop={16}
            onPress={onPause}
            style={styles.pauseButton}
          >
            <Text allowFontScaling={false} style={styles.pauseIcon}>
              Ⅱ
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        {...scroll}
        importantForAccessibility={
          onboardingCell !== null ? 'no-hide-descendants' : 'auto'
        }
        contentContainerStyle={[
          styles.content,
          hintOpen && styles.contentWithHint,
        ]}
        scrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.playArea}>
          <View style={styles.gameMeta}>
            <Text
              maxFontSizeMultiplier={1.4}
              style={styles.metaText}
              testID="game-mistakes"
            >
              {t('game.mistakes', { count: state.errorCount })}
            </Text>
          </View>

          <View>
            <View>
              <SudokuBoard
                feedbackCells={
                  gameplayFeedback?.target === 'board'
                    ? gameplayFeedback.cells
                    : []
                }
                feedbackOpacity={
                  gameplayFeedback?.target === 'board'
                    ? feedbackOpacity
                    : undefined
                }
                feedbackTone={gameplayFeedback?.tone}
                feedbackWholeBoard={
                  gameplayFeedback?.target === 'board' &&
                  gameplayFeedback.cells.length === 0
                }
                coloringFocused={coloringFocused}
                coloringColor={
                  coloringFocused && !interactionDisabled ? selectedColor : null
                }
                onColorCells={(cells, toggleSameColor) =>
                  onColorCells?.(cells, selectedColor, toggleSameColor)
                }
                boardRef={boardRef}
                accessibilityHidden={paused}
                disabled={interactionDisabled}
                hintVisuals={hintPage?.visuals}
                hintAnimations={preferences.hintAnimations}
                highlightDigit={coloringFocused ? null : selectedDigit}
                showSelection={
                  coloringFocused ||
                  multiCells.length > 0 ||
                  hintOpen ||
                  preferences.inputMode === 'cell_first'
                }
                blendSelectionBackground={!coloringFocused && !hintOpen}
                highlightRegions={
                  !coloringFocused && preferences.highlightRegions
                }
                highlightSameDigit={
                  !coloringFocused && preferences.highlightSameDigit
                }
                highlightCandidateNotes={
                  !coloringFocused && preferences.highlightCandidateNotes
                }
                outlineUniqueCandidateNotes={
                  !coloringFocused && preferences.outlineUniqueCandidateNotes
                }
                oneTapFill={!coloringFocused && preferences.oneTapFill}
                onOneTapFill={onOneTapFill}
                onSelectCell={selectCell}
                onLongPressCell={startMultiSelection}
                selectedCells={multiCells}
                state={displayedState}
              />
            </View>
          </View>

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
                testID={
                  actionStrip.kind === 'multi_select'
                    ? 'multi-select-count'
                    : 'auto-complete-status'
                }
              >
                {actionStrip.kind === 'auto_complete'
                  ? t('game.autoCompleteReady')
                  : actionStrip.selectedCount === 1
                  ? t('game.multiSelectCountOne')
                  : t('game.multiSelectCount', {
                      count: actionStrip.selectedCount,
                    })}
              </Text>
              <Pressable
                accessibilityHint={
                  actionStrip.kind === 'auto_complete'
                    ? t('game.autoCompleteHint')
                    : undefined
                }
                accessibilityLabel={
                  actionStrip.kind === 'auto_complete'
                    ? t('game.autoComplete')
                    : t('game.multiSelectDone')
                }
                accessibilityRole="button"
                onPress={
                  actionStrip.kind === 'auto_complete'
                    ? onAutoComplete
                    : () => setMultiCells([])
                }
                style={styles.contextualActionButton}
                testID={
                  actionStrip.kind === 'auto_complete'
                    ? 'auto-complete-action'
                    : 'multi-candidate-done'
                }
              >
                <Text
                  maxFontSizeMultiplier={1.4}
                  numberOfLines={1}
                  style={styles.contextualActionButtonText}
                >
                  {actionStrip.kind === 'auto_complete'
                    ? t('game.autoComplete')
                    : t('game.multiSelectDone')}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View
            style={[
              styles.numberPad,
              actionStrip && styles.numberPadAfterActionStrip,
            ]}
          >
            {DIGITS.map(digit => (
              <Pressable
                key={digit}
                accessibilityLabel={
                  multiCells.length
                    ? t('game.removeCandidateFromSelected', { digit })
                    : t('game.enterDigit', {
                        digit,
                        count: 9 - counts[digit],
                      })
                }
                accessibilityRole="button"
                accessibilityState={{
                  selected:
                    multiCells.length === 0 &&
                    preferences.inputMode === 'digit_first' &&
                    selectedDigit === digit,
                  disabled: interactionDisabled,
                }}
                disabled={interactionDisabled}
                onPress={() => selectDigit(digit)}
                style={({ pressed }) => [
                  styles.numberKey,
                  multiCells.length === 0 &&
                    selectedDigit === digit &&
                    styles.numberKeySelected,
                  counts[digit] >= 9 && styles.numberKeyComplete,
                  pressed && styles.pressed,
                ]}
              >
                <Text allowFontScaling={false} style={styles.numberValue}>
                  {digit}
                </Text>
                {preferences.showRemainingDigits ? (
                  <Text
                    allowFontScaling={false}
                    style={styles.numberRemaining}
                    testID={`number-remaining-${digit}`}
                  >
                    {9 - counts[digit]}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>

          <View style={styles.toolbar}>
            <ToolButton
              feedbackOpacity={
                gameplayFeedback?.target === 'undo'
                  ? feedbackOpacity
                  : undefined
              }
              disabled={interactionDisabled}
              label={t('game.undo')}
              mark="↶"
              onPress={onUndo}
              textScale={textScale}
            />
            <ToolButton
              disabled={interactionDisabled}
              label={t('game.erase')}
              mark="◇"
              onPress={onErase}
              textScale={textScale}
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
              mark="✦"
              onPress={onQuickPencil}
              onLongPress={onRegenerateQuickPencil}
              testID="quick-pencil-tool"
              textScale={textScale}
            />
            <ToolButton
              active={state.candidates.pencilMode}
              disabled={interactionDisabled}
              label={t('game.pencil')}
              mark="✎"
              onPress={onPencil}
              textScale={textScale}
            />
            <ToolButton
              badge={snapshot.wallet.smart_hint.balance}
              disabled={interactionDisabled}
              label={t('game.hint')}
              mark="?"
              onPress={onHint}
              testID="hint-tool"
              textScale={textScale}
            />
            {preferences.boardColoring ? (
              <ToolButton
                active={colorMode && !hintOpen && multiCells.length === 0}
                disabled={interactionDisabled || multiCells.length > 0}
                label={t('game.color')}
                mark="◉"
                onPress={() => {
                  setColorMode(current => !current);
                }}
                testID="color-tool"
                textScale={textScale}
              />
            ) : null}
          </View>
          {preferences.boardColoring && colorMode && !hintOpen ? (
            <View style={styles.colorPalette} testID="color-palette">
              {BOARD_COLOR_SWATCHES.map((swatch, index) => (
                <Pressable
                  key={index}
                  accessibilityLabel={t('game.colorNumber', {
                    number: index + 1,
                  })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: selectedColor === index }}
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

      {onboardingCell !== null ? (
        <MultiSelectOnboardingOverlay
          boardRect={onboardingBoardRect}
          onDismiss={dismissMultiSelectOnboarding}
          selectedCell={onboardingCell}
        />
      ) : null}

      {hintOpen && hintPresentation && hintPage ? (
        <Animated.View
          style={[
            styles.hintCard,
            {
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
        >
          <ScrollView
            contentContainerStyle={styles.hintCopyContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.hintCopy}
          >
            <Text style={styles.hintEyebrow}>{t('hint.smart')}</Text>
            <Text accessibilityRole="header" style={styles.hintTitle}>
              {hintPresentation.techniqueName}
            </Text>
            <Text accessibilityRole="header" style={styles.hintPageTitle}>
              {hintPage.title}
            </Text>
            <Text style={styles.hintBody}>{hintPage.body}</Text>
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
          </ScrollView>
          <View style={styles.hintActions}>
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
              <Text
                maxFontSizeMultiplier={1.4}
                style={styles.secondaryButtonText}
              >
                {hintPageIndex === 0 ? t('hint.close') : t('hint.back')}
              </Text>
            </Pressable>
            {hintPageIndex < hintPresentation.pages.length - 1 ? (
              <Pressable
                accessibilityLabel={t('hint.showResultAccessibility')}
                accessibilityRole="button"
                disabled={hintApplying}
                onPress={() =>
                  setHintPageIndex(hintPresentation.pages.length - 1)
                }
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
              <Text
                maxFontSizeMultiplier={1.4}
                style={styles.primaryButtonText}
              >
                {hintPageIndex === hintPresentation.pages.length - 1
                  ? hintApplying
                    ? t('hint.applying')
                    : t('hint.applyStep')
                  : t('hint.next')}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
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

function createStyles(palette: AppPalette, textScale = 1) {
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
    pauseIcon: {
      color: palette.muted,
      fontSize: 19 * textScale,
      fontWeight: '700',
    },
    content: {
      paddingBottom: 28,
    },
    contentWithHint: {
      paddingBottom: 280,
    },
    playArea: {
      alignSelf: 'center',
      maxWidth: 720,
      width: '100%',
    },
    gameMeta: {
      alignItems: 'center',
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
    numberPadAfterActionStrip: {
      marginTop: 12,
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
    numberKey: {
      alignItems: 'center',
      borderRadius: 10,
      flex: 1,
      marginHorizontal: 2,
      paddingVertical: 6,
    },
    numberKeyComplete: {
      opacity: 0.38,
    },
    numberKeySelected: {
      backgroundColor: palette.accentSoft,
    },
    numberValue: {
      color: palette.accent,
      fontSize: 25 * textScale,
      fontWeight: '700',
    },
    numberRemaining: {
      color: palette.muted,
      fontSize: 9 * textScale,
      marginTop: -2,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 14,
      paddingHorizontal: 8,
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
    toolMark: {
      color: palette.ink,
      fontSize: 22 * textScale,
      fontWeight: '600',
    },
    toolMarkActive: {
      color: palette.accent,
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
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 18,
      borderWidth: 1,
      bottom: 8,
      elevation: 8,
      left: 12,
      maxHeight: '78%',
      padding: 18,
      position: 'absolute',
      right: 12,
      shadowColor: palette.ink,
      shadowOffset: { height: -3, width: 0 },
      shadowOpacity: 0.16,
      shadowRadius: 12,
      zIndex: 10,
    },
    hintCopy: {
      flexShrink: 1,
    },
    hintCopyContent: {
      paddingBottom: 2,
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
