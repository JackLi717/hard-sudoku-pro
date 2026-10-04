import { AD_HINT_REWARD } from '../../domain/game/hint-rewards';
import { CREDIT_CAP, type CreditResource } from '../../domain/game/contracts';
import type { AdAvailability, EntitlementSnapshot } from './contracts';

export function rewardedAdPolicy(
  entitlement: EntitlementSnapshot,
  resource: CreditResource,
  balance: number,
): AdAvailability | null {
  if (entitlement.status === 'premium') {
    return { status: 'disabled', reason: 'premium' };
  }
  if (resource === 'quick_pencil') {
    return { status: 'disabled', reason: 'free_feature' };
  }
  if (balance > CREDIT_CAP - AD_HINT_REWARD) {
    return { status: 'disabled', reason: 'inventory_full' };
  }
  return null;
}
