jest.mock('../src/data/sqlite/nitro-database', () => ({
  NitroSqliteDatabase: { open: jest.fn() },
}));
jest.mock('../src/native/NativeProductTelemetry', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(async () => true),
    logEvent: jest.fn(),
    recordError: jest.fn(),
  },
}));

import { writeFileSync } from 'node:fs';
import { CommercialController, NoopAdGateway } from '../src/application';
import type { VerifiedTransaction } from '../src/application/commercial/contracts';
import { activateAnalytics } from '../src/application/analytics/contracts';
import { AnalyticsService } from '../src/application/analytics/service';
import { nativeAnalyticsGateway } from '../src/infrastructure/analytics/native-analytics-gateway';
import { NativePurchaseGateway } from '../src/infrastructure/purchases';
import NativeProductTelemetry from '../src/native/NativeProductTelemetry';
import { UserRepository } from '../src/data/user/user-repository';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import { NodeSqliteDatabase } from './helpers/node-sqlite';

function verifiedPurchase(
  isNewAcquisition: boolean | undefined = true,
): VerifiedTransaction {
  return {
    productId: 'premium',
    platform: 'android',
    transactionId: 'private-transaction',
    completionCredential: 'secret-token',
    originalTransactionId: null,
    purchasedAtEpochMs: 100,
    verifiedAtEpochMs: 200,
    status: 'active',
    verification: 'platform_verified',
    isNewAcquisition,
  };
}

function nativeStore() {
  return {
    initialize: jest.fn(async () => undefined),
    getPremiumProduct: jest.fn(async () =>
      JSON.stringify({
        id: 'premium',
        title: 'Premium',
        description: 'Lifetime Premium',
        displayPrice: '$13.99',
      }),
    ),
    purchasePremium: jest.fn(async () =>
      JSON.stringify({ status: 'purchased', transaction: verifiedPurchase() }),
    ),
    restorePremium: jest.fn(async () =>
      JSON.stringify({
        status: 'restored',
        transactions: [verifiedPurchase()],
      }),
    ),
    refreshPremiumEntitlement: jest.fn(async () =>
      JSON.stringify({ status: 'unavailable', reason: 'offline' }),
    ),
    drainTransactionUpdates: jest.fn(async () => '[]'),
    finishTransaction: jest.fn(async (_credential: string) => undefined),
    close: jest.fn(),
  };
}

async function setup() {
  const database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, 1);
  const store = new UserRepository(database);
  const analytics = new AnalyticsService(
    nativeAnalyticsGateway,
    store,
    'development',
  );
  await analytics.initialize(false);
  analytics.configure(true, false);
  await analytics.settled();
  const deactivate = activateAnalytics(analytics);
  const native = nativeStore();
  const createController = async () => {
    const controller = new CommercialController(
      new NoopAdGateway(),
      new NativePurchaseGateway(native),
      store,
    );
    await controller.initialize();
    await controller.refreshEntitlements();
    return controller;
  };
  const controller = await createController();
  return {
    database,
    store,
    native,
    controller,
    createController,
    close() {
      controller.close();
      deactivate();
      analytics.close();
      database.close();
    },
  };
}

function events() {
  return jest
    .mocked(NativeProductTelemetry!)
    .logEvent.mock.calls.map(([name, json]) => ({
      name,
      parameters: JSON.parse(json),
    }));
}
function acquisitions() {
  return events().filter(
    event =>
      event.name === 'entitlement_changed' &&
      event.parameters.new_acquisition === 1,
  );
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

test('direct verified checkout counts once through native analytics; restore and restart never count again', async () => {
  const state = await setup();
  let restarted: CommercialController | undefined;
  try {
    await expect(state.controller.purchasePremium()).resolves.toMatchObject({
      status: 'purchased',
    });
    expect(state.controller.snapshot.entitlement.status).toBe('premium');
    // Direct checkout retains its existing success UI, without the external UI.
    expect(state.controller.snapshot.premiumUnlockEventId).toBeUndefined();
    expect(acquisitions()).toHaveLength(1);
    expect(acquisitions()[0].parameters).toMatchObject({
      entitlement: 'premium',
      entitlement_source: 'store_verified',
      previous_entitlement: 'free',
      build_environment: 'development',
    });

    // Exercise a stale unacknowledged replay too, rather than relying only on
    // the platform clearing isNewAcquisition after acknowledgement.
    state.native.refreshPremiumEntitlement.mockResolvedValue(
      JSON.stringify({
        status: 'verified',
        transactions: [verifiedPurchase()],
      }),
    );
    await state.controller.refreshEntitlements();
    await state.controller.restorePremium();
    state.controller.close();
    restarted = await state.createController();
    await restarted.refreshEntitlements();
    expect(restarted.snapshot.entitlement.status).toBe('premium');
    expect(acquisitions()).toHaveLength(1);
    expect(events()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'purchase_result',
          parameters: expect.objectContaining({ result: 'purchased' }),
        }),
        expect.objectContaining({
          name: 'restore_result',
          parameters: expect.objectContaining({ result: 'restored' }),
        }),
      ]),
    );
    expect(JSON.stringify(events())).not.toMatch(/private-|secret-token/);
    if (process.env.HSP_BILLING_PROBE_OUTPUT)
      writeFileSync(
        process.env.HSP_BILLING_PROBE_OUTPUT,
        JSON.stringify(events()),
      );
  } finally {
    restarted?.close();
    state.close();
  }
});

test.each([false, undefined])(
  'already owned or unmarked direct response is not a new acquisition: %s',
  async flag => {
    const state = await setup();
    try {
      const transaction = verifiedPurchase();
      transaction.isNewAcquisition = flag;
      state.native.purchasePremium.mockResolvedValue(
        JSON.stringify({ status: 'purchased', transaction }),
      );
      await state.controller.purchasePremium();
      expect(state.controller.snapshot.entitlement.status).toBe('premium');
      expect(acquisitions()).toEqual([]);
    } finally {
      state.close();
    }
  },
);

test('restore alone never converts an existing purchase into new acquisition', async () => {
  const state = await setup();
  try {
    await state.controller.restorePremium();
    expect(state.controller.snapshot.entitlement.status).toBe('premium');
    expect(acquisitions()).toEqual([]);
  } finally {
    state.close();
  }
});

test('persistence failure does not count or acknowledge; retry counts once', async () => {
  const state = await setup();
  try {
    jest
      .spyOn(state.store, 'upsertEntitlement')
      .mockRejectedValueOnce(new Error('save failed'));
    await expect(state.controller.purchasePremium()).rejects.toThrow(
      'save failed',
    );
    expect(acquisitions()).toEqual([]);
    expect(state.native.finishTransaction).not.toHaveBeenCalled();
    await state.controller.purchasePremium();
    await state.controller.purchasePremium();
    expect(acquisitions()).toHaveLength(1);
  } finally {
    state.close();
  }
});

test('acknowledgement failure after persistence cannot double-count after retry or restart', async () => {
  const state = await setup();
  let restarted: CommercialController | undefined;
  try {
    state.native.finishTransaction.mockRejectedValueOnce(new Error('offline'));
    await expect(state.controller.purchasePremium()).rejects.toThrow('offline');
    expect(acquisitions()).toHaveLength(1);
    state.controller.close();
    restarted = await state.createController();
    await restarted.purchasePremium();
    expect(acquisitions()).toHaveLength(1);
    expect(restarted.snapshot.entitlement.status).toBe('premium');
  } finally {
    restarted?.close();
    state.close();
  }
});
