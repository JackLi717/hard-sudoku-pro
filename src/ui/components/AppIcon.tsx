import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import {
  MaterialIcons,
  MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static';

export const APP_ICON_SIZE = {
  micro: 12,
  compact: 16,
  standard: 20,
  navigation: 24,
  prominent: 32,
  hero: 48,
} as const;

export type AppIconName =
  | 'back'
  | 'forward'
  | 'check'
  | 'close'
  | 'settings'
  | 'pause'
  | 'play'
  | 'skipBack'
  | 'skipForward'
  | 'refresh'
  | 'clock'
  | 'info'
  | 'plus'
  | 'minus'
  | 'home'
  | 'replay'
  | 'statistics'
  | 'undo'
  | 'erase'
  | 'sparkle'
  | 'pencil'
  | 'hint'
  | 'color'
  | 'multiSelect';

type AppIconProps = {
  name: AppIconName;
  color: string;
  size?: number;
  style?: ViewStyle;
  testID?: string;
};

const MATERIAL_ICON_NAMES: Record<AppIconName, MaterialIconsIconName> = {
  back: 'arrow-back',
  forward: 'arrow-forward',
  check: 'check',
  close: 'close',
  settings: 'settings',
  pause: 'pause',
  play: 'play-arrow',
  skipBack: 'skip-previous',
  skipForward: 'skip-next',
  refresh: 'refresh',
  clock: 'schedule',
  info: 'info-outline',
  plus: 'add',
  minus: 'remove',
  home: 'home',
  replay: 'replay',
  statistics: 'bar-chart',
  undo: 'undo',
  erase: 'backspace',
  sparkle: 'auto-awesome',
  pencil: 'edit-note',
  hint: 'lightbulb-outline',
  color: 'format-color-fill',
  multiSelect: 'select-all',
};

/**
 * All operation icons use one Material Icons font and a fixed frame. The font
 * file is bundled on both platforms, keeping glyph shape and alignment stable.
 */
export function AppIcon({
  name,
  color,
  size = APP_ICON_SIZE.navigation,
  style,
  testID,
}: AppIconProps): React.JSX.Element {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.frame, { height: size, width: size }, style]}
      testID={testID ?? `app-icon-${name}`}
    >
      <MaterialIcons
        allowFontScaling={false}
        color={color}
        name={MATERIAL_ICON_NAMES[name]}
        size={size}
        style={[styles.glyph, { height: size, lineHeight: size, width: size }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center' },
  glyph: {
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
