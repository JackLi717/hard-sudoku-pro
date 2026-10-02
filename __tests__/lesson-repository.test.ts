import rawCorpus from '../src/debug/generated/hint-lab-fixtures.json';
import {
  decodeLessonCatalog,
  LessonRepository,
  openBundledLessonRepository,
} from '../src/data/lessons/lesson-repository';
import {
  ContentAllocation,
  EncodedContentSource,
  EncodedLesson,
  LESSON_LOCALES,
  LessonText,
} from '../src/domain/lessons/contracts';
import {
  contentSnapshotKey,
  sourceFamilyKey,
  validateContentAllocations,
} from '../src/domain/lessons/content-source';
import { buildLessonPresentation } from '../src/domain/lessons/presentation';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import type { HintStep } from '../src/domain/hints/contracts';
import { HINT_PRESENTATION_COPIES } from '../src/localization/hint-presentation-copy';

jest.mock('../src/debug/hint-lab', () => {
  throw new Error('Lesson reading cannot import the Lab catalog');
});
jest.mock('../src/debug/hint-lab-store', () => {
  throw new Error('Lesson reading cannot open acceptance storage');
});

function example(code: string) {
  return rawCorpus.fixtures.find(source => source.techniqueCode === code)!;
}

function text(locale: string): LessonText {
  // Contract-test prose only; this is not a selected or published course.
  return {
    title: `${locale}: test course`,
    purpose: `${locale}: test purpose`,
    learning_goal: `${locale}: test learning goal`,
    finding_method: [`${locale}: test observation`],
    common_mistakes: [`${locale}: test condition`],
    recap: [`${locale}: test summary`],
  };
}

function lesson(code = 'hiddenSingle', id = `test-${code}`): EncodedLesson {
  const source = example(code);
  return {
    lesson_id: id,
    technique_code: source.techniqueCode as EncodedLesson['technique_code'],
    prerequisite_techniques: [],
    texts: Object.fromEntries(
      LESSON_LOCALES.map(locale => [locale, text(locale)]),
    ) as EncodedLesson['texts'],
    example: {
      example_id: source.id,
      source_puzzle_id: source.sourcePuzzleId,
      source_family: sourceFamilyKey(source.puzzleFingerprint),
      puzzle_fingerprint: source.puzzleFingerprint,
      board_fingerprint: source.boardFingerprint,
      candidate_masks: [...source.candidateMasks],
      candidate_basis:
        source.candidateBasis as EncodedLesson['example']['candidate_basis'],
      step: JSON.parse(JSON.stringify(source.engineResult.step)) as HintStep,
    },
  };
}

function catalog(...lessons: EncodedLesson[]) {
  return { content_usage: 'lesson', lessons };
}

function allocation(
  content: EncodedLesson,
  usage: ContentAllocation['content_usage'] = 'lesson',
): ContentAllocation {
  return {
    content_id: content.lesson_id,
    content_usage: usage,
    source_puzzle_id: content.example.source_puzzle_id,
    puzzle_fingerprint: content.example.puzzle_fingerprint,
    board_fingerprint: content.example.board_fingerprint,
    candidate_masks: content.example.candidate_masks,
  };
}

test('loads a prepared subset and keeps source metadata and proof out of the directory', () => {
  const selected = [lesson(), lesson('nakedPair')];
  const repository = new LessonRepository(catalog(...selected));
  for (const locale of LESSON_LOCALES) {
    const summaries = repository.listLessons(locale);
    expect(summaries.map(item => item.id)).toEqual(
      selected.map(item => item.lesson_id),
    );
    expect(summaries[0].title).toBe(`${locale}: test course`);
    expect(summaries[0]).not.toHaveProperty('example');
    expect(summaries[0]).not.toHaveProperty('source_puzzle_id');
    expect(repository.listLessons(locale, 'nakedPair')).toHaveLength(1);
    const content = repository.getLesson(selected[0].lesson_id, locale)!;
    expect(content.example.candidateMasks).toEqual(
      selected[0].example.candidate_masks,
    );
    expect(content.learningGoal).toBe(`${locale}: test learning goal`);
    expect(content.example).not.toHaveProperty('solutionFingerprint');
    expect(content.example).not.toHaveProperty('source_puzzle_id');
  }
  expect(repository.getLesson('missing', 'en')).toBeNull();
  expect(openBundledLessonRepository().listLessons('en')).toEqual([]);
});

test('takes immutable ownership without sharing progress, solutions or mutable input', () => {
  const selected = lesson();
  const repository = new LessonRepository(catalog(selected));
  const content = repository.getLesson(selected.lesson_id, 'en')!;
  const before = JSON.stringify(content);
  selected.example.step.placements[0].digit = 1;
  (selected.example.candidate_masks as number[]).fill(0);
  expect(JSON.stringify(repository.getLesson(selected.lesson_id, 'en'))).toBe(
    before,
  );
  expect(Object.isFrozen(content.example)).toBe(true);
  expect(Object.isFrozen(content.example.values)).toBe(true);
  expect(Object.isFrozen(content.example.step.placements)).toBe(true);
  expect(content.example).toBe(
    repository.getLesson(selected.lesson_id, 'ja')!.example,
  );
});

test.each(LESSON_LOCALES)(
  'reuses complete reading proofs and all Jellyfish targets in %s',
  locale => {
    const source = lesson('jellyfish');
    const repository = new LessonRepository(catalog(source));
    const content = repository.getLesson(source.lesson_id, locale)!;
    for (const target of content.example.step.eliminations) {
      const presentation = buildLessonPresentation(
        content.example,
        HINT_PRESENTATION_COPIES[locale],
        target,
      );
      expect(presentation).toEqual(
        buildHintPresentation(
          content.example.step,
          HINT_PRESENTATION_COPIES[locale],
          'replay',
          content.example.candidateMasks,
          target,
          undefined,
          true,
        ),
      );
      expect(
        presentation.pages.some(
          page =>
            page.body === HINT_PRESENTATION_COPIES[locale].teaching.legacy,
        ),
      ).toBe(false);
    }
    expect(() =>
      buildLessonPresentation(
        content.example,
        HINT_PRESENTATION_COPIES[locale],
        { cell: -1, digit: 1 },
      ),
    ).toThrow('selected target');
  },
);

test.each([
  [
    'missing language',
    (value: EncodedLesson) => {
      Reflect.deleteProperty(value.texts, 'ja');
    },
  ],
  [
    'empty prose',
    (value: EncodedLesson) => {
      (value.texts.en as { purpose: string }).purpose = ' ';
    },
  ],
  [
    'missing candidates',
    (value: EncodedLesson) => {
      value.example.candidate_masks = [];
    },
  ],
  [
    'incorrect source family',
    (value: EncodedLesson) => {
      value.example.source_family = '0'.repeat(81);
    },
  ],
  [
    'missing structured proof',
    (value: EncodedLesson) => {
      delete value.example.step.proofSteps;
    },
  ],
  [
    'foreign board proof',
    (value: EncodedLesson) => {
      value.example.step.boardFingerprint = '0'.repeat(81);
    },
  ],
  [
    'unexplained direct candidates',
    (value: EncodedLesson) => {
      value.example.candidate_basis = 'board_direct';
    },
  ],
  [
    'solution leakage',
    (value: EncodedLesson) => {
      Object.assign(value.example, {
        solutionFingerprint: example('hiddenSingle').solutionFingerprint,
      });
    },
  ],
])('rejects %s before a lesson is made available', (_, corrupt) => {
  const selected = lesson();
  corrupt(selected);
  expect(() => new LessonRepository(catalog(selected))).toThrow();
});

test('rejects duplicate identifiers and another mode disguised as a lesson catalog', () => {
  expect(() => decodeLessonCatalog(catalog(lesson(), lesson()))).toThrow(
    'duplicate',
  );
  expect(() =>
    decodeLessonCatalog({ content_usage: 'practice', lessons: [] }),
  ).toThrow();
});

test('rejects an otherwise well-formed proof that can only produce a placeholder', () => {
  const selected = lesson('nakedPair');
  selected.example.step.focusCells = [];
  const fallback = buildHintPresentation(
    selected.example.step,
    HINT_PRESENTATION_COPIES.en,
    'replay',
    selected.example.candidate_masks,
  );
  expect(fallback.pages[0].body).toBe(
    HINT_PRESENTATION_COPIES.en.teaching.legacy,
  );
  expect(() => new LessonRepository(catalog(selected))).toThrow(
    'complete walkthrough',
  );
});

function transformSource(
  source: EncodedContentSource,
  rotate: boolean,
  relabel: boolean,
): EncodedContentSource {
  const puzzle = Array<string>(81);
  const board = Array<string>(81);
  const masks = Array<number>(81);
  const digit = (value: number) => (relabel ? (value % 9) + 1 : value);
  source.candidate_masks.forEach((mask, cell) => {
    const row = Math.floor(cell / 9),
      column = cell % 9;
    const target = rotate ? column * 9 + 8 - row : row * 9 + 8 - column;
    for (const [input, output] of [
      [source.puzzle_fingerprint, puzzle],
      [source.board_fingerprint, board],
    ] as const) {
      output[target] =
        input[cell] === '0' ? '0' : String(digit(Number(input[cell])));
    }
    masks[target] = 0;
    for (let value = 1; value <= 9; value++) {
      if (Math.floor(mask / 2 ** (value - 1)) % 2)
        masks[target] += 2 ** (digit(value) - 1);
    }
  });
  return {
    ...source,
    puzzle_fingerprint: puzzle.join(''),
    board_fingerprint: board.join(''),
    candidate_masks: masks,
  };
}

test('rejects source reuse across pools even through a different stage or identifier', () => {
  const lecture = allocation(lesson());
  const practice = {
    ...allocation(lesson('fullHouse'), 'practice'),
    source_puzzle_id: 'different-source-id',
  };
  expect(lecture.board_fingerprint).not.toBe(practice.board_fingerprint);
  expect(() =>
    validateContentAllocations({ allocations: [lecture, practice] }),
  ).toThrow('another content pool');
  expect(
    validateContentAllocations({
      allocations: [lecture, allocation(lesson('fullHouse'))],
    }),
  ).toHaveLength(2);
});

test.each([
  [true, true],
  [true, false],
  [false, true],
  [false, false],
])(
  'rejects transformed cross-pool reuse (rotate %s, relabel %s)',
  (rotate, relabel) => {
    const lecture = allocation(lesson('nakedPair'));
    const transformed = transformSource(lecture, rotate, relabel);
    expect(sourceFamilyKey(transformed.puzzle_fingerprint)).toBe(
      sourceFamilyKey(lecture.puzzle_fingerprint),
    );
    expect(contentSnapshotKey(transformed)).toBe(contentSnapshotKey(lecture));
    const challenge = {
      ...transformed,
      content_id: 'test-challenge',
      content_usage: 'challenge',
      source_puzzle_id: 'renamed-source',
    };
    expect(() =>
      validateContentAllocations({ allocations: [lecture, challenge] }),
    ).toThrow('another content pool');
  },
);

test('snapshot identity retains candidate and given state, and uncheckable sources fail closed', () => {
  const source = allocation(lesson('nakedPair'));
  const masks = [...source.candidate_masks];
  const cell = masks.findIndex(
    mask =>
      Array.from(
        { length: 9 },
        (_, index) => Math.floor(mask / 2 ** index) % 2,
      ).filter(Boolean).length > 1,
  );
  const bit = Array.from({ length: 9 }, (_, index) => 2 ** index).find(
    value => Math.floor(masks[cell] / value) % 2,
  )!;
  masks[cell] -= bit;
  expect(contentSnapshotKey({ ...source, candidate_masks: masks })).not.toBe(
    contentSnapshotKey(source),
  );
  const givenCell = [...source.board_fingerprint].findIndex(
    (value, index) => value !== '0' && source.puzzle_fingerprint[index] === '0',
  );
  expect(givenCell).toBeGreaterThanOrEqual(0);
  const moreGivens = source.puzzle_fingerprint.split('');
  moreGivens[givenCell] = source.board_fingerprint[givenCell];
  expect(
    contentSnapshotKey({ ...source, puzzle_fingerprint: moreGivens.join('') }),
  ).not.toBe(contentSnapshotKey(source));
  const puzzle = source.puzzle_fingerprint.replace(/[2-9]/g, '0');
  expect(() =>
    contentSnapshotKey({ ...source, puzzle_fingerprint: puzzle }),
  ).toThrow('digit anchors');
});
