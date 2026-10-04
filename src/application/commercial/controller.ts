import {
  AD_HINT_REWARD,
  localRewardDate,
} from '../../domain/game/hint-rewards';
import { CREDIT_CAP, type CreditResource } from '../../domain/game/contracts';
import { rewardedAdPolicy } from './policy';
import {
  PREMIUM_PRODUCT_ID,
  type AdAvailability,
  type AdGateway,
  type AdPlacement,
  type CommercialPlaybackObserver,
  type CommercialSnapshot,
  type CompletionAdRedemptionResult,
  type CommercialStore,
  type EntitlementSnapshot,
  type PurchaseGateway,
  type PurchaseResult,
  type ReviewerAccessResult,
  type RestoreResult,
  type RewardedAdRedemptionResult,
  type StoredEntitlement,
  type VerifiedTransaction,
} from './contracts';
import { validateReviewerAccess } from './reviewer-access';

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
  private transactionProcessing: Promise<void> = Promise.resolve();
  private reviewerAccessEnabled = false;
  private dailyRefresh: Promise<void> | null = null;
  private lastDailyDate: string | null = null;
  private initialized = false;
  private closed = false;
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
    private readonly options: { closedBetaPremium?: boolean } = {},
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
    await this.refreshDailyHintReward();
    this.stopTransactions = this.purchases.subscribeToTransactions(
      transaction => {
        const isNewAcquisition = transaction.isNewAcquisition === true;
        this.processTransaction(transaction, isNewAcquisition).catch(
          () => undefined,
        );
      },
    );
    // Consent UI, storefront lookup, and ad-network startup are optional and may
    // be slow or unavailable. They must never hold the offline game boot path.
    if (this.state.entitlement.status !== 'premium') {
      this.ads.initialize().catch(() => undefined);
    }
    this.syncPurchasesOnLaunch().catch(() => undefined);
  }

  async refreshDailyHintReward(): Promise<void> {
    if (
      !this.initialized ||
      this.closed ||
      this.options.closedBetaPremium ||
      this.state.rewardedAdBusy ||
      this.state.entitlement.status === 'premium'
    )
      return;
    if (this.dailyRefresh) {
      await this.dailyRefresh;
      // A pending claim may have started before midnight. Recheck the date.
      return this.refreshDailyHintReward();
    }
    const now = this.now();
    const date = localRewardDate(now);
    if (date === this.lastDailyDate) return;
    this.dailyRefresh = (async () => {
      const grant = await this.store.claimDailyHintReward(now);
      const dailyHintRewards = await this.store.readDailyHintRewardHistory(now);
      if (!this.closed) {
        if (this.state.entitlement.status !== 'premium')
          this.lastDailyDate = date;
        this.patch({ wallet: grant.wallet, dailyHintRewards });
      }
    })();
    try {
      await this.dailyRefresh;
    } finally {
      this.dailyRefresh = null;
    }
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

  async getCompletionAdAvailability(
    sessionId: string,
  ): Promise<AdAvailability> {
    const wallet = await this.store.readWallet();
    this.patch({ wallet });
    if (this.state.entitlement.status === 'premium') {
      return { status: 'disabled', reason: 'premium' };
    }
    const eligibility = await this.store.completionAdEligibility(sessionId);
    if (eligibility !== 'available') {
      return { status: 'disabled', reason: eligibility };
    }
    if (wallet.smart_hint.balance > CREDIT_CAP - AD_HINT_REWARD) {
      return { status: 'disabled', reason: 'inventory_full' };
    }
    return this.ads.getAvailability('rewarded', 'game_completion');
  }

  async redeemCompletionAd(
    sessionId: string,
  ): Promise<CompletionAdRedemptionResult> {
    if (
      this.state.rewardedAdBusy ||
      this.state.purchaseBusy ||
      this.state.restoreBusy
    ) {
      return { status: 'unavailable', reason: 'operation_in_progress' };
    }
    if (this.dailyRefresh) await this.dailyRefresh;
    // Another request may have started while the daily claim drained.
    if (
      this.state.rewardedAdBusy ||
      this.state.purchaseBusy ||
      this.state.restoreBusy
    )
      return { status: 'unavailable', reason: 'operation_in_progress' };
    this.patch({ rewardedAdBusy: true });
    let playbackStarted = false;
    try {
      const availability = await this.getCompletionAdAvailability(sessionId);
      if (availability.status !== 'available') {
        return { status: 'unavailable', reason: availability.reason };
      }
      await this.playback.onPlaybackStart();
      playbackStarted = true;
      // Pausing drains pending game moves, which may have earned a completion reward.
      const afterPause = await this.store.readWallet();
      if (afterPause.smart_hint.balance > CREDIT_CAP - AD_HINT_REWARD) {
        this.patch({ wallet: afterPause });
        return { status: 'unavailable', reason: 'inventory_full' };
      }
      const result = await this.ads.showRewarded(
        'game_completion',
        { resource: 'smart_hint', amount: AD_HINT_REWARD },
        this.createId(),
      );
      if (result.status === 'rewarded') {
        const grant = await this.store.redeemCompletionRewardedAd(
          sessionId,
          this.now(),
          result.rewardEventId,
        );
        this.patch({ wallet: grant.wallet });
        return { status: 'credited', grant };
      }
      if (result.status === 'dismissed' || result.status === 'completed') {
        return { status: 'dismissed' };
      }
      return result;
    } finally {
      try {
        if (playbackStarted) await this.playback.onPlaybackEnd();
      } finally {
        this.patch({ rewardedAdBusy: false });
        await this.refreshDailyHintReward().catch(() => undefined);
      }
    }
  }

  async isAdPrivacyOptionsRequired(): Promise<boolean> {
    if (this.options.closedBetaPremium) return false;
    return this.ads.isPrivacyOptionsRequired().catch(() => false);
  }

  async showAdPrivacyOptions(): Promise<boolean> {
    if (this.options.closedBetaPremium) return false;
    return this.ads.showPrivacyOptions().catch(() => false);
  }

  async redeemRewardedAd(
    resource: CreditResource,
    placement: AdPlacement,
  ): Promise<RewardedAdRedemptionResult> {
    if (
      this.state.rewardedAdBusy ||
      this.state.purchaseBusy ||
      this.state.restoreBusy
    ) {
      return { status: 'unavailable', reason: 'operation_in_progress' };
    }
    if (this.dailyRefresh) await this.dailyRefresh;
    // Another request may have started while the daily claim drained.
    if (
      this.state.rewardedAdBusy ||
      this.state.purchaseBusy ||
      this.state.restoreBusy
    )
      return { status: 'unavailable', reason: 'operation_in_progress' };
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
      // Pausing drains pending game moves, which may have earned a completion reward.
      const afterPause = await this.store.readWallet();
      if (afterPause.smart_hint.balance > CREDIT_CAP - AD_HINT_REWARD) {
        this.patch({ wallet: afterPause });
        return { status: 'unavailable', reason: 'inventory_full' };
      }
      const result = await this.ads.showRewarded(
        placement,
        { resource: 'smart_hint', amount: AD_HINT_REWARD },
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
        await this.refreshDailyHintReward().catch(() => undefined);
      }
    }
  }

  async purchasePremium(): Promise<PurchaseResult> {
    if (
      this.state.purchaseBusy ||
      this.state.restoreBusy ||
      this.state.rewardedAdBusy
    ) {
      return { status: 'unavailable', reason: 'operation_in_progress' };
    }
    this.patch({ purchaseBusy: true });
    try {
      const result = await this.purchases.purchase(PREMIUM_PRODUCT_ID);
      if (result.status === 'purchased') {
        await this.processTransaction(result.transaction, false);
      }
      return result;
    } finally {
      this.patch({ purchaseBusy: false });
    }
  }

  async loadPremiumProduct(): Promise<void> {
    await this.purchases.initialize();
    const products = await this.purchases.getProducts([PREMIUM_PRODUCT_ID]);
    if (!this.closed) this.patch({ products });
  }

  enableReviewerAccess(code: string): ReviewerAccessResult {
    const result = validateReviewerAccess(code, this.now());
    if (result !== 'granted') return result;
    this.reviewerAccessEnabled = true;
    this.patch({
      entitlement: {
        status: 'premium',
        source: 'review_access',
        refreshing: this.state.entitlement.refreshing,
        lastVerifiedAtEpochMs: null,
        originalTransactionId: null,
      },
    });
    return result;
  }

  async restorePremium(): Promise<RestoreResult> {
    if (
      this.state.restoreBusy ||
      this.state.purchaseBusy ||
      this.state.rewardedAdBusy
    ) {
      return { status: 'unavailable', reason: 'operation_in_progress' };
    }
    this.patch({ restoreBusy: true });
    try {
      const result = await this.purchases.restorePurchases();
      if (result.status === 'restored') {
        for (const transaction of result.transactions) {
          await this.processTransaction(transaction, false);
        }
      }
      return result;
    } finally {
      this.patch({ restoreBusy: false });
    }
  }

  async refreshEntitlements(): Promise<void> {
    if (this.state.purchaseBusy || this.state.restoreBusy) return;
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
        const isNewAcquisition = transaction.isNewAcquisition === true;
        await this.processTransaction(transaction, isNewAcquisition);
      }
    } finally {
      this.patch({
        entitlement: { ...this.state.entitlement, refreshing: false },
      });
      await this.refreshDailyHintReward();
    }
  }

  close(): void {
    this.closed = true;
    this.stopTransactions?.();
    this.stopTransactions = null;
    this.ads.close();
    this.purchases.close();
    this.listeners.clear();
  }

  private async syncPurchasesOnLaunch(): Promise<void> {
    await this.purchases.initialize();
    if (this.closed) return;
    try {
      await this.loadPremiumProduct();
    } catch {
      // Store metadata is optional; offline gameplay must still initialize.
    }
    if (!this.closed) await this.refreshEntitlements();
  }

  private processTransaction(
    transaction: VerifiedTransaction,
    notifyUnlock: boolean,
  ): Promise<void> {
    const operation = this.transactionProcessing.then(() =>
      this.applyTransaction(transaction, notifyUnlock),
    );
    this.transactionProcessing = operation.catch(() => undefined);
    return operation;
  }

  private async applyTransaction(
    transaction: VerifiedTransaction,
    notifyUnlock: boolean,
  ): Promise<void> {
    const hadPermanentPremium =
      this.state.entitlement.status === 'premium' &&
      this.state.entitlement.source !== 'review_access' &&
      this.state.entitlement.source !== 'closed_beta';
    this.reviewerAccessEnabled = false;
    const entitlement = persistedEntitlement(transaction);
    await this.store.upsertEntitlement(entitlement);
    this.patch({
      entitlement: {
        status: entitlement.active ? 'premium' : 'free',
        source: 'store_verified',
        refreshing: this.state.entitlement.refreshing,
        lastVerifiedAtEpochMs: entitlement.lastVerifiedAtEpochMs,
        originalTransactionId: entitlement.originalTransactionId,
      },
    });
    if (notifyUnlock && entitlement.active && !hadPermanentPremium) {
      this.patch({ premiumUnlockEventId: transaction.transactionId });
    }
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
    if (this.reviewerAccessEnabled) {
      this.patch({
        entitlement: {
          status: 'premium',
          source: 'review_access',
          refreshing: this.state.entitlement.refreshing,
          lastVerifiedAtEpochMs: null,
          originalTransactionId: null,
        },
      });
      return;
    }
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
    if (
      this.options.closedBetaPremium &&
      (this.state.entitlement.status !== 'premium' ||
        this.state.entitlement.source === 'closed_beta')
    ) {
      this.state = {
        ...this.state,
        entitlement: {
          ...EMPTY_ENTITLEMENT,
          status: 'premium',
          source: 'closed_beta',
          refreshing: this.state.entitlement.refreshing,
        },
      };
    }
    this.listeners.forEach(listener => listener(this.state));
  }
}
