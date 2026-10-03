import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import { createCompletionPreviewScenarios } from '../src/debug/CompletionResultPreview';
import { LocalizationProvider } from '../src/localization';
import { ResultScreen } from '../src/ui/screens/ResultScreen';
import { CompletionCelebration } from '../src/ui/components/CompletionCelebration';
import { ThemeProvider } from '../src/ui/theme';

let mockLandscapeTabletLayout = false;
let mockHeight = 720;

jest.mock('../src/ui/layout/adaptive-layout', () => ({
  ...jest.requireActual('../src/ui/layout/adaptive-layout'),
  useContainerLayout: () => ({
    width: 320,
    height: mockHeight,
    onLayout: jest.fn(),
  }),
  useAdaptiveLayout: () => ({
    useLandscapeTabletLayout: mockLandscapeTabletLayout,
  }),
}));
jest.mock('../src/ui/use-reduced-motion', () => ({
  useReducedMotionPreference: () => ({ ready: true, reduceMotion: true }),
}));

const snapshot = createCompletionPreviewScenarios('en').find(
  scenario => scenario.id === 'free-perfect-first',
)!.snapshot;

function renderResult(failed = false) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale="en">
      <ThemeProvider preference="light">
        <ResultScreen
          onNext={jest.fn()}
          onRetry={jest.fn()}
          onReturnHome={jest.fn()}
          onStartLevel={jest.fn()}
          onOpenReplay={jest.fn()}
          onCheckCompletionAd={async () => ({ status: 'available' })}
          onWatchCompletionAd={async () => ({ status: 'dismissed' })}
          snapshot={
            failed
              ? {
                  ...snapshot,
                  session: {
                    ...snapshot.session!,
                    state: { ...snapshot.session!.state, status: 'failed' },
                  },
                }
              : snapshot
          }
        />
      </ThemeProvider>
    </LocalizationProvider>,
  );
}

describe('Result single-screen layout', () => {
  const previousDimensions = {
    window: Dimensions.get('window'),
    screen: Dimensions.get('screen'),
  };
  beforeEach(() => {
    Dimensions.set({
      window: { width: 320, height: 900, scale: 2, fontScale: 1 },
      screen: { width: 320, height: 900, scale: 2, fontScale: 1 },
    });
  });
  afterEach(() => {
    Dimensions.set(previousDimensions);
    mockLandscapeTabletLayout = false;
    mockHeight = 720;
  });

  test.each([480, 600, 900])(
    'keeps completion in a non-scrolling viewport at %i points',
    async height => {
      mockHeight = height;
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await act(async () => {
        renderer = renderResult();
      });
      expect(renderer.root.findAllByType(ScrollView)).toHaveLength(0);
      expect(
        renderer.root.findAllByProps({ testID: 'result-achievement-card' }),
      ).toHaveLength(0);
      expect(
        StyleSheet.flatten(
          renderer.root.findByProps({ testID: 'result-completion-viewport' })
            .props.style,
        ),
      ).toMatchObject({ flex: 1 });
      expect(
        StyleSheet.flatten(
          renderer.root.findByProps({ testID: 'result-secondary-actions' })
            .props.style,
        ),
      ).toMatchObject({ flexDirection: 'row' });
      for (const testID of [
        'result-share',
        'result-open-replay',
        'result-choose-level',
        'result-next-puzzle',
        'result-completion-ad',
      ]) {
        expect(renderer.root.findByProps({ testID })).toBeTruthy();
      }
      if (height < 620)
        expect(renderer.root.findByType(CompletionCelebration).props.size).toBe(
          56,
        );
      expect(
        renderer.root.findByProps({ testID: 'result-honor-perfect' }),
      ).toBeTruthy();
      if (height < 620) {
        expect(
          renderer.root.findAllByProps({ testID: 'result-honor-new_best' }),
        ).toHaveLength(0);
      } else {
        expect(
          renderer.root.findByProps({ testID: 'result-honor-new_best' }),
        ).toBeTruthy();
      }
      await act(async () => renderer.unmount());
    },
  );

  test('retains the landscape tablet arrangement without enabling scrolling', async () => {
    mockLandscapeTabletLayout = true;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult();
    });
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'result-landscape-layout' }).props
          .style,
      ),
    ).toMatchObject({ flexDirection: 'row' });
    expect(renderer.root.findAllByType(ScrollView)).toHaveLength(0);
    await act(async () => renderer.unmount());
  });

  test('preserves the failed-page scroll container', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderResult(true);
    });
    expect(renderer.root.findByType(ScrollView)).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'result-retry' })).toBeTruthy();
    await act(async () => renderer.unmount());
  });
});
