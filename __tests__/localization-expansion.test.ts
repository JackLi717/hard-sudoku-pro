import {
  PRODUCT_LOCALES,
  ENABLED_LOCALES,
  LANGUAGE_NAMES,
  localeDirection,
  matchDeviceLocale,
} from '../src/localization/locales';
import { translateCopyText } from '../src/localization/catalog';
import { translate } from '../src/localization';
import { SHARE_CARD_COPY } from '../src/ui/screens/share-card-presentation';

test('the approved 24 languages have unique native names', () => {
  expect(PRODUCT_LOCALES).toHaveLength(24);
  expect(ENABLED_LOCALES).toEqual([...PRODUCT_LOCALES]);
  expect(new Set(PRODUCT_LOCALES).size).toBe(24);
  expect(new Set(Object.values(LANGUAGE_NAMES)).size).toBe(24);
  expect(Object.keys(LANGUAGE_NAMES).sort()).toEqual(
    [...PRODUCT_LOCALES].sort(),
  );
});

test.each(PRODUCT_LOCALES)(
  '%s has translated settings and preserves runtime variables',
  locale => {
    expect(translate(locale, 'settings.language')).toBeTruthy();
    const label = translate(locale, 'game.addCandidate', { digit: 7 });
    expect(label).toContain('7');
    expect(label).not.toContain('{{');
  },
);

test('Arabic interpolation isolates coordinates and a missing draft cannot silently fall back', () => {
  expect(translateCopyText('ar', '{digit} in {cell}')).toContain(
    '\u2068{cell}\u2069',
  );
  expect(() => translateCopyText('ko', 'untranslated new copy')).toThrow(
    'Missing ko copy',
  );
});

test.each([
  ['ko-KR', 'ko'],
  ['zh-TW', 'zh-Hant'],
  ['zh_HK', 'zh-Hant'],
  ['zh-MO', 'zh-Hant'],
  ['zh-Hant-CN', 'zh-Hant'],
  ['zh-Hans-HK', 'zh-Hans'],
  ['zh-SG', 'zh-Hans'],
  ['zh', 'zh-Hans'],
  ['fr-CA', 'fr'],
  ['es-MX', 'es'],
  ['pt-PT', 'pt-BR'],
  ['pt-BR', 'pt-BR'],
  ['ar-EG', 'ar'],
  ['fil-PH', 'fil'],
  ['tl-PH', 'fil'],
  ['uk-UA', 'uk'],
  ['id-ID', 'id'],
  ['hi-IN', 'hi'],
  ['fi-FI', 'fi'],
  ['ro-RO', 'ro'],
  ['it-IT', 'it'],
  ['tr-TR', 'tr'],
  ['th-TH', 'th'],
  ['pl-PL', 'pl'],
  ['ru-RU', 'ru'],
  ['nl-BE', 'nl'],
  ['ms-MY', 'ms'],
  ['unknown', 'en'],
])('%s selects %s', (device, expected) => {
  expect(matchDeviceLocale(device)).toBe(expected);
});

test('Arabic direction changes independently of the OS language', () => {
  expect(localeDirection('ar')).toBe('rtl');
  for (const locale of PRODUCT_LOCALES.filter(item => item !== 'ar')) {
    expect(localeDirection(locale)).toBe('ltr');
  }
});

// Exercise the actual lazy copy callbacks, including counts with different
// plural rules. Label + count templates avoid imposing English inflection.
test.each(PRODUCT_LOCALES)(
  '%s renders share counts and replay steps',
  locale => {
    for (const count of [0, 1, 2, 5, 21]) {
      const copy = SHARE_CARD_COPY[locale];
      const expectedCount =
        locale === 'ar' && count === 1 ? 'واحد' : String(count);
      expect(copy.mistakes(count)).toContain(expectedCount);
      expect(copy.replayBadge(count)).toContain(String(count));
      if (count > 0) expect(copy.hints(count)).toContain(String(count));
      for (const label of [
        copy.mistakes(count),
        copy.hints(count),
        copy.replayBadge(count),
      ]) {
        expect(label).not.toMatch(/\{\w+\}|ZXQ|QXZ/);
      }
    }
  },
);
