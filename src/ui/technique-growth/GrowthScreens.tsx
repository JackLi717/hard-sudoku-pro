import React, { useEffect, useState } from 'react';
import { TechniqueGrowthController } from '../../application/technique-growth/controller';
import {
  GrowthReference,
  GrowthViewModel,
} from '../../application/technique-growth/contracts';
import { buildGrowthViewModel } from '../../application/technique-growth/view-model';
import { SessionReplaySource } from '../../application/game/session-replay-source';
import { TechniqueCollection } from './TechniqueCollection';
import { SessionFootprint } from './SessionFootprint';
export { GrowthSummary } from './GrowthEntrySummary';
export function useGrowth(controller?: TechniqueGrowthController) {
  const [vm, setVm] = useState<GrowthViewModel>(
    () => controller?.snapshot ?? buildGrowthViewModel([]),
  );
  useEffect(() => controller?.subscribe(setVm), [controller]);
  return vm;
}

export function GrowthScreens({
  controller,
  vm,
  initialSessionId,
  source,
  onClose,
  onReplay,
  onStart,
  hidden = false,
}: {
  controller: TechniqueGrowthController;
  vm: GrowthViewModel;
  initialSessionId?: string;
  source?: SessionReplaySource;
  onClose(): void;
  onReplay(ref: GrowthReference): void;
  onStart(): void;
  hidden?: boolean;
}) {
  if (!initialSessionId)
    return (
      <TechniqueCollection
        controller={controller}
        vm={vm}
        source={source}
        onClose={onClose}
        onReplay={onReplay}
        onStart={onStart}
        hidden={hidden}
      />
    );
  return (
    <SessionFootprint
      key={initialSessionId}
      controller={controller}
      vm={vm}
      sessionId={initialSessionId}
      source={source}
      onClose={onClose}
      onReplay={onReplay}
      hidden={hidden}
    />
  );
}
