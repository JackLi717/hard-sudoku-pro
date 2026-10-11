import type { AnalyticsParameters } from '../analytics/contracts';

const KNOWN_CODES = new Set([
  'E_STORE_OFFLINE',
  'E_NETWORK',
  'E_STORE_UNAVAILABLE',
  'E_PRODUCT_UNAVAILABLE',
  'E_PRODUCT_NO_OFFER',
  'E_INVALID_STORE_RESPONSE',
]);
const STAGES = new Set([
  'connect',
  'query_product',
  'select_offer',
  'decode_product',
]);

/** Keep only platform codes, never platform messages, account data or credentials. */
export function productLoadDiagnostics(
  error: unknown,
  entry: 'startup' | 'premium_page',
): AnalyticsParameters {
  const candidate =
    error && typeof error === 'object'
      ? (error as {
          code?: unknown;
          userInfo?: {
            stage?: unknown;
            billingResponse?: unknown;
            unfetchedStatus?: unknown;
          };
        })
      : {};
  const code = typeof candidate.code === 'string' ? candidate.code : '';
  const billingCode = /^billing_(-2|-1|[0-8]|12)$/.exec(code)?.[1];
  const info = candidate.userInfo;
  const response =
    typeof info?.billingResponse === 'number' &&
    [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 12].includes(info.billingResponse)
      ? String(info.billingResponse)
      : billingCode;
  const stage =
    typeof info?.stage === 'string' && STAGES.has(info.stage)
      ? info.stage
      : 'unknown';
  let reason = 'unexpected';
  if (
    response === '-1' ||
    response === '12' ||
    code === 'E_STORE_OFFLINE' ||
    code === 'E_NETWORK'
  )
    reason = 'offline';
  else if (
    response === '2' ||
    response === '3' ||
    code === 'E_STORE_UNAVAILABLE'
  )
    reason = 'store_unavailable';
  else if (
    response === '4' ||
    code === 'E_PRODUCT_UNAVAILABLE' ||
    code === 'E_PRODUCT_NO_OFFER'
  )
    reason = 'product_unavailable';
  else if (response === '-2') reason = 'feature_unsupported';
  else if (response === '5') reason = 'developer_error';
  else if (code === 'E_INVALID_STORE_RESPONSE')
    reason = 'invalid_store_response';
  return {
    product: 'lifetime_premium',
    entry,
    stage,
    reason,
    attempts: 1,
    error_code: billingCode ? code : KNOWN_CODES.has(code) ? code : 'unknown',
    ...(response !== undefined ? { billing_response: response } : {}),
    ...(typeof info?.unfetchedStatus === 'number' &&
    [0, 1, 2, 3, 4].includes(info.unfetchedStatus)
      ? { unfetched_status: info.unfetchedStatus }
      : {}),
  };
}
