import { useScreenScroll } from '../screen-state';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { OfflineGameSnapshot } from '../../application';
import { premiumCompletionRewardForLevel } from '../../domain/game/progression';
import type { DifficultyLevel } from '../../domain/hints/techniques';
import { useLocalization } from '../../localization';
import type { TranslationKey } from '../../localization';
import type { CompletionResultSummary } from '../../data/user/user-repository';
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

type SupplyResourcePresentation = {
  id: 'quick_pencil' | 'smart_hint';
  icon: string;
  labelKey: TranslationKey;
  credited: number;
  balance: number;
};

type SupplyPresentation = {
  full: boolean;
  limited: boolean;
  resources: readonly SupplyResourcePresentation[];
};

function formatTime(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function createSupplyPresentation(
  completionResult: CompletionResultSummary | null,
  difficultyLevel: DifficultyLevel,
): SupplyPresentation | null {
  if (
    !completionResult?.isFirstCompletion ||
    !completionResult.reward.premiumAtCompletion
  ) {
    return null;
  }
  const reward = completionResult.reward;
  const expected = premiumCompletionRewardForLevel(difficultyLevel);
  return {
    full: reward.quickPencil === 0 && reward.smartHint === 0,
    limited:
      reward.quickPencil < expected.quickPencil ||
      reward.smartHint < expected.smartHint,
    resources: [
      {
        id: 'quick_pencil',
        icon: '✎',
        labelKey: 'result.supply.quickPencil',
        credited: reward.quickPencil,
        balance: completionResult.walletAfter.quick_pencil.balance,
      },
      {
        id: 'smart_hint',
        icon: '✦',
        labelKey: 'result.supply.smartHint',
        credited: reward.smartHint,
        balance: completionResult.walletAfter.smart_hint.balance,
      },
    ],
  };
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
  const scroll = useScreenScroll(`result:${snapshot.session?.state.sessionId}`);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
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
  const subtitle = presentation
    ? t(presentation.encouragement.key, presentation.encouragement.params)
    : t('result.failed');
  const levelActionLabel = t(
    completed ? 'result.changeLevel' : 'result.chooseLevel',
  );
  const supply = completed
    ? createSupplyPresentation(snapshot.completionResult, state.difficultyLevel)
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
    ...(completed
      ? [
          {
            id: 'quick-pencils',
            label: t('result.quickPencilsUsed'),
            value: String(state.quickPencilUseCount),
          },
        ]
      : []),
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
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.victoryMark}
            testID="result-victory-medal"
          >
            <View style={[styles.medalRibbon, styles.medalRibbonLeft]} />
            <View style={[styles.medalRibbon, styles.medalRibbonRight]} />
            <View style={styles.medalOuter}>
              <View style={styles.medalInner}>
                <Text allowFontScaling={false} style={styles.medalStar}>
                  ★
                </Text>
              </View>
            </View>
          </View>
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
        <Text style={styles.eyebrow}>
          {t('game.level', { level: state.difficultyLevel })}
        </Text>
        <Text
          accessibilityRole="header"
          style={styles.title}
          testID="result-title"
        >
          {title}
        </Text>
        <Text style={styles.subtitle} testID="result-encouragement">
          {subtitle}
        </Text>
        {presentation?.honors.length ? (
          <View style={styles.honors} testID="result-honors">
            {presentation.honors.map(honor => (
              <View
                accessible
                accessibilityLabel={t(honor.copy.key, honor.copy.params)}
                key={honor.kind}
                style={styles.honorBadge}
              >
                <Text style={styles.honorText}>
                  {t(honor.copy.key, honor.copy.params)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <View
          style={[styles.metrics, !completed && styles.failedMetrics]}
          testID="result-metrics-grid"
        >
          {metrics.map(metric => (
            <View
              accessible
              accessibilityLabel={`${metric.label}, ${metric.value}`}
              key={metric.id}
              style={[styles.metric, !completed && styles.failedMetric]}
            >
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>

        {supply ? (
          <View style={styles.supplyCard} testID="result-supply-card">
            <Text style={styles.supplyEyebrow}>{t('result.supply.title')}</Text>
            {supply.full ? (
              <Text style={styles.supplyFullBody}>
                {t('result.supply.fullBody')}
              </Text>
            ) : (
              <>
                <View style={styles.supplyRow}>
                  {supply.resources.map(resource => {
                    const credited =
                      resource.credited > 0
                        ? t('result.supply.credited', {
                            count: resource.credited,
                          })
                        : t('result.supply.full');
                    const balance = t('result.supply.balance', {
                      count: resource.balance,
                    });
                    return (
                      <View
                        accessible
                        accessibilityLabel={`${t(
                          resource.labelKey,
                        )}, ${credited}, ${balance}`}
                        key={resource.id}
                        style={styles.supplyResource}
                      >
                        <Text
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                          style={styles.supplyIcon}
                        >
                          {resource.icon}
                        </Text>
                        <View style={styles.supplyResourceCopy}>
                          <Text style={styles.supplyResourceLabel}>
                            {t(resource.labelKey)}
                          </Text>
                          <Text style={styles.supplyCredited}>{credited}</Text>
                          <Text style={styles.supplyBalance}>{balance}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
                {supply.limited ? (
                  <Text style={styles.supplyLimitNote}>
                    {t('result.supply.limitReached')}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        {completed ? (
          <Pressable
            accessibilityRole="button"
            onPress={onNext}
            style={styles.primaryButton}
            testID="result-next-puzzle"
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
            style={styles.secondaryButton}
            testID="result-open-replay"
          >
            <Text style={styles.secondaryText}>{t('result.openReplay')}</Text>
          </Pressable>
        ) : null}
        {completed ? (
          <Pressable
            accessibilityRole="button"
            onPress={onReturnHome}
            style={styles.homeButton}
            testID="result-return-home"
          >
            <Text style={styles.homeButtonText}>{t('result.returnHome')}</Text>
          </Pressable>
        ) : null}
        {presentation?.quote ? (
          <Text style={styles.quote} testID="result-quote">
            {t(presentation.quote.key, presentation.quote.params)}
          </Text>
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
      paddingTop: 34,
    },
    victoryMark: {
      alignItems: 'center',
      height: 102,
      justifyContent: 'flex-start',
      marginBottom: 16,
      width: 104,
    },
    medalRibbon: {
      backgroundColor: palette.accent,
      bottom: 0,
      height: 46,
      position: 'absolute',
      width: 25,
    },
    medalRibbonLeft: {
      left: 28,
      transform: [{ rotate: '12deg' }],
    },
    medalRibbonRight: {
      right: 28,
      transform: [{ rotate: '-12deg' }],
    },
    medalOuter: {
      alignItems: 'center',
      backgroundColor: palette.accentWarm,
      borderColor: palette.surface,
      borderRadius: 40,
      borderWidth: 5,
      height: 80,
      justifyContent: 'center',
      width: 80,
    },
    medalInner: {
      alignItems: 'center',
      borderColor: palette.white,
      borderRadius: 30,
      borderWidth: 2,
      height: 60,
      justifyContent: 'center',
      width: 60,
    },
    medalStar: {
      color: palette.white,
      fontSize: 33,
      lineHeight: 40,
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
    honors: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
      marginTop: 18,
      width: '100%',
    },
    honorBadge: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    honorText: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: '800',
    },
    metrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 22,
      width: '100%',
    },
    failedMetrics: {
      flexWrap: 'nowrap',
    },
    metric: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 15,
      borderWidth: 1,
      flexBasis: '45%',
      flexGrow: 1,
      minWidth: 120,
      paddingHorizontal: 8,
      paddingVertical: 15,
    },
    failedMetric: {
      flexBasis: 0,
      minWidth: 0,
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
    supplyCard: {
      backgroundColor: palette.hintResult,
      borderRadius: 16,
      marginTop: 14,
      padding: 18,
      width: '100%',
    },
    supplyEyebrow: {
      color: palette.ink,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.1,
    },
    supplyRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 12,
    },
    supplyResource: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderRadius: 13,
      flexBasis: '45%',
      flexDirection: 'row',
      flexGrow: 1,
      minWidth: 130,
      padding: 12,
    },
    supplyIcon: {
      color: palette.accent,
      fontSize: 23,
      fontWeight: '800',
      marginRight: 10,
    },
    supplyResourceCopy: {
      flex: 1,
    },
    supplyResourceLabel: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    supplyCredited: {
      color: palette.ink,
      fontSize: 20,
      fontWeight: '800',
      marginTop: 2,
    },
    supplyBalance: {
      color: palette.muted,
      fontSize: 11,
      marginTop: 2,
    },
    supplyLimitNote: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 12,
    },
    supplyFullBody: {
      color: palette.ink,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 9,
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
    homeButton: {
      alignItems: 'center',
      marginTop: 7,
      padding: 12,
      width: '100%',
    },
    homeButtonText: {
      color: palette.muted,
      fontSize: 14,
      fontWeight: '700',
    },
    quote: {
      borderLeftColor: palette.accentWarm,
      borderLeftWidth: 3,
      color: palette.muted,
      fontSize: 13,
      fontStyle: 'italic',
      lineHeight: 20,
      marginTop: 18,
      paddingLeft: 12,
      width: '100%',
    },
  });
}
