import React from 'react';
import type { ProductPreferences } from '../../application/app/product-preferences';
import type { PracticeRepository } from '../../data/practice/practice-catalog';
import type { TechniqueCode } from '../../domain/hints/techniques';
import type { PracticeProgressStore } from '../../domain/practice/progress';
import type { PracticeAccessStore } from '../../domain/practice/access';
import { TechniqueExerciseListScreen } from './TechniqueExerciseListScreen';

export function TechniquePracticeScreen({
  technique,
  onClose,
  preferences,
  practiceProgress,
  practiceAccess,
  premium,
  onUnlockPractice,
  practiceRepository,
}: {
  technique: TechniqueCode;
  onClose(): void;
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
}): React.JSX.Element {
  return (
    <TechniqueExerciseListScreen
      technique={technique}
      onClose={onClose}
      preferences={preferences}
      practiceProgress={practiceProgress}
      practiceAccess={practiceAccess}
      premium={premium}
      onUnlockPractice={onUnlockPractice}
      practiceRepository={practiceRepository}
    />
  );
}
