import type { SqlDatabase } from '../data/sqlite/contracts';
import { HINT_LAB_FIXTURE_VERSION } from './hint-lab';

export type HintLabStatus = 'untested' | 'passed' | 'issue' | 'retest';

export type HintLabRecord = {
  fixtureId: string;
  status: HintLabStatus;
  reasoningOk: boolean;
  visualsOk: boolean;
  resultOk: boolean;
  applyUndoOk: boolean;
  note: string;
  proofPage: number | null;
  updatedAtEpochMs: number | null;
};

type RecordRow = {
  fixture_id: string;
  status: HintLabStatus;
  reasoning_ok: number;
  visuals_ok: number;
  result_ok: number;
  apply_undo_ok: number;
  note: string;
  proof_page: number | null;
  updated_at_ms: number;
};

export function emptyHintLabRecord(fixtureId: string): HintLabRecord {
  return {
    fixtureId,
    status: 'untested',
    reasoningOk: false,
    visualsOk: false,
    resultOk: false,
    applyUndoOk: false,
    note: '',
    proofPage: null,
    updatedAtEpochMs: null,
  };
}

export class HintLabStore {
  private readonly database: SqlDatabase;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(database?: SqlDatabase) {
    if (database) {
      this.database = database;
      return;
    }
    // Keep the native module lazy: merely rendering the ordinary app or Jest
    // tree must not open a debug-only acceptance database.
    const { NitroSqliteDatabase } =
      require('../data/sqlite/nitro-database') as typeof import('../data/sqlite/nitro-database');
    this.database = NitroSqliteDatabase.open('hint-acceptance.sqlite');
  }

  async initialize(): Promise<void> {
    await this.database.run(
      `CREATE TABLE IF NOT EXISTS hint_acceptance (
        fixture_id TEXT PRIMARY KEY,
        fixture_version INTEGER NOT NULL,
        status TEXT NOT NULL,
        reasoning_ok INTEGER NOT NULL,
        visuals_ok INTEGER NOT NULL,
        result_ok INTEGER NOT NULL,
        apply_undo_ok INTEGER NOT NULL,
        note TEXT NOT NULL,
        proof_page INTEGER,
        updated_at_ms INTEGER NOT NULL
      )`,
    );
    await this.database.run(
      'DELETE FROM hint_acceptance WHERE fixture_version <> ?',
      [HINT_LAB_FIXTURE_VERSION],
    );
  }

  async readAll(): Promise<ReadonlyMap<string, HintLabRecord>> {
    const rows = await this.database.query<RecordRow>(
      `SELECT fixture_id, status, reasoning_ok, visuals_ok, result_ok,
              apply_undo_ok, note, proof_page, updated_at_ms
       FROM hint_acceptance`,
    );
    return new Map(
      rows.map(row => [
        row.fixture_id,
        {
          fixtureId: row.fixture_id,
          status: row.status,
          reasoningOk: row.reasoning_ok === 1,
          visualsOk: row.visuals_ok === 1,
          resultOk: row.result_ok === 1,
          applyUndoOk: row.apply_undo_ok === 1,
          note: row.note,
          proofPage: row.proof_page,
          updatedAtEpochMs: row.updated_at_ms,
        },
      ]),
    );
  }

  async save(record: HintLabRecord): Promise<void> {
    const snapshot = { ...record };
    this.writeChain = this.writeChain
      .catch(() => undefined)
      .then(async () => {
        await this.database.run(
          `INSERT INTO hint_acceptance (
          fixture_id, fixture_version, status, reasoning_ok, visuals_ok,
          result_ok, apply_undo_ok, note, proof_page, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(fixture_id) DO UPDATE SET
          fixture_version = excluded.fixture_version,
          status = excluded.status,
          reasoning_ok = excluded.reasoning_ok,
          visuals_ok = excluded.visuals_ok,
          result_ok = excluded.result_ok,
          apply_undo_ok = excluded.apply_undo_ok,
          note = excluded.note,
          proof_page = excluded.proof_page,
          updated_at_ms = excluded.updated_at_ms`,
          [
            snapshot.fixtureId,
            HINT_LAB_FIXTURE_VERSION,
            snapshot.status,
            snapshot.reasoningOk ? 1 : 0,
            snapshot.visualsOk ? 1 : 0,
            snapshot.resultOk ? 1 : 0,
            snapshot.applyUndoOk ? 1 : 0,
            snapshot.note,
            snapshot.proofPage,
            snapshot.updatedAtEpochMs ?? Date.now(),
          ],
        );
      });
    await this.writeChain;
  }

  close(): void {
    this.writeChain.finally(() => this.database.close()).catch(() => undefined);
  }
}
