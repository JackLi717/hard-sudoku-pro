import type { CreditResource } from '../../domain/game/contracts';
import { rewardedAdPolicy } from './policy';
import {
  PREMIUM_PRODUCT_ID,
  type AdAvailability,
  type AdGateway,
  type AdPlacement,
  type CommercialPlaybackObserver,
  type CommercialSnapshot,
  type CommercialStore,
  type EntitlementSnapshot,
  type PurchaseGateway,
  type PurchaseResult,
  type RestoreResult,
  type RewardedAdRedemptionResult,
  type StoredEntitlement,
  type VerifiedTransaction,
} from './contracts';

type Listener = (snapshot: CommercialSnapshot) => void;
type IdFactory = () => string;

const EMPTY_ENTITLEMENT: EntitlementSnapshot = {
  status: 'unknown',
  source: 'none',
  refreshing: false,
  lastVerifiedAtEpochMs: null,
  originalTransactionId: null,
};

const NOOP_PLAYBACK_OBSERVER: CommercialPlaybackObserver = {
  onPlaybackStart() {},
  onPlaybackEnd() {},
};

function defaultIdFactory(): string {
  return `commercial-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function persistedEntitlement(
  transaction: VerifiedTransaction,
): StoredEntitlement {
  return {
    productId: transaction.productId,
    entitlement: 'premium',
    platform: transaction.platform,
    active: transaction.status === 'active',
    originalTransactionId: transaction.originalTransactionId,
    lastVerifiedAtEpochMs: transaction.verifiedAtEpochMs,
  };
}

export class CommercialController {
  private listeners = new Set<Listener>();
  private stopTransactions: (() => void) | null = null;
  private initialized = false;
  private state: CommercialSnapshot = {
    entitlement: EMPTY_ENTITLEMENT,
    products: [],
    wallet: null,
    purchaseBusy: false,
    restoreBusy: false,
    rewardedAdBusy: false,
  };

  constructor(
    private readonly ads: AdGateway,
    private readonly purchases: PurchaseGateway,
    private readonly store: CommercialStore,
    private readonly playback: CommercialPlaybackObserver = NOOP_PLAYBACK_OBSERVER,
    private readonly now: () => number = Date.now,
    private readonly createId: IdFactory = defaultIdFactory,
  ) {}

  get snapshot(): CommercialSnapshot {
    return this.state;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    const [cached, wallet] = await Promise.all([
      this.store.getEntitlement(PREMIUM_PRODUCT_ID),
      this.store.readWallet(),
    ]);
    this.patch({
      entitlement: cached
        ? {
            status: cached.active ? 'premium' : 'free',
            source: 'local_cache',
            refreshing: false,
            lastVerifiedAtEpochMs: cached.lastVerifiedAtEpochMs,
            originalTransactionId: cached.originalTransactionId,
          }
        : { ...EMPTY_ENTITLEMENT, status: 'free' },
      wallet,
    });
    this.stopTransactions = this.purchases.subscribeToTransactions(
      transaction => {
        this.applyTransaction(transaction, false).catch(() => undefined);
      },
    );
    await Promise.all([
      this.ads.initialize().catch(() => undefined),
      this.purchases.initialize().catch(() => undefined),
    ]);
    try {
      const products = await this.purchases.getProducts([PREMIUM_PRODUCT_ID]);
      this.patch({ products });
    } catch {
      // Store metadata is optional; offline gameplay must still initialize.
    }
    await this.refreshEntitlements().catch(() => undefined);
  }

  async getRewardedAdAvailability(
    resource: CreditResource,
    placement: AdPlacement,
  ): Promise<AdAvailability> {
    const wallet = await this.store.readWallet();
    this.patch({ wallet });
    const policy = rewardedAdPolicy(
      this.state.entitlement,
      resource,
      wallet[resource].balance,
    );
    return policy ?? this.ads.getAvailability('rewarded', placement);
  }

  async redeemRewardedAd(
    resource: CreditResource,
    placement: AdPlacement,
  ): Promise<RewardedAdRedemptionResult> {
    if (this.state.rewardedAdBusy) {
      return { status: 'unavailable', reason: 'operation_in_progress' };
    }
    this.patch({ rewardedAdBusy: true });
    let playbackStarted = false;
    try {
      const availability = await this.getRewardedAdAvailability(
        resource,
        placement,
      );
      if (availability.status !== 'available') {
        return { status: 'unavailable', reason: availability.reason };
      }
      await this.playback.onPlaybackStart();
      playbackStarted = true;
      const result = await this.ads.showRewarded(
        placement,
        { resource, amount: 1 },
        this.createId(),
      );
      if (result.status === 'rewarded') {
        const grant = await this.store.redeemRewardedAdCredit(
          resource,
          this.now(),
          result.rewardEventId,
        );
        this.patch({ wallet: grant.wallet });
        return { status: 'credited', grant };
      }
      if (result.status === 'dismissed' || result.status === 'completed') {
        return { status: 'dismissed' };
      }
      if (result.status === 'unavailable') return result;
      return result;
    } finally {
      try {
        if (playbackStarted) await this.playback.onPlaybackEnd();
      } finally {
        this.patch({ rewardedAdBusy: false });
      }
    }
  }

  async maybeShowInterstitial(placement: AdPlacement): Promise<void> {
    if (this.state.entitlement.status === 'premium') return;
    const availability = await this.ads.getAvailability(
      'interstitial',
      placement,
    );
    if (availability.status !== 'available') return;
    await this.playback.onPlaybackStart();
    try {
      await this.ads.showInterstitial(placement);
    } finally {
      await this.playback.onPlaybackEnd();
    }
  }

  async purchasePremium(): Promise<PurchaseResult> {
    if (this.state.purchaseBusy || this.state.restoreBusy) {
      return { status: 'unavailable', reason: 'operation_in_progress' };
    }
    this.patch({ purchaseBusy: true });
    try {
      const result = await this.purchases.purchase(PREMIUM_PRODUCT_ID);
      if (result.status === 'purchased') {
        await this.applyTransaction(result.transaction, true);
      }
      return result;
    } finally {
      this.patch({ purchaseBusy: false });
    }
  }

  async restorePremium(): Promise<RestoreResult> {
    if (this.state.restoreBusy || this.state.purchaseBusy) {
      return { status: 'unavailable', reason: 'operation_in_progress' };
    }
    this.patch({ restoreBusy: true });
    try {
      const result = await this.purchases.restorePurchases();
      if (result.status === 'restored') {
        for (const transaction of result.transactions) {
          await this.applyTransaction(transaction, false);
        }
      }
      return result;
    } finally {
      this.patch({ restoreBusy: false });
    }
  }

  async refreshEntitlements(): Promise<void> {
    this.patch({
      entitlement: { ...this.state.entitlement, refreshing: true },
    });
    try {
      const result = await this.purchases.refreshEntitlements();
      if (result.status === 'not_entitled') {
        await this.applyNotEntitled(result.platform, result.verifiedAtEpochMs);
        return;
      }
      if (result.status !== 'verified') return;
      for (const transaction of result.transactions) {
        await this.applyTransaction(transaction, false);
      }
    } finally {
      this.patch({
        entitlement: { ...this.state.entitlement, refreshing: false },
      });
    }
  }

  close(): void {
    this.stopTransactions?.();
    this.stopTransactions = null;
    this.ads.close();
    this.purchases.close();
    this.listeners.clear();
  }

  private async applyTransaction(
    transaction: VerifiedTransaction,
    grantStartingInventory: boolean,
  ): Promise<void> {
    const entitlement = persistedEntitlement(transaction);
    if (grantStartingInventory && entitlement.active) {
      const result = await this.store.recordInitialPremiumPurchase(
        entitlement,
        `purchase:${transaction.transactionId}`,
      );
      this.patch({ wallet: result.wallet });
    } else {
      await this.store.upsertEntitlement(entitlement);
    }
    this.patch({
      entitlement: {
        status: entitlement.active ? 'premium' : 'free',
        source: 'store_verified',
        refreshing: this.state.entitlement.refreshing,
        lastVerifiedAtEpochMs: entitlement.lastVerifiedAtEpochMs,
        originalTransactionId: entitlement.originalTransactionId,
      },
    });
    await this.purchases.finishTransaction(transaction.completionCredential);
  }

  private async applyNotEntitled(
    platform: 'ios' | 'android',
    verifiedAtEpochMs: number,
  ): Promise<void> {
    await this.store.upsertEntitlement({
      productId: PREMIUM_PRODUCT_ID,
      entitlement: 'premium',
      platform,
      active: false,
      originalTransactionId: null,
      lastVerifiedAtEpochMs: verifiedAtEpochMs,
    });
    this.patch({
      entitlement: {
        status: 'free',
        source: 'store_verified',
        refreshing: this.state.entitlement.refreshing,
        lastVerifiedAtEpochMs: verifiedAtEpochMs,
        originalTransactionId: null,
      },
    });
  }

  private patch(patch: Partial<CommercialSnapshot>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener(this.state));
  }
}
