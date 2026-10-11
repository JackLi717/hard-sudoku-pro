jest.mock('../src/data/sqlite/nitro-database', () => ({
  NitroSqliteDatabase: { open: jest.fn() },
}));

import {
  AdAvailability,
  AdFormat,
  AdGateway,
  AdPlacement,
  AdShowResult,
  CommercialController,
  EntitlementRefreshResult,
  NoopAdGateway,
  NoopPurchaseGateway,
  PREMIUM_PRODUCT_ID,
  ProductId,
  PurchaseGateway,
  PurchaseResult,
  REVIEWER_ACCESS_EXPIRES_AT_EPOCH_MS,
  RestoreResult,
  RewardedAdReward,
  StoreProduct,
  VerifiedTransaction,
  rewardedAdPolicy,
} from '../src/application';
import { UserRepository } from '../src/data/user/user-repository';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import { NodeSqliteDatabase } from './helpers/node-sqlite';
import { productAnalytics } from '../src/application/analytics/contracts';

class FakeAds implements AdGateway {
  initialization: Promise<void> = Promise.resolve();
  availability: AdAvailability = { status: 'available' };
  rewardedResult: AdShowResult = {
    status: 'rewarded',
    rewardEventId: 'reward-1',
  };
  rewardedOperation: Promise<AdShowResult> | null = null;
  rewardedRequests: Array<{
    placement: AdPlacement;
    reward: RewardedAdReward;
    requestId: string;
  }> = [];

  async initialize(): Promise<void> {
    return this.initialization;
  }

  async isPrivacyOptionsRequired(): Promise<boolean> {
    return false;
  }

  async showPrivacyOptions(): Promise<boolean> {
    return false;
  }

  async getAvailability(
    _format: AdFormat,
    _placement: AdPlacement,
  ): Promise<AdAvailability> {
    return this.availability;
  }

  async preload(_format: AdFormat, _placement: AdPlacement): Promise<void> {}

  async showRewarded(
    placement: AdPlacement,
    reward: RewardedAdReward,
    requestId: string,
  ): Promise<AdShowResult> {
    this.rewardedRequests.push({ placement, reward, requestId });
    return this.rewardedOperation ?? this.rewardedResult;
  }

  close(): void {}
}

class FakePurchases implements PurchaseGateway {
  initialization: Promise<void> = Promise.resolve();
  purchaseResult: PurchaseResult = {
    status: 'unavailable',
    reason: 'not_configured',
  };
  restoreResult: RestoreResult = { status: 'nothing_to_restore' };
  refreshResult: EntitlementRefreshResult = {
    status: 'unavailable',
    reason: 'offline',
  };
  finished: string[] = [];
  listener: ((transaction: VerifiedTransaction) => void) | null = null;
  beforeFinish: (() => Promise<void>) | null = null;

  async initialize(): Promise<void> {
    return this.initialization;
  }

  async getProducts(
    _ids: readonly ProductId[],
  ): Promise<readonly StoreProduct[]> {
    return [];
  }

  async purchase(_productId: ProductId): Promise<PurchaseResult> {
    return this.purchaseResult;
  }

  async restorePurchases(): Promise<RestoreResult> {
    return this.restoreResult;
  }

  async refreshEntitlements(): Promise<EntitlementRefreshResult> {
    return this.refreshResult;
  }

  subscribeToTransactions(
    listener: (transaction: VerifiedTransaction) => void,
  ): () => void {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  async finishTransaction(completionCredential: string): Promise<void> {
    await this.beforeFinish?.();
    this.finished.push(completionCredential);
  }

  close(): void {}
}

function transaction(
  overrides: Partial<VerifiedTransaction> = {},
): VerifiedTransaction {
  return {
    productId: PREMIUM_PRODUCT_ID,
    platform: 'ios',
    transactionId: 'transaction-1',
    completionCredential: 'finish-transaction-1',
    originalTransactionId: 'original-1',
    purchasedAtEpochMs: 500,
    verifiedAtEpochMs: 600,
    status: 'active',
    verification: 'platform_verified',
    ...overrides,
  };
}

async function setup(
  ads = new FakeAds(),
  purchases = new FakePurchases(),
  closedBetaTest = false,
) {
  const database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, 1);
  const store = new UserRepository(database, closedBetaTest);
  await store.initializeTestHintAllowance();
  let id = 0;
  const playback = {
    starts: 0,
    ends: 0,
    onPlaybackStart() {
      this.starts += 1;
    },
    onPlaybackEnd() {
      this.ends += 1;
    },
  };
  const controller = new CommercialController(
    ads,
    purchases,
    store,
    playback,
    () => 1000,
    () => `request-${++id}`,
  );
  await controller.initialize();
  return { ads, controller, database, playback, purchases, store };
}

test('analytics distinguishes a business ad rejection from an SDK reward', async () => {
  const { controller, database, ads } = await setup();
  await database.run(
    "UPDATE credit_wallet SET balance = 99 WHERE resource = 'smart_hint'",
  );
  const track = jest.spyOn(productAnalytics, 'track');
  try {
    // A full wallet rejects the request before the SDK is called.
    const result = await controller.redeemRewardedAd(
      'smart_hint',
      'home_credit_store',
    );
    expect(result.status).toBe('unavailable');
    expect(ads.rewardedRequests).toHaveLength(0);
    expect(track).toHaveBeenCalledWith(
      'rewarded_ad_result',
      expect.objectContaining({
        stage: 'business',
        result: 'unavailable',
        entry: 'home_credit_store',
      }),
    );
    expect(track.mock.calls.some(([event]) => event === 'reward_granted')).toBe(
      false,
    );
  } finally {
    track.mockRestore();
    controller.close();
    database.close();
  }
});

test('practice reward analytics records only the remaining exercises', async () => {
  const database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, 1);
  const store = new UserRepository(database);
  const controller = new CommercialController(
    new FakeAds(),
    new FakePurchases(),
    store,
    undefined,
    () => 1000,
    undefined,
    store.practiceAccess,
  );
  await controller.initialize();
  const track = jest.spyOn(productAnalytics, 'track');
  try {
    await controller.redeemPracticeAd('swordfish', 7);
    expect(track).toHaveBeenCalledWith('reward_granted', {
      reward_source: 'practice_ad',
      requested: 5,
      credited: 2,
    });
  } finally {
    track.mockRestore();
    controller.close();
    database.close();
  }
});

test('product loading failure reports a fixed classification and preserves the error', async () => {
  const { controller, database, purchases } = await setup();
  const track = jest.spyOn(productAnalytics, 'track');
  const failure = jest.spyOn(productAnalytics, 'failure');
  const error = new Error('private platform detail');
  jest.spyOn(purchases, 'getProducts').mockRejectedValue(error);
  try {
    await expect(controller.loadPremiumProduct()).rejects.toBe(error);
    expect(track).toHaveBeenCalledWith('product_load_result', {
      product: 'lifetime_premium',
      entry: 'premium_page',
      stage: 'unknown',
      reason: 'unexpected',
      attempts: 1,
      error_code: 'unknown',
      result: 'failed',
      duration_bucket: expect.any(String),
    });
    expect(failure).toHaveBeenCalledWith(
      'product_load',
      false,
      '[]',
      expect.objectContaining({
        entry: 'premium_page',
        error_code: 'unknown',
      }),
    );
    expect(JSON.stringify(track.mock.calls)).not.toContain(error.message);
  } finally {
    track.mockRestore();
    failure.mockRestore();
    controller.close();
    database.close();
  }
});

test('startup connection failures are diagnosed without blocking the offline game', async () => {
  const purchases = new FakePurchases();
  jest.spyOn(purchases, 'initialize').mockRejectedValue(
    Object.assign(new Error('private platform detail'), {
      code: 'billing_12',
      userInfo: { stage: 'connect', billingResponse: 12 },
    }),
  );
  let report!: () => void;
  const reported = new Promise<void>(resolve => {
    report = resolve;
  });
  const failure = jest
    .spyOn(productAnalytics, 'failure')
    .mockImplementation(() => report());
  const { controller, database } = await setup(new FakeAds(), purchases);
  try {
    await reported;
    expect(controller.snapshot.wallet).not.toBeNull();
    expect(failure).toHaveBeenCalledWith(
      'product_load',
      false,
      '[]',
      expect.objectContaining({
        entry: 'startup',
        stage: 'connect',
        error_code: 'billing_12',
        reason: 'offline',
      }),
    );
  } finally {
    failure.mockRestore();
    controller.close();
    database.close();
  }
});

test('practice ad unlocks only after reward and uses the shared ad lock', async () => {
  const database = new NodeSqliteDatabase();
  try {
    await migrateUserDatabase(database, 1);
    const store = new UserRepository(database);
    const ads = new FakeAds();
    const controller = new CommercialController(
      ads,
      new FakePurchases(),
      store,
      undefined,
      () => 1000,
      () => 'practice-request',
      store.practiceAccess,
    );
    await controller.initialize();
    ads.rewardedResult = { status: 'dismissed' };
    expect(await controller.redeemPracticeAd('swordfish', 30)).toEqual({
      status: 'dismissed',
    });
    expect(await store.practiceAccess.readUnlockedBatches('swordfish')).toBe(0);
    ads.rewardedResult = { status: 'rewarded', rewardEventId: 'fish-ad-1' };
    expect(await controller.redeemPracticeAd('swordfish', 30)).toEqual({
      status: 'unlocked',
      unlockedBatches: 1,
    });
    expect(ads.rewardedRequests[1]).toMatchObject({
      placement: 'practice_exercises',
      reward: { resource: 'practice_exercises', amount: 5 },
    });
    expect(await store.practiceAccess.readUnlockedBatches('swordfish')).toBe(1);
    expect(await store.practiceAccess.readUnlockedBatches('finnedXWing')).toBe(
      0,
    );
    expect(
      await controller.getPracticeAdAvailability('hiddenSingle', 3),
    ).toEqual({
      status: 'disabled',
      reason: 'inventory_full',
    });
    controller.close();
  } finally {
    database.close();
  }
});

test('Premium practice access never requests a rewarded ad', async () => {
  const database = new NodeSqliteDatabase();
  try {
    await migrateUserDatabase(database, 1);
    const store = new UserRepository(database);
    await store.upsertEntitlement({
      productId: PREMIUM_PRODUCT_ID,
      entitlement: 'premium',
      platform: 'ios',
      active: true,
      originalTransactionId: 'premium-test',
      lastVerifiedAtEpochMs: 1,
    });
    const ads = new FakeAds();
    const controller = new CommercialController(
      ads,
      new FakePurchases(),
      store,
      undefined,
      () => 1000,
      undefined,
      store.practiceAccess,
    );
    await controller.initialize();
    expect(await controller.getPracticeAdAvailability('swordfish', 30)).toEqual(
      {
        status: 'disabled',
        reason: 'premium',
      },
    );
    expect(await controller.redeemPracticeAd('swordfish', 30)).toEqual({
      status: 'unavailable',
      reason: 'premium',
    });
    expect(ads.rewardedRequests).toHaveLength(0);
    controller.close();
  } finally {
    database.close();
  }
});

test('daily reward snapshot exposes the stored receipt without replacing it on repeat opens', async () => {
  const { controller, database } = await setup();
  expect(controller.snapshot.dailyHintRewards?.last).toMatchObject({
    cycleDay: 1,
    requested: 3,
    credited: 3,
  });
  const initial = controller.snapshot.dailyHintRewards;
  await controller.refreshDailyHintReward();
  expect(controller.snapshot.dailyHintRewards).toBe(initial);
  controller.close();
  database.close();
});

test('999 test hints keep a free account, ordinary daily rewards, production ads and real purchases', async () => {
  const { controller, database, store, ads, purchases } = await setup(
    undefined,
    undefined,
    true,
  );
  try {
    expect(await store.readTestHintAllowance()).toBe(999);
    expect(controller.snapshot.entitlement.status).toBe('free');
    expect(await store.getEntitlement('premium')).toBeNull();
    expect((await store.readWallet()).smart_hint.balance).toBe(8);
    const before = await store.readWallet();
    expect(
      await controller.redeemRewardedAd('smart_hint', 'home_credit_store'),
    ).toMatchObject({ status: 'credited' });
    expect(ads.rewardedRequests).toHaveLength(1);
    expect((await store.readWallet()).smart_hint.balance).toBe(
      before.smart_hint.balance + 5,
    );
    expect(await store.readTestHintAllowance()).toBe(999);
    // SDK duplicate rewards use the existing wallet receipt, not the test reserve.
    await controller.redeemRewardedAd('smart_hint', 'home_credit_store');
    expect((await store.readWallet()).smart_hint.balance).toBe(
      before.smart_hint.balance + 5,
    );
    purchases.purchaseResult = {
      status: 'purchased',
      transaction: transaction(),
    };
    await controller.purchasePremium();
    expect(controller.snapshot.entitlement.status).toBe('premium');
    expect((await store.getEntitlement('premium'))?.active).toBe(true);
    expect(
      await controller.getRewardedAdAvailability(
        'smart_hint',
        'home_credit_store',
      ),
    ).toEqual({ status: 'disabled', reason: 'premium' });
    expect(await store.readTestHintAllowance()).toBe(999);
    // Public builds do not expose or spend the saved test reserve.
    expect(await new UserRepository(database).readTestHintAllowance()).toBe(0);
  } finally {
    controller.close();
    database.close();
  }
});

test('repeated ads have no daily cap, require five spaces, and quick candidates never request ads', async () => {
  const { controller, store, database, ads } = await setup();
  for (let i = 1; i <= 3; i++) {
    ads.rewardedResult = { status: 'rewarded', rewardEventId: `daily-ad-${i}` };
    expect(
      (await controller.redeemRewardedAd('smart_hint', 'credit_exhausted'))
        .status,
    ).toBe('credited');
  }
  expect((await store.readWallet()).smart_hint.balance).toBe(23);
  await database.run(
    "UPDATE credit_wallet SET balance = 95 WHERE resource = 'smart_hint'",
  );
  expect(
    await controller.getRewardedAdAvailability(
      'smart_hint',
      'credit_exhausted',
    ),
  ).toEqual({ status: 'disabled', reason: 'inventory_full' });
  expect(
    await controller.getRewardedAdAvailability(
      'quick_pencil',
      'credit_exhausted',
    ),
  ).toEqual({ status: 'disabled', reason: 'free_feature' });
  expect(ads.rewardedRequests).toHaveLength(3);
  controller.close();
  database.close();
});

test('a new local date is claimed after an older pending login finishes', async () => {
  const database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, 1);
  const store = new UserRepository(database);
  const claim = store.claimDailyHintReward.bind(store);
  let release!: () => void;
  const pending = new Promise<void>(resolve => {
    release = resolve;
  });
  const request = jest
    .spyOn(store, 'claimDailyHintReward')
    .mockImplementationOnce(async date => {
      await pending;
      return claim(date);
    });
  let now = new Date(2026, 9, 3, 23, 59).getTime();
  const controller = new CommercialController(
    new FakeAds(),
    new FakePurchases(),
    store,
    undefined,
    () => now,
  );
  const boot = controller.initialize();
  for (let i = 0; i < 30 && request.mock.calls.length === 0; i++)
    await Promise.resolve();
  expect(request).toHaveBeenCalledTimes(1);
  now = new Date(2026, 9, 4, 0, 1).getTime();
  const foreground = controller.refreshDailyHintReward();
  release();
  await Promise.all([boot, foreground]);
  expect((await store.readWallet()).smart_hint.balance).toBe(11);
  controller.close();
  database.close();
});

test('an ad crossing midnight receives all five hints before daily overflow is discarded', async () => {
  const database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, 1);
  const store = new UserRepository(database);
  const ads = new FakeAds();
  let now = new Date(2026, 9, 3, 23, 59).getTime();
  const controller = new CommercialController(
    ads,
    new FakePurchases(),
    store,
    undefined,
    () => now,
  );
  await controller.initialize();
  await database.run(
    "UPDATE credit_wallet SET balance = 94 WHERE resource = 'smart_hint'",
  );
  let finish!: (result: AdShowResult) => void;
  ads.rewardedOperation = new Promise(resolve => {
    finish = resolve;
  });
  const playing = controller.redeemRewardedAd('smart_hint', 'credit_exhausted');
  for (let i = 0; i < 30 && ads.rewardedRequests.length === 0; i++)
    await Promise.resolve();
  expect(ads.rewardedRequests).toHaveLength(1);
  now = new Date(2026, 9, 4, 0, 1).getTime();
  await controller.refreshDailyHintReward();
  expect((await store.readWallet()).smart_hint.balance).toBe(94);
  finish({ status: 'rewarded', rewardEventId: 'midnight-ad' });
  expect(await playing).toMatchObject({
    status: 'credited',
    grant: { credited: 5 },
  });
  expect((await store.readWallet()).smart_hint.balance).toBe(99);
  const [receipt] = await database.query<{ value: string }>(
    "SELECT value FROM user_metadata WHERE key = 'daily_hint_reward:2026-10-04'",
  );
  expect(JSON.parse(receipt.value)).toMatchObject({
    cycleDay: 2,
    requested: 3,
    credited: 0,
  });
  controller.close();
  database.close();
});

describe('SDK-independent commercial controller', () => {
  test('enables expiring reviewer access without writing a purchase entitlement', async () => {
    const { controller, database, purchases, store } = await setup();

    expect(
      controller.enableReviewerAccess('PLATON-REVIEW-9F7K-3MVT-8Q2H-6XLR'),
    ).toBe('granted');
    expect(controller.snapshot.entitlement).toMatchObject({
      status: 'premium',
      source: 'review_access',
      originalTransactionId: null,
      lastVerifiedAtEpochMs: null,
    });
    expect(await store.getEntitlement(PREMIUM_PRODUCT_ID)).toBeNull();

    purchases.refreshResult = {
      status: 'not_entitled',
      platform: 'android',
      verifiedAtEpochMs: 2000,
    };
    await controller.refreshEntitlements();
    expect(controller.snapshot.entitlement.source).toBe('review_access');
    expect(await store.getEntitlement(PREMIUM_PRODUCT_ID)).toMatchObject({
      active: false,
    });
    expect(controller.enableReviewerAccess('incorrect')).toBe('invalid');

    controller.close();
    database.close();
  });

  test('rejects reviewer access after its published expiry', async () => {
    const database = new NodeSqliteDatabase();
    await migrateUserDatabase(database, 1);
    const controller = new CommercialController(
      new FakeAds(),
      new FakePurchases(),
      new UserRepository(database),
      undefined,
      () => REVIEWER_ACCESS_EXPIRES_AT_EPOCH_MS + 1,
    );

    expect(
      controller.enableReviewerAccess('PLATON-REVIEW-9F7K-3MVT-8Q2H-6XLR'),
    ).toBe('expired');
    expect(controller.snapshot.entitlement.status).toBe('unknown');
    controller.close();
    database.close();
  });

  test('does not wait for advertising consent or store network startup', async () => {
    const ads = new FakeAds();
    ads.initialization = new Promise(() => undefined);
    const purchases = new FakePurchases();
    purchases.initialization = new Promise(() => undefined);

    const initialized = setup(ads, purchases);
    const outcome = await Promise.race([
      initialized.then(() => 'ready'),
      new Promise<string>(resolve => setTimeout(() => resolve('blocked'), 100)),
    ]);

    expect(outcome).toBe('ready');
    const { controller, database } = await initialized;
    controller.close();
    database.close();
  });

  test('uses a rewarded callback as the only grant signal and deduplicates it', async () => {
    const { ads, controller, database, playback, store } = await setup();

    expect(
      await controller.redeemRewardedAd('smart_hint', 'home_credit_store'),
    ).toMatchObject({ status: 'credited', grant: { credited: 5 } });
    expect(
      await controller.redeemRewardedAd('smart_hint', 'home_credit_store'),
    ).toMatchObject({ status: 'credited', grant: { credited: 5 } });

    expect(await store.readWallet()).toMatchObject({
      smart_hint: { balance: 13 },
      quick_pencil: { balance: 3 },
    });
    expect(ads.rewardedRequests).toEqual([
      {
        placement: 'home_credit_store',
        reward: { resource: 'smart_hint', amount: 5 },
        requestId: 'request-1',
      },
      {
        placement: 'home_credit_store',
        reward: { resource: 'smart_hint', amount: 5 },
        requestId: 'request-2',
      },
    ]);
    expect(playback).toMatchObject({ starts: 2, ends: 2 });
    controller.close();
    database.close();
  });

  test('completion ad grants five hints once for a completed session', async () => {
    const { ads, controller, database, store } = await setup();
    await database.run(
      `INSERT INTO game_attempts (
        id, session_id, puzzle_id, content_version, difficulty_level,
        outcome, completion_kind, elapsed_ms, error_count, hint_use_count,
        quick_pencil_use_count, score, started_at_ms, ended_at_ms
      ) VALUES (?, ?, ?, 4, 1, 'completed', 'independent', 1000, 0, 0,
        0, 100, 0, 1000)`,
      ['attempt:ad-session', 'ad-session', 'puzzle:ad'],
    );
    expect(await controller.getCompletionAdAvailability('ad-session')).toEqual({
      status: 'available',
    });
    const result = await controller.redeemCompletionAd('ad-session');
    expect(result).toMatchObject({
      status: 'credited',
      grant: { credited: { smartHint: 5, quickPencil: 0 } },
    });
    expect((await store.readWallet()).smart_hint.balance).toBe(13);
    expect((await store.readWallet()).quick_pencil.balance).toBe(3);
    expect(ads.rewardedRequests).toMatchObject([
      {
        placement: 'game_completion',
        reward: { resource: 'smart_hint', amount: 5 },
      },
    ]);
    expect(await controller.getCompletionAdAvailability('ad-session')).toEqual({
      status: 'disabled',
      reason: 'already_claimed',
    });
    controller.close();
    database.close();
  });

  test('does not grant on dismissal and blocks Premium or full inventory', async () => {
    const ads = new FakeAds();
    ads.rewardedResult = { status: 'dismissed' };
    const first = await setup(ads);
    expect(
      await first.controller.redeemRewardedAd('smart_hint', 'credit_exhausted'),
    ).toEqual({ status: 'dismissed' });
    expect((await first.store.readWallet()).quick_pencil.balance).toBe(3);
    ads.rewardedResult = { status: 'completed' };
    expect(
      await first.controller.redeemRewardedAd('smart_hint', 'credit_exhausted'),
    ).toEqual({ status: 'dismissed' });
    expect((await first.store.readWallet()).quick_pencil.balance).toBe(3);
    expect(first.playback).toMatchObject({ starts: 2, ends: 2 });
    first.controller.close();
    first.database.close();

    const unavailableAds = new FakeAds();
    unavailableAds.availability = {
      status: 'unavailable',
      reason: 'not_loaded',
    };
    const unavailable = await setup(unavailableAds);
    expect(
      await unavailable.controller.redeemRewardedAd(
        'smart_hint',
        'credit_exhausted',
      ),
    ).toEqual({ status: 'unavailable', reason: 'not_loaded' });
    expect(unavailable.playback).toMatchObject({ starts: 0, ends: 0 });
    unavailable.controller.close();
    unavailable.database.close();

    expect(
      rewardedAdPolicy(
        {
          status: 'premium',
          source: 'local_cache',
          refreshing: false,
          lastVerifiedAtEpochMs: 1,
          originalTransactionId: 'original',
        },
        'smart_hint',
        0,
      ),
    ).toEqual({ status: 'disabled', reason: 'premium' });
    expect(
      rewardedAdPolicy(
        {
          status: 'free',
          source: 'none',
          refreshing: false,
          lastVerifiedAtEpochMs: null,
          originalTransactionId: null,
        },
        'smart_hint',
        99,
      ),
    ).toEqual({ status: 'disabled', reason: 'inventory_full' });
  });

  test('serializes rewarded ads against purchase and restore operations', async () => {
    const ads = new FakeAds();
    let finishAd!: (result: AdShowResult) => void;
    ads.rewardedOperation = new Promise(resolve => {
      finishAd = resolve;
    });
    const first = await setup(ads);
    const ad = first.controller.redeemRewardedAd(
      'smart_hint',
      'home_credit_store',
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(await first.controller.purchasePremium()).toEqual({
      status: 'unavailable',
      reason: 'operation_in_progress',
    });
    expect(await first.controller.restorePremium()).toEqual({
      status: 'unavailable',
      reason: 'operation_in_progress',
    });
    finishAd({ status: 'dismissed' });
    await expect(ad).resolves.toEqual({ status: 'dismissed' });
    first.controller.close();
    first.database.close();

    const purchases = new FakePurchases();
    let finishPurchase!: (result: PurchaseResult) => void;
    const purchaseOperation = new Promise<PurchaseResult>(resolve => {
      finishPurchase = resolve;
    });
    jest
      .spyOn(purchases, 'purchase')
      .mockImplementation(() => purchaseOperation);
    const second = await setup(new FakeAds(), purchases);
    const purchase = second.controller.purchasePremium();
    expect(
      await second.controller.redeemRewardedAd(
        'smart_hint',
        'credit_exhausted',
      ),
    ).toEqual({
      status: 'unavailable',
      reason: 'operation_in_progress',
    });
    finishPurchase({ status: 'cancelled' });
    await expect(purchase).resolves.toEqual({ status: 'cancelled' });
    second.controller.close();
    second.database.close();
  });

  test('persists a purchase without changing the wallet before finishing the transaction', async () => {
    const purchases = new FakePurchases();
    purchases.purchaseResult = {
      status: 'purchased',
      transaction: transaction(),
    };
    const { controller, database, store } = await setup(
      new FakeAds(),
      purchases,
    );
    purchases.beforeFinish = async () => {
      expect(await store.getEntitlement(PREMIUM_PRODUCT_ID)).toMatchObject({
        active: true,
      });
      expect(await store.readWallet()).toMatchObject({
        quick_pencil: { balance: 3 },
        smart_hint: { balance: 8 },
      });
    };

    expect(await controller.purchasePremium()).toMatchObject({
      status: 'purchased',
    });
    expect(controller.snapshot.entitlement.status).toBe('premium');
    expect(controller.snapshot.premiumUnlockEventId).toBeUndefined();
    expect(purchases.finished).toEqual(['finish-transaction-1']);
    controller.close();
    database.close();
  });

  test('does not finish a transaction when local persistence fails', async () => {
    const purchases = new FakePurchases();
    purchases.purchaseResult = {
      status: 'purchased',
      transaction: transaction(),
    };
    const { controller, database, store } = await setup(
      new FakeAds(),
      purchases,
    );
    jest
      .spyOn(store, 'upsertEntitlement')
      .mockRejectedValueOnce(new Error('disk full'));

    await expect(controller.purchasePremium()).rejects.toThrow('disk full');
    expect(purchases.finished).toEqual([]);
    controller.close();
    database.close();
  });

  test('restores entitlement without granting purchase inventory', async () => {
    const purchases = new FakePurchases();
    purchases.restoreResult = {
      status: 'restored',
      transactions: [
        transaction({
          transactionId: 'restored-1',
          completionCredential: 'finish-restored-1',
        }),
      ],
    };
    const { controller, database, store } = await setup(
      new FakeAds(),
      purchases,
    );

    expect(await controller.restorePremium()).toMatchObject({
      status: 'restored',
    });
    expect(controller.snapshot.entitlement.status).toBe('premium');
    expect(await store.readWallet()).toMatchObject({
      quick_pencil: { balance: 3 },
      smart_hint: { balance: 8 },
    });
    expect(purchases.finished).toEqual(['finish-restored-1']);
    controller.close();
    database.close();
  });

  test.each([false, true])(
    'restore removes refunded ownership while retaining independent test allowance=%s',
    async closedBetaTest => {
      const purchases = new FakePurchases();
      const { controller, database, store } = await setup(
        new FakeAds(),
        purchases,
        closedBetaTest,
      );
      await new Promise(resolve => setTimeout(resolve, 0));
      purchases.purchaseResult = {
        status: 'purchased',
        transaction: transaction({ platform: 'android' }),
      };
      await controller.purchasePremium();
      const wallet = await store.readWallet();
      purchases.refreshResult = {
        status: 'not_entitled',
        platform: 'android',
        verifiedAtEpochMs: 2000,
      };

      await expect(controller.restorePremium()).resolves.toEqual({
        status: 'nothing_to_restore',
      });
      expect(controller.snapshot.entitlement).toMatchObject({
        status: 'free',
        source: 'store_verified',
      });
      expect(await store.getEntitlement(PREMIUM_PRODUCT_ID)).toMatchObject({
        active: false,
        lastVerifiedAtEpochMs: 2000,
      });
      expect(await store.readWallet()).toEqual(wallet);
      expect(controller.snapshot.restoreBusy).toBe(false);
      expect(await store.readTestHintAllowance()).toBe(
        closedBetaTest ? 999 : 0,
      );
      controller.close();
      database.close();
    },
  );

  test.each<EntitlementRefreshResult>([
    { status: 'unavailable', reason: 'offline' },
    { status: 'unavailable', reason: 'pending' },
    { status: 'failed', errorCode: 'billing_6' },
  ])('restore preserves Premium when verification returns %j', async result => {
    const purchases = new FakePurchases();
    const { controller, database, store } = await setup(
      new FakeAds(),
      purchases,
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    purchases.purchaseResult = {
      status: 'purchased',
      transaction: transaction(),
    };
    await controller.purchasePremium();
    purchases.refreshResult = result;

    await expect(controller.restorePremium()).resolves.toEqual(result);
    expect(controller.snapshot.entitlement.status).toBe('premium');
    expect(await store.getEntitlement(PREMIUM_PRODUCT_ID)).toMatchObject({
      active: true,
    });
    controller.close();
    database.close();
  });

  test('restore accepts a purchase completed between the restore and verification queries', async () => {
    const purchases = new FakePurchases();
    const { controller, database } = await setup(new FakeAds(), purchases);
    await new Promise(resolve => setTimeout(resolve, 0));
    purchases.refreshResult = {
      status: 'verified',
      transactions: [transaction()],
    };
    await expect(controller.restorePremium()).resolves.toMatchObject({
      status: 'restored',
    });
    expect(controller.snapshot.entitlement.status).toBe('premium');
    expect(purchases.finished).toEqual(['finish-transaction-1']);
    controller.close();
    database.close();
  });

  test('restore keeps the operation lock until authoritative verification completes', async () => {
    const purchases = new FakePurchases();
    const { controller, database } = await setup(new FakeAds(), purchases);
    await new Promise(resolve => setTimeout(resolve, 0));
    let verify!: (result: EntitlementRefreshResult) => void;
    jest.spyOn(purchases, 'refreshEntitlements').mockImplementation(
      () =>
        new Promise(resolve => {
          verify = resolve;
        }),
    );
    const restoring = controller.restorePremium();
    await Promise.resolve();
    expect(controller.snapshot.restoreBusy).toBe(true);
    await expect(controller.purchasePremium()).resolves.toEqual({
      status: 'unavailable',
      reason: 'operation_in_progress',
    });
    verify({ status: 'unavailable', reason: 'offline' });
    await restoring;
    expect(controller.snapshot.restoreBusy).toBe(false);
    controller.close();
    database.close();
  });

  test('treats an unacknowledged store refresh as a new external acquisition', async () => {
    const purchases = new FakePurchases();
    const { controller, database, store } = await setup(
      new FakeAds(),
      purchases,
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    purchases.refreshResult = {
      status: 'verified',
      transactions: [
        transaction({
          platform: 'android',
          transactionId: 'external-redemption-1',
          completionCredential: 'finish-external-redemption-1',
          isNewAcquisition: true,
        }),
      ],
    };

    await controller.refreshEntitlements();

    expect(controller.snapshot.entitlement.status).toBe('premium');
    expect(controller.snapshot.premiumUnlockEventId).toBe(
      'external-redemption-1',
    );
    expect(await store.readWallet()).toMatchObject({
      quick_pencil: { balance: 3 },
      smart_hint: { balance: 8 },
    });
    expect(purchases.finished).toContain('finish-external-redemption-1');
    controller.close();
    database.close();
  });

  test('keeps cached Premium on refresh failure and applies verified revocation', async () => {
    const database = new NodeSqliteDatabase();
    await migrateUserDatabase(database, 1);
    const store = new UserRepository(database);
    await store.upsertEntitlement({
      productId: PREMIUM_PRODUCT_ID,
      entitlement: 'premium',
      platform: 'ios',
      active: true,
      originalTransactionId: 'cached-original',
      lastVerifiedAtEpochMs: 100,
    });
    const purchases = new FakePurchases();
    const controller = new CommercialController(
      new NoopAdGateway(),
      purchases,
      store,
    );
    await controller.initialize();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(controller.snapshot.entitlement).toMatchObject({
      status: 'premium',
      source: 'local_cache',
    });
    await controller.refreshEntitlements();
    expect(controller.snapshot.entitlement).toMatchObject({
      status: 'premium',
      source: 'local_cache',
      refreshing: false,
    });

    purchases.refreshResult = {
      status: 'verified',
      transactions: [
        transaction({
          transactionId: 'revocation-1',
          purchasedAtEpochMs: 900,
          status: 'revoked',
        }),
      ],
    };
    await controller.refreshEntitlements();
    expect(controller.snapshot.entitlement).toMatchObject({
      status: 'free',
      source: 'store_verified',
      refreshing: false,
    });
    expect(await store.getEntitlement(PREMIUM_PRODUCT_ID)).toMatchObject({
      active: false,
    });
    controller.close();
    database.close();
  });

  test('clears cached Premium only after an authoritative not-entitled refresh', async () => {
    const database = new NodeSqliteDatabase();
    await migrateUserDatabase(database, 1);
    const store = new UserRepository(database);
    await store.upsertEntitlement({
      productId: PREMIUM_PRODUCT_ID,
      entitlement: 'premium',
      platform: 'android',
      active: true,
      originalTransactionId: 'cached-original',
      lastVerifiedAtEpochMs: 100,
    });
    const purchases = new FakePurchases();
    purchases.refreshResult = {
      status: 'not_entitled',
      platform: 'android',
      verifiedAtEpochMs: 1200,
    };
    const controller = new CommercialController(
      new NoopAdGateway(),
      purchases,
      store,
    );
    await controller.initialize();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(controller.snapshot.entitlement).toMatchObject({
      status: 'free',
      source: 'store_verified',
      refreshing: false,
      lastVerifiedAtEpochMs: 1200,
      originalTransactionId: null,
    });
    expect(await store.getEntitlement(PREMIUM_PRODUCT_ID)).toMatchObject({
      platform: 'android',
      active: false,
      lastVerifiedAtEpochMs: 1200,
      originalTransactionId: null,
    });
    expect(purchases.finished).toEqual([]);
    controller.close();
    database.close();
  });

  test('noop gateways keep the offline runtime explicitly unavailable', async () => {
    const ads = new NoopAdGateway();
    const purchases = new NoopPurchaseGateway();
    expect(await ads.getAvailability('rewarded', 'home_credit_store')).toEqual({
      status: 'unavailable',
      reason: 'sdk_unavailable',
    });
    expect(await purchases.purchase(PREMIUM_PRODUCT_ID)).toEqual({
      status: 'unavailable',
      reason: 'sdk_unavailable',
    });
  });
});
