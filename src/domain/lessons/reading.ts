import type { CandidateRef } from '../sudoku/contracts';
import type { LessonContent } from './contracts';

export type LessonChapter = 'intro' | 'proof' | 'recap';
export type LessonLocation = Readonly<{
  chapter: LessonChapter;
  pageIndex: number;
  target: CandidateRef | null;
}>;
export type LessonReading = Readonly<{
  lessonId: string;
  contentKey: string;
  location: LessonLocation;
  updatedAt: number;
  completedAt: number | null;
}>;

export interface LessonReadingStore {
  listReadings(): Promise<readonly LessonReading[]>;
  saveLocation(
    lessonId: string,
    contentKey: string,
    location: LessonLocation,
    now: number,
    complete?: boolean,
  ): Promise<LessonReading>;
}

/** Exact identity, independent of locale. Replaced examples start a new reading. */
export function lessonContentKey(lesson: LessonContent): string {
  return JSON.stringify(lesson.example);
}

export function validateLessonLocation(location: LessonLocation): void {
  if (
    !['intro', 'proof', 'recap'].includes(location.chapter) ||
    !Number.isSafeInteger(location.pageIndex) ||
    location.pageIndex < 0 ||
    (location.target !== null &&
      (!Number.isInteger(location.target.cell) ||
        location.target.cell < 0 ||
        location.target.cell > 80 ||
        !Number.isInteger(location.target.digit) ||
        location.target.digit < 1 ||
        location.target.digit > 9))
  ) {
    throw new Error('Invalid lesson reading location');
  }
}
