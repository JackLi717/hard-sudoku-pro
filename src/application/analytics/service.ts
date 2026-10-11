import type {
  AnalyticsEvent,
  AnalyticsGateway,
  AnalyticsParameters,
  AnalyticsReporter,
  AnalyticsStore,
} from './contracts';
import {
  durationBucket,
  isAnalyticsEvent,
  sanitizeParameters,
} from './contracts';

const STATE_KEY = 'product_analytics';
export type ActivityCounts = {
  sessionId: string;
  day: string;
  activeMs: number;
  actions: number;
  undos: number;
  dailyMs: number;
  dailyActions: number;
  engaged: boolean;
  firstAction: boolean;
  autoFinished: boolean;
};
type AnalyticsState = {
  activity?: ActivityCounts;
  firstObservedDay: string | null;
  observation: 'new' | 'existing' | 'unknown';
  activeDay: string | null;
  firstGame: string | null;
  firstEngaged: boolean;
  firstCompleted: boolean;
  ended: string[];
};
const freshState = (): AnalyticsState => ({
  firstObservedDay: null,
  observation: 'unknown',
  activeDay: null,
  firstGame: null,
  firstEngaged: false,
  firstCompleted: false,
  ended: [],
});
function validDay(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}
function validActivity(value: unknown): value is ActivityCounts {
  if (!value || typeof value !== 'object') return false;
  const activity = value as ActivityCounts;
  return (
    typeof activity.sessionId === 'string' &&
    validDay(activity.day) &&
    ['activeMs', 'actions', 'undos', 'dailyMs', 'dailyActions'].every(key => {
      const count = activity[key as keyof ActivityCounts];
      return typeof count === 'number' && Number.isFinite(count) && count >= 0;
    }) &&
    ['engaged', 'firstAction', 'autoFinished'].every(
      key => typeof activity[key as keyof ActivityCounts] === 'boolean',
    )
  );
}
export function utcDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** No event queue: disabled events are discarded, never replayed after consent. */
export class AnalyticsService implements AnalyticsReporter {
  private state = freshState();
  private enabled = false;
  private diagnostics = false;
  private ready = false;
  private closed = false;
  private generation = 0;
  private writeTail: Promise<void> = Promise.resolve();
  private configurationTail: Promise<void> = Promise.resolve();
  private context: AnalyticsParameters = {};
  private screen: string | null = null;
  private currentScreen: string | null = null;
  private bootDuration: number | null = null;
  private bootReported = false;
  private firstActionReadyAt: number | null = null;
  private firstActionInterrupted = false;
  private failures = new Map<string, number>();
  constructor(
    private readonly gateway: AnalyticsGateway,
    private readonly store: AnalyticsStore,
    private readonly environment: 'production' | 'closed_beta' | 'development',
    private readonly now: () => number = Date.now,
  ) {}

  get collecting(): boolean {
    return this.ready && this.enabled && !this.closed;
  }

  async initialize(existing: boolean): Promise<void> {
    try {
      const saved = await this.store.getSetting<AnalyticsState>(STATE_KEY);
      if (saved && Array.isArray(saved.ended)) {
        this.state = {
          firstObservedDay: validDay(saved.firstObservedDay)
            ? saved.firstObservedDay
            : null,
          activeDay: validDay(saved.activeDay) ? saved.activeDay : null,
          observation: ['new', 'existing', 'unknown'].includes(
            saved.observation,
          )
            ? saved.observation
            : 'unknown',
          firstGame:
            typeof saved.firstGame === 'string' ? saved.firstGame : null,
          firstEngaged: saved.firstEngaged === true,
          firstCompleted: saved.firstCompleted === true,
          activity: validActivity(saved.activity) ? saved.activity : undefined,
          ended: saved.ended.filter(id => typeof id === 'string').slice(-64),
        };
      } else {
        this.state.observation = existing ? 'existing' : 'new';
        this.state.firstObservedDay = utcDay(this.now());
        this.persist();
      }
    } catch {
      this.state.observation = 'unknown';
    }
  }

  configure(analytics: boolean, diagnostics: boolean): void {
    if (
      this.closed ||
      (this.enabled === analytics &&
        this.diagnostics === diagnostics &&
        this.ready)
    )
      return;
    const changed = this.enabled !== analytics;
    this.enabled = analytics;
    this.diagnostics = diagnostics;
    this.ready = false;
    this.screen = null;
    const generation = ++this.generation;
    if (changed) {
      // Losing permission resets measurement identity and local cohort metadata.
      // A later opt-in is an existing observation, never a new installation.
      if (!analytics) {
        this.state = { ...freshState(), observation: 'existing' };
        this.persist();
      }
    }
    this.configurationTail = this.configurationTail
      .then(async () => {
        try {
          const available = await this.gateway.configure(
            analytics,
            diagnostics,
          );
          if (generation !== this.generation || this.closed) return;
          this.ready = available;
          if (this.collecting) {
            this.activeDay();
            if (this.bootDuration !== null && !this.bootReported)
              this.readyEvent(this.bootDuration);
            if (this.currentScreen) this.screenView(this.currentScreen);
          }
        } catch {
          this.ready = false;
        }
      })
      .catch(() => {
        this.ready = false;
      });
  }

  setContext(context: AnalyticsParameters): void {
    this.context = sanitizeParameters({ ...this.context, ...context });
  }

  activeDay(): void {
    if (!this.collecting) return;
    const day = utcDay(this.now());
    if (!this.state.firstObservedDay) {
      this.state.firstObservedDay = day;
      // Delayed opt-in cannot be interpreted as first-open installation retention.
      this.state.observation = 'existing';
    }
    if (!this.state.activeDay && this.state.firstObservedDay !== day)
      this.state.observation = 'existing';
    if (this.state.activeDay === day) return;
    this.state.activeDay = day;
    this.persist();
    this.track('app_active_day');
  }

  screenView(name: string, entry: string = 'navigation'): void {
    this.currentScreen = name;
    if (!this.collecting || this.screen === name) return;
    this.screen = name;
    this.activeDay();
    this.track('screen_view', {
      screen_name: name,
      screen_class: 'SudokuScreen',
      entry,
    });
    if (name === 'premium') this.track('premium_view', { entry });
  }

  firstGame(sessionId: string, create = true): boolean {
    if (!this.collecting) return false;
    if (!this.state.firstGame && create) {
      this.state.firstGame = sessionId;
      this.persist();
    }
    return this.state.firstGame === sessionId;
  }

  get activity(): ActivityCounts | undefined {
    return this.collecting ? this.state.activity : undefined;
  }
  saveActivity(activity: ActivityCounts): void {
    if (!this.collecting) return;
    this.state.activity = { ...activity };
    this.persist();
  }

  milestone(
    kind: 'engaged' | 'completed',
    parameters: AnalyticsParameters,
  ): void {
    if (!this.collecting) return;
    const key = kind === 'engaged' ? 'firstEngaged' : 'firstCompleted';
    if (this.state[key]) return;
    this.state[key] = true;
    this.persist();
    this.track(
      kind === 'engaged' ? 'first_game_engaged' : 'first_game_completed',
      { ...parameters, first_game: 1 },
    );
  }

  endGame(id: string, parameters: AnalyticsParameters): void {
    if (!this.collecting || this.state.ended.includes(id)) return;
    this.state.ended = [...this.state.ended, id].slice(-64);
    this.persist();
    this.track('game_ended', parameters);
    if (parameters.result === 'completed' && this.state.firstGame === id)
      this.milestone('completed', parameters);
  }

  track(name: AnalyticsEvent, parameters: AnalyticsParameters = {}): void {
    if (!this.collecting || !isAnalyticsEvent(name)) return;
    const day = this.state.firstObservedDay;
    const age = day
      ? Math.floor(
          (Date.parse(utcDay(this.now())) - Date.parse(day)) / 86400000,
        )
      : -1;
    const installAge =
      this.state.observation !== 'new' || age < 0
        ? 'unknown'
        : [0, 1, 7, 30].includes(age)
        ? String(age)
        : age < 7
        ? '2_6'
        : age < 30
        ? '8_29'
        : 'gt_30';
    try {
      this.gateway.logEvent(
        name,
        sanitizeParameters({
          ...this.context,
          ...parameters,
          build_environment: this.environment,
          observation: this.state.observation,
          install_age: installAge,
        }),
      );
    } catch {
      /* Telemetry must never affect business operations. */
    }
  }

  failure(
    operation: string,
    fatal = false,
    frames = '',
    details?: AnalyticsParameters,
  ): void {
    if (this.closed || !/^[a-z_]{1,48}$/.test(operation)) return;
    const now = this.now();
    if (now - (this.failures.get(operation) ?? -Infinity) < 60000) return;
    if (this.failures.size >= 64) this.failures.clear();
    this.failures.set(operation, now);
    const diagnostic = details ? sanitizeParameters(details) : undefined;
    this.track('operation_failed', {
      ...diagnostic,
      operation,
      result: 'failed',
    });
    if (!this.ready || !this.diagnostics) return;
    try {
      if (diagnostic) {
        this.gateway.recordError(operation, fatal, frames, {
          ...diagnostic,
          build_environment: this.environment,
        });
      } else this.gateway.recordError(operation, fatal, frames);
    } catch {
      /* Best effort. */
    }
  }

  interruptFirstActionWait(): void {
    this.firstActionInterrupted = true;
  }
  firstActionWait(): string {
    return this.firstActionReadyAt === null || this.firstActionInterrupted
      ? 'not_observed'
      : durationBucket(
          Math.max(0, performance.now() - this.firstActionReadyAt),
        );
  }
  readyEvent(durationMs: number): void {
    this.firstActionReadyAt ??= performance.now();
    this.bootDuration = durationMs;
    if (!this.collecting || this.bootReported) return;
    this.bootReported = true;
    this.track('app_ready', { duration_bucket: durationBucket(durationMs) });
  }

  close(): void {
    this.closed = true;
    ++this.generation;
    this.enabled = false;
    this.ready = false;
  }

  async settled(): Promise<void> {
    await this.configurationTail;
    await this.writeTail;
  }

  private persist(): void {
    const value = { ...this.state, ended: [...this.state.ended] };
    this.writeTail = this.writeTail
      .then(() => this.store.setSetting(STATE_KEY, value, this.now()))
      .catch(() => undefined);
  }
}
