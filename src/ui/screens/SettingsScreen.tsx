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
import { AppPalette, useAppTheme } from '../theme';

type SettingsScreenProps = {
  preferences: ProductPreferences;
  onBack(): void;
  onChange(patch: Partial<ProductPreferences>): void;
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
  { value: 'system', label: 'settings.system' },
  { value: 'light', label: 'settings.light' },
  { value: 'dark', label: 'settings.dark' },
];

const INPUT_MODES: readonly {
  value: InputModePreference;
  label: TranslationKey;
}[] = [
  { value: 'cell_first', label: 'settings.cellFirst' },
  { value: 'digit_first', label: 'settings.digitFirst' },
];

function ChoiceGroup<Value extends string>({
  value,
  choices,
  onChange,
}: {
  value: Value;
  choices: readonly { value: Value; label: TranslationKey }[];
  onChange(value: Value): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View accessibilityRole="radiogroup" style={styles.choiceGroup}>
      {choices.map(choice => {
        const selected = choice.value === value;
        return (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(choice.value)}
            style={[styles.choice, selected && styles.choiceSelected]}
          >
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected ? <View style={styles.radioDot} /> : null}
            </View>
            <Text style={styles.choiceLabel}>{t(choice.label)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  disabled = false,
  onChange,
}: {
  label: TranslationKey;
  hint: TranslationKey;
  value: boolean;
  disabled?: boolean;
  onChange(value: boolean): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={[styles.toggleRow, disabled && styles.toggleRowDisabled]}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.toggleCopy}
      >
        <Text style={styles.toggleLabel}>{t(label)}</Text>
        <Text style={styles.toggleHint}>{t(hint)}</Text>
      </View>
      <Switch
        accessibilityHint={t(hint)}
        accessibilityLabel={t(label)}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: palette.surfaceStrong, true: palette.accentSoft }}
        thumbColor={value ? palette.accent : palette.muted}
        value={value}
      />
    </View>
  );
}

export function SettingsScreen({
  preferences,
  onBack,
  onChange,
}: SettingsScreenProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <ScrollView contentContainerStyle={styles.content}>
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
          {t('settings.title')}
        </Text>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('settings.language')}
        </Text>
        <Text style={styles.sectionHint}>{t('settings.languageHint')}</Text>
        <ChoiceGroup
          choices={LOCALES}
          onChange={locale => onChange({ locale })}
          value={preferences.locale}
        />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('settings.feedbackDisplay')}
        </Text>
        <Text style={styles.sectionHint}>
          {t('settings.feedbackDisplayHint')}
        </Text>
        <View style={styles.toggleGroup}>
          <ToggleRow
            hint="settings.soundEffectsHint"
            label="settings.soundEffects"
            onChange={soundEffects => onChange({ soundEffects })}
            value={preferences.soundEffects}
          />
          <ToggleRow
            hint="settings.hapticsHint"
            label="settings.haptics"
            onChange={haptics => onChange({ haptics })}
            value={preferences.haptics}
          />
          <ToggleRow
            hint="settings.keepAwakeHint"
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
            hint="settings.showRemainingDigitsHint"
            label="settings.showRemainingDigits"
            onChange={showRemainingDigits => onChange({ showRemainingDigits })}
            value={preferences.showRemainingDigits}
          />
          <ToggleRow
            hint="settings.hintAnimationsHint"
            label="settings.hintAnimations"
            onChange={hintAnimations => onChange({ hintAnimations })}
            value={preferences.hintAnimations}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('settings.input')}
        </Text>
        <Text style={styles.sectionHint}>{t('settings.inputHint')}</Text>
        <ChoiceGroup
          choices={INPUT_MODES}
          onChange={inputMode => onChange({ inputMode })}
          value={preferences.inputMode}
        />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('settings.highlighting')}
        </Text>
        <Text style={styles.sectionHint}>{t('settings.highlightingHint')}</Text>
        <View style={styles.toggleGroup}>
          <ToggleRow
            hint="settings.highlightRegionsHint"
            label="settings.highlightRegions"
            onChange={highlightRegions => onChange({ highlightRegions })}
            value={preferences.highlightRegions}
          />
          <ToggleRow
            hint="settings.highlightSameDigitHint"
            label="settings.highlightSameDigit"
            onChange={highlightSameDigit => onChange({ highlightSameDigit })}
            value={preferences.highlightSameDigit}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('settings.gameRules')}
        </Text>
        <Text style={styles.sectionHint}>{t('settings.gameRulesHint')}</Text>
        <View style={styles.toggleGroup}>
          <ToggleRow
            hint="settings.autoCheckErrorsHint"
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
            hint="settings.autoRemoveCandidatesHint"
            label="settings.autoRemoveCandidates"
            onChange={autoRemoveCandidates =>
              onChange({ autoRemoveCandidates })
            }
            value={preferences.autoRemoveCandidates}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('settings.theme')}
        </Text>
        <Text style={styles.sectionHint}>{t('settings.themeHint')}</Text>
        <ChoiceGroup
          choices={THEMES}
          onChange={theme => onChange({ theme })}
          value={preferences.theme}
        />
      </View>
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
      minHeight: 44,
      justifyContent: 'center',
    },
    backText: {
      color: palette.accent,
      fontSize: 16,
      fontWeight: '700',
    },
    title: {
      color: palette.ink,
      fontSize: 34,
      fontWeight: '800',
      letterSpacing: -0.8,
      marginTop: 8,
    },
    section: {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 18,
      borderWidth: 1,
      marginBottom: 16,
      padding: 18,
    },
    sectionTitle: {
      color: palette.ink,
      fontSize: 19,
      fontWeight: '800',
    },
    sectionHint: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 5,
    },
    choiceGroup: {
      gap: 8,
      marginTop: 14,
    },
    choice: {
      alignItems: 'center',
      borderColor: palette.line,
      borderRadius: 13,
      borderWidth: 1,
      flexDirection: 'row',
      minHeight: 48,
      paddingHorizontal: 14,
    },
    choiceSelected: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
    },
    radio: {
      alignItems: 'center',
      borderColor: palette.line,
      borderRadius: 9,
      borderWidth: 1.5,
      height: 18,
      justifyContent: 'center',
      width: 18,
    },
    radioSelected: {
      borderColor: palette.accent,
    },
    radioDot: {
      backgroundColor: palette.accent,
      borderRadius: 5,
      height: 10,
      width: 10,
    },
    choiceLabel: {
      color: palette.ink,
      flexShrink: 1,
      fontSize: 15,
      fontWeight: '600',
      marginLeft: 12,
    },
    toggleGroup: {
      marginTop: 10,
    },
    toggleRow: {
      alignItems: 'center',
      borderBottomColor: palette.line,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      minHeight: 68,
      paddingVertical: 10,
    },
    toggleRowDisabled: {
      opacity: 0.5,
    },
    toggleCopy: {
      flex: 1,
      paddingRight: 12,
    },
    toggleLabel: {
      color: palette.ink,
      fontSize: 15,
      fontWeight: '700',
    },
    toggleHint: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 3,
    },
  });
}
