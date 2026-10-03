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
import { ShareCardModal } from '../src/ui/screens/ShareCardModal';
import { ThemeProvider } from '../src/ui/theme';

jest.mock('../src/ui/use-reduced-motion', () => ({
  useReducedMotionPreference: () => ({ ready: true, reduceMotion: true }),
}));

jest.setTimeout(20_000);

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
  hintRewardProgress: 1,
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
    onCheckCompletionAd?(): Promise<{ status: 'available' }>;
    onWatchCompletionAd?(): Promise<{
      status: 'credited';
      grant: {
        credited: { smartHint: number; quickPencil: number };
        wallet: OfflineGameSnapshot['wallet'];
      };
    }>;
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
          onCheckCompletionAd={callbacks.onCheckCompletionAd}
          onWatchCompletionAd={callbacks.onWatchCompletionAd}
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
  test('orders completed actions and shares the final board, but not failed games', async () => {
    const snapshot = createCompletionPreviewScenarios('en').find(
      scenario => scenario.id === 'free-perfect-first',
    )!.snapshot;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult(snapshot, { onOpenReplay: jest.fn() });
    });
    expect(
      renderer.root
        .findAll(node =>
          [
            'result-next-puzzle',
            'result-share',
            'result-open-replay',
            'result-choose-level',
            'result-reward-progress',
          ].includes(node.props.testID),
        )
        .map(node => node.props.testID)
        .filter((id, index, ids) => index === 0 || id !== ids[index - 1]),
    ).toEqual([
      'result-reward-progress',
      'result-next-puzzle',
      'result-share',
      'result-open-replay',
      'result-choose-level',
    ]);
    expect(textIn(renderer.root.findByProps({ testID: 'result-share' }))).toBe(
      'Share Result',
    );
    expect(
      textIn(renderer.root.findByProps({ testID: 'result-score' })),
    ).toContain('1,100');
    expect(
      textIn(renderer.root.findByProps({ testID: 'result-score' })),
    ).toContain('No mistakes +50');
    await act(async () =>
      renderer.root.findByProps({ testID: 'result-share' }).props.onPress(),
    );
    expect(renderer.root.findByType(ShareCardModal).props.facts).toMatchObject({
      boardSnapshot: {
        values: snapshot.session!.state.values,
        givens: snapshot.session!.state.givens,
      },
      elapsedMs: snapshot.session!.state.timer.elapsedMs,
    });
    await act(async () => renderer.unmount());

    await act(async () => {
      renderer = renderResult({
        ...snapshot,
        session: {
          ...snapshot.session!,
          state: { ...snapshot.session!.state, status: 'failed' },
        },
      });
    });
    expect(
      renderer.root.findAllByProps({ testID: 'result-share' }),
    ).toHaveLength(0);
    for (const testID of [
      'result-achievement-card',
      'result-honors',
      'result-encouragement',
    ]) {
      expect(renderer.root.findAllByProps({ testID })).toHaveLength(0);
    }
    await act(async () => renderer.unmount());
  });

  test.each<CompletionKind>(['perfect', 'independent', 'hint_assisted'])(
    'keeps the %s completion state renderable with common result facts',
    async completionKind => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = renderResult(resultSnapshot(completionKind));
      });

      const text = textOf(renderer);
      expect(text).toContain('Hard');
      expect(text).toContain('2:05');
      expect(text).toContain('Mistakes');
      expect(text).toContain('Hints');
      expect(text).not.toContain('Quick Candidates');
      expect(text).toContain('Play Again');
      expect(text).not.toContain('safely stored');
      expect(text).toContain(
        completionKind === 'perfect' ? 'Beautifully solved!' : 'First clear!',
      );
      expect(
        renderer.root.findByProps({ testID: 'result-victory-medal' }),
      ).toBeTruthy();
      expect(
        renderer.root.findAllByProps({ testID: 'result-encouragement' }),
      ).toHaveLength(0);
      expect(
        renderer.root.findByProps({ testID: 'result-honors' }),
      ).toBeTruthy();

      expect(
        renderer.root.findByProps({ testID: `result-honor-${completionKind}` }),
      ).toBeTruthy();
      expect(
        renderer.root.findAllByProps({ testID: 'result-honor-new_best' }),
      ).toHaveLength(0);
      if (completionKind === 'hint_assisted') {
        expect(
          renderer.root.findAllByProps({ testID: 'result-honor-perfect' }),
        ).toHaveLength(0);
        expect(
          renderer.root.findAllByProps({ testID: 'result-honor-independent' }),
        ).toHaveLength(0);
      }

      await act(async () => renderer.unmount());
    },
  );

  test('shows first-clear progress and leaves replay progress unchanged', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult(resultSnapshot('independent'));
    });
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Progress 1/3' }),
    ).toBeTruthy();
    await act(async () => renderer.unmount());

    await act(async () => {
      renderer = renderResult(
        resultSnapshot('independent', {
          isFirstCompletion: false,
          premiumAtCompletion: false,
          quickPencil: 0,
          smartHint: 0,
        }),
      );
    });
    expect(
      textIn(renderer.root.findByProps({ testID: 'result-reward-progress' })),
    ).toContain('Already completed');
    await act(async () => renderer.unmount());
  });

  test('shows an automatically credited Smart Hint at the third first clear', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult({
        ...resultSnapshot('perfect', {
          isFirstCompletion: true,
          premiumAtCompletion: false,
          quickPencil: 0,
          smartHint: 1,
        }),
        hintRewardProgress: 0,
      });
    });
    expect(
      textIn(renderer.root.findByProps({ testID: 'result-reward-progress' })),
    ).toContain('Smart Hint +1 added automatically.');
    expect(
      renderer.root.findAllByProps({ testID: 'completion-reward-claim' }),
    ).toHaveLength(0);
    await act(async () => renderer.unmount());
  });

  test('hides free reward progress for Premium', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult(
        resultSnapshot('perfect', {
          isFirstCompletion: true,
          premiumAtCompletion: true,
          quickPencil: 0,
          smartHint: 0,
        }),
      );
    });
    expect(
      renderer.root.findAllByProps({ testID: 'result-reward-progress' }),
    ).toHaveLength(0);
    await act(async () => renderer.unmount());
  });

  test('offers one explicit 1+1 completion ad and hides it after credit', async () => {
    const onWatchCompletionAd = jest.fn(async () => ({
      status: 'credited' as const,
      grant: {
        credited: { smartHint: 1, quickPencil: 1 },
        wallet: baseSnapshot.wallet,
      },
    }));
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult(resultSnapshot('perfect'), {
        onCheckCompletionAd: async () => ({ status: 'available' }),
        onWatchCompletionAd,
      });
    });
    const button = renderer.root.findByProps({
      testID: 'result-completion-ad',
    });
    expect(textIn(button)).toContain('Smart Hint +1 and Quick Candidates +1');
    await act(async () => button.props.onPress());
    expect(onWatchCompletionAd).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findAllByProps({ testID: 'result-completion-ad' }),
    ).toHaveLength(0);
    expect(textOf(renderer)).toContain('Extra reward added.');
    await act(async () => renderer.unmount());
  });

  test('keeps the record in the title and a meaningful honor in the compact layout', async () => {
    const snapshot = createCompletionPreviewScenarios('en').find(
      scenario => scenario.id === 'new-best',
    )!.snapshot;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult(snapshot);
    });

    const text = textOf(renderer);
    expect(text).toContain('A new record!');
    expect(
      textIn(renderer.root.findByProps({ testID: 'result-honor-perfect' })),
    ).toContain('Perfect solve');
    expect(renderer.root.findByProps({ testID: 'result-honors' })).toBeTruthy();
    expect(
      renderer.root.findAllByProps({ testID: 'result-quote' }),
    ).toHaveLength(0);

    await act(async () => renderer.unmount());
  });

  test('localizes the compact achievement title without extra paragraphs', async () => {
    const snapshot = createCompletionPreviewScenarios('de').find(
      scenario => scenario.id === 'new-best',
    )!.snapshot;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult(snapshot, {}, 'de');
    });

    const title = renderer.root.findByProps({ testID: 'result-title' });
    expect(textIn(title)).toBe('Neuer Rekord!');
    expect(title.props.numberOfLines).toBe(2);
    expect(title.props.allowFontScaling).not.toBe(false);
    expect(
      renderer.root.findAllByProps({ testID: 'result-encouragement' }),
    ).toHaveLength(0);

    await act(async () => renderer.unmount());
  });

  test('keeps play again, difficulty choice, and replay as the completed actions', async () => {
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
    await press('Play Again');
    await press('Change Difficulty');
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'level-picker-option-4' })
        .props.onPress(),
    );
    await press('View Replay');

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onStartLevel).toHaveBeenCalledWith(4);
    expect(onOpenReplay).toHaveBeenCalledTimes(1);
    expect(onReturnHome).not.toHaveBeenCalled();
    expect(
      renderer.root.findAllByProps({ testID: 'result-return-home' }),
    ).toHaveLength(0);

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
      .find(node => textIn(node).includes('Choose a new difficulty'));
    await act(async () => button!.props.onPress());

    expect(onReturnHome).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findAllByProps({ testID: 'level-picker-modal' }),
    ).toHaveLength(0);
    await act(async () => renderer.unmount());
  });
});
