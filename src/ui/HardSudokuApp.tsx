import { LocalizedModal as Modal } from './components/LocalizedModal';
import { LocalizedText as Text } from './components/LocalizedText';
import { productAnalytics } from '../application/analytics/contracts';
import { nativeAnalyticsGateway } from '../infrastructure/analytics/native-analytics-gateway';
import { sanitizedFrames } from '../application/analytics/javascript-errors';
import { ScreenStateProvider } from './screen-state';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable } from './components/FocusablePressable';
import {
  AppState,
  BackHandler,
  Image,
  NativeModules,
  Platform,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  OfflineGameCoordinator,
  OfflineGameSnapshot,
  ProductPreferenceSnapshot,
  ProductPreferences,
  ProductPreferencesController,
  detectDeviceLocale,
  gameSettingsFromProductPreferences,
  resolveProductLocale,
} from '../application';
import type { GameFocus } from '../domain/game/contracts';
import type { TechniqueCode } from '../domain/hints/techniques';
import type { TermConcept } from '../data/lessons/term-concepts';
import type { InferenceActionValidationRequest } from '../domain/game/inference-session';
import {
  ProductionRuntime,
  createProductionRuntime,
} from '../app/production-runtime';
import { RELEASE_CORE_FEATURES } from '../app/release-scope';
import { HomeScreen } from './screens/HomeScreen';
import { APP_ICON_SIZE, AppIcon } from './components/AppIcon';
import { RootTabBar, RootTab } from './components/RootTabBar';
import { GameScreen } from './screens/GameScreen';
import { isGameplayFeedbackMessage } from './game-feedback';
import { ResultScreen } from './screens/ResultScreen';
import {
  ReplayLibraryScreen,
  SessionReplayScreen,
} from './screens/SessionReplayScreen';
import { SettingsScreen, SettingsSubpage } from './screens/SettingsScreen';
import {
  PremiumScreen,
  TrustPage,
  TrustScreen,
} from './screens/CommercialScreens';
import { HelpScreen, StatisticsScreen } from './screens/ProductInfoScreens';
import { AppPalette, ThemeProvider, useAppTheme } from './theme';
import {
  playInteractionFeedback,
  useKeepAwake,
} from './product-experience-effects';
import { HintLab } from '../debug/HintLab';
import { LessonReader } from './screens/LessonReader';
import { ChallengeScreen } from './screens/ChallengeScreen';
import { CompletionResultPreview } from '../debug/CompletionResultPreview';
import { SessionTechniqueReview } from '../debug/SessionTechniqueReview';
import type { TechniqueOpportunityAnalyzer } from '../domain/technique-recognition/contracts';
import type { SessionReviewSource } from '../application/technique-recognition/session-review';
import {
  LocalizationProvider,
  type TranslationKey,
  translateCoordinatorMessage,
  useLocalization,
} from '../localization';
import { Digit } from '../domain/sudoku/contracts';
import { createBoardFingerprint } from '../domain/sudoku/board';
import type { SessionReplaySource } from '../application/game/session-replay-source';
import { useAdaptiveLayout } from './layout/adaptive-layout';
import { ROOT_PAGE } from './root-page-design';

type RuntimeFactory = () => Promise<ProductionRuntime>;

let inferenceValidationSequence = 0;

type AppBodyProps = {
  commercial: ProductionRuntime['commercial'];
  coordinator: OfflineGameCoordinator;
  preferenceSnapshot: ProductPreferenceSnapshot;
  preferences: ProductPreferencesController;
  inferenceAnalyzer?: TechniqueOpportunityAnalyzer;
  sessionReview?: SessionReviewSource;
  sessionReviewAnalyzer?: TechniqueOpportunityAnalyzer;
  sessionReplay?: SessionReplaySource;
  lessonProgress?: ProductionRuntime['lessonProgress'];
  practiceProgress?: ProductionRuntime['practiceProgress'];
  challengeProgress?: ProductionRuntime['challengeProgress'];
  practiceAccess?: ProductionRuntime['practiceAccess'];
};

type ProductRoute =
  | { kind: 'home' }
  | { kind: 'challenges' }
  | {
      kind: 'lessons';
      returnTo: 'home' | 'settings';
      initialTechnique?: TechniqueCode;
      initialTermCourse?: TermConcept;
    }
  | { kind: 'settings'; page?: SettingsSubpage }
  | { kind: 'help'; returnTo: 'home' | 'settings' }
  | { kind: 'premium'; returnTo: 'home' | 'settings' }
  | {
      kind: 'premium';
      returnTo: 'lessons';
      lessonReturnTo: 'home' | 'settings';
      destination:
        | { kind: 'technique'; technique: TechniqueCode }
        | { kind: 'term'; course: TermConcept };
    }
  | { kind: TrustPage; returnTo: 'settings' };

type ReplayRoute = { sessionId: string };

function settle(operation: Promise<unknown>): void {
  operation.catch(() => undefined);
}

function hintAdUnavailableMessage(reason: string): TranslationKey {
  switch (reason) {
    case 'not_loaded':
      return 'credits.loadingAd';
    case 'offline':
      return 'credits.offline';
    case 'consent':
      return 'credits.consentUnavailable';
    case 'market':
      return 'credits.marketUnavailable';
    default:
      return 'credits.unavailable';
  }
}

function ConfirmationModal({
  visible,
  title,
  body,
  confirmLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel(): void;
  onConfirm(): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <Modal
      animationType="fade"
      onRequestClose={onCancel}
      transparent
      visible={visible}
    >
      <View style={styles.modalBackdrop}>
        <View accessibilityViewIsModal style={styles.modalCard}>
          <Text accessibilityRole="header" style={styles.modalTitle}>
            {title}
          </Text>
          <Text style={styles.modalBody}>{body}</Text>
          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onCancel}
              style={styles.modalSecondary}
            >
              <Text style={styles.modalSecondaryText}>{t('app.cancel')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onConfirm}
              style={[
                styles.modalPrimary,
                destructive && styles.modalDestructive,
              ]}
            >
              <Text style={styles.modalPrimaryText}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AppBody({
  commercial,
  coordinator,
  preferenceSnapshot,
  preferences,
  inferenceAnalyzer,
  sessionReview,
  sessionReviewAnalyzer,
  sessionReplay,
  lessonProgress,
  practiceProgress,
  challengeProgress,
  practiceAccess,
}: AppBodyProps): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<OfflineGameSnapshot>(
    coordinator.snapshot,
  );
  const [commercialSnapshot, setCommercialSnapshot] = useState(
    commercial.snapshot,
  );
  const [hintLabOpen, setHintLabOpen] = useState(false);
  const [completionPreviewOpen, setCompletionPreviewOpen] = useState(false);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [replayRoute, setReplayRoute] = useState<ReplayRoute | null>(null);
  const [activeTab, setActiveTab] = useState<RootTab>('home');
  const [productRoute, setProductRoute] = useState<ProductRoute>({
    kind: 'home',
  });
  const [hintAdMessage, setHintAdMessage] = useState<TranslationKey | null>(
    null,
  );
  const hintAdInFlight = useRef(false);
  const [premiumUnlockNoticeId, setPremiumUnlockNoticeId] = useState<
    string | null
  >(null);
  const { t } = useLocalization();
  const { palette, statusBarStyle } = useAppTheme();
  const { useLandscapeTabletLayout } = useAdaptiveLayout();
  const window = useWindowDimensions();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const productPreferences = preferenceSnapshot.preferences;
  useEffect(() => {
    // Challenge progress stays local; episode behavior is not added to telemetry.
    if (productRoute.kind === 'challenges') return;
    const screen = replayRoute
      ? 'session_replay'
      : snapshot.screen !== 'home'
      ? snapshot.screen
      : productRoute.kind !== 'home'
      ? productRoute.kind
      : activeTab;
    productAnalytics.screenView(screen);
  }, [
    activeTab,
    productRoute.kind,
    replayRoute,
    snapshot.screen,
    productPreferences.analyticsEnabled,
  ]);
  useKeepAwake(productPreferences.keepAwake && snapshot.screen === 'game');

  useEffect(() => coordinator.subscribe(setSnapshot), [coordinator]);
  useEffect(() => commercial.subscribe(setCommercialSnapshot), [commercial]);

  useEffect(() => {
    coordinator.setPremiumAccess(
      commercialSnapshot.entitlement.status === 'premium' &&
        commercialSnapshot.entitlement.source !== 'review_access',
    );
    coordinator.setReviewerAccess(
      commercialSnapshot.entitlement.source === 'review_access',
    );
  }, [commercialSnapshot.entitlement, coordinator]);

  useEffect(() => {
    const wallet = commercialSnapshot.wallet;
    if (wallet) {
      settle(coordinator.refreshWallet());
    }
  }, [commercialSnapshot.wallet, coordinator]);

  useEffect(() => {
    if (commercialSnapshot.premiumUnlockEventId) {
      setPremiumUnlockNoticeId(commercialSnapshot.premiumUnlockEventId);
    }
  }, [commercialSnapshot.premiumUnlockEventId]);

  useEffect(() => {
    setReviewSessionId(null);
    setReplayRoute(null);
    setHintAdMessage(null);
  }, [snapshot.session?.state.sessionId, snapshot.screen]);

  useEffect(() => {
    coordinator.setNewGameSettings(
      gameSettingsFromProductPreferences(productPreferences),
    );
    coordinator.setAutoFinishMode(productPreferences.autoFinishMode);
  }, [coordinator, productPreferences]);

  useEffect(() => {
    if (snapshot.screen !== 'home') {
      setProductRoute({ kind: 'home' });
    }
  }, [snapshot.screen]);

  const returnFromPremium = useCallback(
    (route: Extract<ProductRoute, { kind: 'premium' }>) => {
      if (route.returnTo === 'lessons') {
        setProductRoute({
          kind: 'lessons',
          returnTo: route.lessonReturnTo,
          initialTechnique:
            commercialSnapshot.entitlement.status === 'premium' &&
            route.destination.kind === 'technique'
              ? route.destination.technique
              : undefined,
          initialTermCourse:
            commercialSnapshot.entitlement.status === 'premium' &&
            route.destination.kind === 'term'
              ? route.destination.course
              : undefined,
        });
      } else {
        setProductRoute({ kind: route.returnTo });
      }
    },
    [commercialSnapshot.entitlement.status],
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (hintLabOpen) {
          setHintLabOpen(false);
          return true;
        }
        // Session replay owns its nested walkthrough and hardware back behavior.
        if (replayRoute) return false;
        if (Platform.isTV && snapshot.screen === 'game') {
          settle(
            snapshot.session?.state.activeHint
              ? coordinator.dismissHint()
              : coordinator.returnHome(),
          );
          return true;
        }
        // Lesson reading owns directory/close Back behavior after saved navigation.
        if (
          productRoute.kind === 'lessons' ||
          productRoute.kind === 'help' ||
          productRoute.kind === 'challenges'
        )
          return false;
        if (
          snapshot.screen === 'home' &&
          productRoute.kind === 'settings' &&
          productRoute.page
        ) {
          setProductRoute({ kind: 'settings' });
          return true;
        }
        if (snapshot.screen === 'home' && productRoute.kind === 'premium') {
          returnFromPremium(productRoute);
          return true;
        }
        if (snapshot.screen === 'home' && productRoute.kind !== 'home') {
          setProductRoute(
            'returnTo' in productRoute && productRoute.returnTo === 'settings'
              ? { kind: 'settings' }
              : { kind: 'home' },
          );
          return true;
        }
        if (snapshot.screen === 'home' && activeTab !== 'home') {
          setActiveTab('home');
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [
    activeTab,
    coordinator,
    hintLabOpen,
    productRoute,
    replayRoute,
    returnFromPremium,
    snapshot.screen,
    snapshot.session?.state.activeHint,
  ]);

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | undefined;
    let active = AppState.currentState === 'active';
    const scheduleReward = () => {
      if (midnightTimer) clearTimeout(midnightTimer);
      if (!active) return;
      settle(commercial.refreshDailyHintReward());
      const now = new Date();
      const midnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      midnightTimer = setTimeout(
        scheduleReward,
        midnight.getTime() - now.getTime() + 50,
      );
    };
    scheduleReward();
    const subscription = AppState.addEventListener('change', nextState => {
      active = nextState === 'active';
      scheduleReward();
      if (active) {
        settle(commercial.refreshEntitlements());
      } else {
        settle(coordinator.pause());
      }
    });
    return () => {
      if (midnightTimer) clearTimeout(midnightTimer);
      subscription.remove();
    };
  }, [commercial, coordinator]);

  const invoke = (operation: () => Promise<void>) => () => {
    settle(operation());
  };

  const selectCell = useCallback(
    (cell: number | null) => {
      playInteractionFeedback(productPreferences);
      settle(coordinator.selectCell(cell));
    },
    [coordinator, productPreferences],
  );
  const inputDigit = useCallback(
    (digit: Digit) => {
      playInteractionFeedback(productPreferences);
      settle(coordinator.inputDigit(digit));
    },
    [coordinator, productPreferences],
  );
  const oneTapFill = useCallback(
    (cell: number, kind: 'full_house' | 'single_candidate') => {
      if (
        !productPreferences.oneTapFill ||
        (snapshot.session?.state.difficultyLevel ?? 0) < 4
      ) {
        return;
      }
      playInteractionFeedback(productPreferences);
      settle(coordinator.selectCell(cell));
      settle(
        kind === 'full_house'
          ? coordinator.completeFullHouse(cell)
          : coordinator.fillSingleCandidate(cell),
      );
    },
    [coordinator, productPreferences, snapshot.session?.state.difficultyLevel],
  );
  const recordReplayFocus = useCallback(
    (cell: number | null, digit: Digit | null) =>
      coordinator.recordReplayFocus(cell, digit),
    [coordinator],
  );
  const saveFocus = useCallback(
    (sessionId: string, focus: GameFocus) =>
      settle(coordinator.updateFocus(sessionId, focus)),
    [coordinator],
  );
  const validateInferenceAction = useCallback(
    async (request: InferenceActionValidationRequest): Promise<boolean> => {
      if (!inferenceAnalyzer) return false;
      const boardFingerprint = createBoardFingerprint(request.board);
      const requestId = `forcing-proof-${++inferenceValidationSequence}`;
      const revision = snapshot.session?.state.revision ?? 0;
      const response = await inferenceAnalyzer.analyze({
        requestId,
        sessionId: snapshot.session?.state.sessionId ?? 'forcing',
        segmentId: requestId,
        startingRevision: revision,
        issuedRevision: revision,
        startingBoardFingerprint: boardFingerprint,
        expectedBoardFingerprint: boardFingerprint,
        growthCandidates: request.candidates,
        givenCells: request.givenCells,
        observedEffects: request.action.cells.map(cell => ({
          kind: request.action.truth === 'true' ? 'placement' : 'elimination',
          cell,
          digit: request.action.digit,
        })),
      });
      return (
        response.status === 'matched' && response.candidateTechniques.length > 0
      );
    },
    [
      inferenceAnalyzer,
      snapshot.session?.state.revision,
      snapshot.session?.state.sessionId,
    ],
  );
  const changePreferences = (patch: Partial<ProductPreferences>) => {
    preferences
      .updatePreferences(patch)
      .then(() => {
        for (const key of [
          'locale',
          'theme',
          'inputMode',
          'autoCheckErrors',
          'errorLimit',
          'autoFinishMode',
          'hintAnimations',
          'replayAnalysisLevel',
        ] as const) {
          if (key in patch)
            productAnalytics.track('preference_changed', {
              preference: key,
              value: String(patch[key]),
            });
        }
      })
      .catch(() => productAnalytics.failure('save_preferences'));
  };
  const feedback = () => {
    playInteractionFeedback(productPreferences);
  };
  const selectResultTab = (tab: RootTab) => {
    setActiveTab(tab);
    settle(coordinator.newGameFromResult());
  };
  const showRootNavigation =
    !hintLabOpen &&
    !completionPreviewOpen &&
    !replayRoute &&
    !reviewSessionId &&
    ((snapshot.screen === 'home' && productRoute.kind === 'home') ||
      (snapshot.screen === 'result' &&
        snapshot.session?.state.status === 'completed'));

  const requestHintAfterAd = async (preferredDigit: Digit | null) => {
    if (hintAdInFlight.current) return;
    hintAdInFlight.current = true;
    coordinator.setTelemetryInteractive(false);
    setHintAdMessage(null);
    try {
      const result = await commercial.redeemRewardedAd(
        'smart_hint',
        'credit_exhausted',
      );
      if (result.status === 'credited') {
        await coordinator.refreshWallet();
        if (
          coordinator.snapshot.screen === 'game' &&
          coordinator.snapshot.session?.state.status === 'active'
        ) {
          await coordinator.requestHint(preferredDigit);
        }
      } else if (result.status === 'unavailable') {
        setHintAdMessage(hintAdUnavailableMessage(result.reason));
      } else {
        setHintAdMessage(
          result.status === 'dismissed'
            ? 'credits.dismissed'
            : 'credits.failed',
        );
      }
    } catch {
      setHintAdMessage('credits.failed');
    } finally {
      hintAdInFlight.current = false;
      coordinator.setTelemetryInteractive(true);
    }
  };

  const bannerMessage =
    hintAdMessage && snapshot.screen === 'game'
      ? t(hintAdMessage)
      : snapshot.message &&
        !(
          snapshot.screen === 'game' &&
          isGameplayFeedbackMessage(snapshot.message)
        )
      ? translateCoordinatorMessage(t, snapshot.message)
      : null;

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={[
        styles.safeArea,
        Platform.isTV && {
          paddingHorizontal: window.width * 0.05,
          paddingVertical: window.height * 0.05,
        },
      ]}
    >
      <StatusBar barStyle={statusBarStyle} />
      <View
        style={[
          styles.screenFrame,
          showRootNavigation &&
            useLandscapeTabletLayout &&
            styles.screenFrameWithRail,
        ]}
      >
        {__DEV__ && completionPreviewOpen ? (
          <CompletionResultPreview
            onClose={() => setCompletionPreviewOpen(false)}
          />
        ) : null}
        {__DEV__ && hintLabOpen ? (
          <HintLab onClose={() => setHintLabOpen(false)} />
        ) : null}
        {productRoute.kind === 'challenges' && challengeProgress ? (
          <ChallengeScreen
            store={challengeProgress}
            preferences={productPreferences}
            onClose={() => setProductRoute({ kind: 'home' })}
          />
        ) : null}
        {RELEASE_CORE_FEATURES.lessons &&
        productRoute.kind === 'lessons' &&
        lessonProgress ? (
          <LessonReader
            key={
              commercialSnapshot.entitlement.status === 'premium'
                ? 'premium'
                : 'free'
            }
            progress={lessonProgress}
            practiceProgress={practiceProgress}
            practiceAccess={practiceAccess}
            premium={commercialSnapshot.entitlement.status === 'premium'}
            commercial={commercial}
            initialTechnique={productRoute.initialTechnique}
            initialTermCourse={productRoute.initialTermCourse}
            onOpenPremium={technique =>
              setProductRoute({
                kind: 'premium',
                returnTo: 'lessons',
                lessonReturnTo: productRoute.returnTo,
                destination: { kind: 'technique', technique },
              })
            }
            onOpenPremiumTermCourse={course =>
              setProductRoute({
                kind: 'premium',
                returnTo: 'lessons',
                lessonReturnTo: productRoute.returnTo,
                destination: { kind: 'term', course },
              })
            }
            preferences={productPreferences}
            onClose={() => setProductRoute({ kind: productRoute.returnTo })}
          />
        ) : null}
        {!completionPreviewOpen &&
        !hintLabOpen &&
        !replayRoute &&
        snapshot.screen === 'home' &&
        productRoute.kind === 'home' &&
        activeTab === 'home' ? (
          <HomeScreen
            onOpenChallenges={
              challengeProgress
                ? () => setProductRoute({ kind: 'challenges' })
                : undefined
            }
            onOpenLessons={
              RELEASE_CORE_FEATURES.lessons && lessonProgress
                ? () => setProductRoute({ kind: 'lessons', returnTo: 'home' })
                : undefined
            }
            onOpenCompletionPreview={
              __DEV__ ? () => setCompletionPreviewOpen(true) : undefined
            }
            onOpenHintLab={__DEV__ ? () => setHintLabOpen(true) : undefined}
            onOpenSettings={() => setProductRoute({ kind: 'settings' })}
            onResume={invoke(() => coordinator.resumeGame())}
            onStart={level => settle(coordinator.requestNewGame(level))}
            onTopUpDebugCredits={
              __DEV__
                ? invoke(() => coordinator.topUpDebugCredits())
                : undefined
            }
            snapshot={snapshot}
          />
        ) : null}
        {!completionPreviewOpen &&
        !hintLabOpen &&
        !replayRoute &&
        snapshot.screen === 'home' &&
        productRoute.kind === 'settings' ? (
          <SettingsScreen
            debugBusy={snapshot.busy}
            premium={commercialSnapshot.entitlement.status === 'premium'}
            testHintAllowance={snapshot.testHintAllowance}
            reviewAccessPremium={
              commercialSnapshot.entitlement.source === 'review_access'
            }
            dailyHintRewards={commercialSnapshot.dailyHintRewards}
            hintRewardProgress={snapshot.hintRewardProgress}
            wallet={snapshot.wallet}
            onBack={() =>
              setProductRoute(
                productRoute.page ? { kind: 'settings' } : { kind: 'home' },
              )
            }
            onChange={changePreferences}
            onOpenCompletionPreview={
              __DEV__ ? () => setCompletionPreviewOpen(true) : undefined
            }
            onOpenHintLab={__DEV__ ? () => setHintLabOpen(true) : undefined}
            onOpenPage={page => setProductRoute({ kind: 'settings', page })}
            onOpenLessons={
              RELEASE_CORE_FEATURES.lessons && lessonProgress
                ? () =>
                    setProductRoute({ kind: 'lessons', returnTo: 'settings' })
                : undefined
            }
            onOpenLicenses={() =>
              setProductRoute({ kind: 'licenses', returnTo: 'settings' })
            }
            onOpenPremium={() =>
              setProductRoute({ kind: 'premium', returnTo: 'settings' })
            }
            onRestorePurchase={() => commercial.restorePremium()}
            onTopUpDebugCredits={
              __DEV__
                ? invoke(() => coordinator.topUpDebugCredits())
                : undefined
            }
            onRedeemHintAd={async () => {
              const result = await commercial.redeemRewardedAd(
                'smart_hint',
                'home_credit_store',
              );
              await coordinator.refreshWallet();
              return result;
            }}
            onOpenPrivacy={() =>
              setProductRoute({ kind: 'privacy', returnTo: 'settings' })
            }
            onOpenSupport={() =>
              setProductRoute({ kind: 'support', returnTo: 'settings' })
            }
            page={productRoute.page ?? 'main'}
            preferences={productPreferences}
          />
        ) : null}
        {!hintLabOpen &&
        !replayRoute &&
        snapshot.screen === 'home' &&
        productRoute.kind === 'premium' ? (
          <PremiumScreen
            onBack={() => returnFromPremium(productRoute)}
            onLoadProduct={() => commercial.loadPremiumProduct()}
            onPurchase={() => commercial.purchasePremium()}
            onReviewerAccess={code => commercial.enableReviewerAccess(code)}
            onRestore={() => commercial.restorePremium()}
            snapshot={commercialSnapshot}
          />
        ) : null}
        {!hintLabOpen &&
        !replayRoute &&
        snapshot.screen === 'home' &&
        ['privacy', 'support', 'licenses'].includes(productRoute.kind) ? (
          <TrustScreen
            onBack={() => setProductRoute({ kind: 'settings' })}
            onPrivacyOptionsRequired={() =>
              commercial.isAdPrivacyOptionsRequired()
            }
            onShowPrivacyOptions={() => commercial.showAdPrivacyOptions()}
            page={productRoute.kind as TrustPage}
          />
        ) : null}
        {!hintLabOpen &&
        !replayRoute &&
        snapshot.screen === 'home' &&
        productRoute.kind === 'home' &&
        activeTab === 'statistics' &&
        RELEASE_CORE_FEATURES.statistics ? (
          <StatisticsScreen snapshot={snapshot} />
        ) : null}
        {!hintLabOpen &&
        !replayRoute &&
        snapshot.screen === 'home' &&
        productRoute.kind === 'help' ? (
          <HelpScreen
            onBack={() => setProductRoute({ kind: productRoute.returnTo })}
            onComplete={() =>
              setProductRoute({ kind: 'lessons', returnTo: 'home' })
            }
          />
        ) : null}
        {!hintLabOpen &&
        !replayRoute &&
        RELEASE_CORE_FEATURES.game &&
        snapshot.screen === 'game' ? (
          <GameScreen
            premium={commercialSnapshot.entitlement.status === 'premium'}
            adPlaybackActive={commercialSnapshot.rewardedAdBusy}
            onDismissGameplayMessage={message =>
              coordinator.clearMessage(message)
            }
            onAbandon={invoke(() => coordinator.abandonToHome())}
            onApplyHint={() => {
              feedback();
              settle(coordinator.applyHint());
            }}
            onBack={invoke(() => coordinator.returnHome())}
            onDigit={inputDigit}
            onEditCandidates={(cells, digits, action) => {
              feedback();
              settle(coordinator.editCandidates(cells, digits, action));
            }}
            onApplyInferenceConclusions={conclusions => {
              feedback();
              return coordinator.applyInferenceConclusions(conclusions);
            }}
            onValidateInferenceAction={validateInferenceAction}
            onOneTapFill={oneTapFill}
            onColorCells={(cells, color, toggleSameColor) =>
              settle(coordinator.colorCells(cells, color, toggleSameColor))
            }
            onClearBoardColors={() => settle(coordinator.clearBoardColors())}
            onDismissHint={invoke(() => coordinator.dismissHint())}
            onErase={() => {
              feedback();
              settle(coordinator.erase());
            }}
            onHint={preferredDigit => {
              feedback();
              if (
                commercialSnapshot.entitlement.status !== 'premium' &&
                (snapshot.testHintAllowance ?? 0) === 0 &&
                snapshot.wallet.smart_hint.balance === 0 &&
                snapshot.session?.state.activeHint === null
              ) {
                productAnalytics.track('credit_blocked', {
                  entry: 'game_hint',
                  balance_bucket: '0',
                });
                settle(requestHintAfterAd(preferredDigit));
              } else {
                setHintAdMessage(null);
                settle(coordinator.requestHint(preferredDigit));
              }
            }}
            onPause={invoke(() => coordinator.pause())}
            onPencil={() => {
              feedback();
              settle(coordinator.togglePencil());
            }}
            onQuickPencil={() => {
              feedback();
              settle(coordinator.toggleQuickPencil());
            }}
            onRegenerateQuickPencil={() => {
              feedback();
              coordinator.requestQuickDraftRegeneration();
            }}
            onAutoComplete={() => {
              feedback();
              settle(coordinator.quickFinishTrivialTail());
            }}
            onResume={invoke(() => coordinator.resumePausedGame())}
            onReplayFocusChange={recordReplayFocus}
            onFocusChange={saveFocus}
            onSelectCell={selectCell}
            onUndo={() => {
              feedback();
              settle(coordinator.undo());
            }}
            preferences={productPreferences}
            snapshot={snapshot}
          />
        ) : null}
        {__DEV__ && reviewSessionId && snapshot.screen === 'result' ? (
          <SessionTechniqueReview
            key={reviewSessionId}
            sessionId={reviewSessionId}
            source={sessionReview}
            analyzer={sessionReviewAnalyzer}
            onClose={() => setReviewSessionId(null)}
          />
        ) : null}
        {!hintLabOpen &&
        !replayRoute &&
        !reviewSessionId &&
        snapshot.screen === 'result' ? (
          <ResultScreen
            onOpenReview={
              __DEV__
                ? () => setReviewSessionId(snapshot.session!.state.sessionId)
                : undefined
            }
            onOpenReplay={
              sessionReplay
                ? () =>
                    setReplayRoute({
                      sessionId: snapshot.session!.state.sessionId,
                    })
                : undefined
            }
            onReturnHome={invoke(() => coordinator.newGameFromResult())}
            onNext={invoke(() => coordinator.nextPuzzle())}
            onRetry={invoke(() => coordinator.retryPuzzle())}
            onStartLevel={level => settle(coordinator.requestNewGame(level))}
            premium={commercialSnapshot.entitlement.status === 'premium'}
            onCheckCompletionAd={() =>
              commercial.getCompletionAdAvailability(
                snapshot.session!.state.sessionId,
              )
            }
            onWatchCompletionAd={async () => {
              const result = await commercial.redeemCompletionAd(
                snapshot.session!.state.sessionId,
              );
              await coordinator.refreshWallet();
              return result;
            }}
            snapshot={snapshot}
          />
        ) : null}
        {!hintLabOpen &&
        !replayRoute &&
        snapshot.screen === 'home' &&
        productRoute.kind === 'home' &&
        activeTab === 'replay' &&
        RELEASE_CORE_FEATURES.sessionReplay &&
        sessionReplay ? (
          <ReplayLibraryScreen
            source={sessionReplay}
            onOpen={sessionId => setReplayRoute({ sessionId })}
          />
        ) : null}
        {!hintLabOpen && replayRoute && sessionReplay ? (
          <SessionReplayScreen
            preferences={productPreferences}
            sessionId={replayRoute.sessionId}
            source={sessionReplay}
            onClose={() => setReplayRoute(null)}
          />
        ) : null}
      </View>
      {showRootNavigation ? (
        <RootTabBar
          activeTab={activeTab}
          mode={useLandscapeTabletLayout ? 'rail' : 'bottom'}
          onSelect={
            snapshot.screen === 'result' ? selectResultTab : setActiveTab
          }
        />
      ) : null}
      {premiumUnlockNoticeId ? (
        <Pressable
          accessibilityHint={t('app.dismissMessage')}
          accessibilityLabel={t('premium.externalPurchaseSuccess')}
          accessibilityLiveRegion="polite"
          accessibilityRole="button"
          onPress={() => setPremiumUnlockNoticeId(null)}
          style={styles.message}
          testID="premium-unlock-notice"
        >
          <Text style={styles.messageText}>
            {t('premium.externalPurchaseSuccess')}
          </Text>
          <AppIcon
            color={palette.white}
            name="close"
            size={APP_ICON_SIZE.standard}
            style={styles.messageClose}
          />
        </Pressable>
      ) : null}
      {!premiumUnlockNoticeId &&
      !completionPreviewOpen &&
      !hintLabOpen &&
      productRoute.kind !== 'lessons' &&
      productRoute.kind !== 'challenges' &&
      bannerMessage ? (
        <Pressable
          accessibilityLabel={bannerMessage}
          accessibilityHint={t('app.dismissMessage')}
          accessibilityRole="button"
          onPress={() =>
            hintAdMessage && snapshot.screen === 'game'
              ? setHintAdMessage(null)
              : coordinator.clearMessage()
          }
          style={styles.message}
        >
          <Text style={styles.messageText}>{bannerMessage}</Text>
          <AppIcon
            color={palette.white}
            name="close"
            size={APP_ICON_SIZE.standard}
            style={styles.messageClose}
          />
        </Pressable>
      ) : null}

      <ConfirmationModal
        body={t('modal.replace.body')}
        confirmLabel={t('modal.replace.confirm')}
        destructive
        onCancel={() => coordinator.cancelReplacement()}
        onConfirm={() => settle(coordinator.confirmReplacement())}
        title={t('modal.replace.title', {
          level: snapshot.replacementRequest?.level,
        })}
        visible={!hintLabOpen && snapshot.replacementRequest !== null}
      />
      <ConfirmationModal
        body={t('modal.quickDraft.body')}
        confirmLabel={t('modal.quickDraft.confirm')}
        onCancel={() => coordinator.cancelQuickDraftRegeneration()}
        onConfirm={() => settle(coordinator.confirmQuickDraftRegeneration())}
        title={t('modal.quickDraft.title')}
        visible={!hintLabOpen && snapshot.quickDraftConfirmation}
      />
    </SafeAreaView>
  );
}

function RuntimeExperience({
  commercial,
  coordinator,
  preferences,
  inferenceAnalyzer,
  sessionReview,
  sessionReviewAnalyzer,
  sessionReplay,
  lessonProgress,
  practiceProgress,
  challengeProgress,
  practiceAccess,
}: {
  commercial: ProductionRuntime['commercial'];
  coordinator: OfflineGameCoordinator;
  preferences: ProductPreferencesController;
  inferenceAnalyzer?: TechniqueOpportunityAnalyzer;
  sessionReview?: SessionReviewSource;
  sessionReviewAnalyzer?: TechniqueOpportunityAnalyzer;
  sessionReplay?: SessionReplaySource;
  lessonProgress?: ProductionRuntime['lessonProgress'];
  practiceProgress?: ProductionRuntime['practiceProgress'];
  challengeProgress?: ProductionRuntime['challengeProgress'];
  practiceAccess?: ProductionRuntime['practiceAccess'];
}): React.JSX.Element {
  const [snapshot, setSnapshot] = useState(preferences.snapshot);
  useEffect(() => preferences.subscribe(setSnapshot), [preferences]);
  return (
    <LocalizationProvider locale={snapshot.effectiveLocale}>
      <ThemeProvider
        preference={snapshot.preferences.theme}
        alternatingBoxShading={snapshot.preferences.alternatingBoxShading}
      >
        <ScreenStateProvider>
          <AppBody
            commercial={commercial}
            coordinator={coordinator}
            preferenceSnapshot={snapshot}
            preferences={preferences}
            inferenceAnalyzer={inferenceAnalyzer}
            sessionReview={sessionReview}
            sessionReviewAnalyzer={sessionReviewAnalyzer}
            sessionReplay={sessionReplay}
            lessonProgress={lessonProgress}
            practiceProgress={practiceProgress}
            challengeProgress={challengeProgress}
            practiceAccess={practiceAccess}
          />
        </ScreenStateProvider>
      </ThemeProvider>
    </LocalizationProvider>
  );
}

function BootstrapScreen({
  failure,
  onRetry,
}: {
  failure: string | null;
  onRetry(): void;
}) {
  const { t } = useLocalization();
  const { palette, statusBarStyle } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <>
      <StatusBar barStyle={statusBarStyle} />
      {failure ? (
        <SafeAreaView style={styles.centered}>
          <Text accessibilityRole="header" style={styles.failureTitle}>
            {t('app.failureTitle')}
          </Text>
          <Text style={styles.failureBody}>{t('app.failureBody')}</Text>
          {__DEV__ ? <Text style={styles.failureDetail}>{failure}</Text> : null}
          <Pressable
            accessibilityLabel={t('app.retry')}
            accessibilityRole="button"
            onPress={onRetry}
            style={styles.failureRetry}
          >
            <Text style={styles.modalPrimaryText}>{t('app.retry')}</Text>
          </Pressable>
        </SafeAreaView>
      ) : (
        <View
          accessibilityLabel={t('app.loading')}
          accessibilityLiveRegion="polite"
          style={styles.launchBrand}
          testID="startup-brand"
        >
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="stretch"
            source={{
              uri:
                Platform.OS === 'android' ? 'launch_background' : 'LaunchBrand',
            }}
            style={styles.launchBrandImage}
          />
        </View>
      )}
    </>
  );
}

export function HardSudokuApp({
  runtimeFactory = createProductionRuntime,
}: {
  runtimeFactory?: RuntimeFactory;
}): React.JSX.Element {
  const [runtime, setRuntime] = useState<ProductionRuntime | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let created: ProductionRuntime | null = null;
    // React can preserve state across Fast Refresh while re-running this effect.
    // Never keep rendering a runtime disposed by the previous effect cleanup.
    setRuntime(null);
    setFailure(null);
    const started = performance.now();
    runtimeFactory()
      .then(async nextRuntime => {
        created = nextRuntime;
        if (!active) {
          nextRuntime.close();
          return;
        }
        await Promise.all([
          nextRuntime.coordinator.initialize(),
          nextRuntime.preferences.initialize(),
          nextRuntime.commercial.initialize(),
        ]);
        if (active) {
          setRuntime(nextRuntime);
          nextRuntime.analytics?.readyEvent(performance.now() - started);
        } else {
          nextRuntime.close();
        }
      })
      .catch(error => {
        if (created) productAnalytics.failure('app_bootstrap');
        else {
          // Native startup already loaded the user's previous diagnostic choice.
          // This remains gated there when database setup fails before runtime exists.
          try {
            nativeAnalyticsGateway.recordError(
              'app_bootstrap',
              false,
              sanitizedFrames(error instanceof Error ? error.stack : ''),
            );
          } catch {}
        }
        created?.close();
        if (active) {
          setFailure(error instanceof Error ? error.message : String(error));
        }
      });
    return () => {
      active = false;
      created?.close();
    };
  }, [bootstrapAttempt, runtimeFactory]);

  useEffect(() => {
    if (Platform.OS !== 'android' || (!runtime && !failure)) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      (
        NativeModules.StartupSplash as { hide?: () => void } | undefined
      )?.hide?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [failure, runtime]);

  return (
    <SafeAreaProvider>
      {runtime ? (
        <RuntimeExperience
          commercial={runtime.commercial}
          coordinator={runtime.coordinator}
          preferences={runtime.preferences}
          inferenceAnalyzer={runtime.inferenceAnalyzer}
          sessionReview={runtime.sessionReview}
          sessionReviewAnalyzer={runtime.sessionReviewAnalyzer}
          sessionReplay={runtime.sessionReplay}
          lessonProgress={runtime.lessonProgress}
          practiceProgress={runtime.practiceProgress}
          challengeProgress={runtime.challengeProgress}
          practiceAccess={runtime.practiceAccess}
        />
      ) : (
        <LocalizationProvider
          locale={resolveProductLocale('system', detectDeviceLocale())}
        >
          <ThemeProvider preference="light">
            <BootstrapScreen
              failure={failure}
              onRetry={() => setBootstrapAttempt(attempt => attempt + 1)}
            />
          </ThemeProvider>
        </LocalizationProvider>
      )}
    </SafeAreaProvider>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    safeArea: {
      backgroundColor: palette.background,
      flex: 1,
    },
    screenFrame: {
      flex: 1,
    },
    screenFrameWithRail: {
      marginLeft: ROOT_PAGE.navigationRailWidth,
    },
    centered: {
      alignItems: 'center',
      backgroundColor: palette.background,
      flex: 1,
      justifyContent: 'center',
      padding: 28,
    },
    launchBrand: {
      backgroundColor: '#13233F',
      flex: 1,
    },
    launchBrandImage: {
      ...StyleSheet.absoluteFill,
    },
    failureTitle: {
      color: palette.ink,
      fontSize: 22,
      fontWeight: '800',
      textAlign: 'center',
    },
    failureBody: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 10,
      textAlign: 'center',
    },
    failureDetail: {
      color: palette.muted,
      fontSize: 11,
      marginTop: 12,
      textAlign: 'center',
    },
    failureRetry: {
      backgroundColor: palette.accent,
      borderRadius: 12,
      marginTop: 20,
      paddingHorizontal: 20,
      paddingVertical: 11,
    },
    message: {
      alignItems: 'center',
      backgroundColor: palette.ink,
      borderRadius: 13,
      bottom: 14,
      flexDirection: 'row',
      left: 14,
      paddingHorizontal: 15,
      paddingVertical: 12,
      position: 'absolute',
      right: 14,
    },
    messageText: {
      color: palette.white,
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
    },
    messageClose: {
      marginLeft: 12,
    },
    modalBackdrop: {
      alignItems: 'center',
      backgroundColor: palette.hintMask,
      flex: 1,
      justifyContent: 'center',
      padding: 22,
    },
    modalCard: {
      backgroundColor: palette.surface,
      borderRadius: 20,
      maxWidth: 430,
      padding: 22,
      width: '100%',
    },
    modalTitle: {
      color: palette.ink,
      fontSize: 21,
      fontWeight: '800',
    },
    modalBody: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 9,
    },
    modalActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'flex-end',
      marginTop: 22,
    },
    modalSecondary: {
      borderColor: palette.line,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 17,
      paddingVertical: 11,
    },
    modalSecondaryText: {
      color: palette.ink,
      fontSize: 14,
      fontWeight: '700',
    },
    modalPrimary: {
      backgroundColor: palette.accent,
      borderRadius: 12,
      paddingHorizontal: 17,
      paddingVertical: 11,
    },
    modalDestructive: {
      backgroundColor: palette.error,
    },
    modalPrimaryText: {
      color: palette.white,
      fontSize: 14,
      fontWeight: '800',
    },
  });
}
