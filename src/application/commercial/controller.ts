import {
  productAnalytics,
  balanceBucket,
  durationBucket,
} from '../analytics/contracts';
import {
  AD_HINT_REWARD,
  localRewardDate,
} from '../../domain/game/hint-rewards';
import { CREDIT_CAP, type CreditResource } from '../../domain/game/contracts';
import type { TechniqueCode } from '../../domain/hints/techniques';
import {
  accessibleExerciseCount,
  type PracticeAccessStore,
} from '../../domain/practice/access';
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
import { productLoadDiagnostics } from './product-load-diagnostics';
import { sanitizedFrames } from '../analytics/javascript-errors';

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
    private readonly practiceAccess?: PracticeAccessStore,
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
      const before = await this.store
        .readDailyHintRewardHistory(now)
        .catch(() => null);
      const grant = await this.store.claimDailyHintReward(now);
      const dailyHintRewards = await this.store.readDailyHintRewardHistory(now);
      if (!this.closed) {
        if (this.state.entitlement.status !== 'premium')
          this.lastDailyDate = date;
        this.patch({ wallet: grant.wallet, dailyHintRewards });
        if (
          before !== null &&
          before.last?.date !== date &&
          dailyHintRewards.last?.date === date
        )
          productAnalytics.track('reward_granted', {
            reward_source: 'daily',
            credited: grant.credited,
            cycle_day: dailyHintRewards.last?.cycleDay ?? 0,
            requested: dailyHintRewards.last?.requested ?? grant.credited,
            truncated: Number(
              grant.credited <
                (dailyHintRewards.last?.requested ?? grant.credited),
            ),
            balance_bucket: balanceBucket(grant.wallet.smart_hint.balance),
          });
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

  async getPracticeAdAvailability(
    technique: TechniqueCode,
    total: number,
  ): Promise<AdAvailability> {
    if (this.state.entitlement.status === 'premium') {
      return { status: 'disabled', reason: 'premium' };
    }
    if (!this.practiceAccess) {
      return { status: 'unavailable', reason: 'sdk_unavailable' };
    }
    const batches = await this.practiceAccess.readUnlockedBatches(technique);
    if (accessibleExerciseCount(total, false, batches) >= total) {
      return { status: 'disabled', reason: 'inventory_full' };
    }
    return this.ads.getAvailability('rewarded', 'practice_exercises');
  }

  async redeemPracticeAd(
    technique: TechniqueCode,
    total: number,
  ): Promise<
    | { status: 'unlocked'; unlockedBatches: number }
    | { status: 'dismissed' }
    | { status: 'unavailable'; reason: string }
    | { status: 'failed'; errorCode: string }
  > {
    productAnalytics.track('rewarded_ad_attempt', {
      entry: 'practice_exercises',
    });
    if (
      this.state.rewardedAdBusy ||
      this.state.purchaseBusy ||
      this.state.restoreBusy
    ) {
      return this.adUnavailable('practice_exercises', 'operation_in_progress');
    }
    if (this.dailyRefresh) await this.dailyRefresh;
    if (
      this.state.rewardedAdBusy ||
      this.state.purchaseBusy ||
      this.state.restoreBusy
    ) {
      return this.adUnavailable('practice_exercises', 'operation_in_progress');
    }
    this.patch({ rewardedAdBusy: true });
    let playbackStarted = false;
    try {
      const availability = await this.getPracticeAdAvailability(
        technique,
        total,
      );
      if (availability.status !== 'available') {
        return this.adUnavailable('practice_exercises', availability.reason);
      }
      await this.playback.onPlaybackStart();
      playbackStarted = true;
      const result = await this.ads.showRewarded(
        'practice_exercises',
        { resource: 'practice_exercises', amount: 5 },
        this.createId(),
      );
      if (result.status === 'rewarded') {
        const beforeBatches = await this.practiceAccess!.readUnlockedBatches(
          technique,
        ).catch(() => null);
        const unlockedBatches = await this.practiceAccess!.grantNextBatch(
          technique,
          total,
          result.rewardEventId,
          this.now(),
        );
        productAnalytics.track('reward_granted', {
          reward_source: 'practice_ad',
          requested: 5,
          ...(beforeBatches === null
            ? {}
            : {
                credited: Math.max(
                  0,
                  accessibleExerciseCount(total, false, unlockedBatches) -
                    accessibleExerciseCount(total, false, beforeBatches),
                ),
              }),
        });
        return { status: 'unlocked', unlockedBatches };
      }
      if (result.status === 'dismissed' || result.status === 'completed') {
        return { status: 'dismissed' };
      }
      return result;
    } catch (error) {
      productAnalytics.track('rewarded_ad_result', {
        entry: 'practice_exercises',
        stage: 'business',
        result: 'failed',
        reason: 'exception',
      });
      productAnalytics.failure('rewarded_ad');
      throw error;
    } finally {
      try {
        if (playbackStarted) await this.playback.onPlaybackEnd();
      } finally {
        this.patch({ rewardedAdBusy: false });
        await this.refreshDailyHintReward().catch(() => undefined);
      }
    }
  }

  async redeemCompletionAd(
    sessionId: string,
  ): Promise<CompletionAdRedemptionResult> {
    productAnalytics.track('rewarded_ad_attempt', { entry: 'game_completion' });
    if (
      this.state.rewardedAdBusy ||
      this.state.purchaseBusy ||
      this.state.restoreBusy
    ) {
      return this.adUnavailable('game_completion', 'operation_in_progress');
    }
    if (this.dailyRefresh) await this.dailyRefresh;
    // Another request may have started while the daily claim drained.
    if (
      this.state.rewardedAdBusy ||
      this.state.purchaseBusy ||
      this.state.restoreBusy
    )
      return this.adUnavailable('game_completion', 'operation_in_progress');
    this.patch({ rewardedAdBusy: true });
    let playbackStarted = false;
    try {
      const availability = await this.getCompletionAdAvailability(sessionId);
      if (availability.status !== 'available') {
        return this.adUnavailable('game_completion', availability.reason);
      }
      await this.playback.onPlaybackStart();
      playbackStarted = true;
      // Pausing drains pending game moves, which may have earned a completion reward.
      const afterPause = await this.store.readWallet();
      if (afterPause.smart_hint.balance > CREDIT_CAP - AD_HINT_REWARD) {
        this.patch({ wallet: afterPause });
        return this.adUnavailable('game_completion', 'inventory_full');
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
        productAnalytics.track('reward_granted', {
          reward_source: 'rewarded_ad',
          credited:
            typeof grant.credited === 'number'
              ? grant.credited
              : grant.credited.smartHint,
          requested: AD_HINT_REWARD,
          balance_bucket: balanceBucket(grant.wallet.smart_hint.balance),
        });
        return { status: 'credited', grant };
      }
      if (result.status === 'dismissed' || result.status === 'completed') {
        return { status: 'dismissed' };
      }
      return result;
    } catch (error) {
      productAnalytics.track('rewarded_ad_result', {
        entry: 'game_completion',
        stage: 'business',
        result: 'failed',
        reason: 'exception',
      });
      productAnalytics.failure('rewarded_ad');
      throw error;
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
    return this.ads.isPrivacyOptionsRequired().catch(() => false);
  }

  async showAdPrivacyOptions(): Promise<boolean> {
    return this.ads.showPrivacyOptions().catch(() => false);
  }

  async redeemRewardedAd(
    resource: CreditResource,
    placement: AdPlacement,
  ): Promise<RewardedAdRedemptionResult> {
    productAnalytics.track('rewarded_ad_attempt', { entry: placement });
    if (
      this.state.rewardedAdBusy ||
      this.state.purchaseBusy ||
      this.state.restoreBusy
    ) {
      return this.adUnavailable(placement, 'operation_in_progress');
    }
    if (this.dailyRefresh) await this.dailyRefresh;
    // Another request may have started while the daily claim drained.
    if (
      this.state.rewardedAdBusy ||
      this.state.purchaseBusy ||
      this.state.restoreBusy
    )
      return this.adUnavailable(placement, 'operation_in_progress');
    this.patch({ rewardedAdBusy: true });
    let playbackStarted = false;
    try {
      const availability = await this.getRewardedAdAvailability(
        resource,
        placement,
      );
      if (availability.status !== 'available') {
        return this.adUnavailable(placement, availability.reason);
      }
      await this.playback.onPlaybackStart();
      playbackStarted = true;
      // Pausing drains pending game moves, which may have earned a completion reward.
      const afterPause = await this.store.readWallet();
      if (afterPause.smart_hint.balance > CREDIT_CAP - AD_HINT_REWARD) {
        this.patch({ wallet: afterPause });
        return this.adUnavailable(placement, 'inventory_full');
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
        productAnalytics.track('reward_granted', {
          reward_source: 'rewarded_ad',
          credited: grant.credited,
          requested: AD_HINT_REWARD,
          balance_bucket: balanceBucket(grant.wallet.smart_hint.balance),
        });
        return { status: 'credited', grant };
      }
      if (result.status === 'dismissed' || result.status === 'completed') {
        return { status: 'dismissed' };
      }
      if (result.status === 'unavailable') return result;
      return result;
    } catch (error) {
      productAnalytics.track('rewarded_ad_result', {
        entry: placement,
        stage: 'business',
        result: 'failed',
        reason: 'exception',
      });
      productAnalytics.failure('rewarded_ad');
      throw error;
    } finally {
      try {
        if (playbackStarted) await this.playback.onPlaybackEnd();
      } finally {
        this.patch({ rewardedAdBusy: false });
        await this.refreshDailyHintReward().catch(() => undefined);
      }
    }
  }

  private adUnavailable(placement: AdPlacement, reason: string) {
    productAnalytics.track('rewarded_ad_result', {
      entry: placement,
      stage: 'business',
      result: 'unavailable',
      reason,
    });
    return { status: 'unavailable' as const, reason };
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
    productAnalytics.track('purchase_started', { product: 'lifetime_premium' });
    try {
      const result = await this.purchases.purchase(PREMIUM_PRODUCT_ID);
      if (result.status === 'purchased') {
        await this.processTransaction(result.transaction, false);
      }
      productAnalytics.track('purchase_result', {
        result: result.status,
        stage: 'fulfilled',
        product: 'lifetime_premium',
      });
      return result;
    } catch (error) {
      productAnalytics.track('purchase_result', {
        result: 'failed',
        reason: 'exception',
      });
      productAnalytics.failure('purchase');
      throw error;
    } finally {
      this.patch({ purchaseBusy: false });
    }
  }

  async loadPremiumProduct(
    entry: 'startup' | 'premium_page' = 'premium_page',
  ): Promise<void> {
    const started = performance.now();
    try {
      await this.purchases.initialize();
      const products = await this.purchases.getProducts([PREMIUM_PRODUCT_ID]);
      if (!this.closed) this.patch({ products });
      productAnalytics.track('product_load_result', {
        result: products.length ? 'success' : 'empty',
        entry,
        duration_bucket: durationBucket(performance.now() - started),
      });
    } catch (error) {
      const diagnostic = productLoadDiagnostics(error, entry);
      productAnalytics.track('product_load_result', {
        ...diagnostic,
        result: 'failed',
        duration_bucket: durationBucket(performance.now() - started),
      });
      productAnalytics.failure(
        'product_load',
        false,
        sanitizedFrames(error instanceof Error ? error.stack : ''),
        diagnostic,
      );
      throw error;
    }
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
      let result = await this.purchases.restorePurchases();
      if (result.status === 'nothing_to_restore') {
        // Restore does not carry authoritative platform/verification metadata.
        // Query it before removing cached ownership, keeping the restore lock.
        const refreshed = await this.purchases.refreshEntitlements();
        if (refreshed.status === 'not_entitled') {
          await this.applyNotEntitled(
            refreshed.platform,
            refreshed.verifiedAtEpochMs,
          );
        } else if (refreshed.status === 'verified') {
          result = refreshed.transactions.length
            ? { status: 'restored', transactions: refreshed.transactions }
            : { status: 'failed', errorCode: 'invalid_store_response' };
        } else {
          // Offline, pending and failed checks cannot revoke cached Premium.
          result = refreshed;
        }
      }
      if (result.status === 'restored') {
        for (const transaction of result.transactions) {
          await this.processTransaction(transaction, false);
        }
      }
      productAnalytics.track('restore_result', { result: result.status });
      return result;
    } catch (error) {
      productAnalytics.track('restore_result', { result: 'failed' });
      productAnalytics.failure('restore_purchase');
      throw error;
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
    if (this.closed) return;
    try {
      // Connection failures must pass through the same diagnostic boundary as queries.
      await this.loadPremiumProduct('startup');
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
      this.state.entitlement.source !== 'review_access';
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
      productAnalytics.track('entitlement_changed', {
        previous_entitlement: 'free',
        entitlement: 'premium',
        entitlement_source: 'store_verified',
        new_acquisition: 1,
      });
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
    const previous = this.state.entitlement;
    this.state = { ...this.state, ...patch };
    if (
      previous.status !== this.state.entitlement.status ||
      previous.source !== this.state.entitlement.source
    )
      productAnalytics.track('entitlement_changed', {
        previous_entitlement: previous.status,
        entitlement: this.state.entitlement.status,
        entitlement_source: this.state.entitlement.source,
        new_acquisition: 0,
      });
    productAnalytics.setContext({
      entitlement: this.state.entitlement.status,
      entitlement_source: this.state.entitlement.source,
    });
    this.listeners.forEach(listener => listener(this.state));
  }
}
