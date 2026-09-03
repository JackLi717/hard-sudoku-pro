import type {
  BehaviorShadowRecord,
  BehaviorShadowSink,
} from '../../application/technique-recognition/shadow-controller';
import { SqlDatabase } from '../sqlite/contracts';
import type { SessionReviewSource } from '../../application/technique-recognition/session-review';

type BehaviorShadowRow = {
  record_json: string;
};

export class BehaviorShadowStore
  implements BehaviorShadowSink, SessionReviewSource
{
  private readonly database: SqlDatabase;
  private initializePromise: Promise<void> | null = null;
  private readonly listeners = new Set<(sessionId: string | null) => void>();

  constructor(database?: SqlDatabase) {
    if (database) {
      this.database = database;
      return;
    }
    const { NitroSqliteDatabase } =
      require('../sqlite/nitro-database') as typeof import('../sqlite/nitro-database');
    this.database = NitroSqliteDatabase.open('behavior-shadow.sqlite');
  }

  initialize(): Promise<void> {
    this.initializePromise ??= this.database
      .run(
        `CREATE TABLE IF NOT EXISTS behavior_shadow_records (
          record_id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          segment_id TEXT,
          phase TEXT NOT NULL CHECK (
            phase IN ('request', 'result', 'segment_finalized', 'invalidation')
          ),
          recorded_at_ms INTEGER NOT NULL,
          record_json TEXT NOT NULL CHECK (json_valid(record_json))
        )`,
      )
      .then(() => undefined);
    return this.initializePromise;
  }

  async save(record: BehaviorShadowRecord): Promise<void> {
    await this.initialize();
    await this.database.run(
      `INSERT OR IGNORE INTO behavior_shadow_records (
        record_id, session_id, segment_id, phase, recorded_at_ms, record_json
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        record.recordId,
        record.sessionId,
        record.segmentId,
        record.phase,
        record.recordedAtEpochMs,
        JSON.stringify(record),
      ],
    );
    this.notify(record.sessionId);
  }

  async readSession(
    sessionId: string,
  ): Promise<readonly BehaviorShadowRecord[]> {
    await this.initialize();
    const rows = await this.database.query<BehaviorShadowRow>(
      `SELECT record_json FROM behavior_shadow_records
       WHERE session_id = ? ORDER BY recorded_at_ms, rowid`,
      [sessionId],
    );
    return rows.map(row => JSON.parse(row.record_json) as BehaviorShadowRecord);
  }

  subscribe(listener: (sessionId: string | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(sessionId: string | null): void {
    for (const listener of this.listeners) {
      try {
        listener(sessionId);
      } catch {
        // A diagnostic viewer must not affect persistence or gameplay.
      }
    }
  }

  async readAll(): Promise<readonly BehaviorShadowRecord[]> {
    await this.initialize();
    const rows = await this.database.query<BehaviorShadowRow>(
      `SELECT record_json
       FROM behavior_shadow_records
       ORDER BY recorded_at_ms, rowid`,
    );
    return rows.map(row => JSON.parse(row.record_json) as BehaviorShadowRecord);
  }

  async clear(): Promise<void> {
    await this.initialize();
    await this.database.run('DELETE FROM behavior_shadow_records');
    this.notify(null);
  }

  close(): void {
    this.listeners.clear();
    this.database.close();
  }
}
