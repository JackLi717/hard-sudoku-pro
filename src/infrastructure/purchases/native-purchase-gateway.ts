import type {
  EntitlementRefreshResult,
  ProductId,
  PurchaseGateway,
  PurchaseResult,
  RestoreResult,
  StoreProduct,
  VerifiedTransaction,
} from '../../application/commercial/contracts';
import { PREMIUM_PRODUCT_ID } from '../../application/commercial/contracts';
import NativePremiumPurchase from '../../native/NativePremiumPurchase';

export type NativePurchaseModule = NonNullable<typeof NativePremiumPurchase>;
type TransactionListener = (transaction: VerifiedTransaction) => void;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseJson(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseTransaction(value: unknown): VerifiedTransaction | null {
  const candidate = record(value);
  if (
    !candidate ||
    candidate.productId !== PREMIUM_PRODUCT_ID ||
    (candidate.platform !== 'ios' && candidate.platform !== 'android') ||
    !isString(candidate.transactionId) ||
    !isString(candidate.completionCredential) ||
    (candidate.originalTransactionId !== null &&
      !isString(candidate.originalTransactionId)) ||
    typeof candidate.purchasedAtEpochMs !== 'number' ||
    !Number.isFinite(candidate.purchasedAtEpochMs) ||
    typeof candidate.verifiedAtEpochMs !== 'number' ||
    !Number.isFinite(candidate.verifiedAtEpochMs) ||
    (candidate.status !== 'active' && candidate.status !== 'revoked') ||
    candidate.verification !== 'platform_verified'
  ) {
    return null;
  }
  return candidate as VerifiedTransaction;
}

function parseTransactions(
  value: unknown,
): readonly VerifiedTransaction[] | null {
  if (!Array.isArray(value)) return null;
  const transactions = value.map(parseTransaction);
  return transactions.every(
    (transaction): transaction is VerifiedTransaction => transaction !== null,
  )
    ? transactions
    : null;
}

function nativeErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String(error.code);
  }
  return 'native_store_error';
}

function unavailableReason(error: unknown): string {
  const code = nativeErrorCode(error).toLowerCase();
  return code.includes('network') || code.includes('disconnect')
    ? 'offline'
    : 'store_unavailable';
}

function parsePurchase(payload: string): PurchaseResult {
  const candidate = record(parseJson(payload));
  if (!candidate || !isString(candidate.status)) {
    return { status: 'failed', errorCode: 'invalid_store_response' };
  }
  if (candidate.status === 'purchased') {
    const transaction = parseTransaction(candidate.transaction);
    return transaction
      ? { status: 'purchased', transaction }
      : { status: 'failed', errorCode: 'invalid_transaction' };
  }
  if (candidate.status === 'pending' || candidate.status === 'cancelled') {
    return { status: candidate.status };
  }
  if (candidate.status === 'unavailable' && isString(candidate.reason)) {
    return { status: 'unavailable', reason: candidate.reason };
  }
  if (candidate.status === 'failed' && isString(candidate.errorCode)) {
    return { status: 'failed', errorCode: candidate.errorCode };
  }
  return { status: 'failed', errorCode: 'invalid_store_response' };
}

function parseRestore(payload: string): RestoreResult {
  const candidate = record(parseJson(payload));
  if (!candidate || !isString(candidate.status)) {
    return { status: 'failed', errorCode: 'invalid_store_response' };
  }
  if (candidate.status === 'restored') {
    const transactions = parseTransactions(candidate.transactions);
    return transactions
      ? { status: 'restored', transactions }
      : { status: 'failed', errorCode: 'invalid_transaction' };
  }
  if (candidate.status === 'nothing_to_restore') {
    return { status: 'nothing_to_restore' };
  }
  if (candidate.status === 'unavailable' && isString(candidate.reason)) {
    return { status: 'unavailable', reason: candidate.reason };
  }
  if (candidate.status === 'failed' && isString(candidate.errorCode)) {
    return { status: 'failed', errorCode: candidate.errorCode };
  }
  return { status: 'failed', errorCode: 'invalid_store_response' };
}

function parseRefresh(payload: string): EntitlementRefreshResult {
  const candidate = record(parseJson(payload));
  if (!candidate || !isString(candidate.status)) {
    return { status: 'failed', errorCode: 'invalid_store_response' };
  }
  if (candidate.status === 'verified') {
    const transactions = parseTransactions(candidate.transactions);
    return transactions
      ? { status: 'verified', transactions }
      : { status: 'failed', errorCode: 'invalid_transaction' };
  }
  if (
    candidate.status === 'not_entitled' &&
    (candidate.platform === 'ios' || candidate.platform === 'android') &&
    typeof candidate.verifiedAtEpochMs === 'number' &&
    Number.isFinite(candidate.verifiedAtEpochMs)
  ) {
    return {
      status: 'not_entitled',
      platform: candidate.platform,
      verifiedAtEpochMs: candidate.verifiedAtEpochMs,
    };
  }
  if (candidate.status === 'unavailable' && isString(candidate.reason)) {
    return { status: 'unavailable', reason: candidate.reason };
  }
  if (candidate.status === 'failed' && isString(candidate.errorCode)) {
    return { status: 'failed', errorCode: candidate.errorCode };
  }
  return { status: 'failed', errorCode: 'invalid_store_response' };
}

export class NativePurchaseGateway implements PurchaseGateway {
  private initialization: Promise<boolean> | null = null;
  private initializationFailureReason = 'store_unavailable';
  private initialized = false;
  private closed = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private polling = false;
  private purchaseInFlight = false;
  private listeners = new Set<TransactionListener>();
  private directPurchaseCredentials = new Set<string>();

  constructor(
    private readonly nativeModule: NativePurchaseModule | null = NativePremiumPurchase ??
      null,
    private readonly pollIntervalMs = 1_000,
  ) {}

  async initialize(): Promise<void> {
    if (await this.ensureInitialized()) return;
    const error = new Error('The native store could not initialize.');
    Object.assign(error, {
      code:
        this.initializationFailureReason === 'offline'
          ? 'E_STORE_OFFLINE'
          : 'E_STORE_UNAVAILABLE',
    });
    throw error;
  }

  async getProducts(
    ids: readonly ProductId[],
  ): Promise<readonly StoreProduct[]> {
    if (!ids.includes(PREMIUM_PRODUCT_ID)) return [];
    const native = await this.readyModule();
    if (!native) return [];
    const candidate = record(parseJson(await native.getPremiumProduct()));
    if (
      !candidate ||
      candidate.id !== PREMIUM_PRODUCT_ID ||
      typeof candidate.title !== 'string' ||
      typeof candidate.description !== 'string' ||
      !isString(candidate.displayPrice)
    ) {
      return [];
    }
    return [candidate as StoreProduct];
  }

  async purchase(productId: ProductId): Promise<PurchaseResult> {
    if (productId !== PREMIUM_PRODUCT_ID) {
      return { status: 'unavailable', reason: 'unsupported_product' };
    }
    const native = await this.readyModule();
    if (!native) return this.unavailableResult();
    this.purchaseInFlight = true;
    try {
      const result = parsePurchase(await native.purchasePremium());
      if (result.status === 'purchased') {
        this.directPurchaseCredentials.add(
          result.transaction.completionCredential,
        );
      }
      return result;
    } catch (error) {
      return { status: 'unavailable', reason: unavailableReason(error) };
    } finally {
      this.purchaseInFlight = false;
    }
  }

  async restorePurchases(): Promise<RestoreResult> {
    const native = await this.readyModule();
    if (!native) return this.unavailableResult();
    try {
      return parseRestore(await native.restorePremium());
    } catch (error) {
      return { status: 'unavailable', reason: unavailableReason(error) };
    }
  }

  async refreshEntitlements(): Promise<EntitlementRefreshResult> {
    const native = await this.readyModule();
    if (!native) return this.unavailableResult();
    try {
      return parseRefresh(await native.refreshPremiumEntitlement());
    } catch (error) {
      return { status: 'unavailable', reason: unavailableReason(error) };
    }
  }

  subscribeToTransactions(listener: TransactionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async finishTransaction(completionCredential: string): Promise<void> {
    if (!isString(completionCredential)) {
      throw new Error('A completion credential is required.');
    }
    const native = await this.readyModule();
    if (!native) throw new Error('The native store is unavailable.');
    await native.finishTransaction(completionCredential);
  }

  close(): void {
    this.closed = true;
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.listeners.clear();
    this.directPurchaseCredentials.clear();
    this.nativeModule?.close();
  }

  private async ensureInitialized(): Promise<boolean> {
    if (this.closed || !this.nativeModule) return false;
    if (this.initialized) return true;
    if (!this.initialization) {
      this.initialization = this.nativeModule
        .initialize()
        .then(() => {
          if (this.closed) return false;
          this.initialized = true;
          this.initializationFailureReason = 'store_unavailable';
          this.startPolling();
          return true;
        })
        .catch(error => {
          this.initializationFailureReason = unavailableReason(error);
          return false;
        })
        .finally(() => {
          this.initialization = null;
        });
    }
    return this.initialization;
  }

  private async readyModule(): Promise<NativePurchaseModule | null> {
    return (await this.ensureInitialized()) ? this.nativeModule : null;
  }

  private unavailableResult(): { status: 'unavailable'; reason: string } {
    return {
      status: 'unavailable',
      reason: this.nativeModule
        ? this.initializationFailureReason
        : 'sdk_unavailable',
    };
  }

  private startPolling(): void {
    if (this.pollTimer || this.closed) return;
    this.pollUpdates().catch(() => undefined);
    this.pollTimer = setInterval(() => {
      this.pollUpdates().catch(() => undefined);
    }, this.pollIntervalMs);
  }

  private async pollUpdates(): Promise<void> {
    if (
      this.polling ||
      this.purchaseInFlight ||
      this.closed ||
      !this.nativeModule
    )
      return;
    this.polling = true;
    try {
      const transactions = parseTransactions(
        parseJson(await this.nativeModule.drainTransactionUpdates()),
      );
      if (!transactions) return;
      for (const transaction of transactions) {
        if (
          this.directPurchaseCredentials.has(transaction.completionCredential)
        ) {
          continue;
        }
        this.listeners.forEach(listener => listener(transaction));
      }
    } finally {
      this.polling = false;
    }
  }
}

export function createProductionPurchaseGateway(): PurchaseGateway {
  return new NativePurchaseGateway();
}
