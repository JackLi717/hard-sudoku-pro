import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { ScrollView, StyleSheet } from 'react-native';
import { createCompletionPreviewScenarios } from '../src/debug/CompletionResultPreview';
import { LocalizationProvider } from '../src/localization';
import { ResultScreen } from '../src/ui/screens/ResultScreen';
import { ThemeProvider } from '../src/ui/theme';

let mockLandscapeTabletLayout = false;

jest.mock('../src/ui/layout/adaptive-layout', () => ({
  ...jest.requireActual('../src/ui/layout/adaptive-layout'),
  useAdaptiveLayout: () => ({
    isAndroidTablet: mockLandscapeTabletLayout,
    isLandscape: mockLandscapeTabletLayout,
    useLandscapeTabletLayout: mockLandscapeTabletLayout,
    widthClass: mockLandscapeTabletLayout ? 'expanded' : 'compact',
  }),
}));

jest.mock('../src/ui/use-reduced-motion', () => ({
  useReducedMotionPreference: () => ({ ready: true, reduceMotion: true }),
}));

const snapshot = createCompletionPreviewScenarios('en').find(
  scenario => scenario.id === 'free-perfect-first',
)!.snapshot;

function renderResult() {
  return ReactTestRenderer.create(
    <LocalizationProvider locale="en">
      <ThemeProvider preference="light">
        <ResultScreen
          onNext={jest.fn()}
          onRetry={jest.fn()}
          onReturnHome={jest.fn()}
          onStartLevel={jest.fn()}
          snapshot={snapshot}
        />
      </ThemeProvider>
    </LocalizationProvider>,
  );
}

describe('Result responsive layout', () => {
  afterEach(() => {
    mockLandscapeTabletLayout = false;
  });

  test('keeps the completed phone page top aligned for scrolling', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(() => {
      renderer = renderResult();
    });

    expect(
      renderer.root.findByProps({ testID: 'result-portrait-layout' }),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        renderer.root.findByType(ScrollView).props.contentContainerStyle,
      ),
    ).toMatchObject({ justifyContent: 'flex-start', paddingTop: 28 });
  });

  test('vertically centers the completed page on landscape tablet', async () => {
    mockLandscapeTabletLayout = true;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await act(() => {
      renderer = renderResult();
    });

    expect(
      renderer.root.findByProps({ testID: 'result-landscape-layout' }),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        renderer.root.findByType(ScrollView).props.contentContainerStyle,
      ),
    ).toMatchObject({ flexGrow: 1, justifyContent: 'center', padding: 24 });
  });
});
