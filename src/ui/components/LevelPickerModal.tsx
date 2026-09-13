import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { DifficultyLevel } from '../../domain/hints/techniques';
import { TranslationKey, useLocalization } from '../../localization';
import { AppPalette, useAppTheme } from '../theme';

export type LevelPickerModalProps = {
  visible: boolean;
  busy: boolean;
  completedByLevel: Readonly<Record<DifficultyLevel, number>>;
  onClose(): void;
  onSelect(level: DifficultyLevel): void;
};

const LEVELS: readonly DifficultyLevel[] = [1, 2, 3, 4, 5];
const LEVEL_DESCRIPTION_KEYS: Readonly<
  Record<DifficultyLevel, TranslationKey>
> = {
  1: 'home.levelDescription1',
  2: 'home.levelDescription2',
  3: 'home.levelDescription3',
  4: 'home.levelDescription4',
  5: 'home.levelDescription5',
};

export function LevelPickerModal({
  visible,
  busy,
  completedByLevel,
  onClose,
  onSelect,
}: LevelPickerModalProps): React.JSX.Element | null {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.modalBackdrop} testID="level-picker-modal">
        <Pressable
          accessibilityLabel={t('home.closeLevelPicker')}
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
          testID="level-picker-backdrop"
        />
        <View accessibilityViewIsModal style={styles.levelSheet}>
          <View style={styles.menuHandle} />
          <Text accessibilityRole="header" style={styles.sheetTitle}>
            {t('home.chooseLevel')}
          </Text>
          <Text style={styles.sheetSubtitle}>
            {t('home.chooseLevelSubtitle')}
          </Text>
          <ScrollView style={styles.levelScroll}>
            {LEVELS.map((level, index) => (
              <Pressable
                accessibilityHint={t(LEVEL_DESCRIPTION_KEYS[level])}
                accessibilityLabel={`${t('home.startLevel', {
                  level,
                })}, ${t('home.completed', {
                  count: completedByLevel[level],
                })}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                key={level}
                onPress={() => onSelect(level)}
                style={({ pressed }) => [
                  styles.levelOption,
                  index > 0 && styles.menuItemBorder,
                  pressed && styles.pressed,
                ]}
                testID={`level-picker-option-${level}`}
              >
                <View style={styles.levelCopy}>
                  <Text style={styles.levelTitle}>
                    {t('home.difficulty', { level })}
                  </Text>
                  <Text style={styles.levelDescription}>
                    {t(LEVEL_DESCRIPTION_KEYS[level])}
                  </Text>
                  <Text style={styles.levelMeta}>
                    {t('home.completed', {
                      count: completedByLevel[level],
                    })}
                  </Text>
                </View>
                <Text allowFontScaling={false} style={styles.menuItemArrow}>
                  ›
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    modalBackdrop: {
      backgroundColor: palette.overlay,
      flex: 1,
      justifyContent: 'flex-end',
      padding: 12,
    },
    levelSheet: {
      backgroundColor: palette.surface,
      borderRadius: 24,
      maxHeight: '88%',
      paddingBottom: 10,
      paddingHorizontal: 10,
      paddingTop: 10,
    },
    levelScroll: { marginTop: 10 },
    menuHandle: {
      alignSelf: 'center',
      backgroundColor: palette.line,
      borderRadius: 2,
      height: 4,
      marginBottom: 12,
      width: 38,
    },
    sheetTitle: {
      color: palette.ink,
      fontSize: 20,
      fontWeight: '800',
      paddingHorizontal: 8,
    },
    sheetSubtitle: {
      color: palette.muted,
      fontSize: 13,
      lineHeight: 18,
      paddingHorizontal: 8,
      paddingTop: 5,
    },
    levelOption: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 78,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    menuItemBorder: {
      borderColor: palette.line,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    levelCopy: { flex: 1 },
    levelTitle: {
      color: palette.ink,
      fontSize: 15,
      fontWeight: '800',
    },
    levelDescription: {
      color: palette.muted,
      fontSize: 12,
      marginTop: 2,
    },
    levelMeta: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: '700',
      marginTop: 3,
    },
    menuItemArrow: {
      color: palette.muted,
      fontSize: 24,
      marginLeft: 8,
    },
    pressed: { opacity: 0.68 },
  });
}
