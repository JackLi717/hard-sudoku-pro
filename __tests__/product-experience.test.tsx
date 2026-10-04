import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
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
    ['showMistakes', true],
    ['showTimer', true],
    ['oneTapFill', true],
    ['highlightCandidateNotes', true],
    ['outlineUniqueCandidateNotes', false],
    ['forcingEnabled', false],
    ['boardColoring', false],
    ['alternatingBoxShading', false],
    ['multiSelectEnabled', false],
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

  test.each(['manual', 'automatic', 'off'] as const)(
    'persists finish mode %s',
    async autoFinishMode => {
      const store = new MemoryPreferences();
      const controller = new ProductPreferencesController(store);
      await controller.initialize();
      await controller.updatePreferences({ autoFinishMode });
      const restarted = new ProductPreferencesController(store);
      await restarted.initialize();
      expect(restarted.snapshot.preferences.autoFinishMode).toBe(
        autoFinishMode,
      );
      expect(
        normalizeProductPreferences({ autoFinishMode }).autoFinishMode,
      ).toBe(autoFinishMode);
    },
  );
  test('defaults an invalid finish mode to manual', () => {
    expect(DEFAULT_PRODUCT_PREFERENCES.autoFinishMode).toBe('manual');
    expect(
      normalizeProductPreferences({ autoFinishMode: 'invalid' }).autoFinishMode,
    ).toBe('manual');
  });

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

  test.each([true, false])(
    'persists the undo mistake-count preference %s',
    async undoRestoresMistakes => {
      expect(DEFAULT_PRODUCT_PREFERENCES.undoRestoresMistakes).toBe(true);
      expect(normalizeProductPreferences({}).undoRestoresMistakes).toBe(true);
      expect(
        normalizeProductPreferences({ undoRestoresMistakes: 'invalid' })
          .undoRestoresMistakes,
      ).toBe(true);
      const store = new MemoryPreferences();
      const controller = new ProductPreferencesController(store);
      await controller.initialize();
      await controller.updatePreferences({ undoRestoresMistakes });
      const restarted = new ProductPreferencesController(store);
      await restarted.initialize();
      expect(restarted.snapshot.preferences.undoRestoresMistakes).toBe(
        undoRestoresMistakes,
      );
    },
  );

  test('maps new-game rule preferences without changing visual preferences', () => {
    expect(
      gameSettingsFromProductPreferences({
        ...DEFAULT_PRODUCT_PREFERENCES,
        autoCheckErrors: true,
        errorLimit: true,
        undoRestoresMistakes: false,
        autoRemoveCandidates: false,
      }),
    ).toEqual({
      autoCheckErrors: true,
      errorLimit: 3,
      undoRestoresMistakes: false,
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

  test.each(['light', 'dark', 'system'] as const)(
    'preserves and persists the %s appearance preference',
    async theme => {
      expect(DEFAULT_PRODUCT_PREFERENCES.theme).toBe('system');
      expect(normalizeProductPreferences({ theme }).theme).toBe(theme);
      const store = new MemoryPreferences();
      const controller = new ProductPreferencesController(store);
      await controller.initialize();
      await controller.updatePreferences({ theme });
      const restarted = new ProductPreferencesController(store);
      await restarted.initialize();
      expect(restarted.snapshot.preferences.theme).toBe(theme);
    },
  );

  test('resolves light, dark and system themes deterministically', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('system', null)).toBe('light');
    expect(lightPalette.background).not.toBe(darkPalette.background);
    expect(lightPalette.ink).not.toBe(darkPalette.ink);
  });

  test('settings keeps choice controls on their own pages and hides analysis effort', async () => {
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
    ).toHaveLength(20);
    const mistakesSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '显示错误次数' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(mistakesSwitch.props.value).toBe(true);
    await ReactTestRenderer.act(() =>
      mistakesSwitch.props.onValueChange(false),
    );
    expect(onChange).toHaveBeenCalledWith({ showMistakes: false });
    const undoMistakesSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '撤销时回退错误次数' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(undoMistakesSwitch.props.value).toBe(true);
    await ReactTestRenderer.act(() =>
      undoMistakesSwitch.props.onValueChange(false),
    );
    expect(onChange).toHaveBeenCalledWith({ undoRestoresMistakes: false });
    const timerSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '显示计时器' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(timerSwitch.props.value).toBe(true);
    await ReactTestRenderer.act(() => timerSwitch.props.onValueChange(false));
    expect(onChange).toHaveBeenCalledWith({ showTimer: false });
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
    const oneTapFillSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '轻点填入' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(oneTapFillSwitch.props.value).toBe(true);
    expect(oneTapFillSwitch.props.accessibilityHint).toBe(
      translate('zh-Hans', 'settings.oneTapFillHint'),
    );
    expect(oneTapFillSwitch.props.accessibilityHint).toContain(
      '仅在专家和极限难度中启用',
    );
    const inputControlLabels = renderer.root
      .findAll(node =>
        ['输入方式, 选格优先', '轻点填入'].includes(
          node.props.accessibilityLabel,
        ),
      )
      .map(node => node.props.accessibilityLabel);
    expect(inputControlLabels.indexOf('输入方式, 选格优先')).toBeLessThan(
      inputControlLabels.indexOf('轻点填入'),
    );
    expect(
      renderer.root.findAllByProps({ accessibilityLabel: '末格补全' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({
        children: translate('zh-Hans', 'settings.oneTapFillHint'),
      }).length,
    ).toBeGreaterThan(0);
    await ReactTestRenderer.act(() => {
      oneTapFillSwitch.props.onValueChange(false);
    });
    expect(onChange).toHaveBeenCalledWith({ oneTapFill: false });
    const bandSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '3×3 宫交错底色' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(bandSwitch.props.value).toBe(false);
    await ReactTestRenderer.act(() => bandSwitch.props.onValueChange(true));
    expect(onChange).toHaveBeenCalledWith({ alternatingBoxShading: true });
    const noteHighlightSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '高亮同数笔记' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(noteHighlightSwitch.props.value).toBe(true);
    await ReactTestRenderer.act(() =>
      noteHighlightSwitch.props.onValueChange(false),
    );
    expect(onChange).toHaveBeenCalledWith({ highlightCandidateNotes: false });
    const uniqueNoteSwitch = renderer.root.find(
      node =>
        node.props.accessibilityLabel === '标记唯一候选笔记' &&
        typeof node.props.onValueChange === 'function',
    );
    expect(uniqueNoteSwitch.props.value).toBe(false);
    await ReactTestRenderer.act(() =>
      uniqueNoteSwitch.props.onValueChange(true),
    );
    expect(onChange).toHaveBeenCalledWith({
      outlineUniqueCandidateNotes: true,
    });
    await ReactTestRenderer.act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: '外观, 跟随系统' })
        .props.onPress(),
    );
    expect(onOpenPage).toHaveBeenCalledWith('appearance');
    const advanced = renderer.root.findByProps({
      testID: 'settings-advanced-features',
    });
    expect(
      advanced.findAll(node => node.props.accessibilityRole === 'radio'),
    ).toHaveLength(0);
    await ReactTestRenderer.act(() =>
      advanced
        .findByProps({ accessibilityLabel: '完成余下, 手动' })
        .props.onPress(),
    );
    expect(onOpenPage).toHaveBeenCalledWith('finish');
    expect(
      advanced
        .findAll(node => typeof node.props.onValueChange === 'function')
        .map(node => node.props.accessibilityLabel),
    ).toEqual(['棋盘着色', '多选', '推演']);
    for (const [label, key] of [
      ['棋盘着色', 'boardColoring'],
      ['多选', 'multiSelectEnabled'],
      ['推演', 'forcingEnabled'],
    ] as const) {
      const toggle = advanced.find(
        node =>
          node.props.accessibilityLabel === label &&
          typeof node.props.onValueChange === 'function',
      );
      expect(toggle.props.value).toBe(false);
      await ReactTestRenderer.act(() => toggle.props.onValueChange(true));
      expect(onChange).toHaveBeenCalledWith({ [key]: true });
      if (key === 'multiSelectEnabled') {
        expect(toggle.props.accessibilityHint).toBe(
          translate('zh-Hans', 'settings.candidateMultiSelectHint'),
        );
        expect(
          advanced.findAllByProps({
            children: translate('zh-Hans', 'settings.candidateMultiSelectHint'),
          }).length,
        ).toBeGreaterThan(0);
      }
    }
    expect(renderer.root.findAllByProps({ children: '深色' })).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ children: '复盘分析强度' }),
    ).toHaveLength(0);
  });

  test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
    'undo mistake-count switch changes only its own preference in %s',
    async locale => {
      const onChange = jest.fn();
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      const render = (undoRestoresMistakes: boolean) => (
        <LocalizationProvider locale={locale}>
          <ThemeProvider preference="light">
            <SettingsScreen
              preferences={{
                ...DEFAULT_PRODUCT_PREFERENCES,
                undoRestoresMistakes,
              }}
              onChange={onChange}
              onBack={() => undefined}
            />
          </ThemeProvider>
        </LocalizationProvider>
      );
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(render(true));
      });
      try {
        const control = () =>
          renderer.root.find(
            node =>
              node.props.accessibilityLabel ===
                translate(locale, 'settings.undoRestoresMistakes') &&
              typeof node.props.onValueChange === 'function',
          );
        expect(control().props.value).toBe(true);
        expect(control().props.accessibilityHint).toBe(
          translate(locale, 'settings.undoRestoresMistakesHint'),
        );
        await ReactTestRenderer.act(() => control().props.onValueChange(false));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith({ undoRestoresMistakes: false });
        await ReactTestRenderer.act(() => renderer.update(render(false)));
        expect(control().props.value).toBe(false);
      } finally {
        await ReactTestRenderer.act(() => renderer.unmount());
      }
    },
  );

  test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
    'appearance page preserves choices and saves immediately in %s',
    async locale => {
      const onChange = jest.fn();
      const onBack = jest.fn();
      const render = (theme: 'light' | 'dark' | 'system') => (
        <LocalizationProvider locale={locale}>
          <ThemeProvider preference={theme}>
            <SettingsScreen
              page="appearance"
              preferences={{ ...DEFAULT_PRODUCT_PREFERENCES, theme }}
              onChange={onChange}
              onBack={onBack}
            />
          </ThemeProvider>
        </LocalizationProvider>
      );
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(render('system'));
      });
      try {
        const choices = () =>
          renderer.root.findAll(
            node =>
              node.props.accessibilityRole === 'radio' &&
              typeof node.props.onPress === 'function',
          );
        expect(choices().map(node => node.props.accessibilityLabel)).toEqual(
          (['settings.light', 'settings.dark', 'settings.system'] as const).map(
            key => translate(locale, key),
          ),
        );
        expect(
          choices().map(node => node.props.accessibilityState.checked),
        ).toEqual([false, false, true]);
        expect(onChange).not.toHaveBeenCalled();
        expect(
          renderer.root.findAllByProps({ accessibilityRole: 'switch' }),
        ).toHaveLength(0);
        expect(
          renderer.root.findByProps({ accessibilityRole: 'header' }).props
            .children,
        ).toBe(translate(locale, 'settings.theme'));
        for (const [index, theme] of (
          ['light', 'dark', 'system'] as const
        ).entries()) {
          await ReactTestRenderer.act(() => choices()[index].props.onPress());
          expect(onChange).toHaveBeenLastCalledWith({ theme });
          expect(onBack).not.toHaveBeenCalled();
          await ReactTestRenderer.act(() => renderer.update(render(theme)));
          expect(
            choices().map(node => node.props.accessibilityState.checked),
          ).toEqual([0, 1, 2].map(value => value === index));
        }
        await ReactTestRenderer.act(() =>
          renderer.root
            .findByProps({ accessibilityLabel: translate(locale, 'app.back') })
            .props.onPress(),
        );
        expect(onBack).toHaveBeenCalledTimes(1);
      } finally {
        await ReactTestRenderer.act(() => renderer.unmount());
      }
    },
  );

  test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
    'finish settings page changes only its selected mode in %s',
    async locale => {
      const onChange = jest.fn();
      const onBack = jest.fn();
      const render = (autoFinishMode: 'manual' | 'automatic' | 'off') => (
        <LocalizationProvider locale={locale}>
          <ThemeProvider preference="light">
            <SettingsScreen
              page="finish"
              preferences={{ ...DEFAULT_PRODUCT_PREFERENCES, autoFinishMode }}
              onChange={onChange}
              onBack={onBack}
            />
          </ThemeProvider>
        </LocalizationProvider>
      );
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(render('manual'));
      });
      try {
        const choices = () =>
          renderer.root.findAll(
            node =>
              node.props.accessibilityRole === 'radio' &&
              typeof node.props.onPress === 'function',
          );
        expect(choices().map(node => node.props.accessibilityLabel)).toEqual(
          [
            'settings.autoFinishManual',
            'settings.autoFinishAutomatic',
            'settings.autoFinishOff',
          ].map(key =>
            translate(
              locale,
              key as
                | 'settings.autoFinishManual'
                | 'settings.autoFinishAutomatic'
                | 'settings.autoFinishOff',
            ),
          ),
        );
        expect(
          renderer.root.findAllByProps({
            testID: 'settings-advanced-features',
          }),
        ).toHaveLength(0);
        expect(
          renderer.root.findAllByProps({ accessibilityRole: 'switch' }),
        ).toHaveLength(0);
        expect(
          renderer.root.findByProps({ accessibilityRole: 'header' }).props
            .children,
        ).toBe(translate(locale, 'settings.autoFinishMode'));
        for (const [index, autoFinishMode] of (
          ['manual', 'automatic', 'off'] as const
        ).entries()) {
          await ReactTestRenderer.act(() => choices()[index].props.onPress());
          expect(onChange).toHaveBeenLastCalledWith({ autoFinishMode });
          expect(onBack).not.toHaveBeenCalled();
          await ReactTestRenderer.act(() =>
            renderer.update(render(autoFinishMode)),
          );
          expect(
            choices().map(node => node.props.accessibilityState.checked),
          ).toEqual([0, 1, 2].map(value => value === index));
        }
        await ReactTestRenderer.act(() =>
          renderer.root
            .findByProps({ accessibilityLabel: translate(locale, 'app.back') })
            .props.onPress(),
        );
        expect(onBack).toHaveBeenCalledTimes(1);
      } finally {
        await ReactTestRenderer.act(() => renderer.unmount());
      }
    },
  );

  test('settings choice pages show only their own options', async () => {
    const onChange = jest.fn();
    const onBack = jest.fn();
    const renderPage = (
      page: 'language' | 'input',
      inputMode: 'cell_first' | 'digit_first' = 'cell_first',
    ) => (
      <LocalizationProvider locale="zh-Hans">
        <ThemeProvider preference="light">
          <SettingsScreen
            onBack={onBack}
            onChange={onChange}
            page={page}
            preferences={{ ...DEFAULT_PRODUCT_PREFERENCES, inputMode }}
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
    expect(
      renderer.root.findAllByProps({ accessibilityRole: 'switch' }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: '数字优先' })
        .props.onPress(),
    );
    expect(onChange).toHaveBeenCalledWith({ inputMode: 'digit_first' });
    await ReactTestRenderer.act(() =>
      renderer.update(renderPage('input', 'digit_first')),
    );
    expect(
      renderer.root.findAllByProps({ accessibilityRole: 'switch' }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(() =>
      renderer.root.findByProps({ accessibilityLabel: '返回' }).props.onPress(),
    );
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  test.each([
    [
      'en',
      [
        ['System'],
        ['English'],
        ['日本語', 'Japanese'],
        ['Deutsch', 'German'],
        ['简体中文', 'Simplified Chinese'],
      ],
    ],
    [
      'ja',
      [
        ['システム'],
        ['English', '英語'],
        ['日本語'],
        ['Deutsch', 'ドイツ語'],
        ['简体中文', '簡体字中国語'],
      ],
    ],
    [
      'de',
      [
        ['System'],
        ['English', 'Englisch'],
        ['日本語', 'Japanisch'],
        ['Deutsch'],
        ['简体中文', 'Vereinfachtes Chinesisch'],
      ],
    ],
    [
      'zh-Hans',
      [
        ['跟随系统'],
        ['English', '英语'],
        ['日本語', '日语'],
        ['Deutsch', '德语'],
        ['简体中文'],
      ],
    ],
  ] as const)(
    'language options show native names and %s translations only when different',
    async (locale, labels) => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <LocalizationProvider locale={locale}>
            <ThemeProvider preference="light">
              <SettingsScreen
                onBack={() => undefined}
                onChange={() => undefined}
                page="language"
                preferences={DEFAULT_PRODUCT_PREFERENCES}
              />
            </ThemeProvider>
          </LocalizationProvider>,
        );
      });
      try {
        const choices = renderer.root.findAll(
          node =>
            node.props.accessibilityRole === 'radio' &&
            typeof node.props.onPress === 'function',
        );
        expect(choices).toHaveLength(labels.length);
        expect(
          choices.map(choice =>
            choice
              .findAllByType(Text)
              .map(text => text.props.children)
              .filter((label): label is string => typeof label === 'string'),
          ),
        ).toEqual(labels);
        expect(choices.map(choice => choice.props.accessibilityLabel)).toEqual(
          labels.map(label => label.join(', ')),
        );
      } finally {
        await ReactTestRenderer.act(() => renderer.unmount());
      }
    },
  );

  test('rewards page shows hint balance and directly requests the optional ad', async () => {
    const onRedeemHintAd = jest.fn().mockResolvedValue({ status: 'dismissed' });
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
            onRedeemHintAd={onRedeemHintAd}
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
      renderer.root.findAllByProps({
        accessibilityLabel: 'Quick Candidates, 3',
      }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'Smart hints, Watch ad · +5' })
        .props.onPress(),
    );
    expect(onRedeemHintAd).toHaveBeenCalledTimes(1);
    expect(onTopUpQuickPencil).not.toHaveBeenCalled();

    await ReactTestRenderer.act(() =>
      renderer.update(renderRewards(false, 99)),
    );
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'Smart hints, Watch ad · +5',
      }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(() => renderer.update(renderRewards(true)));
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'Quick Candidates, Watch ad · +5',
      }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ accessibilityLabel: 'Smart hints, 5' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'Quick Candidates, 3',
      }),
    ).toHaveLength(0);
    expect(JSON.stringify(renderer.toJSON())).toContain(
      'Unlimited Smart Hints and no ads',
    );
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
