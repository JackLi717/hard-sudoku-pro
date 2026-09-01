import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { AccessibilityInfo, Text } from 'react-native';
import { OfflineGameSnapshot } from '../src/application';
import { LocalizationProvider } from '../src/localization';
import { HomeScreen } from '../src/ui/screens/HomeScreen';
import { ResultScreen } from '../src/ui/screens/ResultScreen';
import { ThemeProvider } from '../src/ui/theme';
import { useReducedMotion } from '../src/ui/use-reduced-motion';

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

  test('groups dashboard and result metrics in label-first announcements', async () => {
    let home!: ReactTestRenderer.ReactTestRenderer;
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
          status: 'completed',
          timer: { elapsedMs: 125_000 },
        },
      },
    } as OfflineGameSnapshot;

    await ReactTestRenderer.act(() => {
      home = renderProductScreen(
        <HomeScreen
          onOpenHelp={jest.fn()}
          onOpenSettings={jest.fn()}
          onOpenStatistics={jest.fn()}
          onOpenTechniques={jest.fn()}
          onResume={jest.fn()}
          onStart={jest.fn()}
          snapshot={homeSnapshot}
        />,
      );
      result = renderProductScreen(
        <ResultScreen
          onNewGame={jest.fn()}
          onNext={jest.fn()}
          onRetry={jest.fn()}
          snapshot={resultSnapshot}
        />,
      );
    });

    for (const label of ['Solved, 8', 'Attempts, 12', 'Hints, 5']) {
      expect(home.root.findByProps({ accessibilityLabel: label })).toBeTruthy();
    }
    for (const label of ['Time, 2:05', 'Mistakes, 2', 'Hints, 1']) {
      expect(
        result.root.findByProps({ accessibilityLabel: label }),
      ).toBeTruthy();
    }
  });
});
