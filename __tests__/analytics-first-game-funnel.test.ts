import { writeFileSync } from 'node:fs';
import NativeProductTelemetry from '../src/native/NativeProductTelemetry';
import { nativeAnalyticsGateway } from '../src/infrastructure/analytics/native-analytics-gateway';
import { AnalyticsService } from '../src/application/analytics/service';
import { GameAnalyticsObserver } from '../src/application/analytics/game-observer';
import {
  createGameSession,
  dispatchGameCommand,
} from '../src/domain/game/engine';
import type { GameCommand } from '../src/domain/game/contracts';
import type { Digit } from '../src/domain/sudoku/contracts';

jest.mock('../src/native/NativeProductTelemetry', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    logEvent: jest.fn(),
    recordError: jest.fn(),
  },
}));

const definition = {
  puzzleId: 'local-funnel-puzzle',
  contentVersion: 4,
  difficultyLevel: 3 as const,
  difficultyScore: 6000,
  puzzleFingerprint:
    '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  solutionFingerprint:
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
};
const steps = [
  'game_started',
  'game_first_action',
  'first_game_engaged',
  'first_game_completed',
];

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

test.each(['ready', 'pending', 'before_permission', 'restored', 'existing'])(
  'complete first-game observation: %s',
  async phase => {
    let now = Date.UTC(2026, 9, 12, 0);
    let clock = 0;
    const saved = new Map<string, unknown>();
    const store = {
      async getSetting<T>(key: string) {
        return (saved.get(key) as T) ?? null;
      },
      async setSetting<T>(key: string, value: T) {
        saved.set(key, value);
      },
    };
    let release!: (ready: boolean) => void;
    const analytics = new AnalyticsService(
      {
        ...nativeAnalyticsGateway,
        configure: () =>
          new Promise<boolean>(resolve => {
            release = resolve;
          }),
      },
      store,
      'development',
      () => now,
    );
    await analytics.initialize(phase === 'existing');
    if (phase !== 'before_permission') {
      analytics.configure(true, false);
      await Promise.resolve();
      if (phase !== 'pending') {
        release(true);
        await analytics.settled();
      }
    }
    let session = createGameSession({
      sessionId: 'local-funnel-session',
      definition,
      startedAtEpochMs: now,
    });
    const observer = new GameAnalyticsObserver(
      analytics,
      () => now,
      () => clock,
    );
    if (phase === 'restored') observer.restore(session);
    else observer.attach(session);
    const command = (input: GameCommand) => {
      const result = dispatchGameCommand(session, definition, input);
      expect(result.accepted).toBe(true);
      observer.observeAcceptedCommand(session, input, result);
      session = result.session;
    };
    command({ type: 'select_cell', cell: 2, atEpochMs: now });
    command({
      type: 'input_digit',
      digit: 4,
      moveId: 'local-first-move',
      atEpochMs: now,
    });
    if (phase === 'before_permission') {
      analytics.configure(true, false);
      await Promise.resolve();
      release(true);
      await analytics.settled();
      observer.checkpoint();
    }
    for (let i = 0; i < 60; i++) {
      now += 1000;
      clock += 1000;
      observer.checkpoint();
    }
    for (let cell = 3; cell < 81; cell++) {
      if (definition.puzzleFingerprint[cell] !== '0') continue;
      command({ type: 'select_cell', cell, atEpochMs: now });
      command({
        type: 'input_digit',
        digit: Number(definition.solutionFingerprint[cell]) as Digit,
        moveId: `local-move-${cell}`,
        atEpochMs: now,
      });
    }
    expect(session.state.status).toBe('completed');
    if (phase === 'pending') {
      expect(NativeProductTelemetry!.logEvent).not.toHaveBeenCalled();
      release(true);
    }
    await analytics.settled();
    const native = jest.mocked(NativeProductTelemetry!);
    const events = native.logEvent.mock.calls.map(([name, json]) => ({
      name,
      parameters: JSON.parse(json),
    }));
    const funnel = events.filter(
      event =>
        steps.includes(event.name) && event.parameters.first_game === 'yes',
    );
    if (phase === 'before_permission' || phase === 'restored') {
      expect(funnel).toEqual([]);
      // The next game must not impersonate the unobserved first game either.
      observer.attach(
        createGameSession({
          sessionId: 'local-next-session',
          definition,
          startedAtEpochMs: now,
        }),
      );
      expect(JSON.parse(native.logEvent.mock.lastCall![1])).toMatchObject({
        first_game: 'no',
      });
    } else {
      expect(funnel.map(event => event.name)).toEqual(steps);
      for (const event of funnel)
        expect(event.parameters).toMatchObject({
          difficulty: 'level_3',
          first_game: 'yes',
          observation: phase === 'existing' ? 'existing' : 'new',
          build_environment: 'development',
        });
      expect(
        events.find(event => event.name === 'game_ended')?.parameters,
      ).toMatchObject({ result: 'completed', actions: 51, hints: 0, undos: 0 });
      expect(
        events
          .filter(event => event.name === 'game_activity_summary')
          .reduce((ms, event) => ms + event.parameters.elapsed_ms, 0),
      ).toBe(60000);
      if (phase === 'pending' && process.env.HSP_ANALYTICS_PROBE_OUTPUT)
        writeFileSync(
          process.env.HSP_ANALYTICS_PROBE_OUTPUT,
          JSON.stringify(events),
        );
    }
    expect(JSON.stringify(events)).not.toContain('local-funnel');
    observer.close();
    analytics.close();
    await analytics.settled();
  },
);
