import React, { forwardRef, useState } from 'react';
import {
  Platform,
  Pressable as NativePressable,
  PressableProps,
} from 'react-native';
import { useAppTheme } from '../theme';

export const TVPressable = forwardRef<
  React.ComponentRef<typeof NativePressable>,
  PressableProps
>(function TVFocusButton({ onFocus, onBlur, style, disabled, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  const { palette } = useAppTheme();
  return (
    <NativePressable
      {...props}
      ref={ref}
      disabled={disabled}
      focusable={!disabled && props.focusable !== false}
      onFocus={event => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={event => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={state => [
        typeof style === 'function' ? style(state) : style,
        focused &&
          !disabled && {
            outlineColor: palette.accent,
            outlineWidth: 3,
            outlineOffset: -3,
          },
      ]}
    />
  );
});

// Keep native touch behavior and component identity on phones/tablets/computers.
export const Pressable = Platform.isTV ? TVPressable : NativePressable;
