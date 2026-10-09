import React, { createContext, useContext, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { localeDirection } from './locales';
import { CoordinatorMessage, ProductLocale } from '../application';
import { TRANSLATIONS, TranslationKey } from './resources';

export const LOCALIZATION_ROOT_STYLES = StyleSheet.create({
  rtl: { flex: 1, direction: 'rtl' },
  ltr: { flex: 1, direction: 'ltr' },
});

export type TranslationParams = Readonly<
  Record<string, string | number | undefined>
>;

export type Translate = (
  key: TranslationKey,
  params?: TranslationParams,
) => string;

const DIFFICULTY_KEYS = [
  'difficulty.easy',
  'difficulty.medium',
  'difficulty.hard',
  'difficulty.expert',
  'difficulty.extreme',
] as const;

export function translate(
  locale: ProductLocale,
  key: TranslationKey,
  params: TranslationParams = {},
): string {
  const template = TRANSLATIONS[locale][key] ?? TRANSLATIONS.en[key];
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = params[name];
    if (name === 'level' && typeof value === 'number') {
      const difficultyKey = DIFFICULTY_KEYS[value - 1];
      if (difficultyKey) {
        return TRANSLATIONS[locale][difficultyKey];
      }
    }
    return value === undefined ? match : String(value);
  });
}

export function translateCoordinatorMessage(
  t: Translate,
  message: CoordinatorMessage,
): string {
  const key: TranslationKey = `message.${message.code}`;
  return t(key, message.params);
}

type LocalizationValue = {
  locale: ProductLocale;
  direction: 'ltr' | 'rtl';
  t: Translate;
};

const LocalizationContext = createContext<LocalizationValue>({
  locale: 'en',
  direction: 'ltr',
  t: (key, params) => translate('en', key, params),
});

export function LocalizationProvider({
  locale,
  children,
}: {
  locale: ProductLocale;
  children: React.ReactNode;
}): React.JSX.Element {
  const value = useMemo<LocalizationValue>(
    () => ({
      locale,
      direction: localeDirection(locale),
      t: (key, params) => translate(locale, key, params),
    }),
    [locale],
  );
  return (
    <LocalizationContext.Provider value={value}>
      <View style={LOCALIZATION_ROOT_STYLES[value.direction]}>{children}</View>
    </LocalizationContext.Provider>
  );
}

export function useLocalization(): LocalizationValue {
  return useContext(LocalizationContext);
}

export * from './resources';
export * from './hint-presentation-copy';
