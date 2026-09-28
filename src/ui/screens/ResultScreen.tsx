import { useScreenScroll, useScreenState } from '../screen-state';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { OfflineGameSnapshot } from '../../application';
import { premiumCompletionRewardForLevel } from '../../domain/game/progression';
import type { DifficultyLevel } from '../../domain/hints/techniques';
import { useLocalization } from '../../localization';
import type { CompletionResultSummary } from '../../data/user/user-repository';
import { APP_ICON_SIZE, AppIcon } from '../components/AppIcon';
import { CompletionCelebration } from '../components/CompletionCelebration';
import { CompletionRewardClaim } from '../components/CompletionRewardClaim';
import { LevelPickerModal } from '../components/LevelPickerModal';
import { AppPalette, useAppTheme } from '../theme';
import { sessionReviewCopy } from '../../debug/session-review-copy';
import { createResultPresentation } from './result-presentation';
import { ShareCardModal } from './ShareCardModal';
import {
  SHARE_CARD_COPY,
  shareCardFactsFromCompletedGame,
} from './share-card-presentation';
import { useAdaptiveLayout } from '../layout/adaptive-layout';

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
  const { useLandscapeTabletLayout } = useAdaptiveLayout();
  const sessionId = snapshot.session?.state.sessionId ?? 'missing';
  const scroll = useScreenScroll(`result:${sessionId}`);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useScreenState(
    `completion-reward-claimed:${sessionId}`,
    false,
  );
  const state = snapshot.session?.state;
  if (!state) {
    return null;
  }
  const completed = state.status === 'completed';
  const shareFacts = shareCardFactsFromCompletedGame(
    state,
    snapshot.completionResult?.isNewLevelBest ?? false,
  );
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
  const score = completed ? snapshot.completionResult?.score ?? null : null;
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
          completed && !useLandscapeTabletLayout && styles.completionContent,
        ]}
      >
        <View
          style={[
            styles.resultLayout,
            useLandscapeTabletLayout && styles.resultLayoutLandscape,
            completed &&
              useLandscapeTabletLayout &&
              styles.resultLayoutCompletionTablet,
          ]}
          testID={
            useLandscapeTabletLayout
              ? 'result-landscape-layout'
              : 'result-portrait-layout'
          }
        >
          <View style={styles.resultSummary}>
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
                <AppIcon
                  color={palette.white}
                  name="close"
                  size={APP_ICON_SIZE.prominent}
                />
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
            {score ? (
              <View
                accessible
                accessibilityLabel={`${t(
                  'result.score',
                )}, ${score.totalScore.toLocaleString(locale)}`}
                style={styles.scoreCard}
                testID="result-score"
              >
                <Text style={styles.scoreValue}>
                  {score.totalScore.toLocaleString(locale)}
                </Text>
                <Text style={styles.scoreLabel}>{t('result.score')}</Text>
                <View style={styles.scoreBonuses}>
                  {score.noMistakeBonus > 0 ? (
                    <Text style={styles.scoreBonus}>
                      {t('result.scoreNoMistakeBonus', {
                        score: score.noMistakeBonus.toLocaleString(locale),
                      })}
                    </Text>
                  ) : null}
                  {score.noHintBonus > 0 ? (
                    <Text style={styles.scoreBonus}>
                      {t('result.scoreNoHintBonus', {
                        score: score.noHintBonus.toLocaleString(locale),
                      })}
                    </Text>
                  ) : null}
                </View>
              </View>
            ) : null}
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
          </View>

          <View
            style={[
              styles.resultActions,
              completed &&
                useLandscapeTabletLayout &&
                styles.resultActionsCompletionTablet,
            ]}
          >
            {completed ? (
              <Pressable
                accessibilityRole="button"
                onPress={onNext}
                style={[
                  styles.primaryButton,
                  completed &&
                    useLandscapeTabletLayout &&
                    styles.tabletPrimaryButton,
                ]}
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
            {shareFacts ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShareOpen(true)}
                style={[
                  styles.secondaryButton,
                  completed &&
                    useLandscapeTabletLayout &&
                    styles.tabletSecondaryButton,
                ]}
                testID="result-share"
              >
                <Text style={styles.secondaryText}>
                  {SHARE_CARD_COPY[locale].shareResult}
                </Text>
              </Pressable>
            ) : null}
            {!completed ? (
              <Pressable
                accessibilityRole="button"
                onPress={onReturnHome}
                style={styles.secondaryButton}
                testID="result-choose-level"
              >
                <Text style={styles.secondaryText}>{levelActionLabel}</Text>
              </Pressable>
            ) : null}
            {completed && onOpenReplay ? (
              <Pressable
                accessibilityRole="button"
                onPress={onOpenReplay}
                style={styles.tertiaryButton}
                testID="result-open-replay"
              >
                <Text style={styles.tertiaryText}>
                  {t('result.openReplay')}
                </Text>
                <AppIcon
                  color={palette.accent}
                  name="forward"
                  size={APP_ICON_SIZE.compact}
                  style={styles.tertiaryChevron}
                />
              </Pressable>
            ) : null}
            {completed ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setLevelPickerOpen(true)}
                style={styles.tertiaryButton}
                testID="result-choose-level"
              >
                <Text style={styles.tertiaryText}>{levelActionLabel}</Text>
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
          </View>
        </View>
      </ScrollView>
      <LevelPickerModal
        busy={snapshot.busy}
        completedByLevel={snapshot.completedByLevel}
        onClose={() => setLevelPickerOpen(false)}
        onSelect={startLevel}
        visible={completed && levelPickerOpen}
      />
      <ShareCardModal
        facts={shareOpen ? shareFacts : null}
        onClose={() => setShareOpen(false)}
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
      alignSelf: 'center',
      flexGrow: 1,
      justifyContent: 'center',
      backgroundColor: palette.background,
      maxWidth: 980,
      padding: 24,
      width: '100%',
    },
    resultLayout: {
      alignItems: 'center',
      width: '100%',
    },
    resultLayoutLandscape: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 48,
      justifyContent: 'center',
    },
    resultLayoutCompletionTablet: {
      gap: 64,
    },
    resultSummary: {
      alignItems: 'center',
      flex: 1,
      maxWidth: 440,
      width: '100%',
    },
    resultActions: {
      flex: 1,
      maxWidth: 400,
      width: '100%',
    },
    resultActionsCompletionTablet: {
      alignItems: 'center',
      maxWidth: 320,
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
    scoreCard: {
      alignItems: 'center',
      marginTop: 20,
    },
    scoreValue: {
      color: palette.accent,
      fontSize: 38,
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
      letterSpacing: -0.8,
    },
    scoreLabel: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.2,
      marginTop: 1,
      textTransform: 'uppercase',
    },
    scoreBonuses: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
      marginTop: 7,
    },
    scoreBonus: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: '700',
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
    tabletPrimaryButton: {
      borderRadius: 13,
      marginTop: 12,
      maxWidth: 300,
      paddingVertical: 12,
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
    tabletSecondaryButton: {
      borderRadius: 13,
      marginTop: 9,
      maxWidth: 300,
      paddingVertical: 11,
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
      marginLeft: 4,
    },
  });
}
