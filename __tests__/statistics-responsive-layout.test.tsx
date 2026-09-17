import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import type { OfflineGameSnapshot } from '../src/application';
import { LocalizationProvider } from '../src/localization';
import { StatisticsScreen } from '../src/ui/screens/ProductInfoScreens';
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

const snapshot = {
  completedByLevel: { 1: 5, 2: 3, 3: 26, 4: 35, 5: 1 },
  statistics: {
    abandonments: 7,
    attempts: 77,
    completions: 70,
    failures: 0,
    totalElapsedMs: 97_200_000,
    totalHintsUsed: 326,
    totalQuickPencilsUsed: 84,
  },
} as unknown as OfflineGameSnapshot;

function renderStatistics() {
  return ReactTestRenderer.create(
    <LocalizationProvider locale="zh-Hans">
      <ThemeProvider preference="light">
        <StatisticsScreen snapshot={snapshot} />
      </ThemeProvider>
    </LocalizationProvider>,
  );
}

describe('Statistics responsive layout', () => {
  afterEach(() => {
    mockLandscapeTabletLayout = false;
  });

  test('restores the original unframed statistics layout on phone', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = renderStatistics();
    });

    expect(
      renderer.root.findByProps({ testID: 'statistics-portrait-layout' }),
    ).toBeTruthy();
    const heroMetric = StyleSheet.flatten(
      renderer.root.findByProps({
        testID: 'statistics-hero-statistics.completions',
      }).props.style,
    );
    expect(heroMetric).not.toHaveProperty('backgroundColor');
    expect(heroMetric).not.toHaveProperty('borderRadius');
    expect(heroMetric).not.toHaveProperty('borderWidth');

    const activity = StyleSheet.flatten(
      renderer.root.findByProps({
        testID: 'statistics-section-activity',
      }).props.style,
    );
    expect(activity).not.toHaveProperty('backgroundColor');
    expect(activity).not.toHaveProperty('borderRadius');
    expect(activity).not.toHaveProperty('borderWidth');
    expect(
      renderer.root.findAllByProps({ testID: 'statistics-track-1' }),
    ).toHaveLength(0);
  });

  test('uses typography and one central divider on landscape tablet', async () => {
    mockLandscapeTabletLayout = true;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = renderStatistics();
    });

    expect(
      renderer.root.findByProps({ testID: 'statistics-landscape-layout' }),
    ).toBeTruthy();
    const heroMetric = StyleSheet.flatten(
      renderer.root.findByProps({
        testID: 'statistics-hero-statistics.completions',
      }).props.style,
    );
    expect(heroMetric).not.toHaveProperty('backgroundColor');
    expect(heroMetric).not.toHaveProperty('borderRadius');
    expect(heroMetric).not.toHaveProperty('borderWidth');

    const activity = StyleSheet.flatten(
      renderer.root.findByProps({
        testID: 'statistics-section-activity',
      }).props.style,
    );
    expect(activity).not.toHaveProperty('backgroundColor');
    expect(activity).not.toHaveProperty('borderRadius');
    expect(activity).not.toHaveProperty('borderWidth');

    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'statistics-section-level' }).props
          .style,
      ),
    ).toMatchObject({ borderLeftWidth: 1, paddingLeft: 34 });
    expect(
      renderer.root.findByProps({ testID: 'statistics-track-1' }),
    ).toBeTruthy();
  });
});
