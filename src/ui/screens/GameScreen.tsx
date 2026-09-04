import { TechniqueGrowthController } from '../../application/technique-growth/controller';
import { GrowthLightFeedback } from '../technique-growth/GrowthLightFeedback';
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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { OfflineGameSnapshot, ProductPreferences } from '../../application';
import { GameState } from '../../domain/game/contracts';
import { getElapsedMs } from '../../domain/game/engine';
import { buildHintPresentation } from '../../domain/hints/presentation';
import { Digit } from '../../domain/sudoku/contracts';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { SudokuBoard } from '../components/SudokuBoard';
import { AppPalette, useAppTheme } from '../theme';
import { useReducedMotion } from '../use-reduced-motion';

type GameScreenProps = {
  growth?: TechniqueGrowthController;
  snapshot: OfflineGameSnapshot;
  preferences: ProductPreferences;
  onBack(): void;
  onPause(): void;
  onResume(): void;
  onAbandon(): void;
  onSelectCell(cell: number): void;
  onCompleteFullHouse(cell: number): void;
  onDigit(digit: Digit): void;
  onUndo(): void;
  onErase(): void;
  onQuickPencil(): void;
  onPencil(): void;
  onHint(): void;
  onApplyHint(): void;
  onDismissHint(): void;
};

const DIGITS: readonly Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const TABLET_SHORTEST_SIDE = 600;

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
  active?: boolean;
  activeTone?: 'default' | 'focus';
  badge?: number;
  disabled?: boolean;
  testID?: string;
  textScale: number;
  onPress(): void;
};

function ToolButton({
  label,
  mark,
  active = false,
  activeTone = 'default',
  badge,
  disabled = false,
  testID,
  textScale,
  onPress,
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
      style={({ pressed }) => [
        styles.tool,
        active && styles.toolActive,
        active && activeTone === 'focus' && styles.toolFocusActive,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <Text
        allowFontScaling={false}
        style={[
          styles.toolMark,
          active && styles.toolMarkActive,
          active && activeTone === 'focus' && styles.toolMarkFocusActive,
        ]}
      >
        {mark}
      </Text>
      <Text
        maxFontSizeMultiplier={1.3}
        numberOfLines={2}
        style={[
          styles.toolLabel,
          active && styles.toolLabelActive,
          active && activeTone === 'focus' && styles.toolLabelFocusActive,
        ]}
      >
        {label}
      </Text>
      {badge !== undefined ? (
        <View style={styles.badge}>
          <Text allowFontScaling={false} style={styles.badgeText}>
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function GameScreen({
  snapshot,
  growth,
  preferences,
  onBack,
  onPause,
  onResume,
  onAbandon,
  onSelectCell,
  onCompleteFullHouse,
  onDigit,
  onUndo,
  onErase,
  onQuickPencil,
  onPencil,
  onHint,
  onApplyHint,
  onDismissHint,
}: GameScreenProps): React.JSX.Element | null {
  const { locale, t } = useLocalization();
  const { palette } = useAppTheme();
  const { height, width, fontScale } = useWindowDimensions();
  const [controlsHeight, setControlsHeight] = useState<number | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const textScale = gameScreenTextScale(width, height);
  const styles = useMemo(
    () => createStyles(palette, textScale),
    [palette, textScale],
  );
  const reduceMotion = useReducedMotion(preferences.hintAnimations);
  const session = snapshot.session;
  const values = session?.state.values;
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
  const [hintPageIndex, setHintPageIndex] = useState(0);
  const [hintApplying, setHintApplying] = useState(false);
  const [selectedDigit, setSelectedDigit] = useState<Digit | null>(null);
  const [focusedDigits, setFocusedDigits] = useState<readonly Digit[]>([]);
  const [candidateFocusActive, setCandidateFocusActive] = useState(false);
  const hintEntrance = useRef(new Animated.Value(0)).current;
  const hintApplyScale = useRef(new Animated.Value(1)).current;
  const hintPage = hintPresentation?.pages[hintPageIndex] ?? null;

  useEffect(() => {
    setFocusedDigits(current => {
      const next = current.filter(digit => counts[digit] < 9);
      return next.length === current.length ? current : next;
    });
  }, [counts]);

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
    setHintPageIndex(0);
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
  }, [hintApplyScale, hintEntrance, hintPresentation, reduceMotion]);

  useEffect(() => {
    if (preferences.inputMode === 'cell_first') {
      setSelectedDigit(null);
    }
  }, [preferences.inputMode]);

  useEffect(() => {
    setSelectedDigit(null);
    setFocusedDigits([]);
    setCandidateFocusActive(false);
  }, [session?.state.sessionId]);

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
  const selectCell = useCallback(
    (cell: number) => {
      onSelectCell(cell);
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
      onDigit,
      preferences.inputMode,
      selectedDigit,
      interactionDisabled,
    ],
  );

  if (!session) {
    return null;
  }
  const state = session.state;
  const selectDigit = (digit: Digit) => {
    if (preferences.inputMode === 'digit_first') {
      setSelectedDigit(current => (current === digit ? null : digit));
      return;
    }
    onDigit(digit);
  };
  const startCandidateFocus = () => {
    const digit =
      selectedDigit ??
      (state.selectedCell === null ? null : state.values[state.selectedCell]);
    setCandidateFocusActive(true);
    setFocusedDigits(digit !== null && counts[digit] < 9 ? [digit] : []);
  };
  const endCandidateFocus = () => {
    setCandidateFocusActive(false);
    setFocusedDigits([]);
    AccessibilityInfo.announceForAccessibility(t('candidateFocus.cleared'));
  };
  const toggleFocusedDigit = (digit: Digit) => {
    if (counts[digit] >= 9) {
      return;
    }
    const removing = focusedDigits.includes(digit);
    const next = removing
      ? focusedDigits.filter(currentDigit => currentDigit !== digit)
      : [...focusedDigits, digit].sort((left, right) => left - right);
    setFocusedDigits(next);
    AccessibilityInfo.announceForAccessibility(
      next.length > 0
        ? t('candidateFocus.status', { digits: next.join(', ') })
        : t('candidateFocus.cleared'),
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
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
          <Text maxFontSizeMultiplier={1.4} style={styles.level}>
            {t('game.level', { level: state.difficultyLevel })}
          </Text>
          {preferences.showTimer ? (
            <GameTimer state={state} textScale={textScale} />
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onPause}
          style={styles.headerButton}
        >
          <Text
            maxFontSizeMultiplier={1.4}
            style={[styles.headerButtonText, styles.headerRight]}
          >
            {t('game.pause')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        onLayout={e => setViewportHeight(e.nativeEvent.layout.height)}
        contentContainerStyle={[
          styles.content,
          hintOpen && styles.contentWithHint,
        ]}
        scrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View
          style={styles.playArea}
          onLayout={e => setControlsHeight(e.nativeEvent.layout.height)}
        >
          <View style={styles.gameMeta}>
            <Text maxFontSizeMultiplier={1.4} style={styles.metaText}>
              {t('game.mistakes', { count: state.errorCount })}
            </Text>
            <Text style={styles.metaDot}>•</Text>
            <Text maxFontSizeMultiplier={1.4} style={styles.metaText}>
              {state.candidates.activeCandidateSource === 'quick'
                ? t('game.quickDraft')
                : t('game.manualDraft')}
            </Text>
          </View>

          <View>
            <View>
              <SudokuBoard
                accessibilityHidden={paused}
                disabled={interactionDisabled}
                hintVisuals={hintPage?.visuals}
                hintAnimations={preferences.hintAnimations}
                highlightDigit={selectedDigit}
                highlightRegions={preferences.highlightRegions}
                highlightSameDigit={
                  !candidateFocusActive && preferences.highlightSameDigit
                }
                fullHouseAssist={preferences.fullHouseAssist}
                onCompleteFullHouse={onCompleteFullHouse}
                focusedDigits={paused ? [] : focusedDigits}
                onSelectCell={selectCell}
                state={state}
              />
            </View>
            {paused ? (
              <View accessibilityViewIsModal style={styles.pauseOverlay}>
                <Text style={styles.pauseEyebrow}>{t('game.paused')}</Text>
                <Text style={styles.pauseTitle}>{t('game.boardHidden')}</Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={onResume}
                  style={styles.primaryButton}
                >
                  <Text
                    maxFontSizeMultiplier={1.4}
                    style={styles.primaryButtonText}
                  >
                    {t('game.continue')}
                  </Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={onAbandon}>
                  <Text maxFontSizeMultiplier={1.4} style={styles.abandonText}>
                    {t('game.abandon')}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          <View style={styles.numberPad}>
            {DIGITS.map(digit => (
              <Pressable
                key={digit}
                accessibilityLabel={t('game.enterDigit', {
                  digit,
                  count: 9 - counts[digit],
                })}
                accessibilityRole="button"
                accessibilityState={{
                  selected:
                    preferences.inputMode === 'digit_first' &&
                    selectedDigit === digit,
                  disabled: interactionDisabled,
                }}
                disabled={interactionDisabled}
                onPress={() => selectDigit(digit)}
                style={({ pressed }) => [
                  styles.numberKey,
                  selectedDigit === digit && styles.numberKeySelected,
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

          {candidateFocusActive && !interactionDisabled ? (
            <View
              accessibilityLiveRegion="polite"
              style={styles.candidateFocusPanel}
              testID="candidate-focus-panel"
            >
              <Text style={styles.candidateFocusTitle}>
                {t('candidateFocus.title')}
              </Text>
              <View style={styles.candidateFocusDigits}>
                {DIGITS.map(digit => {
                  const complete = counts[digit] >= 9;
                  const selected = !complete && focusedDigits.includes(digit);
                  return (
                    <Pressable
                      key={digit}
                      accessibilityLabel={t('candidateFocus.digit', {
                        digit,
                      })}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled: complete }}
                      disabled={complete}
                      onPress={() => toggleFocusedDigit(digit)}
                      style={({ pressed }) => [
                        styles.candidateFocusDigit,
                        selected && styles.candidateFocusDigitSelected,
                        complete && styles.numberKeyComplete,
                        pressed && styles.pressed,
                      ]}
                      testID={`candidate-focus-digit-${digit}`}
                    >
                      <Text
                        allowFontScaling={false}
                        style={[
                          styles.candidateFocusDigitText,
                          selected && styles.candidateFocusDigitTextSelected,
                        ]}
                      >
                        {digit}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.toolbar}>
            <ToolButton
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
              badge={snapshot.wallet.quick_pencil.balance}
              disabled={interactionDisabled}
              label={t('game.quick')}
              mark="✦"
              onPress={onQuickPencil}
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
              active={candidateFocusActive}
              activeTone="focus"
              disabled={interactionDisabled}
              label={
                !candidateFocusActive
                  ? t('game.candidateFocus')
                  : t('game.endCandidateFocus')
              }
              mark="◎"
              onPress={
                !candidateFocusActive ? startCandidateFocus : endCandidateFocus
              }
              testID="candidate-focus-tool"
              textScale={textScale}
            />
            <ToolButton
              badge={snapshot.wallet.smart_hint.balance}
              disabled={interactionDisabled}
              label={t('game.hint')}
              mark="?"
              onPress={onHint}
              textScale={textScale}
            />
          </View>
        </View>
        {growth &&
        session &&
        controlsHeight !== null &&
        viewportHeight - controlsHeight >= 70 &&
        fontScale <= 1.2 ? (
          <GrowthLightFeedback
            controller={growth}
            session={session}
            enabled={preferences.growthLightFeedback}
            safe={
              !interactionDisabled &&
              !snapshot.message &&
              !snapshot.replacementRequest &&
              !snapshot.quickDraftConfirmation
            }
          />
        ) : null}
      </ScrollView>

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

      {snapshot.busy ? (
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
      minHeight: 64 * textScale,
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
    headerRight: {
      textAlign: 'right',
    },
    headerCenter: {
      alignItems: 'center',
    },
    level: {
      color: palette.muted,
      fontSize: 10 * textScale,
      fontWeight: '800',
      letterSpacing: 1.2 * textScale,
    },
    timer: {
      color: palette.ink,
      fontSize: 19 * textScale,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      marginTop: 2,
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
    },
    metaText: {
      color: palette.muted,
      fontSize: 12 * textScale,
      fontWeight: '600',
    },
    metaDot: {
      color: palette.line,
      marginHorizontal: 8,
    },
    pauseOverlay: {
      alignItems: 'center',
      backgroundColor: palette.overlay,
      bottom: 0,
      justifyContent: 'center',
      left: 12,
      padding: 28,
      position: 'absolute',
      right: 12,
      top: 0,
    },
    pauseEyebrow: {
      color: palette.accent,
      fontSize: 11 * textScale,
      fontWeight: '800',
      letterSpacing: 1.4 * textScale,
    },
    pauseTitle: {
      color: palette.white,
      fontSize: 23 * textScale,
      fontWeight: '800',
      marginBottom: 22,
      marginTop: 7,
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 14,
      minWidth: 190,
      paddingHorizontal: 20,
      paddingVertical: 13,
    },
    primaryButtonText: {
      color: palette.white,
      fontSize: 15 * textScale,
      fontWeight: '800',
    },
    abandonText: {
      color: palette.error,
      fontSize: 14 * textScale,
      fontWeight: '700',
      marginTop: 18,
    },
    numberPad: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 18,
      paddingHorizontal: 12,
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
    toolActive: {
      backgroundColor: palette.accentSoft,
    },
    toolFocusActive: {
      backgroundColor: palette.focusSoft,
    },
    toolMark: {
      color: palette.ink,
      fontSize: 22 * textScale,
      fontWeight: '600',
    },
    toolMarkActive: {
      color: palette.accent,
    },
    toolMarkFocusActive: {
      color: palette.focus,
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
    toolLabelFocusActive: {
      color: palette.focus,
    },
    badge: {
      alignItems: 'center',
      backgroundColor: palette.accentWarm,
      borderRadius: 9 * textScale,
      height: 18 * textScale,
      justifyContent: 'center',
      minWidth: 18 * textScale,
      paddingHorizontal: 4 * textScale,
      position: 'absolute',
      right: 5,
      top: 4,
    },
    badgeText: {
      color: palette.ink,
      fontSize: 9 * textScale,
      fontWeight: '900',
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
    candidateFocusPanel: {
      backgroundColor: palette.focusSoft,
      borderColor: palette.focus,
      borderRadius: 14,
      borderWidth: 1,
      marginHorizontal: 12,
      marginTop: 12,
      padding: 12,
    },
    candidateFocusTitle: {
      color: palette.focus,
      fontSize: 13 * textScale,
      fontWeight: '800',
    },
    candidateFocusDigits: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    candidateFocusDigit: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.focus,
      borderRadius: 10,
      borderWidth: 1,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    candidateFocusDigitSelected: {
      backgroundColor: palette.focus,
      borderColor: palette.focus,
    },
    candidateFocusDigitText: {
      color: palette.focus,
      fontSize: 20 * textScale,
      fontWeight: '800',
    },
    candidateFocusDigitTextSelected: {
      color: palette.focusText,
    },
    pressed: {
      opacity: 0.65,
    },
  });
}
