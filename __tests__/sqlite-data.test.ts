import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import path from 'node:path';

jest.mock('../src/native/NativeContentDatabase', () => ({
  __esModule: true,
  default: { installBundledContentDatabase: jest.fn() },
}));
jest.mock('../src/data/sqlite/nitro-database', () => ({
  NitroSqliteDatabase: { open: jest.fn() },
}));

import { ContentRepository } from '../src/data/content/content-database';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  PersistentGameService,
  ProductPreferencesController,
} from '../src/application';
import { DatabaseRecoveryError } from '../src/data/sqlite/contracts';
import {
  USER_SCHEMA_VERSION,
  migrateUserDatabase,
} from '../src/data/sqlite/user-migrations';
import { UserRepository } from '../src/data/user/user-repository';
import {
  CreateGameInput,
  GameCommand,
  GameCommandResult,
  GameDefinition,
  GameSession,
  HINT_STEP_CONTRACT_VERSION,
  HintStep,
  createGameSession,
  dispatchGameCommand,
} from '../src/domain';
import {
  FaultInjectingDatabase,
  NodeSqliteDatabase,
} from './helpers/node-sqlite';

const puzzle =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

function definition(
  puzzleFingerprint = puzzle,
  difficultyLevel: GameDefinition['difficultyLevel'] = 3,
): GameDefinition {
  return {
    puzzleId: `puzzle-${difficultyLevel}`,
    contentVersion: 4,
    difficultyLevel,
    puzzleFingerprint,
    solutionFingerprint: solution,
  };
}

function createSession(
  gameDefinition = definition(),
  sessionId = 'session-1',
): GameSession {
  const input: CreateGameInput = {
    sessionId,
    definition: gameDefinition,
    startedAtEpochMs: 1_000,
  };
  return createGameSession(input);
}

function command(
  session: GameSession,
  gameDefinition: GameDefinition,
  value: GameCommand,
): GameCommandResult {
  const result = dispatchGameCommand(session, gameDefinition, value);
  expect(result.accepted).toBe(true);
  return result;
}

function eliminationStep(boardFingerprint: string): HintStep {
  return {
    contractVersion: HINT_STEP_CONTRACT_VERSION,
    boardFingerprint,
    techniqueCode: 'lockedCandidates.pointing',
    difficultyLevel: 2,
    focusCells: [2],
    focusRegions: [{ kind: 'row', index: 0 }],
    premiseCandidates: [],
    eliminations: [{ cell: 2, digit: 1 }],
    placements: [],
    explanationKey: 'hint.lockedCandidates.pointing',
    explanationParams: {},
  };
}

async function migratedDatabase(): Promise<NodeSqliteDatabase> {
  const database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, 100);
  return database;
}

describe('SQLite data layer', () => {
  test('migrates user.sqlite idempotently and persists settings and entitlement cache', async () => {
    const database = await migratedDatabase();
    await migrateUserDatabase(database, 200);
    const [version] = await database.query<{ user_version: number }>(
      'PRAGMA user_version',
    );
    expect(version.user_version).toBe(USER_SCHEMA_VERSION);

    const repository = new UserRepository(database);
    await repository.setSetting('appearance', { mode: 'dark' }, 300);
    expect(await repository.getSetting('appearance')).toEqual({ mode: 'dark' });

    const preferences = new ProductPreferencesController(
      repository,
      () => 'en-US',
      () => 350,
    );
    await preferences.initialize();
    await preferences.setLocale('ja');
    await preferences.setTheme('dark');
    await preferences.setHintAnimations(false);
    const restoredPreferences = new ProductPreferencesController(
      repository,
      () => 'de-DE',
    );
    await restoredPreferences.initialize();
    expect(restoredPreferences.snapshot).toEqual({
      effectiveLocale: 'ja',
      preferences: {
        ...DEFAULT_PRODUCT_PREFERENCES,
        locale: 'ja',
        theme: 'dark',
        hintAnimations: false,
      },
    });

    await repository.upsertEntitlement({
      productId: 'premium',
      entitlement: 'premium',
      platform: 'ios',
      active: true,
      originalTransactionId: 'original-1',
      lastVerifiedAtEpochMs: 400,
    });
    expect(await repository.getEntitlement('premium')).toEqual({
      productId: 'premium',
      entitlement: 'premium',
      platform: 'ios',
      active: true,
      originalTransactionId: 'original-1',
      lastVerifiedAtEpochMs: 400,
    });
    database.close();
  });

  test('rolls back a failed migration and preserves the prior schema', async () => {
    const database = new NodeSqliteDatabase();
    database.native.exec(
      readFileSync(
        path.join(process.cwd(), 'database/schema/user-v1.sql'),
        'utf8',
      ),
    );
    const failing = new FaultInjectingDatabase(
      database,
      'CREATE TABLE app_recovery_events',
    );
    await expect(migrateUserDatabase(failing, 200)).rejects.toMatchObject({
      reason: 'migration_failed',
    });
    const [version] = await database.query<{ user_version: number }>(
      'PRAGMA user_version',
    );
    expect(version.user_version).toBe(1);
    const columns = await database.query<{ name: string }>(
      'PRAGMA table_info(game_moves)',
    );
    expect(columns.map(column => column.name)).not.toContain('active');
    database.close();
  });

  test('atomically saves a credit-consuming action and restores it after restart', async () => {
    const database = await migratedDatabase();
    const repository = new UserRepository(database);
    const gameDefinition = definition();
    const initial = createSession(gameDefinition);
    await repository.createSession(initial, 'start-1');
    await repository.createSession(initial, 'start-1');

    const generated = command(initial, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 3,
      atEpochMs: 1_100,
    });
    const committed = await repository.persistCommand(
      generated,
      'quick-draft-1',
      0,
    );
    expect(committed.wallet?.quick_pencil.balance).toBe(2);

    const duplicate = await repository.persistCommand(
      generated,
      'quick-draft-1',
      0,
    );
    expect(duplicate.alreadyCommitted).toBe(true);
    expect(duplicate.wallet?.quick_pencil.balance).toBe(2);

    const restartedRepository = new UserRepository(database);
    const restored = await restartedRepository.restoreUnfinishedSession(
      4,
      9_000,
    );
    expect(restored.status).toBe('ready');
    if (restored.status === 'ready') {
      expect(restored.session.state.candidates.quickDraftGenerated).toBe(true);
      expect(restored.session.state.timer.runningSinceEpochMs).toBe(9_000);
    }
    expect(
      (await restartedRepository.restoreUnfinishedSession(5, 9_000)).status,
    ).toBe('content_changed');
    database.close();
  });

  test('keeps selection transient while durable state waits for a successful save', async () => {
    const database = await migratedDatabase();
    const baseRepository = new UserRepository(database);
    const gameDefinition = definition();
    const service = await PersistentGameService.start(
      {
        sessionId: 'service-session',
        definition: gameDefinition,
        startedAtEpochMs: 1_000,
      },
      baseRepository,
      'service-start',
    );
    const failingStore = new UserRepository(
      new FaultInjectingDatabase(database, 'UPDATE game_sessions SET'),
    );
    const restoredService = PersistentGameService.fromRestored(
      service.session,
      gameDefinition,
      failingStore,
    );

    const selected = restoredService.selectCell({
      type: 'select_cell',
      cell: 2,
      atEpochMs: 1_100,
    });
    expect(selected.accepted).toBe(true);
    expect(restoredService.session.state.selectedCell).toBe(2);
    expect(restoredService.session.state.revision).toBe(0);

    await expect(
      restoredService.dispatch(
        { type: 'set_pencil_mode', enabled: true, atEpochMs: 1_200 },
        'service-pencil',
      ),
    ).rejects.toThrow('Injected SQLite failure');
    expect(restoredService.session.state.selectedCell).toBe(2);
    expect(restoredService.session.state.candidates.pencilMode).toBe(false);

    const healthyService = PersistentGameService.fromRestored(
      restoredService.session,
      gameDefinition,
      baseRepository,
    );
    const paused = await healthyService.dispatch(
      { type: 'pause', atEpochMs: 1_300 },
      'service-pause',
    );
    expect(paused.session.state.status).toBe('paused');
    expect(paused.session.state.selectedCell).toBe(2);
    const restored = await baseRepository.restoreUnfinishedSession(4, 2_000);
    expect(restored.status).toBe('ready');
    if (restored.status === 'ready') {
      expect(restored.session.state.selectedCell).toBe(2);
    }
    database.close();
  });

  test('rolls back state and wallet together when interrupted during ledger write', async () => {
    const database = await migratedDatabase();
    const repository = new UserRepository(database);
    const gameDefinition = definition();
    const initial = createSession(gameDefinition);
    await repository.createSession(initial, 'start-1');
    const generated = command(initial, gameDefinition, {
      type: 'generate_quick_draft',
      confirmed: false,
      availableCredits: 3,
      atEpochMs: 1_100,
    });

    const interruptedRepository = new UserRepository(
      new FaultInjectingDatabase(database, 'INSERT INTO credit_ledger'),
    );
    await expect(
      interruptedRepository.persistCommand(generated, 'quick-atomic', 0),
    ).rejects.toThrow('Injected SQLite failure');

    expect((await repository.readWallet()).quick_pencil.balance).toBe(3);
    const [stored] = await database.query<{ revision: number }>(
      'SELECT revision FROM game_sessions WHERE id = ?',
      [initial.state.sessionId],
    );
    expect(stored.revision).toBe(0);

    await repository.persistCommand(generated, 'quick-atomic', 0);
    expect((await repository.readWallet()).quick_pencil.balance).toBe(2);
    database.close();
  });

  test('restores an applied hint and its complete undo snapshot after process death', async () => {
    const database = await migratedDatabase();
    const repository = new UserRepository(database);
    const gameDefinition = definition();
    let session = createSession(gameDefinition);
    await repository.createSession(session, 'hint-start');

    const prepared = command(session, gameDefinition, {
      type: 'prepare_hint',
      atEpochMs: 1_100,
    });
    await repository.persistCommand(prepared, 'hint-prepare', 0);
    session = prepared.session;

    const revealed = command(session, gameDefinition, {
      type: 'reveal_hint',
      step: eliminationStep(prepared.hintRequest!.boardFingerprint),
      availableCredits: 5,
      atEpochMs: 1_200,
    });
    await repository.persistCommand(revealed, 'hint-reveal', 1);
    session = revealed.session;

    const applied = command(session, gameDefinition, {
      type: 'apply_hint',
      moveId: 'hint-move',
      atEpochMs: 1_300,
    });
    await repository.persistCommand(applied, 'hint-apply', 2);

    const restored = await new UserRepository(
      database,
    ).restoreUnfinishedSession(4, 2_000);
    expect(restored.status).toBe('ready');
    if (restored.status === 'ready') {
      expect(restored.session.history).toHaveLength(1);
      expect(restored.session.history[0].appliedHint?.techniqueCode).toBe(
        'lockedCandidates.pointing',
      );
      expect(restored.session.state.candidates.hintCandidates).not.toBeNull();
      expect(restored.session.state.candidates.hintCandidates![2] % 2).toBe(0);
      const undone = command(restored.session, gameDefinition, {
        type: 'undo',
        atEpochMs: 2_100,
      });
      expect(undone.session.state.candidates.hintCandidates![2] % 2).toBe(1);
    }
    expect((await repository.readWallet()).smart_hint.balance).toBe(4);
    database.close();
  });

  test('settles completion, first reward, stats, and receipt in one idempotent transaction', async () => {
    const database = await migratedDatabase();
    const repository = new UserRepository(database);
    const almostSolved = `0${solution.slice(1)}`;
    const gameDefinition = definition(almostSolved, 1);
    let session = createSession(gameDefinition, 'completion-session');
    await repository.createSession(session, 'completion-start');

    const selected = command(session, gameDefinition, {
      type: 'select_cell',
      cell: 0,
      atEpochMs: 1_100,
    });
    session = selected.session;

    const completed = command(session, gameDefinition, {
      type: 'input_digit',
      digit: 5,
      moveId: 'final-move',
      atEpochMs: 1_200,
    });
    expect(completed.session.state.status).toBe('completed');
    const settlement = await repository.persistCommand(
      completed,
      'complete-puzzle',
      0,
    );
    expect(settlement.reward).toEqual({
      isFirstCompletion: true,
      quickPencil: 1,
      smartHint: 1,
      perfectBonus: true,
      streakBonus: false,
    });
    expect(settlement.wallet?.quick_pencil.balance).toBe(4);
    expect(settlement.wallet?.smart_hint.balance).toBe(6);
    expect(await repository.listCreditLedger()).toHaveLength(2);
    expect(await repository.getCompletionProgress()).toMatchObject({
      completedPuzzleIds: [gameDefinition.puzzleId],
      currentFirstCompletionStreak: 1,
      bestFirstCompletionStreak: 1,
    });

    const duplicate = await repository.persistCommand(
      completed,
      'complete-puzzle',
      1,
    );
    expect(duplicate.alreadyCommitted).toBe(true);
    expect(duplicate.reward).toEqual(settlement.reward);
    expect(await repository.getStatistics()).toMatchObject({
      attempts: 1,
      completions: 1,
      failures: 0,
      abandonments: 0,
    });
    const [rewardCount] = await database.query<{ count: number }>(
      'SELECT COUNT(*) AS count FROM puzzle_completion_rewards',
    );
    expect(rewardCount.count).toBe(1);
    database.close();
  });

  test('reports structurally corrupted saved state without deleting it', async () => {
    const database = await migratedDatabase();
    const repository = new UserRepository(database);
    const initial = createSession();
    await repository.createSession(initial, 'start-corrupt');
    await database.run(
      "UPDATE game_sessions SET state_json = '{}' WHERE id = ?",
      [initial.state.sessionId],
    );
    await expect(
      repository.restoreUnfinishedSession(4, 2_000),
    ).rejects.toBeInstanceOf(DatabaseRecoveryError);
    const [stillThere] = await database.query<{ count: number }>(
      'SELECT COUNT(*) AS count FROM game_sessions',
    );
    expect(stillThere.count).toBe(1);
    database.close();
  });

  test('queries the packaged production catalog in stable difficulty order', async () => {
    const native = new DatabaseSync(
      path.join(
        process.cwd(),
        'tools/puzzle-generator/output/content-v4/content.sqlite',
      ),
      { readOnly: true },
    );
    const database = new NodeSqliteDatabase(native);
    const repository = new ContentRepository(database, {
      contentVersion: 4,
      schemaVersion: 1,
      puzzleCount: 10_000,
      ratingVersion: 'hodoku2-2.4.3+hsp-1.2',
    });
    const levelOne = await repository.listPuzzles(1);
    expect(levelOne).toHaveLength(500);
    expect(levelOne[0].difficultyScore).toBeLessThanOrEqual(
      levelOne[levelOne.length - 1].difficultyScore,
    );
    expect(await repository.getPuzzle(levelOne[0].id)).toEqual(levelOne[0]);

    const xWingAndXyWing = await repository.findPuzzlesByRatingTechniques({
      techniqueCodes: ['xWing', 'xyWing'],
    });
    expect(xWingAndXyWing).toHaveLength(299);
    expect(
      await repository.findPuzzlesByRatingTechniques({
        techniqueCodes: ['xWing', 'xChain'],
        limit: 5,
      }),
    ).toHaveLength(5);
    expect(
      await repository.findPuzzlesByRatingTechniques({
        techniqueCodes: ['hiddenQuad', 'jellyfish'],
        match: 'any',
      }),
    ).toHaveLength(14);
    await expect(
      repository.findPuzzlesByRatingTechniques({ techniqueCodes: [] }),
    ).rejects.toThrow('At least one valid technique code is required.');
    repository.close();
  });
});

test('rolls back incremental history changes with the session and receipt', async () => {
  const database = await migratedDatabase();
  const repository = new UserRepository(database);
  const gameDefinition = definition();
  const initial = createSession(gameDefinition);
  await repository.createSession(initial, 'incremental-start');
  const selected = command(initial, gameDefinition, {
    type: 'select_cell',
    cell: 2,
    atEpochMs: 1100,
  }).session;
  const placed = command(selected, gameDefinition, {
    type: 'input_digit',
    digit: 4,
    moveId: 'incremental-move',
    atEpochMs: 1200,
  });
  const failingRepository = new UserRepository(
    new FaultInjectingDatabase(database, 'INSERT INTO game_action_receipts'),
  );
  await expect(
    failingRepository.persistCommand(placed, 'incremental-place', 0),
  ).rejects.toThrow('Injected SQLite failure');
  expect(await database.query('SELECT id FROM game_moves')).toEqual([]);
  expect(await database.query('SELECT revision FROM game_sessions')).toEqual([
    { revision: 0 },
  ]);
  await repository.persistCommand(placed, 'incremental-place', 0);
  const undone = command(placed.session, gameDefinition, {
    type: 'undo',
    atEpochMs: 1300,
  });
  await expect(
    failingRepository.persistCommand(undone, 'incremental-undo', 1),
  ).rejects.toThrow('Injected SQLite failure');
  expect(await database.query('SELECT active FROM game_moves')).toEqual([
    { active: 1 },
  ]);
  expect(await database.query('SELECT revision FROM game_sessions')).toEqual([
    { revision: 1 },
  ]);
  await repository.persistCommand(undone, 'incremental-undo', 1);
  await repository.persistCommand(undone, 'incremental-undo', 1);
  expect(await database.query('SELECT active FROM game_moves')).toEqual([
    { active: 0 },
  ]);
  // An undone ID cannot be reused for a different move even though it is no
  // longer present in the in-memory active history.
  const conflicting = command(undone.session, gameDefinition, {
    type: 'input_digit',
    digit: 4,
    moveId: 'incremental-move',
    atEpochMs: 1400,
  });
  await expect(
    repository.persistCommand(conflicting, 'conflicting-move', 2),
  ).rejects.toThrow('conflicts with stored history');
  expect(await database.query('SELECT revision FROM game_sessions')).toEqual([
    { revision: 2 },
  ]);
  database.close();
});

test('replay library uses the detail recovery result, including corrupt moves and missing snapshots', async () => {
  const database = await migratedDatabase();
  const repository = new UserRepository(database);
  const initial = createSession();
  await repository.createSession(initial, 'replay-start');
  const selected = dispatchGameCommand(initial, definition(), {
    type: 'select_cell',
    cell: 2,
    atEpochMs: 2000,
  }).session;
  const placed = dispatchGameCommand(selected, definition(), {
    type: 'input_digit',
    digit: 4,
    moveId: 'replay-move',
    atEpochMs: 3000,
  });
  // Persist with the actual stored revision (selection is not stored separately).
  await repository.persistCommand(
    placed,
    'replay-place',
    initial.state.revision,
  );
  const abandoned = dispatchGameCommand(placed.session, definition(), {
    type: 'abandon',
    atEpochMs: 4000,
  });
  await repository.persistCommand(
    abandoned,
    'replay-abandon',
    placed.session.state.revision,
  );
  const [summary] = await repository.listReplaySessions();
  expect(summary.recoverability).toBe('action_history');
  expect(summary.elapsedMs).toBe(abandoned.session.state.timer.elapsedMs);
  expect(summary.hintUseCount).toBe(0);
  await database.run(
    "UPDATE game_moves SET before_snapshot_json = '{}' WHERE id = ?",
    ['replay-move'],
  );
  expect((await repository.listReplaySessions())[0].recoverability).toBe(
    'final_snapshot',
  );
  const final = await repository.readReplaySession(initial.state.sessionId);
  expect(final?.state.values).toEqual(abandoned.session.state.values);
  expect(final?.history).toEqual([]);
  await database.run(
    "UPDATE game_sessions SET state_json = '{}' WHERE id = ?",
    [initial.state.sessionId],
  );
  expect((await repository.listReplaySessions())[0].recoverability).toBe(
    'unavailable',
  );
  expect(
    await repository.readReplaySession(initial.state.sessionId),
  ).toBeNull();
  database.close();
});
