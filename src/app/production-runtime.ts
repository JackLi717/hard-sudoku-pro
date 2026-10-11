import { installJavascriptDiagnostics } from '../application/analytics/javascript-errors';
import { AppState, Dimensions } from 'react-native';
import { AnalyticsService, utcDay } from '../application/analytics/service';
import { GameAnalyticsObserver } from '../application/analytics/game-observer';
import { activateAnalytics } from '../application/analytics/contracts';
import { nativeAnalyticsGateway } from '../infrastructure/analytics/native-analytics-gateway';
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
import type { PracticeProgressStore } from '../domain/practice/progress';
import type { PracticeAccessStore } from '../domain/practice/access';
import { createProductionAdGateway } from '../infrastructure/ads';
import { createProductionPurchaseGateway } from '../infrastructure/purchases';
import { CLOSED_BETA_TEST } from './release-scope';
import { createGameAdPlaybackObserver } from './game-ad-playback';

export type ProductionRuntime = {
  commercial: CommercialController;
  coordinator: OfflineGameCoordinator;
  preferences: ProductPreferencesController;
  inferenceAnalyzer?: TechniqueOpportunityAnalyzer;
  sessionReview?: SessionReviewSource;
  sessionReviewAnalyzer?: TechniqueOpportunityAnalyzer;
  sessionReplay?: SessionReplaySource;
  lessonProgress?: LessonReadingStore;
  practiceProgress?: PracticeProgressStore;
  practiceAccess?: PracticeAccessStore;
  analytics?: AnalyticsService;
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
  let stopTelemetry = () => {};
  let analytics: AnalyticsService | null = null;
  let gameAnalytics: GameAnalyticsObserver | null = null;
  const opportunityAnalyzer = new ReactNativeTechniqueOpportunityAnalyzer();
  try {
    content = await openProductionContentDatabase();
    players = await openUserRepository(Date.now(), CLOSED_BETA_TEST);
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
    const preferences = new ProductPreferencesController(players);
    analytics = new AnalyticsService(
      nativeAnalyticsGateway,
      players,
      __DEV__ ? 'development' : CLOSED_BETA_TEST ? 'closed_beta' : 'production',
    );
    const measurement = analytics;
    gameAnalytics = new GameAnalyticsObserver(measurement);
    const gameMeasurement = gameAnalytics;
    const deactivate = activateAnalytics(measurement);
    const stopErrors = installJavascriptDiagnostics();
    let initialized = false;
    const updateMeasurementSettings = () => {
      const current = preferences.snapshot;
      const window = Dimensions.get('window');
      measurement.setContext({
        app_language: current.effectiveLocale,
        device_class:
          Math.min(window.width, window.height) >= 600 ? 'tablet' : 'phone',
      });
      if (initialized)
        measurement.configure(
          current.preferences.analyticsEnabled,
          current.preferences.diagnosticsEnabled,
        );
    };
    const stopPreferences = preferences.subscribe(updateMeasurementSettings);
    // Optional measurement setup must never delay opening the offline game.
    Promise.all([
      preferences.initialize(),
      players.getStatistics(),
      players.getFirstUsageEpochMs(),
    ])
      .then(async ([, stats, firstUsage]) => {
        await measurement.initialize(
          stats.attempts > 0 ||
            firstUsage === null ||
            utcDay(firstUsage) !== utcDay(Date.now()),
        );
        initialized = true;
        updateMeasurementSettings();
      })
      .catch(() => measurement.failure('analytics_setup'));
    gameMeasurement.setForeground(AppState.currentState === 'active');
    const appState = AppState.addEventListener('change', state =>
      gameMeasurement.setForeground(state === 'active'),
    );
    stopTelemetry = () => {
      stopPreferences();
      stopErrors();
      appState.remove();
      gameMeasurement.close();
      measurement.close();
      deactivate();
    };
    const coordinator = new OfflineGameCoordinator(
      content,
      players,
      hintEngine,
      new OfflineTestAccessAdapter(),
      Date.now,
      undefined,
      behaviorShadow ?? undefined,
      gameAnalytics,
    );
    const commercial = new CommercialController(
      createProductionAdGateway(),
      createProductionPurchaseGateway(),
      players,
      createGameAdPlaybackObserver(coordinator),
      Date.now,
      undefined,
      players.practiceAccess,
    );
    const sessionReplay: SessionReplaySource = {
      readReplaySession: players.readReplaySession.bind(players),
      listReplaySessions: players.listReplaySessions.bind(players),
      analyzeReplayBoard,
      explainReplayMove,
    };
    return {
      analytics: measurement,
      commercial,
      coordinator,
      preferences,
      inferenceAnalyzer: opportunityAnalyzer,
      sessionReview: __DEV__ ? behaviorShadowStore ?? undefined : undefined,
      sessionReviewAnalyzer: __DEV__ ? opportunityAnalyzer : undefined,
      sessionReplay,
      lessonProgress: players.lessons,
      practiceProgress: players.practice,
      practiceAccess: players.practiceAccess,
      close() {
        stopTelemetry();
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
    stopTelemetry();
    content?.close();
    players?.close();
    behaviorShadow?.close();
    behaviorShadowStore?.close();
    throw error;
  }
}
