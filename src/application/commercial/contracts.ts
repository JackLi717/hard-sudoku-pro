import type { CreditResource } from '../../domain/game/contracts';

export const PREMIUM_PRODUCT_ID = 'premium' as const;
export type ProductId = typeof PREMIUM_PRODUCT_ID;

export type AdPlacement =
  | 'game_completion'
  | 'home_credit_store'
  | 'credit_exhausted';

export type AdFormat = 'interstitial' | 'rewarded';

export type RewardedAdReward = {
  resource: CreditResource;
  amount: 1;
};

export type AdAvailability =
  | { status: 'available' }
  | {
      status: 'unavailable';
      reason: 'not_loaded' | 'offline' | 'consent' | 'sdk_unavailable';
    }
  | {
      status: 'disabled';
      reason: 'premium' | 'frequency_cap' | 'inventory_full';
    };

export type AdShowResult =
  | { status: 'completed' }
  | { status: 'rewarded'; rewardEventId: string }
  | { status: 'dismissed' }
  | { status: 'unavailable'; reason: string }
  | { status: 'failed'; errorCode: string };

export interface AdGateway {
  initialize(): Promise<void>;
  getAvailability(
    format: AdFormat,
    placement: AdPlacement,
  ): Promise<AdAvailability>;
  preload(format: AdFormat, placement: AdPlacement): Promise<void>;
  showInterstitial(placement: AdPlacement): Promise<AdShowResult>;
  showRewarded(
    placement: AdPlacement,
    reward: RewardedAdReward,
    requestId: string,
  ): Promise<AdShowResult>;
  close(): void;
}

export type StoreProduct = {
  id: ProductId;
  title: string;
  description: string;
  displayPrice: string;
};

export type VerifiedTransaction = {
  productId: ProductId;
  platform: 'ios' | 'android';
  transactionId: string;
  originalTransactionId: string | null;
  purchasedAtEpochMs: number;
  verifiedAtEpochMs: number;
  status: 'active' | 'revoked';
  verification: 'platform_verified';
};

export type PurchaseResult =
  | { status: 'purchased'; transaction: VerifiedTransaction }
  | { status: 'pending' }
  | { status: 'cancelled' }
  | { status: 'unavailable'; reason: string }
  | { status: 'failed'; errorCode: string };

export type RestoreResult =
  | { status: 'restored'; transactions: readonly VerifiedTransaction[] }
  | { status: 'nothing_to_restore' }
  | { status: 'unavailable'; reason: string }
  | { status: 'failed'; errorCode: string };

export type EntitlementRefreshResult =
  | { status: 'verified'; transactions: readonly VerifiedTransaction[] }
  | { status: 'unavailable'; reason: string }
  | { status: 'failed'; errorCode: string };

export interface PurchaseGateway {
  initialize(): Promise<void>;
  getProducts(ids: readonly ProductId[]): Promise<readonly StoreProduct[]>;
  purchase(productId: ProductId): Promise<PurchaseResult>;
  restorePurchases(): Promise<RestoreResult>;
  refreshEntitlements(): Promise<EntitlementRefreshResult>;
  subscribeToTransactions(
    listener: (transaction: VerifiedTransaction) => void,
  ): () => void;
  finishTransaction(transactionId: string): Promise<void>;
  close(): void;
}

export type EntitlementStatus = 'unknown' | 'free' | 'premium';

export type EntitlementSnapshot = {
  status: EntitlementStatus;
  source: 'none' | 'local_cache' | 'store_verified';
  refreshing: boolean;
  lastVerifiedAtEpochMs: number | null;
  originalTransactionId: string | null;
};

export type CommercialWalletBalance = {
  resource: CreditResource;
  balance: number;
  earnedTotal: number;
  spentTotal: number;
};

export type StoredEntitlement = {
  productId: string;
  entitlement: string;
  platform: 'ios' | 'android';
  active: boolean;
  originalTransactionId: string | null;
  lastVerifiedAtEpochMs: number;
};

export type CommercialCreditGrantResult = {
  credited: number;
  wallet: Readonly<Record<CreditResource, CommercialWalletBalance>>;
};

export type CommercialStartingInventoryResult = {
  quickPencilCredited: number;
  smartHintCredited: number;
  wallet: Readonly<Record<CreditResource, CommercialWalletBalance>>;
};

export interface CommercialStore {
  readWallet(): Promise<
    Readonly<Record<CreditResource, CommercialWalletBalance>>
  >;
  getEntitlement(productId: string): Promise<StoredEntitlement | null>;
  upsertEntitlement(entitlement: StoredEntitlement): Promise<void>;
  redeemRewardedAdCredit(
    resource: CreditResource,
    rewardedAtEpochMs: number,
    externalEventId: string,
  ): Promise<CommercialCreditGrantResult>;
  recordInitialPremiumPurchase(
    entitlement: StoredEntitlement,
    eventId: string,
  ): Promise<CommercialStartingInventoryResult>;
}

export interface CommercialPlaybackObserver {
  onPlaybackStart(): Promise<void> | void;
  onPlaybackEnd(): Promise<void> | void;
}

export type CommercialSnapshot = {
  entitlement: EntitlementSnapshot;
  products: readonly StoreProduct[];
  wallet: Readonly<Record<CreditResource, CommercialWalletBalance>> | null;
  purchaseBusy: boolean;
  restoreBusy: boolean;
  rewardedAdBusy: boolean;
};

export type RewardedAdRedemptionResult =
  | { status: 'credited'; grant: CommercialCreditGrantResult }
  | { status: 'dismissed' }
  | { status: 'unavailable'; reason: string }
  | { status: 'failed'; errorCode: string };
