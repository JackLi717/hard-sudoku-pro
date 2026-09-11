import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { OfflineGameSnapshot } from '../src/application';
import {
  CompletionResultPreview,
  createCompletionPreviewScenarios,
} from '../src/debug/CompletionResultPreview';
import { LocalizationProvider } from '../src/localization';
import { HomeScreen } from '../src/ui/screens/HomeScreen';
import { ResultScreen } from '../src/ui/screens/ResultScreen';
import { ThemeProvider } from '../src/ui/theme';

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
    quick_pencil: {
      resource: 'quick_pencil',
      balance: 3,
      earnedTotal: 3,
      spentTotal: 0,
    },
    smart_hint: {
      resource: 'smart_hint',
      balance: 5,
      earnedTotal: 5,
      spentTotal: 0,
    },
  },
  statistics: {
    attempts: 0,
    completions: 0,
    failures: 0,
    abandonments: 0,
    totalElapsedMs: 0,
    totalHintsUsed: 0,
    totalQuickPencilsUsed: 0,
  },
  completedByLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  reward: null,
  completionResult: null,
} as OfflineGameSnapshot;

function render(child: React.ReactNode) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale="en">
      <ThemeProvider preference="light">{child}</ThemeProvider>
    </LocalizationProvider>,
  );
}

describe('CompletionResultPreview', () => {
  test('provides the fixed valid scenarios required for manual acceptance', () => {
    const scenarios = createCompletionPreviewScenarios('en');
    expect(scenarios.map(scenario => scenario.id)).toEqual([
      'free-perfect-first',
      'free-independent',
      'hint-assisted',
      'premium-normal',
      'premium-partial-cap',
      'premium-full-cap',
      'replay',
      'new-best',
      'not-best',
    ]);

    const partial = scenarios.find(
      scenario => scenario.id === 'premium-partial-cap',
    )!.snapshot.completionResult!;
    expect(partial.reward).toMatchObject({ quickPencil: 0, smartHint: 1 });
    expect(partial.walletBefore.quick_pencil.balance).toBe(99);
    expect(partial.walletBefore.smart_hint.balance).toBe(98);
    expect(partial.walletAfter.quick_pencil.balance).toBe(99);
    expect(partial.walletAfter.smart_hint.balance).toBe(99);

    const newBest = scenarios.find(scenario => scenario.id === 'new-best')!
      .snapshot.completionResult!;
    expect(newBest).toMatchObject({
      isFirstCompletion: false,
      isNewLevelBest: true,
      previousLevelBestTimeMs: 420_000,
    });
    expect(
      scenarios.find(scenario => scenario.id === 'new-best')!.snapshot
        .statistics.completions,
    ).toBe(20);
  });

  test('uses the real result screen while keeping every result action inert', async () => {
    const onClose = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = render(<CompletionResultPreview onClose={onClose} />);
    });

    await act(async () =>
      renderer.root
        .findByProps({
          testID: 'completion-preview-scenario-premium-normal',
        })
        .props.onPress(),
    );
    const result = renderer.root.findByType(ResultScreen);
    expect(result.props.snapshot.reward).toMatchObject({
      premiumAtCompletion: true,
      quickPencil: 1,
      smartHint: 3,
    });

    await act(async () =>
      renderer.root
        .findByProps({ testID: 'result-next-puzzle' })
        .props.onPress(),
    );
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'result-choose-level' })
        .props.onPress(),
    );
    expect(renderer.root.findByType(ResultScreen)).toBe(result);
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'level-picker-option-5' })
        .props.onPress(),
    );
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'result-open-replay' })
        .props.onPress(),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(
      renderer.root.findByProps({
        children: 'Preview only — no game action was performed.',
      }),
    ).toBeTruthy();

    await act(async () =>
      renderer.root
        .findByProps({ testID: 'completion-preview-back' })
        .props.onPress(),
    );
    expect(
      renderer.root.findByProps({ testID: 'completion-preview-selector' }),
    ).toBeTruthy();
    await act(async () =>
      renderer.root
        .findByProps({ testID: 'completion-preview-close' })
        .props.onPress(),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows the More-menu entry only when its development callback exists', async () => {
    const onOpenCompletionPreview = jest.fn();
    let releaseRenderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      releaseRenderer = render(
        <HomeScreen
          onOpenSettings={jest.fn()}
          onResume={jest.fn()}
          onStart={jest.fn()}
          snapshot={homeSnapshot}
        />,
      );
    });
    await act(async () =>
      releaseRenderer.root.findByProps({ testID: 'home-more' }).props.onPress(),
    );
    expect(
      releaseRenderer.root.findAllByProps({
        accessibilityLabel: 'Completion screen preview',
      }),
    ).toHaveLength(0);

    let developmentRenderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      developmentRenderer = render(
        <HomeScreen
          onOpenCompletionPreview={onOpenCompletionPreview}
          onOpenSettings={jest.fn()}
          onResume={jest.fn()}
          onStart={jest.fn()}
          snapshot={homeSnapshot}
        />,
      );
    });
    await act(async () =>
      developmentRenderer.root
        .findByProps({ testID: 'home-more' })
        .props.onPress(),
    );
    const entry = developmentRenderer.root.findByProps({
      testID: 'home-completion-preview',
    });
    await act(async () => entry.props.onPress());
    expect(onOpenCompletionPreview).toHaveBeenCalledTimes(1);
  });
});
