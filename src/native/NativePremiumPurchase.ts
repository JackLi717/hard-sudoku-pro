import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  initialize(): Promise<void>;
  getPremiumProduct(): Promise<string>;
  purchasePremium(): Promise<string>;
  restorePremium(): Promise<string>;
  refreshPremiumEntitlement(): Promise<string>;
  drainTransactionUpdates(): Promise<string>;
  finishTransaction(completionCredential: string): Promise<void>;
  close(): void;
}

export default TurboModuleRegistry.get<Spec>('PremiumPurchase');
