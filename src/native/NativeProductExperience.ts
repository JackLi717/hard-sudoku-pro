import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  setKeepAwake(enabled: boolean): void;
  playClick(): void;
}

export default TurboModuleRegistry.get<Spec>('ProductExperience');
