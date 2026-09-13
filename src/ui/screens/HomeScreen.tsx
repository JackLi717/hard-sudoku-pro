import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { OfflineGameSnapshot } from '../../application';
import { DifficultyLevel } from '../../domain/hints/techniques';
import { useLocalization } from '../../localization';
import { LevelPickerModal } from '../components/LevelPickerModal';
import { ROOT_PAGE } from '../root-page-design';
import { useScreenScroll } from '../screen-state';
import { AppPalette, useAppTheme } from '../theme';

type HomeScreenProps = {
  snapshot: OfflineGameSnapshot;
  onResume(): void;
  onStart(level: DifficultyLevel): void;
  onOpenSettings(): void;
  onOpenHintLab?(): void;
  onOpenCompletionPreview?(): void;
  onTopUpDebugCredits?(): void;
};

function formatElapsed(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(
    2,
    '0',
  )}`;
}

export function HomeScreen({
  snapshot,
  onResume,
  onStart,
  onOpenSettings,
  onOpenHintLab,
  onOpenCompletionPreview,
  onTopUpDebugCredits,
}: HomeScreenProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const scroll = useScreenScroll('home');
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const [developerMenuOpen, setDeveloperMenuOpen] = useState(false);
  const resumable = snapshot.resumable && snapshot.session !== null;
  const developerToolsAvailable =
    __DEV__ &&
    (onOpenHintLab || onOpenCompletionPreview || onTopUpDebugCredits);

  const startLevel = (level: DifficultyLevel) => {
    setLevelPickerOpen(false);
    onStart(level);
  };
  const openDeveloperTool = (operation: () => void) => {
    setDeveloperMenuOpen(false);
    operation();
  };

  return (
    <>
      <ScrollView {...scroll} contentContainerStyle={styles.content}>
        <View style={styles.appBar}>
          <Pressable
            accessibilityLabel={t('home.settings')}
            accessibilityRole="button"
            onLongPress={
              developerToolsAvailable
                ? () => setDeveloperMenuOpen(true)
                : undefined
            }
            onPress={onOpenSettings}
            style={({ pressed }) => [
              styles.settingsButton,
              pressed && styles.pressed,
            ]}
            testID="home-settings"
          >
            <Text
              accessibilityElementsHidden
              allowFontScaling={false}
              style={styles.settingsIcon}
            >
              ⚙︎
            </Text>
          </Pressable>
        </View>

        <View style={styles.main}>
          <Text accessibilityRole="header" style={styles.brandName}>
            {t('home.title')}
          </Text>

          <View style={styles.actions}>
            {resumable && snapshot.session ? (
              <Pressable
                accessibilityLabel={`${t('home.continue')}, ${t(
                  'home.difficulty',
                  {
                    level: snapshot.session.state.difficultyLevel,
                  },
                )}, ${formatElapsed(snapshot.session.state.timer.elapsedMs)}`}
                accessibilityRole="button"
                disabled={snapshot.busy}
                onPress={onResume}
                style={({ pressed }) => [
                  styles.continueButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.continueLabel}>{t('home.continue')}</Text>
                <Text style={styles.continueMeta}>
                  {t('home.difficulty', {
                    level: snapshot.session.state.difficultyLevel,
                  })}{' '}
                  · {formatElapsed(snapshot.session.state.timer.elapsedMs)}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              accessibilityHint={t('home.newGameHint')}
              accessibilityLabel={t('home.startNewGame')}
              accessibilityRole="button"
              disabled={snapshot.busy}
              onPress={() => setLevelPickerOpen(true)}
              style={({ pressed }) => [
                styles.newGameButton,
                !resumable && styles.newGameButtonPrimary,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.newGameLabel,
                  !resumable && styles.newGameLabelPrimary,
                ]}
              >
                {t('home.startNewGame')}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <LevelPickerModal
        busy={snapshot.busy}
        completedByLevel={snapshot.completedByLevel}
        onClose={() => setLevelPickerOpen(false)}
        onSelect={startLevel}
        visible={levelPickerOpen}
      />

      {developerToolsAvailable ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setDeveloperMenuOpen(false)}
          transparent
          visible={developerMenuOpen}
        >
          <View style={styles.modalBackdrop}>
            <Pressable
              accessibilityLabel={t('home.closeMore')}
              accessibilityRole="button"
              onPress={() => setDeveloperMenuOpen(false)}
              style={StyleSheet.absoluteFill}
            />
            <View accessibilityViewIsModal style={styles.menuSheet}>
              <Text accessibilityRole="header" style={styles.menuTitle}>
                {t('home.developerTools')}
              </Text>
              {onOpenCompletionPreview ? (
                <Pressable
                  accessibilityLabel={t('home.completionPreview')}
                  accessibilityRole="button"
                  onPress={() => openDeveloperTool(onOpenCompletionPreview)}
                  style={styles.menuItem}
                  testID="home-completion-preview"
                >
                  <Text style={styles.menuItemText}>
                    {t('home.completionPreview')}
                  </Text>
                </Pressable>
              ) : null}
              {onOpenHintLab ? (
                <Pressable
                  accessibilityLabel={t('home.hintLab')}
                  accessibilityRole="button"
                  onPress={() => openDeveloperTool(onOpenHintLab)}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuItemText}>{t('home.hintLab')}</Text>
                </Pressable>
              ) : null}
              {onTopUpDebugCredits ? (
                <Pressable
                  accessibilityLabel={t('home.debugCredits')}
                  accessibilityRole="button"
                  disabled={snapshot.busy}
                  onPress={() => openDeveloperTool(onTopUpDebugCredits)}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuItemText}>
                    {t('home.debugCredits')}
                  </Text>
                  <Text style={styles.menuItemMeta}>
                    {t('home.debugCreditBalance', {
                      hints: snapshot.wallet.smart_hint.balance,
                      pencils: snapshot.wallet.quick_pencil.balance,
                    })}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    content: {
      alignItems: 'center',
      flexGrow: 1,
      paddingBottom: 32,
      paddingHorizontal: 28,
      paddingTop: 12,
    },
    appBar: {
      alignItems: 'flex-end',
      maxWidth: 480,
      width: '100%',
    },
    settingsButton: {
      alignItems: 'center',
      height: ROOT_PAGE.iconActionSize,
      justifyContent: 'center',
      width: ROOT_PAGE.iconActionSize,
    },
    settingsIcon: {
      color: palette.accent,
      fontSize: 23,
      lineHeight: 28,
    },
    main: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      maxWidth: 480,
      minHeight: 430,
      paddingBottom: 36,
      width: '100%',
    },
    brandName: {
      color: palette.ink,
      fontSize: 34,
      fontWeight: '700',
      letterSpacing: -1.1,
      lineHeight: 42,
      textAlign: 'center',
    },
    actions: {
      alignItems: 'center',
      gap: 12,
      marginTop: 58,
      maxWidth: 350,
      width: '100%',
    },
    continueButton: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 16,
      justifyContent: 'center',
      minHeight: 72,
      paddingHorizontal: 24,
      paddingVertical: 12,
      width: '100%',
    },
    continueLabel: {
      color: palette.background,
      fontSize: 18,
      fontWeight: '700',
      lineHeight: 24,
    },
    continueMeta: {
      color: palette.background,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 4,
      opacity: 0.82,
    },
    newGameButton: {
      alignItems: 'center',
      borderRadius: 18,
      justifyContent: 'center',
      minHeight: 60,
      width: '100%',
    },
    newGameButtonPrimary: {
      backgroundColor: palette.accent,
      minHeight: 70,
    },
    newGameLabel: {
      color: palette.accent,
      fontSize: 17,
      fontWeight: '700',
      lineHeight: 24,
    },
    newGameLabelPrimary: {
      color: palette.background,
    },
    modalBackdrop: {
      backgroundColor: palette.overlay,
      flex: 1,
      justifyContent: 'flex-end',
      padding: 12,
    },
    menuSheet: {
      backgroundColor: palette.surface,
      borderRadius: 22,
      padding: 20,
    },
    menuTitle: {
      color: palette.ink,
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 8,
    },
    menuItem: {
      justifyContent: 'center',
      minHeight: 56,
    },
    menuItemText: {
      color: palette.ink,
      fontSize: 15,
    },
    menuItemMeta: {
      color: palette.muted,
      fontSize: 11,
    },
    pressed: {
      opacity: 0.72,
    },
  });
}
