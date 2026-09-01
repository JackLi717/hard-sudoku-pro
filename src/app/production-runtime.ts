import {
  OfflineGameCoordinator,
  OfflineTestAccessAdapter,
  ProductPreferencesController,
} from '../application';
import {
  ContentRepository,
  UserRepository,
  openProductionContentDatabase,
  openUserRepository,
} from '../data';
import { hintEngine } from '../domain/hints/native-engine';

export type ProductionRuntime = {
  coordinator: OfflineGameCoordinator;
  preferences: ProductPreferencesController;
  close(): void;
};

export async function createProductionRuntime(): Promise<ProductionRuntime> {
  let content: ContentRepository | null = null;
  let players: UserRepository | null = null;
  try {
    content = await openProductionContentDatabase();
    players = await openUserRepository(Date.now());
    const coordinator = new OfflineGameCoordinator(
      content,
      players,
      hintEngine,
      new OfflineTestAccessAdapter(false),
    );
    const preferences = new ProductPreferencesController(players);
    return {
      coordinator,
      preferences,
      close() {
        content?.close();
        players?.close();
        content = null;
        players = null;
      },
    };
  } catch (error) {
    content?.close();
    players?.close();
    throw error;
  }
}
