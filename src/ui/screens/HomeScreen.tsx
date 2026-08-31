import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { OfflineGameSnapshot } from '../../application';
import { DifficultyLevel } from '../../domain/hints/techniques';
import { palette } from '../theme';

type HomeScreenProps = {
  snapshot: OfflineGameSnapshot;
  onResume(): void;
  onStart(level: DifficultyLevel): void;
};

const LEVELS: readonly DifficultyLevel[] = [1, 2, 3, 4, 5];

export function HomeScreen({
  snapshot,
  onResume,
  onStart,
}: HomeScreenProps): React.JSX.Element {
  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>OFFLINE LOGIC GAME</Text>
        <Text style={styles.title}>Hard Sudoku</Text>
        <Text style={styles.subtitle}>
          Five levels. One clear next step. No account required.
        </Text>
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
            <Text style={styles.continueLabel}>CONTINUE</Text>
            <Text style={styles.continueTitle}>
              Level {snapshot.session.state.difficultyLevel}
            </Text>
          </View>
          <Text style={styles.continueArrow}>→</Text>
        </Pressable>
      ) : null}

      <Text style={styles.sectionTitle}>Choose a level</Text>
      <View style={styles.levelList}>
        {LEVELS.map(level => (
          <Pressable
            key={level}
            accessibilityLabel={`Start Level ${level}`}
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
              <Text style={styles.levelTitle}>Level {level}</Text>
              <Text style={styles.levelMeta}>
                {snapshot.completedByLevel[level]} completed
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
          <Text style={styles.summaryLabel}>Solved</Text>
        </View>
        <View style={styles.summaryRule} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {snapshot.statistics.attempts}
          </Text>
          <Text style={styles.summaryLabel}>Attempts</Text>
        </View>
        <View style={styles.summaryRule} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {snapshot.wallet.smart_hint.balance}
          </Text>
          <Text style={styles.summaryLabel}>Hints</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 28,
  },
  hero: {
    marginBottom: 28,
  },
  eyebrow: {
    color: palette.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 8,
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
    color: '#BDE7D8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  continueTitle: {
    color: palette.white,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 3,
  },
  continueArrow: {
    color: palette.white,
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
    borderColor: '#DED9CF',
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
    backgroundColor: '#CFC8BB',
    height: 30,
    width: 1,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
});
