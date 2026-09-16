import { resolveAdaptiveLayout } from '../src/ui/layout/adaptive-layout';

describe('Android tablet adaptive layout', () => {
  test.each([
    { width: 1024, height: 640 },
    { width: 1280, height: 800 },
    { width: 1600, height: 900 },
    { width: 840, height: 600 },
  ])('uses the landscape tablet layout at $width x $height', dimensions => {
    expect(
      resolveAdaptiveLayout({
        platform: 'android',
        screenWidth: 1280,
        screenHeight: 800,
        ...dimensions,
      }).useLandscapeTabletLayout,
    ).toBe(true);
  });

  test('falls back to a compact layout in a narrow split-screen window', () => {
    expect(
      resolveAdaptiveLayout({
        platform: 'android',
        screenWidth: 1280,
        screenHeight: 800,
        width: 700,
        height: 640,
      }),
    ).toMatchObject({
      isAndroidTablet: true,
      widthClass: 'medium',
      useLandscapeTabletLayout: false,
    });
  });

  test('does not change Android phones or iPads', () => {
    expect(
      resolveAdaptiveLayout({
        platform: 'android',
        screenWidth: 844,
        screenHeight: 390,
        width: 844,
        height: 390,
      }).useLandscapeTabletLayout,
    ).toBe(false);
    expect(
      resolveAdaptiveLayout({
        platform: 'ios',
        screenWidth: 1133,
        screenHeight: 744,
        width: 1133,
        height: 744,
      }).useLandscapeTabletLayout,
    ).toBe(false);
  });
});
