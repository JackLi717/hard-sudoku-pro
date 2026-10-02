import type {
  LessonContent,
  LessonLocale,
  LessonSummary,
} from '../../domain/lessons/contracts';
import {
  LessonLocation,
  LessonReading,
  LessonReadingStore,
  lessonContentKey,
} from '../../domain/lessons/reading';
import { buildLessonPresentation } from '../../domain/lessons/presentation';
import type { HintPresentation } from '../../domain/hints/presentation';
import type { CandidateRef } from '../../domain/sudoku/contracts';
import { HINT_PRESENTATION_COPIES } from '../../localization/hint-presentation-copy';

export interface LessonContentSource {
  listLessons(locale: LessonLocale): readonly LessonSummary[];
  getLesson(id: string, locale: LessonLocale): LessonContent | null;
}

export type LessonDirectoryItem = LessonSummary & {
  readingState: 'unread' | 'reading' | 'completed';
};
export type LessonSnapshot = Readonly<{
  ready: boolean;
  busy: boolean;
  error: 'load' | 'save' | null;
  lessons: readonly LessonDirectoryItem[];
  continueLessonId: string | null;
  lesson: LessonContent | null;
  reading: LessonReading | null;
  presentation: HintPresentation | null;
}>;

/** Course navigation owns reading facts, never game commands or Lab acceptance. */
export class LessonController {
  private readings = new Map<string, LessonReading>();
  private listeners = new Set<(snapshot: LessonSnapshot) => void>();
  private retryOperation: (() => Promise<void>) | null = null;
  private state: LessonSnapshot = {
    ready: false,
    busy: false,
    error: null,
    lessons: [],
    continueLessonId: null,
    lesson: null,
    reading: null,
    presentation: null,
  };

  constructor(
    private readonly content: LessonContentSource,
    private readonly store: LessonReadingStore,
    private readonly locale: LessonLocale,
    private readonly now: () => number = Date.now,
  ) {}

  get snapshot(): LessonSnapshot {
    return this.state;
  }

  subscribe(listener: (snapshot: LessonSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(patch: Partial<LessonSnapshot>): void {
    this.state = Object.freeze({ ...this.state, ...patch });
    for (const listener of this.listeners) listener(this.state);
  }

  private async run(
    operation: () => Promise<void>,
    failure: 'load' | 'save',
  ): Promise<boolean> {
    // Rapid taps and hardware Back cannot race the accepted write/navigation.
    if (this.state.busy) return false;
    this.emit({ busy: true, error: null });
    try {
      await operation();
      this.retryOperation = null;
      return true;
    } catch {
      this.retryOperation = operation;
      this.emit({ error: failure });
      return false;
    } finally {
      this.emit({ busy: false });
    }
  }

  initialize(): Promise<boolean> {
    return this.run(async () => {
      this.readings = new Map(
        (await this.store.listReadings()).map(reading => [
          reading.lessonId,
          reading,
        ]),
      );
      this.refreshDirectory();
      this.emit({ ready: true });
    }, 'load');
  }

  private refreshDirectory(): void {
    const lessons = this.content.listLessons(this.locale).map(summary => {
      const content = this.content.getLesson(summary.id, this.locale);
      if (!content) throw new Error('Missing lesson content');
      const saved = this.readings.get(summary.id);
      const reading =
        saved?.contentKey === lessonContentKey(content) ? saved : null;
      return {
        ...summary,
        readingState: reading
          ? reading.completedAt !== null
            ? ('completed' as const)
            : ('reading' as const)
          : ('unread' as const),
      };
    });
    const continuing = [...this.readings.values()]
      .filter(reading =>
        lessons.some(
          item =>
            item.id === reading.lessonId && item.readingState === 'reading',
        ),
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];
    this.emit({
      lessons: Object.freeze(lessons),
      continueLessonId: continuing?.lessonId ?? null,
    });
  }

  private presentation(lesson: LessonContent, target: CandidateRef | null) {
    return buildLessonPresentation(
      lesson.example,
      HINT_PRESENTATION_COPIES[this.locale],
      target ?? undefined,
    );
  }

  openLesson(id: string, restart = false): Promise<boolean> {
    if (!this.state.ready) return Promise.resolve(false);
    return this.run(async () => {
      const lesson = this.content.getLesson(id, this.locale);
      if (!lesson) throw new Error('Unknown lesson');
      const previous = this.readings.get(id);
      const saved =
        previous?.contentKey === lessonContentKey(lesson) && !restart
          ? previous
          : null;
      const targets =
        lesson.techniqueCode === 'jellyfish'
          ? lesson.example.step.eliminations
          : [];
      const storedTarget = saved?.location.target;
      const target =
        targets.find(
          candidate =>
            candidate.cell === storedTarget?.cell &&
            candidate.digit === storedTarget.digit,
        ) ??
        targets[0] ??
        null;
      const presentation = this.presentation(lesson, target);
      let location: LessonLocation = saved
        ? { ...saved.location, target }
        : { chapter: 'intro', pageIndex: 0, target };
      const targetChanged =
        storedTarget &&
        (storedTarget.cell !== target?.cell ||
          storedTarget.digit !== target?.digit);
      if (targetChanged || location.pageIndex >= presentation.pages.length) {
        location = { chapter: 'proof', pageIndex: 0, target };
      }
      if (
        location.chapter === 'recap' &&
        location.pageIndex !== presentation.pages.length - 1
      ) {
        location = { ...location, chapter: 'proof' };
      }
      await this.save(lesson, location, presentation);
    }, 'load');
  }

  private async save(
    lesson: LessonContent,
    location: LessonLocation,
    presentation: HintPresentation,
    complete = false,
  ): Promise<void> {
    const reading = await this.store.saveLocation(
      lesson.id,
      lessonContentKey(lesson),
      location,
      this.now(),
      complete,
    );
    this.readings.set(lesson.id, reading);
    this.refreshDirectory();
    this.emit({ lesson, reading, presentation });
  }

  private move(location: LessonLocation, complete = false): Promise<boolean> {
    const { lesson, presentation } = this.state;
    if (!lesson || !presentation) return Promise.resolve(false);
    return this.run(async () => {
      await this.save(lesson, location, presentation, complete);
      if (complete) this.returnToDirectory();
    }, 'save');
  }

  startProof(): Promise<boolean> {
    const reading = this.state.reading;
    if (reading?.location.chapter !== 'intro') return Promise.resolve(false);
    return this.move({ ...reading.location, chapter: 'proof', pageIndex: 0 });
  }

  setPage(pageIndex: number): Promise<boolean> {
    const { reading, presentation } = this.state;
    if (
      !reading ||
      !presentation ||
      reading.location.chapter !== 'proof' ||
      !Number.isInteger(pageIndex) ||
      pageIndex < 0 ||
      pageIndex >= presentation.pages.length ||
      (pageIndex !== 0 &&
        Math.abs(pageIndex - reading.location.pageIndex) !== 1)
    )
      return Promise.resolve(false);
    return this.move({ ...reading.location, pageIndex });
  }

  selectTarget(target: CandidateRef): Promise<boolean> {
    const { lesson, reading } = this.state;
    if (
      !lesson ||
      !reading ||
      reading.location.chapter !== 'proof' ||
      lesson.techniqueCode !== 'jellyfish' ||
      !lesson.example.step.eliminations.some(
        candidate =>
          candidate.cell === target.cell && candidate.digit === target.digit,
      )
    )
      return Promise.resolve(false);
    return this.run(async () => {
      await this.save(
        lesson,
        { chapter: 'proof', pageIndex: 0, target: { ...target } },
        this.presentation(lesson, target),
      );
    }, 'save');
  }

  showRecap(): Promise<boolean> {
    const { reading, presentation } = this.state;
    if (
      !reading ||
      !presentation ||
      reading.location.chapter !== 'proof' ||
      reading.location.pageIndex !== presentation.pages.length - 1
    )
      return Promise.resolve(false);
    return this.move({ ...reading.location, chapter: 'recap' });
  }

  replay(): Promise<boolean> {
    const reading = this.state.reading;
    if (!reading) return Promise.resolve(false);
    return this.move({ ...reading.location, chapter: 'proof', pageIndex: 0 });
  }

  complete(): Promise<boolean> {
    const reading = this.state.reading;
    if (reading?.location.chapter !== 'recap') return Promise.resolve(false);
    return this.move(reading.location, true);
  }

  private returnToDirectory(): void {
    // All visible reading locations have already been durably saved.
    this.retryOperation = null;
    this.emit({ lesson: null, reading: null, presentation: null, error: null });
  }

  back(): boolean {
    if (this.state.busy) return true;
    if (!this.state.lesson) return false;
    this.returnToDirectory();
    return true;
  }

  retry(): Promise<boolean> {
    const operation = this.retryOperation;
    if (!operation) return Promise.resolve(false);
    return this.run(operation, this.state.error ?? 'load');
  }
}
