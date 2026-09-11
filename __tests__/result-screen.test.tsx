import React from 'react';
import ReactTestRenderer, { act, ReactTestInstance } from 'react-test-renderer';
import { Text } from 'react-native';
import { OfflineGameSnapshot } from '../src/application';
import { CompletionKind } from '../src/domain/game/contracts';
import { CompletionReward } from '../src/domain/game/progression';
import { DifficultyLevel } from '../src/domain/hints/techniques';
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
    onNewGame?(): void;
    onNext?(): void;
    onOpenReplay?(): void;
    onStartLevel?(level: DifficultyLevel): void;
  } = {},
) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale="en">
      <ThemeProvider preference="light">
        <ResultScreen
          onNewGame={callbacks.onNewGame ?? jest.fn()}
          onNext={callbacks.onNext ?? jest.fn()}
          onOpenReplay={callbacks.onOpenReplay}
          onRetry={jest.fn()}
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
      expect(text).toContain('Next Level 3 puzzle');
      expect(text).not.toContain('safely stored');
      expect(text).toContain(
        completionKind === 'perfect' ? 'Beautifully solved!' : 'First clear!',
      );

      await act(async () => renderer.unmount());
    },
  );

  test.each([
    ['free first completion', freeFirstCompletion, false],
    [
      'Premium replay',
      {
        isFirstCompletion: false,
        premiumAtCompletion: false,
        quickPencil: 0,
        smartHint: 0,
      },
      false,
    ],
    [
      'Premium first completion',
      {
        isFirstCompletion: true,
        premiumAtCompletion: true,
        quickPencil: 1,
        smartHint: 3,
      },
      true,
    ],
    [
      'capped Premium first completion',
      {
        isFirstCompletion: true,
        premiumAtCompletion: true,
        quickPencil: 0,
        smartHint: 0,
      },
      true,
    ],
  ] as const)(
    'represents the current %s reward state',
    async (_name, reward, rewardCardVisible) => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = renderResult(resultSnapshot('independent', reward));
      });

      const text = textOf(renderer);
      expect(text.includes('FIRST COMPLETION REWARD')).toBe(rewardCardVisible);
      if (rewardCardVisible) {
        expect(text).toContain(`Quick pencil +${reward.quickPencil}`);
        expect(text).toContain(`Smart hint +${reward.smartHint}`);
      }

      await act(async () => renderer.unmount());
    },
  );

  test('keeps same-level continuation, level choice, and replay as separate actions', async () => {
    const onNext = jest.fn();
    const onNewGame = jest.fn();
    const onOpenReplay = jest.fn();
    const onStartLevel = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult(resultSnapshot('perfect'), {
        onNext,
        onNewGame,
        onOpenReplay,
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
    await press('Next Level 3 puzzle');
    await press('Choose a new level');
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'level-picker-option-4' })
        .props.onPress(),
    );
    await press('Session replay');

    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onNewGame).not.toHaveBeenCalled();
    expect(onStartLevel).toHaveBeenCalledWith(4);
    expect(onOpenReplay).toHaveBeenCalledTimes(1);

    await act(async () => renderer.unmount());
  });

  test('keeps the failed-page level action unchanged', async () => {
    const onNewGame = jest.fn();
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
      renderer = renderResult(failed, { onNewGame });
    });
    const button = renderer.root
      .findAll(node => typeof node.props.onPress === 'function')
      .find(node => textIn(node).includes('Choose a new level'));
    await act(async () => button!.props.onPress());

    expect(onNewGame).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findAllByProps({ testID: 'level-picker-modal' }),
    ).toHaveLength(0);
    await act(async () => renderer.unmount());
  });
});
