import { TechniqueGrowthController } from '../application/technique-growth/controller';
import { explainReplayMove } from '../application/game/native-replay-explanations';
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
import type { SessionReviewSource } from '../application/technique-recognition/session-review';
import { NitroSqliteDatabase } from '../data/sqlite/nitro-database';
import type { TechniqueOpportunityAnalyzer } from '../domain/technique-recognition/contracts';
import type { SessionReplaySource } from '../application/game/session-replay-source';

export type ProductionRuntime = {
  growth?: TechniqueGrowthController;
  coordinator: OfflineGameCoordinator;
  preferences: ProductPreferencesController;
  sessionReview?: SessionReviewSource;
  sessionReviewAnalyzer?: TechniqueOpportunityAnalyzer;
  sessionReplay?: SessionReplaySource;
  close(): void;
};

export async function createProductionRuntime(): Promise<ProductionRuntime> {
  // A disposed runtime closes databases after queued work drains. Fast Refresh
  // must wait for that close, not race opening the same native database names.
  await NitroSqliteDatabase.waitForPendingCloses();
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
    const sessionReplay: SessionReplaySource = {
      readReplaySession: players.readReplaySession.bind(players),
      listReplaySessions: players.listReplaySessions.bind(players),
      explainReplayMove,
    };
    const growth = new TechniqueGrowthController(
      players.growth,
      players,
      sessionReplay,
      behaviorShadowStore ?? undefined,
      new ReactNativeTechniqueOpportunityAnalyzer(),
    );
    let lastRevision = -1;
    let lastSessionId = '';
    let lastHints = 0;
    const stopGrowth = coordinator.subscribe(snapshot => {
      growth.setBlocked(snapshot.screen === 'game' || snapshot.busy);
      const session = snapshot.session;
      if (
        session &&
        (session.state.revision !== lastRevision ||
          session.state.sessionId !== lastSessionId)
      ) {
        const changed = session.state.sessionId !== lastSessionId;
        lastRevision = session.state.revision;
        lastSessionId = session.state.sessionId;
        if (
          changed ||
          session.state.hintUseCount !== lastHints ||
          snapshot.screen === 'result'
        )
          growth.refreshLearning(session).catch(() => undefined);
        lastHints = session.state.hintUseCount;
        growth.enqueue(lastSessionId);
      }
    });
    growth.initialize().catch(() => undefined);
    return {
      growth,
      coordinator,
      preferences,
      sessionReview: __DEV__ ? behaviorShadowStore ?? undefined : undefined,
      sessionReviewAnalyzer: __DEV__
        ? new ReactNativeTechniqueOpportunityAnalyzer()
        : undefined,
      sessionReplay,
      close() {
        stopGrowth();
        growth.close();
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
