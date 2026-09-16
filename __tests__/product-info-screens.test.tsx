import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';
import { OfflineGameSnapshot, ProductLocale } from '../src/application';
import { TECHNIQUES } from '../src/domain/hints/techniques';
import {
  HINT_PRESENTATION_COPIES,
  LocalizationProvider,
  translate,
} from '../src/localization';
import {
  HelpScreen,
  StatisticsScreen,
  TechniqueCatalogScreen,
  TechniqueDetailScreen,
} from '../src/ui/screens/ProductInfoScreens';
import { ThemeProvider } from '../src/ui/theme';

const LOCALES: readonly ProductLocale[] = ['en', 'ja', 'de', 'zh-Hans'];

const snapshot: OfflineGameSnapshot = {
  screen: 'home',
  session: null,
  puzzle: null,
  resumable: false,
  busy: false,
  message: null,
  replacementRequest: null,
  quickDraftConfirmation: false,
  wallet: {
    quick_pencil: {
      resource: 'quick_pencil',
      balance: 3,
      earnedTotal: 4,
      spentTotal: 1,
    },
    smart_hint: {
      resource: 'smart_hint',
      balance: 5,
      earnedTotal: 7,
      spentTotal: 2,
    },
  },
  statistics: {
    attempts: 12,
    completions: 8,
    failures: 1,
    abandonments: 3,
    totalElapsedMs: 7_500_000,
    totalHintsUsed: 9,
    totalQuickPencilsUsed: 6,
  },
  completedByLevel: { 1: 3, 2: 2, 3: 1, 4: 1, 5: 1 },
  reward: null,
  completionResult: null,
};

function render(locale: ProductLocale, child: React.ReactNode) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale={locale}>
      <ThemeProvider preference="light">{child}</ThemeProvider>
    </LocalizationProvider>,
  );
}

describe('phase 6 product information screens', () => {
  test.each(LOCALES)('lists every technique in %s', async locale => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = render(
        locale,
        <TechniqueCatalogScreen
          onBack={jest.fn()}
          onOpenTechnique={jest.fn()}
        />,
      );
    });
    const detailButtons = renderer.root.findAll(
      node =>
        node.props.accessibilityHint ===
          translate(locale, 'techniques.openDetail') &&
        typeof node.props.style === 'function',
    );
    expect(detailButtons).toHaveLength(40);
    const output = JSON.stringify(renderer.toJSON());
    for (const technique of TECHNIQUES) {
      expect(output).toContain(
        HINT_PRESENTATION_COPIES[locale].techniques[technique.code].name,
      );
    }
  });

  test.each(LOCALES)(
    'renders complete technique details in %s',
    async locale => {
      for (const technique of TECHNIQUES) {
        let renderer!: ReactTestRenderer.ReactTestRenderer;
        await ReactTestRenderer.act(() => {
          renderer = render(
            locale,
            <TechniqueDetailScreen code={technique.code} onBack={jest.fn()} />,
          );
        });
        const output = JSON.stringify(renderer.toJSON());
        expect(output).toContain(
          HINT_PRESENTATION_COPIES[locale].techniques[technique.code].name,
        );
        expect(output).toContain(technique.code);
        expect(output).not.toMatch(/\{[A-Za-z]+\}/);
      }
    },
  );

  test('shows persisted statistics and the interactive tutorial entry', async () => {
    let statistics!: ReactTestRenderer.ReactTestRenderer;
    let help!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      statistics = render(
        'zh-Hans',
        <StatisticsScreen onBack={jest.fn()} snapshot={snapshot} />,
      );
      help = render('zh-Hans', <HelpScreen onBack={jest.fn()} />);
    });
    const statisticsOutput = JSON.stringify(statistics.toJSON());
    expect(statisticsOutput).toContain('2h 5m');
    expect(statisticsOutput).toContain('完成率');
    expect(statisticsOutput).toContain('67%');
    expect(statisticsOutput).toContain('快速铅笔');
    expect(statisticsOutput).not.toContain('你的游戏进度仅保存在这台设备上。');
    const statisticNodes = statistics.root.findAll(
      node =>
        node.type === View &&
        String(node.props.testID ?? '').startsWith('statistics-'),
    );
    expect(
      statisticNodes.filter(node =>
        node.props.testID.startsWith('statistics-hero-'),
      ),
    ).toHaveLength(3);
    expect(
      statisticNodes.filter(node =>
        node.props.testID.startsWith('statistics-activity-'),
      ),
    ).toHaveLength(5);
    expect(
      statisticNodes.filter(node =>
        node.props.testID.startsWith('statistics-difficulty-'),
      ),
    ).toHaveLength(5);
    expect(statisticNodes.map(node => node.props.accessibilityLabel)).toEqual(
      expect.arrayContaining([
        '完成, 8',
        '完成率, 67%',
        '游戏时间, 2h 5m',
        '尝试, 12',
        '放弃, 3',
        '错误超限, 1',
        '智能提示, 9',
        '快速铅笔, 6',
        '简单, 3',
        '极限, 1',
      ]),
    );
    for (const node of statisticNodes) {
      const style = StyleSheet.flatten(node.props.style);
      expect(style.backgroundColor).toBeUndefined();
      expect(style.borderRadius).toBeUndefined();
    }
    const title = statistics.root
      .findAllByType(Text)
      .find(
        node =>
          node.props.accessibilityRole === 'header' &&
          node.props.children === '统计',
      )!;
    expect(title.props.style.textAlign).toBe('center');
    expect(
      StyleSheet.flatten(title.parent!.props.style).borderBottomWidth,
    ).toBe(0);
    const helpOutput = JSON.stringify(help.toJSON());
    expect(helpOutput).toContain('亲手完成棋盘，学会基本玩法');
    expect(helpOutput).toContain('开始互动教学');
    expect(helpOutput).toContain('填写数字和管理候选笔记');
    expect(helpOutput).toContain('教学操作不会影响游戏存档');
  });
});
