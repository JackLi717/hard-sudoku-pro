import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  LocalePreference,
  ProductPreferences,
  ThemePreference,
} from '../../application';
import { TranslationKey, useLocalization } from '../../localization';
import { AppPalette, useAppTheme } from '../theme';

type SettingsScreenProps = {
  preferences: ProductPreferences;
  onBack(): void;
  onLocale(locale: LocalePreference): void;
  onTheme(theme: ThemePreference): void;
  onHintAnimations(enabled: boolean): void;
};

const LOCALES: readonly {
  value: LocalePreference;
  label: TranslationKey;
}[] = [
  { value: 'system', label: 'settings.system' },
  { value: 'en', label: 'settings.english' },
  { value: 'ja', label: 'settings.japanese' },
  { value: 'de', label: 'settings.german' },
  { value: 'zh-Hans', label: 'settings.simplifiedChinese' },
];

const THEMES: readonly {
  value: ThemePreference;
  label: TranslationKey;
}[] = [
  { value: 'system', label: 'settings.system' },
  { value: 'light', label: 'settings.light' },
  { value: 'dark', label: 'settings.dark' },
];

const ANIMATION_CHOICES: readonly {
  value: 'on' | 'off';
  label: TranslationKey;
}[] = [
  { value: 'on', label: 'settings.on' },
  { value: 'off', label: 'settings.off' },
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

export function SettingsScreen({
  preferences,
  onBack,
  onLocale,
  onTheme,
  onHintAnimations,
}: SettingsScreenProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
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
          onChange={onLocale}
          value={preferences.locale}
        />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('settings.hintAnimations')}
        </Text>
        <Text style={styles.sectionHint}>
          {t('settings.hintAnimationsHint')}
        </Text>
        <ChoiceGroup
          choices={ANIMATION_CHOICES}
          onChange={value => onHintAnimations(value === 'on')}
          value={preferences.hintAnimations ? 'on' : 'off'}
        />
      </View>

      <View style={styles.section}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {t('settings.theme')}
        </Text>
        <Text style={styles.sectionHint}>{t('settings.themeHint')}</Text>
        <ChoiceGroup
          choices={THEMES}
          onChange={onTheme}
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
  });
}
