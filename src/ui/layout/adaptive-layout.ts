import { Dimensions, Platform, useWindowDimensions } from 'react-native';

export const ANDROID_TABLET_SHORTEST_SIDE = 600;
export const EXPANDED_WINDOW_WIDTH = 840;

export type WindowWidthClass = 'compact' | 'medium' | 'expanded';

export type AdaptiveLayout = {
  isAndroidTablet: boolean;
  isLandscape: boolean;
  useLandscapeTabletLayout: boolean;
  widthClass: WindowWidthClass;
};

type AdaptiveLayoutInput = {
  platform: string;
  screenWidth: number;
  screenHeight: number;
  width: number;
  height: number;
};

export function resolveAdaptiveLayout({
  platform,
  screenWidth,
  screenHeight,
  width,
  height,
}: AdaptiveLayoutInput): AdaptiveLayout {
  const isAndroidTablet =
    platform === 'android' &&
    Math.min(screenWidth, screenHeight) >= ANDROID_TABLET_SHORTEST_SIDE;
  const isLandscape = width > height;
  const widthClass: WindowWidthClass =
    width >= EXPANDED_WINDOW_WIDTH
      ? 'expanded'
      : width >= ANDROID_TABLET_SHORTEST_SIDE
      ? 'medium'
      : 'compact';

  return {
    isAndroidTablet,
    isLandscape,
    useLandscapeTabletLayout:
      isAndroidTablet && isLandscape && widthClass === 'expanded',
    widthClass,
  };
}

export function useAdaptiveLayout(): AdaptiveLayout {
  const { height, width } = useWindowDimensions();
  const screen = Dimensions.get('screen');

  return resolveAdaptiveLayout({
    platform: Platform.OS,
    screenHeight: screen.height,
    screenWidth: screen.width,
    height,
    width,
  });
}
