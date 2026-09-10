import type { Spec as NativePremiumPurchaseSpec } from '../src/native/NativePremiumPurchase';
import {
  NativePurchaseGateway,
  type NativePurchaseModule,
} from '../src/infrastructure/purchases';

function transaction(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    productId: 'premium',
    platform: 'ios',
    transactionId: 'transaction-1',
    completionCredential: 'finish-1',
    originalTransactionId: 'original-1',
    purchasedAtEpochMs: 100,
    verifiedAtEpochMs: 200,
    status: 'active',
    verification: 'platform_verified',
    ...overrides,
  };
}

class FakeNativeStore implements NativePremiumPurchaseSpec {
  product = {
    id: 'premium',
    title: 'Premium',
    description: 'Permanent Premium',
    displayPrice: 'A$9.99',
  };
  purchaseResult: Record<string, unknown> = { status: 'pending' };
  restoreResult: Record<string, unknown> = {
    status: 'nothing_to_restore',
  };
  refreshResult: Record<string, unknown> = {
    status: 'unavailable',
    reason: 'offline',
  };
  updates: Record<string, unknown>[] = [];
  finished: string[] = [];
  closed = false;
  initialization: Promise<void> = Promise.resolve();

  async initialize(): Promise<void> {
    return this.initialization;
  }

  async getPremiumProduct(): Promise<string> {
    return JSON.stringify(this.product);
  }

  async purchasePremium(): Promise<string> {
    return JSON.stringify(this.purchaseResult);
  }

  async restorePremium(): Promise<string> {
    return JSON.stringify(this.restoreResult);
  }

  async refreshPremiumEntitlement(): Promise<string> {
    return JSON.stringify(this.refreshResult);
  }

  async drainTransactionUpdates(): Promise<string> {
    const updates = this.updates;
    this.updates = [];
    return JSON.stringify(updates);
  }

  async finishTransaction(completionCredential: string): Promise<void> {
    this.finished.push(completionCredential);
  }

  close(): void {
    this.closed = true;
  }
}

function gateway(native = new FakeNativeStore()) {
  return {
    gateway: new NativePurchaseGateway(native as NativePurchaseModule, 5),
    native,
  };
}

describe('NativePurchaseGateway', () => {
  test('returns the store-localized live price', async () => {
    const setup = gateway();

    await expect(setup.gateway.getProducts(['premium'])).resolves.toEqual([
      setup.native.product,
    ]);
    setup.gateway.close();
  });

  test.each(['pending', 'cancelled'] as const)(
    'keeps %s distinct from a completed purchase',
    async status => {
      const setup = gateway();
      setup.native.purchaseResult = { status };

      await expect(setup.gateway.purchase('premium')).resolves.toEqual({
        status,
      });
      setup.gateway.close();
    },
  );

  test('accepts only a fully normalized platform-verified Premium transaction', async () => {
    const setup = gateway();
    setup.native.purchaseResult = {
      status: 'purchased',
      transaction: transaction(),
    };

    await expect(setup.gateway.purchase('premium')).resolves.toMatchObject({
      status: 'purchased',
      transaction: { completionCredential: 'finish-1' },
    });
    setup.native.purchaseResult = {
      status: 'purchased',
      transaction: transaction({ productId: 'wrong-product' }),
    };
    await expect(setup.gateway.purchase('premium')).resolves.toEqual({
      status: 'failed',
      errorCode: 'invalid_transaction',
    });
    setup.gateway.close();
  });

  test('normalizes restore, revocation, and authoritative not-entitled results', async () => {
    const setup = gateway();
    setup.native.restoreResult = {
      status: 'restored',
      transactions: [transaction()],
    };
    setup.native.refreshResult = {
      status: 'verified',
      transactions: [transaction({ status: 'revoked' })],
    };

    await expect(setup.gateway.restorePurchases()).resolves.toMatchObject({
      status: 'restored',
    });
    await expect(setup.gateway.refreshEntitlements()).resolves.toMatchObject({
      status: 'verified',
      transactions: [{ status: 'revoked' }],
    });
    setup.native.refreshResult = {
      status: 'not_entitled',
      platform: 'android',
      verifiedAtEpochMs: 300,
    };
    await expect(setup.gateway.refreshEntitlements()).resolves.toEqual(
      setup.native.refreshResult,
    );
    setup.gateway.close();
  });

  test('delivers verified deferred transactions but suppresses a direct purchase duplicate', async () => {
    const setup = gateway();
    const listener = jest.fn();
    setup.gateway.subscribeToTransactions(listener);
    setup.native.purchaseResult = {
      status: 'purchased',
      transaction: transaction(),
    };
    await setup.gateway.purchase('premium');
    setup.native.updates.push(transaction());
    setup.native.updates.push(
      transaction({
        transactionId: 'transaction-2',
        completionCredential: 'finish-2',
      }),
    );

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ completionCredential: 'finish-2' }),
    );
    setup.gateway.close();
  });

  test('fails closed when the native store cannot initialize', async () => {
    const setup = gateway();
    setup.native.initialization = Promise.reject(
      Object.assign(new Error('offline'), { code: 'E_NETWORK' }),
    );

    await expect(setup.gateway.purchase('premium')).resolves.toEqual({
      status: 'unavailable',
      reason: 'offline',
    });
    setup.gateway.close();
    expect(setup.native.closed).toBe(true);
  });
});
