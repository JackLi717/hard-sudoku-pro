import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AccessibilityInfo, Text } from 'react-native';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  OfflineGameSnapshot,
} from '../src/application';
import { LocalizationProvider } from '../src/localization';
import { HomeScreen } from '../src/ui/screens/HomeScreen';
import { SettingsScreen } from '../src/ui/screens/SettingsScreen';
import { ResultScreen } from '../src/ui/screens/ResultScreen';
import { ThemeProvider } from '../src/ui/theme';
import { useReducedMotion } from '../src/ui/use-reduced-motion';
import { createCompletionPreviewScenarios } from '../src/debug/CompletionResultPreview';

const homeSnapshot = {
  screen: 'home',
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
    attempts: 12,
    completions: 8,
    failures: 1,
    abandonments: 3,
    totalElapsedMs: 0,
    totalHintsUsed: 1,
    totalQuickPencilsUsed: 2,
  },
  completedByLevel: { 1: 3, 2: 2, 3: 1, 4: 1, 5: 1 },
  reward: null,
  completionResult: null,
} as OfflineGameSnapshot;

function renderProductScreen(child: React.ReactNode) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale="en">
      <ThemeProvider preference="light">{child}</ThemeProvider>
    </LocalizationProvider>,
  );
}

function ReducedMotionProbe({
  animationsEnabled,
}: {
  animationsEnabled: boolean;
}) {
  const reduced = useReducedMotion(animationsEnabled);
  return (
    <Text testID="reduced-motion-state">
      {reduced ? 'reduced' : 'animated'}
    </Text>
  );
}

describe('phase 6 accessibility behavior', () => {
  test('keeps Home focused on new game and opens level selection on demand', async () => {
    const onStart = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = renderProductScreen(
        <HomeScreen
          onOpenSettings={jest.fn()}
          onResume={jest.fn()}
          onStart={onStart}
          snapshot={homeSnapshot}
        />,
      );
    });

    expect(
      renderer.root.findAllByProps({ accessibilityLabel: 'Premium' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ accessibilityLabel: 'Solved, 8' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ accessibilityLabel: 'Sudoku academy' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ accessibilityLabel: 'How to play' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ children: 'Platon Sudoku' }),
    ).toBeTruthy();

    await ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'New Game' })
        .props.onPress();
    });
    const level = renderer.root.findByProps({
      accessibilityLabel: 'Start Level 3, 1 completed',
    });
    expect(level.props.accessibilityHint).toBe(
      'Intermediate patterns and interactions',
    );

    await ReactTestRenderer.act(() => level.props.onPress());
    expect(onStart).toHaveBeenCalledWith(3);
  });

  test('announces resumable level and elapsed time without progress', async () => {
    const resumableSnapshot = {
      ...homeSnapshot,
      resumable: true,
      session: {
        state: {
          difficultyLevel: 4,
          givens: Array(81).fill(null),
          values: [...Array(9).fill(1), ...Array(72).fill(null)],
          timer: { elapsedMs: 125_000 },
        },
      },
    } as unknown as OfflineGameSnapshot;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = renderProductScreen(
        <HomeScreen
          onOpenSettings={jest.fn()}
          onResume={jest.fn()}
          onStart={jest.fn()}
          snapshot={resumableSnapshot}
        />,
      );
    });

    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Continue, Level 4, 02:05',
      }),
    ).toBeTruthy();
    expect(
      renderer.root.findAllByProps({ children: 'Progress 11%' }),
    ).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'home-settings' })).toBeTruthy();
  });

  test('keeps replay and statistics out of Home shortcuts', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = renderProductScreen(
        <HomeScreen
          onOpenSettings={jest.fn()}
          onResume={jest.fn()}
          onStart={jest.fn()}
          snapshot={homeSnapshot}
        />,
      );
    });

    expect(
      renderer.root.findAllByProps({ testID: 'home-replay-history' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ accessibilityLabel: 'Statistics' }),
    ).toHaveLength(0);
  });

  test('keeps Premium, restore purchase, rewards and how-to-play in Settings', async () => {
    const onOpenPremium = jest.fn();
    const onOpenHelp = jest.fn();
    const onRestorePurchase = jest.fn().mockResolvedValue({
      status: 'nothing_to_restore',
    });
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = renderProductScreen(
        <SettingsScreen
          onBack={jest.fn()}
          onChange={jest.fn()}
          onOpenHelp={onOpenHelp}
          onOpenPremium={onOpenPremium}
          onRestorePurchase={onRestorePurchase}
          preferences={DEFAULT_PRODUCT_PREFERENCES}
          wallet={homeSnapshot.wallet}
        />,
      );
    });

    const premium = renderer.root.findByProps({
      accessibilityLabel: 'Premium',
    });
    expect(premium.props.accessibilityState).toBeUndefined();

    await ReactTestRenderer.act(() => premium.props.onPress());
    expect(onOpenPremium).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(async () =>
      renderer.root
        .findByProps({ accessibilityLabel: 'Restore purchase' })
        .props.onPress(),
    );
    expect(onRestorePurchase).toHaveBeenCalledTimes(1);
    expect(
      renderer.root.findByProps({
        children: 'No Premium purchase was found for this store account.',
      }),
    ).toBeTruthy();
    expect(
      renderer.root.findByProps({ accessibilityLabel: 'Rewards' }),
    ).toBeTruthy();
    await ReactTestRenderer.act(() =>
      renderer.root
        .findByProps({ accessibilityLabel: 'How to play' })
        .props.onPress(),
    );
    expect(onOpenHelp).toHaveBeenCalledTimes(1);
  });

  test('keeps development tools behind a settings long press', async () => {
    const openHintLab = jest.fn();
    const topUpDebugCredits = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = renderProductScreen(
        <HomeScreen
          onOpenHintLab={openHintLab}
          onOpenSettings={jest.fn()}
          onResume={jest.fn()}
          onStart={jest.fn()}
          onTopUpDebugCredits={topUpDebugCredits}
          snapshot={homeSnapshot}
        />,
      );
    });

    await ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({ testID: 'home-settings' })
        .props.onLongPress();
    });
    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Hint Lab · 39 Techniques',
      }),
    ).toBeTruthy();
    const debugCredits = renderer.root.findByProps({
      accessibilityLabel: 'Set debug credits to 999',
    });
    expect(
      renderer.root.findByProps({
        children: 'Smart hints: 5 · Quick pencils: 3',
      }),
    ).toBeTruthy();

    await ReactTestRenderer.act(() => debugCredits.props.onPress());
    expect(topUpDebugCredits).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({ testID: 'home-settings' })
        .props.onLongPress();
    });
    await ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({ accessibilityLabel: 'Hint Lab · 39 Techniques' })
        .props.onPress();
    });
    expect(openHintLab).toHaveBeenCalledTimes(1);
  });

  test('reacts to system reduced-motion changes and the in-app animation switch', async () => {
    let systemListener: ((enabled: boolean) => void) | undefined;
    const remove = jest.fn();
    const initial = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(false);
    const subscribe = jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((event, listener) => {
        if (event === 'reduceMotionChanged') {
          systemListener = listener as (enabled: boolean) => void;
        }
        return { remove } as ReturnType<
          typeof AccessibilityInfo.addEventListener
        >;
      });

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <ReducedMotionProbe animationsEnabled />,
      );
    });
    expect(
      renderer.root.findByProps({ testID: 'reduced-motion-state' }).props
        .children,
    ).toBe('animated');

    await ReactTestRenderer.act(async () => systemListener?.(true));
    expect(
      renderer.root.findByProps({ testID: 'reduced-motion-state' }).props
        .children,
    ).toBe('reduced');

    await ReactTestRenderer.act(async () => {
      renderer.update(<ReducedMotionProbe animationsEnabled={false} />);
    });
    expect(
      renderer.root.findByProps({ testID: 'reduced-motion-state' }).props
        .children,
    ).toBe('reduced');

    ReactTestRenderer.act(() => renderer.unmount());
    expect(remove).toHaveBeenCalledTimes(1);
    initial.mockRestore();
    subscribe.mockRestore();
  });

  test('groups result metrics in label-first announcements', async () => {
    let result!: ReactTestRenderer.ReactTestRenderer;
    const resultSnapshot = {
      ...homeSnapshot,
      screen: 'result',
      session: {
        state: {
          completionKind: 'perfect',
          difficultyLevel: 3,
          errorCount: 2,
          hintUseCount: 1,
          quickPencilUseCount: 2,
          sessionId: 'accessibility-result',
          status: 'completed',
          timer: { elapsedMs: 125_000 },
        },
      },
    } as OfflineGameSnapshot;

    await ReactTestRenderer.act(async () => {
      result = renderProductScreen(
        <ResultScreen
          onNext={jest.fn()}
          onRetry={jest.fn()}
          onReturnHome={jest.fn()}
          onStartLevel={jest.fn()}
          snapshot={resultSnapshot}
        />,
      );
      await Promise.resolve();
    });

    for (const label of [
      'Time, 2:05',
      'Mistakes, 2',
      'Hints, 1',
      'Quick pencils, 2',
    ]) {
      expect(
        result.root.findByProps({ accessibilityLabel: label }),
      ).toBeTruthy();
    }
    await ReactTestRenderer.act(async () => result.unmount());
  });

  test('announces earned completion rewards without inventory details', async () => {
    const snapshot = createCompletionPreviewScenarios('en').find(
      scenario => scenario.id === 'premium-partial-cap',
    )!.snapshot;
    let result!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      result = renderProductScreen(
        <ResultScreen
          onNext={jest.fn()}
          onRetry={jest.fn()}
          onReturnHome={jest.fn()}
          onStartLevel={jest.fn()}
          snapshot={snapshot}
        />,
      );
      await Promise.resolve();
    });

    for (const label of ['Quick pencil, +1', 'Smart hint, +5']) {
      expect(
        result.root.findAllByProps({ accessibilityLabel: label }).length,
      ).toBeGreaterThan(0);
    }
    expect(
      result.root.findAllByProps({ testID: 'result-honors' }),
    ).toHaveLength(0);
    await ReactTestRenderer.act(async () => result.unmount());
  });
});
