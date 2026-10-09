import enabledLanguages from './generated/enabled-languages.json';

/** App languages; region variants share copy until a separate translation is needed. */
export const PRODUCT_LOCALES = [
  'en',
  'ja',
  'de',
  'zh-Hans',
  'ko',
  'zh-Hant',
  'fr',
  'es',
  'pt-BR',
  'vi',
  'hi',
  'uk',
  'ro',
  'fi',
  'ar',
  'id',
  'it',
  'tr',
  'th',
  'pl',
  'ru',
  'nl',
  'ms',
  'fil',
] as const;

export type ProductLocale = (typeof PRODUCT_LOCALES)[number];
export type BaseLocale = 'en' | 'ja' | 'de' | 'zh-Hans';
export type AddedLocale = Exclude<ProductLocale, BaseLocale>;
/** Incomplete translations must not become selectable or match a device locale. */
export const ENABLED_LOCALES = PRODUCT_LOCALES.filter(locale =>
  ['en', 'ja', 'de', 'zh-Hans', ...enabledLanguages].includes(locale),
);
export const ADDED_LOCALES = PRODUCT_LOCALES.filter(
  (locale): locale is AddedLocale =>
    !['en', 'ja', 'de', 'zh-Hans'].includes(locale),
);

export const LANGUAGE_NAMES: Record<ProductLocale, string> = {
  en: 'English',
  ja: '日本語',
  de: 'Deutsch',
  'zh-Hans': '简体中文',
  ko: '한국어',
  'zh-Hant': '繁體中文',
  fr: 'Français',
  es: 'Español',
  'pt-BR': 'Português (Brasil)',
  vi: 'Tiếng Việt',
  hi: 'हिन्दी',
  uk: 'Українська',
  ro: 'Română',
  fi: 'Suomi',
  ar: 'العربية',
  id: 'Bahasa Indonesia',
  it: 'Italiano',
  tr: 'Türkçe',
  th: 'ไทย',
  pl: 'Polski',
  ru: 'Русский',
  nl: 'Nederlands',
  ms: 'Bahasa Melayu',
  fil: 'Filipino',
};

export function localeDirection(locale: ProductLocale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

export function matchDeviceLocale(deviceLocale: string): ProductLocale {
  const normalized = deviceLocale.replace(/_/g, '-').toLowerCase();
  const parts = normalized.split('-');
  if (parts[0] === 'zh') {
    if (parts.includes('hant')) return 'zh-Hant';
    if (parts.includes('hans')) return 'zh-Hans';
    return parts.some(part => ['tw', 'hk', 'mo'].includes(part))
      ? 'zh-Hant'
      : 'zh-Hans';
  }
  if (parts[0] === 'pt') return 'pt-BR';
  if (parts[0] === 'tl') return 'fil';
  return (
    PRODUCT_LOCALES.find(locale => locale.toLowerCase() === parts[0]) ?? 'en'
  );
}
