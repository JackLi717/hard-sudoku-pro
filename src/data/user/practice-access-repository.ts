import type { TechniqueCode } from '../../domain/hints/techniques';
import {
  accessibleExerciseCount,
  type PracticeAccessStore,
} from '../../domain/practice/access';
import type { SqlDatabase, SqlExecutor } from '../sqlite/contracts';

export const PRACTICE_ACCESS_TABLES = [
  `CREATE TABLE IF NOT EXISTS practice_access (
    technique_code TEXT PRIMARY KEY,
    unlocked_batches INTEGER NOT NULL CHECK (unlocked_batches >= 0)
  )`,
  `CREATE TABLE IF NOT EXISTS practice_access_receipts (
    external_event_id TEXT PRIMARY KEY,
    technique_code TEXT NOT NULL,
    batch_number INTEGER NOT NULL CHECK (batch_number > 0),
    created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0)
  )`,
] as const;

async function readBatches(
  database: SqlExecutor,
  technique: TechniqueCode,
): Promise<number> {
  const [row] = await database.query<{ unlocked_batches: number }>(
    'SELECT unlocked_batches FROM practice_access WHERE technique_code = ?',
    [technique],
  );
  return row?.unlocked_batches ?? 0;
}

export class PracticeAccessRepository implements PracticeAccessStore {
  constructor(private readonly database: SqlDatabase) {}

  readUnlockedBatches(technique: TechniqueCode): Promise<number> {
    return readBatches(this.database, technique);
  }

  async grantNextBatch(
    technique: TechniqueCode,
    total: number,
    eventId: string,
    now: number,
  ): Promise<number> {
    if (
      !technique ||
      !eventId ||
      !Number.isSafeInteger(total) ||
      total < 0 ||
      !Number.isSafeInteger(now) ||
      now < 0
    ) {
      throw new Error('Invalid practice access grant');
    }
    return this.database.transaction(async transaction => {
      const [receipt] = await transaction.query<{ technique_code: string }>(
        'SELECT technique_code FROM practice_access_receipts WHERE external_event_id = ?',
        [eventId],
      );
      if (receipt) {
        if (receipt.technique_code !== technique) {
          throw new Error('Practice reward event reused for another technique');
        }
        return readBatches(transaction, technique);
      }
      const current = await readBatches(transaction, technique);
      if (accessibleExerciseCount(total, false, current) >= total) {
        return current;
      }
      const next = current + 1;
      await transaction.run(
        `INSERT INTO practice_access(technique_code, unlocked_batches)
         VALUES (?, ?) ON CONFLICT(technique_code) DO UPDATE SET
         unlocked_batches = excluded.unlocked_batches`,
        [technique, next],
      );
      await transaction.run(
        `INSERT INTO practice_access_receipts
         (external_event_id, technique_code, batch_number, created_at_ms)
         VALUES (?, ?, ?, ?)`,
        [eventId, technique, next, now],
      );
      return next;
    });
  }
}
