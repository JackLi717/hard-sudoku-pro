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
import type { PracticeProgressStore } from '../../domain/practice/progress';
import type { TechniqueCode } from '../../domain/hints/techniques';
import type {
  PracticeRepository,
  PracticeScene,
} from '../../data/practice/practice-catalog';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { AppIcon } from '../components/AppIcon';
import { AppPalette, useAppTheme } from '../theme';
import { PracticeBoardExercise } from './PracticeBoardExercise';

const COPY = {
  en: { back: 'Back', exercise: 'Exercise', practice: 'Practice' },
  'zh-Hans': { back: '返回', exercise: '题目', practice: '练习' },
  ja: { back: '戻る', exercise: '問題', practice: '練習' },
  de: { back: 'Zurück', exercise: 'Aufgabe', practice: 'Üben' },
} as const;

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
        {scenes.map((scene, index) => (
          <Pressable
            key={scene.id}
            accessibilityRole="button"
            onPress={() => setSelected(scene)}
            style={styles.row}
            testID={`practice-select-${index + 1}`}
          >
            <Text style={styles.rowTitle}>
              {copy.exercise} {index + 1}
            </Text>
            <Text style={styles.rowAction}>{copy.practice}</Text>
            <AppIcon name="forward" color={palette.muted} size={20} />
          </Pressable>
        ))}
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
    rowTitle: { color: palette.ink, fontSize: 19, fontWeight: '600', flex: 1 },
    rowAction: { color: palette.accent, fontSize: 15, fontWeight: '600' },
  });
}
