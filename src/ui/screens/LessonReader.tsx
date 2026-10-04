import React, { useMemo } from 'react';
import { LessonController } from '../../application/lessons/lesson-controller';
import type { ProductPreferences } from '../../application/app/product-preferences';
import type { PracticeProgressStore } from '../../domain/practice/progress';
import type { PracticeAccessStore } from '../../domain/practice/access';
import type { TechniqueCode } from '../../domain/hints/techniques';
import type { CommercialController } from '../../application/commercial/controller';
import { openBundledLessonRepository } from '../../data/lessons/lesson-repository';
import type { LessonReadingStore } from '../../domain/lessons/reading';
import { useLocalization } from '../../localization';
import { LessonScreen } from './LessonScreen';

export function LessonReader({
  progress,
  onClose,
  preferences,
  practiceProgress,
  practiceAccess,
  premium,
  commercial,
  initialTechnique,
  onOpenPremium,
}: {
  progress: LessonReadingStore;
  onClose(): void;
  preferences?: ProductPreferences;
  practiceProgress?: PracticeProgressStore;
  practiceAccess?: PracticeAccessStore;
  premium?: boolean;
  commercial?: CommercialController;
  initialTechnique?: TechniqueCode;
  onOpenPremium?: (technique: TechniqueCode) => void;
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
      practiceAccess={practiceAccess}
      premium={premium}
      initialTechnique={initialTechnique}
      onOpenPremium={onOpenPremium}
      onUnlockPractice={
        commercial
          ? (technique: TechniqueCode, total: number) =>
              commercial.redeemPracticeAd(technique, total)
          : undefined
      }
    />
  );
}
