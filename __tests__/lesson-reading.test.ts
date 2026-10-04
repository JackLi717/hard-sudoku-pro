import { LessonController } from '../src/application/lessons/lesson-controller';
import {
  LessonRepository,
  openBundledLessonRepository,
} from '../src/data/lessons/lesson-repository';
import { LessonProgressRepository } from '../src/data/user/lesson-progress-repository';
import {
  migrateUserDatabase,
  USER_SCHEMA_VERSION,
} from '../src/data/sqlite/user-migrations';
import {
  lessonContentKey,
  LessonLocation,
} from '../src/domain/lessons/reading';
import preview from '../src/debug/generated/lesson-preview.json';
import {
  NodeSqliteDatabase,
  FaultInjectingDatabase,
} from './helpers/node-sqlite';

jest.mock('../src/debug/hint-lab', () => {
  throw new Error('Reading cannot load Lab');
});
jest.mock('../src/debug/hint-lab-store', () => {
  throw new Error('Reading cannot access acceptance');
});

const SINGLE = 'preview-hidden-single';
const FISH = 'preview-jellyfish';
let database: NodeSqliteDatabase;
let progress: LessonProgressRepository;
let content: LessonRepository;
let controller: LessonController;
let time: number;

beforeEach(async () => {
  database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, 1);
  progress = new LessonProgressRepository(database);
  content = new LessonRepository(preview);
  time = 100;
  controller = new LessonController(content, progress, 'en', () => ++time);
  await controller.initialize();
});
afterEach(() => database.close());

async function finishProof() {
  const count = controller.snapshot.presentation!.pages.length;
  for (
    let page = controller.snapshot.reading!.location.pageIndex + 1;
    page < count;
    page++
  )
    expect(await controller.setPage(page)).toBe(true);
  expect(await controller.showRecap()).toBe(true);
}

test('directory position is stored separately from lesson reading progress', async () => {
  expect(await progress.readDirectoryOffset()).toBe(0);
  await progress.saveDirectoryOffset(842);
  const reopened = new LessonProgressRepository(database);
  expect(await reopened.readDirectoryOffset()).toBe(842);
  expect(await reopened.listReadings()).toEqual([]);
});

test('only an explicit recap completion marks reading; restart and reopening preserve it', async () => {
  expect(controller.snapshot.lessons).toHaveLength(preview.lessons.length);
  expect(
    controller.snapshot.lessons.every(item => item.readingState === 'unread'),
  ).toBe(true);
  await controller.openLesson(SINGLE);
  expect(await controller.complete()).toBe(false);
  await controller.startProof();
  expect(await controller.showRecap()).toBe(false);
  expect(await controller.complete()).toBe(false);
  await finishProof();
  expect((await progress.listReadings())[0].completedAt).toBeNull();
  await controller.complete();
  expect(controller.snapshot.lesson).toBeNull();
  const completedAt = (await progress.listReadings())[0].completedAt;
  expect(completedAt).not.toBeNull();
  expect(controller.snapshot.lessons[0].readingState).toBe('completed');
  await controller.openLesson(SINGLE);
  expect(controller.snapshot.reading!.location.chapter).toBe('recap');
  await controller.replay();
  expect(controller.snapshot.reading!.location.pageIndex).toBe(0);
  expect(controller.snapshot.reading!.completedAt).toBe(completedAt);
  await finishProof();
  await controller.complete();
  expect((await progress.listReadings())[0].completedAt).toBe(completedAt);
  await controller.openLesson(SINGLE, true);
  expect(controller.snapshot.reading!.location.chapter).toBe('intro');
  expect(controller.snapshot.reading!.completedAt).toBe(completedAt);
});

test('the last pattern page records completion without leaving the board', async () => {
  content = openBundledLessonRepository();
  controller = new LessonController(content, progress, 'en', () => ++time);
  await controller.initialize();
  expect(await controller.openLesson('hiddenTriple-row')).toBe(true);
  const finalPage = controller.snapshot.presentation!.pages.length - 1;
  expect(finalPage).toBeGreaterThan(0);
  for (let page = 1; page < finalPage; page++) {
    expect(await controller.setPage(page)).toBe(true);
  }
  expect(controller.snapshot.reading!.completedAt).toBeNull();

  jest.spyOn(progress, 'saveLocation').mockRejectedValueOnce(new Error('disk'));
  expect(await controller.setPage(finalPage)).toBe(false);
  expect(controller.snapshot.reading!.completedAt).toBeNull();
  expect(await controller.retry()).toBe(true);
  expect(controller.snapshot.reading!.location.pageIndex).toBe(finalPage);
  expect(controller.snapshot.reading!.completedAt).not.toBeNull();
  expect(controller.snapshot.lesson?.id).toBe('hiddenTriple-row');
  expect(
    controller.snapshot.lessons.find(item => item.id === 'hiddenTriple-row')
      ?.readingState,
  ).toBe('completed');

  controller.back();
  controller = new LessonController(content, progress, 'en', () => ++time);
  await controller.initialize();
  expect(
    controller.snapshot.lessons.find(item => item.id === 'hiddenTriple-row')
      ?.readingState,
  ).toBe('completed');
  expect(await controller.openLesson('nakedSingle-cell')).toBe(true);
  const singleFinalPage = controller.snapshot.presentation!.pages.length - 1;
  for (let page = 1; page <= singleFinalPage; page++) {
    expect(await controller.setPage(page)).toBe(true);
  }
  expect(controller.snapshot.reading!.completedAt).not.toBeNull();
});

test('restores intro, proof and recap after fresh controllers and leaves the fixed example unchanged', async () => {
  const original = JSON.stringify(content.getLesson(SINGLE, 'en'));
  await controller.openLesson(SINGLE);
  for (const chapter of ['intro', 'proof', 'recap']) {
    if (chapter === 'proof') {
      await controller.startProof();
      await controller.setPage(1);
    }
    if (chapter === 'recap') await finishProof();
    const saved = controller.snapshot.reading!.location;
    expect(controller.back()).toBe(true);
    controller = new LessonController(
      content,
      progress,
      'zh-Hans',
      () => ++time,
    );
    await controller.initialize();
    expect(controller.snapshot.continueLessonId).toBe(SINGLE);
    await controller.openLesson(SINGLE);
    expect(controller.snapshot.reading!.location).toEqual(saved);
    expect(controller.snapshot.lesson!.title).toBe('隐性唯一数');
    expect(controller.snapshot.reading!.completedAt).toBeNull();
  }
  expect(JSON.stringify(content.getLesson(SINGLE, 'en'))).toBe(original);
});

test('persists target changes, resets proof and restores the same target across languages', async () => {
  await controller.openLesson(FISH);
  await controller.startProof();
  await controller.setPage(1);
  const target = controller.snapshot.lesson!.example.step.eliminations.at(-1)!;
  expect(await controller.selectTarget(target)).toBe(true);
  expect(controller.snapshot.reading!.location).toEqual({
    chapter: 'proof',
    pageIndex: 0,
    target,
  });
  await controller.setPage(1);
  const saved = controller.snapshot.reading!.location;
  controller = new LessonController(content, progress, 'de');
  await controller.initialize();
  await controller.openLesson(FISH);
  expect(controller.snapshot.reading!.location).toEqual(saved);
  expect(await controller.selectTarget({ cell: 0, digit: 9 })).toBe(false);
});

test('serializes save and navigation, ignores repeated taps and blocks Back during the write', async () => {
  await controller.openLesson(SINGLE);
  const save = progress.saveLocation.bind(progress);
  let release!: () => void;
  jest
    .spyOn(progress, 'saveLocation')
    .mockImplementationOnce(async (...args) => {
      await new Promise<void>(resolve => {
        release = resolve;
      });
      return save(...args);
    });
  const operation = controller.startProof();
  expect(controller.snapshot.busy).toBe(true);
  expect(controller.snapshot.reading!.location.chapter).toBe('intro');
  expect(controller.back()).toBe(true);
  expect(controller.snapshot.lesson!.id).toBe(SINGLE);
  expect(await controller.startProof()).toBe(false);
  expect(await controller.openLesson(FISH)).toBe(false);
  release();
  await operation;
  expect(controller.snapshot.reading!.location.chapter).toBe('proof');
  expect(controller.back()).toBe(true);
  expect(controller.back()).toBe(false);
});

test('failed writes retain accepted location and retry; failed completion does not claim success', async () => {
  await controller.openLesson(SINGLE);
  jest.spyOn(progress, 'saveLocation').mockRejectedValueOnce(new Error('disk'));
  expect(await controller.startProof()).toBe(false);
  expect(controller.snapshot.error).toBe('save');
  expect(controller.snapshot.reading!.location.chapter).toBe('intro');
  expect((await progress.listReadings())[0].location.chapter).toBe('intro');
  expect(await controller.retry()).toBe(true);
  await finishProof();
  jest.spyOn(progress, 'saveLocation').mockRejectedValueOnce(new Error('disk'));
  expect(await controller.complete()).toBe(false);
  expect(controller.snapshot.reading!.completedAt).toBeNull();
  expect(controller.snapshot.lesson).not.toBeNull();
  await controller.retry();
  expect(controller.snapshot.lesson).toBeNull();
  expect(controller.snapshot.lessons[0].readingState).toBe('completed');
});

test('load failure is retryable and absent courses cannot create records', async () => {
  controller = new LessonController(content, progress, 'en');
  jest.spyOn(progress, 'listReadings').mockRejectedValueOnce(new Error('disk'));
  expect(await controller.initialize()).toBe(false);
  expect(controller.snapshot.ready).toBe(false);
  expect(await controller.openLesson(SINGLE)).toBe(false);
  expect(await controller.retry()).toBe(true);
  expect(await controller.openLesson('absent')).toBe(false);
  expect(await progress.listReadings()).toHaveLength(0);
});

test('unpublished and removed courses do not appear or continue, and replaced content resets reading', async () => {
  await controller.openLesson(SINGLE);
  await controller.startProof();
  await finishProof();
  await controller.complete();
  const replacement = JSON.parse(JSON.stringify(preview));
  replacement.lessons[0].example.example_id += '-replacement';
  controller = new LessonController(
    new LessonRepository(replacement),
    progress,
    'en',
  );
  await controller.initialize();
  expect(controller.snapshot.lessons[0].readingState).toBe('unread');
  await controller.openLesson(SINGLE);
  expect(controller.snapshot.reading!.location.chapter).toBe('intro');
  expect(controller.snapshot.reading!.completedAt).toBeNull();
  controller = new LessonController(
    new LessonRepository({ content_usage: 'lesson', lessons: [] }),
    progress,
    'en',
  );
  await controller.initialize();
  expect(controller.snapshot.lessons).toEqual([]);
  expect(controller.snapshot.continueLessonId).toBeNull();
});

test('repairs out-of-range or invalid target locations without trusting recap or completion', async () => {
  const lesson = content.getLesson(FISH, 'en')!;
  await progress.saveLocation(
    FISH,
    lessonContentKey(lesson),
    { chapter: 'recap', pageIndex: 999, target: { cell: 0, digit: 9 } },
    2,
  );
  await controller.initialize();
  await controller.openLesson(FISH);
  expect(controller.snapshot.reading!.location.chapter).toBe('proof');
  expect(controller.snapshot.reading!.location.pageIndex).toBe(0);
  expect(controller.snapshot.reading!.location.target).toEqual(
    lesson.example.step.eliminations[0],
  );
  expect(controller.snapshot.reading!.completedAt).toBeNull();
});

test('SQL facts persist across repository instances, preserve completion and do not touch other product data', async () => {
  const walletBefore = await database.query('SELECT * FROM credit_wallet');
  const location: LessonLocation = {
    chapter: 'recap',
    pageIndex: 3,
    target: null,
  };
  await progress.saveLocation('lesson-a', 'key-a', location, 20, true);
  const reopened = new LessonProgressRepository(database);
  await reopened.saveLocation(
    'lesson-a',
    'key-a',
    { ...location, chapter: 'proof', pageIndex: 0 },
    30,
  );
  expect((await reopened.listReadings())[0].completedAt).toBe(20);
  await reopened.saveLocation('lesson-a', 'key-a', location, 40, true);
  expect((await reopened.listReadings())[0].completedAt).toBe(20);
  await reopened.saveLocation('lesson-b', 'key-b', location, 50);
  expect((await reopened.listReadings()).map(row => row.lessonId)).toEqual([
    'lesson-b',
    'lesson-a',
  ]);
  await reopened.saveLocation(
    'lesson-a',
    'changed-key',
    { ...location, chapter: 'intro', pageIndex: 0 },
    60,
  );
  expect((await reopened.listReadings())[0].completedAt).toBeNull();
  expect(await database.query('SELECT * FROM credit_wallet')).toEqual(
    walletBefore,
  );
  for (const table of [
    'game_sessions',
    'game_attempts',
    'technique_learning_events',
    'technique_growth_projection',
    'credit_ledger',
  ]) {
    expect(await database.query(`SELECT * FROM ${table}`)).toEqual([]);
  }
  await migrateUserDatabase(database, 100);
  expect((await reopened.listReadings()).length).toBe(2);
  expect(await database.query('PRAGMA user_version')).toEqual([
    { user_version: USER_SCHEMA_VERSION },
  ]);
});

test('SQL rejects invalid completion/location and rolls back failed saves', async () => {
  const location: LessonLocation = {
    chapter: 'intro',
    pageIndex: 0,
    target: null,
  };
  await expect(
    progress.saveLocation('lesson', 'key', location, 1, true),
  ).rejects.toThrow();
  await expect(
    progress.saveLocation('lesson', 'key', { ...location, pageIndex: -1 }, 1),
  ).rejects.toThrow();
  await expect(
    progress.saveLocation('lesson', 'key', location, -1),
  ).rejects.toThrow();
  const failing = new LessonProgressRepository(
    new FaultInjectingDatabase(database, 'INSERT INTO lesson_readings'),
  );
  await expect(
    failing.saveLocation('lesson', 'key', location, 1),
  ).rejects.toThrow();
  expect(await progress.listReadings()).toEqual([]);
});
