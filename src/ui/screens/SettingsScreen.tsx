import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {
  InputModePreference,
  OfflineGameSnapshot,
  ProductPreferences,
} from '../../application';
import type {
  RestoreResult,
  RewardedAdRedemptionResult,
} from '../../application/commercial/contracts';
import { CREDIT_CAP, type CreditResource } from '../../domain/game/contracts';
import { TranslationKey, useLocalization } from '../../localization';
import { useScreenScroll } from '../screen-state';
import { AppPalette, useAppTheme } from '../theme';

export type SettingsSubpage = 'language' | 'input' | 'rewards';

type SettingsScreenProps = {
  preferences: ProductPreferences;
  wallet?: OfflineGameSnapshot['wallet'];
  premium?: boolean;
  page?: 'main' | SettingsSubpage;
  onBack(): void;
  onChange(patch: Partial<ProductPreferences>): void;
  onOpenPage?(page: SettingsSubpage): void;
  onOpenPremium?(): void;
  onRestorePurchase?(): Promise<RestoreResult>;
  onTopUpSmartHint?(): Promise<RewardedAdRedemptionResult>;
  onTopUpQuickPencil?(): Promise<RewardedAdRedemptionResult>;
  onOpenHelp?(): void;
  onOpenPrivacy?(): void;
  onOpenSupport?(): void;
  onOpenLicenses?(): void;
  onOpenHintLab?(): void;
  onOpenCompletionPreview?(): void;
  onPreviewMultiSelectOnboarding?(): void;
  onTopUpDebugCredits?(): void;
  debugBusy?: boolean;
};

const LOCALES: readonly {
  value: ProductPreferences['locale'];
  label: TranslationKey;
}[] = [
  { value: 'system', label: 'settings.system' },
  { value: 'en', label: 'settings.english' },
  { value: 'ja', label: 'settings.japanese' },
  { value: 'de', label: 'settings.german' },
  { value: 'zh-Hans', label: 'settings.simplifiedChinese' },
];

const INPUT_MODES: readonly {
  value: InputModePreference;
  label: TranslationKey;
}[] = [
  { value: 'cell_first', label: 'settings.cellFirst' },
  { value: 'digit_first', label: 'settings.digitFirst' },
];

const RESTORE_MESSAGES: Readonly<
  Record<RestoreResult['status'], TranslationKey>
> = {
  restored: 'premium.restoreSuccess',
  nothing_to_restore: 'premium.nothingToRestore',
  unavailable: 'premium.storeUnavailable',
  failed: 'premium.restoreFailed',
};

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: TranslationKey;
  hint?: TranslationKey;
  value: boolean;
  onChange(value: boolean): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.row}>
      <Text accessibilityElementsHidden style={styles.rowLabel}>
        {t(label)}
      </Text>
      <Switch
        accessibilityHint={hint ? t(hint) : undefined}
        accessibilityLabel={t(label)}
        onValueChange={onChange}
        trackColor={{ false: palette.surfaceStrong, true: palette.accentSoft }}
        thumbColor={value ? palette.accent : palette.muted}
        value={value}
      />
    </View>
  );
}

function NavigationRow({
  label,
  value,
  chevron = true,
  disabled = false,
  onPress,
}: {
  label: TranslationKey;
  value?: string;
  chevron?: boolean;
  disabled?: boolean;
  onPress(): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <Pressable
      accessibilityLabel={value ? `${t(label)}, ${value}` : t(label)}
      accessibilityRole="button"
      accessibilityState={disabled ? { disabled: true } : undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.rowLabel}>{t(label)}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {chevron ? (
        <Text
          accessibilityElementsHidden
          allowFontScaling={false}
          style={styles.chevron}
        >
          ›
        </Text>
      ) : null}
    </Pressable>
  );
}

function RewardRow({
  label,
  balance,
  premium,
  busy,
  disabled,
  message,
  onTopUp,
}: {
  label: TranslationKey;
  balance: number;
  premium: boolean;
  busy: boolean;
  disabled: boolean;
  message?: TranslationKey;
  onTopUp?(): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.rewardRow}>
      <View style={styles.rewardHeading}>
        <Text style={styles.rewardLabel}>{t(label)}</Text>
        <Text
          accessibilityLabel={`${t(label)}, ${balance}`}
          style={styles.rewardBalance}
        >
          {balance}
        </Text>
      </View>
      {!premium && balance < CREDIT_CAP && onTopUp ? (
        <Pressable
          accessibilityLabel={`${t(label)}, ${t(
            busy ? 'credits.watching' : 'credits.watch',
          )}`}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onTopUp}
          style={({ pressed }) => [
            styles.rewardButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.rewardButtonText}>
            {t(busy ? 'credits.watching' : 'credits.watch')}
          </Text>
        </Pressable>
      ) : !premium && balance >= CREDIT_CAP ? (
        <Text style={styles.rewardStatus}>{t('credits.inventoryFull')}</Text>
      ) : null}
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.rewardStatus}>
          {t(message)}
        </Text>
      ) : null}
    </View>
  );
}

function ChoiceRow<Value extends string>({
  value,
  choice,
  onChange,
}: {
  value: Value;
  choice: { value: Value; label: TranslationKey };
  onChange(value: Value): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const selected = value === choice.value;
  return (
    <Pressable
      accessibilityLabel={t(choice.label)}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => onChange(choice.value)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.rowLabel}>{t(choice.label)}</Text>
      {selected ? (
        <Text
          accessibilityElementsHidden
          allowFontScaling={false}
          style={styles.checkmark}
        >
          ✓
        </Text>
      ) : null}
    </Pressable>
  );
}

function Group({
  title,
  choiceGroup = false,
  children,
}: React.PropsWithChildren<{
  title?: TranslationKey;
  choiceGroup?: boolean;
}>): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.groupWrap}>
      {title ? (
        <Text accessibilityRole="header" style={styles.groupTitle}>
          {t(title)}
        </Text>
      ) : null}
      <View
        accessibilityRole={choiceGroup ? 'radiogroup' : undefined}
        style={styles.group}
      >
        {children}
      </View>
    </View>
  );
}

export function SettingsScreen({
  preferences,
  wallet,
  premium = false,
  page = 'main',
  onBack,
  onChange,
  onOpenPage,
  onOpenPremium,
  onRestorePurchase,
  onTopUpSmartHint,
  onTopUpQuickPencil,
  onOpenHelp,
  onOpenPrivacy,
  onOpenSupport,
  onOpenLicenses,
  onOpenHintLab,
  onOpenCompletionPreview,
  onPreviewMultiSelectOnboarding,
  onTopUpDebugCredits,
  debugBusy = false,
}: SettingsScreenProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const scroll = useScreenScroll(`settings:${page}`);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<TranslationKey | null>(
    null,
  );
  const rewardBusyRef = useRef(false);
  const [rewardBusy, setRewardBusy] = useState<CreditResource | null>(null);
  const [rewardMessage, setRewardMessage] = useState<{
    resource: CreditResource;
    key: TranslationKey;
  } | null>(null);
  useEffect(() => {
    if (page !== 'rewards') setRewardMessage(null);
  }, [page]);
  const localeLabel = LOCALES.find(
    choice => choice.value === preferences.locale,
  )?.label;
  const inputLabel = INPUT_MODES.find(
    choice => choice.value === preferences.inputMode,
  )?.label;
  const developerToolsAvailable =
    onPreviewMultiSelectOnboarding ||
    (__DEV__ &&
      (onOpenHintLab || onOpenCompletionPreview || onTopUpDebugCredits));
  const title =
    page === 'main'
      ? 'settings.title'
      : page === 'language'
      ? 'settings.language'
      : page === 'input'
      ? 'settings.input'
      : 'settings.rewards';

  const restorePurchase = async () => {
    if (!onRestorePurchase || restoring) return;
    setRestoring(true);
    setRestoreMessage(null);
    try {
      const result = await onRestorePurchase();
      setRestoreMessage(RESTORE_MESSAGES[result.status]);
    } catch {
      setRestoreMessage('premium.restoreFailed');
    } finally {
      setRestoring(false);
    }
  };

  const redeemReward = async (
    resource: CreditResource,
    onTopUp?: () => Promise<RewardedAdRedemptionResult>,
  ) => {
    if (!onTopUp || rewardBusyRef.current) return;
    rewardBusyRef.current = true;
    setRewardBusy(resource);
    setRewardMessage(null);
    try {
      const result = await onTopUp();
      const key: TranslationKey =
        result.status === 'credited'
          ? 'credits.rewardSuccess'
          : result.status === 'dismissed'
          ? 'credits.dismissed'
          : result.status === 'unavailable'
          ? 'credits.unavailable'
          : 'credits.failed';
      setRewardMessage({ resource, key });
    } catch {
      setRewardMessage({ resource, key: 'credits.failed' });
    } finally {
      rewardBusyRef.current = false;
      setRewardBusy(null);
    }
  };

  return (
    <ScrollView key={page} {...scroll} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t('app.back')}
          accessibilityRole="button"
          onPress={onBack}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ {t('app.back')}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          {t(title)}
        </Text>
      </View>

      {page === 'language' ? (
        <Group choiceGroup>
          {LOCALES.map(choice => (
            <ChoiceRow
              choice={choice}
              key={choice.value}
              onChange={locale => onChange({ locale })}
              value={preferences.locale}
            />
          ))}
        </Group>
      ) : null}

      {page === 'input' ? (
        <Group choiceGroup>
          {INPUT_MODES.map(choice => (
            <ChoiceRow
              choice={choice}
              key={choice.value}
              onChange={inputMode => onChange({ inputMode })}
              value={preferences.inputMode}
            />
          ))}
        </Group>
      ) : null}

      {page === 'rewards' && wallet ? (
        <>
          <Group>
            <RewardRow
              balance={wallet.smart_hint.balance}
              busy={rewardBusy === 'smart_hint'}
              disabled={rewardBusy !== null}
              label="settings.rewardSmartHint"
              message={
                rewardMessage?.resource === 'smart_hint'
                  ? rewardMessage.key
                  : undefined
              }
              onTopUp={
                onTopUpSmartHint
                  ? () =>
                      redeemReward('smart_hint', onTopUpSmartHint).catch(
                        () => undefined,
                      )
                  : undefined
              }
              premium={premium}
            />
            <RewardRow
              balance={wallet.quick_pencil.balance}
              busy={rewardBusy === 'quick_pencil'}
              disabled={rewardBusy !== null}
              label="settings.rewardQuickNotes"
              message={
                rewardMessage?.resource === 'quick_pencil'
                  ? rewardMessage.key
                  : undefined
              }
              onTopUp={
                onTopUpQuickPencil
                  ? () =>
                      redeemReward('quick_pencil', onTopUpQuickPencil).catch(
                        () => undefined,
                      )
                  : undefined
              }
              premium={premium}
            />
          </Group>
          {premium ? (
            <Text style={styles.rewardNotice}>
              {t('credits.premiumUnavailable')}
            </Text>
          ) : null}
        </>
      ) : null}

      {page === 'main' ? (
        <>
          {onOpenPremium || onRestorePurchase || wallet ? (
            <Group>
              {onOpenPremium ? (
                <NavigationRow
                  label="settings.premium"
                  onPress={onOpenPremium}
                />
              ) : null}
              {onRestorePurchase ? (
                <NavigationRow
                  chevron={false}
                  disabled={restoring}
                  label="premium.restore"
                  onPress={() => restorePurchase().catch(() => undefined)}
                  value={restoring ? t('premium.restoring') : undefined}
                />
              ) : null}
              {wallet ? (
                <NavigationRow
                  label="settings.rewards"
                  onPress={() => onOpenPage?.('rewards')}
                />
              ) : null}
            </Group>
          ) : null}
          {restoreMessage ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.restoreMessage}
            >
              {t(restoreMessage)}
            </Text>
          ) : null}

          <Group>
            <NavigationRow
              label="settings.language"
              onPress={() => onOpenPage?.('language')}
              value={localeLabel ? t(localeLabel) : undefined}
            />
            <NavigationRow
              label="settings.input"
              onPress={() => onOpenPage?.('input')}
              value={inputLabel ? t(inputLabel) : undefined}
            />
          </Group>

          <Group title="settings.feedbackDisplay">
            <ToggleRow
              label="settings.soundEffects"
              onChange={soundEffects => onChange({ soundEffects })}
              value={preferences.soundEffects}
            />
            <ToggleRow
              label="settings.haptics"
              onChange={haptics => onChange({ haptics })}
              value={preferences.haptics}
            />
            <ToggleRow
              label="settings.keepAwake"
              onChange={keepAwake => onChange({ keepAwake })}
              value={preferences.keepAwake}
            />
            <ToggleRow
              label="settings.showTimer"
              onChange={showTimer => onChange({ showTimer })}
              value={preferences.showTimer}
            />
            <ToggleRow
              label="settings.showRemainingDigits"
              onChange={showRemainingDigits =>
                onChange({ showRemainingDigits })
              }
              value={preferences.showRemainingDigits}
            />
            <ToggleRow
              hint="settings.hintAnimationsHint"
              label="settings.hintAnimations"
              onChange={hintAnimations => onChange({ hintAnimations })}
              value={preferences.hintAnimations}
            />
          </Group>

          <Group title="settings.highlighting">
            <ToggleRow
              label="settings.alternatingBoxShading"
              onChange={alternatingBoxShading =>
                onChange({ alternatingBoxShading })
              }
              value={preferences.alternatingBoxShading}
            />
            <ToggleRow
              label="settings.highlightRegions"
              onChange={highlightRegions => onChange({ highlightRegions })}
              value={preferences.highlightRegions}
            />
            <ToggleRow
              label="settings.highlightSameDigit"
              onChange={highlightSameDigit => onChange({ highlightSameDigit })}
              value={preferences.highlightSameDigit}
            />
            <ToggleRow
              label="settings.highlightCandidateNotes"
              onChange={highlightCandidateNotes =>
                onChange({ highlightCandidateNotes })
              }
              value={preferences.highlightCandidateNotes}
            />
            <ToggleRow
              hint="settings.outlineUniqueCandidateNotesHint"
              label="settings.outlineUniqueCandidateNotes"
              onChange={outlineUniqueCandidateNotes =>
                onChange({ outlineUniqueCandidateNotes })
              }
              value={preferences.outlineUniqueCandidateNotes}
            />
            <ToggleRow
              label="settings.fullHouseAssist"
              onChange={fullHouseAssist => onChange({ fullHouseAssist })}
              value={preferences.fullHouseAssist}
            />
          </Group>

          <Group title="settings.gameRules">
            <ToggleRow
              label="settings.autoCheckErrors"
              onChange={autoCheckErrors =>
                onChange({
                  autoCheckErrors,
                  ...(autoCheckErrors ? {} : { errorLimit: false }),
                })
              }
              value={preferences.autoCheckErrors}
            />
            <ToggleRow
              hint="settings.errorLimitHint"
              label="settings.errorLimit"
              onChange={errorLimit =>
                onChange({
                  errorLimit,
                  ...(errorLimit ? { autoCheckErrors: true } : {}),
                })
              }
              value={preferences.errorLimit}
            />
            <ToggleRow
              label="settings.autoRemoveCandidates"
              onChange={autoRemoveCandidates =>
                onChange({ autoRemoveCandidates })
              }
              value={preferences.autoRemoveCandidates}
            />
          </Group>

          <Group title="settings.pacing">
            <ToggleRow
              hint="settings.autoFinishTrivialTailHint"
              label="settings.autoFinishTrivialTail"
              onChange={autoFinishTrivialTail =>
                onChange({ autoFinishTrivialTail })
              }
              value={preferences.autoFinishTrivialTail}
            />
          </Group>

          {onOpenHelp || onOpenPrivacy || onOpenSupport || onOpenLicenses ? (
            <Group>
              {onOpenHelp ? (
                <NavigationRow label="home.help" onPress={onOpenHelp} />
              ) : null}
              {onOpenPrivacy ? (
                <NavigationRow
                  label="settings.openPrivacy"
                  onPress={onOpenPrivacy}
                />
              ) : null}
              {onOpenSupport ? (
                <NavigationRow
                  label="settings.openSupport"
                  onPress={onOpenSupport}
                />
              ) : null}
              {onOpenLicenses ? (
                <NavigationRow
                  label="settings.openLicenses"
                  onPress={onOpenLicenses}
                />
              ) : null}
            </Group>
          ) : null}

          {developerToolsAvailable ? (
            <Group title="settings.developerTools">
              {onPreviewMultiSelectOnboarding ? (
                <NavigationRow
                  label="settings.multiSelectOnboardingPreview"
                  onPress={onPreviewMultiSelectOnboarding}
                />
              ) : null}
              {onOpenCompletionPreview ? (
                <NavigationRow
                  label="settings.completionPreview"
                  onPress={onOpenCompletionPreview}
                />
              ) : null}
              {onOpenHintLab ? (
                <NavigationRow
                  label="settings.hintLab"
                  onPress={onOpenHintLab}
                />
              ) : null}
              {onTopUpDebugCredits ? (
                <Pressable
                  accessibilityHint={
                    wallet
                      ? t('settings.debugCreditBalance', {
                          hints: wallet.smart_hint.balance,
                          pencils: wallet.quick_pencil.balance,
                        })
                      : undefined
                  }
                  accessibilityLabel={t('settings.debugCredits')}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: debugBusy }}
                  disabled={debugBusy}
                  onPress={onTopUpDebugCredits}
                  style={({ pressed }) => [
                    styles.debugRow,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.rowLabel}>
                    {t('settings.debugCredits')}
                  </Text>
                  {wallet ? (
                    <Text style={styles.debugBalance}>
                      {t('settings.debugCreditBalance', {
                        hints: wallet.smart_hint.balance,
                        pencils: wallet.quick_pencil.balance,
                      })}
                    </Text>
                  ) : null}
                </Pressable>
              ) : null}
            </Group>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    content: {
      paddingBottom: 36,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    header: {
      marginBottom: 24,
    },
    backButton: {
      alignSelf: 'flex-start',
      justifyContent: 'center',
      minHeight: 44,
    },
    backText: {
      color: palette.accent,
      fontSize: 16,
      fontWeight: '600',
    },
    title: {
      color: palette.ink,
      fontSize: 32,
      fontWeight: '700',
      letterSpacing: -0.7,
      marginTop: 8,
    },
    groupWrap: {
      marginBottom: 22,
    },
    groupTitle: {
      color: palette.muted,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 9,
      marginLeft: 15,
    },
    group: {
      backgroundColor: palette.surface,
      borderRadius: 16,
      overflow: 'hidden',
    },
    row: {
      alignItems: 'center',
      borderBottomColor: palette.line,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      minHeight: 54,
      paddingHorizontal: 16,
      paddingVertical: 7,
    },
    rowLabel: {
      color: palette.ink,
      flex: 1,
      fontSize: 16,
      lineHeight: 22,
    },
    rowValue: {
      color: palette.muted,
      flexShrink: 1,
      fontSize: 14,
      marginLeft: 12,
      textAlign: 'right',
    },
    debugRow: {
      minHeight: 70,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    debugBalance: {
      color: palette.muted,
      fontSize: 13,
      marginTop: 4,
    },
    chevron: {
      color: palette.muted,
      fontSize: 24,
      lineHeight: 28,
      marginLeft: 8,
    },
    checkmark: {
      color: palette.accent,
      fontSize: 18,
      fontWeight: '700',
      marginLeft: 12,
    },
    restoreMessage: {
      color: palette.accent,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 20,
      marginHorizontal: 15,
    },
    rewardRow: {
      borderBottomColor: palette.line,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: 16,
      paddingVertical: 18,
    },
    rewardHeading: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    rewardLabel: {
      color: palette.ink,
      fontSize: 17,
      fontWeight: '600',
    },
    rewardBalance: {
      color: palette.accent,
      fontSize: 21,
      fontWeight: '700',
    },
    rewardButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: palette.accentSoft,
      borderRadius: 10,
      justifyContent: 'center',
      marginTop: 12,
      minHeight: 40,
      paddingHorizontal: 14,
    },
    rewardButtonText: {
      color: palette.accent,
      fontSize: 14,
      fontWeight: '700',
    },
    rewardStatus: {
      color: palette.muted,
      fontSize: 13,
      marginTop: 7,
    },
    rewardNotice: {
      color: palette.muted,
      fontSize: 13,
      lineHeight: 19,
      marginHorizontal: 15,
    },
    pressed: {
      backgroundColor: palette.surfaceStrong,
    },
  });
}
