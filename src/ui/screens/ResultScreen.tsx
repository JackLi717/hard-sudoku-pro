import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OfflineGameSnapshot } from '../../application';
import { useLocalization } from '../../localization';
import { AppPalette, useAppTheme } from '../theme';

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
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
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
      <Text style={styles.eyebrow}>
        {t('game.level', { level: state.difficultyLevel })}
      </Text>
      <Text accessibilityRole="header" style={styles.title}>
        {completed ? t('result.complete') : t('result.ended')}
      </Text>
      <Text style={styles.subtitle}>
        {completed
          ? state.completionKind === 'perfect'
            ? t('result.perfect')
            : t('result.saved')
          : t('result.failed')}
      </Text>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {formatTime(state.timer.elapsedMs)}
          </Text>
          <Text style={styles.metricLabel}>{t('result.time')}</Text>
        </View>
        <View style={styles.rule} />
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{state.errorCount}</Text>
          <Text style={styles.metricLabel}>{t('result.mistakes')}</Text>
        </View>
        <View style={styles.rule} />
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{state.hintUseCount}</Text>
          <Text style={styles.metricLabel}>{t('result.hints')}</Text>
        </View>
      </View>

      {completed && reward?.isFirstCompletion ? (
        <View style={styles.rewardCard}>
          <Text style={styles.rewardEyebrow}>{t('result.firstReward')}</Text>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardText}>
              {t('result.quickReward', { count: reward.quickPencil })}
            </Text>
            <Text style={styles.rewardText}>
              {t('result.hintReward', { count: reward.smartHint })}
            </Text>
          </View>
          {reward.perfectBonus || reward.streakBonus ? (
            <Text style={styles.bonusText}>
              {reward.perfectBonus ? `${t('result.perfectBonus')}  ` : ''}
              {reward.streakBonus ? t('result.streakBonus') : ''}
            </Text>
          ) : null}
        </View>
      ) : null}

      {completed ? (
        <Pressable
          accessibilityRole="button"
          onPress={onNext}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryText}>
            {t('result.nextPuzzle', { level: state.difficultyLevel })}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryText}>{t('result.retry')}</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={onNewGame}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryText}>{t('result.chooseLevel')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    content: {
      alignItems: 'center',
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
      backgroundColor: palette.background,
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
      backgroundColor: palette.line,
      height: 34,
      width: 1,
    },
    rewardCard: {
      backgroundColor: palette.hintResult,
      borderRadius: 16,
      marginTop: 14,
      padding: 16,
      width: '100%',
    },
    rewardEyebrow: {
      color: palette.ink,
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
      color: palette.ink,
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
}
