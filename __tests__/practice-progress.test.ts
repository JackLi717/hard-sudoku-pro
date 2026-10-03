import { PracticeProgressRepository } from '../src/data/user/practice-progress-repository';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import {
  practiceContentKey,
  practiceScenesFor,
} from '../src/data/practice/practice-catalog';
import { NodeSqliteDatabase } from './helpers/node-sqlite';
import { PracticeTimer } from '../src/domain/practice/practice-timer';

test('practice progress follows stable exercise IDs across added content', async () => {
  const database = new NodeSqliteDatabase();
  try {
    await migrateUserDatabase(database, 0);
    const store = new PracticeProgressRepository(database);
    const scene = practiceScenesFor('hiddenSingle')[1];
    const key = practiceContentKey(scene);
    await store.recordAttempt(scene.id, key, { outcome: 'incorrect' }, 100);
    await store.recordAttempt(
      scene.id,
      key,
      { outcome: 'correct', durationMs: 9000 },
      200,
    );
    await store.recordAttempt(
      scene.id,
      key,
      { outcome: 'correct', durationMs: 7000 },
      250,
    );
    await store.recordAttempt(scene.id, key, { outcome: 'incorrect' }, 275);
    await store.recordAttempt(
      'new-hidden-single',
      'new-content',
      { outcome: 'correct', durationMs: 3000 },
      300,
    );
    expect(await store.listProgress()).toEqual([
      {
        exerciseId: scene.id,
        contentKey: key,
        attempts: 4,
        correctCount: 2,
        lastOutcome: 'incorrect',
        updatedAt: 275,
        firstCorrectAt: 200,
        lastCorrectAt: 250,
        bestDurationMs: 7000,
        lastDurationMs: 7000,
      },
      {
        exerciseId: 'new-hidden-single',
        contentKey: 'new-content',
        attempts: 1,
        correctCount: 1,
        lastOutcome: 'correct',
        updatedAt: 300,
        firstCorrectAt: 300,
        lastCorrectAt: 300,
        bestDurationMs: 3000,
        lastDurationMs: 3000,
      },
    ]);
    await store.recordAttempt(
      scene.id,
      'changed-content',
      { outcome: 'incorrect' },
      400,
    );
    expect((await store.listProgress())[0]).toMatchObject({
      exerciseId: scene.id,
      contentKey: 'changed-content',
      attempts: 1,
      correctCount: 0,
      firstCorrectAt: null,
      lastCorrectAt: null,
      bestDurationMs: null,
      lastDurationMs: null,
    });
  } finally {
    database.close();
  }
});

test('an existing user database gains practice progress without replacing other data', async () => {
  const database = new NodeSqliteDatabase();
  try {
    await migrateUserDatabase(database, 0);
    await database.run('DROP TABLE practice_progress');
    await database.run(
      'INSERT INTO settings(key, value_json, updated_at_ms) VALUES (?, ?, ?)',
      ['language', JSON.stringify('en'), 1],
    );
    await migrateUserDatabase(database, 2);
    const store = new PracticeProgressRepository(database);
    await store.recordAttempt(
      'new-exercise',
      'start-board',
      { outcome: 'correct', durationMs: 1000 },
      3,
    );
    expect((await store.listProgress()).map(item => item.exerciseId)).toEqual([
      'new-exercise',
    ]);
    expect(
      await database.query<{ key: string }>(
        "SELECT key FROM settings WHERE key = 'language'",
      ),
    ).toEqual([{ key: 'language' }]);
  } finally {
    database.close();
  }
});

test('current schema keeps existing practice completions when adding timing columns', async () => {
  const database = new NodeSqliteDatabase();
  try {
    await migrateUserDatabase(database, 0);
    await database.run('DROP TABLE practice_progress');
    await database.run(`CREATE TABLE practice_progress (
      exercise_id TEXT PRIMARY KEY, content_key TEXT NOT NULL,
      attempts INTEGER NOT NULL, correct_count INTEGER NOT NULL,
      last_outcome TEXT NOT NULL, updated_at_ms INTEGER NOT NULL,
      first_correct_at_ms INTEGER
    )`);
    await database.run(
      `INSERT INTO practice_progress VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['existing', 'same-board', 2, 1, 'correct', 100, 100],
    );
    await migrateUserDatabase(database, 2);
    expect(
      await new PracticeProgressRepository(database).listProgress(),
    ).toEqual([
      {
        exerciseId: 'existing',
        contentKey: 'same-board',
        attempts: 2,
        correctCount: 1,
        lastOutcome: 'correct',
        updatedAt: 100,
        firstCorrectAt: 100,
        lastCorrectAt: null,
        bestDurationMs: null,
        lastDurationMs: null,
      },
    ]);
    await migrateUserDatabase(database, 2);
  } finally {
    database.close();
  }
});

test('practice timer excludes background time and stops at the first completion', () => {
  const timer = new PracticeTimer(1000, true);
  timer.setActive(false, 4000);
  timer.setActive(true, 9000);
  expect(timer.finish(11000)).toBe(5000);
  timer.setActive(true, 12000);
  expect(timer.finish(20000)).toBe(5000);
});
