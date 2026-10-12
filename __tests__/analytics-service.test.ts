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
    product_details_support: 'supported',
    play_store_version: '85343440',
    play_services_version: '263332035',
    test_environment: 'test_lab',
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
      product_details_support: 'supported',
      play_store_version: '85343440',
      play_services_version: '263332035',
      test_environment: 'test_lab',
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
  ).toEqual({ difficulty: 'level_2' });
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
    expect.objectContaining({ difficulty: 'level_2' }),
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

test.each([1, 2, 3, 4, 5])(
  'serializes difficulty %i as a GA4 app dimension without changing metrics',
  level => {
    const encoded = sanitizeParameters({
      difficulty: level,
      first_game: 1,
      actions: 2,
      elapsed_ms: 60000,
    });
    expect(encoded).toEqual({
      difficulty: `level_${level}`,
      first_game: 'yes',
      actions: 2,
      elapsed_ms: 60000,
    });
    expect(sanitizeParameters(encoded)).toEqual(encoded);
    expect(
      sanitizeParameters({ difficulty: `level_${level}`, first_game: 0 }),
    ).toEqual({ difficulty: `level_${level}`, first_game: 'no' });
  },
);

test.each([0, 6, 1.5, NaN, '3', 'hard', 'level_6'])(
  'rejects invalid difficulty category %s',
  difficulty => {
    expect(sanitizeParameters({ difficulty, first_game: 2 })).toEqual({});
  },
);

test.each(['unavailable', 'throw', 'revoked', 'closed', 'overflow'])(
  'discards permitted startup events when configuration is %s',
  async outcome => {
    const { service, gateway } = setup();
    await service.initialize(false);
    let resolve!: (value: boolean) => void;
    let reject!: (reason: Error) => void;
    gateway.configure.mockImplementationOnce(
      () =>
        new Promise((yes, no) => {
          resolve = yes;
          reject = no;
        }),
    );
    service.configure(true, false);
    service.firstGame('pending-game');
    service.track('game_started', { difficulty: 3, first_game: 1 });
    await Promise.resolve();
    expect(gateway.logEvent).not.toHaveBeenCalled();
    if (outcome === 'revoked') service.configure(false, false);
    if (outcome === 'closed') service.close();
    if (outcome === 'overflow')
      for (let i = 0; i < 65; i++)
        service.track('hint_requested', { difficulty: 3 });
    if (outcome === 'throw') reject(new Error('unavailable'));
    else resolve(outcome !== 'unavailable');
    await service.settled();
    expect(gateway.logEvent.mock.calls.map(call => call[0])).not.toContain(
      'game_started',
    );
    expect(service.firstGame('pending-game', false)).toBe(false);
    service.close();
  },
);

test('configuration may finish before local cohort initialization without emitting an unknown/new cohort', async () => {
  const { service, gateway } = setup();
  service.configure(true, false);
  service.track('game_started', { difficulty: 3, first_game: 1 });
  await service.settled();
  expect(gateway.logEvent).not.toHaveBeenCalled();
  await service.initialize(false);
  expect(gateway.logEvent.mock.calls.map(call => call[0])).toEqual([
    'app_active_day',
  ]);
  expect(gateway.logEvent.mock.lastCall?.[1]).toMatchObject({
    observation: 'new',
  });
  service.close();
});

test('a restart cannot treat an unsent in-memory start as an observed first game', async () => {
  const { service, gateway, store } = setup();
  await service.initialize(false);
  let release!: (ready: boolean) => void;
  gateway.configure.mockImplementationOnce(
    () =>
      new Promise(resolve => {
        release = resolve;
      }),
  );
  service.configure(true, false);
  service.firstGame('pending-session');
  service.track('game_started', { difficulty: 3, first_game: 1 });
  await Promise.resolve();
  // Snapshot durable state before SDK setup or close(), as after process death.
  let durable: { firstGame: string; firstGameObserved: boolean } | null = null;
  for (let i = 0; i < 20; i++) {
    durable = await store.getSetting('product_analytics');
    if (durable?.firstGame === 'pending-session') break;
  }
  expect(durable).toMatchObject({
    firstGame: 'pending-session',
    firstGameObserved: false,
  });
  const next = new AnalyticsService(
    gateway,
    {
      async getSetting<T>() {
        return durable as T;
      },
      async setSetting() {},
    },
    'production',
  );
  await next.initialize(true);
  next.configure(true, false);
  await next.settled();
  expect(next.firstGame('pending-session', false)).toBe(false);
  next.endGame('pending-session', { result: 'completed' });
  expect(gateway.logEvent.mock.calls.map(call => call[0])).not.toContain(
    'first_game_completed',
  );
  release(true);
  await service.settled();
  service.close();
  next.close();
});
