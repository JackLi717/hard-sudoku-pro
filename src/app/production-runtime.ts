import {
  OfflineGameCoordinator,
  OfflineTestAccessAdapter,
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
    return {
      coordinator,
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
