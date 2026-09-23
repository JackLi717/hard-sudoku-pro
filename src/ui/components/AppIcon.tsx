import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import {
  MaterialIcons,
  MaterialIconsIconName,
} from '@react-native-vector-icons/material-icons/static';
import Svg, { Path } from 'react-native-svg';

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
  | 'show'
  | 'hide'
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
  show: 'visibility',
  hide: 'visibility-off',
  pencil: 'edit-note',
  hint: 'lightbulb-outline',
  color: 'palette',
  multiSelect: 'select-all',
};

const MATERIAL_SYMBOL_PATHS: Readonly<
  Record<'show' | 'hide' | 'color', string>
> = {
  show: 'M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z',
  hide: 'm644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z',
  color:
    'M480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 32.5-156t88-127Q256-817 330-848.5T488-880q80 0 151 27.5t124.5 76q53.5 48.5 85 115T880-518q0 115-70 176.5T640-280h-74q-9 0-12.5 5t-3.5 11q0 12 15 34.5t15 51.5q0 50-27.5 74T480-80Zm0-400Zm-220 40q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120-160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm200 0q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17Zm120 160q26 0 43-17t17-43q0-26-17-43t-43-17q-26 0-43 17t-17 43q0 26 17 43t43 17ZM480-160q9 0 14.5-5t5.5-13q0-14-15-33t-15-57q0-42 29-67t71-25h70q66 0 113-38.5T800-518q0-121-92.5-201.5T488-800q-136 0-232 93t-96 227q0 133 93.5 226.5T480-160Z',
};

/**
 * Operation icons share a fixed frame. Most use the bundled Material Icons
 * font; a few use lightweight custom outlines when the filled glyph is too
 * visually heavy for the toolbar.
 */
export function AppIcon({
  name,
  color,
  size = APP_ICON_SIZE.navigation,
  style,
  testID,
}: AppIconProps): React.JSX.Element {
  if (name === 'erase') {
    const strokeWidth = Math.max(1.5, size / 12);
    const glyphWidth = size * 0.72;
    const glyphHeight = size * 0.38;
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[styles.frame, { height: size, width: size }, style]}
        testID={testID ?? 'app-icon-erase'}
      >
        <View
          style={[
            styles.eraser,
            {
              borderColor: color,
              borderRadius: glyphHeight * 0.22,
              borderWidth: strokeWidth,
              height: glyphHeight,
              width: glyphWidth,
            },
          ]}
          testID="app-icon-erase-outline"
        >
          <View
            style={{
              borderLeftColor: color,
              borderLeftWidth: strokeWidth,
              height: glyphHeight,
              width: glyphWidth * 0.34,
            }}
          />
        </View>
      </View>
    );
  }
  if (name === 'show' || name === 'hide' || name === 'color') {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[styles.frame, { height: size, width: size }, style]}
        testID={testID ?? `app-icon-${name}`}
      >
        <Svg
          height={size}
          testID={`app-icon-${name}-material-symbol`}
          viewBox="0 -960 960 960"
          width={size}
        >
          <Path d={MATERIAL_SYMBOL_PATHS[name]} fill={color} />
        </Svg>
      </View>
    );
  }
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
  eraser: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    overflow: 'hidden',
    transform: [{ rotate: '-45deg' }],
  },
  glyph: {
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
