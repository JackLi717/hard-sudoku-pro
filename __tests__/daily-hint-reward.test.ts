jest.mock('../src/data/sqlite/nitro-database', () => ({
  NitroSqliteDatabase: { open: jest.fn() },
}));

import { UserRepository } from '../src/data/user/user-repository';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import {
  FaultInjectingDatabase,
  NodeSqliteDatabase,
} from './helpers/node-sqlite';

const day = (date: number, hour = 12) =>
  new Date(2026, 9, date, hour).getTime();
async function setup() {
  const database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, day(1));
  return { database, repository: new UserRepository(database) };
}

test('install gift plus first login gives eight hints, once per local date even after restart', async () => {
  const { database, repository } = await setup();
  expect((await repository.readWallet()).smart_hint.balance).toBe(5);
  expect(
    (await repository.claimDailyHintReward(day(1))).wallet.smart_hint.balance,
  ).toBe(8);
  await database.run(
    "UPDATE credit_wallet SET balance = 6 WHERE resource = 'smart_hint'",
  );
  const restarted = new UserRepository(database);
  expect((await restarted.claimDailyHintReward(day(1, 23))).credited).toBe(0);
  expect((await restarted.readWallet()).smart_hint.balance).toBe(6);
  expect((await restarted.claimDailyHintReward(day(2, 0))).credited).toBe(3);
  database.close();
});

test('seven-day cycle repeats and missing a day restarts at day one', async () => {
  const { database, repository } = await setup();
  const grants = [];
  for (let date = 1; date <= 8; date++) {
    grants.push((await repository.claimDailyHintReward(day(date))).credited);
  }
  expect(grants).toEqual([3, 3, 5, 5, 5, 10, 10, 3]);
  expect((await repository.claimDailyHintReward(day(10))).credited).toBe(3);
  const receipts = await database.query<{ value: string }>(
    "SELECT value FROM user_metadata WHERE key = 'daily_hint_reward:2026-10-10'",
  );
  expect(JSON.parse(receipts[0].value)).toEqual({
    date: '2026-10-10',
    cycleDay: 1,
    requested: 3,
    credited: 3,
  });
  database.close();
});

test('overflow is discarded, full-wallet attendance counts and no same-day top-up is deferred', async () => {
  const { database, repository } = await setup();
  await database.run(
    "UPDATE credit_wallet SET balance = 98 WHERE resource = 'smart_hint'",
  );
  expect((await repository.claimDailyHintReward(day(1))).credited).toBe(1);
  expect((await repository.claimDailyHintReward(day(2))).credited).toBe(0);
  await database.run(
    "UPDATE credit_wallet SET balance = 90 WHERE resource = 'smart_hint'",
  );
  expect((await repository.claimDailyHintReward(day(2, 23))).credited).toBe(0);
  expect((await repository.claimDailyHintReward(day(3))).credited).toBe(5);
  expect((await repository.readWallet()).smart_hint.balance).toBe(95);
  database.close();
});

test('backwards dates cannot grant again and the next consecutive calendar date resumes the cycle', async () => {
  const { database, repository } = await setup();
  await repository.claimDailyHintReward(day(4));
  expect((await repository.claimDailyHintReward(day(3))).credited).toBe(0);
  expect((await repository.claimDailyHintReward(day(4, 23))).credited).toBe(0);
  await repository.claimDailyHintReward(day(5));
  expect((await repository.claimDailyHintReward(day(6))).credited).toBe(5);
  database.close();
});

test('calendar dates survive month/year boundaries and daylight saving transitions', async () => {
  const { database, repository } = await setup();
  const dates = [
    new Date(2026, 9, 3, 12),
    new Date(2026, 9, 4, 12),
    new Date(2026, 9, 5, 12),
  ];
  const grants = [];
  for (const date of dates)
    grants.push(
      (await repository.claimDailyHintReward(date.getTime())).credited,
    );
  expect(grants).toEqual([3, 3, 5]);
  expect(
    (
      await repository.claimDailyHintReward(
        new Date(2026, 11, 31, 23).getTime(),
      )
    ).credited,
  ).toBe(3);
  expect(
    (await repository.claimDailyHintReward(new Date(2027, 0, 1, 0).getTime()))
      .credited,
  ).toBe(3);
  expect(
    (await repository.claimDailyHintReward(new Date(2027, 0, 2, 0).getTime()))
      .credited,
  ).toBe(5);
  database.close();
});

test('Premium does not mint daily inventory or backfill Premium days on returning to free', async () => {
  const { database, repository } = await setup();
  await repository.claimDailyHintReward(day(1));
  const entitlement = {
    productId: 'premium',
    entitlement: 'premium',
    platform: 'android' as const,
    active: true,
    originalTransactionId: 'paid',
    lastVerifiedAtEpochMs: day(2),
  };
  await repository.upsertEntitlement(entitlement);
  expect((await repository.claimDailyHintReward(day(2))).credited).toBe(0);
  expect((await repository.claimDailyHintReward(day(3))).credited).toBe(0);
  await repository.upsertEntitlement({ ...entitlement, active: false });
  expect((await repository.claimDailyHintReward(day(4))).credited).toBe(3);
  expect((await repository.readWallet()).smart_hint.balance).toBe(11);
  database.close();
});

test('reward, ledger and dated receipt roll back together and a retry grants once', async () => {
  const { database, repository } = await setup();
  const interrupted = new UserRepository(
    new FaultInjectingDatabase(database, 'INSERT INTO credit_ledger'),
  );
  await expect(interrupted.claimDailyHintReward(day(1))).rejects.toThrow(
    'Injected SQLite failure',
  );
  expect((await repository.readWallet()).smart_hint.balance).toBe(5);
  expect((await repository.claimDailyHintReward(day(1))).credited).toBe(3);
  expect((await repository.claimDailyHintReward(day(1))).credited).toBe(0);
  database.close();
});
