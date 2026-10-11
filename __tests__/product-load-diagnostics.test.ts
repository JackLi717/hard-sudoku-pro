import { productLoadDiagnostics } from '../src/application/commercial/product-load-diagnostics';

test.each([
  [-1, 'offline'],
  [12, 'offline'],
  [2, 'store_unavailable'],
  [3, 'store_unavailable'],
  [-2, 'feature_unsupported'],
  [5, 'developer_error'],
])(
  'classifies Billing response %s without platform text',
  (response, reason) => {
    const diagnostic = productLoadDiagnostics(
      Object.assign(new Error('private account and token'), {
        code: `billing_${response}`,
        userInfo: {
          stage: 'connect',
          billingResponse: response,
          token: 'secret',
        },
      }),
      'startup',
    );
    expect(diagnostic).toMatchObject({
      reason,
      entry: 'startup',
      stage: 'connect',
      billing_response: String(response),
    });
    expect(JSON.stringify(diagnostic)).not.toMatch(/private|secret|token/);
  },
);

test('preserves the per-product failure when a query succeeds without an eligible product', () => {
  expect(
    productLoadDiagnostics(
      {
        code: 'E_PRODUCT_UNAVAILABLE',
        userInfo: {
          stage: 'query_product',
          billingResponse: 0,
          unfetchedStatus: 4,
        },
      },
      'premium_page',
    ),
  ).toMatchObject({
    reason: 'product_unavailable',
    error_code: 'E_PRODUCT_UNAVAILABLE',
    billing_response: '0',
    unfetched_status: 4,
  });
});

test('discards unknown codes, arbitrary stages and out-of-range platform fields', () => {
  expect(
    productLoadDiagnostics(
      {
        code: 'private-email@example.com',
        userInfo: {
          stage: 'private-file-path',
          billingResponse: 999,
          unfetchedStatus: 999,
        },
      },
      'premium_page',
    ),
  ).toEqual({
    product: 'lifetime_premium',
    entry: 'premium_page',
    stage: 'unknown',
    reason: 'unexpected',
    attempts: 1,
    error_code: 'unknown',
  });
});
