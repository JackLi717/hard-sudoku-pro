import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type HardwareKeyEvent = {
  key: string;
  control: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
};

export interface Spec extends TurboModule {
  setKeepAwake(enabled: boolean): void;
  playClick(): void;
  setHardwareInputEnabled(enabled: boolean): void;
  readonly onHardwareKey: CodegenTypes.EventEmitter<HardwareKeyEvent>;
}

export default TurboModuleRegistry.get<Spec>('ProductExperience');
