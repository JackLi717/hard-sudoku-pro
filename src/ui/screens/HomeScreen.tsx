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
  onOpenStatistics?(): void;
  onOpenHelp?(): void;
  onOpenTechniques?(): void;
  onOpenHintLab?(): void;
  onTopUpDebugCredits?(): void;
};

type MenuLink = {
  label: string;
  symbol: string;
  onPress(): void;
};

const LEVELS: readonly DifficultyLevel[] = [1, 2, 3, 4, 5];
const BRAND_CELLS = Array.from({ length: 9 }, (_, index) => index);
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

export function HomeScreen({
  snapshot,
  onResume,
  onStart,
  onOpenSettings,
  onOpenStatistics,
  onOpenHelp,
  onOpenTechniques,
  onOpenHintLab,
  onTopUpDebugCredits,
}: HomeScreenProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const resumable = snapshot.resumable && snapshot.session !== null;
  const progress = gameProgress(snapshot);
  const productLinks: MenuLink[] = [
    onOpenStatistics
      ? { label: t('home.statistics'), symbol: '▥', onPress: onOpenStatistics }
      : null,
    onOpenTechniques
      ? { label: t('home.techniques'), symbol: '◇', onPress: onOpenTechniques }
      : null,
    onOpenHelp
      ? { label: t('home.help'), symbol: '?', onPress: onOpenHelp }
      : null,
  ].filter((link): link is MenuLink => link !== null);
  const hasMoreItems =
    productLinks.length > 0 || Boolean(onOpenHintLab || onTopUpDebugCredits);

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
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.appBar}>
          <View style={styles.brand}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={styles.brandMark}
            >
              {BRAND_CELLS.map(index => (
                <View
                  key={index}
                  style={[
                    styles.brandCell,
                    [0, 4, 8].includes(index) && styles.brandCellStrong,
                  ]}
                />
              ))}
            </View>
            <Text style={styles.brandName}>{t('home.title')}</Text>
          </View>
          <View style={styles.headerActions}>
            {hasMoreItems ? (
              <Pressable
                accessibilityLabel={t('home.more')}
                accessibilityRole="button"
                onPress={() => setMoreOpen(true)}
                style={({ pressed }) => [
                  styles.headerIconButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text allowFontScaling={false} style={styles.moreIcon}>
                  •••
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityHint={t('home.comingSoon')}
              accessibilityLabel={t('home.premium')}
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              disabled
              style={styles.premiumButton}
            >
              <Text allowFontScaling={false} style={styles.premiumIcon}>
                P
              </Text>
            </Pressable>
            <Pressable
              accessibilityLabel={t('home.settings')}
              accessibilityRole="button"
              onPress={onOpenSettings}
              style={({ pressed }) => [
                styles.headerIconButton,
                pressed && styles.pressed,
              ]}
            >
              <Text allowFontScaling={false} style={styles.settingsIcon}>
                ⚙︎
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{t('home.eyebrow')}</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>
            {resumable ? t('home.resumeHeroTitle') : t('home.newHeroTitle')}
          </Text>
          <Text style={styles.subtitle}>{t('home.focusSubtitle')}</Text>
        </View>

        <View style={styles.primaryActions}>
          {resumable && snapshot.session ? (
            <Pressable
              accessibilityLabel={`${t('home.continue')}, ${t('home.level', {
                level: snapshot.session.state.difficultyLevel,
              })}, ${t('home.progressPercent', { progress })}`}
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
                    {t('home.level', {
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
                <Text allowFontScaling={false} style={styles.continueArrow}>
                  →
                </Text>
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
            accessibilityLabel={t('home.newGame')}
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
                {t('home.newGame')}
              </Text>
              <Text
                style={[
                  styles.newGameMeta,
                  !resumable && styles.newGameMetaPrimary,
                ]}
              >
                {t('home.newGameHint')}
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
                      {t('home.level', { level })}
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
            {productLinks.map(({ label, symbol, onPress }, index) => (
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
                    <Text
                      allowFontScaling={false}
                      style={styles.menuSymbolText}
                    >
                      {symbol}
                    </Text>
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
      flexGrow: 1,
      paddingBottom: 28,
      paddingHorizontal: 22,
      paddingTop: 20,
    },
    appBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    brand: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 9,
    },
    brandMark: {
      borderColor: palette.accent,
      borderRadius: 7,
      borderWidth: 1.5,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 2,
      height: 27,
      padding: 4,
      width: 27,
    },
    brandCell: {
      backgroundColor: palette.accentSoft,
      borderRadius: 1,
      height: 5,
      width: 5,
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
      backgroundColor: palette.surfaceStrong,
      borderRadius: 12,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    moreIcon: {
      color: palette.accent,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 1,
      marginTop: -5,
    },
    settingsIcon: {
      color: palette.accent,
      fontSize: 20,
    },
    premiumButton: {
      alignItems: 'center',
      backgroundColor: palette.accentWarm,
      borderRadius: 12,
      height: 40,
      justifyContent: 'center',
      opacity: 0.88,
      width: 40,
    },
    premiumIcon: {
      color: palette.ink,
      fontSize: 15,
      fontWeight: '900',
    },
    hero: {
      marginTop: 50,
    },
    eyebrow: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.4,
    },
    heroTitle: {
      color: palette.ink,
      fontSize: 36,
      fontWeight: '800',
      letterSpacing: -1.2,
      lineHeight: 42,
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
      marginTop: 32,
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
    continueArrow: {
      color: palette.background,
      fontSize: 29,
      lineHeight: 32,
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
    offlineNote: {
      color: palette.muted,
      fontSize: 12,
      marginTop: 'auto',
      paddingTop: 40,
      textAlign: 'center',
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
