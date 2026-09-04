import {
  GrowthSession,
  LearningCompletion,
} from '../../application/technique-growth/contracts';
import { SqlDatabase } from '../sqlite/contracts';

export const GROWTH_TABLES = [
  `CREATE TABLE IF NOT EXISTS technique_growth_projection (session_id TEXT PRIMARY KEY REFERENCES game_sessions(id) ON DELETE CASCADE, projection_json TEXT NOT NULL CHECK(json_valid(projection_json)))`,
  `CREATE TABLE IF NOT EXISTS technique_learning_events (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE, event_json TEXT NOT NULL CHECK(json_valid(event_json)))`,
  `CREATE TABLE IF NOT EXISTS growth_feedback_receipts (id TEXT PRIMARY KEY, recorded_at_ms INTEGER NOT NULL)`,
] as const;
export interface GrowthStore {
  listSessions(): Promise<
    readonly Pick<
      GrowthSession,
      'sessionId' | 'status' | 'difficulty' | 'endedAt' | 'revision'
    >[]
  >;
  readProjections(): Promise<readonly GrowthSession[]>;
  saveProjection(value: GrowthSession): Promise<void>;
  readCompletions(): Promise<readonly LearningCompletion[]>;
  saveCompletion(value: LearningCompletion): Promise<void>;
  claimReceipt(id: string, now: number): Promise<boolean>;
}
export class TechniqueGrowthRepository implements GrowthStore {
  constructor(private readonly database: SqlDatabase) {}
  async listSessions() {
    const rows = await this.database.query<{
      id: string;
      status: string;
      difficulty_level: number;
      updated_at_ms: number;
      revision: number;
    }>(
      'SELECT id, status, difficulty_level, updated_at_ms, revision FROM game_sessions ORDER BY updated_at_ms DESC',
    );
    return rows.map(r => ({
      sessionId: r.id,
      status: r.status,
      difficulty: r.difficulty_level,
      endedAt: r.updated_at_ms,
      revision: r.revision,
    }));
  }
  async readProjections() {
    const rows = await this.database.query<{ projection_json: string }>(
      'SELECT projection_json FROM technique_growth_projection',
    );
    return rows.map(r => JSON.parse(r.projection_json) as GrowthSession);
  }
  async saveProjection(value: GrowthSession) {
    await this.database.run(
      'INSERT OR REPLACE INTO technique_growth_projection(session_id, projection_json) VALUES (?, ?)',
      [value.sessionId, JSON.stringify(value)],
    );
  }
  async readCompletions() {
    const rows = await this.database.query<{ event_json: string }>(
      'SELECT event_json FROM technique_learning_events',
    );
    return rows.map(r => JSON.parse(r.event_json) as LearningCompletion);
  }
  async saveCompletion(value: LearningCompletion) {
    await this.database.run(
      'INSERT OR IGNORE INTO technique_learning_events(id, session_id, event_json) VALUES (?, ?, ?)',
      [value.id, value.reference.sessionId, JSON.stringify(value)],
    );
  }
  async claimReceipt(id: string, now: number) {
    return this.database.transaction(async tx => {
      const rows = await tx.query(
        'SELECT id FROM growth_feedback_receipts WHERE id = ?',
        [id],
      );
      if (rows.length) return false;
      await tx.run(
        'INSERT INTO growth_feedback_receipts(id, recorded_at_ms) VALUES (?, ?)',
        [id, now],
      );
      return true;
    });
  }
}
