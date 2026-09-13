import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { DEFAULT_PRODUCT_PREFERENCES } from '../src/application';
import { RELEASE_CORE_FEATURES } from '../src/app/release-scope';
import { LocalizationProvider, translate } from '../src/localization';
import { SettingsScreen } from '../src/ui/screens/SettingsScreen';
import { ThemeProvider } from '../src/ui/theme';

const releaseSource = (...segments: string[]) =>
  fs.readFileSync(path.join(__dirname, '..', ...segments), 'utf8');

test('release declares exactly the four approved core features', () => {
  expect(RELEASE_CORE_FEATURES).toEqual({
    game: true,
    sessionReplay: true,
    statistics: true,
    howToPlay: true,
  });
});

test('release runtime and app shell do not wire technique growth', () => {
  const productionRuntime = releaseSource(
    'src',
    'app',
    'production-runtime.ts',
  );
  const appShell = releaseSource('src', 'ui', 'HardSudokuApp.tsx');
  const gameScreen = releaseSource('src', 'ui', 'screens', 'GameScreen.tsx');

  expect(productionRuntime).not.toMatch(/technique-growth|\bgrowth\b/i);
  expect(appShell).not.toMatch(/technique-growth|\bgrowth\b/i);
  expect(appShell).not.toMatch(/TechniqueCatalogScreen|TechniqueDetailScreen/);
  expect(gameScreen).not.toMatch(/technique-growth|\bgrowth\b/i);

  expect(appShell).toContain('<RootTabBar');
  expect(appShell).toContain("activeTab === 'replay'");
  expect(appShell).toContain("activeTab === 'statistics'");
  expect(appShell).toContain('onOpenHelp=');
  expect(appShell).toContain('onStart=');
});

test('release cannot open the development completion preview', () => {
  const appShell = releaseSource('src', 'ui', 'HardSudokuApp.tsx');
  const settings = releaseSource('src', 'ui', 'screens', 'SettingsScreen.tsx');

  expect(appShell).toMatch(
    /onOpenCompletionPreview=\{\s*__DEV__\s*\?[^:]+:\s*undefined\s*\}/,
  );
  expect(appShell).toMatch(/\{__DEV__ && completionPreviewOpen \?/);
  expect(settings).toContain('const developerToolsAvailable =');
  expect(settings).toContain('__DEV__ &&');
});

test('release advertising surface exposes only the two opt-in rewarded placements', () => {
  const contracts = releaseSource(
    'src',
    'application',
    'commercial',
    'contracts.ts',
  );
  const controller = releaseSource(
    'src',
    'application',
    'commercial',
    'controller.ts',
  );
  const gateway = releaseSource(
    'src',
    'infrastructure',
    'ads',
    'google-mobile-ads-gateway.ts',
  );
  const appShell = releaseSource('src', 'ui', 'HardSudokuApp.tsx');

  expect(contracts).toContain("'home_credit_store' | 'credit_exhausted'");
  expect(contracts).toContain("export type AdFormat = 'rewarded'");
  expect(contracts).not.toMatch(/showInterstitial|game_completion/);
  expect(controller).not.toMatch(/showInterstitial|maybeShowInterstitial/);
  expect(gateway).not.toMatch(
    /\b(?:InterstitialAd|BannerAd|AppOpenAd|NativeAd)\b/,
  );
  expect(appShell).toContain("'home_credit_store'");
  expect(appShell).toContain("placement: 'credit_exhausted'");
});

test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
  'release settings hide growth controls in %s',
  async locale => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale={locale}>
          <ThemeProvider preference="light">
            <SettingsScreen
              onBack={jest.fn()}
              onChange={jest.fn()}
              preferences={DEFAULT_PRODUCT_PREFERENCES}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });

    const visibleCopy = renderer.root
      .findAllByType(Text)
      .map(node => node.children.join(' '));
    expect(visibleCopy).not.toContain(translate(locale, 'growth.title'));
    expect(visibleCopy).not.toContain(translate(locale, 'growth.lightSetting'));
    expect(visibleCopy).not.toContain(
      translate(locale, 'growth.summarySetting'),
    );

    await ReactTestRenderer.act(() => renderer.unmount());
  },
);
