import { useScreenScroll } from '../screen-state';
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
import { TranslationKey, useLocalization } from '../../localization';
import { AppPalette, useAppTheme } from '../theme';

type HomeScreenProps = {
  snapshot: OfflineGameSnapshot;
  onResume(): void;
  onStart(level: DifficultyLevel): void;
  onOpenSettings(): void;
  onOpenPremium?(): void;
  onOpenQuickCandidatesTopUp?(): void;
  onOpenSmartHintTopUp?(): void;
  onOpenStatistics?(): void;
  onOpenHelp?(): void;
  onOpenHintLab?(): void;
  onOpenReplays?(): void;
  onTopUpDebugCredits?(): void;
};

type MenuLink = {
  hint?: string;
  icon: HomeIconName;
  label: string;
  testID?: string;
  onPress(): void;
};

type HomeIconName =
  | 'help'
  | 'more'
  | 'plus'
  | 'replay'
  | 'settings'
  | 'statistics';

const LEVELS: readonly DifficultyLevel[] = [1, 2, 3, 4, 5];
const BRAND_ROWS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
] as const;
const SETTINGS_TEETH = [0, 45, 90, 135, 180, 225, 270, 315] as const;
const LEVEL_DESCRIPTION_KEYS: Readonly<
  Record<DifficultyLevel, TranslationKey>
> = {
  1: 'home.levelDescription1',
  2: 'home.levelDescription2',
  3: 'home.levelDescription3',
  4: 'home.levelDescription4',
  5: 'home.levelDescription5',
};

function formatElapsed(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(
    2,
    '0',
  )}`;
}

function gameProgress(snapshot: OfflineGameSnapshot): number {
  const state = snapshot.session?.state;
  if (!state) {
    return 0;
  }
  const openCells = state.givens.filter(value => value === null).length;
  const filledOpenCells = state.values.reduce(
    (count, value, index) =>
      state.givens[index] === null && value !== null ? count + 1 : count,
    0,
  );
  return openCells === 0
    ? 100
    : Math.round((filledOpenCells / openCells) * 100);
}

function HomeIcon({
  name,
  styles,
}: {
  name: HomeIconName;
  styles: ReturnType<typeof createStyles>;
}): React.JSX.Element {
  if (name === 'settings') {
    return (
      <View style={styles.settingsIcon}>
        {SETTINGS_TEETH.map(rotation => (
          <View
            key={rotation}
            style={[
              styles.settingsToothTrack,
              { transform: [{ rotate: `${rotation}deg` }] },
            ]}
          >
            <View style={styles.settingsTooth} />
          </View>
        ))}
        <View style={styles.settingsRing}>
          <View style={styles.settingsHole} />
        </View>
      </View>
    );
  }

  if (name === 'statistics') {
    return (
      <View style={styles.iconCanvas}>
        <View style={[styles.chartBar, styles.chartBarShort]} />
        <View style={[styles.chartBar, styles.chartBarMedium]} />
        <View style={[styles.chartBar, styles.chartBarTall]} />
      </View>
    );
  }

  if (name === 'more') {
    return (
      <View style={styles.moreGrid}>
        {[0, 1, 2, 3].map(index => (
          <View key={index} style={styles.moreGridCell} />
        ))}
      </View>
    );
  }

  if (name === 'plus') {
    return (
      <View style={styles.plusIcon}>
        <View style={styles.plusHorizontal} />
        <View style={styles.plusVertical} />
      </View>
    );
  }

  if (name === 'help') {
    return (
      <View style={styles.helpIconCircle}>
        <Text allowFontScaling={false} style={styles.helpIconText}>
          ?
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.replayIcon}>
      <View style={styles.replayRing} />
      <View style={styles.replayRingGap} />
      <View style={styles.replayArrowShaft} />
      <View style={styles.replayArrowHead} />
      <View style={styles.replayClockVertical} />
      <View style={styles.replayClockHorizontal} />
    </View>
  );
}

function HomeAidCard({
  balance,
  label,
  onPress,
  styles,
}: {
  balance: string;
  label: string;
  onPress?(): void;
  styles: ReturnType<typeof createStyles>;
}): React.JSX.Element {
  const content = (
    <>
      <View style={styles.creditCopy}>
        <Text style={styles.creditLabel}>{label}</Text>
        <Text style={styles.creditBalance}>{balance}</Text>
      </View>
      {onPress ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.creditSymbol}
        >
          <HomeIcon name="plus" styles={styles} />
        </View>
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={styles.creditCard}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={`${label}, ${balance}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.creditCard, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

export function HomeScreen({
  snapshot,
  onResume,
  onStart,
  onOpenSettings,
  onOpenPremium,
  onOpenQuickCandidatesTopUp,
  onOpenSmartHintTopUp,
  onOpenStatistics,
  onOpenHelp,
  onOpenHintLab,
  onOpenReplays,
  onTopUpDebugCredits,
}: HomeScreenProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const scroll = useScreenScroll('home');
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const resumable = snapshot.resumable && snapshot.session !== null;
  const progress = gameProgress(snapshot);
  // Keep the four launch capabilities visible. New low-frequency modules
  // belong in More until they justify a permanent Home slot.
  const shortcutLinks: MenuLink[] = [];
  if (onOpenReplays) {
    shortcutLinks.push({
      hint: t('home.replayNote'),
      icon: 'replay',
      label: t('home.replay'),
      testID: 'home-replay-history',
      onPress: onOpenReplays,
    });
  }
  if (onOpenStatistics) {
    shortcutLinks.push({
      icon: 'statistics',
      label: t('home.statistics'),
      onPress: onOpenStatistics,
    });
  }
  if (onOpenHelp) {
    shortcutLinks.push({
      icon: 'help',
      label: t('home.help'),
      onPress: onOpenHelp,
    });
  }
  const moreLinks: MenuLink[] = [
    {
      icon: 'settings',
      label: t('home.settings'),
      onPress: onOpenSettings,
    },
  ];

  const openFromMenu = (operation: () => void) => {
    setMoreOpen(false);
    operation();
  };
  const startLevel = (level: DifficultyLevel) => {
    setLevelPickerOpen(false);
    onStart(level);
  };

  return (
    <>
      <ScrollView
        {...scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.appBar}>
          <View style={styles.brand}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.brandMark}
              testID="home-brand-mark"
            >
              {BRAND_ROWS.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.brandRow}>
                  {row.map(index => (
                    <View
                      key={index}
                      style={[
                        styles.brandCell,
                        [0, 4, 8].includes(index) && styles.brandCellStrong,
                      ]}
                    />
                  ))}
                </View>
              ))}
            </View>
            <Text style={styles.brandName}>{t('home.title')}</Text>
          </View>
          <View style={styles.headerActions}>
            {onOpenPremium ? (
              <Pressable
                accessibilityLabel={t('home.premium')}
                accessibilityRole="button"
                onPress={onOpenPremium}
                style={({ pressed }) => [
                  styles.premiumButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.premiumLabel}>{t('home.premium')}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel={t('home.settings')}
              accessibilityRole="button"
              onPress={onOpenSettings}
              style={({ pressed }) => [
                styles.headerIconButton,
                pressed && styles.pressed,
              ]}
            >
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <HomeIcon name="settings" styles={styles} />
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>
            {resumable ? t('home.resumeEyebrow') : t('home.newGameEyebrow')}
          </Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            {resumable ? t('home.resumeHeroTitle') : t('home.newHeroTitle')}
          </Text>
          <Text style={styles.subtitle}>
            {resumable ? t('home.focusSubtitle') : t('home.subtitle')}
          </Text>
        </View>

        <View style={styles.primaryActions}>
          {resumable && snapshot.session ? (
            <Pressable
              accessibilityLabel={`${t('home.continue')}, ${t(
                'home.difficulty',
                {
                  level: snapshot.session.state.difficultyLevel,
                },
              )}, ${t('home.progressPercent', { progress })}`}
              accessibilityRole="button"
              disabled={snapshot.busy}
              onPress={onResume}
              style={({ pressed }) => [
                styles.continueCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.continueHeader}>
                <Text style={styles.continueLabel}>{t('home.continue')}</Text>
                <Text style={styles.continueProgressText}>
                  {t('home.progressPercent', { progress })}
                </Text>
              </View>
              <View style={styles.continueBody}>
                <View>
                  <Text style={styles.continueTitle}>
                    {t('home.difficulty', {
                      level: snapshot.session.state.difficultyLevel,
                    })}
                  </Text>
                  <Text style={styles.continueMeta}>
                    {t('home.resumeTime', {
                      time: formatElapsed(
                        snapshot.session.state.timer.elapsedMs,
                      ),
                    })}
                  </Text>
                </View>
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={styles.continueArrowCircle}
                >
                  <View style={styles.continueArrowIcon}>
                    <View style={styles.continueArrowLine} />
                    <View style={styles.continueArrowHead} />
                  </View>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityHint={t('home.newGameHint')}
            accessibilityLabel={
              resumable ? t('home.startNewGame') : t('home.chooseLevelAndStart')
            }
            accessibilityRole="button"
            disabled={snapshot.busy}
            onPress={() => setLevelPickerOpen(true)}
            style={({ pressed }) => [
              styles.newGameButton,
              !resumable && styles.newGameButtonPrimary,
              pressed && styles.pressed,
            ]}
          >
            <View>
              <Text
                style={[
                  styles.newGameTitle,
                  !resumable && styles.newGameTitlePrimary,
                ]}
              >
                {resumable
                  ? t('home.startNewGame')
                  : t('home.chooseLevelAndStart')}
              </Text>
              <Text
                style={[
                  styles.newGameMeta,
                  !resumable && styles.newGameMetaPrimary,
                ]}
              >
                {resumable ? t('home.chooseLevel') : t('home.levelRange')}
              </Text>
            </View>
            <Text
              allowFontScaling={false}
              style={[
                styles.newGameArrow,
                !resumable && styles.newGameTitlePrimary,
              ]}
            >
              ›
            </Text>
          </Pressable>
        </View>

        <View style={styles.creditPanel}>
          <HomeAidCard
            balance={t('home.availableCount', {
              count: snapshot.wallet.smart_hint.balance,
            })}
            label={t('home.smartHint')}
            onPress={onOpenSmartHintTopUp}
            styles={styles}
          />
          <HomeAidCard
            balance={t('home.availableCount', {
              count: snapshot.wallet.quick_pencil.balance,
            })}
            label={t('home.quickCandidates')}
            onPress={onOpenQuickCandidatesTopUp}
            styles={styles}
          />
        </View>

        <View style={styles.utilityNav}>
          {shortcutLinks.map(
            ({ hint, icon, label, testID, onPress }, index) => (
              <Pressable
                accessibilityHint={hint}
                accessibilityLabel={label}
                accessibilityRole="button"
                key={label}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.utilityButton,
                  index > 0 && styles.utilityButtonBorder,
                  pressed && styles.pressed,
                ]}
                testID={testID}
              >
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={styles.utilitySymbol}
                >
                  <HomeIcon name={icon} styles={styles} />
                </View>
                <Text numberOfLines={2} style={styles.utilityLabel}>
                  {label}
                </Text>
              </Pressable>
            ),
          )}
          <Pressable
            accessibilityLabel={t('home.more')}
            accessibilityRole="button"
            onPress={() => setMoreOpen(true)}
            style={({ pressed }) => [
              styles.utilityButton,
              shortcutLinks.length > 0 && styles.utilityButtonBorder,
              pressed && styles.pressed,
            ]}
            testID="home-more"
          >
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.utilitySymbol}
            >
              <HomeIcon name="more" styles={styles} />
            </View>
            <Text numberOfLines={2} style={styles.utilityLabel}>
              {t('home.more')}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.offlineNote}>{t('home.offlineNote')}</Text>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setLevelPickerOpen(false)}
        transparent
        visible={levelPickerOpen}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel={t('home.closeLevelPicker')}
            accessibilityRole="button"
            onPress={() => setLevelPickerOpen(false)}
            style={StyleSheet.absoluteFill}
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
                  key={level}
                  accessibilityHint={t(LEVEL_DESCRIPTION_KEYS[level])}
                  accessibilityLabel={`${t('home.startLevel', {
                    level,
                  })}, ${t('home.completed', {
                    count: snapshot.completedByLevel[level],
                  })}`}
                  accessibilityRole="button"
                  disabled={snapshot.busy}
                  onPress={() => startLevel(level)}
                  style={({ pressed }) => [
                    styles.levelOption,
                    index > 0 && styles.menuItemBorder,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelNumber}>{level}</Text>
                  </View>
                  <View style={styles.levelCopy}>
                    <Text style={styles.levelTitle}>
                      {t('home.difficulty', { level })}
                    </Text>
                    <Text style={styles.levelDescription}>
                      {t(LEVEL_DESCRIPTION_KEYS[level])}
                    </Text>
                    <Text style={styles.levelMeta}>
                      {t('home.completed', {
                        count: snapshot.completedByLevel[level],
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

      <Modal
        animationType="fade"
        onRequestClose={() => setMoreOpen(false)}
        transparent
        visible={moreOpen}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityLabel={t('home.closeMore')}
            accessibilityRole="button"
            onPress={() => setMoreOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View accessibilityViewIsModal style={styles.menuSheet}>
            <View style={styles.menuHandle} />
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {t('home.moreFunctions')}
            </Text>
            {moreLinks.map(({ icon, label, onPress }, index) => (
              <Pressable
                accessibilityLabel={label}
                accessibilityRole="button"
                key={label}
                onPress={() => openFromMenu(onPress)}
                style={({ pressed }) => [
                  styles.menuItem,
                  index > 0 && styles.menuItemBorder,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.menuItemLeading}>
                  <View style={styles.menuSymbol}>
                    <HomeIcon name={icon} styles={styles} />
                  </View>
                  <Text style={styles.menuItemText}>{label}</Text>
                </View>
                <Text allowFontScaling={false} style={styles.menuItemArrow}>
                  ›
                </Text>
              </Pressable>
            ))}
            {onOpenHintLab || onTopUpDebugCredits ? (
              <>
                <Text style={styles.developerSectionTitle}>
                  {t('home.developerTools')}
                </Text>
                {onOpenHintLab ? (
                  <Pressable
                    accessibilityLabel={t('home.hintLab')}
                    accessibilityRole="button"
                    onPress={() => openFromMenu(onOpenHintLab)}
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.menuItemLeading}>
                      <View style={styles.developerSymbol}>
                        <Text
                          allowFontScaling={false}
                          style={styles.developerSymbolText}
                        >
                          ⌘
                        </Text>
                      </View>
                      <Text style={styles.menuItemText}>
                        {t('home.hintLab')}
                      </Text>
                    </View>
                    <Text allowFontScaling={false} style={styles.menuItemArrow}>
                      ›
                    </Text>
                  </Pressable>
                ) : null}
                {onTopUpDebugCredits ? (
                  <Pressable
                    accessibilityLabel={t('home.debugCredits')}
                    accessibilityRole="button"
                    disabled={snapshot.busy}
                    onPress={onTopUpDebugCredits}
                    style={({ pressed }) => [
                      styles.menuItem,
                      onOpenHintLab && styles.menuItemBorder,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.menuItemLeading}>
                      <View style={styles.developerSymbol}>
                        <Text
                          allowFontScaling={false}
                          style={styles.developerSymbolText}
                        >
                          +
                        </Text>
                      </View>
                      <View style={styles.menuItemCopy}>
                        <Text style={styles.menuItemText}>
                          {t('home.debugCredits')}
                        </Text>
                        <Text style={styles.menuItemMeta}>
                          {t('home.debugCreditBalance', {
                            hints: snapshot.wallet.smart_hint.balance,
                            pencils: snapshot.wallet.quick_pencil.balance,
                          })}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ) : null}
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    content: {
      alignItems: 'center',
      flexGrow: 1,
      paddingBottom: 28,
      paddingHorizontal: 22,
      paddingTop: 20,
    },
    appBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      maxWidth: 600,
      width: '100%',
    },
    brand: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 9,
    },
    brandMark: {
      borderColor: palette.accent,
      borderRadius: 8,
      borderWidth: 1.5,
      gap: 2,
      height: 29,
      padding: 4,
      width: 29,
    },
    brandRow: {
      flexDirection: 'row',
      gap: 2,
    },
    brandCell: {
      backgroundColor: palette.accentSoft,
      borderRadius: 1.5,
      height: 4.5,
      width: 4.5,
    },
    brandCellStrong: {
      backgroundColor: palette.accent,
    },
    brandName: {
      color: palette.ink,
      fontSize: 15,
      fontWeight: '800',
    },
    headerActions: {
      flexDirection: 'row',
      gap: 7,
    },
    headerIconButton: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    settingsIcon: {
      alignItems: 'center',
      height: 22,
      justifyContent: 'center',
      width: 22,
    },
    settingsToothTrack: {
      height: 22,
      left: 0,
      position: 'absolute',
      top: 0,
      width: 22,
    },
    settingsTooth: {
      alignSelf: 'center',
      backgroundColor: palette.accent,
      borderRadius: 1,
      height: 5,
      width: 3,
    },
    settingsRing: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: 7,
      borderWidth: 2,
      height: 14,
      justifyContent: 'center',
      width: 14,
    },
    settingsHole: {
      backgroundColor: palette.accent,
      borderRadius: 2,
      height: 4,
      width: 4,
    },
    premiumButton: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.accentWarm,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      height: 40,
      justifyContent: 'center',
      paddingHorizontal: 11,
    },
    premiumLabel: {
      color: palette.ink,
      fontSize: 12,
      fontWeight: '800',
    },
    hero: {
      marginTop: 44,
      maxWidth: 600,
      width: '100%',
    },
    eyebrow: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.4,
    },
    heroTitle: {
      color: palette.ink,
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: -0.8,
      lineHeight: 36,
      marginTop: 8,
    },
    subtitle: {
      color: palette.muted,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 8,
    },
    primaryActions: {
      gap: 12,
      marginTop: 26,
      maxWidth: 600,
      width: '100%',
    },
    continueCard: {
      backgroundColor: palette.accent,
      borderRadius: 22,
      paddingHorizontal: 20,
      paddingVertical: 18,
    },
    continueHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    continueLabel: {
      color: palette.background,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.2,
    },
    continueProgressText: {
      color: palette.background,
      fontSize: 12,
      fontWeight: '700',
      opacity: 0.86,
    },
    continueBody: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
    },
    continueTitle: {
      color: palette.background,
      fontSize: 25,
      fontWeight: '800',
      letterSpacing: -0.4,
    },
    continueMeta: {
      color: palette.background,
      fontSize: 13,
      marginTop: 4,
      opacity: 0.78,
    },
    continueArrowCircle: {
      alignItems: 'center',
      backgroundColor: palette.background,
      borderRadius: 21,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    continueArrowIcon: {
      height: 16,
      width: 20,
    },
    continueArrowLine: {
      backgroundColor: palette.accent,
      borderRadius: 1,
      height: 2,
      left: 1,
      position: 'absolute',
      top: 7,
      width: 16,
    },
    continueArrowHead: {
      borderColor: palette.accent,
      borderRightWidth: 2,
      borderTopWidth: 2,
      height: 8,
      position: 'absolute',
      right: 1,
      top: 4,
      transform: [{ rotate: '45deg' }],
      width: 8,
    },
    progressTrack: {
      backgroundColor: palette.selected,
      borderRadius: 2,
      height: 4,
      marginTop: 16,
      overflow: 'hidden',
      opacity: 0.75,
    },
    progressFill: {
      backgroundColor: palette.background,
      borderRadius: 2,
      height: 4,
    },
    newGameButton: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: 18,
      borderWidth: 1.5,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 66,
      paddingHorizontal: 18,
    },
    newGameButtonPrimary: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
    },
    newGameTitle: {
      color: palette.accent,
      fontSize: 16,
      fontWeight: '800',
    },
    newGameTitlePrimary: {
      color: palette.background,
    },
    newGameMeta: {
      color: palette.muted,
      fontSize: 12,
      marginTop: 3,
    },
    newGameMetaPrimary: {
      color: palette.background,
      opacity: 0.78,
    },
    newGameArrow: {
      color: palette.accent,
      fontSize: 27,
    },
    creditPanel: {
      flexDirection: 'row',
      gap: 9,
      marginTop: 22,
      maxWidth: 600,
      width: '100%',
    },
    creditCard: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 58,
      minWidth: 0,
      paddingHorizontal: 11,
      paddingVertical: 10,
    },
    creditCopy: {
      flex: 1,
      minWidth: 0,
    },
    creditSymbol: {
      alignItems: 'center',
      backgroundColor: palette.accentSoft,
      borderRadius: 8,
      flexShrink: 0,
      height: 27,
      justifyContent: 'center',
      marginLeft: 6,
      width: 27,
    },
    creditLabel: {
      color: palette.ink,
      fontSize: 12,
      fontWeight: '700',
    },
    creditBalance: {
      color: palette.muted,
      fontSize: 11,
      marginTop: 3,
    },
    utilityNav: {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 17,
      borderWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      marginTop: 20,
      maxWidth: 600,
      overflow: 'hidden',
      width: '100%',
    },
    utilityButton: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      minHeight: 68,
      minWidth: 0,
      paddingHorizontal: 4,
      paddingVertical: 10,
    },
    utilityButtonBorder: {
      borderColor: palette.line,
      borderLeftWidth: StyleSheet.hairlineWidth,
    },
    utilitySymbol: {
      alignItems: 'center',
      height: 21,
      justifyContent: 'center',
      width: 24,
    },
    utilityLabel: {
      color: palette.muted,
      fontSize: 11,
      fontWeight: '700',
      lineHeight: 14,
      marginTop: 4,
      textAlign: 'center',
    },
    offlineNote: {
      color: palette.muted,
      fontSize: 12,
      marginTop: 'auto',
      maxWidth: 600,
      paddingTop: 40,
      textAlign: 'center',
      width: '100%',
    },
    modalBackdrop: {
      backgroundColor: palette.overlay,
      flex: 1,
      justifyContent: 'flex-end',
      padding: 12,
    },
    menuSheet: {
      backgroundColor: palette.surface,
      borderRadius: 24,
      paddingBottom: 18,
      paddingHorizontal: 10,
      paddingTop: 10,
    },
    levelSheet: {
      backgroundColor: palette.surface,
      borderRadius: 24,
      maxHeight: '88%',
      paddingBottom: 10,
      paddingHorizontal: 10,
      paddingTop: 10,
    },
    levelScroll: {
      marginTop: 10,
    },
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
    levelBadge: {
      alignItems: 'center',
      backgroundColor: palette.accentSoft,
      borderRadius: 12,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    levelNumber: {
      color: palette.accent,
      fontSize: 19,
      fontWeight: '900',
    },
    levelCopy: {
      flex: 1,
      marginLeft: 13,
    },
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
    menuItem: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 58,
      paddingHorizontal: 8,
    },
    menuItemBorder: {
      borderColor: palette.line,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    menuItemLeading: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      gap: 12,
    },
    menuSymbol: {
      alignItems: 'center',
      backgroundColor: palette.accentSoft,
      borderRadius: 10,
      height: 34,
      justifyContent: 'center',
      width: 34,
    },
    menuSymbolText: {
      color: palette.accent,
      fontSize: 17,
      fontWeight: '800',
    },
    iconCanvas: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: 2,
      height: 20,
      justifyContent: 'center',
      width: 22,
    },
    chartBar: {
      backgroundColor: palette.accent,
      borderRadius: 1.5,
      width: 4,
    },
    chartBarShort: {
      height: 7,
    },
    chartBarMedium: {
      height: 12,
    },
    chartBarTall: {
      height: 18,
    },
    moreGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 3,
      height: 17,
      width: 17,
    },
    moreGridCell: {
      borderColor: palette.accent,
      borderRadius: 2,
      borderWidth: 1.5,
      height: 7,
      width: 7,
    },
    plusIcon: {
      height: 14,
      width: 14,
    },
    plusHorizontal: {
      backgroundColor: palette.accent,
      borderRadius: 1,
      height: 2,
      left: 2,
      position: 'absolute',
      top: 6,
      width: 10,
    },
    plusVertical: {
      backgroundColor: palette.accent,
      borderRadius: 1,
      height: 10,
      left: 6,
      position: 'absolute',
      top: 2,
      width: 2,
    },
    helpIconCircle: {
      alignItems: 'center',
      borderColor: palette.accent,
      borderRadius: 9,
      borderWidth: 1.5,
      height: 18,
      justifyContent: 'center',
      width: 18,
    },
    helpIconText: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 14,
    },
    replayIcon: {
      height: 22,
      width: 22,
    },
    replayRing: {
      borderColor: palette.accent,
      borderRadius: 9,
      borderWidth: 2,
      height: 18,
      position: 'absolute',
      right: 0,
      top: 2,
      width: 18,
    },
    replayRingGap: {
      backgroundColor: palette.surface,
      height: 8,
      left: 1,
      position: 'absolute',
      top: 2,
      width: 8,
    },
    replayArrowShaft: {
      backgroundColor: palette.accent,
      borderRadius: 1,
      height: 2,
      left: 3,
      position: 'absolute',
      top: 7,
      width: 8,
    },
    replayArrowHead: {
      borderBottomColor: 'transparent',
      borderBottomWidth: 4,
      borderRightColor: palette.accent,
      borderRightWidth: 5,
      borderTopColor: 'transparent',
      borderTopWidth: 4,
      height: 0,
      left: 0,
      position: 'absolute',
      top: 4,
      width: 0,
    },
    replayClockVertical: {
      backgroundColor: palette.accent,
      borderRadius: 1,
      height: 6,
      position: 'absolute',
      right: 8,
      top: 6,
      width: 2,
    },
    replayClockHorizontal: {
      backgroundColor: palette.accent,
      borderRadius: 1,
      height: 2,
      position: 'absolute',
      right: 4,
      top: 11,
      width: 6,
    },
    developerSymbol: {
      alignItems: 'center',
      backgroundColor: palette.hintEvidence,
      borderRadius: 10,
      height: 34,
      justifyContent: 'center',
      width: 34,
    },
    developerSymbolText: {
      color: palette.hintCandidate,
      fontSize: 17,
      fontWeight: '800',
    },
    menuItemCopy: {
      flex: 1,
    },
    menuItemText: {
      color: palette.ink,
      fontSize: 15,
      fontWeight: '700',
    },
    menuItemMeta: {
      color: palette.muted,
      fontSize: 11,
      marginTop: 3,
    },
    menuItemArrow: {
      color: palette.muted,
      fontSize: 25,
    },
    developerSectionTitle: {
      color: palette.hintCandidate,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
      marginTop: 12,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.99 }],
    },
  });
}
