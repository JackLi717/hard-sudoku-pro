import React, { useMemo } from 'react';
import { LessonController } from '../application/lessons/lesson-controller';
import type { ProductPreferences } from '../application/app/product-preferences';
import { LessonRepository } from '../data/lessons/lesson-repository';
import type { LessonReadingStore } from '../domain/lessons/reading';
import { useLocalization } from '../localization';
import { LessonScreen } from '../ui/screens/LessonScreen';
import catalog from './generated/lesson-preview.json';

/** Internal content only. The formal catalog is selected independently. */
export function LessonPreview({
  progress,
  onClose,
  preferences,
}: {
  progress: LessonReadingStore;
  onClose(): void;
  preferences?: ProductPreferences;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const controller = useMemo(
    () => new LessonController(new LessonRepository(catalog), progress, locale),
    [progress, locale],
  );
  return (
    <LessonScreen
      controller={controller}
      onClose={onClose}
      preferences={preferences}
    />
  );
}
