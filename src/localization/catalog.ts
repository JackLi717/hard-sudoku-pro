import ko from './generated/ko.json';
import zhHant from './generated/zh-Hant.json';
import fr from './generated/fr.json';
import es from './generated/es.json';
import ptBR from './generated/pt-BR.json';
import vi from './generated/vi.json';
import hi from './generated/hi.json';
import uk from './generated/uk.json';
import ro from './generated/ro.json';
import fi from './generated/fi.json';
import ar from './generated/ar.json';
import id from './generated/id.json';
import it from './generated/it.json';
import tr from './generated/tr.json';
import th from './generated/th.json';
import pl from './generated/pl.json';
import ru from './generated/ru.json';
import nl from './generated/nl.json';
import ms from './generated/ms.json';
import fil from './generated/fil.json';
import {
  ADDED_LOCALES,
  AddedLocale,
  ENABLED_LOCALES,
  ProductLocale,
} from './locales';

export const COPY_CATALOGS: Record<
  AddedLocale,
  Readonly<Record<string, string>>
> = {
  ko,
  'zh-Hant': zhHant,
  fr,
  es,
  'pt-BR': ptBR,
  vi,
  hi,
  uk,
  ro,
  fi,
  ar,
  id,
  it,
  tr,
  th,
  pl,
  ru,
  nl,
  ms,
  fil,
};

/** A missing translation is a build/content defect, never a silent English fallback. */
export function translateCopyText(locale: AddedLocale, source: string): string {
  if (!/[A-Za-z]/.test(source)) return source;
  const translated = COPY_CATALOGS[locale][source];
  if (translated === undefined || translated.length === 0) {
    throw new Error(`Missing ${locale} copy: ${source}`);
  }
  return locale === 'ar'
    ? translated.replace(/\{\{\w+\}\}|\{\w+\}/g, slot => `\u2068${slot}\u2069`)
    : translated;
}

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer Args) => infer Result
  ? (...args: Args) => Result
  : T extends object
  ? { [Key in keyof T]: Widen<T[Key]> }
  : T;

function localizeTree(locale: AddedLocale, value: unknown): unknown {
  if (typeof value === 'string') return translateCopyText(locale, value);
  if (typeof value === 'function') {
    // Copy functions have one numeric parameter (share-card counts/step number).
    // Translate templates before inserting the value, preserving RTL notation.
    return (count: number) => {
      if (count === 0 || count === 1) {
        return translateCopyText(locale, value(count));
      }
      return translateCopyText(locale, value('{value}')).replace(
        /\{value\}/g,
        String(count),
      );
    };
  }
  if (Array.isArray(value))
    return value.map(item => localizeTree(locale, item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        localizeTree(locale, item),
      ]),
    );
  }
  return value;
}

/** Reuse the established copy schemas; translate values, never identifiers or logic. */
export function localizeCopies<T>(base: {
  en: T;
  ja: unknown;
  de: unknown;
  'zh-Hans': unknown;
}): Record<ProductLocale, Widen<T>> {
  const copies = { ...base } as Record<ProductLocale, Widen<T>>;
  for (const locale of ADDED_LOCALES) {
    if (!ENABLED_LOCALES.includes(locale)) continue;
    let translated: Widen<T> | undefined;
    Object.defineProperty(copies, locale, {
      enumerable: true,
      get: () => {
        translated ??= localizeTree(locale, base.en) as Widen<T>;
        return translated;
      },
    });
  }
  return copies;
}
