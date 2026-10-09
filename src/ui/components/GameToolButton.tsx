import { LocalizedText as Text } from './LocalizedText';
import React, { useMemo } from 'react';
import { Pressable } from './FocusablePressable';
import { Animated, View } from 'react-native';
import { useLocalization } from '../../localization';
import { useAppTheme } from '../theme';
import { AppIcon, APP_ICON_SIZE, type AppIconName } from './AppIcon';
import { createGameInputStyles } from './game-input-styles';

type ToolButtonProps = {
  label: string;
  icon: AppIconName;
  accessibilityHint?: string;
  accessibilityLabel?: string;
  feedbackOpacity?: Animated.Value;
  active?: boolean;
  badge?: number | '∞';
  disabled?: boolean;
  dimWhenDisabled?: boolean;
  landscape?: boolean;
  compactLandscape?: boolean;
  testID?: string;
  textScale: number;
  onPress(): void;
  onLongPress?(): void;
};

export function GameToolButton({
  label,
  icon,
  accessibilityHint,
  accessibilityLabel,
  active = false,
  badge,
  disabled = false,
  dimWhenDisabled = true,
  landscape = false,
  compactLandscape = false,
  testID,
  textScale,
  feedbackOpacity,
  onPress,
  onLongPress,
}: ToolButtonProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(
    () => createGameInputStyles(palette, textScale),
    [palette, textScale],
  );
  const accessibilityParts = [accessibilityLabel ?? label];
  if (active) {
    accessibilityParts.push(t('game.active'));
  }
  if (badge === '∞') {
    accessibilityParts.push(t('credits.betaUnlimitedSmartHints'));
  } else if (badge !== undefined) {
    accessibilityParts.push(t('game.remaining', { count: badge }));
  }
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityParts.join(', ')}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.tool,
        !landscape && styles.toolPortrait,
        disabled && dimWhenDisabled && styles.toolDisabled,
        landscape && styles.toolLandscape,
        compactLandscape && styles.toolCompactLandscape,
        pressed && styles.pressed,
      ]}
      testID={testID}
    >
      <View style={styles.toolIcon} testID="tool-icon-frame">
        <AppIcon
          color={active ? palette.accent : palette.ink}
          name={icon}
          size={APP_ICON_SIZE.navigation}
        />
        {typeof badge === 'number' && badge <= 99 ? (
          <View
            pointerEvents="none"
            style={[
              styles.badge,
              badge >= 10 && styles.badgeTwoDigits,
              badge === 0 && styles.badgeEmpty,
            ]}
            testID="tool-low-balance-badge"
          >
            <Text
              allowFontScaling={false}
              style={[styles.badgeText, badge === 0 && styles.badgeTextEmpty]}
            >
              {badge === 0 ? 'AD' : badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        adjustsFontSizeToFit={!landscape}
        minimumFontScale={0.85}
        maxFontSizeMultiplier={1.3}
        numberOfLines={landscape || label.includes(' ') ? 2 : 1}
        style={[
          styles.toolLabel,
          !landscape && styles.toolLabelPortrait,
          compactLandscape && styles.toolLabelCompactLandscape,
          active && styles.toolLabelActive,
        ]}
      >
        {label}
      </Text>
      {feedbackOpacity ? (
        <Animated.View
          accessible={false}
          pointerEvents="none"
          style={[styles.toolFeedback, { opacity: feedbackOpacity }]}
          testID={`game-tool-feedback-${testID ?? label}`}
        />
      ) : null}
    </Pressable>
  );
}
