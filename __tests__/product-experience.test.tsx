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
  test('disables interaction feedback by default while preserving an explicit choice', () => {
    expect(DEFAULT_PRODUCT_PREFERENCES.soundEffects).toBe(false);
    expect(DEFAULT_PRODUCT_PREFERENCES.haptics).toBe(false);
    expect(normalizeProductPreferences({}).soundEffects).toBe(false);
    expect(normalizeProductPreferences({}).haptics).toBe(false);
    expect(
      normalizeProductPreferences({ soundEffects: true }).soundEffects,
    ).toBe(true);
    expect(normalizeProductPreferences({ haptics: true }).haptics).toBe(true);
  });

  test('persists valid how-to-play progress and rejects invalid steps', async () => {
    expect(
      normalizeProductPreferences({ howToPlayProgress: -1 }),
    ).toMatchObject({
      howToPlayCompleted: false,
      howToPlayProgress: 0,
    });
    expect(
      normalizeProductPreferences({ howToPlayProgress: 12 }),
    ).toMatchObject({
      howToPlayProgress: 0,
    });

    const store = new MemoryPreferences();
    const controller = new ProductPreferencesController(store);
    await controller.initialize();
    await controller.updatePreferences({
      howToPlayCompleted: false,
      howToPlayProgress: 7,
    });
    const restarted = new ProductPreferencesController(store);
    await restarted.initialize();

    expect(restarted.snapshot.preferences).toMatchObject({
      howToPlayCompleted: false,
      howToPlayProgress: 7,
    });
  });

  test('turns off legacy interaction feedback without clearing other data', async () => {
    const store = new MemoryPreferences();
    store.value = {
      ...DEFAULT_PRODUCT_PREFERENCES,
      schemaVersion: 2,
      locale: 'ja',
      soundEffects: true,
      haptics: true,
    };
    const controller = new ProductPreferencesController(
      store,
      () => 'en-US',
      () => 1234,
    );

    await controller.initialize();

    expect(controller.snapshot.preferences).toMatchObject({
      schemaVersion: 3,
      locale: 'ja',
      soundEffects: false,
      haptics: false,
    });
    expect(store.writes).toEqual([
      {
        key: PRODUCT_PREFERENCES_KEY,
        value: controller.snapshot.preferences,
        updatedAtEpochMs: 1234,
      },
    ]);

    await controller.updatePreferences({ soundEffects: true, haptics: true });
    const restarted = new ProductPreferencesController(store);
    await restarted.initialize();
    expect(restarted.snapshot.preferences).toMatchObject({
      soundEffects: true,
      haptics: true,
    });
  });

  test.each([
    ['fullHouseAssist', true],
    ['highlightCandidateNotes', true],
    ['outlineUniqueCandidateNotes', true],
    ['autoFinishTrivialTail', false],
    ['alternatingBoxShading', false],
    ['multiSelectOnboardingSeen', false],
  ] as const)(
    'defaults %s to %s and persists a change',
    async (key, initial) => {
      expect(DEFAULT_PRODUCT_PREFERENCES[key]).toBe(initial);
      expect(normalizeProductPreferences({})[key]).toBe(initial);
      const store = new MemoryPreferences();
      const controller = new ProductPreferencesController(store);
      await controller.initialize();
      await controller.updatePreferences({ [key]: !initial });
      const restarted = new ProductPreferencesController(store);
      await restarted.initialize();
      expect(restarted.snapshot.preferences[key]).toBe(!initial);
    },
  );

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
      normalizeProductPreferences({ showSimplestTechnique: true }),
    ).toEqual(DEFAULT_PRODUCT_PREFERENCES);
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
    expect(translate('de', 'home.level', { level: 4 })).toBe('Experte');
    expect(translate('zh-Hans', 'home.difficulty', { level: 4 })).toBe('专家');
    expect(translate('zh-Hans', 'home.availableCount', { count: 5 })).toBe(
      '可用 5 次',
    );
    expect(translate('zh-Hans', 'home.resumeHeroTitle')).toBe(
      '这一盘，还没结束。',
    );
    expect(translate('zh-Hans', 'home.continue')).toBe('继续');
    expect(translate('zh-Hans', 'home.completed', { count: 8 })).toBe(
      '已完成8题',
    );
    expect(
      translateCoordinatorMessage(
        (key, params) => translate('zh-Hans', key, params),
        { code: 'level_unavailable', params: { level: 5 } },
      ),
    ).toBe('当前没有极限难度的题目。');
  });

  test.each([
    ['en', ['Easy', 'Medium', 'Hard', 'Expert', 'Extreme'], 'Play Again'],
    [
      'ja',
      ['かんたん', 'ふつう', '難しい', 'エキスパート', 'エクストリーム'],
      'もう一局',
    ],
    [
      'de',
      ['Einfach', 'Mittel', 'Schwer', 'Experte', 'Extrem'],
      'Noch eine Runde',
    ],
    ['zh-Hans', ['简单', '中等', '困难', '专家', '极限'], '再来一局'],
  ] as const)(
    'uses named difficulties throughout %s UI copy',
    (locale, names, playAgain) => {
      names.forEach((name, index) => {
        const level = index + 1;
        expect(translate(locale, 'home.difficulty', { level })).toBe(name);
        expect(translate(locale, 'game.level', { level })).toBe(name);
        expect(translate(locale, 'home.startLevel', { level })).toContain(name);
        expect(translate(locale, 'result.nextPuzzle')).toBe(playAgain);
        expect(
          translate(locale, 'growth.album.sourceLine', {
            date: 'Today',
            level,
          }),
        ).toBe(`Today · ${name}`);
      });
    },
  );

  test('startup failure copy warns against uninstalling without promising data safety', () => {
    expect(translate('en', 'app.failureBody')).toBe(
      'Close the app completely, then open it again. Your progress is stored only on this device. Do not uninstall the app, or your data may be lost.',
    );
    expect(translate('ja', 'app.failureBody')).toContain(
      'アプリをアンインストールしないでください',
    );
    expect(translate('de', 'app.failureBody')).toContain(
      'Deinstalliere die App nicht',
    );
    expect(translate('zh-Hans', 'app.failureBody')).toBe(
      '请完全退出应用后重新打开。你的进度只保存在本机，请勿卸载应用，以免数据丢失。',
    );
    for (const locale of ['en', 'ja', 'de', 'zh-Hans'] as const) {
      expect(translate(locale, 'app.retry')).toBeTruthy();
      expect(translate(locale, 'app.failureBody').toLowerCase()).not.toContain(
        'current build',
      );
    }
  });

  test('resolves light, dark and system themes deterministically', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', null)).toBe('light');
    expect(lightPalette.background).not.toBe(darkPalette.background);
    expect(lightPalette.ink).not.toBe(darkPalette.ink);
  });

  test('settings keeps existing controls except appearance and analysis effort', async () => {
    const onChange = jest.fn();
    const onOpenPage = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <LocalizationProvider locale="zh-Hans">
          <ThemeProvider preference="light">
            <SettingsScreen
              onBack={jest.fn()}
              onChange={onChange}
              onOpenPage={onOpenPage}
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
    expect(choices).toHaveLength(0);
    expect(
      renderer.root.findAll(
        node =>
          typeof node.props.accessibilityLabel === 'string' &&
          typeof node.props.onValueChange === 'function',
      ),
    ).toHaveLength(17);
    const boardColoringSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '棋盘着色' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(boardColoringSwitch.props.value).toBe(false);
    await ReactTestRenderer.act(() =>
      boardColoringSwitch.props.onValueChange(true),
    );
    expect(onChange).toHaveBeenCalledWith({ boardColoring: true });
    await ReactTestRenderer.act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: '语言, 跟随系统' })
        .props.onPress(),
    );
    expect(onOpenPage).toHaveBeenCalledWith('language');
    await ReactTestRenderer.act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: '输入方式, 选格优先' })
        .props.onPress(),
    );
    expect(onOpenPage).toHaveBeenCalledWith('input');
    const animationSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '提示动画' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(animationSwitch.props.accessibilityHint).toBe(
      translate('zh-Hans', 'settings.hintAnimationsHint'),
    );
    expect(
      renderer.root.findAllByProps({
        children: translate('zh-Hans', 'settings.soundEffectsHint'),
      }),
    ).toHaveLength(0);
    expect(
      renderer.root.find(
        node =>
          node.props.accessibilityLabel === '音效' &&
          typeof node.props.onValueChange === 'function',
      ).props.accessibilityHint,
    ).toBeUndefined();
    await ReactTestRenderer.act(() => {
      animationSwitch.props.onValueChange(false);
    });
    expect(onChange).toHaveBeenCalledWith({ hintAnimations: false });
    const fullHouseSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '末格补全' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(fullHouseSwitch.props.value).toBe(true);
    await ReactTestRenderer.act(() => {
      fullHouseSwitch.props.onValueChange(false);
    });
    expect(onChange).toHaveBeenCalledWith({ fullHouseAssist: false });
    const bandSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '九宫交错底色' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(bandSwitch.props.value).toBe(false);
    await ReactTestRenderer.act(() => bandSwitch.props.onValueChange(true));
    expect(onChange).toHaveBeenCalledWith({ alternatingBoxShading: true });
    const noteHighlightSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '高亮同数备注' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(noteHighlightSwitch.props.value).toBe(true);
    await ReactTestRenderer.act(() =>
      noteHighlightSwitch.props.onValueChange(false),
    );
    expect(onChange).toHaveBeenCalledWith({ highlightCandidateNotes: false });
    const uniqueNoteSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '标记唯一备注' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(uniqueNoteSwitch.props.value).toBe(true);
    await ReactTestRenderer.act(() =>
      uniqueNoteSwitch.props.onValueChange(false),
    );
    expect(onChange).toHaveBeenCalledWith({
      outlineUniqueCandidateNotes: false,
    });
    const autoFinishSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '自动完成' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(autoFinishSwitch.props.value).toBe(false);
    await ReactTestRenderer.act(() =>
      autoFinishSwitch.props.onValueChange(true),
    );
    expect(onChange).toHaveBeenCalledWith({ autoFinishTrivialTail: true });
    expect(renderer.root.findAllByProps({ children: '深色' })).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ children: '复盘分析强度' }),
    ).toHaveLength(0);
  });

  test('settings choice pages show only their own options', async () => {
    const onChange = jest.fn();
    const onBack = jest.fn();
    const renderPage = (page: 'language' | 'input') => (
      <LocalizationProvider locale="zh-Hans">
        <ThemeProvider preference="light">
          <SettingsScreen
            onBack={onBack}
            onChange={onChange}
            page={page}
            preferences={DEFAULT_PRODUCT_PREFERENCES}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(renderPage('language'));
    });
    expect(
      renderer.root.findAll(
        node =>
          node.props.accessibilityRole === 'radio' &&
          typeof node.props.onPress === 'function',
      ),
    ).toHaveLength(5);
    expect(
      renderer.root.findAllByProps({ accessibilityRole: 'switch' }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: '简体中文' })
        .props.onPress(),
    );
    expect(onChange).toHaveBeenCalledWith({ locale: 'zh-Hans' });

    await ReactTestRenderer.act(() => renderer.update(renderPage('input')));
    expect(
      renderer.root.findAll(
        node =>
          node.props.accessibilityRole === 'radio' &&
          typeof node.props.onPress === 'function',
      ),
    ).toHaveLength(2);
    await ReactTestRenderer.act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: '数字优先' })
        .props.onPress(),
    );
    expect(onChange).toHaveBeenCalledWith({ inputMode: 'digit_first' });
    await ReactTestRenderer.act(() =>
      renderer.root.findByProps({ accessibilityLabel: '返回' }).props.onPress(),
    );
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test('rewards page shows both balances and opens a resource-specific ad flow', async () => {
    const onTopUpSmartHint = jest
      .fn()
      .mockResolvedValue({ status: 'unavailable', reason: 'not_loaded' });
    const onTopUpQuickPencil = jest
      .fn()
      .mockResolvedValue({ status: 'dismissed' });
    const wallet = {
      smart_hint: {
        resource: 'smart_hint' as const,
        balance: 5,
        earnedTotal: 5,
        spentTotal: 0,
      },
      quick_pencil: {
        resource: 'quick_pencil' as const,
        balance: 3,
        earnedTotal: 3,
        spentTotal: 0,
      },
    };
    const renderRewards = (premium: boolean, hintBalance = 5) => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <SettingsScreen
            onBack={jest.fn()}
            onChange={jest.fn()}
            onTopUpQuickPencil={onTopUpQuickPencil}
            onTopUpSmartHint={onTopUpSmartHint}
            page="rewards"
            preferences={DEFAULT_PRODUCT_PREFERENCES}
            premium={premium}
            wallet={{
              ...wallet,
              smart_hint: { ...wallet.smart_hint, balance: hintBalance },
            }}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(renderRewards(false));
    });
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Smart hints, 5' }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Quick notes, 3' }),
    ).toBeTruthy();
    await ReactTestRenderer.act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'Smart hints, Watch ad · +1' })
        .props.onPress(),
    );
    await ReactTestRenderer.act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'Quick notes, Watch ad · +1' })
        .props.onPress(),
    );
    expect(onTopUpSmartHint).toHaveBeenCalledTimes(1);
    expect(onTopUpQuickPencil).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findByProps({
        children: 'No reward was received, so your balance did not change.',
      }),
    ).toBeTruthy();

    await ReactTestRenderer.act(() =>
      renderer.update(renderRewards(false, 99)),
    );
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'Smart hints, Watch ad · +1',
      }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(() => renderer.update(renderRewards(true)));
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'Quick notes, Watch ad · +1',
      }),
    ).toHaveLength(0);
  });
});

test('replay defaults to the lowest budget and saves chosen tiers in existing preferences', async () => {
  const store = new MemoryPreferences();
  const controller = new ProductPreferencesController(store);
  await controller.initialize();
  expect(controller.snapshot.preferences.replayAnalysisLevel).toBe('basic');
  for (const replayAnalysisLevel of ['advanced', 'expert', 'basic'] as const) {
    await controller.updatePreferences({ replayAnalysisLevel });
    const restored = new ProductPreferencesController(store);
    await restored.initialize();
    expect(restored.snapshot.preferences.replayAnalysisLevel).toBe(
      replayAnalysisLevel,
    );
  }
  expect(
    normalizeProductPreferences({ replayAnalysisLevel: 'bogus' })
      .replayAnalysisLevel,
  ).toBe('basic');
  expect(normalizeProductPreferences({}).replayAnalysisLevel).toBe('basic');
});
