import React from 'react';
import ReactTestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { Text } from 'react-native';
import { OfflineGameSnapshot, ProductLocale } from '../src/application';
import { CompletionKind } from '../src/domain/game/contracts';
import { CompletionReward } from '../src/domain/game/progression';
import { DifficultyLevel } from '../src/domain/hints/techniques';
import { createCompletionPreviewScenarios } from '../src/debug/CompletionResultPreview';
import { LocalizationProvider } from '../src/localization';
import { ResultScreen } from '../src/ui/screens/ResultScreen';
import { ThemeProvider } from '../src/ui/theme';

const baseSnapshot = {
  screen: 'result',
  session: null,
  puzzle: null,
  resumable: false,
  busy: false,
  message: null,
  replacementRequest: null,
  quickDraftConfirmation: false,
  wallet: {
    quick_pencil: { balance: 3, earnedTotal: 3, spentTotal: 0 },
    smart_hint: { balance: 5, earnedTotal: 5, spentTotal: 0 },
  },
  statistics: {
    attempts: 1,
    completions: 1,
    failures: 0,
    abandonments: 0,
    totalElapsedMs: 125_000,
    totalHintsUsed: 0,
    totalQuickPencilsUsed: 0,
  },
  completedByLevel: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 0 },
  reward: null,
  completionResult: null,
} as OfflineGameSnapshot;

const freeFirstCompletion: CompletionReward = {
  isFirstCompletion: true,
  premiumAtCompletion: false,
  quickPencil: 0,
  smartHint: 0,
};

function resultSnapshot(
  completionKind: CompletionKind,
  reward: CompletionReward | null = freeFirstCompletion,
): OfflineGameSnapshot {
  return {
    ...baseSnapshot,
    reward,
    session: {
      state: {
        sessionId: `result-${completionKind}`,
        status: 'completed',
        completionKind,
        difficultyLevel: 3,
        errorCount: completionKind === 'perfect' ? 0 : 1,
        hintUseCount: completionKind === 'hint_assisted' ? 1 : 0,
        quickPencilUseCount: 2,
        timer: { elapsedMs: 125_000 },
      },
    },
  } as OfflineGameSnapshot;
}

function renderResult(
  snapshot: OfflineGameSnapshot,
  callbacks: {
    onNext?(): void;
    onOpenReplay?(): void;
    onReturnHome?(): void;
    onStartLevel?(level: DifficultyLevel): void;
  } = {},
  locale: ProductLocale = 'en',
) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale={locale}>
      <ThemeProvider preference="light">
        <ResultScreen
          onNext={callbacks.onNext ?? jest.fn()}
          onOpenReplay={callbacks.onOpenReplay}
          onRetry={jest.fn()}
          onReturnHome={callbacks.onReturnHome ?? jest.fn()}
          onStartLevel={callbacks.onStartLevel ?? jest.fn()}
          snapshot={snapshot}
        />
      </ThemeProvider>
    </LocalizationProvider>,
  );
}

function flattenText(value: unknown): string {
  return Array.isArray(value)
    ? value.map(flattenText).join('')
    : typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function textIn(node: ReactTestInstance): string {
  return node
    .findAllByType(Text)
    .map(text => flattenText(text.props.children))
    .join('\n');
}

function textOf(renderer: ReactTestRenderer.ReactTestRenderer): string {
  return textIn(renderer.root);
}

describe('ResultScreen completion baseline', () => {
  test.each<CompletionKind>(['perfect', 'independent', 'hint_assisted'])(
    'keeps the %s completion state renderable with common result facts',
    async completionKind => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = renderResult(resultSnapshot(completionKind));
      });

      const text = textOf(renderer);
      expect(text).toContain('LEVEL 3');
      expect(text).toContain('2:05');
      expect(text).toContain('Mistakes');
      expect(text).toContain('Hints');
      expect(text).toContain('Quick pencils');
      expect(text).toContain('Continue with Level 3');
      expect(text).not.toContain('safely stored');
      expect(text).toContain(
        completionKind === 'perfect' ? 'Beautifully solved!' : 'First clear!',
      );
      expect(
        renderer.root.findByProps({ testID: 'result-victory-medal' }),
      ).toBeTruthy();
      expect(
        renderer.root.findByProps({ testID: 'result-honors' }),
      ).toBeTruthy();

      await act(async () => renderer.unmount());
    },
  );

  test.each(['free-perfect-first', 'replay'] as const)(
    'does not show an inventory refill for %s',
    async scenarioId => {
      const snapshot = createCompletionPreviewScenarios('en').find(
        scenario => scenario.id === scenarioId,
      )!.snapshot;
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = renderResult(snapshot);
      });

      expect(
        renderer.root.findAllByProps({ testID: 'result-supply-card' }),
      ).toHaveLength(0);

      await act(async () => renderer.unmount());
    },
  );

  test.each([
    [
      'premium-normal',
      [
        'THIS PUZZLE’S REFILL',
        'Quick pencil',
        '+1',
        'Balance 9',
        '+3',
        'Balance 15',
      ],
      false,
    ],
    [
      'premium-partial-cap',
      ['THIS PUZZLE’S REFILL', 'Full', '+1', 'Balance 99', 'inventory cap'],
      false,
    ],
    ['premium-full-cap', ['Inventory is full', 'did not increase'], true],
  ] as const)(
    'shows the settled %s refill without promising unavailable credits',
    async (scenarioId, expectedCopy, fullyCapped) => {
      const snapshot = createCompletionPreviewScenarios('en').find(
        scenario => scenario.id === scenarioId,
      )!.snapshot;
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = renderResult(snapshot);
      });

      const supply = renderer.root.findByProps({
        testID: 'result-supply-card',
      });
      const text = textIn(supply);
      for (const expected of expectedCopy) {
        expect(text).toContain(expected);
      }
      expect(text).not.toContain('+0');
      const fullQuickPencilLabels = supply.findAll(
        node =>
          node.props.accessibilityLabel === 'Quick pencil, Full, Balance 99',
      );
      if (scenarioId === 'premium-partial-cap') {
        expect(fullQuickPencilLabels.length).toBeGreaterThan(0);
      } else {
        expect(fullQuickPencilLabels).toHaveLength(0);
      }
      expect(text.includes('inventory cap')).toBe(
        !fullyCapped && scenarioId === 'premium-partial-cap',
      );

      await act(async () => renderer.unmount());
    },
  );

  test('renders record and perfect honors with the low-frequency quote', async () => {
    const snapshot = createCompletionPreviewScenarios('en').find(
      scenario => scenario.id === 'new-best',
    )!.snapshot;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult(snapshot);
    });

    const text = textOf(renderer);
    expect(text).toContain('A new record!');
    expect(text).toContain('New record');
    expect(text).toContain('Perfect solve');
    expect(renderer.root.findByProps({ testID: 'result-quote' })).toBeTruthy();

    await act(async () => renderer.unmount());
  });

  test('lets long localized celebration copy wrap and scale', async () => {
    const snapshot = createCompletionPreviewScenarios('de').find(
      scenario => scenario.id === 'new-best',
    )!.snapshot;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult(snapshot, {}, 'de');
    });

    const title = renderer.root.findByProps({ testID: 'result-title' });
    const encouragement = renderer.root.findByProps({
      testID: 'result-encouragement',
    });
    expect(textIn(title)).toBe('Neuer Rekord!');
    expect(textIn(encouragement).length).toBeGreaterThan(30);
    for (const text of [title, encouragement]) {
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.allowFontScaling).not.toBe(false);
    }

    await act(async () => renderer.unmount());
  });

  test('keeps same-level continuation, level choice, and replay as separate actions', async () => {
    const onNext = jest.fn();
    const onOpenReplay = jest.fn();
    const onReturnHome = jest.fn();
    const onStartLevel = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult(resultSnapshot('perfect'), {
        onNext,
        onOpenReplay,
        onReturnHome,
        onStartLevel,
      });
    });

    const press = async (label: string) => {
      const button = renderer.root
        .findAll(node => typeof node.props.onPress === 'function')
        .find(node => textIn(node).includes(label));
      expect(button).toBeDefined();
      await act(async () => button!.props.onPress());
    };
    await press('Continue with Level 3');
    await press('Change level');
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'level-picker-option-4' })
        .props.onPress(),
    );
    await press('Review this puzzle');
    await press('Return home');

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onStartLevel).toHaveBeenCalledWith(4);
    expect(onOpenReplay).toHaveBeenCalledTimes(1);
    expect(onReturnHome).toHaveBeenCalledTimes(1);

    await act(async () => renderer.unmount());
  });

  test('keeps the failed-page level action unchanged', async () => {
    const onReturnHome = jest.fn();
    const failed = {
      ...resultSnapshot('independent'),
      session: {
        state: {
          ...resultSnapshot('independent').session!.state,
          status: 'failed',
          completionKind: null,
        },
      },
    } as OfflineGameSnapshot;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult(failed, { onReturnHome });
    });
    const button = renderer.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(node => textIn(node).includes('Choose a new level'));
    await act(async () => button!.props.onPress());

    expect(onReturnHome).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findAllByProps({ testID: 'level-picker-modal' }),
    ).toHaveLength(0);
    await act(async () => renderer.unmount());
  });
});
