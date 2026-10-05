import React, { useMemo, useState } from 'react';
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
import type { DailyHintRewardHistory } from '../../domain/game/hint-rewards';
import { HintRewardsContent } from '../components/HintRewardsContent';
import { TranslationKey, translate, useLocalization } from '../../localization';
import { APP_ICON_SIZE, AppIcon } from '../components/AppIcon';
import { useScreenScroll } from '../screen-state';
import { AppPalette, useAppTheme } from '../theme';
import {
  useAdaptiveLayout,
  useContainerLayout,
} from '../layout/adaptive-layout';

export type SettingsSubpage = 'language' | 'appearance' | 'input' | 'rewards';

type SettingsScreenProps = {
  preferences: ProductPreferences;
  wallet?: OfflineGameSnapshot['wallet'];
  premium?: boolean;
  closedBetaPremium?: boolean;
  reviewAccessPremium?: boolean;
  dailyHintRewards?: DailyHintRewardHistory;
  hintRewardProgress?: number;
  page?: 'main' | SettingsSubpage;
  onBack(): void;
  onChange(patch: Partial<ProductPreferences>): void;
  onOpenPage?(page: SettingsSubpage): void;
  onOpenPremium?(): void;
  onRestorePurchase?(): Promise<RestoreResult>;
  onRedeemHintAd?(): Promise<RewardedAdRedemptionResult>;
  onOpenPrivacy?(): void;
  onOpenSupport?(): void;
  onOpenLicenses?(): void;
  onOpenHintLab?(): void;
  onOpenLessons?(): void;
  onOpenCompletionPreview?(): void;
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

const THEMES: readonly {
  value: ProductPreferences['theme'];
  label: TranslationKey;
}[] = [
  { value: 'light', label: 'settings.light' },
  { value: 'dark', label: 'settings.dark' },
  { value: 'system', label: 'settings.system' },
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
  showHint = false,
  value,
  onChange,
}: {
  label: TranslationKey;
  hint?: TranslationKey;
  showHint?: boolean;
  value: boolean;
  onChange(value: boolean): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.row}>
      <View style={styles.rowCopy}>
        <Text
          accessibilityElementsHidden
          style={[styles.rowLabel, styles.toggleLabel]}
        >
          {t(label)}
        </Text>
        {showHint && hint ? (
          <Text accessibilityElementsHidden style={styles.rowDescription}>
            {t(hint)}
          </Text>
        ) : null}
      </View>
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
  testID,
}: {
  label: TranslationKey;
  value?: string;
  chevron?: boolean;
  disabled?: boolean;
  testID?: string;
  onPress(): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <Pressable
      testID={testID}
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
        <AppIcon
          color={palette.muted}
          name="forward"
          size={APP_ICON_SIZE.standard}
          style={styles.chevron}
        />
      ) : null}
    </Pressable>
  );
}

function ChoiceRow<Value extends string>({
  value,
  choice,
  onChange,
  primaryLabel,
  secondaryLabel,
}: {
  value: Value;
  choice: { value: Value; label: TranslationKey };
  onChange(value: Value): void;
  primaryLabel?: string;
  secondaryLabel?: string;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const selected = value === choice.value;
  const label = primaryLabel ?? t(choice.label);
  const detail = secondaryLabel === label ? undefined : secondaryLabel;
  return (
    <Pressable
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => onChange(choice.value)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {detail ? (
        <View style={styles.rowCopy}>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={styles.languageSecondaryLabel}>{detail}</Text>
        </View>
      ) : (
        <Text style={styles.rowLabel}>{label}</Text>
      )}
      {selected ? (
        <AppIcon
          color={palette.accent}
          name="check"
          size={APP_ICON_SIZE.standard}
          style={styles.checkmark}
        />
      ) : null}
    </Pressable>
  );
}

function Group({
  title,
  choiceGroup = false,
  tabletColumn = false,
  children,
}: React.PropsWithChildren<{
  title?: TranslationKey;
  choiceGroup?: boolean;
  tabletColumn?: boolean;
}>): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View
      style={[styles.groupWrap, tabletColumn && styles.groupWrapTabletColumn]}
    >
      {title ? (
        <Text accessibilityRole="header" style={styles.groupTitle}>
          {t(title)}
        </Text>
      ) : null}
      <View
        accessibilityRole={choiceGroup ? 'radiogroup' : undefined}
        style={styles.group}
        testID="settings-group-card"
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
  closedBetaPremium = false,
  reviewAccessPremium = false,
  dailyHintRewards,
  hintRewardProgress = 0,
  page = 'main',
  onBack,
  onChange,
  onOpenPage,
  onOpenPremium,
  onRestorePurchase,
  onRedeemHintAd,
  onOpenPrivacy,
  onOpenSupport,
  onOpenLicenses,
  onOpenHintLab,
  onOpenLessons,
  onOpenCompletionPreview,
  onTopUpDebugCredits,
  debugBusy = false,
}: SettingsScreenProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const container = useContainerLayout();
  const { useLandscapeTabletLayout } = useAdaptiveLayout(container);
  const scroll = useScreenScroll(`settings:${page}`);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState<TranslationKey | null>(
    null,
  );
  const localeLabel = LOCALES.find(
    choice => choice.value === preferences.locale,
  )?.label;
  const themeLabel = THEMES.find(
    choice => choice.value === preferences.theme,
  )?.label;
  const inputLabel = INPUT_MODES.find(
    choice => choice.value === preferences.inputMode,
  )?.label;
  const developerToolsAvailable =
    __DEV__ &&
    (onOpenHintLab || onOpenCompletionPreview || onTopUpDebugCredits);
  const title =
    page === 'main'
      ? 'settings.title'
      : page === 'language'
      ? 'settings.language'
      : page === 'appearance'
      ? 'settings.theme'
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

  return (
    <ScrollView
      key={page}
      {...scroll}
      onLayout={container.onLayout}
      contentContainerStyle={[
        styles.content,
        page === 'rewards' && styles.rewardsContent,
        useLandscapeTabletLayout && styles.contentLandscape,
      ]}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t('app.back')}
          accessibilityRole="button"
          onPress={onBack}
          style={styles.backButton}
        >
          <View style={styles.backContent}>
            <AppIcon
              color={palette.accent}
              name="back"
              size={APP_ICON_SIZE.standard}
            />
            <Text style={styles.backText}>
              {t(page === 'rewards' ? 'settings.title' : 'app.back')}
            </Text>
          </View>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          {t(title)}
        </Text>
      </View>

      {page === 'language' ? (
        <Group choiceGroup>
          {LOCALES.map(choice => {
            const nativeLabel =
              choice.value === 'system'
                ? undefined
                : translate(choice.value, choice.label);
            return (
              <ChoiceRow
                choice={choice}
                key={choice.value}
                onChange={locale => onChange({ locale })}
                primaryLabel={nativeLabel}
                secondaryLabel={nativeLabel ? t(choice.label) : undefined}
                value={preferences.locale}
              />
            );
          })}
        </Group>
      ) : null}

      {page === 'appearance' ? (
        <View testID="settings-appearance-mode">
          <Group choiceGroup>
            {THEMES.map(choice => (
              <ChoiceRow
                key={choice.value}
                choice={choice}
                value={preferences.theme}
                onChange={theme => onChange({ theme })}
              />
            ))}
          </Group>
          <Text style={styles.rowDescription}>{t('settings.themeHint')}</Text>
        </View>
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
        <HintRewardsContent
          balance={wallet.smart_hint.balance}
          history={dailyHintRewards}
          premium={premium}
          closedBetaPremium={closedBetaPremium}
          reviewAccessPremium={reviewAccessPremium}
          hintRewardProgress={hintRewardProgress}
          onRedeemHintAd={onRedeemHintAd}
          onOpenPremium={onOpenPremium}
        />
      ) : null}

      {page === 'main' ? (
        <View
          style={[
            styles.mainGroups,
            useLandscapeTabletLayout && styles.mainGroupsLandscape,
          ]}
          testID={
            useLandscapeTabletLayout
              ? 'settings-landscape-layout'
              : 'settings-portrait-layout'
          }
        >
          {onOpenPremium || onRestorePurchase || wallet ? (
            <Group tabletColumn={useLandscapeTabletLayout}>
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
              style={[
                styles.restoreMessage,
                useLandscapeTabletLayout && styles.restoreMessageLandscape,
              ]}
            >
              {t(restoreMessage)}
            </Text>
          ) : null}

          {onOpenLessons ? (
            <Group tabletColumn={useLandscapeTabletLayout}>
              <NavigationRow
                label="settings.study"
                onPress={onOpenLessons}
                testID="settings-study"
              />
            </Group>
          ) : null}

          <Group tabletColumn={useLandscapeTabletLayout}>
            <NavigationRow
              label="settings.language"
              onPress={() => onOpenPage?.('language')}
              value={localeLabel ? t(localeLabel) : undefined}
            />
            <NavigationRow
              label="settings.theme"
              onPress={() => onOpenPage?.('appearance')}
              value={themeLabel ? t(themeLabel) : undefined}
            />
            <NavigationRow
              label="settings.input"
              onPress={() => onOpenPage?.('input')}
              value={inputLabel ? t(inputLabel) : undefined}
            />
            <ToggleRow
              hint="settings.oneTapFillHint"
              label="settings.oneTapFill"
              onChange={oneTapFill => onChange({ oneTapFill })}
              showHint
              value={preferences.oneTapFill}
            />
          </Group>

          <Group
            tabletColumn={useLandscapeTabletLayout}
            title="settings.feedbackDisplay"
          >
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
              hint="settings.showTimerHint"
              label="settings.showTimer"
              onChange={showTimer => onChange({ showTimer })}
              value={preferences.showTimer}
            />
            <ToggleRow
              hint="settings.showMistakesHint"
              label="settings.showMistakes"
              onChange={showMistakes => onChange({ showMistakes })}
              value={preferences.showMistakes}
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

          <Group
            tabletColumn={useLandscapeTabletLayout}
            title="settings.highlighting"
          >
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
          </Group>

          <Group
            tabletColumn={useLandscapeTabletLayout}
            title="settings.gameRules"
          >
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
              hint="settings.undoRestoresMistakesHint"
              label="settings.undoRestoresMistakes"
              onChange={undoRestoresMistakes =>
                onChange({ undoRestoresMistakes })
              }
              value={preferences.undoRestoresMistakes}
            />
            <ToggleRow
              label="settings.autoRemoveCandidates"
              onChange={autoRemoveCandidates =>
                onChange({ autoRemoveCandidates })
              }
              value={preferences.autoRemoveCandidates}
            />
          </Group>

          <Group
            tabletColumn={useLandscapeTabletLayout}
            title="settings.advancedFeatures"
          >
            <View testID="settings-advanced-features">
              <ToggleRow
                label="settings.autoFinishMode"
                hint="settings.autoFinishModeHint"
                showHint
                value={preferences.autoFinishMode !== 'off'}
                onChange={enabled =>
                  onChange({ autoFinishMode: enabled ? 'manual' : 'off' })
                }
              />
              <ToggleRow
                label="settings.boardColoring"
                onChange={boardColoring => onChange({ boardColoring })}
                value={preferences.boardColoring}
              />
              <ToggleRow
                hint="settings.candidateMultiSelectHint"
                label="settings.candidateMultiSelect"
                onChange={multiSelectEnabled =>
                  onChange({ multiSelectEnabled })
                }
                showHint
                value={preferences.multiSelectEnabled}
              />
              <ToggleRow
                label="settings.forcingEnabled"
                hint="settings.forcingEnabledHint"
                onChange={forcingEnabled => onChange({ forcingEnabled })}
                value={preferences.forcingEnabled}
              />
            </View>
          </Group>

          {onOpenPrivacy || onOpenSupport || onOpenLicenses ? (
            <Group tabletColumn={useLandscapeTabletLayout}>
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
            <Group
              tabletColumn={useLandscapeTabletLayout}
              title="settings.developerTools"
            >
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
        </View>
      ) : null}
    </ScrollView>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    content: {
      alignSelf: 'center',
      maxWidth: 760,
      paddingBottom: 36,
      paddingHorizontal: 20,
      paddingTop: 20,
      width: '100%',
    },
    rewardsContent: { maxWidth: '100%' },
    contentLandscape: { maxWidth: 1180 },
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
    backContent: { alignItems: 'center', flexDirection: 'row', gap: 4 },
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
    groupWrapTabletColumn: {
      flexBasis: '48%',
      flexGrow: 1,
      minWidth: 420,
    },
    mainGroups: {},
    mainGroupsLandscape: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 20,
    },
    groupTitle: {
      color: palette.muted,
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 9,
      marginLeft: 15,
    },
    group: {
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
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
    rowCopy: {
      flex: 1,
      paddingRight: 12,
    },
    toggleLabel: {
      flex: 0,
    },
    rowDescription: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    languageSecondaryLabel: {
      color: palette.muted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 2,
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
      marginLeft: 8,
    },
    checkmark: {
      marginLeft: 12,
    },
    restoreMessage: {
      color: palette.accent,
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 20,
      marginHorizontal: 15,
    },
    restoreMessageLandscape: { width: '100%' },
    pressed: {
      backgroundColor: palette.surfaceStrong,
    },
  });
}
