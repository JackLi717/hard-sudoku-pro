import { explainReplayMove } from '../application/game/native-replay-explanations';
import { analyzeReplayBoard } from '../application/game/native-replay-board-analysis';
import {
  BehaviorShadowController,
  CommercialController,
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
import type { LessonReadingStore } from '../domain/lessons/reading';
import { createProductionAdGateway } from '../infrastructure/ads';
import { createProductionPurchaseGateway } from '../infrastructure/purchases';
import {
  BETA_UNLIMITED_SMART_HINTS,
  CLOSED_BETA_SMART_HINT_FLOOR,
} from './release-scope';

export type ProductionRuntime = {
  commercial: CommercialController;
  coordinator: OfflineGameCoordinator;
  preferences: ProductPreferencesController;
  inferenceAnalyzer?: TechniqueOpportunityAnalyzer;
  sessionReview?: SessionReviewSource;
  sessionReviewAnalyzer?: TechniqueOpportunityAnalyzer;
  sessionReplay?: SessionReplaySource;
  lessonProgress?: LessonReadingStore;
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
  const opportunityAnalyzer = new ReactNativeTechniqueOpportunityAnalyzer();
  try {
    content = await openProductionContentDatabase();
    players = await openUserRepository(Date.now());
    if (CLOSED_BETA_SMART_HINT_FLOOR > 0) {
      await players.ensureBetaSmartHintFloor(
        CLOSED_BETA_SMART_HINT_FLOOR,
        Date.now(),
      );
    }
    try {
      behaviorShadowStore = new BehaviorShadowStore();
      behaviorShadow = new BehaviorShadowController(
        opportunityAnalyzer,
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
    coordinator.setUnlimitedSmartHints(BETA_UNLIMITED_SMART_HINTS);
    const commercial = new CommercialController(
      createProductionAdGateway(),
      createProductionPurchaseGateway(),
      players,
      {
        onPlaybackStart: () => coordinator.pause(),
        onPlaybackEnd: () => undefined,
      },
    );
    const preferences = new ProductPreferencesController(players);
    const sessionReplay: SessionReplaySource = {
      readReplaySession: players.readReplaySession.bind(players),
      listReplaySessions: players.listReplaySessions.bind(players),
      analyzeReplayBoard,
      explainReplayMove,
    };
    return {
      commercial,
      coordinator,
      preferences,
      inferenceAnalyzer: opportunityAnalyzer,
      sessionReview: __DEV__ ? behaviorShadowStore ?? undefined : undefined,
      sessionReviewAnalyzer: __DEV__ ? opportunityAnalyzer : undefined,
      sessionReplay,
      lessonProgress: players.lessons,
      close() {
        commercial.close();
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
