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
  if (balance >= CREDIT_CAP) {
    return { status: 'disabled', reason: 'inventory_full' };
  }
  return null;
}
