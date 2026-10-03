import React, { useMemo } from 'react';
import { LessonController } from '../application/lessons/lesson-controller';
import type { ProductPreferences } from '../application/app/product-preferences';
import type { PracticeProgressStore } from '../domain/practice/progress';
import { openBundledLessonRepository } from '../data/lessons/lesson-repository';
import type { LessonReadingStore } from '../domain/lessons/reading';
import { useLocalization } from '../localization';
import { LessonScreen } from '../ui/screens/LessonScreen';
/** The development entry previews the selected lesson catalog in the app. */
export function LessonPreview({
  progress,
  onClose,
  preferences,
  practiceProgress,
}: {
  progress: LessonReadingStore;
  onClose(): void;
  preferences?: ProductPreferences;
  practiceProgress?: PracticeProgressStore;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const controller = useMemo(
    () => new LessonController(openBundledLessonRepository(), progress, locale),
    [progress, locale],
  );
  return (
    <LessonScreen
      controller={controller}
      onClose={onClose}
      preferences={preferences}
      practiceProgress={practiceProgress}
    />
  );
}
