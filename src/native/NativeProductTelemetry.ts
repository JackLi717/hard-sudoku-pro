import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  configure(analytics: boolean, diagnostics: boolean): Promise<boolean>;
  logEvent(name: string, parametersJson: string): void;
  recordError(operation: string, fatal: boolean, framesJson: string): void;
}
export default TurboModuleRegistry.get<Spec>('ProductTelemetry');
