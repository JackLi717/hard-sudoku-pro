import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { OfflineGameSnapshot } from '../../application';
import { getElapsedMs } from '../../domain/game/engine';
import { buildHintPresentation } from '../../domain/hints/presentation';
import { Digit } from '../../domain/sudoku/contracts';
import { SudokuBoard } from '../components/SudokuBoard';
import { palette } from '../theme';

type GameScreenProps = {
  snapshot: OfflineGameSnapshot;
  nowEpochMs: number;
  onBack(): void;
  onPause(): void;
  onResume(): void;
  onAbandon(): void;
  onSelectCell(cell: number): void;
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

function formatElapsed(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(
    2,
    '0',
  )}`;
}

type ToolButtonProps = {
  label: string;
  mark: string;
  active?: boolean;
  badge?: number;
  disabled?: boolean;
  onPress(): void;
};

function ToolButton({
  label,
  mark,
  active = false,
  badge,
  disabled = false,
  onPress,
}: ToolButtonProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityLabel={`${label}${active ? ', on' : ''}${
        badge === undefined ? '' : `, ${badge} remaining`
      }`}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tool,
        active && styles.toolActive,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.toolMark, active && styles.toolMarkActive]}>
        {mark}
      </Text>
      <Text style={[styles.toolLabel, active && styles.toolLabelActive]}>
        {label}
      </Text>
      {badge !== undefined ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function GameScreen({
  snapshot,
  nowEpochMs,
  onBack,
  onPause,
  onResume,
  onAbandon,
  onSelectCell,
  onDigit,
  onUndo,
  onErase,
  onQuickPencil,
  onPencil,
  onHint,
  onApplyHint,
  onDismissHint,
}: GameScreenProps): React.JSX.Element | null {
  const session = snapshot.session;
  const activeHint = session?.state.activeHint ?? null;
  const hintPresentation = useMemo(
    () => (activeHint ? buildHintPresentation(activeHint) : null),
    [activeHint],
  );
  const [hintPageIndex, setHintPageIndex] = useState(0);
  const [hintApplying, setHintApplying] = useState(false);
  const hintEntrance = useRef(new Animated.Value(0)).current;
  const hintApplyScale = useRef(new Animated.Value(1)).current;
  const hintPage = hintPresentation?.pages[hintPageIndex] ?? null;

  useEffect(() => {
    if (!hintPresentation) {
      setHintPageIndex(0);
      setHintApplying(false);
      hintEntrance.setValue(0);
      hintApplyScale.setValue(1);
      return;
    }
    setHintPageIndex(0);
    hintEntrance.setValue(0);
    Animated.timing(hintEntrance, {
      duration: 220,
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [hintApplyScale, hintEntrance, hintPresentation]);

  const applyPresentedHint = () => {
    if (hintApplying || snapshot.busy) {
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

  if (!session) {
    return null;
  }
  const state = session.state;
  const paused = state.status === 'paused';
  const hintOpen = activeHint !== null;
  const interactionDisabled = snapshot.busy || paused || hintOpen;
  const counts = DIGITS.reduce<Record<number, number>>((result, digit) => {
    result[digit] = state.values.filter(value => value === digit).length;
    return result;
  }, {});

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>‹ Home</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.level}>LEVEL {state.difficultyLevel}</Text>
          <Text style={styles.timer}>
            {formatElapsed(getElapsedMs(state, nowEpochMs))}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onPause}
          style={styles.headerButton}
        >
          <Text style={[styles.headerButtonText, styles.headerRight]}>
            Pause
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          hintOpen && styles.contentWithHint,
        ]}
        scrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gameMeta}>
          <Text style={styles.metaText}>Mistakes {state.errorCount}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>
            {state.candidates.activeCandidateSource === 'quick'
              ? 'Quick draft'
              : 'Manual draft'}
          </Text>
        </View>

        <View>
          <SudokuBoard
            disabled={interactionDisabled}
            hintVisuals={hintPage?.visuals}
            onSelectCell={onSelectCell}
            state={state}
          />
          {paused ? (
            <View style={styles.pauseOverlay}>
              <Text style={styles.pauseEyebrow}>GAME PAUSED</Text>
              <Text style={styles.pauseTitle}>Your board is hidden</Text>
              <Pressable
                accessibilityRole="button"
                onPress={onResume}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Continue game</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onAbandon}>
                <Text style={styles.abandonText}>Abandon this game</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={styles.numberPad}>
          {DIGITS.map(digit => (
            <Pressable
              key={digit}
              accessibilityLabel={`Enter ${digit}, ${
                9 - counts[digit]
              } remaining`}
              accessibilityRole="button"
              disabled={interactionDisabled}
              onPress={() => onDigit(digit)}
              style={({ pressed }) => [
                styles.numberKey,
                counts[digit] >= 9 && styles.numberKeyComplete,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.numberValue}>{digit}</Text>
              <Text style={styles.numberRemaining}>{9 - counts[digit]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.toolbar}>
          <ToolButton
            disabled={interactionDisabled}
            label="Undo"
            mark="↶"
            onPress={onUndo}
          />
          <ToolButton
            disabled={interactionDisabled}
            label="Erase"
            mark="◇"
            onPress={onErase}
          />
          <ToolButton
            active={state.candidates.activeCandidateSource === 'quick'}
            badge={snapshot.wallet.quick_pencil.balance}
            disabled={interactionDisabled}
            label="Quick"
            mark="✦"
            onPress={onQuickPencil}
          />
          <ToolButton
            active={state.candidates.pencilMode}
            disabled={interactionDisabled}
            label="Pencil"
            mark="✎"
            onPress={onPencil}
          />
          <ToolButton
            badge={snapshot.wallet.smart_hint.balance}
            disabled={interactionDisabled}
            label="Hint"
            mark="?"
            onPress={onHint}
          />
        </View>
      </ScrollView>

      {hintOpen && hintPresentation && hintPage ? (
        <Animated.View
          accessibilityLabel={`${hintPresentation.techniqueName}. ${hintPage.accessibilitySummary}`}
          accessibilityLiveRegion="polite"
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
          <Text style={styles.hintEyebrow}>SMART HINT</Text>
          <Text style={styles.hintTitle}>{hintPresentation.techniqueName}</Text>
          <Text style={styles.hintPageTitle}>{hintPage.title}</Text>
          <Text style={styles.hintBody}>{hintPage.body}</Text>
          <View
            accessibilityLabel={`Step ${hintPageIndex + 1} of ${
              hintPresentation.pages.length
            }`}
            style={styles.hintDots}
          >
            {hintPresentation.pages.map((page, index) => (
              <View
                key={page.kind}
                style={[
                  styles.hintDot,
                  index === hintPageIndex && styles.hintDotActive,
                ]}
              />
            ))}
          </View>
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
              <Text style={styles.secondaryButtonText}>
                {hintPageIndex === 0 ? 'Close' : 'Back'}
              </Text>
            </Pressable>
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
              <Text style={styles.primaryButtonText}>
                {hintPageIndex === hintPresentation.pages.length - 1
                  ? hintApplying
                    ? 'Applying…'
                    : 'Apply step'
                  : 'Next'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {snapshot.busy ? (
        <View pointerEvents="none" style={styles.busyIndicator}>
          <ActivityIndicator color={palette.accent} size="small" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: 12,
  },
  headerButton: {
    flex: 1,
    paddingVertical: 10,
  },
  headerButtonText: {
    color: palette.accent,
    fontSize: 15,
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
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  timer: {
    color: palette.ink,
    fontSize: 19,
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
  gameMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  metaText: {
    color: palette.muted,
    fontSize: 12,
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
    color: '#BDE7D8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  pauseTitle: {
    color: palette.white,
    fontSize: 23,
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
    fontSize: 15,
    fontWeight: '800',
  },
  abandonText: {
    color: '#F7C6C1',
    fontSize: 14,
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
  numberValue: {
    color: palette.accent,
    fontSize: 25,
    fontWeight: '700',
  },
  numberRemaining: {
    color: palette.muted,
    fontSize: 9,
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
    minHeight: 68,
    paddingBottom: 7,
    paddingTop: 8,
    position: 'relative',
  },
  toolActive: {
    backgroundColor: palette.accentSoft,
  },
  toolMark: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '600',
  },
  toolMarkActive: {
    color: palette.accent,
  },
  toolLabel: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  toolLabelActive: {
    color: palette.accent,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: palette.accentWarm,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: 5,
    top: 4,
  },
  badgeText: {
    color: palette.ink,
    fontSize: 9,
    fontWeight: '900',
  },
  hintCard: {
    backgroundColor: palette.surface,
    borderColor: '#D8D1C5',
    borderRadius: 18,
    borderWidth: 1,
    bottom: 8,
    elevation: 8,
    left: 12,
    padding: 18,
    position: 'absolute',
    right: 12,
    shadowColor: palette.ink,
    shadowOffset: { height: -3, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    zIndex: 10,
  },
  hintEyebrow: {
    color: palette.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  hintTitle: {
    color: palette.ink,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  hintPageTitle: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 13,
  },
  hintBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },
  hintActions: {
    flexDirection: 'row',
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
  secondaryButton: {
    borderColor: palette.line,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
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
    top: 68,
  },
  pressed: {
    opacity: 0.65,
  },
});
