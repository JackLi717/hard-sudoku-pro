import {
  checkChallenge,
  createChallengeProgress,
  restartChallenge,
  restoreChallenge,
  undoChallenge,
} from '../../domain/challenge/engine';
import type {
  ChallengeAccessStore,
  ChallengeCatalog,
  ChallengeOperation,
  ChallengeProgress,
  ChallengeProgressStore,
} from '../../domain/challenge/contracts';
import { CHALLENGE_EPISODES } from '../../domain/challenge/contracts';

let attemptSequence = 0;
const attemptId = () => `challenge:${Date.now()}:${++attemptSequence}`;

export class ChallengeController {
  private records = new Map<string, ChallengeProgress>();
  private inFlight = false;
  private unlockedEpisodes = new Set(['discovery']);
  dispose(): void {
    this.setPlaying(null);
  }
  private playing: { id: string; since: number } | null = null;
  private pendingTime = new Map<string, number>();
  setPlaying(id: string | null): void {
    const now = this.now();
    if (this.playing)
      this.pendingTime.set(
        this.playing.id,
        (this.pendingTime.get(this.playing.id) ?? 0) +
          Math.max(0, now - this.playing.since),
      );
    this.playing = id ? { id, since: now } : null;
  }
  async flushTime(id: string): Promise<void> {
    return this.exclusive(async () => {
      if ((this.pendingTime.get(id) ?? 0) > 0)
        await this.commit(this.progress(id));
    });
  }
  constructor(
    readonly catalog: ChallengeCatalog,
    private readonly store: ChallengeProgressStore,
    private readonly now: () => number = () => performance.now(),
    private readonly access?: ChallengeAccessStore,
  ) {}
  async load(): Promise<void> {
    const saved = await this.store.list();
    for (const level of this.catalog.levels) {
      const row = saved.find(item => item.levelId === level.id);
      if (!row) continue;
      try {
        // Additions to other episodes do not discard a valid existing attempt.
        this.records.set(
          level.id,
          restoreChallenge(level, {
            ...row,
            contentKey: this.catalog.content_key,
          }),
        );
      } catch {
        // Durable pass/access facts survive a damaged or obsolete attempt.
        this.records.set(level.id, {
          ...restartChallenge(row, attemptId()),
          contentKey: this.catalog.content_key,
        });
      }
    }
    await this.refreshAccess();
  }
  async refreshAccess(): Promise<void> {
    if (!this.access) return;
    const states = await Promise.all(
      CHALLENGE_EPISODES.map(episode => this.access!.read(episode.id)),
    );
    states.forEach((state, index) => {
      if (state.unlocked && state.eligible)
        this.unlockedEpisodes.add(CHALLENGE_EPISODES[index].id);
    });
  }
  episodeComplete(index: number): boolean {
    const levels = this.catalog.levels.slice(index * 6, index * 6 + 6);
    return (
      levels.length === 6 &&
      levels.every(level => this.progress(level.id).everPassed)
    );
  }
  progress(levelId: string): ChallengeProgress {
    const row = this.records.get(levelId);
    if (row) return row;
    const created = createChallengeProgress(
      levelId,
      this.catalog.content_key,
      attemptId(),
    );
    this.records.set(levelId, created);
    return created;
  }
  available(index: number): boolean {
    return (
      Number.isInteger(index) &&
      index >= 0 &&
      index < this.catalog.levels.length &&
      this.unlockedEpisodes.has(CHALLENGE_EPISODES[Math.floor(index / 6)].id) &&
      (index < 6 || this.episodeComplete(Math.floor(index / 6) - 1))
    );
  }
  private requireAvailable(levelId: string): void {
    const index = this.catalog.levels.findIndex(level => level.id === levelId);
    if (!this.available(index)) throw new Error('Challenge locked');
  }
  private async commit(next: ChallengeProgress): Promise<void> {
    const expectedRevision = this.progress(next.levelId).revision;
    if (this.playing?.id === next.levelId) this.setPlaying(next.levelId);
    const pending = this.pendingTime.get(next.levelId) ?? 0;
    const sameAttempt =
      this.progress(next.levelId).attempt.id === next.attempt.id;
    const persisted = {
      ...next,
      revision: expectedRevision + 1,
      attempt: {
        ...next.attempt,
        elapsedMs: next.attempt.elapsedMs + (sameAttempt ? pending : 0),
      },
      everPassed: next.everPassed || next.attempt.passed,
      passedAfterExplanation:
        next.passedAfterExplanation ||
        (!this.progress(next.levelId).attempt.passed &&
          next.attempt.passed &&
          next.solutionViewed),
    };
    await this.store.save(persisted, expectedRevision);
    this.pendingTime.set(
      next.levelId,
      Math.max(0, (this.pendingTime.get(next.levelId) ?? 0) - pending),
    );
    this.records.set(next.levelId, persisted);
  }
  private async exclusive<T>(work: () => Promise<T>): Promise<T> {
    if (this.inFlight) throw new Error('Challenge operation already in flight');
    this.inFlight = true;
    try {
      return await work();
    } finally {
      this.inFlight = false;
    }
  }
  async check(levelId: string, operations: readonly ChallengeOperation[]) {
    return this.exclusive(async () => {
      const index = this.catalog.levels.findIndex(
        level => level.id === levelId,
      );
      if (index < 0 || !this.available(index))
        throw new Error('Challenge locked');
      const progress = this.progress(levelId);
      const result = checkChallenge(
        this.catalog.levels[index],
        progress.attempt,
        operations,
      );
      if (result.status === 'accepted' || result.status === 'rejected')
        await this.commit({ ...progress, attempt: result.attempt });
      return result.status;
    });
  }
  async restart(levelId: string): Promise<void> {
    return this.exclusive(async () => {
      this.requireAvailable(levelId);
      await this.commit(restartChallenge(this.progress(levelId), attemptId()));
    });
  }
  async undo(levelId: string): Promise<void> {
    return this.exclusive(async () => {
      this.requireAvailable(levelId);
      const progress = this.progress(levelId);
      const attempt = undoChallenge(progress.attempt);
      if (attempt !== progress.attempt)
        await this.commit({ ...progress, attempt });
    });
  }
  async viewSolution(levelId: string): Promise<void> {
    return this.exclusive(async () => {
      this.requireAvailable(levelId);
      const progress = this.progress(levelId);
      await this.commit({
        ...progress,
        solutionViewed: true,
        attempt: { ...progress.attempt, ended: true },
      });
    });
  }
}
