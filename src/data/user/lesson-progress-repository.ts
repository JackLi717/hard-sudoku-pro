import type { SqlDatabase, SqlRow } from '../sqlite/contracts';
import {
  LessonLocation,
  LessonReading,
  LessonReadingStore,
  validateLessonLocation,
} from '../../domain/lessons/reading';

export const LESSON_READING_TABLE = `CREATE TABLE IF NOT EXISTS lesson_readings (
  lesson_id TEXT PRIMARY KEY,
  content_key TEXT NOT NULL,
  location_json TEXT NOT NULL CHECK (json_valid(location_json)),
  updated_at_ms INTEGER NOT NULL CHECK (updated_at_ms >= 0),
  completed_at_ms INTEGER CHECK (completed_at_ms IS NULL OR completed_at_ms >= 0)
)`;

type ReadingRow = SqlRow & {
  lesson_id: string;
  content_key: string;
  location_json: string;
  updated_at_ms: number;
  completed_at_ms: number | null;
};

function decode(row: ReadingRow): LessonReading {
  const location = JSON.parse(row.location_json) as LessonLocation;
  validateLessonLocation(location);
  return Object.freeze({
    lessonId: row.lesson_id,
    contentKey: row.content_key,
    location: Object.freeze({
      ...location,
      target: location.target ? Object.freeze({ ...location.target }) : null,
    }),
    updatedAt: row.updated_at_ms,
    completedAt: row.completed_at_ms,
  });
}

/** Only reading facts in user.sqlite; no wallet, game or mastery writes. */
export class LessonProgressRepository implements LessonReadingStore {
  constructor(private readonly database: SqlDatabase) {}

  async listReadings(): Promise<readonly LessonReading[]> {
    const rows = await this.database.query<ReadingRow>(
      'SELECT * FROM lesson_readings ORDER BY updated_at_ms DESC, lesson_id',
    );
    return Object.freeze(rows.map(decode));
  }

  async saveLocation(
    lessonId: string,
    contentKey: string,
    location: LessonLocation,
    now: number,
    complete = false,
  ): Promise<LessonReading> {
    validateLessonLocation(location);
    if (
      !lessonId ||
      !contentKey ||
      !Number.isSafeInteger(now) ||
      now < 0 ||
      (complete && !['proof', 'recap'].includes(location.chapter))
    ) {
      throw new Error('Invalid lesson reading update');
    }
    return this.database.transaction(async transaction => {
      await transaction.run(
        `INSERT INTO lesson_readings (
          lesson_id, content_key, location_json, updated_at_ms, completed_at_ms
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(lesson_id) DO UPDATE SET
          content_key = excluded.content_key,
          location_json = excluded.location_json,
          updated_at_ms = excluded.updated_at_ms,
          completed_at_ms = CASE
            WHEN lesson_readings.content_key = excluded.content_key
            THEN COALESCE(lesson_readings.completed_at_ms, excluded.completed_at_ms)
            ELSE excluded.completed_at_ms END`,
        [
          lessonId,
          contentKey,
          JSON.stringify(location),
          now,
          complete ? now : null,
        ],
      );
      const [row] = await transaction.query<ReadingRow>(
        'SELECT * FROM lesson_readings WHERE lesson_id = ?',
        [lessonId],
      );
      if (!row) throw new Error('Lesson reading was not saved');
      return decode(row);
    });
  }
}
