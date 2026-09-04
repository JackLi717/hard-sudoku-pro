import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  enumerateSteps(
    requestId: string,
    boardFingerprint: string,
    candidateMasks: string,
    givenCells: string,
  ): Promise<string>;
  nextStep(
    requestId: string,
    boardFingerprint: string,
    candidateMasks: string,
    givenCells: string,
  ): Promise<string>;
  explainOpportunityEffects(
    requestId: string,
    boardFingerprint: string,
    candidateMasks: string,
    givenCells: string,
    observedEffects: string,
  ): Promise<string>;
  cancel(requestId: string): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('HintEngine');
