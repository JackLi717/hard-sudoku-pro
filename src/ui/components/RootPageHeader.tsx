import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ROOT_PAGE } from '../root-page-design';
import { AppPalette, useAppTheme } from '../theme';

export function RootPageHeader({
  title,
  backLabel,
  onBack,
  right,
  showDivider = false,
}: {
  title: string;
  backLabel?: string;
  onBack?(): void;
  right?: React.ReactNode;
  showDivider?: boolean;
}): React.JSX.Element {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={[styles.header, showDivider && styles.divided]}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            accessibilityLabel={backLabel}
            accessibilityRole="button"
            onPress={onBack}
            style={styles.back}
          >
            <Text style={styles.backText}>‹ {backLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    header: {
      alignItems: 'center',
      borderBottomColor: palette.line,
      borderBottomWidth: 0,
      flexDirection: 'row',
      minHeight: ROOT_PAGE.headerHeight,
      paddingHorizontal: ROOT_PAGE.headerHorizontalInset,
    },
    divided: { borderBottomWidth: 1 },
    side: { minWidth: ROOT_PAGE.headerSideWidth },
    right: {
      alignItems: 'flex-end',
      minWidth: ROOT_PAGE.headerSideWidth,
    },
    back: {
      justifyContent: 'center',
      minHeight: ROOT_PAGE.touchTarget,
      minWidth: ROOT_PAGE.headerSideWidth,
    },
    backText: { color: palette.accent, fontSize: 16, fontWeight: '700' },
    title: {
      color: palette.ink,
      flex: 1,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },
  });
}
