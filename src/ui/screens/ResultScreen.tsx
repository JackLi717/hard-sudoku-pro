import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OfflineGameSnapshot } from '../../application';
import { palette } from '../theme';

type ResultScreenProps = {
  snapshot: OfflineGameSnapshot;
  onRetry(): void;
  onNext(): void;
  onNewGame(): void;
};

function formatTime(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function ResultScreen({
  snapshot,
  onRetry,
  onNext,
  onNewGame,
}: ResultScreenProps): React.JSX.Element | null {
  const state = snapshot.session?.state;
  if (!state) {
    return null;
  }
  const completed = state.status === 'completed';
  const reward = snapshot.reward;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.symbol, !completed && styles.symbolFailed]}>
        <Text style={styles.symbolText}>{completed ? '✓' : '×'}</Text>
      </View>
      <Text style={styles.eyebrow}>LEVEL {state.difficultyLevel}</Text>
      <Text style={styles.title}>
        {completed ? 'Puzzle complete' : 'Attempt ended'}
      </Text>
      <Text style={styles.subtitle}>
        {completed
          ? state.completionKind === 'perfect'
            ? 'A clean solve — no mistakes and no smart hints.'
            : 'Your progress and rewards are safely stored.'
          : 'Try the same puzzle again or choose another level.'}
      </Text>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {formatTime(state.timer.elapsedMs)}
          </Text>
          <Text style={styles.metricLabel}>Time</Text>
        </View>
        <View style={styles.rule} />
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{state.errorCount}</Text>
          <Text style={styles.metricLabel}>Mistakes</Text>
        </View>
        <View style={styles.rule} />
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{state.hintUseCount}</Text>
          <Text style={styles.metricLabel}>Hints</Text>
        </View>
      </View>

      {completed && reward?.isFirstCompletion ? (
        <View style={styles.rewardCard}>
          <Text style={styles.rewardEyebrow}>FIRST COMPLETION REWARD</Text>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardText}>
              Quick pencil +{reward.quickPencil}
            </Text>
            <Text style={styles.rewardText}>
              Smart hint +{reward.smartHint}
            </Text>
          </View>
          {reward.perfectBonus || reward.streakBonus ? (
            <Text style={styles.bonusText}>
              {reward.perfectBonus ? 'Perfect bonus  ' : ''}
              {reward.streakBonus ? 'Streak bonus' : ''}
            </Text>
          ) : null}
        </View>
      ) : null}

      {completed ? (
        <Pressable onPress={onNext} style={styles.primaryButton}>
          <Text style={styles.primaryText}>
            Next Level {state.difficultyLevel} puzzle
          </Text>
        </Pressable>
      ) : (
        <Pressable onPress={onRetry} style={styles.primaryButton}>
          <Text style={styles.primaryText}>Retry this puzzle</Text>
        </Pressable>
      )}
      <Pressable onPress={onNewGame} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Choose a new level</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  symbol: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    marginBottom: 22,
    width: 76,
  },
  symbolFailed: {
    backgroundColor: palette.error,
  },
  symbolText: {
    color: palette.white,
    fontSize: 42,
    fontWeight: '700',
    lineHeight: 48,
  },
  eyebrow: {
    color: palette.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  title: {
    color: palette.ink,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 7,
    textAlign: 'center',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 9,
    maxWidth: 360,
    textAlign: 'center',
  },
  metrics: {
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 18,
    flexDirection: 'row',
    marginTop: 28,
    paddingVertical: 17,
    width: '100%',
  },
  metric: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 3,
  },
  rule: {
    backgroundColor: '#DED9CF',
    height: 34,
    width: 1,
  },
  rewardCard: {
    backgroundColor: '#F7E8C9',
    borderRadius: 16,
    marginTop: 14,
    padding: 16,
    width: '100%',
  },
  rewardEyebrow: {
    color: '#76571F',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  rewardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rewardText: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  bonusText: {
    color: '#76571F',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: 15,
    marginTop: 24,
    padding: 15,
    width: '100%',
  },
  primaryText: {
    color: palette.white,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: palette.line,
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 10,
    padding: 14,
    width: '100%',
  },
  secondaryText: {
    color: palette.ink,
    fontSize: 15,
    fontWeight: '700',
  },
});
