import { ScreenStateProvider } from './screen-state';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
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
import type { CreditResource } from '../domain/game/contracts';
import {
  ProductionRuntime,
  createProductionRuntime,
} from '../app/production-runtime';
import { RELEASE_CORE_FEATURES } from '../app/release-scope';
import { HomeScreen } from './screens/HomeScreen';
import { MultiSelectOnboardingOverlay } from './components/MultiSelectOnboardingOverlay';
import { RootTabBar, RootTab } from './components/RootTabBar';
import { GameScreen } from './screens/GameScreen';
import { ResultScreen } from './screens/ResultScreen';
import {
  ReplayLibraryScreen,
  SessionReplayScreen,
} from './screens/SessionReplayScreen';
import { SettingsScreen, SettingsSubpage } from './screens/SettingsScreen';
import {
  CreditTopUpModal,
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
import { CompletionResultPreview } from '../debug/CompletionResultPreview';
import { SessionTechniqueReview } from '../debug/SessionTechniqueReview';
import type { TechniqueOpportunityAnalyzer } from '../domain/technique-recognition/contracts';
import type { SessionReviewSource } from '../application/technique-recognition/session-review';
import {
  LocalizationProvider,
  translateCoordinatorMessage,
  useLocalization,
} from '../localization';
import { Digit } from '../domain/sudoku/contracts';
import type { SessionReplaySource } from '../application/game/session-replay-source';

type RuntimeFactory = () => Promise<ProductionRuntime>;

type AppBodyProps = {
  commercial: ProductionRuntime['commercial'];
  coordinator: OfflineGameCoordinator;
  preferenceSnapshot: ProductPreferenceSnapshot;
  preferences: ProductPreferencesController;
  sessionReview?: SessionReviewSource;
  sessionReviewAnalyzer?: TechniqueOpportunityAnalyzer;
  sessionReplay?: SessionReplaySource;
};

type ProductRoute =
  | { kind: 'home' }
  | { kind: 'settings'; page?: SettingsSubpage }
  | { kind: 'help'; returnTo: 'home' | 'settings' }
  | { kind: 'premium'; returnTo: 'home' | 'settings' }
  | { kind: TrustPage; returnTo: 'settings' };

type CreditRequest = {
  resource: CreditResource;
  placement: 'home_credit_store' | 'credit_exhausted';
};

type ReplayRoute = { sessionId: string };

function settle(operation: Promise<unknown>): void {
  operation.catch(() => undefined);
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
  sessionReview,
  sessionReviewAnalyzer,
  sessionReplay,
}: AppBodyProps): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<OfflineGameSnapshot>(
    coordinator.snapshot,
  );
  const [commercialSnapshot, setCommercialSnapshot] = useState(
    commercial.snapshot,
  );
  const [hintLabOpen, setHintLabOpen] = useState(false);
  const [completionPreviewOpen, setCompletionPreviewOpen] = useState(false);
  const [multiSelectPreviewRun, setMultiSelectPreviewRun] = useState(0);
  const [multiSelectReplayArmed, setMultiSelectReplayArmed] = useState(false);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);
  const [replayRoute, setReplayRoute] = useState<ReplayRoute | null>(null);
  const [activeTab, setActiveTab] = useState<RootTab>('home');
  const [productRoute, setProductRoute] = useState<ProductRoute>({
    kind: 'home',
  });
  const [creditRequest, setCreditRequest] = useState<CreditRequest | null>(
    null,
  );
  const { t } = useLocalization();
  const { palette, statusBarStyle } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const productPreferences = preferenceSnapshot.preferences;
  const commercialSurfaceBlocked =
    hintLabOpen ||
    completionPreviewOpen ||
    replayRoute !== null ||
    activeTab !== 'home' ||
    reviewSessionId !== null ||
    productRoute.kind !== 'home' ||
    snapshot.replacementRequest !== null ||
    snapshot.quickDraftConfirmation;

  useKeepAwake(productPreferences.keepAwake && snapshot.screen === 'game');

  useEffect(() => coordinator.subscribe(setSnapshot), [coordinator]);
  useEffect(() => commercial.subscribe(setCommercialSnapshot), [commercial]);

  useEffect(() => {
    const wallet = commercialSnapshot.wallet;
    if (wallet) {
      settle(coordinator.refreshWallet());
    }
  }, [commercialSnapshot.wallet, coordinator]);

  useEffect(() => {
    setReviewSessionId(null);
    setReplayRoute(null);
  }, [snapshot.session?.state.sessionId, snapshot.screen]);

  useEffect(() => {
    if (commercialSurfaceBlocked && creditRequest) {
      setCreditRequest(null);
    }
  }, [commercialSurfaceBlocked, creditRequest]);

  useEffect(() => {
    coordinator.setNewGameSettings(
      gameSettingsFromProductPreferences(productPreferences),
    );
    coordinator.setAutoFinishTrivialTail(
      productPreferences.autoFinishTrivialTail,
    );
  }, [coordinator, productPreferences]);

  useEffect(() => {
    if (snapshot.screen !== 'home') {
      setProductRoute({ kind: 'home' });
    }
  }, [snapshot.screen]);

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
        if (
          snapshot.screen === 'home' &&
          productRoute.kind === 'settings' &&
          productRoute.page
        ) {
          setProductRoute({ kind: 'settings' });
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
  }, [activeTab, hintLabOpen, productRoute, replayRoute, snapshot.screen]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        settle(coordinator.pause());
      }
    });
    return () => subscription.remove();
  }, [coordinator]);

  const invoke = (operation: () => Promise<void>) => () => {
    settle(operation());
  };
  const selectCell = useCallback(
    (cell: number) => {
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
  const completeFullHouse = useCallback(
    (cell: number) => {
      playInteractionFeedback(productPreferences);
      settle(coordinator.selectCell(cell));
      settle(coordinator.completeFullHouse(cell));
    },
    [coordinator, productPreferences],
  );
  const recordReplayFocus = useCallback(
    (cell: number | null, digit: Digit | null) =>
      coordinator.recordReplayFocus(cell, digit),
    [coordinator],
  );
  const changePreferences = (patch: Partial<ProductPreferences>) => {
    settle(preferences.updatePreferences(patch));
  };
  const previewMultiSelectOnboarding = () => {
    setMultiSelectPreviewRun(run => run + 1);
    setMultiSelectReplayArmed(true);
  };
  const feedback = () => {
    playInteractionFeedback(productPreferences);
  };
  const selectResultTab = (tab: RootTab) => {
    setActiveTab(tab);
    settle(coordinator.newGameFromResult());
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar barStyle={statusBarStyle} />
      {__DEV__ && completionPreviewOpen ? (
        <CompletionResultPreview
          onClose={() => setCompletionPreviewOpen(false)}
        />
      ) : null}
      {__DEV__ && hintLabOpen ? (
        <HintLab onClose={() => setHintLabOpen(false)} />
      ) : null}
      {!completionPreviewOpen &&
      !hintLabOpen &&
      !replayRoute &&
      snapshot.screen === 'home' &&
      productRoute.kind === 'home' &&
      activeTab === 'home' ? (
        <HomeScreen
          onOpenCompletionPreview={
            __DEV__ ? () => setCompletionPreviewOpen(true) : undefined
          }
          onOpenHintLab={__DEV__ ? () => setHintLabOpen(true) : undefined}
          onOpenSettings={() => setProductRoute({ kind: 'settings' })}
          onPreviewMultiSelectOnboarding={previewMultiSelectOnboarding}
          onResume={invoke(() => coordinator.resumeGame())}
          onStart={level => settle(coordinator.requestNewGame(level))}
          onTopUpDebugCredits={
            __DEV__ ? invoke(() => coordinator.topUpDebugCredits()) : undefined
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
          onPreviewMultiSelectOnboarding={previewMultiSelectOnboarding}
          onOpenLicenses={() =>
            setProductRoute({ kind: 'licenses', returnTo: 'settings' })
          }
          onOpenPremium={() =>
            setProductRoute({ kind: 'premium', returnTo: 'settings' })
          }
          onRestorePurchase={() => commercial.restorePremium()}
          onTopUpDebugCredits={
            __DEV__ ? invoke(() => coordinator.topUpDebugCredits()) : undefined
          }
          onTopUpSmartHint={async () => {
            const result = await commercial.redeemRewardedAd(
              'smart_hint',
              'home_credit_store',
            );
            await coordinator.refreshWallet();
            return result;
          }}
          onTopUpQuickPencil={async () => {
            const result = await commercial.redeemRewardedAd(
              'quick_pencil',
              'home_credit_store',
            );
            await coordinator.refreshWallet();
            return result;
          }}
          onOpenHelp={
            RELEASE_CORE_FEATURES.howToPlay
              ? () => setProductRoute({ kind: 'help', returnTo: 'settings' })
              : undefined
          }
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
          onBack={() => setProductRoute({ kind: productRoute.returnTo })}
          onLoadProduct={() => commercial.loadPremiumProduct()}
          onPurchase={() => commercial.purchasePremium()}
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
          completed={productPreferences.howToPlayCompleted}
          onBack={() => setProductRoute({ kind: productRoute.returnTo })}
          onProgressChange={patch => changePreferences(patch)}
          onStartLevelOne={() => {
            setProductRoute({ kind: 'home' });
            settle(coordinator.requestNewGame(1));
          }}
          progress={productPreferences.howToPlayProgress}
        />
      ) : null}
      {!hintLabOpen &&
      !replayRoute &&
      RELEASE_CORE_FEATURES.game &&
      snapshot.screen === 'game' ? (
        <GameScreen
          onAbandon={invoke(() => coordinator.abandonToHome())}
          onApplyHint={() => {
            feedback();
            settle(coordinator.applyHint());
          }}
          onBack={invoke(() => coordinator.returnHome())}
          onDigit={inputDigit}
          onRemoveCandidateFromCells={(cells, digit) => {
            feedback();
            settle(coordinator.editCandidates(cells, [digit], 'remove'));
          }}
          onMultiSelectOnboardingSeen={() =>
            changePreferences({ multiSelectOnboardingSeen: true })
          }
          replayMultiSelectOnboarding={multiSelectReplayArmed}
          onMultiSelectOnboardingReplayUsed={() =>
            setMultiSelectReplayArmed(false)
          }
          onCompleteFullHouse={completeFullHouse}
          onColorCells={(cells, color, toggleSameColor) =>
            settle(coordinator.colorCells(cells, color, toggleSameColor))
          }
          onClearBoardColors={() => settle(coordinator.clearBoardColors())}
          onDismissHint={invoke(() => coordinator.dismissHint())}
          onErase={() => {
            feedback();
            settle(coordinator.erase());
          }}
          onHint={() => {
            feedback();
            if (
              snapshot.wallet.smart_hint.balance === 0 &&
              snapshot.session?.state.activeHint === null
            ) {
              setCreditRequest({
                resource: 'smart_hint',
                placement: 'credit_exhausted',
              });
            } else {
              settle(coordinator.requestHint());
            }
          }}
          onPause={invoke(() => coordinator.pause())}
          onPencil={() => {
            feedback();
            settle(coordinator.togglePencil());
          }}
          onQuickPencil={() => {
            feedback();
            if (
              snapshot.wallet.quick_pencil.balance === 0 &&
              snapshot.session?.state.candidates.activeCandidateSource !==
                'quick'
            ) {
              setCreditRequest({
                resource: 'quick_pencil',
                placement: 'credit_exhausted',
              });
            } else {
              settle(coordinator.toggleQuickPencil());
            }
          }}
          onQuickFinish={() => {
            feedback();
            settle(coordinator.quickFinishTrivialTail());
          }}
          onResume={invoke(() => coordinator.resumePausedGame())}
          onReplayFocusChange={recordReplayFocus}
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
      {!hintLabOpen &&
      !completionPreviewOpen &&
      !replayRoute &&
      !reviewSessionId &&
      ((snapshot.screen === 'home' && productRoute.kind === 'home') ||
        (snapshot.screen === 'result' &&
          snapshot.session?.state.status === 'completed')) ? (
        <RootTabBar
          activeTab={activeTab}
          onSelect={
            snapshot.screen === 'result' ? selectResultTab : setActiveTab
          }
        />
      ) : null}
      {!completionPreviewOpen && !hintLabOpen && snapshot.message ? (
        <Pressable
          accessibilityLabel={translateCoordinatorMessage(t, snapshot.message)}
          accessibilityHint={t('app.dismissMessage')}
          accessibilityRole="button"
          onPress={() => coordinator.clearMessage()}
          style={styles.message}
        >
          <Text style={styles.messageText}>
            {translateCoordinatorMessage(t, snapshot.message)}
          </Text>
          <Text
            accessibilityElementsHidden
            allowFontScaling={false}
            importantForAccessibility="no-hide-descendants"
            style={styles.messageClose}
          >
            ×
          </Text>
        </Pressable>
      ) : null}

      <CreditTopUpModal
        balance={
          creditRequest ? snapshot.wallet[creditRequest.resource].balance : 0
        }
        onCheckAvailability={() =>
          creditRequest
            ? commercial.getRewardedAdAvailability(
                creditRequest.resource,
                creditRequest.placement,
              )
            : Promise.resolve({
                status: 'unavailable' as const,
                reason: 'sdk_unavailable' as const,
              })
        }
        onClose={() => setCreditRequest(null)}
        onRedeem={async () => {
          if (!creditRequest) {
            return { status: 'unavailable', reason: 'no_resource' };
          }
          const result = await commercial.redeemRewardedAd(
            creditRequest.resource,
            creditRequest.placement,
          );
          await coordinator.refreshWallet();
          return result;
        }}
        resource={creditRequest?.resource ?? 'smart_hint'}
        visible={creditRequest !== null && !commercialSurfaceBlocked}
      />

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
      {multiSelectPreviewRun > 0 ? (
        <MultiSelectOnboardingOverlay
          onDismiss={() => setMultiSelectPreviewRun(0)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function RuntimeExperience({
  commercial,
  coordinator,
  preferences,
  sessionReview,
  sessionReviewAnalyzer,
  sessionReplay,
}: {
  commercial: ProductionRuntime['commercial'];
  coordinator: OfflineGameCoordinator;
  preferences: ProductPreferencesController;
  sessionReview?: SessionReviewSource;
  sessionReviewAnalyzer?: TechniqueOpportunityAnalyzer;
  sessionReplay?: SessionReplaySource;
}): React.JSX.Element {
  const [snapshot, setSnapshot] = useState(preferences.snapshot);
  useEffect(() => preferences.subscribe(setSnapshot), [preferences]);
  return (
    <LocalizationProvider locale={snapshot.effectiveLocale}>
      <ThemeProvider
        preference="light"
        alternatingBoxShading={snapshot.preferences.alternatingBoxShading}
      >
        <ScreenStateProvider>
          <AppBody
            commercial={commercial}
            coordinator={coordinator}
            preferenceSnapshot={snapshot}
            preferences={preferences}
            sessionReview={sessionReview}
            sessionReviewAnalyzer={sessionReviewAnalyzer}
            sessionReplay={sessionReplay}
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
          style={styles.centered}
        >
          <ActivityIndicator color={palette.accent} size="large" />
          <Text style={styles.loadingText}>{t('app.loading')}</Text>
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
        } else {
          nextRuntime.close();
        }
      })
      .catch(error => {
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

  return (
    <SafeAreaProvider>
      {runtime ? (
        <RuntimeExperience
          commercial={runtime.commercial}
          coordinator={runtime.coordinator}
          preferences={runtime.preferences}
          sessionReview={runtime.sessionReview}
          sessionReviewAnalyzer={runtime.sessionReviewAnalyzer}
          sessionReplay={runtime.sessionReplay}
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
    centered: {
      alignItems: 'center',
      backgroundColor: palette.background,
      flex: 1,
      justifyContent: 'center',
      padding: 28,
    },
    loadingText: {
      color: palette.muted,
      fontSize: 14,
      marginTop: 14,
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
      color: palette.white,
      fontSize: 22,
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
