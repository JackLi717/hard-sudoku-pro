import { useCallback, useContext, useState } from 'react';
import {
  Dimensions,
  LayoutChangeEvent,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

export const ANDROID_TABLET_SHORTEST_SIDE = 600;
export const EXPANDED_WINDOW_WIDTH = 840;
export const TABLET_CONTENT_GAP = 20;
export const TABLET_SAFE_BOTTOM_CLEARANCE = 20;
export const PLAY_BOARD_EDGE_INSET = 6;

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

type SquareFitInput = {
  availableWidth: number;
  availableHeight: number;
  horizontalInset?: number;
  verticalInset?: number;
  maxSize?: number;
};

export function fitSquareWithin({
  availableWidth,
  availableHeight,
  horizontalInset = 0,
  verticalInset = 0,
  maxSize = Infinity,
}: SquareFitInput): number {
  return Math.max(
    0,
    Math.min(
      availableWidth - horizontalInset,
      availableHeight - verticalInset,
      maxSize,
    ),
  );
}

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
      isLandscape && widthClass === 'expanded' && height >= 360,
    widthClass,
  };
}

export function useAvailableWindowDimensions() {
  const window = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext);
  return {
    ...window,
    width: Math.max(
      0,
      window.width - (insets?.left ?? 0) - (insets?.right ?? 0),
    ),
    height: Math.max(
      0,
      window.height - (insets?.top ?? 0) - (insets?.bottom ?? 0),
    ),
  };
}

/** Measure the parent allocation, rather than the physical display. */
export function useContainerLayout() {
  const window = useAvailableWindowDimensions();
  const [layout, setLayout] = useState<{
    width: number;
    height: number;
    windowWidth: number;
    windowHeight: number;
  } | null>(null);
  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      setLayout(current =>
        current?.width === width &&
        current?.height === height &&
        current?.windowWidth === window.width &&
        current?.windowHeight === window.height
          ? current
          : {
              width,
              height,
              windowWidth: window.width,
              windowHeight: window.height,
            },
      );
    },
    [window.width, window.height],
  );
  // Discard the old orientation's measurement until the next layout event.
  const current =
    layout?.windowWidth === window.width &&
    layout?.windowHeight === window.height
      ? layout
      : window;
  return { width: current.width, height: current.height, onLayout };
}

export function useAdaptiveLayout(container?: {
  width: number;
  height: number;
}): AdaptiveLayout {
  const window = useAvailableWindowDimensions();
  const { height, width } = container ?? window;
  const screen = Dimensions.get('screen');

  return resolveAdaptiveLayout({
    platform: Platform.OS,
    screenHeight: screen.height,
    screenWidth: screen.width,
    height,
    width,
  });
}
