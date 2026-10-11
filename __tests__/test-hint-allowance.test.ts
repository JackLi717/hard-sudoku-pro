jest.mock('../src/data/sqlite/nitro-database', () => ({
  NitroSqliteDatabase: { open: jest.fn() },
}));
import { UserRepository } from '../src/data/user/user-repository';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import { dispatchGameCommand } from '../src/domain/game/engine';
import {
  kiteDefinition,
  kiteGame,
  kiteHint,
} from './helpers/ipad-hint-assistance';
import {
  FaultInjectingDatabase,
  NodeSqliteDatabase,
} from './helpers/node-sqlite';

async function setup() {
  const database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, 100);
  const repository = new UserRepository(database, true);
  await repository.initializeTestHintAllowance();
  await database.run(
    "UPDATE credit_wallet SET balance = 0 WHERE resource = 'smart_hint'",
  );
  const game = kiteGame();
  await repository.createSession(game, 'start');
  const reveal = dispatchGameCommand(game, kiteDefinition, {
    type: 'reveal_hint',
    step: kiteHint,
    availableCredits: 999,
    atEpochMs: 2000,
  });
  expect(reveal.accepted).toBe(true);
  return { database, repository, game, reveal };
}

test('a replayed hint receipt cannot spend the test allowance twice or top it up on restart', async () => {
  const { database, repository, game, reveal } = await setup();
  try {
    expect(
      (await repository.persistCommand(reveal, 'show', game.state.revision))
        .testHintAllowance,
    ).toBe(998);
    expect(
      (await repository.persistCommand(reveal, 'show', game.state.revision))
        .alreadyCommitted,
    ).toBe(true);
    const reopened = new UserRepository(database, true);
    await reopened.initializeTestHintAllowance();
    expect(await reopened.readTestHintAllowance()).toBe(998);
    expect((await reopened.readWallet()).smart_hint.balance).toBe(0);
    expect(await reopened.getEntitlement('premium')).toBeNull();
    expect(await new UserRepository(database).readTestHintAllowance()).toBe(0);
  } finally {
    database.close();
  }
});

test('failure after test allowance deduction rolls back the hint and allowance together', async () => {
  const { database, repository, game, reveal } = await setup();
  try {
    const failing = new UserRepository(
      new FaultInjectingDatabase(database, 'INSERT INTO game_action_receipts'),
      true,
    );
    await expect(
      failing.persistCommand(reveal, 'show', game.state.revision),
    ).rejects.toThrow('Injected SQLite failure');
    expect(await repository.readTestHintAllowance()).toBe(999);
    const restored = await repository.restoreUnfinishedSession(4, 3000);
    if (restored.status !== 'ready') throw new Error('Restore failed');
    expect(restored.session.state.hintUseCount).toBe(0);
    expect(restored.session.state.activeHint).toBeNull();
    expect((await repository.readWallet()).smart_hint.balance).toBe(0);
  } finally {
    database.close();
  }
});
