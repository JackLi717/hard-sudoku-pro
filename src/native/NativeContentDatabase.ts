import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  installBundledContentDatabase(
    assetName: string,
    targetName: string,
    expectedSha256: string,
  ): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ContentDatabase');
