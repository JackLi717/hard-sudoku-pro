import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { OfflineGameCoordinator, OfflineGameSnapshot } from '../application';
import {
  ProductionRuntime,
  createProductionRuntime,
} from '../app/production-runtime';
import { HomeScreen } from './screens/HomeScreen';
import { GameScreen } from './screens/GameScreen';
import { ResultScreen } from './screens/ResultScreen';
import { palette } from './theme';
import { HintLab } from '../debug/HintLab';

type RuntimeFactory = () => Promise<ProductionRuntime>;

type AppBodyProps = {
  coordinator: OfflineGameCoordinator;
};

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
              <Text style={styles.modalSecondaryText}>Cancel</Text>
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

function AppBody({ coordinator }: AppBodyProps): React.JSX.Element {
  const [snapshot, setSnapshot] = useState<OfflineGameSnapshot>(
    coordinator.snapshot,
  );
  const [hintLabOpen, setHintLabOpen] = useState(false);

  useEffect(() => coordinator.subscribe(setSnapshot), [coordinator]);

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

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      {__DEV__ && hintLabOpen ? (
        <HintLab onClose={() => setHintLabOpen(false)} />
      ) : null}
      {!hintLabOpen && snapshot.screen === 'home' ? (
        <HomeScreen
          onOpenHintLab={__DEV__ ? () => setHintLabOpen(true) : undefined}
          onResume={invoke(() => coordinator.resumeGame())}
          onStart={level => settle(coordinator.requestNewGame(level))}
          snapshot={snapshot}
        />
      ) : null}
      {!hintLabOpen && snapshot.screen === 'game' ? (
        <GameScreen
          onAbandon={invoke(() => coordinator.abandonToHome())}
          onApplyHint={invoke(() => coordinator.applyHint())}
          onBack={invoke(() => coordinator.returnHome())}
          onDigit={digit => settle(coordinator.inputDigit(digit))}
          onDismissHint={invoke(() => coordinator.dismissHint())}
          onErase={invoke(() => coordinator.erase())}
          onHint={invoke(() => coordinator.requestHint())}
          onPause={invoke(() => coordinator.pause())}
          onPencil={invoke(() => coordinator.togglePencil())}
          onQuickPencil={invoke(() => coordinator.toggleQuickPencil())}
          onResume={invoke(() => coordinator.resumePausedGame())}
          onSelectCell={selectCell}
          onUndo={invoke(() => coordinator.undo())}
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
          accessibilityHint="Dismiss message"
          accessibilityRole="button"
          onPress={() => coordinator.clearMessage()}
          style={styles.message}
        >
          <Text style={styles.messageText}>{snapshot.message}</Text>
          <Text style={styles.messageClose}>×</Text>
        </Pressable>
      ) : null}

      <ConfirmationModal
        body="Your current game will be recorded as abandoned. This cannot be undone."
        confirmLabel="Abandon and start"
        destructive
        onCancel={() => coordinator.cancelReplacement()}
        onConfirm={() => settle(coordinator.confirmReplacement())}
        title={`Start Level ${snapshot.replacementRequest?.level ?? ''}?`}
        visible={!hintLabOpen && snapshot.replacementRequest !== null}
      />
      <ConfirmationModal
        body="The board has changed. Regenerating replaces the saved quick draft and uses one quick-pencil credit."
        confirmLabel="Regenerate"
        onCancel={() => coordinator.cancelQuickDraftRegeneration()}
        onConfirm={() => settle(coordinator.confirmQuickDraftRegeneration())}
        title="Regenerate quick draft?"
        visible={!hintLabOpen && snapshot.quickDraftConfirmation}
      />
    </SafeAreaView>
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
        await nextRuntime.coordinator.initialize();
        if (active) {
          setRuntime(nextRuntime);
        } else {
          nextRuntime.close();
        }
      })
      .catch(error => {
        created?.close();
        if (active) {
          setFailure(
            error instanceof Error ? error.message : 'The app could not start.',
          );
        }
      });
    return () => {
      active = false;
      created?.close();
    };
  }, [runtimeFactory]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {runtime ? (
        <AppBody coordinator={runtime.coordinator} />
      ) : failure ? (
        <SafeAreaView style={styles.centered}>
          <Text style={styles.failureTitle}>
            Unable to open your Sudoku data
          </Text>
          <Text style={styles.failureBody}>{failure}</Text>
        </SafeAreaView>
      ) : (
        <View style={styles.centered}>
          <ActivityIndicator color={palette.accent} size="large" />
          <Text style={styles.loadingText}>Preparing offline puzzles…</Text>
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(24, 32, 29, 0.55)',
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
