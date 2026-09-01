import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
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
    expect(detailButtons).toHaveLength(39);
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

  test('shows all persisted statistics and help topics', async () => {
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
    expect(statisticsOutput).toContain('2 小时 5 分钟');
    expect(statisticsOutput).toContain('完成率');
    expect(statisticsOutput).toContain('67%');
    expect(statisticsOutput).toContain('已用快速铅笔');
    const helpOutput = JSON.stringify(help.toJSON());
    expect(helpOutput).toContain('候选笔记');
    expect(helpOutput).toContain('暂停与继续');
    expect(helpOutput).toContain('智能提示');
    expect(helpOutput).toContain('完成题目');
  });
});
