import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import type { OfflineGameSnapshot } from '../src/application';
import {
  LESSON_LOCALES,
  type LessonLocale,
} from '../src/domain/lessons/contracts';
import { LESSON_COPY } from '../src/localization/lesson-copy';
import { LocalizationProvider } from '../src/localization';
import { HomeScreen } from '../src/ui/screens/HomeScreen';
import { darkPalette, lightPalette, ThemeProvider } from '../src/ui/theme';

let mockLandscapeTabletLayout = false;
let mockPortraitTabletLayout = false;

jest.mock('../src/ui/layout/adaptive-layout', () => ({
  ...jest.requireActual('../src/ui/layout/adaptive-layout'),
  useAdaptiveLayout: () => ({
    isAndroidTablet: mockLandscapeTabletLayout,
    isLandscape: mockLandscapeTabletLayout,
    useLandscapeTabletLayout: mockLandscapeTabletLayout,
    widthClass: mockLandscapeTabletLayout
      ? 'expanded'
      : mockPortraitTabletLayout
      ? 'medium'
      : 'compact',
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

function renderHome({
  appearance = 'light',
  currentSnapshot = snapshot,
  onResume = jest.fn(),
  onOpenLessons = jest.fn(),
  locale = 'en',
}: {
  appearance?: 'light' | 'dark';
  currentSnapshot?: OfflineGameSnapshot;
  onResume?: () => void;
  onOpenLessons?: () => void;
  locale?: LessonLocale;
} = {}) {
  return ReactTestRenderer.create(
    <LocalizationProvider locale={locale}>
      <ThemeProvider preference={appearance}>
        <HomeScreen
          onOpenSettings={jest.fn()}
          onOpenLessons={onOpenLessons}
          onResume={onResume}
          onStart={jest.fn()}
          snapshot={currentSnapshot}
        />
      </ThemeProvider>
    </LocalizationProvider>,
  );
}

describe('Home responsive layout', () => {
  afterEach(() => {
    mockLandscapeTabletLayout = false;
    mockPortraitTabletLayout = false;
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
        renderer.root.findByProps({ testID: 'home-app-bar' }).props.style,
      ).maxWidth,
    ).toBe(480);
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
    // Free space expands between the brand and actions, rather than below them.
    const pane = renderer.root.findByProps({ testID: 'home-primary-pane' });
    expect(
      pane.findAllByProps({ testID: 'home-actions' }).length,
    ).toBeGreaterThan(0);
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'home-brand-action-space' }).props
          .style,
      ).flexGrow,
    ).toBeGreaterThan(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'home-brand-top-space' }).props
          .style,
      ).flexGrow,
    );
  });

  test('places tablet header actions at the page edges while keeping the brand centered', async () => {
    mockPortraitTabletLayout = true;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = renderHome();
    });

    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'home-app-bar' }).props.style,
      ),
    ).toMatchObject({
      width: '100%',
      maxWidth: '100%',
      justifyContent: 'space-between',
    });
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'home-portrait-layout' }).props
          .style,
      ).maxWidth,
    ).toBe(480);
    const settings = renderer.root.findByProps({ testID: 'home-settings' });
    const target = StyleSheet.flatten(settings.props.style({ pressed: false }));
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
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
    expect(
      renderer.root.findAllByProps({ testID: 'home-brand-action-space' }),
    ).toHaveLength(0);
  });

  test.each(['light', 'dark'] as const)(
    'keeps resume readable and operable in %s appearance',
    async appearance => {
      const onResume = jest.fn();
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(() => {
        renderer = renderHome({ appearance, onResume });
      });
      const colors = appearance === 'dark' ? darkPalette : lightPalette;
      const resume = renderer.root.findByProps({
        accessibilityLabel: 'Continue, Expert, 02:05',
      });
      const resumeStyle = StyleSheet.flatten(
        resume.props.style({ pressed: false }),
      );
      expect(resumeStyle.backgroundColor).toBe(colors.accent);
      expect(resumeStyle).toMatchObject({
        justifyContent: 'center',
        minHeight: 64,
        paddingVertical: 8,
      });
      for (const label of resume.findAllByType(Text)) {
        expect(StyleSheet.flatten(label.props.style)).toMatchObject({
          color: colors.background,
          textAlign: 'center',
        });
      }
      const newGame = renderer.root.findByProps({
        accessibilityLabel: 'New Game',
      });
      expect(
        StyleSheet.flatten(newGame.props.style({ pressed: false })),
      ).toMatchObject({ borderWidth: 1, borderColor: colors.accent });
      await ReactTestRenderer.act(() => resume.props.onPress());
      expect(onResume).toHaveBeenCalledTimes(1);

      const emblem = renderer.root.findByProps({
        testID: 'home-brand-emblem',
      });
      expect(emblem.props.accessibilityElementsHidden).toBe(true);
      expect(emblem.props.importantForAccessibility).toBe(
        'no-hide-descendants',
      );
      expect(emblem.props.pointerEvents).toBe('none');
    },
  );

  test.each(['light', 'dark'] as const)(
    'promotes new game when there is no saved session in %s appearance',
    async appearance => {
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      await ReactTestRenderer.act(() => {
        renderer = renderHome({
          appearance,
          currentSnapshot: { ...snapshot, resumable: false, session: null },
        });
      });
      expect(
        renderer.root.findAllByProps({
          accessibilityLabel: 'Continue, Expert, 02:05',
        }),
      ).toHaveLength(0);
      const newGame = renderer.root.findByProps({
        accessibilityLabel: 'New Game',
      });
      expect(
        StyleSheet.flatten(newGame.props.style({ pressed: false }))
          .backgroundColor,
      ).toBe((appearance === 'dark' ? darkPalette : lightPalette).accent);
      await ReactTestRenderer.act(() => newGame.props.onPress());
      expect(
        renderer.root.findByProps({
          accessibilityLabel: 'Start Hard, 1 solved',
        }),
      ).toBeTruthy();
    },
  );
});

test.each(LESSON_LOCALES)(
  'home opens the localized study in %s',
  async locale => {
    const onOpenLessons = jest.fn();
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(() => {
      renderer = renderHome({ locale, onOpenLessons });
    });
    const entry = renderer.root.findByProps({ testID: 'home-lessons' });
    expect(entry.props.accessibilityLabel).toBe(LESSON_COPY[locale].title);
    expect(entry.props.accessibilityRole).toBe('button');
    const actions = renderer.root.findByProps({ testID: 'home-actions' });
    expect(actions.findByProps({ testID: 'home-lessons' })).toBe(entry);
    await ReactTestRenderer.act(() => entry.props.onPress());
    expect(onOpenLessons).toHaveBeenCalledTimes(1);
    await ReactTestRenderer.act(() => renderer.unmount());
  },
);
