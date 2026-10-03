import React, { useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ProductPreferences } from '../../application/app/product-preferences';
import type {
  PracticeProgress,
  PracticeProgressStore,
} from '../../domain/practice/progress';
import type { TechniqueCode } from '../../domain/hints/techniques';
import {
  practiceContentKey,
  type PracticeRepository,
  type PracticeScene,
} from '../../data/practice/practice-catalog';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { AppIcon } from '../components/AppIcon';
import { AppPalette, useAppTheme } from '../theme';
import { PracticeBoardExercise } from './PracticeBoardExercise';

const COPY = {
  en: {
    back: 'Back',
    exercise: 'Exercise',
    practice: 'Practice',
    completed: 'Completed',
    best: 'Best',
  },
  'zh-Hans': {
    back: '返回',
    exercise: '题目',
    practice: '练习',
    completed: '已完成',
    best: '最快',
  },
  ja: {
    back: '戻る',
    exercise: '問題',
    practice: '練習',
    completed: '完了',
    best: '最速',
  },
  de: {
    back: 'Zurück',
    exercise: 'Aufgabe',
    practice: 'Üben',
    completed: 'Gelöst',
    best: 'Bestzeit',
  },
} as const;

function formatDuration(durationMs: number): string {
  const seconds = Math.ceil(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const time = `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  if (minutes < 60) return time;
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(
    2,
    '0',
  )}:${String(seconds % 60).padStart(2, '0')}`;
}

export function TechniqueExerciseListScreen({
  technique,
  preferences,
  practiceProgress,
  practiceRepository,
  onClose,
}: {
  technique: TechniqueCode;
  preferences?: ProductPreferences;
  practiceProgress?: PracticeProgressStore;
  practiceRepository: PracticeRepository;
  onClose(): void;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const copy = COPY[locale];
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const scenes = useMemo(
    () => practiceRepository.list(technique, 'exercise'),
    [practiceRepository, technique],
  );
  const [selected, setSelected] = useState<PracticeScene | null>(null);
  const [progress, setProgress] = useState<readonly PracticeProgress[]>([]);
  useEffect(() => {
    if (selected || !practiceProgress) return;
    let current = true;
    practiceProgress
      .listProgress()
      .then(rows => {
        if (current) setProgress(rows);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [practiceProgress, selected]);
  const back = () => {
    if (selected) setSelected(null);
    else onClose();
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (!selected) return false;
        setSelected(null);
        return true;
      },
    );
    return subscription.remove;
  }, [selected]);
  if (selected) {
    return (
      <PracticeBoardExercise
        key={selected.id}
        scene={selected}
        number={scenes.indexOf(selected) + 1}
        preferences={preferences}
        practiceProgress={practiceProgress}
        onBack={() => setSelected(null)}
        hasNext={scenes.indexOf(selected) < scenes.length - 1}
        onNext={() => setSelected(scenes[scenes.indexOf(selected) + 1] ?? null)}
      />
    );
  }
  return (
    <View style={styles.screen} testID="practice-screen">
      <Pressable
        accessibilityRole="button"
        onPress={back}
        style={styles.back}
        testID="practice-back"
      >
        <AppIcon name="back" color={palette.accent} size={20} />
        <Text style={styles.backText}>{copy.back}</Text>
      </Pressable>
      <Text accessibilityRole="header" style={styles.title}>
        {HINT_PRESENTATION_COPIES[locale].techniques[technique].name}
      </Text>
      <ScrollView contentContainerStyle={styles.list}>
        {scenes.map((scene, index) => {
          const record = progress.find(
            item =>
              item.exerciseId === scene.id &&
              item.contentKey === practiceContentKey(scene),
          );
          const completed = (record?.correctCount ?? 0) > 0;
          const best = record?.bestDurationMs;
          return (
            <Pressable
              key={scene.id}
              accessibilityRole="button"
              accessibilityLabel={`${copy.exercise} ${index + 1}, ${
                completed ? copy.completed : copy.practice
              }${
                best !== null && best !== undefined
                  ? `, ${copy.best} ${formatDuration(best)}`
                  : ''
              }`}
              onPress={() => setSelected(scene)}
              style={styles.row}
              testID={`practice-select-${index + 1}`}
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowTitle}>
                  {copy.exercise} {index + 1}
                </Text>
                {best !== null && best !== undefined ? (
                  <Text
                    style={styles.rowDetail}
                    testID={`practice-best-${index + 1}`}
                  >
                    {copy.best} {formatDuration(best)}
                  </Text>
                ) : null}
              </View>
              {completed ? (
                <View testID={`practice-completed-${index + 1}`}>
                  <AppIcon name="check" color={palette.accent} size={20} />
                </View>
              ) : (
                <Text style={styles.rowAction}>{copy.practice}</Text>
              )}
              <AppIcon name="forward" color={palette.muted} size={20} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: palette.background,
      paddingHorizontal: 20,
    },
    back: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 6,
      minHeight: 52,
    },
    backText: { color: palette.accent, fontSize: 16, fontWeight: '600' },
    title: {
      color: palette.ink,
      fontSize: 28,
      fontWeight: '700',
      marginTop: 12,
      marginBottom: 24,
    },
    list: { gap: 10, paddingBottom: 24 },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 16,
      minHeight: 72,
      paddingHorizontal: 18,
      gap: 12,
    },
    rowContent: { flex: 1, gap: 3 },
    rowTitle: { color: palette.ink, fontSize: 19, fontWeight: '600' },
    rowDetail: { color: palette.muted, fontSize: 14 },
    rowAction: { color: palette.accent, fontSize: 15, fontWeight: '600' },
  });
}
