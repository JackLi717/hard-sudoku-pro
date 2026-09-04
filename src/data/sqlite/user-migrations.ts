import { GROWTH_TABLES } from '../user/technique-growth-repository';
import { DatabaseRecoveryError, SqlDatabase, SqlExecutor } from './contracts';

export const USER_SCHEMA_VERSION = 2;

type Migration = {
  version: number;
  statements: readonly string[];
};

const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at_ms INTEGER NOT NULL
      )`,
      `CREATE TABLE user_metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE game_sessions (
        id TEXT PRIMARY KEY,
        puzzle_id TEXT NOT NULL,
        content_version INTEGER NOT NULL CHECK (content_version > 0),
        difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
        attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
        status TEXT NOT NULL CHECK (
          status IN ('active', 'paused', 'failed', 'completed', 'abandoned')
        ),
        revision INTEGER NOT NULL CHECK (revision >= 0),
        state_schema_version INTEGER NOT NULL CHECK (state_schema_version > 0),
        state_json TEXT NOT NULL CHECK (json_valid(state_json)),
        started_at_ms INTEGER NOT NULL,
        updated_at_ms INTEGER NOT NULL,
        completed_at_ms INTEGER
      )`,
      `CREATE UNIQUE INDEX one_unfinished_game
        ON game_sessions ((1))
        WHERE status IN ('active', 'paused')`,
      `CREATE INDEX game_sessions_puzzle_status
        ON game_sessions(puzzle_id, status)`,
      `CREATE TABLE game_moves (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        sequence INTEGER NOT NULL CHECK (sequence > 0),
        move_kind TEXT NOT NULL CHECK (
          move_kind IN (
            'place_value', 'erase_value', 'edit_manual_candidate',
            'edit_quick_candidate', 'apply_hint'
          )
        ),
        before_snapshot_json TEXT NOT NULL CHECK (json_valid(before_snapshot_json)),
        after_snapshot_json TEXT NOT NULL CHECK (json_valid(after_snapshot_json)),
        created_at_ms INTEGER NOT NULL,
        UNIQUE (session_id, sequence)
      )`,
      `CREATE TABLE game_attempts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL UNIQUE,
        puzzle_id TEXT NOT NULL,
        content_version INTEGER NOT NULL,
        difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
        outcome TEXT NOT NULL CHECK (outcome IN ('completed', 'failed', 'abandoned')),
        completion_kind TEXT CHECK (
          completion_kind IS NULL OR
          completion_kind IN ('independent', 'hint_assisted', 'perfect')
        ),
        elapsed_ms INTEGER NOT NULL CHECK (elapsed_ms >= 0),
        error_count INTEGER NOT NULL CHECK (error_count >= 0),
        hint_use_count INTEGER NOT NULL CHECK (hint_use_count >= 0),
        quick_pencil_use_count INTEGER NOT NULL CHECK (quick_pencil_use_count >= 0),
        started_at_ms INTEGER NOT NULL,
        ended_at_ms INTEGER NOT NULL
      )`,
      'CREATE INDEX game_attempts_recent ON game_attempts(ended_at_ms DESC)',
      `CREATE INDEX game_attempts_level_outcome
        ON game_attempts(difficulty_level, outcome)`,
      `CREATE TABLE puzzle_progress (
        puzzle_id TEXT PRIMARY KEY,
        content_version INTEGER NOT NULL,
        first_completed_at_ms INTEGER,
        last_completed_at_ms INTEGER,
        completion_count INTEGER NOT NULL DEFAULT 0 CHECK (completion_count >= 0),
        best_time_ms INTEGER CHECK (best_time_ms IS NULL OR best_time_ms >= 0)
      )`,
      `CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL CHECK (json_valid(value_json)),
        updated_at_ms INTEGER NOT NULL
      )`,
      `CREATE TABLE credit_wallet (
        resource TEXT PRIMARY KEY CHECK (resource IN ('smart_hint', 'quick_pencil')),
        balance INTEGER NOT NULL CHECK (balance >= 0),
        earned_total INTEGER NOT NULL DEFAULT 0 CHECK (earned_total >= 0),
        spent_total INTEGER NOT NULL DEFAULT 0 CHECK (spent_total >= 0),
        updated_at_ms INTEGER NOT NULL
      )`,
      `CREATE TABLE credit_ledger (
        id TEXT PRIMARY KEY,
        resource TEXT NOT NULL CHECK (resource IN ('smart_hint', 'quick_pencil')),
        amount INTEGER NOT NULL CHECK (amount != 0),
        reason TEXT NOT NULL,
        puzzle_id TEXT,
        session_id TEXT,
        external_event_id TEXT UNIQUE,
        balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
        created_at_ms INTEGER NOT NULL
      )`,
      'CREATE INDEX credit_ledger_created ON credit_ledger(created_at_ms DESC)',
      `CREATE TABLE puzzle_completion_rewards (
        puzzle_id TEXT PRIMARY KEY,
        content_version INTEGER NOT NULL,
        session_id TEXT NOT NULL,
        rewarded_at_ms INTEGER NOT NULL
      )`,
      `CREATE TABLE purchase_entitlements (
        product_id TEXT PRIMARY KEY,
        entitlement TEXT NOT NULL,
        platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
        active INTEGER NOT NULL CHECK (active IN (0, 1)),
        original_transaction_id TEXT,
        last_verified_at_ms INTEGER NOT NULL
      )`,
      `INSERT INTO credit_wallet(resource, balance, updated_at_ms)
        VALUES ('smart_hint', 5, 0), ('quick_pencil', 3, 0)`,
    ],
  },
  {
    version: 2,
    statements: [
      `ALTER TABLE game_moves
        ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))`,
      'ALTER TABLE game_moves ADD COLUMN cell_index INTEGER',
      'ALTER TABLE game_moves ADD COLUMN digit INTEGER',
      'ALTER TABLE game_moves ADD COLUMN technique_code TEXT',
      'ALTER TABLE game_moves ADD COLUMN applied_hint_json TEXT',
      `ALTER TABLE puzzle_completion_rewards ADD COLUMN reward_json TEXT
        CHECK (reward_json IS NULL OR json_valid(reward_json))`,
      `ALTER TABLE game_attempts ADD COLUMN reward_json TEXT
        CHECK (reward_json IS NULL OR json_valid(reward_json))`,
      `CREATE INDEX game_moves_active_history
        ON game_moves(session_id, active, sequence)`,
      `CREATE TABLE game_action_receipts (
        event_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        state_revision INTEGER NOT NULL CHECK (state_revision >= 0),
        committed_at_ms INTEGER NOT NULL
      )`,
      `CREATE INDEX game_action_receipts_session
        ON game_action_receipts(session_id, state_revision)`,
      `CREATE TABLE app_recovery_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        database_name TEXT NOT NULL,
        reason TEXT NOT NULL,
        detail TEXT NOT NULL,
        created_at_ms INTEGER NOT NULL
      )`,
    ],
  },
];

async function readUserVersion(database: SqlExecutor): Promise<number> {
  const [row] = await database.query<{ user_version: number }>(
    'PRAGMA user_version',
  );
  if (!row || typeof row.user_version !== 'number') {
    throw new Error('SQLite did not return PRAGMA user_version.');
  }
  return row.user_version;
}

export async function migrateUserDatabase(
  database: SqlDatabase,
  nowEpochMs: number,
): Promise<void> {
  try {
    await database.run('PRAGMA foreign_keys = ON');
  } catch (error) {
    throw new DatabaseRecoveryError(
      'user_corrupt',
      'user.sqlite could not enable foreign key validation.',
      { cause: error },
    );
  }
  let currentVersion: number;
  try {
    currentVersion = await readUserVersion(database);
  } catch (error) {
    throw new DatabaseRecoveryError(
      'user_corrupt',
      'user.sqlite schema version could not be read.',
      { cause: error },
    );
  }
  if (currentVersion > USER_SCHEMA_VERSION) {
    throw new DatabaseRecoveryError(
      'user_schema_newer',
      `user.sqlite schema ${currentVersion} is newer than supported ${USER_SCHEMA_VERSION}.`,
    );
  }

  try {
    for (const migration of MIGRATIONS) {
      if (migration.version <= currentVersion) {
        continue;
      }
      await database.transaction(async transaction => {
        for (const statement of migration.statements) {
          await transaction.run(statement);
        }
        await transaction.run(
          'INSERT INTO schema_migrations(version, applied_at_ms) VALUES (?, ?)',
          [migration.version, nowEpochMs],
        );
        await transaction.run(`PRAGMA user_version = ${migration.version}`);
      });
    }
  } catch (error) {
    if (error instanceof DatabaseRecoveryError) {
      throw error;
    }
    throw new DatabaseRecoveryError(
      'migration_failed',
      'user.sqlite migration failed; the original database was preserved.',
      { cause: error },
    );
  }

  // Additive current pre-release baseline: preserve retained development games.
  // No old event rows are synthesized and no product version is incremented.
  await database.run(`CREATE TABLE IF NOT EXISTS game_replay_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
    revision INTEGER NOT NULL CHECK (revision > 0),
    event_json TEXT NOT NULL CHECK (json_valid(event_json)),
    UNIQUE(session_id, revision)
  )`);

  for (const statement of GROWTH_TABLES) await database.run(statement);

  try {
    const [integrity] = await database.query<{ quick_check: string }>(
      'PRAGMA quick_check',
    );
    const foreignKeyErrors = await database.query('PRAGMA foreign_key_check');
    const requiredTables = [
      'technique_growth_projection',
      'technique_learning_events',
      'growth_feedback_receipts',
      'app_recovery_events',
      'credit_ledger',
      'credit_wallet',
      'game_action_receipts',
      'game_attempts',
      'game_moves',
      'game_sessions',
      'purchase_entitlements',
      'puzzle_completion_rewards',
      'puzzle_progress',
      'schema_migrations',
      'settings',
      'user_metadata',
    ];
    const tables = await database.query<{ name: string }>(
      `SELECT name FROM sqlite_schema
       WHERE type = 'table' AND name IN (${requiredTables
         .map(() => '?')
         .join(', ')})`,
      requiredTables,
    );
    const wallets = await database.query<{ resource: string }>(
      'SELECT resource FROM credit_wallet ORDER BY resource',
    );
    if (
      !integrity ||
      integrity.quick_check !== 'ok' ||
      foreignKeyErrors.length > 0 ||
      tables.length !== requiredTables.length ||
      wallets.map(row => row.resource).join(',') !== 'quick_pencil,smart_hint'
    ) {
      throw new Error('SQLite structural validation failed.');
    }
  } catch (error) {
    throw new DatabaseRecoveryError(
      'user_corrupt',
      'user.sqlite failed integrity or structural validation.',
      { cause: error },
    );
  }
}
