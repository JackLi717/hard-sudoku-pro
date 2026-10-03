import type { SqlDatabase, SqlRow } from '../sqlite/contracts';
import type {
  PracticeAttempt,
  PracticeOutcome,
  PracticeProgress,
  PracticeProgressStore,
} from '../../domain/practice/progress';

export const PRACTICE_PROGRESS_TABLE = `CREATE TABLE IF NOT EXISTS practice_progress (
  exercise_id TEXT PRIMARY KEY,
  content_key TEXT NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts >= 1),
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
  last_outcome TEXT NOT NULL CHECK (last_outcome IN ('correct', 'incorrect')),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= 0),
  first_correct_at_ms INTEGER CHECK (
    first_correct_at_ms IS NULL OR first_correct_at_ms >= 0
  ),
  last_correct_at_ms INTEGER CHECK (
    last_correct_at_ms IS NULL OR last_correct_at_ms >= 0
  ),
  best_duration_ms INTEGER CHECK (
    best_duration_ms IS NULL OR best_duration_ms >= 0
  ),
  last_duration_ms INTEGER CHECK (
    last_duration_ms IS NULL OR last_duration_ms >= 0
  )
)`;

type ProgressRow = SqlRow & {
  exercise_id: string;
  content_key: string;
  attempts: number;
  correct_count: number;
  last_outcome: PracticeOutcome;
  updated_at_ms: number;
  first_correct_at_ms: number | null;
  last_correct_at_ms: number | null;
  best_duration_ms: number | null;
  last_duration_ms: number | null;
};

function decode(row: ProgressRow): PracticeProgress {
  return {
    exerciseId: row.exercise_id,
    contentKey: row.content_key,
    attempts: row.attempts,
    correctCount: row.correct_count,
    lastOutcome: row.last_outcome,
    updatedAt: row.updated_at_ms,
    firstCorrectAt: row.first_correct_at_ms,
    lastCorrectAt: row.last_correct_at_ms,
    bestDurationMs: row.best_duration_ms,
    lastDurationMs: row.last_duration_ms,
  };
}

export class PracticeProgressRepository implements PracticeProgressStore {
  constructor(private readonly database: SqlDatabase) {}

  async listProgress(): Promise<readonly PracticeProgress[]> {
    const rows = await this.database.query<ProgressRow>(
      'SELECT * FROM practice_progress ORDER BY exercise_id',
    );
    return rows.map(decode);
  }

  async recordAttempt(
    exerciseId: string,
    contentKey: string,
    attempt: PracticeAttempt,
    now: number,
  ): Promise<PracticeProgress> {
    if (
      !exerciseId ||
      !contentKey ||
      (attempt.outcome !== 'correct' && attempt.outcome !== 'incorrect') ||
      (attempt.outcome === 'correct' &&
        (!Number.isSafeInteger(attempt.durationMs) ||
          attempt.durationMs < 0)) ||
      !Number.isSafeInteger(now) ||
      now < 0
    ) {
      throw new Error('Invalid practice attempt');
    }
    const correct = attempt.outcome === 'correct';
    const duration = correct ? attempt.durationMs : null;
    return this.database.transaction(async transaction => {
      await transaction.run(
        `INSERT INTO practice_progress (
          exercise_id, content_key, attempts, correct_count,
          last_outcome, updated_at_ms, first_correct_at_ms,
          last_correct_at_ms, best_duration_ms, last_duration_ms
        ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(exercise_id) DO UPDATE SET
          content_key = excluded.content_key,
          attempts = CASE WHEN practice_progress.content_key = excluded.content_key
            THEN practice_progress.attempts + 1 ELSE 1 END,
          correct_count = CASE WHEN practice_progress.content_key = excluded.content_key
            THEN practice_progress.correct_count + excluded.correct_count
            ELSE excluded.correct_count END,
          last_outcome = excluded.last_outcome,
          updated_at_ms = excluded.updated_at_ms,
          first_correct_at_ms = CASE WHEN practice_progress.content_key = excluded.content_key
            THEN COALESCE(practice_progress.first_correct_at_ms, excluded.first_correct_at_ms)
            ELSE excluded.first_correct_at_ms END,
          last_correct_at_ms = CASE WHEN practice_progress.content_key = excluded.content_key
            THEN COALESCE(excluded.last_correct_at_ms, practice_progress.last_correct_at_ms)
            ELSE excluded.last_correct_at_ms END,
          last_duration_ms = CASE WHEN practice_progress.content_key = excluded.content_key
            THEN COALESCE(excluded.last_duration_ms, practice_progress.last_duration_ms)
            ELSE excluded.last_duration_ms END,
          best_duration_ms = CASE
            WHEN practice_progress.content_key != excluded.content_key
              THEN excluded.best_duration_ms
            WHEN excluded.best_duration_ms IS NULL
              THEN practice_progress.best_duration_ms
            WHEN practice_progress.best_duration_ms IS NULL OR
              excluded.best_duration_ms < practice_progress.best_duration_ms
              THEN excluded.best_duration_ms
            ELSE practice_progress.best_duration_ms END`,
        [
          exerciseId,
          contentKey,
          correct ? 1 : 0,
          attempt.outcome,
          now,
          correct ? now : null,
          correct ? now : null,
          duration,
          duration,
        ],
      );
      const [row] = await transaction.query<ProgressRow>(
        'SELECT * FROM practice_progress WHERE exercise_id = ?',
        [exerciseId],
      );
      if (!row) throw new Error('Practice attempt was not saved');
      return decode(row);
    });
  }
}
