import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { CellIndex } from '../../domain/sudoku/contracts';
import { useLocalization } from '../../localization';
import { AppPalette, useAppTheme } from '../theme';

export type OnboardingBoardRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MultiSelectOnboardingOverlayProps = {
  boardRect?: OnboardingBoardRect | null;
  selectedCell?: CellIndex | null;
  onDismiss(): void;
};

function selectedCellRect(board: OnboardingBoardRect, cell: CellIndex) {
  const column = cell % 9;
  const row = Math.floor(cell / 9);
  return {
    x: board.x + (column * board.width) / 9,
    y: board.y + (row * board.height) / 9,
    width: board.width / 9,
    height: board.height / 9,
  };
}

export function MultiSelectOnboardingOverlay({
  boardRect = null,
  selectedCell = null,
  onDismiss,
}: MultiSelectOnboardingOverlayProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const { height, width } = useWindowDimensions();
  const textScale = Math.min(width, height) >= 600 ? 1.25 : 1;
  const styles = useMemo(
    () => createStyles(palette, textScale),
    [palette, textScale],
  );
  const [cardHeight, setCardHeight] = useState(190 * textScale);
  const [overlayHeight, setOverlayHeight] = useState(height);
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );
    return () => subscription.remove();
  }, []);
  const cardWidth = Math.max(
    0,
    Math.min(310 * textScale, (boardRect?.width ?? width) - 32),
  );
  const spotlight =
    boardRect && selectedCell !== null
      ? selectedCellRect(boardRect, selectedCell)
      : null;
  const preferredTop = boardRect
    ? boardRect.y + (boardRect.height - cardHeight) / 2
    : 0;
  const above = spotlight ? spotlight.y - cardHeight - 10 : preferredTop;
  const below = spotlight ? spotlight.y + spotlight.height + 10 : preferredTop;
  const top = boardRect
    ? Math.max(
        12,
        Math.min(
          overlayHeight - cardHeight - 12,
          Math.abs(above - preferredTop) <= Math.abs(below - preferredTop)
            ? above
            : below,
        ),
      )
    : undefined;

  return (
    <View
      accessibilityViewIsModal
      onLayout={event => setOverlayHeight(event.nativeEvent.layout.height)}
      style={styles.overlay}
      testID="multi-select-onboarding"
    >
      <Pressable
        accessibilityLabel={t('game.multiSelectDismiss')}
        accessibilityRole="button"
        onPress={onDismiss}
        style={StyleSheet.absoluteFill}
        testID="multi-select-onboarding-backdrop"
      />
      {spotlight ? (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.scrim,
              { top: 0, left: 0, right: 0, height: spotlight.y },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.scrim,
              {
                top: spotlight.y + spotlight.height,
                bottom: 0,
                left: 0,
                right: 0,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.scrim,
              {
                top: spotlight.y,
                left: 0,
                width: spotlight.x,
                height: spotlight.height,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.scrim,
              {
                top: spotlight.y,
                left: spotlight.x + spotlight.width,
                right: 0,
                height: spotlight.height,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.spotlight,
              {
                left: spotlight.x - 2,
                top: spotlight.y - 2,
                width: spotlight.width + 4,
                height: spotlight.height + 4,
              },
            ]}
            testID="multi-select-onboarding-spotlight"
          />
        </>
      ) : (
        <View pointerEvents="none" style={styles.fullScrim} />
      )}
      <View
        onLayout={event => {
          const measured = event.nativeEvent.layout.height;
          if (Math.abs(measured - cardHeight) > 1) setCardHeight(measured);
        }}
        style={[
          styles.card,
          { width: cardWidth },
          boardRect && {
            left: boardRect.x + (boardRect.width - cardWidth) / 2,
            position: 'absolute',
            top,
          },
        ]}
        testID="multi-select-onboarding-card"
      >
        <Text accessibilityRole="header" style={styles.title}>
          {t('game.multiSelectTitle')}
        </Text>
        <Text style={styles.body}>{t('game.multiSelectOnboarding')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onDismiss}
          style={styles.button}
          testID="multi-select-onboarding-got-it"
        >
          <Text style={styles.buttonText}>{t('game.multiSelectGotIt')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(palette: AppPalette, textScale: number) {
  return StyleSheet.create({
    overlay: {
      alignItems: 'center',
      bottom: 0,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 20,
    },
    fullScrim: {
      backgroundColor: 'rgba(16, 25, 38, 0.35)',
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    scrim: {
      backgroundColor: 'rgba(16, 25, 38, 0.35)',
      position: 'absolute',
    },
    spotlight: {
      borderColor: palette.accent,
      borderRadius: 5,
      borderWidth: 3,
      position: 'absolute',
    },
    card: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.line,
      borderRadius: 16,
      borderWidth: 1,
      elevation: 10,
      padding: 18 * textScale,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 18,
    },
    title: {
      color: palette.ink,
      fontSize: 17 * textScale,
      fontWeight: '800',
      marginBottom: 10 * textScale,
    },
    body: {
      color: palette.ink,
      fontSize: 13 * textScale,
      lineHeight: 20 * textScale,
    },
    button: {
      alignSelf: 'flex-end',
      backgroundColor: palette.accent,
      borderRadius: 10,
      justifyContent: 'center',
      marginTop: 16 * textScale,
      minHeight: 42,
      paddingHorizontal: 18 * textScale,
    },
    buttonText: {
      color: palette.white,
      fontSize: 13 * textScale,
      fontWeight: '800',
    },
  });
}
