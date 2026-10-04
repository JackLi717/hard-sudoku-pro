import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { OfflineGameSnapshot } from '../../application';
import { DifficultyLevel } from '../../domain/hints/techniques';
import { useLocalization } from '../../localization';
import { LESSON_COPY } from '../../localization/lesson-copy';
import { APP_ICON_SIZE, AppIcon } from '../components/AppIcon';
import { HomeBrandEmblem } from '../components/HomeBrandEmblem';
import { LevelPickerModal } from '../components/LevelPickerModal';
import { ROOT_PAGE } from '../root-page-design';
import { useScreenScroll } from '../screen-state';
import { AppPalette, useAppTheme } from '../theme';
import {
  useAdaptiveLayout,
  useContainerLayout,
} from '../layout/adaptive-layout';

type HomeScreenProps = {
  snapshot: OfflineGameSnapshot;
  onResume(): void;
  onStart(level: DifficultyLevel): void;
  onOpenSettings(): void;
  onOpenLessons?(): void;
  onOpenHintLab?(): void;
  onOpenCompletionPreview?(): void;
  onTopUpDebugCredits?(): void;
};

const BRAND_FONT = Platform.select({ ios: 'Georgia', default: 'serif' });

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
  onOpenLessons,
  onOpenHintLab,
  onOpenCompletionPreview,
  onTopUpDebugCredits,
}: HomeScreenProps): React.JSX.Element {
  const { t, locale } = useLocalization();
  const { palette } = useAppTheme();
  const container = useContainerLayout();
  const { useLandscapeTabletLayout, widthClass } = useAdaptiveLayout(container);
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
      <ScrollView
        {...scroll}
        onLayout={container.onLayout}
        contentContainerStyle={styles.content}
      >
        <View
          style={[styles.appBar, widthClass !== 'compact' && styles.appBarWide]}
          testID="home-app-bar"
        >
          <Text style={styles.brandWordmark}>
            {t('home.brandByline').toUpperCase()}
          </Text>
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
            <AppIcon
              color={palette.ink}
              name="settings"
              size={APP_ICON_SIZE.navigation}
            />
          </Pressable>
        </View>

        <View
          style={[
            styles.main,
            useLandscapeTabletLayout && styles.mainLandscape,
          ]}
          testID={
            useLandscapeTabletLayout
              ? 'home-landscape-layout'
              : 'home-portrait-layout'
          }
        >
          <View
            style={[
              styles.primaryPane,
              useLandscapeTabletLayout && styles.primaryPaneLandscape,
            ]}
            testID="home-primary-pane"
          >
            {!useLandscapeTabletLayout ? (
              <View
                style={styles.brandTopSpace}
                testID="home-brand-top-space"
              />
            ) : null}
            <View style={styles.brandGroup}>
              <HomeBrandEmblem />
              <Text
                accessibilityRole="header"
                style={[
                  styles.brandName,
                  container.width < 360 && styles.brandNameCompact,
                  useLandscapeTabletLayout && styles.brandNameLandscape,
                ]}
              >
                {t('home.title')}
              </Text>
              <Text style={styles.brandSubtitle}>{t('home.subtitle')}</Text>
            </View>
            {!useLandscapeTabletLayout ? (
              <View
                style={styles.brandActionSpace}
                testID="home-brand-action-space"
              />
            ) : null}

            <View
              style={[
                styles.actions,
                useLandscapeTabletLayout && styles.actionsLandscape,
              ]}
              testID="home-actions"
            >
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
                  <View style={styles.continueCopy}>
                    <Text style={styles.continueLabel}>
                      {t('home.continue')}
                    </Text>
                    <Text style={styles.continueMeta}>
                      {t('home.difficulty', {
                        level: snapshot.session.state.difficultyLevel,
                      })}{' '}
                      · {formatElapsed(snapshot.session.state.timer.elapsedMs)}
                    </Text>
                  </View>
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
                <AppIcon
                  color={resumable ? palette.accent : palette.background}
                  name="plus"
                  size={APP_ICON_SIZE.standard}
                />
                <Text
                  style={[
                    styles.newGameLabel,
                    !resumable && styles.newGameLabelPrimary,
                  ]}
                >
                  {t('home.startNewGame')}
                </Text>
              </Pressable>
              {onOpenLessons ? (
                <Pressable
                  accessibilityLabel={LESSON_COPY[locale].title}
                  accessibilityRole="button"
                  onPress={onOpenLessons}
                  style={({ pressed }) => [
                    styles.lessonsButton,
                    pressed && styles.pressed,
                  ]}
                  testID="home-lessons"
                >
                  <AppIcon
                    color={palette.accent}
                    name="localLibrary"
                    size={APP_ICON_SIZE.standard}
                  />
                  <Text style={styles.newGameLabel}>
                    {LESSON_COPY[locale].title}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          {useLandscapeTabletLayout ? (
            <View style={styles.progressPane} testID="home-level-progress">
              <Text accessibilityRole="header" style={styles.progressTitle}>
                {t('statistics.byLevel')}
              </Text>
              {([1, 2, 3, 4, 5] as const).map((level, index) => (
                <View
                  accessible
                  accessibilityLabel={`${t('home.level', { level })}, ${
                    snapshot.completedByLevel[level]
                  }`}
                  key={level}
                  style={[
                    styles.progressRow,
                    index === 4 && styles.progressRowLast,
                  ]}
                >
                  <Text style={styles.progressLabel}>
                    {t('home.level', { level })}
                  </Text>
                  <Text style={styles.progressValue}>
                    {snapshot.completedByLevel[level]}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <Text
          accessibilityLabel={t('home.brandByline')}
          style={styles.brandByline}
        >
          {t('home.brandByline')}
        </Text>
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
                {t('settings.developerTools')}
              </Text>
              {onOpenCompletionPreview ? (
                <Pressable
                  accessibilityLabel={t('settings.completionPreview')}
                  accessibilityRole="button"
                  onPress={() => openDeveloperTool(onOpenCompletionPreview)}
                  style={styles.menuItem}
                  testID="home-completion-preview"
                >
                  <Text style={styles.menuItemText}>
                    {t('settings.completionPreview')}
                  </Text>
                </Pressable>
              ) : null}
              {onOpenHintLab ? (
                <Pressable
                  accessibilityLabel={t('settings.hintLab')}
                  accessibilityRole="button"
                  onPress={() => openDeveloperTool(onOpenHintLab)}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuItemText}>
                    {t('settings.hintLab')}
                  </Text>
                </Pressable>
              ) : null}
              {onTopUpDebugCredits ? (
                <Pressable
                  accessibilityLabel={t('settings.debugCredits')}
                  accessibilityRole="button"
                  disabled={snapshot.busy}
                  onPress={() => openDeveloperTool(onTopUpDebugCredits)}
                  style={styles.menuItem}
                >
                  <Text style={styles.menuItemText}>
                    {t('settings.debugCredits')}
                  </Text>
                  <Text style={styles.menuItemMeta}>
                    {t('settings.debugCreditBalance', {
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
      paddingBottom: 20,
      paddingHorizontal: 28,
      paddingTop: 12,
    },
    appBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      maxWidth: 480,
      width: '100%',
    },
    appBarWide: { maxWidth: '100%' },
    brandWordmark: {
      color: palette.accent,
      flexShrink: 1,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 2.4,
      lineHeight: 17,
      marginRight: 12,
    },
    settingsButton: {
      alignItems: 'center',
      height: ROOT_PAGE.iconActionSize,
      justifyContent: 'center',
      width: ROOT_PAGE.iconActionSize,
    },
    main: {
      alignItems: 'center',
      flexGrow: 1,
      justifyContent: 'center',
      maxWidth: 480,
      minHeight: 450,
      paddingBottom: 20,
      width: '100%',
    },
    mainLandscape: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 34,
      justifyContent: 'center',
      maxWidth: 960,
      paddingBottom: 30,
      paddingHorizontal: 40,
      paddingTop: 30,
    },
    primaryPane: {
      alignItems: 'center',
      flexGrow: 1,
      width: '100%',
    },
    primaryPaneLandscape: {
      flex: 1,
      justifyContent: 'center',
      maxWidth: 480,
      minWidth: 0,
      width: 'auto',
    },
    brandGroup: { alignItems: 'center', width: '100%' },
    brandTopSpace: { flexGrow: 1, minHeight: 24 },
    brandActionSpace: { flexGrow: 2, minHeight: 40 },
    brandName: {
      color: palette.ink,
      fontFamily: BRAND_FONT,
      fontSize: 41,
      fontWeight: '400',
      letterSpacing: -1.2,
      lineHeight: 50,
      textAlign: 'center',
      width: '100%',
    },
    brandNameCompact: { fontSize: 34, lineHeight: 44 },
    brandNameLandscape: { fontSize: 36, lineHeight: 44 },
    brandSubtitle: {
      color: palette.muted,
      fontSize: 12,
      letterSpacing: 1.2,
      lineHeight: 20,
      marginTop: 12,
      textAlign: 'center',
    },
    brandByline: {
      color: palette.muted,
      fontSize: 10,
      fontWeight: '500',
      letterSpacing: 2.6,
      lineHeight: 18,
      marginTop: 8,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    actions: {
      alignItems: 'center',
      gap: 10,
      maxWidth: 350,
      width: '100%',
    },
    actionsLandscape: { marginTop: 36, maxWidth: 390 },
    progressPane: {
      borderColor: palette.line,
      borderLeftWidth: 1,
      flex: 0.86,
      maxWidth: 400,
      minWidth: 330,
      paddingLeft: 34,
    },
    progressTitle: {
      color: palette.ink,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 6,
    },
    progressRow: {
      alignItems: 'center',
      borderBottomColor: palette.line,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      minHeight: 52,
    },
    progressRowLast: { borderBottomWidth: 0 },
    progressLabel: { color: palette.ink, flex: 1, fontSize: 15 },
    progressValue: {
      color: palette.accent,
      fontSize: 17,
      fontWeight: '700',
    },
    continueButton: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 17,
      justifyContent: 'center',
      minHeight: 64,
      paddingHorizontal: 20,
      paddingVertical: 8,
      width: '100%',
    },
    continueCopy: { alignItems: 'center', width: '100%' },
    continueLabel: {
      color: palette.background,
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 24,
      textAlign: 'center',
    },
    continueMeta: {
      color: palette.background,
      fontSize: 12,
      lineHeight: 19,
      marginTop: 3,
      opacity: 0.9,
      textAlign: 'center',
    },
    newGameButton: {
      alignItems: 'center',
      borderColor: palette.accent,
      borderRadius: 17,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      minHeight: 52,
      paddingHorizontal: 20,
      paddingVertical: 12,
      width: '100%',
    },
    newGameButtonPrimary: {
      backgroundColor: palette.accent,
      minHeight: 70,
    },
    lessonsButton: {
      alignItems: 'center',
      borderColor: palette.line,
      borderRadius: 17,
      borderWidth: 1,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'center',
      minHeight: 52,
      paddingHorizontal: 20,
      paddingVertical: 12,
      width: '100%',
    },
    newGameLabel: {
      color: palette.accent,
      flexShrink: 1,
      fontSize: 15,
      fontWeight: '500',
      lineHeight: 24,
      textAlign: 'center',
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
