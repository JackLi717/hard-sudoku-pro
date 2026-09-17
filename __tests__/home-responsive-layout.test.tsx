import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import type { OfflineGameSnapshot } from '../src/application';
import { LocalizationProvider } from '../src/localization';
import { HomeScreen } from '../src/ui/screens/HomeScreen';
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
  screen: 'home',
  resumable: true,
  busy: false,
  session: {
    state: {
      difficultyLevel: 4,
      timer: { elapsedMs: 125_000 },
    },
  },
  completedByLevel: { 1: 3, 2: 2, 3: 1, 4: 1, 5: 1 },
  wallet: {
    quick_pencil: { balance: 3, earnedTotal: 3, spentTotal: 0 },
    smart_hint: { balance: 5, earnedTotal: 5, spentTotal: 0 },
  },
} as unknown as OfflineGameSnapshot;

function renderHome() {
  return ReactTestRenderer.create(
    <LocalizationProvider locale="en">
      <ThemeProvider preference="light">
        <HomeScreen
          onOpenSettings={jest.fn()}
          onResume={jest.fn()}
          onStart={jest.fn()}
          snapshot={snapshot}
        />
      </ThemeProvider>
    </LocalizationProvider>,
  );
}

describe('Home responsive layout', () => {
  afterEach(() => {
    mockLandscapeTabletLayout = false;
  });

  test('keeps the phone action column at its original full width', async () => {
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = renderHome();
    });

    expect(
      renderer.root.findByProps({ testID: 'home-portrait-layout' }),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'home-primary-pane' }).props.style,
      ),
    ).toMatchObject({ alignItems: 'center', width: '100%' });
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'home-actions' }).props.style,
      ),
    ).toMatchObject({ maxWidth: 350, width: '100%' });
    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Continue, Expert, 02:05',
      }),
    ).toBeTruthy();
  });

  test('applies the flexible pane only to tablet landscape', async () => {
    mockLandscapeTabletLayout = true;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = renderHome();
    });

    expect(
      renderer.root.findByProps({ testID: 'home-landscape-layout' }),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'home-primary-pane' }).props.style,
      ),
    ).toMatchObject({
      flex: 1,
      maxWidth: 480,
      minWidth: 0,
      width: 'auto',
    });
    expect(
      renderer.root.findByProps({ testID: 'home-level-progress' }),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'home-landscape-layout' }).props
          .style,
      ),
    ).toMatchObject({
      alignItems: 'center',
      justifyContent: 'center',
    });
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'home-actions' }).props.style,
      ),
    ).toMatchObject({ maxWidth: 390, width: '100%' });
    const progress = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'home-level-progress' }).props.style,
    );
    expect(progress).toMatchObject({ borderLeftWidth: 1, paddingLeft: 34 });
    expect(progress).not.toHaveProperty('backgroundColor');
    expect(progress).not.toHaveProperty('borderRadius');
  });
});
