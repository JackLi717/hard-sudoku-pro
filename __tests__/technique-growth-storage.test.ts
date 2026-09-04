import { NodeSqliteDatabase } from './helpers/node-sqlite';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import { TechniqueGrowthRepository } from '../src/data/user/technique-growth-repository';
import { teachingFixture } from './helpers/replay';
import { projectGrowthSession } from '../src/application/technique-growth/projector';

test('additive schema preserves existing games and learning, enforces references, and receipts survive reopen', async () => {
  const db = new NodeSqliteDatabase();
  await migrateUserDatabase(db, 1);
  await db.run(
    "INSERT INTO game_sessions(id,puzzle_id,content_version,difficulty_level,attempt_number,status,revision,state_schema_version,state_json,started_at_ms,updated_at_ms) VALUES ('s','p',1,1,1,'completed',1,1,'{}',1,1)",
  );
  const repo = new TechniqueGrowthRepository(db);
  const event = {
    id: 'e',
    technique: 'fullHouse' as const,
    occurredAt: 100,
    reference: { sessionId: 's', moveIds: ['m'] },
    explanationId: 'proof',
  };
  await repo.saveCompletion(event);
  await repo.saveCompletion({ ...event, occurredAt: 200 });
  expect(await repo.readCompletions()).toEqual([event]);
  const projection = projectGrowthSession(
    teachingFixture().session,
    [],
    [event],
    null,
    300,
  );
  await repo.saveProjection(projection);
  await repo.saveProjection(projection);
  expect(await repo.readProjections()).toHaveLength(1);
  expect(await repo.claimReceipt('light:s', 300)).toBe(true);
  await migrateUserDatabase(db, 400);
  const reopened = new TechniqueGrowthRepository(db);
  expect(await reopened.claimReceipt('light:s', 400)).toBe(false);
  expect(await reopened.readCompletions()).toEqual([event]);
  await expect(
    repo.saveCompletion({
      ...event,
      id: 'bad',
      reference: { sessionId: 'missing', moveIds: [] },
    }),
  ).rejects.toThrow();
  expect(
    (
      await db.query<{ state_json: string }>(
        'SELECT state_json FROM game_sessions',
      )
    )[0].state_json,
  ).toBe('{}');
  expect(
    (await db.query<{ quick_check: string }>('PRAGMA quick_check'))[0]
      .quick_check,
  ).toBe('ok');
  db.close();
});
