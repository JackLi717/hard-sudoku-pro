import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { RewardedAdRedemptionResult } from '../../application/commercial/contracts';
import { CREDIT_CAP } from '../../domain/game/contracts';
import {
  AD_HINT_REWARD,
  dailyHintRewardWeek,
  type DailyHintRewardHistory,
} from '../../domain/game/hint-rewards';
import { useLocalization } from '../../localization';
import { type AppPalette, useAppTheme } from '../theme';
import { AppIcon } from './AppIcon';

type Props = {
  balance: number;
  history?: DailyHintRewardHistory;
  premium: boolean;
  closedBetaPremium: boolean;
  reviewAccessPremium: boolean;
  hintRewardProgress: number;
  onRedeemHintAd?(): Promise<RewardedAdRedemptionResult>;
  onOpenPremium?(): void;
};

export function HintRewardsContent({
  balance,
  history,
  premium,
  closedBetaPremium,
  reviewAccessPremium,
  hintRewardProgress,
  onRedeemHintAd,
  onOpenPremium,
}: Props): React.JSX.Element {
  const { t, locale } = useLocalization();
  const { palette } = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const redemptionBusy = useRef(false);
  const mounted = useRef(true);
  const capacity = balance <= CREDIT_CAP - AD_HINT_REWARD;
  const week = history ? dailyHintRewardWeek(history) : null;
  const receipt = week?.todayReceipt;
  const progress = Math.max(0, Math.min(2, hintRewardProgress));
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'numeric',
        day: 'numeric',
      }),
    [locale],
  );
  const formatDate = (date: string) => {
    const [year, month, day] = date.split('-').map(Number);
    return dateFormatter.format(new Date(year, month - 1, day, 12));
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const adDisabled = redeeming || !onRedeemHintAd;
  const redeemAd = async () => {
    if (premium || !capacity || redemptionBusy.current || !onRedeemHintAd)
      return;
    redemptionBusy.current = true;
    setRedeeming(true);
    try {
      // The redemption flow checks availability and refreshes the wallet.
      await onRedeemHintAd();
    } catch {
      // An unavailable or failed ad leaves the button ready for another tap.
    } finally {
      if (mounted.current) setRedeeming(false);
      redemptionBusy.current = false;
    }
  };

  return (
    <View testID="hint-rewards-content">
      <View style={styles.balance}>
        <Text
          accessibilityLabel={`${t('settings.rewardSmartHint')}, ${
            premium ? t('premium.benefitUnlimitedHints') : balance
          }`}
          style={styles.number}
          testID="rewards-balance"
        >
          {premium ? '∞' : balance}
          {!premium ? (
            <Text style={styles.unit}> {t('rewards.unit')}</Text>
          ) : null}
        </Text>
      </View>

      {premium ? (
        <View style={styles.receipt} testID="rewards-premium">
          <Text style={styles.receiptTitle}>
            {t(
              closedBetaPremium
                ? 'rewards.beta'
                : reviewAccessPremium
                ? 'rewards.review'
                : 'rewards.permanent',
            )}
          </Text>
          <Text style={styles.detail}>
            {t(
              closedBetaPremium
                ? 'premium.closedBetaBody'
                : reviewAccessPremium
                ? 'premium.reviewerGranted'
                : 'rewards.premiumBody',
            )}
          </Text>
        </View>
      ) : (
        <>
          <View
            style={styles.receipt}
            accessibilityLiveRegion="polite"
            testID="rewards-today"
          >
            <View style={styles.receiptHeading}>
              <AppIcon
                name={receipt && !week?.clockAhead ? 'check' : 'clock'}
                color={palette.accent}
                size={20}
              />
              <Text style={styles.receiptTitle}>
                {t(
                  week?.clockAhead
                    ? 'rewards.clock'
                    : receipt
                    ? 'rewards.received'
                    : history
                    ? 'rewards.waiting'
                    : 'rewards.reading',
                  { count: receipt?.credited },
                )}
              </Text>
            </View>
          </View>

          {week ? (
            <View testID="rewards-week">
              <Text accessibilityRole="header" style={styles.weekHeading}>
                {t('rewards.week')}
              </Text>
              <View style={styles.days}>
                {week.days.map(day => {
                  const today = day.date === history?.today;
                  const color = today ? palette.background : palette.ink;
                  const actual = day.receipt
                    ? t('rewards.actual', { count: day.receipt.credited })
                    : t('rewards.pending');
                  return (
                    <View
                      key={day.date}
                      accessible
                      accessibilityLabel={`${t('rewards.dateLabel', {
                        date: formatDate(day.date),
                        day: day.cycleDay,
                        planned: day.requested,
                      })}, ${actual}${today ? `, ${t('rewards.today')}` : ''}`}
                      accessibilityState={{ selected: today }}
                      testID={`reward-day-${day.date}`}
                      style={[
                        styles.day,
                        fontScale > 1.3 && styles.largeDay,
                        day.receipt && styles.receivedDay,
                        today && styles.todayDay,
                      ]}
                    >
                      <Text style={[styles.date, { color }]}>
                        {formatDate(day.date)}
                      </Text>
                      <Text style={[styles.amount, { color }]}>
                        +{day.requested}
                      </Text>
                      {today ? (
                        <Text style={[styles.dayStatus, { color }]}>
                          {t('rewards.today')}
                        </Text>
                      ) : day.receipt?.credited === day.requested ? (
                        <AppIcon
                          name="check"
                          color={palette.accent}
                          size={14}
                        />
                      ) : (
                        <Text style={[styles.dayStatus, { color }]}>
                          {day.receipt
                            ? `+${day.receipt.credited}`
                            : t('rewards.pending')}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.headingRow}>
              <Text accessibilityRole="header" style={styles.heading}>
                {t('rewards.completion')}
              </Text>
              <View
                accessible
                accessibilityLabel={t('result.rewardProgress.progress', {
                  count: progress,
                })}
                style={styles.progress}
                testID="settings-hint-reward-progress"
              >
                {[0, 1, 2].map(index => (
                  <View
                    key={index}
                    style={[styles.dot, index < progress && styles.filledDot]}
                  />
                ))}
                <Text style={styles.smallMuted}>{progress}/3</Text>
              </View>
            </View>
          </View>

          {capacity ? (
            <View style={styles.section} testID="rewards-ad-section">
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: adDisabled, busy: redeeming }}
                accessibilityLabel={`${t('settings.rewardSmartHint')}, ${t(
                  redeeming ? 'credits.watching' : 'credits.watch',
                )}`}
                disabled={adDisabled}
                onPress={redeemAd}
                testID="rewards-open-ad"
                style={({ pressed }) => [
                  styles.adButton,
                  adDisabled && styles.disabledButton,
                  pressed && styles.pressed,
                ]}
              >
                <AppIcon
                  name="play"
                  color={adDisabled ? palette.muted : palette.accent}
                  size={20}
                />
                <Text style={[styles.adButtonText, adDisabled && styles.muted]}>
                  {t(redeeming ? 'credits.watching' : 'credits.watch')}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}

      {!premium && onOpenPremium ? (
        <Pressable
          accessibilityRole="button"
          onPress={onOpenPremium}
          style={({ pressed }) => [
            styles.premiumLink,
            pressed && styles.pressed,
          ]}
          testID="rewards-open-premium"
        >
          <Text style={styles.link}>{t('rewards.premiumLink')}</Text>
          <AppIcon name="forward" color={palette.accent} size={16} />
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: rulesOpen }}
        onPress={() => setRulesOpen(value => !value)}
        style={styles.textButton}
        testID="rewards-rules-toggle"
      >
        <AppIcon
          name={rulesOpen ? 'minus' : 'forward'}
          color={palette.accent}
          size={16}
        />
        <Text style={styles.link}>{t('rewards.rules')}</Text>
      </Pressable>
      {rulesOpen ? (
        <View testID="rewards-rules">
          {(
            [
              'credits.startingBalance',
              'credits.dailyEarning',
              'credits.completionEarning',
              'credits.body',
              'credits.inventoryFull',
              'rewards.quickFree',
            ] as const
          ).map(key => (
            <Text style={styles.rule} key={key}>
              {t(key)}
            </Text>
          ))}
          {receipt &&
          !week?.clockAhead &&
          receipt.credited < receipt.requested ? (
            <Text style={styles.rule}>
              {t(receipt.credited === 0 ? 'rewards.full' : 'rewards.partial', {
                count: receipt.requested,
                planned: receipt.requested,
                received: receipt.credited,
                lost: receipt.requested - receipt.credited,
              })}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    balance: { alignItems: 'center', marginBottom: 22 },
    number: {
      color: palette.ink,
      fontSize: 48,
      fontWeight: '700',
      marginVertical: 4,
      fontVariant: ['tabular-nums'],
    },
    unit: { fontSize: 16, fontWeight: '400' },
    muted: { color: palette.muted },
    smallMuted: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 18,
      flexShrink: 1,
    },
    receipt: {
      backgroundColor: palette.accentSoft,
      borderRadius: 16,
      padding: 16,
      marginBottom: 22,
    },
    receiptHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    receiptTitle: {
      color: palette.accent,
      fontSize: 17,
      fontWeight: '600',
      flexShrink: 1,
    },
    detail: { color: palette.ink, fontSize: 13, lineHeight: 20, marginTop: 6 },
    headingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },
    heading: {
      color: palette.ink,
      fontSize: 15,
      fontWeight: '600',
      flexShrink: 1,
    },
    weekHeading: {
      color: palette.ink,
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 12,
    },
    days: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 20 },
    day: {
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 0,
      backgroundColor: palette.panelSurface,
      borderRadius: 10,
      paddingHorizontal: 1,
      paddingVertical: 10,
      alignItems: 'center',
      gap: 5,
    },
    largeDay: { flexBasis: '22%', flexGrow: 0, paddingHorizontal: 5 },
    receivedDay: { backgroundColor: palette.accentSoft },
    todayDay: { backgroundColor: palette.accent },
    date: { fontSize: 12, textAlign: 'center' },
    amount: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
    dayStatus: { fontSize: 11, textAlign: 'center', minHeight: 16 },
    section: {
      paddingVertical: 16,
      borderTopColor: palette.panelBorder,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    progress: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    dot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: palette.panelBorder,
    },
    filledDot: { backgroundColor: palette.accent },
    adButton: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
      backgroundColor: palette.accentSoft,
      borderRadius: 12,
      padding: 12,
      minHeight: 44,
    },
    disabledButton: { backgroundColor: palette.panelSurface },
    adButtonText: {
      color: palette.accent,
      fontSize: 14,
      fontWeight: '600',
      flexShrink: 1,
    },
    textButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      minHeight: 44,
      paddingVertical: 10,
    },
    link: { color: palette.accent, fontSize: 13, flexShrink: 1 },
    premiumLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderColor: palette.accent,
      borderWidth: 1,
      borderRadius: 12,
      minHeight: 44,
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    rule: {
      color: palette.muted,
      fontSize: 13,
      lineHeight: 20,
      marginBottom: 12,
    },
    pressed: { opacity: 0.7 },
  });
}
