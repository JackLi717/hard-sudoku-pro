import {
  CHALLENGE_EPISODES,
  type ChallengeAccessStore,
  type ChallengeEpisodeId,
} from '../../domain/challenge/contracts';
import type { SqlDatabase, SqlExecutor } from '../sqlite/contracts';

export const CHALLENGE_ACCESS_TABLE = `CREATE TABLE IF NOT EXISTS challenge_access (
  episode_id TEXT PRIMARY KEY,
  external_event_id TEXT NOT NULL UNIQUE,
  created_at_ms INTEGER NOT NULL CHECK (created_at_ms >= 0)
)`;

async function readAccess(database: SqlExecutor, id: ChallengeEpisodeId) {
  const index = CHALLENGE_EPISODES.findIndex(episode => episode.id === id);
  if (index < 0) throw new Error('Unknown challenge episode');
  if (index === 0) return { unlocked: true, eligible: true };
  const previous = CHALLENGE_EPISODES[index - 1].id;
  const passes = await database.query<{ level_id: string }>(
    'SELECT level_id FROM challenge_progress WHERE ever_passed = 1',
  );
  const eligible = Array.from(
    { length: 6 },
    (_, i) => `${previous}-${i + 1}`,
  ).every(level => passes.some(row => row.level_id === level));
  const rows = await database.query<{ episode_id: string }>(
    'SELECT episode_id FROM challenge_access WHERE episode_id = ?',
    [id],
  );
  return { unlocked: rows.length > 0, eligible };
}

/** Episode access is independent of retries, credits, and current attempts. */
export class ChallengeAccessRepository implements ChallengeAccessStore {
  constructor(private readonly database: SqlDatabase) {}
  read(id: ChallengeEpisodeId) {
    return readAccess(this.database, id);
  }
  async grant(
    id: ChallengeEpisodeId,
    eventId: string,
    now: number,
  ): Promise<void> {
    if (!eventId || !Number.isSafeInteger(now) || now < 0)
      throw new Error('Invalid challenge reward');
    await this.database.transaction(async transaction => {
      const access = await readAccess(transaction, id);
      if (!access.eligible) throw new Error('Previous episode is incomplete');
      const receipt = await transaction.query<{ episode_id: string }>(
        'SELECT episode_id FROM challenge_access WHERE external_event_id = ?',
        [eventId],
      );
      if (receipt.length && receipt[0].episode_id !== id)
        throw new Error('Challenge reward reused for another episode');
      if (id === 'discovery' || access.unlocked) return;
      await transaction.run(
        'INSERT INTO challenge_access(episode_id, external_event_id, created_at_ms) VALUES (?, ?, ?)',
        [id, eventId, now],
      );
    });
  }
}
