import { useReplayExplanations } from './useReplayExplanations';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
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
import { GameSession, UndoSnapshot } from '../../domain/game/contracts';
import { HintStep } from '../../domain/hints/contracts';
import { buildHintPresentation } from '../../domain/hints/presentation';
import {
  boardFromFingerprint,
  createSolverCandidates,
} from '../../domain/sudoku/board';
import {
  replayActionEffects,
  replayChanges,
} from '../../application/game/replay-explanations';
import { ReasoningPath } from '../../application/technique-recognition/reasoning-paths';
import { HintPageVisuals } from '../../domain/hints/presentation';
import { Board, Digit } from '../../domain/sudoku/contracts';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { SudokuBoard, SudokuBoardState } from '../components/SudokuBoard';
import { AppPalette, useAppTheme } from '../theme';

const noSelect = () => undefined;
function boardState(snapshot: UndoSnapshot, givens: Board): SudokuBoardState {
  return { ...snapshot, givens, selectedCell: null, activeHint: null };
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

/** Read-only history and private theoretical walkthroughs never issue game commands. */
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
  const { height } = useWindowDimensions();
  const [layoutHeight, setLayoutHeight] = useState(height - 80);
  const [foreground, setForeground] = useState(true);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [before, setBefore] = useState(false);
  const [info, setInfo] = useState(false);
  const [walkthrough, setWalkthrough] = useState<
    { step: HintStep; snapshot: UndoSnapshot; unobserved: boolean }[] | null
  >(null);
  const [page, setPage] = useState(0);
  const [trackWidth, setTrackWidth] = useState(1);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setSession(null);
    setPlaying(false);
    setWalkthrough(null);
    setIndex(0);
    source
      .readReplaySession(sessionId)
      .then(value => {
        if (live) {
          setSession(value);
          setLoading(false);
        }
      })
      .catch(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [sessionId, source]);
  useEffect(() => setBefore(false), [index, sessionId]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state !== 'active') {
        setPlaying(false);
      }
    });
    return () => subscription.remove();
  }, []);
  const replay = useMemo(
    () => session && buildSessionReplay(session),
    [session],
  );
  const frames = replay?.frames ?? [];
  const frame = frames[index];
  const changes = useMemo(() => replayChanges(frame?.move ?? null), [frame]);
  const pages = useMemo(
    () =>
      walkthrough?.flatMap((stage, stageIndex) =>
        buildHintPresentation(
          stage.step,
          HINT_PRESENTATION_COPIES[locale],
          'replay',
        ).pages.map(p => ({ ...p, ...stage, stageIndex })),
      ) ?? [],
    [walkthrough, locale],
  );
  const hintPage = pages[page];
  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const timer = setInterval(
      () =>
        setIndex(current => {
          if (current >= frames.length - 2) setPlaying(false);
          return Math.min(current + 1, frames.length - 1);
        }),
      1500 / speed,
    );
    return () => clearInterval(timer);
  }, [frames.length, playing, speed]);
  const leaveWalkthrough = () => {
    setPlaying(false);
    setWalkthrough(null);
    setPage(0);
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setPlaying(false);
        if (walkthrough) {
          setWalkthrough(null);
          setPage(0);
        } else onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [walkthrough, onClose]);
  const seek = (value: number) => {
    setPlaying(false);

    setIndex(Math.max(0, Math.min(frames.length - 1, value)));
  };
  const openPath = (path: ReasoningPath) => {
    setPlaying(false);

    setPage(0);
    setWalkthrough(
      path.stages.map(stage => ({
        step: stage.step,
        unobserved: stage.unobservedEffects.length > 0,
        snapshot: {
          ...frame.snapshot,
          values: boardFromFingerprint(stage.before.board),
          candidates: {
            ...frame.snapshot.candidates,
            hintCandidates: stage.before.candidates,
          },
        },
      })),
    );
  };
  const finalOnly = ![
    'complete_active_history',
    'complete_event_history',
  ].includes(replay?.coverage ?? '');
  const changeVisuals: HintPageVisuals = {
    showFocusCells: true,
    showFocusRegions: false,
    showPremises: false,
    showEliminations: !before,
    showPlacements: false,
    focusCells: changes.map(c => c.cell),
    cellMarks: changes.map(c => ({ cell: c.cell, role: 'result' })),
    eliminations: before
      ? []
      : changes
          .filter(c => c.kind === 'remove')
          .map(c => ({ cell: c.cell, digit: c.digit as Digit })),
  };
  const snapshot =
    hintPage?.snapshot ??
    (before && frame?.before ? frame.before : frame?.snapshot);
  const canExplain = frame?.move && replayActionEffects(frame.move).length > 0;
  const explanations = useReplayExplanations(
    session,
    frame?.move ?? null,
    source,
    !walkthrough && foreground,
    !playing,
    frames
      .slice(index + 1)
      .find(
        candidate =>
          candidate.move && replayActionEffects(candidate.move).length > 0,
      )?.move ?? null,
  );
  const report = explanations.report;
  const recordedHint = frame?.event?.hint ?? frame?.move?.appliedHint;
  const paths =
    report?.paths.filter(
      path =>
        !(
          recordedHint &&
          path.stages.length === 1 &&
          path.stages[0].step.techniqueCode === recordedHint.techniqueCode &&
          JSON.stringify(path.stages[0].step.placements) ===
            JSON.stringify(recordedHint.placements) &&
          JSON.stringify(path.stages[0].step.eliminations) ===
            JSON.stringify(recordedHint.eliminations)
        ),
    ) ?? [];
  const changeLabel = (items: ReturnType<typeof replayChanges>) =>
    items
      .map(c =>
        t(`replay.change.${c.kind}`, {
          cell: `R${Math.floor(c.cell / 9) + 1}C${(c.cell % 9) + 1}`,
          digit: c.digit,
        }),
      )
      .join('；');
  const undoneMove = session?.replayEvents?.find(
    e => e.move?.id === frame?.event?.targetMoveId,
  )?.move;
  const moveAction = changes
    .map(c =>
      t(`replay.change.${c.kind}`, {
        cell: `R${Math.floor(c.cell / 9) + 1}C${(c.cell % 9) + 1}`,
        digit: c.digit,
      }),
    )
    .join('；');
  const replayEvent = frame?.event;
  const action = frame?.candidateUpdate
    ? t('replay.candidateUpdate')
    : replayEvent?.kind === 'undo'
    ? t('replay.event.undo', {
        target: undoneMove
          ? changeLabel(replayChanges(undoneMove))
          : replayEvent.targetMoveId ?? '?',
      })
    : replayEvent?.kind === 'set_pencil_mode'
    ? t(
        replayEvent.after.candidates.pencilMode
          ? 'replay.pencilOn'
          : 'replay.pencilOff',
      )
    : replayEvent?.kind === 'set_candidate_source'
    ? t(
        replayEvent.after.candidates.activeCandidateSource === 'quick'
          ? 'replay.sourceQuick'
          : 'replay.sourceManual',
      )
    : replayEvent &&
      [
        'generate_quick_draft',
        'prepare_hint',
        'reveal_hint',
        'dismiss_hint',
        'pause',
        'resume',
        'abandon',
      ].includes(replayEvent.kind)
    ? t(`replay.event.${replayEvent.kind}` as 'replay.event.pause')
    : moveAction;
  const summary = (step: HintStep) => {
    const copy = HINT_PRESENTATION_COPIES[locale];
    const placement = step.placements[0];
    if (step.techniqueCode === 'hiddenSingle' && placement) {
      const regions = step.focusRegions
        .map(region =>
          (region.kind === 'box'
            ? copy.regionBox
            : region.kind === 'row'
            ? copy.regionRow
            : copy.regionColumn
          ).replace('{index}', String(region.index + 1)),
        )
        .join(copy.regionSeparator);
      return t('replay.singleSummary', {
        regions,
        cell: `R${Math.floor(placement.cell / 9) + 1}C${
          (placement.cell % 9) + 1
        }`,
        digit: placement.digit,
      });
    }
    return buildHintPresentation(step, copy, 'replay').pages.slice(-1)[0].body;
  };
  return (
    <View
      style={styles.screen}
      onLayout={event => setLayoutHeight(event.nativeEvent.layout.height)}
    >
      <ReplayHeader
        backLabel={walkthrough ? t('replay.exitWalkthrough') : t('app.back')}
        onBack={() => (walkthrough ? leaveWalkthrough() : onClose())}
        title={t('replay.title')}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : !session || !frame || !snapshot ? (
        <View style={styles.center}>
          <Text style={styles.body}>{t('replay.unavailable')}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.contextLabel} testID="replay-context">
            {walkthrough
              ? t('replay.computedCandidates')
              : t(
                  replay?.coverage === 'complete_event_history'
                    ? 'replay.eventTimeline'
                    : 'replay.effectivePath',
                )}
          </Text>
          <View style={styles.boardStage}>
            <SudokuBoard
              disabled
              maxSize={Math.max(252, layoutHeight - 340)}
              hintAnimations={false}
              hintSpotlight={Boolean(walkthrough)}
              hintVisuals={hintPage?.visuals ?? changeVisuals}
              highlightRegions={false}
              highlightSameDigit={false}
              onSelectCell={noSelect}
              state={boardState(
                walkthrough
                  ? snapshot
                  : {
                      ...snapshot,
                      candidates: {
                        ...snapshot.candidates,
                        hintCandidates: null,
                      },
                    },
                session.state.givens,
              )}
            />
          </View>
          <View style={styles.panel} testID="replay-panel">
            {walkthrough && hintPage ? (
              <>
                <View style={styles.panelHeading}>
                  <Text style={styles.sectionTitle}>
                    {
                      HINT_PRESENTATION_COPIES[locale].techniques[
                        hintPage.step.techniqueCode
                      ].name
                    }
                  </Text>
                  <Text style={styles.meta}>
                    {hintPage.stageIndex + 1}/{walkthrough.length}
                  </Text>
                </View>
                <ScrollView
                  style={styles.explanations}
                  contentContainerStyle={styles.explanationContent}
                >
                  <Text style={styles.action}>{hintPage.title}</Text>
                  <Text style={styles.body}>{hintPage.body}</Text>
                  {hintPage.unobserved && (
                    <Text style={styles.meta}>{t('replay.unobserved')}</Text>
                  )}
                </ScrollView>
                <View style={styles.footer}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={page === 0}
                    onPress={() => setPage(p => p - 1)}
                    style={styles.control}
                  >
                    <Text style={styles.controlText}>{t('hint.back')}</Text>
                  </Pressable>
                  <Text style={styles.progress}>
                    {page + 1}/{pages.length}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      page === pages.length - 1
                        ? leaveWalkthrough()
                        : setPage(p => p + 1)
                    }
                    style={[styles.control, styles.finish]}
                  >
                    <Text style={styles.controlText}>
                      {page === pages.length - 1
                        ? t('replay.finish', { step: index })
                        : t('hint.next')}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.panelHeading}>
                  <Text numberOfLines={2} style={styles.stepSummary}>
                    {finalOnly
                      ? t('replay.finalSnapshot')
                      : t('replay.compactStep', {
                          current: index,
                          total: frames.length - 1,
                        })}
                    {!finalOnly && ` · ${action || t('replay.start')}`}
                  </Text>
                </View>
                {!finalOnly && (
                  <View
                    accessibilityRole="adjustable"
                    accessibilityLabel={t('replay.position')}
                    accessibilityValue={{
                      min: 0,
                      max: frames.length - 1,
                      now: index,
                    }}
                    accessibilityActions={[
                      { name: 'increment' },
                      { name: 'decrement' },
                    ]}
                    onAccessibilityAction={event =>
                      seek(
                        index +
                          (event.nativeEvent.actionName === 'increment'
                            ? 1
                            : -1),
                      )
                    }
                    onLayout={event =>
                      setTrackWidth(event.nativeEvent.layout.width)
                    }
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={event =>
                      seek(
                        Math.round(
                          (event.nativeEvent.locationX / trackWidth) *
                            (frames.length - 1),
                        ),
                      )
                    }
                    onResponderMove={event =>
                      seek(
                        Math.round(
                          (event.nativeEvent.locationX / trackWidth) *
                            (frames.length - 1),
                        ),
                      )
                    }
                    style={styles.trackTouch}
                  >
                    <View pointerEvents="none" style={styles.track}>
                      <View
                        style={[
                          styles.trackFill,
                          {
                            width: `${
                              (index / Math.max(1, frames.length - 1)) * 100
                            }%`,
                          },
                        ]}
                      />
                    </View>
                    <View
                      pointerEvents="none"
                      style={[
                        styles.thumb,
                        {
                          left: `${
                            (index / Math.max(1, frames.length - 1)) * 100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                )}
                {!finalOnly && (
                  <View style={styles.transport}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('replay.previous')}
                      disabled={index === 0}
                      onPress={() => seek(index - 1)}
                      style={styles.icon}
                    >
                      <Text style={styles.transportIcon}>‹</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t(
                        playing ? 'replay.pause' : 'replay.play',
                      )}
                      onPress={() => {
                        if (index === frames.length - 1) setIndex(0);
                        setBefore(false);
                        setPlaying(v => !v);
                      }}
                      style={styles.play}
                    >
                      <Text style={styles.playText}>
                        {t(playing ? 'replay.pause' : 'replay.play')}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('replay.next')}
                      disabled={index === frames.length - 1}
                      onPress={() => seek(index + 1)}
                      style={styles.icon}
                    >
                      <Text style={styles.transportIcon}>›</Text>
                    </Pressable>
                    <View style={styles.segment}>
                      {[true, false].map(value => (
                        <Pressable
                          key={String(value)}
                          accessibilityRole="button"
                          accessibilityState={{
                            selected: before === value,
                            disabled: !frame.before,
                          }}
                          disabled={!frame.before}
                          onPress={() => {
                            setPlaying(false);
                            setBefore(value);
                          }}
                          style={[
                            styles.segmentOption,
                            before === value && styles.segmentSelected,
                          ]}
                        >
                          <Text style={styles.segmentText}>
                            {t(value ? 'replay.before' : 'replay.after')}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
                <View style={styles.listHeading}>
                  <Text style={styles.listTitle}>{t('replay.possible')}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: info }}
                    onPress={() => setInfo(v => !v)}
                    style={styles.infoButton}
                  >
                    <Text style={styles.meta}>
                      {t('replay.info')} {info ? '▴' : '▾'}
                    </Text>
                  </Pressable>
                </View>
                <ScrollView
                  style={styles.explanations}
                  contentContainerStyle={styles.explanationContent}
                  testID="replay-explanation-list"
                >
                  {info ? (
                    <>
                      <Text style={styles.body}>
                        {t('replay.possibleNote')}
                      </Text>
                      <Text style={styles.body}>
                        {t(
                          replay?.coverage === 'complete_event_history'
                            ? 'replay.eventCoverage'
                            : 'replay.coverageNote',
                        )}{' '}
                        {t('replay.theoryNote')}
                      </Text>
                      {!!report?.limits.length && (
                        <Text style={styles.meta}>
                          {t('replay.limited')}{' '}
                          {report.limits
                            .map(limit =>
                              t(
                                limit === 'depth_limit'
                                  ? 'replay.limitDepth'
                                  : limit === 'time_budget'
                                  ? 'replay.limitTime'
                                  : [
                                      'frontier_limit',
                                      'expansion_limit',
                                      'path_limit',
                                    ].includes(limit)
                                  ? 'replay.limitCapacity'
                                  : limit === 'incomplete_enumeration'
                                  ? 'replay.limitEnumeration'
                                  : 'replay.limitVerification',
                              ),
                            )
                            .filter((v, i, a) => a.indexOf(v) === i)
                            .join(' ')}
                        </Text>
                      )}
                      <View style={styles.speedRow}>
                        <Text style={styles.meta}>{t('replay.speed')}</Text>
                        {[0.5, 1, 2].map(value => (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ selected: value === speed }}
                            key={value}
                            onPress={() => setSpeed(value)}
                            style={[
                              styles.speed,
                              value === speed && styles.selectedControl,
                            ]}
                          >
                            <Text style={styles.controlText}>{value}×</Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  ) : (
                    <>
                      {recordedHint && (
                        <Pressable
                          accessibilityRole="button"
                          style={styles.explanationRow}
                          onPress={() => {
                            setPlaying(false);
                            setPage(0);
                            setWalkthrough([
                              {
                                step: recordedHint,
                                snapshot: {
                                  ...(frame.before ?? frame.snapshot),
                                  candidates: {
                                    ...(frame.before ?? frame.snapshot)
                                      .candidates,
                                    hintCandidates: createSolverCandidates(
                                      (frame.before ?? frame.snapshot).values,
                                    ),
                                  },
                                },
                                unobserved: false,
                              },
                            ]);
                          }}
                        >
                          <Text style={styles.explanationName}>
                            {
                              HINT_PRESENTATION_COPIES[locale].techniques[
                                recordedHint.techniqueCode
                              ].name
                            }
                          </Text>
                          <Text style={styles.badge}>
                            {t(
                              frame.event?.kind === 'reveal_hint'
                                ? 'replay.shownThen'
                                : 'replay.usedThen',
                            )}
                          </Text>
                          <Text style={styles.chevron}>›</Text>
                        </Pressable>
                      )}
                      {paths.map((path, i) => (
                        <Pressable
                          key={i}
                          testID={`replay-explanation-${i}`}
                          accessibilityRole="button"
                          style={styles.explanationRow}
                          onPress={() => openPath(path)}
                        >
                          <View style={styles.explanationText}>
                            <Text style={styles.explanationName}>
                              {path.stages
                                .map(
                                  stage =>
                                    HINT_PRESENTATION_COPIES[locale].techniques[
                                      stage.step.techniqueCode
                                    ].name,
                                )
                                .join(' → ')}
                            </Text>
                            <Text style={styles.body}>
                              {summary(path.stages[0].step)}
                            </Text>
                          </View>
                          <Text style={styles.chevron}>›</Text>
                        </Pressable>
                      ))}
                      {canExplain &&
                        source.explainReplayMove &&
                        explanations.status === 'loading' && (
                          <Text
                            accessibilityLiveRegion="polite"
                            style={styles.meta}
                          >
                            {t('replay.analyzing')}
                          </Text>
                        )}
                      {canExplain && explanations.status === 'failed' && (
                        <Pressable
                          accessibilityRole="button"
                          onPress={explanations.retry}
                        >
                          <Text style={styles.meta}>
                            {t('replay.analysisFailed')}
                          </Text>
                        </Pressable>
                      )}
                      {!paths.length &&
                        !recordedHint &&
                        (!canExplain ||
                          !source.explainReplayMove ||
                          explanations.status === 'ready') && (
                          <Text style={styles.meta}>
                            {t(
                              finalOnly
                                ? 'replay.finalReason'
                                : !frame.move
                                ? 'replay.selectStep'
                                : 'replay.noExplanation',
                            )}
                          </Text>
                        )}
                    </>
                  )}
                </ScrollView>
              </>
            )}
          </View>
        </>
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
  const { locale, t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [failed, setFailed] = useState(false);
  const [items, setItems] = useState<readonly ReplaySessionSummary[] | null>(
    null,
  );
  useEffect(() => {
    let live = true;
    setFailed(false);
    setItems(null);
    source
      .listReplaySessions()
      .then(value => live && setItems(value))
      .catch(() => {
        if (live) {
          setItems([]);
          setFailed(true);
        }
      });
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
              disabled={item.recoverability === 'unavailable'}
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
                {new Date(item.updatedAtEpochMs).toLocaleString(locale)}
              </Text>
              {item.elapsedMs !== null && item.hintUseCount !== null && (
                <Text style={styles.meta}>
                  {t('replay.sessionStats', {
                    duration: `${Math.floor(item.elapsedMs / 60000)}:${String(
                      Math.floor(item.elapsedMs / 1000) % 60,
                    ).padStart(2, '0')}`,
                    hints: item.hintUseCount,
                  })}
                </Text>
              )}
              <Text style={styles.recovery}>
                {item.recoverability === 'action_history'
                  ? t('replay.available')
                  : t(
                      item.recoverability === 'unavailable'
                        ? 'replay.unavailable'
                        : 'replay.finalSnapshot',
                    )}
              </Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.body}>
            {t(failed ? 'replay.unavailable' : 'replay.historyEmpty')}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    boardStage: { alignItems: 'center', paddingVertical: 12, flexShrink: 0 },
    panel: {
      flex: 1,
      minHeight: 0,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 720,
      backgroundColor: palette.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      borderWidth: 1,
      borderColor: palette.line,
      overflow: 'hidden',
    },
    panelHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    stepSummary: {
      color: palette.ink,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '700',
    },
    transport: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      gap: 4,
      paddingBottom: 8,
    },
    transportIcon: { fontSize: 28, color: palette.accent },
    segment: {
      flexDirection: 'row',
      backgroundColor: palette.background,
      borderRadius: 10,
      padding: 3,
    },
    segmentOption: {
      minHeight: 40,
      paddingHorizontal: 8,
      justifyContent: 'center',
      borderRadius: 8,
    },
    segmentSelected: { backgroundColor: palette.selected },
    segmentText: { color: palette.ink, fontSize: 14, fontWeight: '600' },
    listHeading: {
      paddingLeft: 16,
      paddingRight: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderColor: palette.line,
    },
    listTitle: { color: palette.ink, fontSize: 16, fontWeight: '700' },
    infoButton: {
      minHeight: 40,
      paddingHorizontal: 8,
      justifyContent: 'center',
    },
    explanations: { flex: 1, minHeight: 0 },
    explanationContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
    explanationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 48,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: palette.line,
      paddingVertical: 10,
    },
    explanationName: {
      flex: 1,
      color: palette.ink,
      fontSize: 17,
      lineHeight: 24,
    },
    badge: {
      color: palette.muted,
      fontSize: 12,
      backgroundColor: palette.background,
      padding: 5,
      borderRadius: 5,
    },
    chevron: { color: palette.muted, fontSize: 24 },
    selectedControl: { backgroundColor: palette.selected },
    finish: { flex: 2 },
    trackTouch: { height: 30, marginHorizontal: 20, justifyContent: 'center' },
    track: { height: 3, backgroundColor: palette.line, borderRadius: 2 },
    trackFill: { height: 3, backgroundColor: palette.accent },
    thumb: {
      position: 'absolute',
      width: 18,
      height: 18,
      marginLeft: -9,
      borderRadius: 9,
      backgroundColor: palette.accent,
    },
    speedRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    speed: {
      paddingHorizontal: 16,
      minHeight: 40,
      justifyContent: 'center',
      borderRadius: 8,
    },
    explanationText: { flex: 1, gap: 5 },
    contextLabel: {
      color: palette.muted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
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
    center: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    library: {
      alignSelf: 'center',
      gap: 12,
      maxWidth: 720,
      padding: 16,
      paddingBottom: 32,
      width: '100%',
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
