import { StyleSheet } from 'react-native';

/** Shared geometry for Home, Replay, Statistics, and their root navigation. */
export const ROOT_PAGE = {
  headerHeight: 58,
  headerSideWidth: 84,
  headerHorizontalInset: 12,
  contentHorizontalInset: 20,
  contentMaxWidth: 720,
  touchTarget: 44,
  iconActionSize: 48,
  tabBarHeight: 64,
  navigationRailWidth: 88,
  dividerWidth: StyleSheet.hairlineWidth,
} as const;
