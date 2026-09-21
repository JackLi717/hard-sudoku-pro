/**
 * Review access is deliberately session-only: it never creates a purchase
 * record, modifies the wallet, or survives an app restart. The code is shared
 * only with Google Play in the App access declaration.
 */
export const REVIEWER_ACCESS_EXPIRES_AT_EPOCH_MS = Date.UTC(
  2027,
  2,
  31,
  23,
  59,
  59,
);

const REVIEWER_ACCESS_CODE = 'PLATON-REVIEW-9F7K-3MVT-8Q2H-6XLR';

export function validateReviewerAccess(
  code: string,
  now: number,
): 'granted' | 'invalid' | 'expired' {
  if (now > REVIEWER_ACCESS_EXPIRES_AT_EPOCH_MS) return 'expired';
  return code.trim().toUpperCase() === REVIEWER_ACCESS_CODE
    ? 'granted'
    : 'invalid';
}
