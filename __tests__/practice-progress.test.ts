import { PracticeProgressRepository } from '../src/data/user/practice-progress-repository';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import {
  practiceContentKey,
  practiceScenesFor,
} from '../src/data/practice/practice-catalog';
import { NodeSqliteDatabase } from './helpers/node-sqlite';

test('practice progress follows stable exercise IDs across added content', async () => {
  const database = new NodeSqliteDatabase();
  try {
    await migrateUserDatabase(database, 0);
    const store = new PracticeProgressRepository(database);
    const scene = practiceScenesFor('hiddenSingle')[1];
    const key = practiceContentKey(scene);
    await store.recordAttempt(scene.id, key, 'incorrect', 100);
    await store.recordAttempt(scene.id, key, 'correct', 200);
    await store.recordAttempt(
      'new-hidden-single',
      'new-content',
      'correct',
      300,
    );
    expect(await store.listProgress()).toEqual([
      {
        exerciseId: scene.id,
        contentKey: key,
        attempts: 2,
        correctCount: 1,
        lastOutcome: 'correct',
        updatedAt: 200,
        firstCorrectAt: 200,
      },
      {
        exerciseId: 'new-hidden-single',
        contentKey: 'new-content',
        attempts: 1,
        correctCount: 1,
        lastOutcome: 'correct',
        updatedAt: 300,
        firstCorrectAt: 300,
      },
    ]);
    await store.recordAttempt(scene.id, 'changed-content', 'incorrect', 400);
    expect((await store.listProgress())[0]).toMatchObject({
      exerciseId: scene.id,
      contentKey: 'changed-content',
      attempts: 1,
      correctCount: 0,
      firstCorrectAt: null,
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
    await store.recordAttempt('new-exercise', 'start-board', 'correct', 3);
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
