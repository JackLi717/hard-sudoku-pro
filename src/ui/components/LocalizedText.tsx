import React from 'react';
import {
  Text as NativeText,
  Platform,
  StyleSheet,
  TextProps,
} from 'react-native';
import { useLocalization } from '../../localization';

/** Prose follows the chosen app language; numeric notation keeps its reading order. */
export const LocalizedText = React.forwardRef<
  React.ElementRef<typeof NativeText>,
  TextProps
>(function LanguageText({ style, children, ...props }, ref) {
  const { direction } = useLocalization();
  const numeric =
    typeof children === 'number' ||
    (typeof children === 'string' && /^[\d\s:.,/×+−·–-]+$/.test(children));
  const textDirection = numeric ? 'ltr' : direction;
  // Android's text layout treats left/right as paragraph-relative in RTL.
  // Natural alignment follows the explicit paragraph direction for both scripts.
  const directionStyle =
    textDirection === 'rtl' && Platform.OS === 'android'
      ? textStyles.rtlAndroid
      : textStyles[textDirection];
  return (
    <NativeText {...props} ref={ref} style={[directionStyle, style]}>
      {children}
    </NativeText>
  );
});

const textStyles = StyleSheet.create({
  rtl: { direction: 'rtl', writingDirection: 'rtl', textAlign: 'right' },
  rtlAndroid: { direction: 'rtl', writingDirection: 'rtl', textAlign: 'auto' },
  ltr: { direction: 'ltr', writingDirection: 'ltr', textAlign: 'auto' },
});
