import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OfflineGameSnapshot } from '../../application';
import { DifficultyLevel } from '../../domain/hints/techniques';
import { useLocalization } from '../../localization';
import { AppPalette, useAppTheme } from '../theme';

type HomeScreenProps = {
  snapshot: OfflineGameSnapshot;
  onResume(): void;
  onStart(level: DifficultyLevel): void;
  onOpenSettings(): void;
  onOpenHintLab?(): void;
};

const LEVELS: readonly DifficultyLevel[] = [1, 2, 3, 4, 5];

export function HomeScreen({
  snapshot,
  onResume,
  onStart,
  onOpenSettings,
  onOpenHintLab,
}: HomeScreenProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <Text style={styles.eyebrow}>{t('home.eyebrow')}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onOpenSettings}
            style={styles.settingsButton}
          >
            <Text style={styles.settingsText}>{t('home.settings')}</Text>
          </Pressable>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {t('home.title')}
        </Text>
        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
      </View>

      {snapshot.resumable && snapshot.session ? (
        <Pressable
          accessibilityRole="button"
          disabled={snapshot.busy}
          onPress={onResume}
          style={({ pressed }) => [
            styles.continueCard,
            pressed && styles.pressed,
          ]}
        >
          <View>
            <Text style={styles.continueLabel}>{t('home.continue')}</Text>
            <Text style={styles.continueTitle}>
              {t('home.level', {
                level: snapshot.session.state.difficultyLevel,
              })}
            </Text>
          </View>
          <Text style={styles.continueArrow}>→</Text>
        </Pressable>
      ) : null}

      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {t('home.chooseLevel')}
      </Text>
      <View style={styles.levelList}>
        {LEVELS.map(level => (
          <Pressable
            key={level}
            accessibilityLabel={t('home.startLevel', { level })}
            accessibilityRole="button"
            disabled={snapshot.busy}
            onPress={() => onStart(level)}
            style={({ pressed }) => [
              styles.levelCard,
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
              <Text style={styles.levelMeta}>
                {t('home.completed', {
                  count: snapshot.completedByLevel[level],
                })}
              </Text>
            </View>
            <Text style={styles.levelArrow}>›</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {snapshot.statistics.completions}
          </Text>
          <Text style={styles.summaryLabel}>{t('home.solved')}</Text>
        </View>
        <View style={styles.summaryRule} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {snapshot.statistics.attempts}
          </Text>
          <Text style={styles.summaryLabel}>{t('home.attempts')}</Text>
        </View>
        <View style={styles.summaryRule} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {snapshot.wallet.smart_hint.balance}
          </Text>
          <Text style={styles.summaryLabel}>{t('home.hints')}</Text>
        </View>
      </View>
      {onOpenHintLab ? (
        <Pressable onPress={onOpenHintLab} style={styles.hintLabCard}>
          <View>
            <Text style={styles.hintLabLabel}>{t('home.developmentOnly')}</Text>
            <Text style={styles.hintLabTitle}>{t('home.hintLab')}</Text>
          </View>
          <Text style={styles.levelArrow}>›</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    content: {
      paddingBottom: 36,
      paddingHorizontal: 20,
      paddingTop: 28,
    },
    hero: {
      marginBottom: 28,
    },
    heroHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    eyebrow: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.8,
      marginBottom: 8,
    },
    settingsButton: {
      borderColor: palette.line,
      borderRadius: 12,
      borderWidth: 1,
      minHeight: 40,
      justifyContent: 'center',
      paddingHorizontal: 13,
    },
    settingsText: {
      color: palette.accent,
      fontSize: 13,
      fontWeight: '800',
    },
    title: {
      color: palette.ink,
      fontSize: 42,
      fontWeight: '800',
      letterSpacing: -1.5,
    },
    subtitle: {
      color: palette.muted,
      fontSize: 16,
      lineHeight: 23,
      marginTop: 8,
      maxWidth: 360,
    },
    continueCard: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 22,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 28,
      paddingHorizontal: 22,
      paddingVertical: 20,
    },
    continueLabel: {
      color: palette.background,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.4,
    },
    continueTitle: {
      color: palette.background,
      fontSize: 24,
      fontWeight: '800',
      marginTop: 3,
    },
    continueArrow: {
      color: palette.background,
      fontSize: 30,
    },
    sectionTitle: {
      color: palette.ink,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 12,
    },
    levelList: {
      gap: 10,
    },
    levelCard: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      minHeight: 70,
      paddingHorizontal: 14,
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
      fontSize: 20,
      fontWeight: '800',
    },
    levelCopy: {
      flex: 1,
      marginLeft: 14,
    },
    levelTitle: {
      color: palette.ink,
      fontSize: 17,
      fontWeight: '700',
    },
    levelMeta: {
      color: palette.muted,
      fontSize: 13,
      marginTop: 3,
    },
    levelArrow: {
      color: palette.muted,
      fontSize: 28,
    },
    summary: {
      alignItems: 'center',
      backgroundColor: palette.surfaceStrong,
      borderRadius: 18,
      flexDirection: 'row',
      marginTop: 24,
      paddingVertical: 16,
    },
    summaryItem: {
      alignItems: 'center',
      flex: 1,
    },
    summaryValue: {
      color: palette.ink,
      fontSize: 22,
      fontWeight: '800',
    },
    summaryLabel: {
      color: palette.muted,
      fontSize: 12,
      marginTop: 3,
    },
    summaryRule: {
      backgroundColor: palette.line,
      height: 30,
      width: 1,
    },
    pressed: {
      opacity: 0.72,
      transform: [{ scale: 0.99 }],
    },
    hintLabCard: {
      alignItems: 'center',
      backgroundColor: palette.hintEvidence,
      borderColor: palette.hintCandidate,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      padding: 16,
    },
    hintLabLabel: {
      color: palette.hintCandidate,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
    },
    hintLabTitle: {
      color: palette.ink,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 3,
    },
  });
}
