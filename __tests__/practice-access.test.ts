import { PracticeAccessRepository } from '../src/data/user/practice-access-repository';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import { accessibleExerciseCount } from '../src/domain/practice/access';
import { NodeSqliteDatabase } from './helpers/node-sqlite';

test('the same access rule applies to every technique and Premium', () => {
  expect(accessibleExerciseCount(3, false, 0)).toBe(3);
  expect(accessibleExerciseCount(30, false, 0)).toBe(5);
  expect(accessibleExerciseCount(30, false, 1)).toBe(10);
  expect(accessibleExerciseCount(30, false, 5)).toBe(30);
  expect(accessibleExerciseCount(30, true, 0)).toBe(30);
});

test('rewarded practice batches persist per technique and event cannot grant twice', async () => {
  const database = new NodeSqliteDatabase();
  try {
    await migrateUserDatabase(database, 0);
    const access = new PracticeAccessRepository(database);
    expect(await access.readUnlockedBatches('swordfish')).toBe(0);
    expect(await access.grantNextBatch('swordfish', 30, 'ad-1', 1)).toBe(1);
    expect(await access.grantNextBatch('swordfish', 30, 'ad-1', 2)).toBe(1);
    expect(await access.readUnlockedBatches('finnedXWing')).toBe(0);
    expect(await access.grantNextBatch('finnedXWing', 30, 'ad-2', 3)).toBe(1);
    const reopened = new PracticeAccessRepository(database);
    expect(await reopened.readUnlockedBatches('swordfish')).toBe(1);
    await expect(
      reopened.grantNextBatch('sashimiXWing', 30, 'ad-1', 4),
    ).rejects.toThrow('reused');
    for (let batch = 2; batch <= 5; batch += 1) {
      expect(
        await reopened.grantNextBatch(
          'swordfish',
          30,
          `ad-${batch + 1}`,
          batch,
        ),
      ).toBe(batch);
    }
    expect(await reopened.grantNextBatch('swordfish', 30, 'ad-extra', 9)).toBe(
      5,
    );
  } finally {
    database.close();
  }
});
