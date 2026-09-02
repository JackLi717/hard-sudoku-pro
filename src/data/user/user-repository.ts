import {
  CompletionReward,
  PlayerCompletionProgress,
  applyAttemptProgress,
} from '../../domain/game/progression';
import {
  CreditResource,
  GameCommandResult,
  GameMove,
  GameSession,
  GameState,
} from '../../domain/game/contracts';
import {
  DatabaseRecoveryError,
  SqlDatabase,
  SqlExecutor,
  SqlRow,
} from '../sqlite/contracts';
import { NitroSqliteDatabase } from '../sqlite/nitro-database';
import { migrateUserDatabase } from '../sqlite/user-migrations';
import {
  StoredMoveRow,
  deserializeSession,
  serializeGameState,
  serializeMove,
} from './game-serialization';

const CREDIT_CAP = 20;

type SessionRow = SqlRow & {
  id: string;
  content_version: number;
  revision: number;
  state_json: string;
};

type WalletRow = SqlRow & {
  resource: CreditResource;
  balance: number;
  earned_total: number;
  spent_total: number;
};

export type WalletBalance = {
  resource: CreditResource;
  balance: number;
  earnedTotal: number;
  spentTotal: number;
};

export type CreditLedgerEntry = {
  id: string;
  resource: CreditResource;
  amount: number;
  reason: string;
  puzzleId: string | null;
  sessionId: string | null;
  externalEventId: string | null;
  balanceAfter: number;
  createdAtEpochMs: number;
};

export type PersistedCommand = {
  alreadyCommitted: boolean;
  reward: CompletionReward | null;
  // Null means this command did not change the wallet.
  wallet: Readonly<Record<CreditResource, WalletBalance>> | null;
};

export type RestoredGame =
  | { status: 'none' }
  | { status: 'ready'; session: GameSession }
  | {
      status: 'content_changed';
      session: GameSession;
      activeContentVersion: number;
    };

export type GameStatistics = {
  attempts: number;
  completions: number;
  failures: number;
  abandonments: number;
  totalElapsedMs: number;
  totalHintsUsed: number;
  totalQuickPencilsUsed: number;
};

export type PurchaseEntitlement = {
  productId: string;
  entitlement: string;
  platform: 'ios' | 'android';
  active: boolean;
  originalTransactionId: string | null;
  lastVerifiedAtEpochMs: number;
};

async function readWallet(
  executor: SqlExecutor,
): Promise<Readonly<Record<CreditResource, WalletBalance>>> {
  const rows = await executor.query<WalletRow>(
    `SELECT resource, balance, earned_total, spent_total
     FROM credit_wallet ORDER BY resource`,
  );
  const wallet = {} as Record<CreditResource, WalletBalance>;
  for (const row of rows) {
    wallet[row.resource] = {
      resource: row.resource,
      balance: row.balance,
      earnedTotal: row.earned_total,
      spentTotal: row.spent_total,
    };
  }
  if (!wallet.quick_pencil || !wallet.smart_hint) {
    throw new Error('credit_wallet is incomplete.');
  }
  return wallet;
}

async function readRewardForEvent(
  executor: SqlExecutor,
  eventId: string,
): Promise<CompletionReward | null> {
  const [row] = await executor.query<{ reward_json: string | null }>(
    `SELECT attempts.reward_json
     FROM game_action_receipts receipts
     JOIN game_attempts attempts ON attempts.session_id = receipts.session_id
     WHERE receipts.event_id = ?`,
    [eventId],
  );
  if (!row?.reward_json) {
    return null;
  }
  return JSON.parse(row.reward_json) as CompletionReward;
}

async function insertSession(
  executor: SqlExecutor,
  session: GameSession,
): Promise<void> {
  const state = session.state;
  await executor.run(
    `INSERT INTO game_sessions (
      id, puzzle_id, content_version, difficulty_level, attempt_number,
      status, revision, state_schema_version, state_json, started_at_ms,
      updated_at_ms, completed_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      state.sessionId,
      state.puzzleId,
      state.contentVersion,
      state.difficultyLevel,
      state.attemptNumber,
      state.status,
      state.revision,
      state.schemaVersion,
      serializeGameState(state),
      state.startedAtEpochMs,
      state.updatedAtEpochMs,
      state.status === 'completed' ? state.updatedAtEpochMs : null,
    ],
  );
}

async function insertMove(
  executor: SqlExecutor,
  move: GameMove,
): Promise<void> {
  const { params } = serializeMove(move);
  const saved = await executor.run(
    `INSERT INTO game_moves (
        id, session_id, sequence, move_kind, cell_index, digit,
        technique_code, applied_hint_json, before_snapshot_json,
        after_snapshot_json, created_at_ms, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET active = 1
      WHERE game_moves.session_id = excluded.session_id
        AND game_moves.sequence = excluded.sequence
        AND game_moves.move_kind = excluded.move_kind
        AND game_moves.cell_index IS excluded.cell_index
        AND game_moves.digit IS excluded.digit
        AND game_moves.technique_code IS excluded.technique_code
        AND game_moves.applied_hint_json IS excluded.applied_hint_json
        AND game_moves.before_snapshot_json = excluded.before_snapshot_json
        AND game_moves.after_snapshot_json = excluded.after_snapshot_json
        AND game_moves.created_at_ms = excluded.created_at_ms`,
    params,
  );
  if (saved.rowsAffected !== 1) {
    throw new Error(`Move ID ${move.id} conflicts with stored history.`);
  }
}

async function persistHistoryChange(
  executor: SqlExecutor,
  result: GameCommandResult,
): Promise<void> {
  const change = result.historyChange;
  if (change?.kind === 'append') {
    await insertMove(executor, change.move);
  } else if (change?.kind === 'undo') {
    const update = await executor.run(
      'UPDATE game_moves SET active = 0 WHERE id = ? AND session_id = ? AND active = 1',
      [change.moveId, result.session.state.sessionId],
    );
    if (update.rowsAffected !== 1) {
      throw new Error(`Cannot undo missing active move ${change.moveId}.`);
    }
  }
}

async function spendCredit(
  executor: SqlExecutor,
  state: GameState,
  resource: CreditResource,
  eventId: string,
): Promise<void> {
  const update = await executor.run(
    `UPDATE credit_wallet
     SET balance = balance - 1,
         spent_total = spent_total + 1,
         updated_at_ms = ?
     WHERE resource = ? AND balance >= 1`,
    [state.updatedAtEpochMs, resource],
  );
  if (update.rowsAffected !== 1) {
    throw new Error(`Insufficient ${resource} credits at commit time.`);
  }
  const [wallet] = await executor.query<{ balance: number }>(
    'SELECT balance FROM credit_wallet WHERE resource = ?',
    [resource],
  );
  if (!wallet) {
    throw new Error(`Missing ${resource} wallet.`);
  }
  await executor.run(
    `INSERT INTO credit_ledger (
      id, resource, amount, reason, puzzle_id, session_id,
      external_event_id, balance_after, created_at_ms
    ) VALUES (?, ?, -1, 'game_use', ?, ?, ?, ?, ?)`,
    [
      `ledger:${eventId}:${resource}`,
      resource,
      state.puzzleId,
      state.sessionId,
      eventId,
      wallet.balance,
      state.updatedAtEpochMs,
    ],
  );
}

async function readProgress(
  executor: SqlExecutor,
): Promise<PlayerCompletionProgress> {
  const completed = await executor.query<{ puzzle_id: string }>(
    `SELECT puzzle_id FROM puzzle_progress
     WHERE first_completed_at_ms IS NOT NULL ORDER BY puzzle_id`,
  );
  const metadata = await executor.query<{ key: string; value: string }>(
    `SELECT key, value FROM user_metadata
     WHERE key IN ('current_first_completion_streak', 'best_first_completion_streak')`,
  );
  const values = new Map(metadata.map(row => [row.key, Number(row.value)]));
  return {
    completedPuzzleIds: completed.map(row => row.puzzle_id),
    currentFirstCompletionStreak:
      values.get('current_first_completion_streak') ?? 0,
    bestFirstCompletionStreak: values.get('best_first_completion_streak') ?? 0,
  };
}

async function setMetadata(
  executor: SqlExecutor,
  key: string,
  value: string,
): Promise<void> {
  await executor.run(
    `INSERT INTO user_metadata(key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

async function grantCredit(
  executor: SqlExecutor,
  state: GameState,
  resource: CreditResource,
  requestedAmount: number,
  eventId: string,
): Promise<number> {
  if (requestedAmount <= 0) {
    return 0;
  }
  const [before] = await executor.query<{ balance: number }>(
    'SELECT balance FROM credit_wallet WHERE resource = ?',
    [resource],
  );
  if (!before) {
    throw new Error(`Missing ${resource} wallet.`);
  }
  const credited = Math.min(requestedAmount, CREDIT_CAP - before.balance);
  if (credited <= 0) {
    return 0;
  }
  const balanceAfter = before.balance + credited;
  await executor.run(
    `UPDATE credit_wallet
     SET balance = ?, earned_total = earned_total + ?, updated_at_ms = ?
     WHERE resource = ?`,
    [balanceAfter, credited, state.updatedAtEpochMs, resource],
  );
  await executor.run(
    `INSERT INTO credit_ledger (
      id, resource, amount, reason, puzzle_id, session_id,
      external_event_id, balance_after, created_at_ms
    ) VALUES (?, ?, ?, 'first_completion', ?, ?, ?, ?, ?)`,
    [
      `ledger:${eventId}:${resource}`,
      resource,
      credited,
      state.puzzleId,
      state.sessionId,
      `${eventId}:${resource}`,
      balanceAfter,
      state.updatedAtEpochMs,
    ],
  );
  return credited;
}

async function settleTerminalState(
  executor: SqlExecutor,
  state: GameState,
  eventId: string,
): Promise<CompletionReward> {
  const progress = await readProgress(executor);
  const result = applyAttemptProgress(progress, state);
  await executor.run(
    `INSERT INTO game_attempts (
      id, session_id, puzzle_id, content_version, difficulty_level,
      outcome, completion_kind, elapsed_ms, error_count, hint_use_count,
      quick_pencil_use_count, started_at_ms, ended_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      `attempt:${state.sessionId}`,
      state.sessionId,
      state.puzzleId,
      state.contentVersion,
      state.difficultyLevel,
      state.status,
      state.completionKind,
      state.timer.elapsedMs,
      state.errorCount,
      state.hintUseCount,
      state.quickPencilUseCount,
      state.startedAtEpochMs,
      state.updatedAtEpochMs,
    ],
  );

  if (state.status === 'completed') {
    await executor.run(
      `INSERT INTO puzzle_progress (
        puzzle_id, content_version, first_completed_at_ms,
        last_completed_at_ms, completion_count, best_time_ms
      ) VALUES (?, ?, ?, ?, 1, ?)
      ON CONFLICT(puzzle_id) DO UPDATE SET
        content_version = excluded.content_version,
        last_completed_at_ms = excluded.last_completed_at_ms,
        completion_count = puzzle_progress.completion_count + 1,
        best_time_ms = MIN(puzzle_progress.best_time_ms, excluded.best_time_ms)`,
      [
        state.puzzleId,
        state.contentVersion,
        state.updatedAtEpochMs,
        state.updatedAtEpochMs,
        state.timer.elapsedMs,
      ],
    );
  }

  await setMetadata(
    executor,
    'current_first_completion_streak',
    String(result.progress.currentFirstCompletionStreak),
  );
  await setMetadata(
    executor,
    'best_first_completion_streak',
    String(result.progress.bestFirstCompletionStreak),
  );

  if (!result.reward.isFirstCompletion) {
    await executor.run(
      'UPDATE game_attempts SET reward_json = ? WHERE session_id = ?',
      [JSON.stringify(result.reward), state.sessionId],
    );
    return result.reward;
  }
  const quickPencil = await grantCredit(
    executor,
    state,
    'quick_pencil',
    result.reward.quickPencil,
    eventId,
  );
  const smartHint = await grantCredit(
    executor,
    state,
    'smart_hint',
    result.reward.smartHint,
    eventId,
  );
  const creditedReward = { ...result.reward, quickPencil, smartHint };
  await executor.run(
    `INSERT INTO puzzle_completion_rewards (
      puzzle_id, content_version, session_id, rewarded_at_ms, reward_json
    ) VALUES (?, ?, ?, ?, ?)`,
    [
      state.puzzleId,
      state.contentVersion,
      state.sessionId,
      state.updatedAtEpochMs,
      JSON.stringify(creditedReward),
    ],
  );
  await executor.run(
    'UPDATE game_attempts SET reward_json = ? WHERE session_id = ?',
    [JSON.stringify(creditedReward), state.sessionId],
  );
  return creditedReward;
}

export class UserRepository {
  constructor(private readonly database: SqlDatabase) {}

  async setDebugCreditBalances(
    targetBalance: number,
    updatedAtEpochMs: number,
    eventId: string,
  ): Promise<Readonly<Record<CreditResource, WalletBalance>>> {
    if (!Number.isInteger(targetBalance) || targetBalance < 1) {
      throw new Error('Debug credit balance must be a positive integer.');
    }
    if (!eventId) {
      throw new Error('A non-empty eventId is required.');
    }
    return this.database.transaction(async transaction => {
      const resources: readonly CreditResource[] = [
        'smart_hint',
        'quick_pencil',
      ];
      for (const resource of resources) {
        const [before] = await transaction.query<{ balance: number }>(
          'SELECT balance FROM credit_wallet WHERE resource = ?',
          [resource],
        );
        if (!before) {
          throw new Error(`Missing ${resource} wallet.`);
        }
        const credited = Math.max(0, targetBalance - before.balance);
        if (credited === 0) {
          continue;
        }
        await transaction.run(
          `UPDATE credit_wallet
           SET balance = ?, earned_total = earned_total + ?, updated_at_ms = ?
           WHERE resource = ?`,
          [targetBalance, credited, updatedAtEpochMs, resource],
        );
        const resourceEventId = `${eventId}:${resource}`;
        await transaction.run(
          `INSERT INTO credit_ledger (
            id, resource, amount, reason, puzzle_id, session_id,
            external_event_id, balance_after, created_at_ms
          ) VALUES (?, ?, ?, 'debug_top_up', NULL, NULL, ?, ?, ?)`,
          [
            `ledger:${resourceEventId}`,
            resource,
            credited,
            resourceEventId,
            targetBalance,
            updatedAtEpochMs,
          ],
        );
      }
      return readWallet(transaction);
    });
  }

  async createSession(session: GameSession, eventId: string): Promise<void> {
    if (!eventId) {
      throw new Error('A non-empty eventId is required.');
    }
    await this.database.transaction(async transaction => {
      const [receipt] = await transaction.query<{
        session_id: string;
        state_revision: number;
      }>(
        `SELECT session_id, state_revision FROM game_action_receipts
         WHERE event_id = ?`,
        [eventId],
      );
      if (receipt) {
        if (
          receipt.session_id !== session.state.sessionId ||
          receipt.state_revision !== session.state.revision
        ) {
          throw new Error(`Event ${eventId} belongs to another game state.`);
        }
        return;
      }
      await insertSession(transaction, session);
      for (const move of session.history) {
        await insertMove(transaction, move);
      }
      await transaction.run(
        `INSERT INTO game_action_receipts (
          event_id, session_id, state_revision, committed_at_ms
        ) VALUES (?, ?, ?, ?)`,
        [
          eventId,
          session.state.sessionId,
          session.state.revision,
          session.state.updatedAtEpochMs,
        ],
      );
    });
  }

  async persistCommand(
    result: GameCommandResult,
    eventId: string,
    expectedRevision: number,
  ): Promise<PersistedCommand> {
    if (!result.accepted) {
      throw new Error('Blocked game commands must not be persisted.');
    }
    if (!eventId) {
      throw new Error('A non-empty eventId is required.');
    }
    const state = result.session.state;
    const terminal = ['completed', 'failed', 'abandoned'].includes(
      state.status,
    );
    const walletChanged = Boolean(result.creditSpend) || terminal;
    return this.database.transaction(async transaction => {
      const [receipt] = await transaction.query<{
        session_id: string;
        state_revision: number;
      }>(
        `SELECT session_id, state_revision FROM game_action_receipts
         WHERE event_id = ?`,
        [eventId],
      );
      if (receipt) {
        if (
          receipt.session_id !== state.sessionId ||
          receipt.state_revision !== state.revision
        ) {
          throw new Error(`Event ${eventId} belongs to another game state.`);
        }
        return {
          alreadyCommitted: true,
          reward: terminal
            ? await readRewardForEvent(transaction, eventId)
            : null,
          wallet: walletChanged ? await readWallet(transaction) : null,
        };
      }

      const update = await transaction.run(
        `UPDATE game_sessions SET
          status = ?, revision = ?, state_schema_version = ?, state_json = ?,
          updated_at_ms = ?, completed_at_ms = ?
        WHERE id = ? AND revision = ?`,
        [
          state.status,
          state.revision,
          state.schemaVersion,
          serializeGameState(state),
          state.updatedAtEpochMs,
          state.status === 'completed' ? state.updatedAtEpochMs : null,
          state.sessionId,
          expectedRevision,
        ],
      );
      if (update.rowsAffected !== 1) {
        throw new Error(
          `Stale game revision ${expectedRevision} for ${state.sessionId}.`,
        );
      }
      await persistHistoryChange(transaction, result);
      if (result.creditSpend) {
        await spendCredit(
          transaction,
          state,
          result.creditSpend.resource,
          eventId,
        );
      }
      const reward = terminal
        ? await settleTerminalState(transaction, state, eventId)
        : null;
      await transaction.run(
        `INSERT INTO game_action_receipts (
          event_id, session_id, state_revision, committed_at_ms
        ) VALUES (?, ?, ?, ?)`,
        [eventId, state.sessionId, state.revision, state.updatedAtEpochMs],
      );
      return {
        alreadyCommitted: false,
        reward,
        wallet: walletChanged ? await readWallet(transaction) : null,
      };
    });
  }

  async restoreUnfinishedSession(
    activeContentVersion: number,
    restoredAtEpochMs: number,
  ): Promise<RestoredGame> {
    const [row] = await this.database.query<SessionRow>(
      `SELECT id, content_version, revision, state_json
       FROM game_sessions
       WHERE status IN ('active', 'paused')
       ORDER BY updated_at_ms DESC LIMIT 1`,
    );
    if (!row) {
      return { status: 'none' };
    }
    const moves = await this.database.query<StoredMoveRow & SqlRow>(
      `SELECT id, session_id, sequence, move_kind, cell_index, digit,
              technique_code, applied_hint_json, before_snapshot_json,
              after_snapshot_json, created_at_ms
       FROM game_moves
       WHERE session_id = ? AND active = 1
       ORDER BY sequence`,
      [row.id],
    );
    let session: GameSession;
    try {
      session = deserializeSession(row.state_json, moves);
    } catch (error) {
      throw new DatabaseRecoveryError(
        'user_corrupt',
        `Saved game ${row.id} could not be restored.`,
        { cause: error },
      );
    }
    if (session.state.status === 'active') {
      session = {
        ...session,
        state: {
          ...session.state,
          timer: {
            ...session.state.timer,
            runningSinceEpochMs: restoredAtEpochMs,
          },
        },
      };
    }
    if (row.content_version !== activeContentVersion) {
      return { status: 'content_changed', session, activeContentVersion };
    }
    return { status: 'ready', session };
  }

  readWallet(): Promise<Readonly<Record<CreditResource, WalletBalance>>> {
    return readWallet(this.database);
  }

  getCompletionProgress(): Promise<PlayerCompletionProgress> {
    return readProgress(this.database);
  }

  async listCreditLedger(limit = 50): Promise<readonly CreditLedgerEntry[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new Error('Credit ledger limit must be an integer from 1 to 200.');
    }
    const rows = await this.database.query<{
      id: string;
      resource: CreditResource;
      amount: number;
      reason: string;
      puzzle_id: string | null;
      session_id: string | null;
      external_event_id: string | null;
      balance_after: number;
      created_at_ms: number;
    }>(
      `SELECT id, resource, amount, reason, puzzle_id, session_id,
              external_event_id, balance_after, created_at_ms
       FROM credit_ledger ORDER BY created_at_ms DESC, id DESC LIMIT ?`,
      [limit],
    );
    return rows.map(row => ({
      id: row.id,
      resource: row.resource,
      amount: row.amount,
      reason: row.reason,
      puzzleId: row.puzzle_id,
      sessionId: row.session_id,
      externalEventId: row.external_event_id,
      balanceAfter: row.balance_after,
      createdAtEpochMs: row.created_at_ms,
    }));
  }

  async getSetting<Value>(key: string): Promise<Value | null> {
    const [row] = await this.database.query<{ value_json: string }>(
      'SELECT value_json FROM settings WHERE key = ?',
      [key],
    );
    return row ? (JSON.parse(row.value_json) as Value) : null;
  }

  async setSetting<Value>(
    key: string,
    value: Value,
    updatedAtEpochMs: number,
  ): Promise<void> {
    await this.database.run(
      `INSERT INTO settings(key, value_json, updated_at_ms) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_at_ms = excluded.updated_at_ms`,
      [key, JSON.stringify(value), updatedAtEpochMs],
    );
  }

  async getStatistics(): Promise<GameStatistics> {
    const [row] = await this.database.query<{
      attempts: number;
      completions: number;
      failures: number;
      abandonments: number;
      total_elapsed_ms: number;
      total_hints_used: number;
      total_quick_pencils_used: number;
    }>(
      `SELECT COUNT(*) AS attempts,
              COALESCE(SUM(outcome = 'completed'), 0) AS completions,
              COALESCE(SUM(outcome = 'failed'), 0) AS failures,
              COALESCE(SUM(outcome = 'abandoned'), 0) AS abandonments,
              COALESCE(SUM(elapsed_ms), 0) AS total_elapsed_ms,
              COALESCE(SUM(hint_use_count), 0) AS total_hints_used,
              COALESCE(SUM(quick_pencil_use_count), 0) AS total_quick_pencils_used
       FROM game_attempts`,
    );
    if (!row) {
      throw new Error('Could not read game statistics.');
    }
    return {
      attempts: row.attempts,
      completions: row.completions,
      failures: row.failures,
      abandonments: row.abandonments,
      totalElapsedMs: row.total_elapsed_ms,
      totalHintsUsed: row.total_hints_used,
      totalQuickPencilsUsed: row.total_quick_pencils_used,
    };
  }

  async upsertEntitlement(entitlement: PurchaseEntitlement): Promise<void> {
    await this.database.run(
      `INSERT INTO purchase_entitlements (
        product_id, entitlement, platform, active, original_transaction_id,
        last_verified_at_ms
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(product_id) DO UPDATE SET
        entitlement = excluded.entitlement,
        platform = excluded.platform,
        active = excluded.active,
        original_transaction_id = excluded.original_transaction_id,
        last_verified_at_ms = excluded.last_verified_at_ms`,
      [
        entitlement.productId,
        entitlement.entitlement,
        entitlement.platform,
        entitlement.active ? 1 : 0,
        entitlement.originalTransactionId,
        entitlement.lastVerifiedAtEpochMs,
      ],
    );
  }

  async getEntitlement(productId: string): Promise<PurchaseEntitlement | null> {
    const [row] = await this.database.query<{
      product_id: string;
      entitlement: string;
      platform: 'ios' | 'android';
      active: number;
      original_transaction_id: string | null;
      last_verified_at_ms: number;
    }>(
      `SELECT product_id, entitlement, platform, active,
              original_transaction_id, last_verified_at_ms
       FROM purchase_entitlements WHERE product_id = ?`,
      [productId],
    );
    return row
      ? {
          productId: row.product_id,
          entitlement: row.entitlement,
          platform: row.platform,
          active: row.active === 1,
          originalTransactionId: row.original_transaction_id,
          lastVerifiedAtEpochMs: row.last_verified_at_ms,
        }
      : null;
  }

  close(): void {
    this.database.close();
  }
}

export async function openUserRepository(
  nowEpochMs: number,
): Promise<UserRepository> {
  const database = NitroSqliteDatabase.open('user.sqlite');
  try {
    await database.run('PRAGMA journal_mode = WAL');
    await database.run('PRAGMA synchronous = FULL');
    await migrateUserDatabase(database, nowEpochMs);
    return new UserRepository(database);
  } catch (error) {
    database.close();
    throw error;
  }
}
