import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  PRODUCT_PREFERENCES_KEY,
  ProductPreferenceStore,
  ProductPreferencesController,
  gameSettingsFromProductPreferences,
  normalizeProductPreferences,
  resolveProductLocale,
} from '../src/application';
import {
  LocalizationProvider,
  TRANSLATIONS,
  translate,
  translateCoordinatorMessage,
} from '../src/localization';
import { SettingsScreen } from '../src/ui/screens/SettingsScreen';
import {
  ThemeProvider,
  darkPalette,
  lightPalette,
  resolveTheme,
} from '../src/ui/theme';

class MemoryPreferences implements ProductPreferenceStore {
  value: unknown = null;
  writes: { key: string; value: unknown; updatedAtEpochMs: number }[] = [];

  async getSetting<Value>(): Promise<Value | null> {
    return this.value as Value | null;
  }

  async setSetting<Value>(
    key: string,
    value: Value,
    updatedAtEpochMs: number,
  ): Promise<void> {
    this.value = value;
    this.writes.push({ key, value, updatedAtEpochMs });
  }
}

describe('phase 6 product experience foundation', () => {
  test('normalizes old settings and resolves only supported device locales', () => {
    expect(normalizeProductPreferences(null)).toEqual(
      DEFAULT_PRODUCT_PREFERENCES,
    );
    expect(
      normalizeProductPreferences({ locale: 'de', theme: 'unsupported' }),
    ).toEqual({
      ...DEFAULT_PRODUCT_PREFERENCES,
      locale: 'de',
    });
    expect(
      normalizeProductPreferences({
        autoCheckErrors: false,
        errorLimit: true,
      }),
    ).toMatchObject({ autoCheckErrors: true, errorLimit: true });
    expect(resolveProductLocale('system', 'ja-JP')).toBe('ja');
    expect(resolveProductLocale('system', 'de-DE')).toBe('de');
    expect(resolveProductLocale('system', 'zh-CN')).toBe('zh-Hans');
    expect(resolveProductLocale('system', 'zh-Hans-SG')).toBe('zh-Hans');
    expect(resolveProductLocale('system', 'zh_Hans_CN')).toBe('zh-Hans');
    expect(resolveProductLocale('system', 'zh-TW')).toBe('en');
    expect(resolveProductLocale('system', 'fr-FR')).toBe('en');
    expect(resolveProductLocale('ja', 'de-DE')).toBe('ja');
  });

  test('persists language and theme changes in order and restores them', async () => {
    const store = new MemoryPreferences();
    const controller = new ProductPreferencesController(
      store,
      () => 'de-DE',
      () => 1234,
    );
    await controller.initialize();
    expect(controller.snapshot).toEqual({
      preferences: DEFAULT_PRODUCT_PREFERENCES,
      effectiveLocale: 'de',
    });

    await Promise.all([
      controller.setLocale('zh-Hans'),
      controller.setTheme('dark'),
      controller.setHintAnimations(false),
    ]);
    expect(controller.snapshot).toEqual({
      preferences: {
        ...DEFAULT_PRODUCT_PREFERENCES,
        locale: 'zh-Hans',
        theme: 'dark',
        hintAnimations: false,
      },
      effectiveLocale: 'zh-Hans',
    });
    expect(store.writes).toHaveLength(3);
    expect(store.writes[2]).toEqual({
      key: PRODUCT_PREFERENCES_KEY,
      value: controller.snapshot.preferences,
      updatedAtEpochMs: 1234,
    });

    const restarted = new ProductPreferencesController(store, () => 'en-US');
    await restarted.initialize();
    expect(restarted.snapshot).toEqual(controller.snapshot);
  });

  test('maps new-game rule preferences without changing visual preferences', () => {
    expect(
      gameSettingsFromProductPreferences({
        ...DEFAULT_PRODUCT_PREFERENCES,
        autoCheckErrors: true,
        errorLimit: true,
        autoRemoveCandidates: false,
      }),
    ).toEqual({
      autoCheckErrors: true,
      errorLimit: 3,
      autoRemoveCandidates: false,
    });
  });

  test('keeps all locale keys aligned and interpolates translated text', () => {
    const englishKeys = Object.keys(TRANSLATIONS.en).sort();
    for (const resource of Object.values(TRANSLATIONS)) {
      expect(Object.keys(resource).sort()).toEqual(englishKeys);
    }
    expect(translate('de', 'home.level', { level: 4 })).toBe('Level 4');
    expect(translate('zh-Hans', 'home.completed', { count: 8 })).toBe(
      '已完成 8 题',
    );
    expect(
      translateCoordinatorMessage(
        (key, params) => translate('zh-Hans', key, params),
        { code: 'level_unavailable', params: { level: 5 } },
      ),
    ).toBe('当前没有 Level 5 的题目。');
  });

  test('resolves light, dark and system themes deterministically', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', null)).toBe('light');
    expect(lightPalette.background).not.toBe(darkPalette.background);
    expect(lightPalette.ink).not.toBe(darkPalette.ink);
  });

  test('settings page exposes localized accessible radio choices', async () => {
    const onChange = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="zh-Hans">
          <ThemeProvider preference="light">
            <SettingsScreen
              onBack={jest.fn()}
              onChange={onChange}
              preferences={DEFAULT_PRODUCT_PREFERENCES}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });
    const choices = renderer.root.findAll(
      node =>
        node.props.accessibilityRole === 'radio' &&
        typeof node.props.onPress === 'function',
    );
    expect(choices).toHaveLength(10);
    const animationSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '提示动画' &&
        typeof node.props.onValueChange === 'function',
    );
    await ReactTestRenderer.act(() => {
      animationSwitch.props.onValueChange(false);
    });
    expect(onChange).toHaveBeenCalledWith({ hintAnimations: false });
    const darkChoice = choices.find(
      choice => choice.findAllByProps({ children: '深色' }).length > 0,
    );
    expect(darkChoice).toBeDefined();
    await ReactTestRenderer.act(() => {
      darkChoice?.props.onPress();
    });
    expect(onChange).toHaveBeenCalledWith({ theme: 'dark' });
  });
});
