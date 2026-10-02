import type { HintStep } from '../hints/contracts';
import type { HintWalkthroughSnapshot } from '../hints/walkthrough';
import type { TechniqueCode } from '../hints/techniques';
import type { CandidateGrid } from '../sudoku/contracts';

export const LESSON_LOCALES = ['en', 'zh-Hans', 'ja', 'de'] as const;
export type LessonLocale = (typeof LESSON_LOCALES)[number];
export type LearningContentUsage = 'lesson' | 'practice' | 'challenge';
export type LessonCandidateBasis = 'board_direct' | 'applied_hint_sequence';

export type EncodedContentSource = {
  source_puzzle_id: string;
  puzzle_fingerprint: string;
  board_fingerprint: string;
  candidate_masks: CandidateGrid;
};

/** Build-time inventory of all three pools, never returned to a lesson screen. */
export type ContentAllocation = EncodedContentSource & {
  content_id: string;
  content_usage: LearningContentUsage;
};

export type LessonText = Readonly<{
  title: string;
  purpose: string;
  learning_goal: string;
  finding_method: readonly string[];
  common_mistakes: readonly string[];
  recap: readonly string[];
}>;

/** The serialized resource has no solution, replay history or Lab fields. */
export type EncodedLesson = {
  lesson_id: string;
  technique_code: TechniqueCode;
  prerequisite_techniques: readonly TechniqueCode[];
  texts: Readonly<Record<LessonLocale, LessonText>>;
  example: EncodedContentSource & {
    example_id: string;
    source_family: string;
    candidate_basis: LessonCandidateBasis;
    step: HintStep;
  };
};

export type EncodedLessonCatalog = {
  content_usage: 'lesson';
  lessons: readonly EncodedLesson[];
};

export type LessonSummary = Readonly<{
  id: string;
  techniqueCode: TechniqueCode;
  prerequisiteTechniques: readonly TechniqueCode[];
  title: string;
  purpose: string;
}>;

export type LessonContent = LessonSummary &
  Readonly<{
    learningGoal: string;
    findingMethod: readonly string[];
    commonMistakes: readonly string[];
    recap: readonly string[];
    candidateBasis: LessonCandidateBasis;
    example: HintWalkthroughSnapshot;
  }>;
