import { createChallengeProgress } from '../../domain/challenge/engine';
import type { SqlDatabase, SqlRow } from '../sqlite/contracts';
import type {
  ChallengeProgress,
  ChallengeProgressStore,
} from '../../domain/challenge/contracts';

export const CHALLENGE_PROGRESS_TABLE = `CREATE TABLE IF NOT EXISTS challenge_progress (
  level_id TEXT PRIMARY KEY,
  content_key TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  ever_passed INTEGER NOT NULL CHECK (ever_passed IN (0, 1)),
  solution_viewed INTEGER NOT NULL CHECK (solution_viewed IN (0, 1)),
  passed_after_explanation INTEGER NOT NULL CHECK (passed_after_explanation IN (0, 1)),
  attempt_json TEXT NOT NULL
)`;

type ChallengeRow = SqlRow & {
  level_id: string;
  content_key: string;
  revision: number;
  ever_passed: number;
  solution_viewed: number;
  attempt_json: string;
  passed_after_explanation: number;
};

export class ChallengeProgressRepository implements ChallengeProgressStore {
  constructor(private readonly database: SqlDatabase) {}
  async list(): Promise<readonly ChallengeProgress[]> {
    const rows = await this.database.query<ChallengeRow>(
      'SELECT * FROM challenge_progress ORDER BY level_id',
    );
    return rows.map(row => ({
      levelId: row.level_id,
      contentKey: row.content_key,
      revision: row.revision,
      everPassed: row.ever_passed === 1,
      solutionViewed: row.solution_viewed === 1,
      passedAfterExplanation: row.passed_after_explanation === 1,
      attempt: (() => {
        try {
          return JSON.parse(row.attempt_json);
        } catch {
          return createChallengeProgress(
            row.level_id,
            row.content_key,
            'recovered',
          ).attempt;
        }
      })(),
    }));
  }
  async save(
    record: ChallengeProgress,
    expectedRevision: number,
  ): Promise<void> {
    if (
      !record.levelId ||
      !record.contentKey ||
      record.revision !== expectedRevision + 1 ||
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 0
    )
      throw new Error('Invalid challenge revision');
    await this.database.transaction(async transaction => {
      const [existing] = await transaction.query<ChallengeRow>(
        'SELECT * FROM challenge_progress WHERE level_id = ?',
        [record.levelId],
      );
      if ((existing?.revision ?? 0) !== expectedRevision)
        throw new Error('Stale challenge write');
      await transaction.run(
        `INSERT INTO challenge_progress
        (level_id, content_key, revision, ever_passed, solution_viewed, passed_after_explanation, attempt_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(level_id) DO UPDATE SET content_key = excluded.content_key,
          revision = excluded.revision,
          ever_passed = MAX(challenge_progress.ever_passed, excluded.ever_passed),
          solution_viewed = MAX(challenge_progress.solution_viewed, excluded.solution_viewed),
          passed_after_explanation = MAX(challenge_progress.passed_after_explanation, excluded.passed_after_explanation),
          attempt_json = excluded.attempt_json`,
        [
          record.levelId,
          record.contentKey,
          record.revision,
          record.everPassed ? 1 : 0,
          record.solutionViewed ? 1 : 0,
          record.passedAfterExplanation ? 1 : 0,
          JSON.stringify(record.attempt),
        ],
      );
    });
  }
}
