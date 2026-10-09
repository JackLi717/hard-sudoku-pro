import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import Renderer, { act } from 'react-test-renderer';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  normalizeProductPreferences,
  ProductPreferencesController,
  PRODUCT_PREFERENCES_KEY,
} from '../src/application/app/product-preferences';
import { AnalyticsService } from '../src/application/analytics/service';
import { LocalizationProvider } from '../src/localization';
import { ENABLED_LOCALES } from '../src/localization/locales';
import { ThemeProvider } from '../src/ui/theme';
import { SettingsScreen } from '../src/ui/screens/SettingsScreen';
import { TrustScreen } from '../src/ui/screens/CommercialScreens';

test('new installation starts measurement without a choice or preference update', async () => {
  const values = new Map<string, unknown>();
  const store = {
    async getSetting<T>(key: string) {
      return (values.get(key) as T | undefined) ?? null;
    },
    async setSetting<T>(key: string, value: T) {
      values.set(key, value);
    },
  };
  const preferences = new ProductPreferencesController(store);
  const gateway = {
    configure: jest.fn(async () => true),
    logEvent: jest.fn(),
    recordError: jest.fn(),
  };
  const measurement = new AnalyticsService(gateway, store, 'production');
  await preferences.initialize();
  await measurement.initialize(false);
  const { analyticsEnabled, diagnosticsEnabled } =
    preferences.snapshot.preferences;
  measurement.configure(analyticsEnabled, diagnosticsEnabled);
  await measurement.settled();
  measurement.readyEvent(100);
  measurement.failure('hint_engine');
  expect(gateway.configure).toHaveBeenCalledWith(true, true);
  expect(gateway.logEvent).toHaveBeenCalledWith(
    'app_ready',
    expect.any(Object),
  );
  expect(gateway.recordError).toHaveBeenCalledWith('hint_engine', false, '');
  expect(normalizeProductPreferences({})).toMatchObject({
    analyticsEnabled: true,
    diagnosticsEnabled: true,
  });
  measurement.close();
});

test('saved disabled choices survive loading, unrelated changes and restarting', async () => {
  let saved: unknown = {
    ...DEFAULT_PRODUCT_PREFERENCES,
    analyticsEnabled: false,
    diagnosticsEnabled: false,
  };
  const store = {
    async getSetting<T>(key: string) {
      expect(key).toBe(PRODUCT_PREFERENCES_KEY);
      return saved as T;
    },
    async setSetting<T>(_key: string, value: T) {
      saved = value;
    },
  };
  const first = new ProductPreferencesController(store);
  await first.initialize();
  await first.setTheme('dark');
  const restarted = new ProductPreferencesController(store);
  await restarted.initialize();
  expect(restarted.snapshot.preferences).toMatchObject({
    analyticsEnabled: false,
    diagnosticsEnabled: false,
    theme: 'dark',
  });
  expect(
    normalizeProductPreferences({ analyticsEnabled: false }),
  ).toMatchObject({
    analyticsEnabled: false,
    diagnosticsEnabled: true,
  });
});

test('Android settings has no measurement switches and privacy explains Google processing', async () => {
  const originalOS = Platform.OS;
  Object.defineProperty(Platform, 'OS', {
    value: 'android',
    configurable: true,
  });
  let settings: Renderer.ReactTestRenderer | undefined;
  let privacy: Renderer.ReactTestRenderer | undefined;
  try {
    await act(async () => {
      settings = Renderer.create(
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <SettingsScreen
              onBack={jest.fn()}
              onChange={jest.fn()}
              preferences={DEFAULT_PRODUCT_PREFERENCES}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
      privacy = Renderer.create(
        <LocalizationProvider locale="en">
          <ThemeProvider preference="light">
            <TrustScreen onBack={jest.fn()} page="privacy" />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });
    const labels = settings!.root
      .findAll(node => typeof node.props.onValueChange === 'function')
      .map(node => String(node.props.accessibilityLabel));
    expect(labels.some(label => /analytics|diagnostics/i.test(label))).toBe(
      false,
    );
    const text = JSON.stringify(privacy!.toJSON());
    expect(text).toContain('Google Analytics for Firebase');
    expect(text).toContain('installation identifiers');
    expect(text).toContain('does not automatically delete');
  } finally {
    await act(async () => {
      settings?.unmount();
      privacy?.unmount();
    });
    Object.defineProperty(Platform, 'OS', {
      value: originalOS,
      configurable: true,
    });
  }
});

test('every app language shows the same English privacy notice and reading direction', async () => {
  let englishText: string | undefined;
  for (const locale of ENABLED_LOCALES) {
    let privacy: Renderer.ReactTestRenderer | undefined;
    try {
      await act(async () => {
        privacy = Renderer.create(
          <LocalizationProvider locale={locale}>
            <ThemeProvider preference="light">
              <TrustScreen onBack={jest.fn()} page="privacy" />
            </ThemeProvider>
          </LocalizationProvider>,
        );
      });
      const textNodes = privacy!.root.findAllByType(Text);
      const text = textNodes.map(node => node.props.children).join('\n');
      englishText ??= text;
      expect(text).toBe(englishText);
      expect(text).toContain('Privacy');
      expect(text).toContain('Game analytics and crash diagnostics');
      for (const node of textNodes) {
        if (!/[A-Za-z]/.test(String(node.props.children))) continue;
        expect(StyleSheet.flatten(node.props.style).writingDirection).toBe(
          'ltr',
        );
      }
    } finally {
      await act(async () => privacy?.unmount());
    }
  }
});
