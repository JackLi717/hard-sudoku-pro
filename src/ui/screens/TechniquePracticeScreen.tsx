import React from 'react';
import type { ProductPreferences } from '../../application/app/product-preferences';
import type { PracticeRepository } from '../../data/practice/practice-catalog';
import type { TechniqueCode } from '../../domain/hints/techniques';
import type { PracticeProgressStore } from '../../domain/practice/progress';
import { TechniqueExerciseListScreen } from './TechniqueExerciseListScreen';

export function TechniquePracticeScreen({
  technique,
  onClose,
  preferences,
  practiceProgress,
  practiceRepository,
}: {
  technique: TechniqueCode;
  onClose(): void;
  preferences?: ProductPreferences;
  practiceProgress?: PracticeProgressStore;
  practiceRepository: PracticeRepository;
}): React.JSX.Element {
  return (
    <TechniqueExerciseListScreen
      technique={technique}
      onClose={onClose}
      preferences={preferences}
      practiceProgress={practiceProgress}
      practiceRepository={practiceRepository}
    />
  );
}
