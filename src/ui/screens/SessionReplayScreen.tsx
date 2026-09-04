import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { buildSessionReplay } from '../../application/game/session-replay';
import {
  ReplaySessionSummary,
  SessionReplaySource,
} from '../../application/game/session-replay-source';
import { GameMove, UndoSnapshot } from '../../domain/game/contracts';
import { HintStep } from '../../domain/hints/contracts';
import { buildHintPresentation } from '../../domain/hints/presentation';
import { Board } from '../../domain/sudoku/contracts';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { SudokuBoard, SudokuBoardState } from '../components/SudokuBoard';
import { AppPalette, useAppTheme } from '../theme';

const noSelect = () => undefined;
function boardState(snapshot: UndoSnapshot, givens: Board): SudokuBoardState {
  return { ...snapshot, givens, selectedCell: null, activeHint: null };
}
function actionName(move: GameMove | null, fallback: string) {
  return move ? move.kind.replace(/_/g, ' ') : fallback;
}

function sessionStatusLabel(
  status: string,
  t: ReturnType<typeof useLocalization>['t'],
): string {
  switch (status) {
    case 'completed':
      return t('replay.statusCompleted');
    case 'failed':
      return t('replay.statusFailed');
    case 'abandoned':
      return t('replay.statusAbandoned');
    default:
      return status;
  }
}

function ReplayHeader({
  backLabel,
  onBack,
  title,
  right,
}: {
  backLabel: string;
  onBack(): void;
  title: string;
  right?: React.ReactNode;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={styles.back}
      >
        <Text style={styles.backText}>‹ {backLabel}</Text>
      </Pressable>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={styles.headerTitle}
      >
        {title}
      </Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

/** Dedicated, read-only replay surface. Walkthrough state is separate from the recorded timeline. */
export function SessionReplayScreen({
  sessionId,
  source,
  onClose,
}: {
  sessionId: string;
  source: SessionReplaySource;
  onClose(): void;
}): React.JSX.Element {
  const { locale, t } = useLocalization();
  const { palette } = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [session, setSession] =
    useState<Awaited<ReturnType<SessionReplaySource['readReplaySession']>>>(
      null,
    );
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [walkthrough, setWalkthrough] = useState<HintStep | null>(null);
  const [page, setPage] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    let live = true;
    setPlaying(false);
    setWalkthrough(null);
    setIndex(0);
    source
      .readReplaySession(sessionId)
      .then(value => live && setSession(value))
      .catch(() => live && setSession(null));
    return () => {
      live = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [sessionId, source]);
  const replay = useMemo(
    () => session && buildSessionReplay(session),
    [session],
  );
  const frames = replay?.frames ?? [];
  const frame = frames[index];
  const presentation = walkthrough
    ? buildHintPresentation(walkthrough, HINT_PRESENTATION_COPIES[locale])
    : null;
  const hintPage = presentation?.pages[page];
  useEffect(() => {
    if (!playing || frames.length < 2) return;
    timer.current = setInterval(
      () =>
        setIndex(current => {
          if (current >= frames.length - 1) {
            setPlaying(false);
            return current;
          }
          return current + 1;
        }),
      750,
    );
    return () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
  }, [frames.length, playing]);
  const leaveWalkthrough = () => {
    setPlaying(false);
    setWalkthrough(null);
    setPage(0);
  };
  if (!session)
    return (
      <View style={styles.screen}>
        <ReplayHeader
          backLabel={t('app.back')}
          onBack={onClose}
          title={t('replay.title')}
        />
        <View style={styles.center}>
          <ActivityIndicator color={palette.accent} />
        </View>
      </View>
    );
  if (!replay || !frame)
    return (
      <View style={styles.screen}>
        <ReplayHeader
          backLabel={t('app.back')}
          onBack={onClose}
          title={t('replay.title')}
        />
        <View style={styles.center}>
          <Text style={styles.body}>{t('replay.unavailable')}</Text>
        </View>
      </View>
    );
  const theoreticalSnapshot =
    walkthrough && frame.move ? frame.move.before : frame.snapshot;
  const finalOnly = replay.coverage === 'final_snapshot_only';
  return (
    <View style={styles.screen}>
      <ReplayHeader
        backLabel={walkthrough ? t('replay.exitWalkthrough') : t('app.back')}
        onBack={() => (walkthrough ? leaveWalkthrough() : onClose())}
        right={<Text style={styles.readOnly}>{t('replay.readOnly')}</Text>}
        title={walkthrough ? presentation!.techniqueName : t('replay.title')}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        {walkthrough && hintPage ? (
          <View style={styles.intro}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {hintPage.title}
            </Text>
            <Text style={styles.body}>{hintPage.body}</Text>
            <Text style={styles.meta}>{t('replay.theoryNote')}</Text>
          </View>
        ) : (
          <View style={styles.intro}>
            <Text style={styles.body}>{replay.note}</Text>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {t('replay.step', {
                current: index,
                total: Math.max(frames.length - 1, 0),
              })}
            </Text>
            <Text style={styles.action}>
              {actionName(frame.move, t('replay.start'))}
            </Text>
          </View>
        )}
        <View style={[styles.content, width >= 700 && styles.contentTablet]}>
          <View style={styles.board}>
            <SudokuBoard
              disabled
              hintAnimations={false}
              hintSpotlight={false}
              hintVisuals={hintPage?.visuals}
              highlightRegions={false}
              highlightSameDigit={false}
              onSelectCell={noSelect}
              state={boardState(theoreticalSnapshot, session.state.givens)}
            />
          </View>
          {!walkthrough ? (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t('replay.action')}</Text>
              <Text style={styles.action}>
                {actionName(frame.move, t('replay.start'))}
              </Text>
              <Text style={styles.meta}>
                {finalOnly
                  ? t('replay.finalSnapshot')
                  : t('replay.actionDetail')}
              </Text>
              {frame.move?.appliedHint ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setPlaying(false);
                    setPage(0);
                    setWalkthrough(frame.move!.appliedHint);
                  }}
                  style={styles.primary}
                >
                  <Text style={styles.primaryText}>{t('replay.explain')}</Text>
                </Pressable>
              ) : (
                <Text style={styles.meta}>{t('replay.noExplanation')}</Text>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
      {walkthrough && presentation && hintPage ? (
        <View style={styles.footer}>
          <Pressable
            disabled={page === 0}
            onPress={() => setPage(value => Math.max(0, value - 1))}
            style={styles.control}
          >
            <Text style={styles.controlText}>{t('hint.back')}</Text>
          </Pressable>
          <Text style={styles.progress}>
            {t('hint.stepProgress', {
              current: page + 1,
              total: presentation.pages.length,
            })}
          </Text>
          <Pressable
            disabled={page === presentation.pages.length - 1}
            onPress={() =>
              setPage(value =>
                Math.min(presentation.pages.length - 1, value + 1),
              )
            }
            style={styles.control}
          >
            <Text style={styles.controlText}>{t('hint.next')}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.footer}>
          <Pressable
            accessibilityLabel={t('replay.toStart')}
            disabled={finalOnly}
            onPress={() => {
              setPlaying(false);
              setIndex(0);
            }}
            style={styles.icon}
          >
            <Text style={styles.controlText}>|◀</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t('replay.previous')}
            disabled={index === 0}
            onPress={() => {
              setPlaying(false);
              setIndex(value => Math.max(0, value - 1));
            }}
            style={styles.icon}
          >
            <Text style={styles.controlText}>‹</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={playing ? t('replay.pause') : t('replay.play')}
            disabled={finalOnly}
            onPress={() => setPlaying(value => !value)}
            style={styles.play}
          >
            <Text style={styles.playText}>
              {playing ? t('replay.pause') : t('replay.play')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t('replay.next')}
            disabled={index === frames.length - 1}
            onPress={() => {
              setPlaying(false);
              setIndex(value => Math.min(frames.length - 1, value + 1));
            }}
            style={styles.icon}
          >
            <Text style={styles.controlText}>›</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t('replay.toEnd')}
            disabled={finalOnly}
            onPress={() => {
              setPlaying(false);
              setIndex(frames.length - 1);
            }}
            style={styles.icon}
          >
            <Text style={styles.controlText}>▶|</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export function ReplayLibraryScreen({
  source,
  onClose,
  onOpen,
}: {
  source: SessionReplaySource;
  onClose(): void;
  onOpen(sessionId: string): void;
}): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [items, setItems] = useState<readonly ReplaySessionSummary[] | null>(
    null,
  );
  useEffect(() => {
    let live = true;
    source
      .listReplaySessions()
      .then(value => live && setItems(value))
      .catch(() => live && setItems([]));
    return () => {
      live = false;
    };
  }, [source]);
  return (
    <View style={styles.screen}>
      <ReplayHeader
        backLabel={t('app.back')}
        onBack={onClose}
        title={t('replay.history')}
      />
      <ScrollView contentContainerStyle={styles.library}>
        <Text style={styles.body}>{t('replay.historyNote')}</Text>
        {items === null ? (
          <View style={styles.center}>
            <ActivityIndicator color={palette.accent} />
          </View>
        ) : items.length ? (
          items.map(item => (
            <Pressable
              accessibilityRole="button"
              key={item.sessionId}
              onPress={() => onOpen(item.sessionId)}
              style={styles.sessionCard}
            >
              <View style={styles.cardTop}>
                <Text style={styles.sectionTitle}>
                  {t('game.level', { level: item.difficultyLevel })}
                </Text>
                <Text style={styles.status}>
                  {sessionStatusLabel(item.status, t)}
                </Text>
              </View>
              <Text style={styles.meta}>
                {new Date(item.updatedAtEpochMs).toLocaleDateString()}
              </Text>
              <Text style={styles.recovery}>
                {item.recoverability === 'action_history'
                  ? t('replay.available')
                  : t('replay.finalSnapshot')}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.body}>{t('replay.historyEmpty')}</Text>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    header: {
      alignItems: 'center',
      borderBottomColor: palette.line,
      borderBottomWidth: 1,
      flexDirection: 'row',
      minHeight: 58,
      paddingHorizontal: 12,
    },
    back: { justifyContent: 'center', minHeight: 44, minWidth: 84 },
    backText: { color: palette.accent, fontSize: 16, fontWeight: '700' },
    headerTitle: {
      color: palette.ink,
      flex: 1,
      fontSize: 18,
      fontWeight: '800',
      textAlign: 'center',
    },
    headerRight: { alignItems: 'flex-end', minWidth: 84 },
    readOnly: { color: palette.muted, fontSize: 12, fontWeight: '700' },
    center: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    scroll: {
      alignSelf: 'center',
      gap: 14,
      maxWidth: 1000,
      padding: 16,
      width: '100%',
    },
    library: {
      alignSelf: 'center',
      gap: 12,
      maxWidth: 720,
      padding: 16,
      paddingBottom: 32,
      width: '100%',
    },
    intro: { gap: 6 },
    content: { gap: 14 },
    contentTablet: { alignItems: 'flex-start', flexDirection: 'row' },
    board: { alignItems: 'center', flex: 1, width: '100%' },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 16,
      borderWidth: 1,
      gap: 8,
      padding: 16,
      width: '100%',
    },
    cardLabel: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
    },
    sectionTitle: { color: palette.ink, fontSize: 19, fontWeight: '800' },
    action: {
      color: palette.ink,
      fontSize: 18,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    body: { color: palette.ink, fontSize: 16, lineHeight: 23 },
    meta: { color: palette.muted, fontSize: 13, lineHeight: 19 },
    primary: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 12,
      justifyContent: 'center',
      minHeight: 48,
      padding: 12,
    },
    primaryText: { color: palette.white, fontSize: 16, fontWeight: '800' },
    footer: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderTopColor: palette.line,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'space-between',
      minHeight: 70,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    control: {
      alignItems: 'center',
      borderColor: palette.line,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 76,
      paddingHorizontal: 10,
    },
    icon: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 40,
    },
    controlText: { color: palette.accent, fontSize: 15, fontWeight: '800' },
    play: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 12,
      justifyContent: 'center',
      minHeight: 46,
      minWidth: 94,
      paddingHorizontal: 12,
    },
    playText: { color: palette.white, fontSize: 15, fontWeight: '800' },
    progress: {
      color: palette.muted,
      flex: 1,
      fontSize: 13,
      textAlign: 'center',
    },
    sessionCard: {
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 16,
      borderWidth: 1,
      gap: 5,
      padding: 16,
    },
    cardTop: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    status: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'capitalize',
    },
    recovery: {
      color: palette.muted,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 3,
    },
  });
}
