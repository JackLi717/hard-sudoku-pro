import {
  productLoadDiagnostics,
  productLoadEnvironmentParameters,
} from '../src/application/commercial/product-load-diagnostics';
import { sanitizeParameters } from '../src/application/analytics/contracts';

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

test('keeps capability-check failures and safe Play environment fields queryable', () => {
  const parameters = productLoadDiagnostics(
    {
      code: 'billing_-2',
      userInfo: {
        stage: 'check_feature',
        billingResponse: -2,
        productDetailsSupport: 'unsupported',
        playStoreVersion: '85312910',
        playServicesVersion: '261234000',
        testEnvironment: 'test_lab',
        account: 'private@example.com',
      },
    },
    'startup',
  );
  expect(sanitizeParameters(parameters)).toMatchObject({
    stage: 'check_feature',
    billing_response: '-2',
    reason: 'feature_unsupported',
    product_details_support: 'unsupported',
    play_store_version: '85312910',
    play_services_version: '261234000',
    test_environment: 'test_lab',
  });
  expect(JSON.stringify(parameters)).not.toContain('private');
});

test('rejects arbitrary environment text at both native and analytics boundaries', () => {
  expect(
    productLoadEnvironmentParameters({
      productDetailsSupport: 'private',
      playStoreVersion: 'email@example.com',
      playServicesVersion: '-1',
      testEnvironment: 'https://private.example',
      token: 'secret',
    }),
  ).toEqual({});
  expect(
    sanitizeParameters({
      product_details_support: 'private',
      play_store_version: 'email@example.com',
      play_services_version: '12345678901234567890',
      test_environment: 'secret',
    }),
  ).toEqual({});
});
