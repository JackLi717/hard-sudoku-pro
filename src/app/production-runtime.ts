import {
  BehaviorShadowController,
  OfflineGameCoordinator,
  OfflineTestAccessAdapter,
  ProductPreferencesController,
} from '../application';
import {
  BehaviorShadowStore,
  ContentRepository,
  UserRepository,
  openProductionContentDatabase,
  openUserRepository,
} from '../data';
import { hintEngine } from '../domain/hints/native-engine';
import { ReactNativeTechniqueOpportunityAnalyzer } from '../domain/technique-recognition/native-analyzer';

export type ProductionRuntime = {
  coordinator: OfflineGameCoordinator;
  preferences: ProductPreferencesController;
  close(): void;
};

export async function createProductionRuntime(): Promise<ProductionRuntime> {
  let content: ContentRepository | null = null;
  let players: UserRepository | null = null;
  let behaviorShadowStore: BehaviorShadowStore | null = null;
  let behaviorShadow: BehaviorShadowController | null = null;
  try {
    content = await openProductionContentDatabase();
    players = await openUserRepository(Date.now());
    try {
      behaviorShadowStore = new BehaviorShadowStore();
      behaviorShadow = new BehaviorShadowController(
        new ReactNativeTechniqueOpportunityAnalyzer(),
        behaviorShadowStore,
      );
      behaviorShadowStore.initialize().catch(() => undefined);
    } catch {
      behaviorShadowStore = null;
      behaviorShadow = null;
    }
    const coordinator = new OfflineGameCoordinator(
      content,
      players,
      hintEngine,
      new OfflineTestAccessAdapter(false),
      Date.now,
      undefined,
      behaviorShadow ?? undefined,
    );
    const preferences = new ProductPreferencesController(players);
    return {
      coordinator,
      preferences,
      close() {
        content?.close();
        players?.close();
        behaviorShadow?.close();
        behaviorShadowStore?.close();
        content = null;
        players = null;
        behaviorShadow = null;
        behaviorShadowStore = null;
      },
    };
  } catch (error) {
    content?.close();
    players?.close();
    behaviorShadow?.close();
    behaviorShadowStore?.close();
    throw error;
  }
}
