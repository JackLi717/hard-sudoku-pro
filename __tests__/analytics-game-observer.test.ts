import { GameAnalyticsObserver } from '../src/application/analytics/game-observer';
import { AnalyticsService } from '../src/application/analytics/service';
import {
  createGameSession,
  dispatchGameCommand,
} from '../src/domain/game/engine';
import type { GameCommand } from '../src/domain/game/contracts';
const definition = {
  puzzleId: 'local-puzzle',
  contentVersion: 4,
  difficultyLevel: 3 as const,
  difficultyScore: 6000,
  puzzleFingerprint:
    '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  solutionFingerprint:
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
};

test('effective play excludes background and automatic animation, persists counts and UTC daily milestone', async () => {
  jest.useFakeTimers();
  let now = Date.UTC(2026, 9, 8, 12);
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
  const gateway = {
    configure: jest.fn(async () => true),
    logEvent: jest.fn(),
    recordError: jest.fn(),
  };
  const analytics = new AnalyticsService(
    gateway,
    store,
    'development',
    () => now,
  );
  await analytics.initialize(false);
  analytics.configure(true, false);
  await analytics.settled();
  let session = createGameSession({
    sessionId: 'local-session',
    definition,
    startedAtEpochMs: now,
  });
  let observer = new GameAnalyticsObserver(
    analytics,
    () => now,
    () => clock,
  );
  observer.attach(session);
  const command = (input: GameCommand) => {
    const result = dispatchGameCommand(session, definition, input);
    expect(result.accepted).toBe(true);
    observer.observeAcceptedCommand(session, input, result);
    session = result.session;
  };
  const tick = (seconds: number) => {
    for (let i = 0; i < seconds; i++) {
      clock += 1000;
      now += 1000;
      observer.checkpoint();
    }
  };
  observer.checkpoint();
  command({ type: 'select_cell', cell: 2, atEpochMs: now });
  command({
    type: 'input_digit',
    digit: 4,
    moveId: 'local-move',
    atEpochMs: now,
  });
  tick(30);
  observer.setForeground(false);
  tick(300);
  observer.setForeground(true);
  observer.setInteractive(false);
  tick(300);
  observer.setInteractive(true);
  tick(30);
  expect(
    gateway.logEvent.mock.calls.filter(call => call[0] === 'game_engaged'),
  ).toHaveLength(1);
  observer.close();
  await analytics.settled();
  const total = () =>
    gateway.logEvent.mock.calls
      .filter(call => call[0] === 'game_activity_summary')
      .reduce((sum, call) => sum + Number(call[1].elapsed_ms), 0);
  expect(total()).toBe(60000);
  observer = new GameAnalyticsObserver(
    analytics,
    () => now,
    () => clock,
  );
  observer.restore(session);
  tick(5);
  observer.setForeground(false);
  expect(total()).toBe(65000);
  expect(
    gateway.logEvent.mock.calls.filter(call => call[0] === 'game_engaged'),
  ).toHaveLength(1);
  now = Date.UTC(2026, 9, 9, 12);
  observer.setForeground(true);
  tick(60);
  expect(
    gateway.logEvent.mock.calls.filter(call => call[0] === 'game_engaged'),
  ).toHaveLength(1);
  command({ type: 'select_cell', cell: 3, atEpochMs: now });
  command({
    type: 'input_digit',
    digit: 6,
    moveId: 'local-next',
    atEpochMs: now,
  });
  expect(
    gateway.logEvent.mock.calls.filter(call => call[0] === 'game_engaged'),
  ).toHaveLength(2);
  expect(JSON.stringify(gateway.logEvent.mock.calls)).not.toContain(
    'local-session',
  );
  observer.close();
  analytics.close();
  jest.useRealTimers();
});
