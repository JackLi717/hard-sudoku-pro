import type {
  AdAvailability,
  AdFormat,
  AdGateway,
  AdPlacement,
  AdShowResult,
  EntitlementRefreshResult,
  ProductId,
  PurchaseGateway,
  PurchaseResult,
  RestoreResult,
  RewardedAdReward,
  StoreProduct,
  VerifiedTransaction,
} from './contracts';

const SDK_UNAVAILABLE: AdAvailability = {
  status: 'unavailable',
  reason: 'sdk_unavailable',
};

export class NoopAdGateway implements AdGateway {
  async initialize(): Promise<void> {}

  async getAvailability(
    _format: AdFormat,
    _placement: AdPlacement,
  ): Promise<AdAvailability> {
    return SDK_UNAVAILABLE;
  }

  async preload(_format: AdFormat, _placement: AdPlacement): Promise<void> {}

  async showInterstitial(_placement: AdPlacement): Promise<AdShowResult> {
    return { status: 'unavailable', reason: 'sdk_unavailable' };
  }

  async showRewarded(
    _placement: AdPlacement,
    _reward: RewardedAdReward,
    _requestId: string,
  ): Promise<AdShowResult> {
    return { status: 'unavailable', reason: 'sdk_unavailable' };
  }

  close(): void {}
}

export class NoopPurchaseGateway implements PurchaseGateway {
  async initialize(): Promise<void> {}

  async getProducts(
    _ids: readonly ProductId[],
  ): Promise<readonly StoreProduct[]> {
    return [];
  }

  async purchase(_productId: ProductId): Promise<PurchaseResult> {
    return { status: 'unavailable', reason: 'sdk_unavailable' };
  }

  async restorePurchases(): Promise<RestoreResult> {
    return { status: 'unavailable', reason: 'sdk_unavailable' };
  }

  async refreshEntitlements(): Promise<EntitlementRefreshResult> {
    return { status: 'unavailable', reason: 'sdk_unavailable' };
  }

  subscribeToTransactions(
    _listener: (transaction: VerifiedTransaction) => void,
  ): () => void {
    return () => undefined;
  }

  async finishTransaction(_transactionId: string): Promise<void> {}

  close(): void {}
}
