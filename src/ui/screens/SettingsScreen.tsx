import React, { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { InputModePreference, ProductPreferences } from '../../application';
import { TranslationKey, useLocalization } from '../../localization';
import { useScreenScroll } from '../screen-state';
import { AppPalette, useAppTheme } from '../theme';

export type SettingsSubpage = 'language' | 'input';

type SettingsScreenProps = {
  preferences: ProductPreferences;
  page?: 'main' | SettingsSubpage;
  onBack(): void;
  onChange(patch: Partial<ProductPreferences>): void;
  onOpenPage?(page: SettingsSubpage): void;
  onOpenPremium?(): void;
  onOpenHelp?(): void;
  onOpenPrivacy?(): void;
  onOpenSupport?(): void;
  onOpenLicenses?(): void;
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
  onPress,
}: {
  label: TranslationKey;
  value?: string;
  onPress(): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <Pressable
      accessibilityLabel={value ? `${t(label)}, ${value}` : t(label)}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.rowLabel}>{t(label)}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Text
        accessibilityElementsHidden
        allowFontScaling={false}
        style={styles.chevron}
      >
        ›
      </Text>
    </Pressable>
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
  page = 'main',
  onBack,
  onChange,
  onOpenPage,
  onOpenPremium,
  onOpenHelp,
  onOpenPrivacy,
  onOpenSupport,
  onOpenLicenses,
}: SettingsScreenProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const scroll = useScreenScroll(`settings:${page}`);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const localeLabel = LOCALES.find(
    choice => choice.value === preferences.locale,
  )?.label;
  const inputLabel = INPUT_MODES.find(
    choice => choice.value === preferences.inputMode,
  )?.label;
  const title =
    page === 'main'
      ? 'settings.title'
      : page === 'language'
      ? 'settings.language'
      : 'settings.input';

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

      {page === 'main' ? (
        <>
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
              hint="settings.showSimplestTechniqueHint"
              label="settings.showSimplestTechnique"
              onChange={showSimplestTechnique =>
                onChange({ showSimplestTechnique })
              }
              value={preferences.showSimplestTechnique}
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

          {onOpenHelp ||
          onOpenPremium ||
          onOpenPrivacy ||
          onOpenSupport ||
          onOpenLicenses ? (
            <Group>
              {onOpenHelp ? (
                <NavigationRow label="home.help" onPress={onOpenHelp} />
              ) : null}
              {onOpenPremium ? (
                <NavigationRow
                  label="settings.openPremium"
                  onPress={onOpenPremium}
                />
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
    pressed: {
      backgroundColor: palette.surfaceStrong,
    },
  });
}
