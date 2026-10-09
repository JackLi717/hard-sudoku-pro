import { LocalizedText as Text } from '../components/LocalizedText';
import { productAnalytics } from '../../application/analytics/contracts';
import { useScreenScroll } from '../screen-state';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable } from '../components/FocusablePressable';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import type { OfflineGameSnapshot } from '../../application';
import type {
  AdAvailability,
  CompletionAdRedemptionResult,
} from '../../application/commercial/contracts';
import type { DifficultyLevel } from '../../domain/hints/techniques';
import { useLocalization } from '../../localization';
import { APP_ICON_SIZE, AppIcon } from '../components/AppIcon';
import { CompletionCelebration } from '../components/CompletionCelebration';
import { LevelPickerModal } from '../components/LevelPickerModal';
import { AppPalette, useAppTheme } from '../theme';
import { sessionReviewCopy } from '../../debug/session-review-copy';
import { createResultPresentation } from './result-presentation';
import { ShareCardModal } from './ShareCardModal';
import {
  SHARE_CARD_COPY,
  shareCardFactsFromCompletedGame,
} from './share-card-presentation';
import {
  useAdaptiveLayout,
  useContainerLayout,
} from '../layout/adaptive-layout';

type ResultScreenProps = {
  growthCard?: React.ReactNode;
  snapshot: OfflineGameSnapshot;
  onRetry(): void;
  onNext(): void;
  onReturnHome(): void;
  onStartLevel(level: DifficultyLevel): void;
  onOpenReview?(): void;
  onOpenReplay?(): void;
  premium?: boolean;
  onCheckCompletionAd?(): Promise<AdAvailability>;
  onWatchCompletionAd?(): Promise<CompletionAdRedemptionResult>;
};

function formatTime(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
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
  premium = false,
  onCheckCompletionAd,
  onWatchCompletionAd,
}: ResultScreenProps): React.JSX.Element | null {
  const { t, locale } = useLocalization();
  const { palette } = useAppTheme();
  const container = useContainerLayout();
  const { useLandscapeTabletLayout } = useAdaptiveLayout(container);
  const { fontScale } = useWindowDimensions();
  const compact = container.height < 620 || fontScale > 1.3;
  const sessionId = snapshot.session?.state.sessionId ?? 'missing';
  const scroll = useScreenScroll(`result:${sessionId}`);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [adAvailability, setAdAvailability] = useState<AdAvailability | null>(
    null,
  );
  const [adBusy, setAdBusy] = useState(false);
  const [adMessage, setAdMessage] = useState<string | null>(null);
  const state = snapshot.session?.state;
  const completed = state?.status === 'completed';
  const premiumReward =
    premium ||
    snapshot.completionResult?.reward.premiumAtCompletion === true ||
    snapshot.reward?.premiumAtCompletion === true;
  useEffect(() => {
    if (!completed || premiumReward || !onCheckCompletionAd) return;
    let active = true;
    let offered = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    setAdAvailability(null);
    const check = () => {
      onCheckCompletionAd()
        .then(availability => {
          if (!active) return;
          setAdAvailability(availability);
          if (!offered && availability.status === 'available') {
            offered = true;
            productAnalytics.track('rewarded_ad_offer_view', {
              entry: 'game_completion',
            });
          }
          if (
            availability.status === 'unavailable' &&
            availability.reason === 'not_loaded'
          ) {
            retryTimer = setTimeout(check, 1500);
          }
        })
        .catch(() => {
          if (active)
            setAdAvailability({ status: 'unavailable', reason: 'offline' });
        });
    };
    check();
    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
    // The result's session is the availability query boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, completed, premiumReward]);
  if (!state) {
    return null;
  }
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
  const hintRewardProgress =
    snapshot.completionResult?.hintRewardProgress ??
    snapshot.hintRewardProgress ??
    0;
  const visibleRewardSegments =
    reward?.isFirstCompletion && reward.smartHint > 0 ? 3 : hintRewardProgress;
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

  const watchCompletionAd = async () => {
    if (!onWatchCompletionAd || adBusy) return;
    setAdBusy(true);
    setAdMessage(null);
    try {
      const result = await onWatchCompletionAd();
      if (result.status === 'credited') {
        setAdAvailability({ status: 'disabled', reason: 'already_claimed' });
        setAdMessage(t('result.completionAd.claimed'));
      } else if (result.status === 'dismissed') {
        setAdMessage(t('result.completionAd.dismissed'));
      } else {
        setAdMessage(t('result.completionAd.unavailable'));
      }
    } catch {
      setAdMessage(t('result.completionAd.unavailable'));
    } finally {
      setAdBusy(false);
    }
  };

  const rewardDetail = reward?.isFirstCompletion
    ? reward.smartHint > 0
      ? t('result.rewardProgress.credited')
      : hintRewardProgress === 0
      ? t('result.rewardProgress.full')
      : t('result.rewardProgress.remaining', { count: 3 - hintRewardProgress })
    : t('result.rewardProgress.replay');
  const bonusLabels = score
    ? [
        score.noMistakeBonus > 0
          ? t('result.scoreNoMistakeBonus', {
              score: score.noMistakeBonus.toLocaleString(locale),
            })
          : null,
        score.noHintBonus > 0
          ? t('result.scoreNoHintBonus', {
              score: score.noHintBonus.toLocaleString(locale),
            })
          : null,
      ].filter(Boolean)
    : [];
  const metricRow = (
    <View
      style={[
        styles.metrics,
        completed && compact && styles.compactMetrics,
        !completed && styles.failedMetrics,
      ]}
      testID="result-metrics-grid"
    >
      {metrics.map((metric, index) => (
        <View
          accessible
          accessibilityLabel={`${metric.label}, ${metric.value}`}
          key={metric.id}
          style={[styles.metric, index > 0 && styles.metricDivider]}
        >
          <Text
            maxFontSizeMultiplier={
              completed ? (compact ? 1.1 : 1.3) : undefined
            }
            style={[styles.metricValue, !completed && styles.failedMetricValue]}
          >
            {metric.value}
          </Text>
          <Text
            maxFontSizeMultiplier={
              completed ? (compact ? 1.1 : 1.3) : undefined
            }
            style={[styles.metricLabel, !completed && styles.failedMetricLabel]}
          >
            {metric.label}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <>
      {completed ? (
        <View
          onLayout={container.onLayout}
          style={[styles.viewport, compact && styles.compactViewport]}
          testID="result-completion-viewport"
        >
          <View
            style={[
              styles.completionLayout,
              compact && styles.compactLayout,
              useLandscapeTabletLayout && styles.landscapeLayout,
            ]}
            testID={
              useLandscapeTabletLayout
                ? 'result-landscape-layout'
                : 'result-portrait-layout'
            }
          >
            <View
              style={[
                styles.achievement,
                useLandscapeTabletLayout && styles.landscapeColumn,
              ]}
              testID="result-achievement"
            >
              <View style={styles.headingRow}>
                <CompletionCelebration
                  key={state.sessionId}
                  sessionId={state.sessionId}
                  size={compact ? 56 : 92}
                />
                <View style={styles.headingCopy}>
                  <Text
                    maxFontSizeMultiplier={compact ? 1.1 : 1.2}
                    style={styles.eyebrow}
                  >
                    {t('game.level', { level: state.difficultyLevel })}
                  </Text>
                  <Text
                    accessibilityRole="header"
                    maxFontSizeMultiplier={compact ? 1.15 : 1.3}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    numberOfLines={2}
                    style={[styles.title, compact && styles.compactTitle]}
                    testID="result-title"
                  >
                    {title}
                  </Text>
                </View>
              </View>
              {presentation && presentation.honors.length > 0 ? (
                <View
                  style={[styles.honors, compact && styles.compactHonors]}
                  testID="result-honors"
                >
                  {(compact
                    ? presentation.honors.slice(-1)
                    : presentation.honors
                  ).map(honor => (
                    <Text
                      key={honor.kind}
                      maxFontSizeMultiplier={compact ? 1.1 : 1.2}
                      style={styles.honorText}
                      testID={`result-honor-${honor.kind}`}
                    >
                      {t(honor.copy.key, honor.copy.params)}
                    </Text>
                  ))}
                </View>
              ) : null}
              {score ? (
                <View
                  accessible
                  accessibilityLabel={[
                    `${t('result.score')}, ${score.totalScore.toLocaleString(
                      locale,
                    )}`,
                    ...bonusLabels,
                  ].join(', ')}
                  style={[styles.score, compact && styles.compactScore]}
                  testID="result-score"
                >
                  <Text
                    maxFontSizeMultiplier={compact ? 1.1 : 1.2}
                    style={styles.scoreLabel}
                  >
                    {t('result.score')}
                  </Text>
                  <Text
                    maxFontSizeMultiplier={compact ? 1.1 : 1.2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                    numberOfLines={1}
                    style={[
                      styles.scoreValue,
                      compact && styles.compactScoreValue,
                    ]}
                  >
                    {score.totalScore.toLocaleString(locale)}
                  </Text>
                  {bonusLabels.length > 0 ? (
                    <Text
                      maxFontSizeMultiplier={compact ? 1.1 : 1.2}
                      style={styles.scoreBonus}
                    >
                      {bonusLabels.join('  ·  ')}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {metricRow}
            </View>
            <View
              style={[
                styles.actions,
                useLandscapeTabletLayout && styles.landscapeColumn,
              ]}
            >
              {completed && !premiumReward ? (
                <View
                  style={[styles.reward, compact && styles.compactReward]}
                  testID="result-reward-progress"
                >
                  <View style={styles.rewardHeading}>
                    <AppIcon name="hint" color={palette.accent} size={16} />
                    <Text
                      maxFontSizeMultiplier={compact ? 1.1 : 1.2}
                      style={styles.rewardTitle}
                    >
                      {t('result.rewardProgress.title')}
                    </Text>
                    <View
                      accessible
                      accessibilityLabel={t('result.rewardProgress.progress', {
                        count: visibleRewardSegments,
                      })}
                      style={styles.rewardSegments}
                    >
                      {[0, 1, 2].map(index => (
                        <View
                          key={index}
                          style={[
                            styles.rewardSegment,
                            index < visibleRewardSegments &&
                              styles.rewardSegmentFilled,
                          ]}
                        />
                      ))}
                    </View>
                  </View>
                  <Text
                    maxFontSizeMultiplier={compact ? 1.1 : 1.2}
                    style={styles.rewardDetail}
                  >
                    {rewardDetail}
                  </Text>
                  {adAvailability?.status === 'available' &&
                  onWatchCompletionAd ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: adBusy }}
                      disabled={adBusy}
                      onPress={watchCompletionAd}
                      style={styles.rewardAdButton}
                      testID="result-completion-ad"
                    >
                      <Text
                        maxFontSizeMultiplier={compact ? 1.1 : 1.2}
                        style={styles.rewardAdText}
                      >
                        {t('result.completionAd.offer')}
                      </Text>
                    </Pressable>
                  ) : null}
                  {adMessage ? (
                    <Text
                      maxFontSizeMultiplier={compact ? 1.1 : 1.2}
                      accessibilityLiveRegion="polite"
                      style={styles.rewardDetail}
                    >
                      {adMessage}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={onNext}
                style={styles.nextButton}
                testID="result-next-puzzle"
              >
                <Text
                  maxFontSizeMultiplier={compact ? 1.15 : 1.3}
                  style={styles.primaryText}
                >
                  {t('result.nextPuzzle')}
                </Text>
                <AppIcon name="forward" color={palette.white} size={20} />
              </Pressable>
              <View
                style={styles.secondaryActions}
                testID="result-secondary-actions"
              >
                {shareFacts ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setShareOpen(true)}
                    style={styles.textButton}
                    testID="result-share"
                  >
                    <Text
                      maxFontSizeMultiplier={compact ? 1.1 : 1.2}
                      style={styles.actionText}
                    >
                      {SHARE_CARD_COPY[locale].shareResult}
                    </Text>
                  </Pressable>
                ) : null}
                {onOpenReplay ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={onOpenReplay}
                    style={styles.textButton}
                    testID="result-open-replay"
                  >
                    <Text
                      maxFontSizeMultiplier={compact ? 1.1 : 1.2}
                      style={styles.actionText}
                    >
                      {t('result.openReplay')}
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setLevelPickerOpen(true)}
                  style={styles.textButton}
                  testID="result-choose-level"
                >
                  <Text
                    maxFontSizeMultiplier={compact ? 1.1 : 1.2}
                    style={styles.actionText}
                  >
                    {levelActionLabel}
                  </Text>
                </Pressable>
              </View>
              {growthCard}
              {__DEV__ && onOpenReview ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={onOpenReview}
                  style={styles.textButton}
                >
                  <Text
                    maxFontSizeMultiplier={compact ? 1.1 : 1.2}
                    style={styles.actionText}
                  >
                    {sessionReviewCopy(locale).entry}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      ) : (
        <ScrollView
          {...scroll}
          onLayout={container.onLayout}
          contentContainerStyle={styles.failedContent}
        >
          <View
            style={[
              styles.failedLayout,
              useLandscapeTabletLayout && styles.failedLandscape,
            ]}
            testID={
              useLandscapeTabletLayout
                ? 'result-landscape-layout'
                : 'result-portrait-layout'
            }
          >
            <View style={styles.failedSummary}>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.failedSymbol}
              >
                <AppIcon
                  color={palette.white}
                  name="close"
                  size={APP_ICON_SIZE.prominent}
                />
              </View>
              <Text
                accessibilityRole="header"
                style={styles.failedTitle}
                testID="result-title"
              >
                {title}
              </Text>
              <Text style={styles.failedEyebrow}>
                {t('game.level', { level: state.difficultyLevel })}
              </Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              {metricRow}
            </View>
            <View style={styles.failedActions}>
              <Pressable
                accessibilityRole="button"
                onPress={onRetry}
                style={styles.failedPrimaryButton}
                testID="result-retry"
              >
                <Text style={styles.primaryText}>{t('result.retry')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onReturnHome}
                style={styles.failedSecondaryButton}
                testID="result-choose-level"
              >
                <Text style={styles.failedSecondaryText}>
                  {levelActionLabel}
                </Text>
              </Pressable>
              {growthCard}
            </View>
          </View>
        </ScrollView>
      )}
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
    </>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    viewport: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.background,
      paddingHorizontal: 24,
      paddingVertical: 12,
    },
    completionLayout: {
      flex: 1,
      width: '100%',
      maxWidth: 440,
      maxHeight: 660,
      justifyContent: 'space-evenly',
      gap: 16,
    },
    compactViewport: { paddingVertical: 8 },
    compactLayout: { gap: 8 },
    compactHonors: { marginTop: 4 },
    compactMetrics: { marginTop: 8, paddingVertical: 6 },
    compactReward: { marginBottom: 8 },
    landscapeLayout: {
      flexDirection: 'row',
      alignItems: 'center',
      maxWidth: 880,
      gap: 48,
    },
    landscapeColumn: { flex: 1, minWidth: 0 },
    achievement: { alignItems: 'center', width: '100%' },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      width: '100%',
    },
    headingCopy: { flexShrink: 1, maxWidth: 280 },
    eyebrow: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 4,
    },
    title: {
      color: palette.ink,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.6,
    },
    compactTitle: { fontSize: 22 },
    honors: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      columnGap: 14,
      rowGap: 4,
      marginTop: 8,
    },
    honorText: { color: palette.accent, fontSize: 12, fontWeight: '600' },
    score: { alignItems: 'center', width: '100%', marginTop: 24 },
    compactScore: { marginTop: 8 },
    scoreLabel: { color: palette.muted, fontSize: 12, fontWeight: '600' },
    scoreValue: {
      color: palette.ink,
      fontSize: 60,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
      letterSpacing: -1.8,
    },
    compactScoreValue: { fontSize: 40 },
    scoreBonus: { color: palette.accent, fontSize: 11, textAlign: 'center' },
    metrics: {
      borderTopColor: palette.line,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      marginTop: 16,
      paddingVertical: 10,
      width: '100%',
    },
    failedMetrics: {
      marginTop: 24,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.line,
    },
    failedMetricValue: { fontWeight: '800' },
    failedMetricLabel: { fontSize: 10 },
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
    metricValue: {
      color: palette.ink,
      fontSize: 20,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    metricLabel: {
      color: palette.muted,
      fontSize: 11,
      textAlign: 'center',
      marginTop: 3,
    },
    actions: { width: '100%' },
    reward: { marginBottom: 14, width: '100%' },
    rewardHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    rewardTitle: {
      flex: 1,
      color: palette.ink,
      fontSize: 11,
      fontWeight: '600',
    },
    rewardSegments: { flexDirection: 'row', gap: 4 },
    rewardSegment: {
      width: 18,
      height: 5,
      borderRadius: 3,
      backgroundColor: palette.line,
    },
    rewardSegmentFilled: { backgroundColor: palette.accent },
    rewardDetail: {
      color: palette.muted,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 4,
    },
    rewardAdButton: {
      minHeight: 44,
      justifyContent: 'center',
      marginTop: 4,
      borderRadius: 10,
      backgroundColor: palette.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    rewardAdText: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    nextButton: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: '#176B57',
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    primaryText: { color: palette.white, fontSize: 16, fontWeight: '800' },
    secondaryActions: {
      flexDirection: 'row',
      width: '100%',
      marginTop: 4,
      gap: 8,
    },
    textButton: {
      flexShrink: 1,
      flexGrow: 1,
      flexBasis: 0,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 6,
    },
    actionText: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
    },
    failedContent: {
      alignItems: 'center',
      alignSelf: 'center',
      flexGrow: 1,
      justifyContent: 'center',
      backgroundColor: palette.background,
      maxWidth: 980,
      padding: 24,
      width: '100%',
    },
    failedLayout: { alignItems: 'center', width: '100%' },
    failedLandscape: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 48,
      justifyContent: 'center',
    },
    failedSummary: {
      alignItems: 'center',
      flex: 1,
      maxWidth: 440,
      width: '100%',
    },
    failedActions: { flex: 1, maxWidth: 440, width: '100%' },
    failedSymbol: {
      alignItems: 'center',
      backgroundColor: palette.error,
      borderRadius: 38,
      height: 76,
      justifyContent: 'center',
      marginBottom: 22,
      width: 76,
    },
    failedTitle: {
      color: palette.ink,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.8,
      textAlign: 'center',
    },
    failedEyebrow: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.5,
      marginTop: 8,
    },
    subtitle: {
      color: palette.muted,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 9,
      maxWidth: 360,
      textAlign: 'center',
    },
    failedPrimaryButton: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 15,
      marginTop: 24,
      padding: 15,
      width: '100%',
    },
    failedSecondaryButton: {
      alignItems: 'center',
      borderColor: palette.line,
      borderRadius: 15,
      borderWidth: 1,
      marginTop: 10,
      padding: 14,
      width: '100%',
    },
    failedSecondaryText: {
      color: palette.ink,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}
