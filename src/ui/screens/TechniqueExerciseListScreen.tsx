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
  accessibleExerciseCount,
  type PracticeAccessStore,
} from '../../domain/practice/access';
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
    unlock: 'Watch ad · Unlock 5',
    unlocking: 'Loading ad…',
    unavailable: 'Ad unavailable. Please try again later.',
    dismissed: 'Watch the full ad to unlock exercises.',
  },
  'zh-Hans': {
    back: '返回',
    exercise: '题目',
    practice: '练习',
    completed: '已完成',
    best: '最快',
    unlock: '看广告解锁 5 题',
    unlocking: '正在加载广告…',
    unavailable: '广告暂不可用，请稍后重试。',
    dismissed: '看完广告后即可解锁题目。',
  },
  ja: {
    back: '戻る',
    exercise: '問題',
    practice: '練習',
    completed: '完了',
    best: '最速',
    unlock: '広告で5問解放',
    unlocking: '広告を読み込み中…',
    unavailable: '広告を利用できません。後でもう一度お試しください。',
    dismissed: '最後まで広告を見ると問題を解放できます。',
  },
  de: {
    back: 'Zurück',
    exercise: 'Aufgabe',
    practice: 'Üben',
    completed: 'Gelöst',
    best: 'Bestzeit',
    unlock: '5 Aufgaben per Werbung',
    unlocking: 'Werbung wird geladen…',
    unavailable: 'Werbung nicht verfügbar. Bitte später erneut versuchen.',
    dismissed: 'Für die Freischaltung die ganze Werbung ansehen.',
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
  practiceAccess,
  premium = false,
  onUnlockPractice,
  practiceRepository,
  onClose,
}: {
  technique: TechniqueCode;
  preferences?: ProductPreferences;
  practiceProgress?: PracticeProgressStore;
  practiceAccess?: PracticeAccessStore;
  premium?: boolean;
  onUnlockPractice?: (
    technique: TechniqueCode,
    total: number,
  ) => Promise<
    | { status: 'unlocked'; unlockedBatches: number }
    | { status: 'dismissed' }
    | { status: 'unavailable'; reason: string }
    | { status: 'failed'; errorCode: string }
  >;
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
  const [unlockedBatches, setUnlockedBatches] = useState(0);
  const [accessReady, setAccessReady] = useState(!practiceAccess);
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);
  const accessibleCount = accessibleExerciseCount(
    scenes.length,
    premium,
    unlockedBatches,
  );
  useEffect(() => {
    if (!practiceAccess) return;
    let current = true;
    setAccessReady(false);
    practiceAccess
      .readUnlockedBatches(technique)
      .then(count => {
        if (current) {
          setUnlockedBatches(count);
          setAccessReady(true);
        }
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [practiceAccess, technique]);
  const unlock = async () => {
    if (!onUnlockPractice || unlockBusy || !accessReady) return;
    setUnlockBusy(true);
    setUnlockMessage(null);
    try {
      const result = await onUnlockPractice(technique, scenes.length);
      if (result.status === 'unlocked') {
        setUnlockedBatches(result.unlockedBatches);
      } else {
        setUnlockMessage(
          result.status === 'dismissed' ? copy.dismissed : copy.unavailable,
        );
      }
    } catch {
      setUnlockMessage(copy.unavailable);
    } finally {
      setUnlockBusy(false);
    }
  };
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
        hasNext={scenes.indexOf(selected) < accessibleCount - 1}
        onNext={() => {
          const next = scenes.indexOf(selected) + 1;
          if (next < accessibleCount) setSelected(scenes[next]);
        }}
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
        {scenes.slice(0, accessibleCount).map((scene, index) => {
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
        {accessibleCount < scenes.length && !premium ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: unlockBusy || !accessReady || !onUnlockPractice,
            }}
            disabled={unlockBusy || !accessReady || !onUnlockPractice}
            onPress={unlock}
            style={styles.unlockButton}
            testID="practice-unlock-next"
          >
            <Text style={styles.unlockText}>
              {unlockBusy ? copy.unlocking : copy.unlock}
            </Text>
          </Pressable>
        ) : null}
        {unlockMessage && accessibleCount < scenes.length && !premium ? (
          <Text testID="practice-unlock-message">{unlockMessage}</Text>
        ) : null}
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
    unlockButton: {
      backgroundColor: palette.accent,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
    },
    unlockText: { color: palette.background, fontSize: 15, fontWeight: '700' },
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
