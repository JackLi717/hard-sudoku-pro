import { AnalyticsService } from '../src/application/analytics/service';
import { sanitizeParameters } from '../src/application/analytics/contracts';
import { sanitizedFrames } from '../src/application/analytics/javascript-errors';

function setup() {
  let time = Date.UTC(2026, 9, 8, 12);
  const settings = new Map<string, unknown>();
  const gateway = {
    configure: jest.fn(async () => true),
    logEvent: jest.fn(),
    recordError: jest.fn(),
  };
  const store = {
    async getSetting<T>(key: string) {
      return (settings.get(key) as T | undefined) ?? null;
    },
    async setSetting<T>(key: string, value: T) {
      settings.set(key, value);
    },
  };
  const service = new AnalyticsService(
    gateway,
    store,
    'production',
    () => time,
  );
  return {
    service,
    gateway,
    store,
    advance: (days: number) => {
      time += days * 86400000;
    },
  };
}

test('drops events before consent, never replays them, and honors independent diagnosis', async () => {
  const { service, gateway } = setup();
  await service.initialize(false);
  service.track('game_started');
  service.configure(false, true);
  await service.settled();
  service.failure('hint_engine');
  expect(gateway.logEvent).not.toHaveBeenCalled();
  expect(gateway.recordError).toHaveBeenCalledWith('hint_engine', false, '');
  service.configure(true, false);
  await service.settled();
  expect(gateway.logEvent.mock.calls.map(call => call[0])).toEqual([
    'app_active_day',
  ]);
  service.track('game_started', { difficulty: 2 });
  service.configure(false, false);
  service.track('game_ended');
  await service.settled();
  expect(gateway.logEvent.mock.calls.map(call => call[0])).toEqual([
    'app_active_day',
    'game_started',
  ]);
});

test('sends product diagnostics with build environment, filters private fields and honors permission', async () => {
  const { service, gateway } = setup();
  await service.initialize(false);
  service.configure(false, true);
  await service.settled();
  service.failure('product_load', false, '[]', {
    stage: 'query_product',
    billing_response: '-1',
    error_code: 'billing_-1',
    token: 'secret',
  });
  expect(gateway.recordError).toHaveBeenCalledWith(
    'product_load',
    false,
    '[]',
    {
      stage: 'query_product',
      billing_response: '-1',
      error_code: 'billing_-1',
      build_environment: 'production',
    },
  );
  expect(gateway.logEvent).not.toHaveBeenCalled();
  service.configure(true, false);
  await service.settled();
  service.failure('other_product_load', false, '[]', { stage: 'connect' });
  expect(gateway.recordError).toHaveBeenCalledTimes(1);
});

test('deduplicates terminal outcomes and milestones across restarts', async () => {
  const { service, gateway, store } = setup();
  await service.initialize(false);
  service.configure(true, false);
  await service.settled();
  service.firstGame('local-only');
  service.endGame('local-only', { result: 'completed' });
  service.endGame('local-only', { result: 'completed' });
  await service.settled();
  service.close();
  const next = new AnalyticsService(gateway, store, 'production', () =>
    Date.UTC(2026, 9, 8, 12),
  );
  await next.initialize(true);
  next.configure(true, false);
  await next.settled();
  next.endGame('local-only', { result: 'completed' });
  expect(
    gateway.logEvent.mock.calls.filter(call => call[0] === 'game_ended'),
  ).toHaveLength(1);
  expect(
    gateway.logEvent.mock.calls.filter(
      call => call[0] === 'first_game_completed',
    ),
  ).toHaveLength(1);
  expect(JSON.stringify(gateway.logEvent.mock.calls)).not.toContain(
    'local-only',
  );
});

test('UTC day milestones include exact D1 D7 D30 and reset opt-in is existing', async () => {
  const { service, gateway, advance } = setup();
  await service.initialize(false);
  service.configure(true, false);
  await service.settled();
  service.activeDay();
  advance(1);
  service.activeDay();
  advance(6);
  service.activeDay();
  advance(23);
  service.activeDay();
  expect(gateway.logEvent.mock.calls.map(call => call[1].install_age)).toEqual([
    '0',
    '1',
    '7',
    '30',
  ]);
  service.configure(false, false);
  await service.settled();
  service.configure(true, false);
  await service.settled();
  expect(gateway.logEvent.mock.lastCall?.[1]).toMatchObject({
    observation: 'existing',
    install_age: 'unknown',
  });
});

test('newer consent overrides an in-flight native configuration', async () => {
  const { service, gateway } = setup();
  await service.initialize(false);
  let release!: (value: boolean) => void;
  gateway.configure.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        release = resolve;
      }),
  );
  service.configure(true, true);
  await Promise.resolve();
  service.configure(false, false);
  release(true);
  await service.settled();
  expect(service.collecting).toBe(false);
  expect(gateway.logEvent).not.toHaveBeenCalled();
});

test('parameter and JS stack filters exclude prohibited content', () => {
  expect(
    sanitizeParameters({
      board: '123456789',
      session_id: 'secret',
      reason: 'mail@example.com',
      difficulty: 2,
      elapsed_ms: Infinity,
    }),
  ).toEqual({ difficulty: 2 });
  expect(
    sanitizedFrames(
      'secret@email.com\n at private (/Users/person/private.ts:55:20)\n at fn (index.android.bundle:1:234)',
    ),
  ).toBe('[{"line":1,"column":234}]');
});

test('corrupt optional measurement state cannot break gameplay or produce invalid cohorts', async () => {
  const { service, store, gateway } = setup();
  await store.setSetting('product_analytics', {
    ended: [123, 'local-only'],
    firstObservedDay: 'broken',
    observation: 'broken',
    activity: { activeMs: -5 },
  });
  await service.initialize(true);
  service.configure(true, false);
  await service.settled();
  expect(service.activity).toBeUndefined();
  expect(gateway.logEvent.mock.lastCall?.[1]).toMatchObject({
    observation: 'existing',
    install_age: 'unknown',
  });
});

test('retains only current screen across configuration and limits repeated failures', async () => {
  const { service, gateway } = setup();
  await service.initialize(false);
  service.screenView('home');
  service.screenView('settings');
  service.configure(true, true);
  await service.settled();
  service.screenView('settings');
  service.failure('save_game');
  service.failure('save_game');
  expect(
    gateway.logEvent.mock.calls.filter(call => call[0] === 'screen_view'),
  ).toEqual([
    ['screen_view', expect.objectContaining({ screen_name: 'settings' })],
  ]);
  expect(gateway.recordError).toHaveBeenCalledTimes(1);
});

test('unknown event names and sensitive payload fields never reach the provider', async () => {
  const { service, gateway } = setup();
  await service.initialize(false);
  service.configure(true, true);
  await service.settled();
  gateway.logEvent.mockClear();
  service.track('user_private_name' as 'app_ready', { difficulty: 2 });
  expect(gateway.logEvent).not.toHaveBeenCalled();
  service.track('game_started', {
    difficulty: 2,
    name: 'Person',
    email: 'person@example.com',
    phone: '0412345678',
    contacts: 'private',
    latitude: 123,
    receipt: 'secret',
    board: '123456789',
    password: 'secret',
    reason: 'person@example.com',
  });
  expect(gateway.logEvent).toHaveBeenCalledWith(
    'game_started',
    expect.objectContaining({ difficulty: 2 }),
  );
  const parameters = gateway.logEvent.mock.calls[0][1];
  for (const key of [
    'name',
    'email',
    'phone',
    'contacts',
    'latitude',
    'receipt',
    'board',
    'password',
    'reason',
  ]) {
    expect(parameters).not.toHaveProperty(key);
  }
});
