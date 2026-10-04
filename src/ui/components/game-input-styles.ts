import { StyleSheet } from 'react-native';
import type { AppPalette } from '../theme';
import { APP_ICON_SIZE } from './AppIcon';
import { PLAY_BOARD_EDGE_INSET } from '../layout/adaptive-layout';

export function gameInputTextScale(width: number, height: number): number {
  return Math.min(width, height) >= 600 ? 1.25 : 1;
}

/** Shared by gameplay and the read-only operation demonstrations. */
export function createGameInputStyles(palette: AppPalette, textScale = 1) {
  return StyleSheet.create({
    numberPadPortrait: {
      height: 72,
      marginTop: 0,
      paddingHorizontal: 0,
      alignItems: 'center',
    },
    toolbarPortrait: {
      alignSelf: 'stretch',
      paddingHorizontal: 0,
      marginTop: 4,
      paddingTop: 4,
    },
    toolDisabled: { opacity: 0.4 },
    toolPortrait: {
      minHeight: 68,
      paddingTop: 6,
      paddingBottom: 4,
      marginHorizontal: 0,
    },
    toolLabelPortrait: {
      fontSize: Math.min(14, 11.5 * textScale),
      lineHeight: Math.min(19, 15 * textScale),
      minHeight: Math.min(38, 30 * textScale),
      fontWeight: '500',
      textAlign: 'center',
      alignSelf: 'stretch',
    },
    numberPad: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
      paddingHorizontal: PLAY_BOARD_EDGE_INSET,
    },
    numberKey: {
      alignItems: 'center',
      borderRadius: 10,
      flex: 1,
      marginHorizontal: 2,
      paddingVertical: 6,
    },
    numberKeyContent: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberKeySelected: {
      backgroundColor: palette.accentSoft,
      opacity: 1,
    },
    numberValue: {
      color: palette.accent,
      fontSize: 25 * textScale,
      fontWeight: '700',
    },
    numberRemaining: {
      color: palette.muted,
      fontSize: 10 * textScale,
      fontWeight: '600',
      marginTop: -2,
    },
    numberMultiSelectCount: {
      color: palette.accent,
      fontSize: 10 * textScale,
      fontWeight: '700',
      marginTop: -2,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
      paddingHorizontal: 8,
    },
    tool: {
      alignItems: 'center',
      borderRadius: 13,
      flex: 1,
      marginHorizontal: 2,
      minHeight: 68 * textScale,
      paddingBottom: 7 * textScale,
      paddingTop: 8 * textScale,
      position: 'relative',
    },
    toolLandscape: {
      flexBasis: '33.333333%',
      flexGrow: 0,
      flexShrink: 0,
      marginHorizontal: 0,
      minHeight: 64 * textScale,
      paddingBottom: 5 * textScale,
      paddingTop: 6 * textScale,
    },
    toolFeedback: {
      backgroundColor: palette.selected,
      borderColor: palette.focus,
      borderRadius: 13,
      borderWidth: 1.5,
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
    toolIcon: {
      alignItems: 'center',
      height: APP_ICON_SIZE.navigation,
      width: APP_ICON_SIZE.navigation,
      justifyContent: 'center',
    },
    toolLabel: {
      color: palette.muted,
      fontSize: 10 * textScale,
      fontWeight: '700',
      marginTop: 3,
    },
    toolLabelActive: {
      color: palette.accent,
    },
    badge: {
      alignItems: 'center',
      backgroundColor: palette.selected,
      borderRadius: 9 * textScale,
      height: 18 * textScale,
      justifyContent: 'center',
      minWidth: 18 * textScale,
      paddingHorizontal: 4 * textScale,
      position: 'absolute',
      left: '100%',
      marginLeft: 4,
      top: -4,
    },
    badgeTwoDigits: {
      borderRadius: 10 * textScale,
      height: 20 * textScale,
      minWidth: 20 * textScale,
      paddingHorizontal: 0,
      width: 20 * textScale,
    },
    badgeEmpty: {
      backgroundColor: palette.surfaceStrong,
    },
    badgeText: {
      color: palette.ink,
      fontSize: 9 * textScale,
      fontWeight: '900',
      includeFontPadding: false,
      lineHeight: 12 * textScale,
      textAlign: 'center',
    },
    badgeTextEmpty: {
      color: palette.muted,
    },
    pressed: {
      opacity: 0.65,
    },
  });
}
