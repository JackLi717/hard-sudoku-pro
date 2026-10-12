import type {
  GameCommand,
  GameCommandResult,
  GameSession,
  GameState,
} from '../../domain/game/contracts';
import type { AcceptedGameCommandObserver } from '../technique-recognition/shadow-controller';
import { durationBucket } from './contracts';
import { AnalyticsService, utcDay } from './service';

/** Keeps counts, never serializes a board or an operation history. */
export class GameAnalyticsObserver implements AcceptedGameCommandObserver {
  private state: GameState | null = null;
  private foreground = true;
  private interactive = true;
  private lastTick: number;
  private day: string;
  private activeMs = 0;
  private actions = 0;
  private undos = 0;
  private dailyMs = 0;
  private dailyActions = 0;
  private engaged = false;
  private firstAction = false;
  private autoFinished = false;
  private interval: ReturnType<typeof setInterval>;
  private lastSummary: number;
  private wasCollecting = false;
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly now: () => number = Date.now,
    private readonly monotonic: () => number = () => performance.now(),
  ) {
    this.lastTick = monotonic();
    this.lastSummary = this.lastTick;
    this.day = utcDay(now());
    this.interval = setInterval(() => this.checkpoint(), 1000);
  }

  attach(session: GameSession, kind: string = 'new'): void {
    this.checkpoint();
    this.flush();
    this.reset(session.state);
    this.analytics.track('game_started', {
      difficulty: session.state.difficultyLevel,
      first_game: Number(this.analytics.firstGame(session.state.sessionId)),
      puzzle_kind: kind,
    });
  }
  restore(session: GameSession): void {
    this.reset(session.state);
    this.analytics.firstGame(session.state.sessionId, true, false);
  }

  setInteractive(active: boolean): void {
    this.checkpoint();
    this.interactive = active;
  }

  setForeground(active: boolean): void {
    this.checkpoint();
    if (!active) {
      this.flush();
      this.analytics.interruptFirstActionWait();
    }
    this.foreground = active;
    this.lastTick = this.monotonic();
    if (active) this.analytics.activeDay();
  }

  observeAcceptedCommand(
    before: GameSession,
    command: GameCommand,
    result: GameCommandResult,
  ): void {
    this.checkpoint();
    this.state = result.session.state;
    const common = { difficulty: this.state.difficultyLevel };
    if (command.type === 'resume') this.analytics.track('game_resumed', common);
    const move =
      result.historyChange?.kind === 'append'
        ? result.historyChange.move
        : null;
    const playerAction =
      move &&
      [
        'place_value',
        'erase_value',
        'edit_manual_candidate',
        'edit_quick_candidate',
      ].includes(move.kind) &&
      command.type !== 'auto_finish_trivial_tail' &&
      command.type !== 'apply_hint';
    if (playerAction && this.analytics.collecting) {
      this.actions++;
      this.dailyActions++;
      if (!this.firstAction) {
        this.firstAction = true;
        if (this.analytics.firstGame(this.state.sessionId, false))
          this.analytics.track('game_first_action', {
            ...common,
            first_game: 1,
            wait_bucket: this.analytics.firstActionWait(),
          });
      }
    }
    if (command.type === 'undo') this.undos++;
    if (command.type === 'auto_finish_trivial_tail') this.autoFinished = true;
    if (command.type === 'reveal_hint')
      this.analytics.track('hint_result', {
        ...common,
        result: 'displayed',
        technique: command.step.techniqueCode,
        credited: Number(result.creditSpend !== undefined),
      });
    if (command.type === 'apply_hint' || command.type === 'dismiss_hint')
      this.analytics.track('hint_interaction', {
        ...common,
        action: command.type === 'apply_hint' ? 'apply' : 'close',
        technique: before.state.activeHint?.techniqueCode ?? 'unknown',
      });
    if (command.type === 'generate_quick_draft')
      this.analytics.track('quick_pencil_result', {
        ...common,
        action: command.confirmed ? 'regenerate' : 'generate',
        result: 'success',
      });
    if (['completed', 'failed', 'abandoned'].includes(this.state.status)) {
      this.flush();
      this.analytics.endGame(this.state.sessionId, {
        ...common,
        result: this.state.status,
        duration_bucket: durationBucket(this.state.timer.elapsedMs),
        hints: this.state.hintUseCount,
        quick_pencils: this.state.quickPencilUseCount,
        mistakes: this.state.errorCount,
        actions: this.actions,
        undos: this.undos,
        auto_finish: Number(this.autoFinished),
        span_bucket: String(
          Math.max(
            0,
            Math.min(
              30,
              Math.floor(
                (Date.parse(utcDay(this.now())) -
                  Date.parse(utcDay(this.state.startedAtEpochMs))) /
                  86400000,
              ),
            ),
          ),
        ),
      });
    }
    if (command.type === 'pause') this.flush();
    this.checkEngaged();
  }

  checkpoint(): void {
    const current = this.monotonic();
    const delta = Math.max(0, current - this.lastTick);
    this.lastTick = current;
    if (!this.analytics.collecting) {
      this.wasCollecting = false;
      this.dailyMs =
        this.dailyActions =
        this.activeMs =
        this.actions =
        this.undos =
          0;
      this.reportedMs = this.reportedActions = this.reportedUndos = 0;
      this.engaged = this.firstAction = false;
      return;
    }
    if (!this.wasCollecting) {
      this.wasCollecting = true;
      // This game began before collection was permitted. Reserve its identity
      // without inventing a start, action or complete first-game funnel later.
      if (this.state)
        this.analytics.firstGame(this.state.sessionId, true, false);
      this.loadCounts();
      return;
    }
    const day = utcDay(this.now());
    if (this.day !== day) {
      this.flush();
      this.day = day;
      this.dailyMs = this.dailyActions = 0;
      this.engaged = false;
      this.analytics.activeDay();
    }
    if (
      this.foreground &&
      this.interactive &&
      this.state?.status === 'active' &&
      delta <= 15000
    ) {
      this.activeMs += delta;
      this.dailyMs += delta;
    }
    this.checkEngaged();
    if (current - this.lastSummary >= 60000) this.flush();
  }

  private checkEngaged(): void {
    if (
      this.engaged ||
      !this.state ||
      !this.analytics.collecting ||
      this.dailyMs < 60000 ||
      this.dailyActions === 0
    )
      return;
    this.engaged = true;
    const parameters = { difficulty: this.state.difficultyLevel };
    this.analytics.track('game_engaged', parameters);
    if (this.analytics.firstGame(this.state.sessionId, false))
      this.analytics.milestone('engaged', parameters);
  }

  private reportedMs = 0;
  private reportedActions = 0;
  private reportedUndos = 0;
  private flush(): void {
    if (
      this.state &&
      this.analytics.collecting &&
      (this.activeMs > this.reportedMs || this.actions > this.reportedActions)
    ) {
      this.analytics.track('game_activity_summary', {
        difficulty: this.state.difficultyLevel,
        elapsed_ms: this.activeMs - this.reportedMs,
        actions: this.actions - this.reportedActions,
        undos: this.undos - this.reportedUndos,
      });
    }
    this.reportedMs = this.activeMs;
    this.reportedActions = this.actions;
    this.reportedUndos = this.undos;
    this.lastSummary = this.monotonic();
    if (this.state)
      this.analytics.saveActivity({
        sessionId: this.state.sessionId,
        day: this.day,
        activeMs: this.activeMs,
        actions: this.actions,
        undos: this.undos,
        dailyMs: this.dailyMs,
        dailyActions: this.dailyActions,
        engaged: this.engaged,
        firstAction: this.firstAction,
        autoFinished: this.autoFinished,
      });
  }
  private loadCounts(): void {
    const saved = this.analytics.activity;
    if (!saved) return;
    if (saved.day === utcDay(this.now())) {
      this.dailyMs = saved.dailyMs;
      this.dailyActions = saved.dailyActions;
      this.engaged = saved.engaged;
    }
    if (saved.sessionId !== this.state?.sessionId) return;
    this.activeMs = this.reportedMs = saved.activeMs;
    this.actions = this.reportedActions = saved.actions;
    this.undos = this.reportedUndos = saved.undos;
    this.firstAction = saved.firstAction;
    this.autoFinished = saved.autoFinished;
  }
  private reset(state: GameState): void {
    this.state = state;
    this.wasCollecting = this.analytics.collecting;
    this.lastTick = this.monotonic();
    this.day = utcDay(this.now());
    this.activeMs = this.actions = this.undos = 0;
    this.reportedMs = this.reportedActions = this.reportedUndos = 0;
    this.firstAction = this.autoFinished = false;
    this.interactive = true;
    this.loadCounts();
  }
  close(): void {
    this.checkpoint();
    this.flush();
    clearInterval(this.interval);
    this.state = null;
  }
}
