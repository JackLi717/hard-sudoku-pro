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
  RestoreResult,
  RewardedAdReward,
  StoreProduct,
  VerifiedTransaction,
  rewardedAdPolicy,
} from '../src/application';
import { UserRepository } from '../src/data/user/user-repository';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import { NodeSqliteDatabase } from './helpers/node-sqlite';

class FakeAds implements AdGateway {
  initialization: Promise<void> = Promise.resolve();
  availability: AdAvailability = { status: 'available' };
  rewardedResult: AdShowResult = {
    status: 'rewarded',
    rewardEventId: 'reward-1',
  };
  rewardedRequests: Array<{
    placement: AdPlacement;
    reward: RewardedAdReward;
    requestId: string;
  }> = [];
  interstitials: AdPlacement[] = [];

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

  async showInterstitial(placement: AdPlacement): Promise<AdShowResult> {
    this.interstitials.push(placement);
    return { status: 'completed' };
  }

  async showRewarded(
    placement: AdPlacement,
    reward: RewardedAdReward,
    requestId: string,
  ): Promise<AdShowResult> {
    this.rewardedRequests.push({ placement, reward, requestId });
    return this.rewardedResult;
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

async function setup(ads = new FakeAds(), purchases = new FakePurchases()) {
  const database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, 1);
  const store = new UserRepository(database);
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

describe('SDK-independent commercial controller', () => {
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
    ).toMatchObject({ status: 'credited', grant: { credited: 1 } });
    expect(
      await controller.redeemRewardedAd('smart_hint', 'home_credit_store'),
    ).toMatchObject({ status: 'credited', grant: { credited: 1 } });

    expect(await store.readWallet()).toMatchObject({
      smart_hint: { balance: 6 },
      quick_pencil: { balance: 3 },
    });
    expect(ads.rewardedRequests).toEqual([
      {
        placement: 'home_credit_store',
        reward: { resource: 'smart_hint', amount: 1 },
        requestId: 'request-1',
      },
      {
        placement: 'home_credit_store',
        reward: { resource: 'smart_hint', amount: 1 },
        requestId: 'request-2',
      },
    ]);
    expect(playback).toMatchObject({ starts: 2, ends: 2 });
    controller.close();
    database.close();
  });

  test('does not grant on dismissal and blocks Premium or full inventory', async () => {
    const ads = new FakeAds();
    ads.rewardedResult = { status: 'dismissed' };
    const first = await setup(ads);
    expect(
      await first.controller.redeemRewardedAd(
        'quick_pencil',
        'credit_exhausted',
      ),
    ).toEqual({ status: 'dismissed' });
    expect((await first.store.readWallet()).quick_pencil.balance).toBe(3);
    expect(first.playback).toMatchObject({ starts: 1, ends: 1 });
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
        'quick_pencil',
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

  test('persists a purchase and starting inventory before finishing the transaction', async () => {
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
        quick_pencil: { balance: 99 },
        smart_hint: { balance: 99 },
      });
    };

    expect(await controller.purchasePremium()).toMatchObject({
      status: 'purchased',
    });
    expect(controller.snapshot.entitlement.status).toBe('premium');
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
      .spyOn(store, 'recordInitialPremiumPurchase')
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
      smart_hint: { balance: 5 },
    });
    expect(purchases.finished).toEqual(['finish-restored-1']);
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
