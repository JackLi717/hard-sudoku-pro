import rawCatalog from './generated/lesson-catalog.json';
import {
  EncodedLesson,
  EncodedLessonCatalog,
  LESSON_LOCALES,
  LessonContent,
  LessonLocale,
  LessonSummary,
} from '../../domain/lessons/contracts';
import {
  LessonContentError,
  requireFingerprint,
  requireIdentifier,
  requireRecord,
  sourceFamilyKey,
  validateContentSource,
} from '../../domain/lessons/content-source';
import { buildLessonPresentation } from '../../domain/lessons/presentation';
import { TECHNIQUES, TechniqueCode } from '../../domain/hints/techniques';
import { HintWalkthroughSnapshot } from '../../domain/hints/walkthrough';
import {
  boardFromFingerprint,
  createSolverCandidates,
} from '../../domain/sudoku/board';
import { HINT_PRESENTATION_COPIES } from '../../localization/hint-presentation-copy';

function nonEmptyText(value: unknown, label: string): void {
  if (typeof value !== 'string' || !value.trim()) {
    throw new LessonContentError(`${label} must contain text`);
  }
}

function paragraphList(value: unknown, label: string): void {
  if (!Array.isArray(value) || !value.length) {
    throw new LessonContentError(`${label} must contain paragraphs`);
  }
  value.forEach(paragraph => nonEmptyText(paragraph, label));
}

function validateLesson(value: unknown): EncodedLesson {
  const record = requireRecord(
    value,
    [
      'lesson_id',
      'technique_code',
      'prerequisite_techniques',
      'texts',
      'example',
    ],
    'lesson',
  );
  const lesson = record as EncodedLesson;
  requireIdentifier(lesson.lesson_id, 'lesson_id');
  const technique = TECHNIQUES.find(
    item => item.code === lesson.technique_code,
  );
  if (!technique) throw new LessonContentError('unknown lesson technique');
  if (
    !Array.isArray(lesson.prerequisite_techniques) ||
    new Set(lesson.prerequisite_techniques).size !==
      lesson.prerequisite_techniques.length ||
    lesson.prerequisite_techniques.some(
      code =>
        code === lesson.technique_code ||
        !TECHNIQUES.some(item => item.code === code),
    )
  ) {
    throw new LessonContentError('invalid prerequisite techniques');
  }
  const texts = requireRecord(lesson.texts, LESSON_LOCALES, 'lesson texts');
  for (const locale of LESSON_LOCALES) {
    const text = requireRecord(
      texts[locale],
      [
        'title',
        'purpose',
        'learning_goal',
        'finding_method',
        'common_mistakes',
        'recap',
      ],
      `lesson text ${locale}`,
    );
    for (const field of ['title', 'purpose', 'learning_goal'])
      nonEmptyText(text[field], field);
    for (const field of ['finding_method', 'common_mistakes', 'recap'])
      paragraphList(text[field], field);
  }
  const example = requireRecord(
    lesson.example,
    [
      'example_id',
      'source_puzzle_id',
      'source_family',
      'puzzle_fingerprint',
      'board_fingerprint',
      'candidate_masks',
      'candidate_basis',
      'step',
    ],
    'lesson example',
  );
  requireIdentifier(example.example_id, 'example_id');
  validateContentSource(lesson.example);
  if (
    example.source_family !== sourceFamilyKey(lesson.example.puzzle_fingerprint)
  ) {
    throw new LessonContentError('lesson source family is incorrect');
  }
  if (
    !['board_direct', 'applied_hint_sequence'].includes(
      lesson.example.candidate_basis,
    )
  ) {
    throw new LessonContentError('invalid candidate basis');
  }
  if (lesson.example.candidate_basis === 'board_direct') {
    const direct = createSolverCandidates(
      boardFromFingerprint(lesson.example.puzzle_fingerprint),
    );
    if (
      lesson.example.puzzle_fingerprint !== lesson.example.board_fingerprint ||
      direct.some((mask, cell) => mask !== lesson.example.candidate_masks[cell])
    ) {
      throw new LessonContentError(
        'board_direct example has unexplained historical candidates',
      );
    }
  } else if (lesson.technique_code === 'nakedSingle') {
    throw new LessonContentError(
      'Naked Single lessons require a board-direct example',
    );
  }
  // Strict outer and step fields prevent debug or solution data leaking into
  // a generated resource; native verification checks the entire step witness.
  const step = example.step as Record<string, unknown>;
  const allowedStepFields = [
    'contractVersion',
    'boardFingerprint',
    'techniqueCode',
    'difficultyLevel',
    'focusCells',
    'focusRegions',
    'premiseCandidates',
    'eliminations',
    'placements',
    'teaching',
    'humanCost',
    'proofSteps',
    'explanationKey',
    'explanationParams',
  ];
  if (
    !step ||
    typeof step !== 'object' ||
    Array.isArray(step) ||
    Object.keys(step).some(key => !allowedStepFields.includes(key)) ||
    step.techniqueCode !== technique.code ||
    step.difficultyLevel !== technique.level
  ) {
    throw new LessonContentError(
      'lesson proof technique or fields are invalid',
    );
  }
  requireFingerprint(step.boardFingerprint, 'proof boardFingerprint');
  const snapshot = snapshotFor(lesson);
  for (const locale of LESSON_LOCALES) {
    const targets =
      lesson.technique_code === 'jellyfish'
        ? lesson.example.step.eliminations
        : [undefined];
    // Every supported target must be readable, not only the default target.
    if (!targets.length)
      buildLessonPresentation(snapshot, HINT_PRESENTATION_COPIES[locale]);
    for (const target of targets)
      buildLessonPresentation(
        snapshot,
        HINT_PRESENTATION_COPIES[locale],
        target,
      );
  }
  return lesson;
}

function snapshotFor(lesson: EncodedLesson): HintWalkthroughSnapshot {
  return {
    id: lesson.example.example_id,
    values: boardFromFingerprint(lesson.example.board_fingerprint),
    givens: boardFromFingerprint(lesson.example.puzzle_fingerprint),
    candidateMasks: lesson.example.candidate_masks,
    step: lesson.example.step,
  };
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(child => deepFreeze(child));
    Object.freeze(value);
  }
  return value;
}

/** Validates a selected subset, including an empty unpublished catalog. */
export function decodeLessonCatalog(input: unknown): EncodedLessonCatalog {
  try {
    const root = requireRecord(
      input,
      ['content_usage', 'lessons'],
      'lesson catalog',
    );
    if (root.content_usage !== 'lesson' || !Array.isArray(root.lessons)) {
      throw new LessonContentError('resource is not a lesson catalog');
    }
    const ids = new Set<string>();
    const exampleIds = new Set<string>();
    const lessons = root.lessons.map(value => {
      const lesson = validateLesson(value);
      if (
        ids.has(lesson.lesson_id) ||
        exampleIds.has(lesson.example.example_id)
      ) {
        throw new LessonContentError('duplicate lesson or example identifier');
      }
      ids.add(lesson.lesson_id);
      exampleIds.add(lesson.example.example_id);
      return lesson;
    });
    // Take ownership of plain data. Later mutations to input cannot change
    // a validated resource or any subsequent player snapshot.
    return deepFreeze(
      JSON.parse(JSON.stringify({ content_usage: 'lesson', lessons })),
    );
  } catch (error) {
    if (error instanceof LessonContentError) throw error;
    throw new LessonContentError(`invalid lesson content: ${String(error)}`);
  }
}

/** Read-only content access; no SQLite, progress, catalog scanning or ads. */
export class LessonRepository {
  private readonly lessons: ReadonlyMap<string, EncodedLesson>;
  private readonly snapshots: ReadonlyMap<string, HintWalkthroughSnapshot>;

  constructor(input: unknown) {
    const catalog = decodeLessonCatalog(input);
    this.lessons = new Map(
      catalog.lessons.map(lesson => [lesson.lesson_id, lesson]),
    );
    this.snapshots = new Map(
      catalog.lessons.map(lesson => [
        lesson.lesson_id,
        deepFreeze(snapshotFor(lesson)),
      ]),
    );
  }

  listLessons(
    locale: LessonLocale,
    techniqueCode?: TechniqueCode,
  ): readonly LessonSummary[] {
    this.requireLocale(locale);
    return Object.freeze(
      [...this.lessons.values()]
        .filter(
          lesson => !techniqueCode || lesson.technique_code === techniqueCode,
        )
        .map(lesson => this.summary(lesson, locale)),
    );
  }

  getLesson(id: string, locale: LessonLocale): LessonContent | null {
    this.requireLocale(locale);
    const lesson = this.lessons.get(id);
    if (!lesson) return null;
    const text = lesson.texts[locale];
    return Object.freeze({
      ...this.summary(lesson, locale),
      learningGoal: text.learning_goal,
      findingMethod: text.finding_method,
      commonMistakes: text.common_mistakes,
      recap: text.recap,
      candidateBasis: lesson.example.candidate_basis,
      example: this.snapshots.get(id)!,
    });
  }

  private summary(lesson: EncodedLesson, locale: LessonLocale): LessonSummary {
    return Object.freeze({
      id: lesson.lesson_id,
      techniqueCode: lesson.technique_code,
      prerequisiteTechniques: lesson.prerequisite_techniques,
      title: lesson.texts[locale].title,
      purpose: lesson.texts[locale].purpose,
    });
  }

  private requireLocale(locale: LessonLocale): void {
    if (!LESSON_LOCALES.includes(locale))
      throw new LessonContentError('unsupported lesson locale');
  }
}

export function openBundledLessonRepository(): LessonRepository {
  return new LessonRepository(rawCatalog);
}
