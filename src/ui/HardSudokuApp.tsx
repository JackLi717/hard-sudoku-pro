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
import {
  ProductionRuntime,
  createProductionRuntime,
} from '../app/production-runtime';
import { HomeScreen } from './screens/HomeScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import {
  HelpScreen,
  StatisticsScreen,
  TechniqueCatalogScreen,
  TechniqueDetailScreen,
} from './screens/ProductInfoScreens';
import { AppPalette, ThemeProvider, useAppTheme } from './theme';
import {
  playInteractionFeedback,
  useKeepAwake,
} from './product-experience-effects';
import { HintLab } from '../debug/HintLab';
import {
  LocalizationProvider,
  translateCoordinatorMessage,
  useLocalization,
} from '../localization';
import { TechniqueCode } from '../domain/hints/techniques';

type RuntimeFactory = () => Promise<ProductionRuntime>;

type AppBodyProps = {
  coordinator: OfflineGameCoordinator;
  preferenceSnapshot: ProductPreferenceSnapshot;
  preferences: ProductPreferencesController;
};

type ProductRoute =
  | { kind: 'home' }
  | { kind: 'settings' }
  | { kind: 'statistics' }
  | { kind: 'help' }
  | { kind: 'techniques' }
  | { kind: 'technique'; code: TechniqueCode };

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
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalBody}>{body}</Text>
          <View style={styles.modalActions}>
            <Pressable onPress={onCancel} style={styles.modalSecondary}>
              <Text style={styles.modalSecondaryText}>{t('app.cancel')}</Text>
            </Pressable>
            <Pressable
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
  coordinator,
  preferenceSnapshot,
  preferences,
}: AppBodyProps): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<OfflineGameSnapshot>(
    coordinator.snapshot,
  );
  const [hintLabOpen, setHintLabOpen] = useState(false);
  const [productRoute, setProductRoute] = useState<ProductRoute>({
    kind: 'home',
  });
  const { t } = useLocalization();
  const { palette, statusBarStyle } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const productPreferences = preferenceSnapshot.preferences;

  useKeepAwake(productPreferences.keepAwake && snapshot.screen === 'game');

  useEffect(() => coordinator.subscribe(setSnapshot), [coordinator]);

  useEffect(() => {
    coordinator.setNewGameSettings(
      gameSettingsFromProductPreferences(productPreferences),
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
        if (snapshot.screen === 'home' && productRoute.kind !== 'home') {
          setProductRoute(
            productRoute.kind === 'technique'
              ? { kind: 'techniques' }
              : { kind: 'home' },
          );
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [hintLabOpen, productRoute, snapshot.screen]);

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
    (cell: number) => settle(coordinator.selectCell(cell)),
    [coordinator],
  );
  const changePreferences = (patch: Partial<ProductPreferences>) => {
    settle(preferences.updatePreferences(patch));
  };
  const feedback = () => {
    playInteractionFeedback(productPreferences);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <StatusBar barStyle={statusBarStyle} />
      {__DEV__ && hintLabOpen ? (
        <HintLab onClose={() => setHintLabOpen(false)} />
      ) : null}
      {!hintLabOpen &&
      snapshot.screen === 'home' &&
      productRoute.kind === 'home' ? (
        <HomeScreen
          onOpenHintLab={__DEV__ ? () => setHintLabOpen(true) : undefined}
          onOpenHelp={() => setProductRoute({ kind: 'help' })}
          onOpenSettings={() => setProductRoute({ kind: 'settings' })}
          onOpenStatistics={() => setProductRoute({ kind: 'statistics' })}
          onOpenTechniques={() => setProductRoute({ kind: 'techniques' })}
          onResume={invoke(() => coordinator.resumeGame())}
          onStart={level => settle(coordinator.requestNewGame(level))}
          snapshot={snapshot}
        />
      ) : null}
      {!hintLabOpen &&
      snapshot.screen === 'home' &&
      productRoute.kind === 'settings' ? (
        <SettingsScreen
          onBack={() => setProductRoute({ kind: 'home' })}
          onChange={changePreferences}
          preferences={productPreferences}
        />
      ) : null}
      {!hintLabOpen &&
      snapshot.screen === 'home' &&
      productRoute.kind === 'statistics' ? (
        <StatisticsScreen
          onBack={() => setProductRoute({ kind: 'home' })}
          snapshot={snapshot}
        />
      ) : null}
      {!hintLabOpen &&
      snapshot.screen === 'home' &&
      productRoute.kind === 'help' ? (
        <HelpScreen onBack={() => setProductRoute({ kind: 'home' })} />
      ) : null}
      {!hintLabOpen &&
      snapshot.screen === 'home' &&
      productRoute.kind === 'techniques' ? (
        <TechniqueCatalogScreen
          onBack={() => setProductRoute({ kind: 'home' })}
          onOpenTechnique={code => setProductRoute({ kind: 'technique', code })}
        />
      ) : null}
      {!hintLabOpen &&
      snapshot.screen === 'home' &&
      productRoute.kind === 'technique' ? (
        <TechniqueDetailScreen
          code={productRoute.code}
          onBack={() => setProductRoute({ kind: 'techniques' })}
        />
      ) : null}
      {!hintLabOpen && snapshot.screen === 'game' ? (
        <GameScreen
          onAbandon={invoke(() => coordinator.abandonToHome())}
          onApplyHint={() => {
            feedback();
            settle(coordinator.applyHint());
          }}
          onBack={invoke(() => coordinator.returnHome())}
          onDigit={digit => {
            feedback();
            settle(coordinator.inputDigit(digit));
          }}
          onDismissHint={invoke(() => coordinator.dismissHint())}
          onErase={() => {
            feedback();
            settle(coordinator.erase());
          }}
          onHint={() => {
            feedback();
            settle(coordinator.requestHint());
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
          onResume={invoke(() => coordinator.resumePausedGame())}
          onSelectCell={cell => {
            feedback();
            selectCell(cell);
          }}
          onUndo={() => {
            feedback();
            settle(coordinator.undo());
          }}
          preferences={productPreferences}
          snapshot={snapshot}
        />
      ) : null}
      {!hintLabOpen && snapshot.screen === 'result' ? (
        <ResultScreen
          onNewGame={invoke(() => coordinator.newGameFromResult())}
          onNext={invoke(() => coordinator.nextPuzzle())}
          onRetry={invoke(() => coordinator.retryPuzzle())}
          snapshot={snapshot}
        />
      ) : null}

      {!hintLabOpen && snapshot.message ? (
        <Pressable
          accessibilityHint={t('app.dismissMessage')}
          accessibilityRole="button"
          onPress={() => coordinator.clearMessage()}
          style={styles.message}
        >
          <Text style={styles.messageText}>
            {translateCoordinatorMessage(t, snapshot.message)}
          </Text>
          <Text style={styles.messageClose}>×</Text>
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
  coordinator,
  preferences,
}: {
  coordinator: OfflineGameCoordinator;
  preferences: ProductPreferencesController;
}): React.JSX.Element {
  const [snapshot, setSnapshot] = useState(preferences.snapshot);
  useEffect(() => preferences.subscribe(setSnapshot), [preferences]);
  return (
    <LocalizationProvider locale={snapshot.effectiveLocale}>
      <ThemeProvider preference={snapshot.preferences.theme}>
        <AppBody
          coordinator={coordinator}
          preferenceSnapshot={snapshot}
          preferences={preferences}
        />
      </ThemeProvider>
    </LocalizationProvider>
  );
}

function BootstrapScreen({ failure }: { failure: string | null }) {
  const { t } = useLocalization();
  const { palette, statusBarStyle } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <>
      <StatusBar barStyle={statusBarStyle} />
      {failure ? (
        <SafeAreaView style={styles.centered}>
          <Text style={styles.failureTitle}>{t('app.failureTitle')}</Text>
          <Text style={styles.failureBody}>{t('app.failureBody')}</Text>
          {__DEV__ ? <Text style={styles.failureDetail}>{failure}</Text> : null}
        </SafeAreaView>
      ) : (
        <View style={styles.centered}>
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

  useEffect(() => {
    let active = true;
    let created: ProductionRuntime | null = null;
    runtimeFactory()
      .then(async nextRuntime => {
        created = nextRuntime;
        await Promise.all([
          nextRuntime.coordinator.initialize(),
          nextRuntime.preferences.initialize(),
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
  }, [runtimeFactory]);

  return (
    <SafeAreaProvider>
      {runtime ? (
        <RuntimeExperience
          coordinator={runtime.coordinator}
          preferences={runtime.preferences}
        />
      ) : (
        <LocalizationProvider
          locale={resolveProductLocale('system', detectDeviceLocale())}
        >
          <ThemeProvider preference="system">
            <BootstrapScreen failure={failure} />
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
      justifyContent: 'flex-end',
      marginTop: 22,
    },
    modalSecondary: {
      borderColor: palette.line,
      borderRadius: 12,
      borderWidth: 1,
      marginRight: 8,
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
