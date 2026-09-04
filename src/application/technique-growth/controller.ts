import { GameSession } from '../../domain/game/contracts';
import { TechniqueCode } from '../../domain/hints/techniques';
import { TechniqueOpportunityAnalyzer } from '../../domain/technique-recognition/contracts';
import { GrowthStore } from '../../data/user/technique-growth-repository';
import { ProductPreferenceStore } from '../app/product-preferences';
import { SessionReplaySource } from '../game/session-replay-source';
import { buildSessionReplay } from '../game/session-replay';
import { SessionReviewSource } from '../technique-recognition/session-review';
import {
  buildOpportunityProcesses,
  verifyOpportunityProcesses,
} from '../technique-recognition/opportunity-processes';
import {
  GrowthReference,
  GrowthSession,
  GrowthViewModel,
  LearningCompletion,
} from './contracts';
import { buildGrowthViewModel } from './view-model';
import { growthInputFingerprint, projectGrowthSession } from './projector';

export class TechniqueGrowthController {
  private listeners = new Set<(vm: GrowthViewModel) => void>();
  private sessions = new Map<string, GrowthSession>();
  private completions: readonly LearningCompletion[] = [];
  private followed: readonly TechniqueCode[] = [];
  private queue = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private abort: AbortController | null = null;
  private blocked = false;
  private blockers = new Set<string>();
  private closed = false;
  private unsubscribe?: () => void;
  private initialized = false;
  private error = false;
  private mutation: Promise<unknown> = Promise.resolve();
  private vm: GrowthViewModel = { ...buildGrowthViewModel([]), loading: true };
  constructor(
    private readonly store: GrowthStore,
    private readonly preferences: ProductPreferenceStore,
    private readonly replay: SessionReplaySource,
    private readonly evidence: SessionReviewSource | undefined,
    private readonly analyzer: TechniqueOpportunityAnalyzer,
    private readonly now: () => number = Date.now,
  ) {}
  get snapshot() {
    return this.vm;
  }
  subscribe(listener: (vm: GrowthViewModel) => void) {
    this.listeners.add(listener);
    listener(this.vm);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private emit() {
    this.vm = {
      ...buildGrowthViewModel([...this.sessions.values()], this.followed),
      loading: !this.initialized,
      updating: this.queue.size > 0 || !!this.abort,
      failed: this.error,
    };
    this.listeners.forEach(l => l(this.vm));
  }
  async initialize() {
    try {
      const [projections, completions, followed, index] = await Promise.all([
        this.store.readProjections(),
        this.store.readCompletions(),
        this.preferences.getSetting<readonly TechniqueCode[]>(
          'growth_followed',
        ),
        this.store.listSessions(),
      ]);
      if (this.closed) return;
      this.sessions.clear();
      for (const item of index) {
        const cached = projections.find(p => p.sessionId === item.sessionId);
        this.sessions.set(
          item.sessionId,
          cached
            ? {
                ...cached,
                ...item,
                coverage:
                  cached.revision === item.revision
                    ? cached.coverage
                    : 'pending',
              }
            : {
                ...item,
                puzzleIdentity: '',
                inputFingerprint: '',
                updatedAt: 0,
                coverage: 'pending',
                records: [],
              },
        );
      }
      this.completions = completions;
      this.followed = followed ?? [];
      index.forEach(item => this.queue.add(item.sessionId));
      this.initialized = true;
      this.error = false;
      this.unsubscribe?.();
      this.unsubscribe = this.evidence?.subscribe(id => {
        if (id) this.enqueue(id);
      });
      this.emit();
      this.schedule();
    } catch {
      this.initialized = true;
      this.error = true;
      this.emit();
    }
  }
  setBlocked(value: boolean, owner = 'game') {
    if (value) this.blockers.add(owner);
    else this.blockers.delete(owner);
    this.blocked = this.blockers.size > 0;
    if (this.blocked) {
      this.abort?.abort();
      if (this.timer) clearTimeout(this.timer);
      this.timer = null;
    } else this.schedule();
  }
  enqueue(id: string) {
    if (this.closed) return;
    this.queue.add(id);
    this.schedule();
  }
  private schedule() {
    if (
      this.blocked ||
      this.closed ||
      !this.initialized ||
      this.abort ||
      this.timer ||
      !this.queue.size
    )
      return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.runNext().catch(() => undefined);
    }, 400);
  }
  private async runNext() {
    const id = this.queue.values().next().value as string | undefined;
    if (!id || this.blocked || this.closed) return;
    this.queue.delete(id);
    const abort = new AbortController();
    this.abort = abort;
    this.emit();
    try {
      const session = await this.replay.readReplaySession(id);
      if (!session) {
        const retained = this.sessions.get(id);
        if (retained)
          this.sessions.set(id, { ...retained, coverage: 'failed' });
        this.error = true;
        return;
      }
      const shadow = (await this.evidence?.readSession(id)) ?? [];
      if (abort.signal.aborted) return;
      const old = this.sessions.get(id);
      if (
        old?.inputFingerprint === growthInputFingerprint(session, shadow) &&
        old.coverage !== 'pending' &&
        old.coverage !== 'failed'
      )
        return;
      // Publish durable learning facts before potentially expensive native work.
      const pending = projectGrowthSession(
        session,
        shadow,
        this.completions,
        null,
        this.now(),
      );
      this.sessions.set(
        id,
        old
          ? {
              ...pending,
              records: [
                ...pending.records.filter(
                  r => r.reason === 'learning' || r.kind === 'hint_viewed',
                ),
                ...old.records.filter(
                  r =>
                    r.kind === 'application' ||
                    r.kind === 'possible' ||
                    r.kind === 'unknown',
                ),
              ],
            }
          : pending,
      );
      this.emit();
      if (
        session.state.status === 'active' ||
        session.state.status === 'paused'
      ) {
        await this.store.saveProjection(pending);
        this.sessions.set(id, pending);
        return;
      }
      const run = `growth:${id}:${this.now()}`;
      const report = await verifyOpportunityProcesses(
        buildOpportunityProcesses(shadow, id),
        {
          analyze: async request => {
            await new Promise<void>(resolve => setTimeout(resolve, 0));
            if (abort.signal.aborted) throw Error('cancelled');
            const scoped = {
              ...request,
              requestId: `${run}:${request.requestId}`,
            };
            const response = await this.analyzer.analyze(scoped, {
              signal: abort.signal,
            });
            if (abort.signal.aborted) throw Error('cancelled');
            return response.requestId === scoped.requestId
              ? { ...response, requestId: request.requestId }
              : response;
          },
        },
        16,
      );
      if (abort.signal.aborted) return;
      const result = projectGrowthSession(
        session,
        shadow,
        this.completions,
        report,
        this.now(),
      );
      if (report.diagnostics.some(d => d.reason === 'verification_failed'))
        result.coverage = 'failed';
      await this.store.saveProjection(result);
      if (this.closed) return;
      this.sessions.set(id, result);
      this.error = result.coverage === 'failed';
    } catch {
      if (!abort.signal.aborted) {
        this.error = true;
        const old = this.sessions.get(id);
        if (old) this.sessions.set(id, { ...old, coverage: 'failed' });
      }
    } finally {
      if (abort.signal.aborted && !this.closed) this.queue.add(id);
      this.abort = null;
      this.emit();
      this.schedule();
    }
  }
  /** Fast facts path; no native search or analysis of other games. */
  async refreshLearning(session: GameSession) {
    try {
      const saved = await this.replay.readReplaySession(
        session.state.sessionId,
      );
      if (!saved || this.closed) return;
      const old = this.sessions.get(saved.state.sessionId);
      const facts = projectGrowthSession(
        saved,
        [],
        this.completions,
        null,
        this.now(),
      );
      const merged = {
        ...facts,
        records: [
          ...facts.records.filter(r => r.kind !== 'unknown'),
          ...(old?.records.filter(
            r =>
              !['hint_viewed', 'hint_applied', 'walkthrough'].includes(r.kind),
          ) ?? []),
        ],
        inputFingerprint: '',
      };
      await this.store.saveProjection(merged);
      if (this.closed) return;
      this.sessions.set(merged.sessionId, merged);
      this.emit();
      this.enqueue(merged.sessionId);
    } catch {
      this.error = true;
      this.emit();
    }
  }
  async retry() {
    this.error = false;
    await this.initialize();
  }
  follow(code: TechniqueCode) {
    const next = this.mutation.then(async () => {
      const followed = this.followed.includes(code)
        ? this.followed.filter(c => c !== code)
        : [...this.followed, code];
      await this.preferences.setSetting(
        'growth_followed',
        followed,
        this.now(),
      );
      this.followed = followed;
      this.emit();
    });
    this.mutation = next.catch(() => {
      this.error = true;
      this.emit();
    });
    return next;
  }
  completeWalkthrough(
    reference: GrowthReference,
    steps: readonly { technique: TechniqueCode; explanationId: string }[],
  ) {
    const next = this.mutation.then(async () => {
      const session = await this.replay.readReplaySession(reference.sessionId);
      if (!session) throw Error('Missing source game');
      const frames = buildSessionReplay(session).frames;
      if (!reference.moveIds.length && !reference.eventId)
        throw Error('Missing source step');
      if (
        reference.moveIds.some(id => !frames.some(f => f.move?.id === id)) ||
        (reference.eventId &&
          !frames.some(f => f.event?.id === reference.eventId))
      )
        throw Error('Missing source step');
      for (const step of steps) {
        const id = JSON.stringify([
          'walkthrough',
          reference.sessionId,
          reference.eventId ?? reference.moveIds,
          step.technique,
        ]);
        await this.store.saveCompletion({
          id,
          technique: step.technique,
          occurredAt: this.now(),
          reference,
          explanationId: step.explanationId,
        });
      }
      this.completions = await this.store.readCompletions();
      await this.refreshLearning(session);
    });
    this.mutation = next.catch(() => {
      this.error = true;
      this.emit();
    });
    return next;
  }
  claimFeedback(sessionId: string) {
    return this.store.claimReceipt(`light:${sessionId}`, this.now());
  }
  close() {
    this.closed = true;
    this.abort?.abort();
    if (this.timer) clearTimeout(this.timer);
    this.unsubscribe?.();
    this.listeners.clear();
  }
}
