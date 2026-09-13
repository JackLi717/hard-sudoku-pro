import { useScreenScroll, useScreenState } from '../screen-state';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { OfflineGameSnapshot } from '../../application';
import { premiumCompletionRewardForLevel } from '../../domain/game/progression';
import type { DifficultyLevel } from '../../domain/hints/techniques';
import { useLocalization } from '../../localization';
import type { CompletionResultSummary } from '../../data/user/user-repository';
import { CompletionCelebration } from '../components/CompletionCelebration';
import { CompletionRewardClaim } from '../components/CompletionRewardClaim';
import { LevelPickerModal } from '../components/LevelPickerModal';
import { AppPalette, useAppTheme } from '../theme';
import { sessionReviewCopy } from '../../debug/session-review-copy';
import { createResultPresentation } from './result-presentation';

type ResultScreenProps = {
  growthCard?: React.ReactNode;
  snapshot: OfflineGameSnapshot;
  onRetry(): void;
  onNext(): void;
  onReturnHome(): void;
  onStartLevel(level: DifficultyLevel): void;
  onOpenReview?(): void;
  onOpenReplay?(): void;
};

type RewardClaimPresentation = {
  quickPencil: number;
  smartHint: number;
};

function formatTime(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function createRewardClaimPresentation(
  completionResult: CompletionResultSummary | null,
  difficultyLevel: DifficultyLevel,
): RewardClaimPresentation | null {
  if (
    !completionResult?.isFirstCompletion ||
    !completionResult.reward.premiumAtCompletion
  ) {
    return null;
  }
  return premiumCompletionRewardForLevel(difficultyLevel);
}

export function ResultScreen({
  snapshot,
  growthCard,
  onRetry,
  onNext,
  onReturnHome,
  onStartLevel,
  onOpenReview,
  onOpenReplay,
}: ResultScreenProps): React.JSX.Element | null {
  const { t, locale } = useLocalization();
  const { palette } = useAppTheme();
  const sessionId = snapshot.session?.state.sessionId ?? 'missing';
  const scroll = useScreenScroll(`result:${sessionId}`);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useScreenState(
    `completion-reward-claimed:${sessionId}`,
    false,
  );
  const state = snapshot.session?.state;
  if (!state) {
    return null;
  }
  const completed = state.status === 'completed';
  const reward = snapshot.completionResult?.reward ?? snapshot.reward;
  const presentation = completed
    ? createResultPresentation({
        sessionId: state.sessionId,
        difficultyLevel: state.difficultyLevel,
        completionKind: state.completionKind,
        isFirstCompletion:
          snapshot.completionResult?.isFirstCompletion ??
          reward?.isFirstCompletion ??
          false,
        isNewLevelBest: snapshot.completionResult?.isNewLevelBest ?? false,
        totalCompletions: snapshot.statistics?.completions ?? 0,
      })
    : null;
  const title = presentation
    ? t(presentation.title.key, presentation.title.params)
    : t('result.ended');
  const subtitle = completed ? null : t('result.failed');
  const levelActionLabel = t(
    completed ? 'result.changeLevel' : 'result.chooseLevel',
  );
  const rewardClaim = completed
    ? createRewardClaimPresentation(
        snapshot.completionResult,
        state.difficultyLevel,
      )
    : null;
  const metrics = [
    {
      id: 'time',
      label: t('result.time'),
      value: formatTime(state.timer.elapsedMs),
    },
    {
      id: 'mistakes',
      label: t('result.mistakes'),
      value: String(state.errorCount),
    },
    {
      id: 'hints',
      label: t('result.hints'),
      value: String(state.hintUseCount),
    },
  ];
  const startLevel = (level: DifficultyLevel) => {
    setLevelPickerOpen(false);
    onStartLevel(level);
  };

  return (
    <>
      <ScrollView
        {...scroll}
        contentContainerStyle={[
          styles.content,
          completed && styles.completionContent,
        ]}
      >
        {completed ? (
          <CompletionCelebration
            key={state.sessionId}
            sessionId={state.sessionId}
          />
        ) : (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.symbol, styles.symbolFailed]}
          >
            <Text allowFontScaling={false} style={styles.symbolText}>
              ×
            </Text>
          </View>
        )}
        <Text
          accessibilityRole="header"
          style={styles.title}
          testID="result-title"
        >
          {title}
        </Text>
        <Text style={styles.eyebrow}>
          {t('game.level', { level: state.difficultyLevel })}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View
          style={[styles.metrics, !completed && styles.failedMetrics]}
          testID="result-metrics-grid"
        >
          {metrics.map((metric, index) => (
            <View
              accessible
              accessibilityLabel={`${metric.label}, ${metric.value}`}
              key={metric.id}
              style={[
                styles.metric,
                index > 0 && styles.metricDivider,
                !completed && styles.failedMetric,
              ]}
            >
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>

        {completed ? (
          <Pressable
            accessibilityRole="button"
            onPress={onNext}
            style={styles.primaryButton}
            testID="result-next-puzzle"
          >
            <Text style={styles.primaryText}>{t('result.nextPuzzle')}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.primaryButton}
            testID="result-retry"
          >
            <Text style={styles.primaryText}>{t('result.retry')}</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={completed ? () => setLevelPickerOpen(true) : onReturnHome}
          style={styles.secondaryButton}
          testID="result-choose-level"
        >
          <Text style={styles.secondaryText}>{levelActionLabel}</Text>
        </Pressable>
        {completed && onOpenReplay ? (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenReplay}
            style={styles.tertiaryButton}
            testID="result-open-replay"
          >
            <Text style={styles.tertiaryText}>{t('result.openReplay')}</Text>
            <Text
              accessibilityElementsHidden
              allowFontScaling={false}
              importantForAccessibility="no-hide-descendants"
              style={styles.tertiaryChevron}
            >
              ›
            </Text>
          </Pressable>
        ) : null}
        {growthCard}
        {__DEV__ && completed && onOpenReview ? (
          <Pressable
            accessibilityRole="button"
            onPress={onOpenReview}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>
              {sessionReviewCopy(locale).entry}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <LevelPickerModal
        busy={snapshot.busy}
        completedByLevel={snapshot.completedByLevel}
        onClose={() => setLevelPickerOpen(false)}
        onSelect={startLevel}
        visible={completed && levelPickerOpen}
      />
      {rewardClaim && !rewardClaimed ? (
        <CompletionRewardClaim
          key={state.sessionId}
          onCollected={() => setRewardClaimed(true)}
          quickPencil={rewardClaim.quickPencil}
          smartHint={rewardClaim.smartHint}
        />
      ) : null}
    </>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    content: {
      alignItems: 'center',
      flexGrow: 1,
      justifyContent: 'center',
      backgroundColor: palette.background,
      padding: 24,
    },
    completionContent: {
      justifyContent: 'flex-start',
      paddingBottom: 40,
      paddingTop: 28,
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
      marginTop: 8,
    },
    title: {
      color: palette.ink,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.8,
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
      borderBottomColor: palette.line,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.line,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      flexWrap: 'nowrap',
      marginTop: 24,
      paddingVertical: 12,
      width: '100%',
    },
    failedMetrics: {
      flexWrap: 'nowrap',
    },
    metric: {
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 4,
    },
    metricDivider: {
      borderLeftColor: palette.line,
      borderLeftWidth: StyleSheet.hairlineWidth,
    },
    failedMetric: {
      flexBasis: 0,
      minWidth: 0,
    },
    metricValue: {
      color: palette.ink,
      fontSize: 20,
      fontWeight: '800',
    },
    metricLabel: {
      color: palette.muted,
      fontSize: 10,
      marginTop: 3,
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
    tertiaryButton: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 7,
      padding: 11,
    },
    tertiaryText: {
      color: palette.accent,
      fontSize: 13,
      fontWeight: '700',
    },
    tertiaryChevron: {
      color: palette.accent,
      fontSize: 20,
      lineHeight: 20,
      marginLeft: 4,
    },
  });
}
