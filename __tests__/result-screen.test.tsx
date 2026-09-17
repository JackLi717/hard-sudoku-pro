import React from 'react';
import ReactTestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { Text } from 'react-native';
import { OfflineGameSnapshot, ProductLocale } from '../src/application';
import { CompletionKind } from '../src/domain/game/contracts';
import { CompletionReward } from '../src/domain/game/progression';
import { DifficultyLevel } from '../src/domain/hints/techniques';
import { createCompletionPreviewScenarios } from '../src/debug/CompletionResultPreview';
import { LocalizationProvider } from '../src/localization';
import { ScreenStateProvider } from '../src/ui/screen-state';
import { ResultScreen } from '../src/ui/screens/ResultScreen';
import { ShareCardModal } from '../src/ui/screens/ShareCardModal';
import { ThemeProvider } from '../src/ui/theme';

jest.mock('../src/ui/use-reduced-motion', () => ({
  useReducedMotionPreference: () => ({ ready: true, reduceMotion: true }),
}));

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
          ].includes(node.props.testID),
        )
        .map(node => node.props.testID)
        .filter((id, index, ids) => index === 0 || id !== ids[index - 1]),
    ).toEqual([
      'result-next-puzzle',
      'result-share',
      'result-open-replay',
      'result-choose-level',
    ]);
    expect(textIn(renderer.root.findByProps({ testID: 'result-share' }))).toBe(
      'Share Result',
    );
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
        renderer.root.findAllByProps({ testID: 'result-honors' }),
      ).toHaveLength(0);

      await act(async () => renderer.unmount());
    },
  );

  test.each(['free-perfect-first', 'replay'] as const)(
    'does not show a reward claim for %s',
    async scenarioId => {
      const snapshot = createCompletionPreviewScenarios('en').find(
        scenario => scenario.id === scenarioId,
      )!.snapshot;
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = renderResult(snapshot);
      });

      expect(
        renderer.root.findAllByProps({ testID: 'completion-reward-claim' }),
      ).toHaveLength(0);

      await act(async () => renderer.unmount());
    },
  );

  test.each([
    ['premium-normal', 3],
    ['premium-partial-cap', 5],
    ['premium-full-cap', 5],
  ] as const)(
    'shows the earned %s reward without inventory concepts',
    async (scenarioId, smartHintReward) => {
      const snapshot = createCompletionPreviewScenarios('en').find(
        scenario => scenario.id === scenarioId,
      )!.snapshot;
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = renderResult(snapshot);
      });

      const rewardClaim = renderer.root.findByProps({
        testID: 'completion-reward-claim',
      });
      const text = textIn(rewardClaim);
      expect(text).toContain('THIS PUZZLE’S REFILL');
      expect(text).toContain('+1');
      expect(text).toContain(`+${smartHintReward}`);
      expect(text).toContain('Collect');
      expect(text).not.toMatch(/Balance|Full|inventory/);
      expect(
        rewardClaim.findByProps({
          accessibilityLabel: 'Quick Candidates, +1',
        }),
      ).toBeTruthy();
      expect(
        rewardClaim.findByProps({
          accessibilityLabel: `Smart hint, +${smartHintReward}`,
        }),
      ).toBeTruthy();

      await act(async () =>
        renderer.root
          .findByProps({ testID: 'completion-reward-collect' })
          .props.onPress(),
      );
      expect(
        renderer.root.findAllByProps({ testID: 'completion-reward-claim' }),
      ).toHaveLength(0);

      await act(async () => renderer.unmount());
    },
  );

  test('keeps a collected reward dismissed when returning to the same result', async () => {
    const snapshot = createCompletionPreviewScenarios('en').find(
      scenario => scenario.id === 'premium-normal',
    )!.snapshot;
    const scene = (visible: boolean) => (
      <LocalizationProvider locale="en">
        <ThemeProvider preference="light">
          <ScreenStateProvider>
            {visible ? (
              <ResultScreen
                onNext={jest.fn()}
                onRetry={jest.fn()}
                onReturnHome={jest.fn()}
                onStartLevel={jest.fn()}
                snapshot={snapshot}
              />
            ) : null}
          </ScreenStateProvider>
        </ThemeProvider>
      </LocalizationProvider>
    );
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = ReactTestRenderer.create(scene(true));
    });
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'completion-reward-collect' })
        .props.onPress(),
    );
    await act(async () => renderer.update(scene(false)));
    await act(async () => renderer.update(scene(true)));

    expect(
      renderer.root.findAllByProps({ testID: 'completion-reward-claim' }),
    ).toHaveLength(0);

    await act(async () => renderer.unmount());
  });

  test('keeps the record in the title without persistent honors or a quote', async () => {
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
      renderer.root.findAllByProps({ testID: 'result-honors' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'result-quote' }),
    ).toHaveLength(0);

    await act(async () => renderer.unmount());
  });

  test('keeps the localized result focused on its short title', async () => {
    const snapshot = createCompletionPreviewScenarios('de').find(
      scenario => scenario.id === 'new-best',
    )!.snapshot;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult(snapshot, {}, 'de');
    });

    const title = renderer.root.findByProps({ testID: 'result-title' });
    expect(textIn(title)).toBe('Neuer Rekord!');
    expect(title.props.numberOfLines).toBeUndefined();
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
