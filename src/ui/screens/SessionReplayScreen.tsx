import { useScreenState, useScreenScroll } from '../screen-state';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  ProductPreferences,
} from '../../application/app/product-preferences';
import { GrowthReference } from '../../application/technique-growth/contracts';
import { TechniqueCode } from '../../domain/hints/techniques';
import { locateGrowthReferenceFrames } from '../../application/technique-growth/replay-reference';
import { ReplayAnalysisLevel } from '../../application/game/replay-analysis-policy';
import { useReplayExplanations } from './useReplayExplanations';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  buildSessionReplay,
  replayFrameSteps,
} from '../../application/game/session-replay';
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
import { replayChanges } from '../../application/game/replay-explanations';
import { replayActionEffects } from '../../application/game/replay-explanations';
import { ReasoningPath } from '../../application/technique-recognition/reasoning-paths';
import { Board, Digit } from '../../domain/sudoku/contracts';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { SudokuBoard, SudokuBoardState } from '../components/SudokuBoard';
import { AppPalette, useAppTheme } from '../theme';

const noSelect = () => undefined;
function boardState(
  snapshot: UndoSnapshot,
  givens: Board,
  selectedCell: number | null,
): SudokuBoardState {
  return { ...snapshot, givens, selectedCell, activeHint: null };
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
  initialReference,
  onWalkthroughComplete,
  analysisLevel = 'basic',
  preferences = DEFAULT_PRODUCT_PREFERENCES,
  onAnalysisLevelChange: _onAnalysisLevelChange,
  source,
  onClose,
}: {
  sessionId: string;
  initialReference?: GrowthReference;
  onWalkthroughComplete?(
    reference: GrowthReference,
    steps: readonly { technique: TechniqueCode; explanationId: string }[],
  ): Promise<void>;
  analysisLevel?: ReplayAnalysisLevel;
  preferences?: Pick<
    ProductPreferences,
    'highlightRegions' | 'highlightSameDigit'
  >;
  onAnalysisLevelChange?(level: ReplayAnalysisLevel): void;
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
  const [index, setIndex] = useScreenState(`replay:${sessionId}:index`, 0);
  const [playing, setPlaying] = useState(false);
  const [analysisPanelOpened, setAnalysisPanelOpened] = useState(false);
  const [analysisRequest, setAnalysisRequest] = useState<{
    session: GameSession;
    index: number;
  } | null>(null);
  const [completingFocus, setCompletingFocus] = useState(false);
  const [stepDurationMs, setStepDurationMs] = useScreenState(
    'replay:stepDurationMs',
    1500,
  );
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [walkthrough, setWalkthrough] = useState<
    { step: HintStep; snapshot: UndoSnapshot; unobserved: boolean }[] | null
  >(null);
  const [walkFailed, setWalkFailed] = useState(false);
  const [savingWalk, setSavingWalk] = useState(false);
  const [referenceMissing, setReferenceMissing] = useState(false);
  const [page, setPage] = useState(0);
  const [trackWidth, setTrackWidth] = useState(1);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setSession(null);
    setAnalysisPanelOpened(false);
    setAnalysisRequest(null);
    setPlaying(false);
    setCompletingFocus(false);
    setWalkthrough(null);
    source
      .readReplaySession(sessionId)
      .then(value => {
        if (live) {
          setSession(value);
          if (value)
            setIndex(current =>
              Math.max(
                0,
                Math.min(current, buildSessionReplay(value).frames.length - 1),
              ),
            );
          if (
            value &&
            initialReference &&
            (initialReference.moveIds.length ||
              initialReference.eventId ||
              initialReference.processId ||
              initialReference.recordId)
          ) {
            const located = locateGrowthReferenceFrames(
              buildSessionReplay(value),
              initialReference,
            );
            setReferenceMissing(!located);
            if (located) setIndex(located.start);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [sessionId, source, initialReference, setIndex]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state !== 'active') {
        setPlaying(false);
        setAnalysisRequest(null);
      }
    });
    return () => subscription.remove();
  }, []);
  const replay = useMemo(
    () => session && buildSessionReplay(session),
    [session],
  );
  const frames = useMemo(() => replay?.frames ?? [], [replay]);
  const frameSteps = useMemo(() => replayFrameSteps(frames), [frames]);
  const currentStep = frameSteps[index] ?? 0;
  const totalSteps = frameSteps.at(-1) ?? 0;
  const frame = frames[index];
  const changes = useMemo(
    () =>
      (frame?.moves ?? (frame?.move ? [frame.move] : [])).flatMap(
        replayChanges,
      ),
    [frame],
  );
  const pages = useMemo(
    () =>
      walkthrough?.flatMap((stage, stageIndex) =>
        buildHintPresentation(
          stage.step,
          HINT_PRESENTATION_COPIES[locale],
          'replay',
          stage.snapshot.candidates.hintCandidates,
        ).pages.map(p => ({ ...p, ...stage, stageIndex })),
      ) ?? [],
    [walkthrough, locale],
  );
  const hintPage = pages[page];
  useEffect(() => {
    if ((!playing && !completingFocus) || frames.length < 2) return;
    const next = Math.min(index + 1, frames.length - 1);
    if (next === index) {
      setPlaying(false);
      setCompletingFocus(false);
      return;
    }
    const sameAction = frameSteps[next] === currentStep;
    const focusDelay = Math.min(
      500,
      Math.max(250, Math.round(stepDurationMs / 3)),
    );
    const beginsTwoPhaseAction =
      !sameAction &&
      Boolean(frames[next]?.focusChange) &&
      frameSteps[next + 1] === frameSteps[next];
    const delay = sameAction
      ? focusDelay
      : beginsTwoPhaseAction
      ? Math.max(250, stepDurationMs - focusDelay)
      : stepDurationMs;
    const timer = setTimeout(() => {
      setIndex(next);
      if (completingFocus) setCompletingFocus(false);
      if (playing && next === frames.length - 1) setPlaying(false);
    }, delay);
    return () => clearTimeout(timer);
  }, [
    completingFocus,
    currentStep,
    frameSteps,
    frames,
    index,
    playing,
    setIndex,
    stepDurationMs,
  ]);
  const completeWalkthrough = async () => {
    if (!walkthrough || !frame || savingWalk) return;
    setSavingWalk(true);
    setWalkFailed(false);
    try {
      if (onWalkthroughComplete) {
        const reference: GrowthReference = {
          sessionId,
          moveIds: frame.move ? [frame.move.id] : [],
          ...(frame.event ? { eventId: frame.event.id } : {}),
        };
        await onWalkthroughComplete(
          reference,
          walkthrough.map(stage => ({
            technique: stage.step.techniqueCode,
            explanationId: JSON.stringify([
              stage.step.boardFingerprint,
              stage.step.techniqueCode,
              stage.step.placements,
              stage.step.eliminations,
            ]),
          })),
        );
      }
      leaveWalkthrough();
    } catch {
      setWalkFailed(true);
    } finally {
      setSavingWalk(false);
    }
  };
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
    setCompletingFocus(false);
    setAnalysisRequest(null);
    setIndex(Math.max(0, Math.min(frames.length - 1, value)));
  };
  const frameForStep = (step: number, phase: 'first' | 'last') => {
    const matches = frameSteps
      .map((value, frameIndex) => ({ value, frameIndex }))
      .filter(candidate => candidate.value === step);
    return phase === 'first'
      ? matches[0]?.frameIndex ?? 0
      : matches.at(-1)?.frameIndex ?? frames.length - 1;
  };
  const seekStep = (step: number, phase: 'first' | 'last' = 'last') =>
    seek(frameForStep(Math.max(0, Math.min(totalSteps, step)), phase));
  const showNextAction = () => {
    const target = frameForStep(currentStep + 1, 'first');
    setPlaying(false);
    setAnalysisRequest(null);
    setIndex(target);
    setCompletingFocus(
      frameSteps[target + 1] === frameSteps[target] &&
        Boolean(frames[target]?.focusChange),
    );
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
  const snapshot = hintPage?.snapshot ?? frame?.snapshot;
  // Replay actions add only local deletion marks to the ordinary game board.
  const replayEliminations = frame?.focusChange
    ? []
    : changes
        .filter(change => change.kind === 'remove')
        .map(change => ({ cell: change.cell, digit: change.digit as Digit }));
  const canExplain = frame?.move && replayActionEffects(frame.move).length > 0;
  const analysisRequested =
    analysisRequest?.session === session && analysisRequest?.index === index;
  const explanations = useReplayExplanations(
    session,
    frame?.move ?? null,
    source,
    foreground &&
      analysisRequested &&
      Boolean(canExplain) &&
      !playing &&
      !referenceMissing,
    true,
    null,
    analysisLevel,
  );
  const report = analysisRequested ? explanations.report : undefined;
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
  const analysisBusy = Boolean(
    analysisRequested &&
      canExplain &&
      source.explainReplayMove &&
      explanations.status === 'loading',
  );
  const showAnalysisStatus = Boolean(
    analysisRequested && canExplain && source.explainReplayMove,
  );
  const retryAnalysis =
    showAnalysisStatus &&
    (explanations.status === 'failed' ||
      explanations.status === 'cancelled' ||
      explanations.status === 'timed_out' ||
      (explanations.outcome === 'budget' && paths.length === 0));
  const analysisStatus = !showAnalysisStatus
    ? ''
    : explanations.status === 'loading'
    ? paths.length
      ? t('replay.searchingMore', { count: paths.length })
      : t('replay.analyzing')
    : explanations.status === 'failed'
    ? t('replay.analysisFailed')
    : explanations.status === 'cancelled'
    ? t('replay.analysisCancelled')
    : t(
        explanations.outcome === 'budget' || explanations.status === 'timed_out'
          ? paths.length
            ? 'replay.budgetReached'
            : 'replay.noExplanation'
          : 'replay.analysisComplete',
      );
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
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('replay.speed')}
            onPress={() => setSpeedMenuOpen(open => !open)}
            style={styles.speedTrigger}
          >
            <Text style={styles.controlText}>
              {(stepDurationMs / 1000).toFixed(1)} s
            </Text>
          </Pressable>
        }
      />
      {referenceMissing ? (
        <View style={styles.referenceNotice}>
          <Text style={styles.body}>{t('growth.unlocatable')}</Text>
          <Pressable
            accessibilityRole="button"
            style={styles.control}
            onPress={() => setReferenceMissing(false)}
          >
            <Text style={styles.controlText}>{t('replay.title')}</Text>
          </Pressable>
        </View>
      ) : null}
      {walkFailed ? (
        <Text style={styles.body}>{t('growth.failed')}</Text>
      ) : null}

      {speedMenuOpen && (
        <View style={styles.speedPopover} testID="replay-speed-menu">
          <View style={styles.speedRow}>
            {[800, 1500, 2500, 4000].map(value => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: value === stepDurationMs }}
                key={value}
                onPress={() => {
                  setStepDurationMs(value);
                  setSpeedMenuOpen(false);
                }}
                style={[
                  styles.speed,
                  value === stepDurationMs && styles.selectedControl,
                ]}
              >
                <Text style={styles.controlText}>
                  {(value / 1000).toFixed(1)} s
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {referenceMissing ? null : loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : !session || !frame || !snapshot ? (
        <View style={styles.center}>
          <Text style={styles.body}>{t('replay.unavailable')}</Text>
        </View>
      ) : (
        <>
          {walkthrough && (
            <Text style={styles.contextLabel} testID="replay-context">
              {t('replay.computedCandidates')}
            </Text>
          )}
          <View style={styles.boardStage}>
            <SudokuBoard
              disabled
              maxSize={Math.max(252, layoutHeight - 390)}
              hintAnimations={false}
              hintSpotlight={Boolean(walkthrough)}
              hintVisuals={hintPage?.visuals}
              replayEliminations={walkthrough ? [] : replayEliminations}
              highlightDigit={frame.view?.highlightDigit ?? null}
              highlightRegions={preferences.highlightRegions}
              highlightSameDigit={preferences.highlightSameDigit}
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
                frame.view?.selectedCell ?? null,
              )}
              showCandidates
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
                        ? completeWalkthrough()
                        : setPage(p => p + 1)
                    }
                    disabled={savingWalk}
                    style={[styles.control, styles.finish]}
                  >
                    <Text style={styles.controlText}>
                      {page === pages.length - 1
                        ? t('replay.finish', { step: currentStep })
                        : t('hint.next')}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.panelHeading}>
                  <Text style={styles.stepSummary}>
                    {finalOnly
                      ? t('replay.finalSnapshot')
                      : t('replay.compactStep', {
                          current: currentStep,
                          total: totalSteps,
                        })}
                  </Text>
                  {currentStep > 0 && (
                    <Pressable
                      testID="replay-analyze"
                      accessibilityRole="button"
                      accessibilityLabel={t('replay.analyzeBoard')}
                      accessibilityState={{
                        disabled: analysisBusy,
                        busy: analysisBusy,
                      }}
                      disabled={analysisBusy}
                      onPress={() => {
                        setPlaying(false);
                        setCompletingFocus(false);
                        setAnalysisPanelOpened(true);
                        setAnalysisRequest({ session, index });
                        if (retryAnalysis) explanations.retry();
                      }}
                      style={styles.analyzeButton}
                    >
                      <Text style={styles.controlText}>
                        {t(
                          analysisBusy
                            ? 'replay.analysisBusy'
                            : 'replay.analyzeBoard',
                        )}
                      </Text>
                    </Pressable>
                  )}
                </View>
                {!finalOnly && (
                  <View
                    accessibilityRole="adjustable"
                    accessibilityLabel={t('replay.position')}
                    accessibilityValue={{
                      min: 0,
                      max: totalSteps,
                      now: currentStep,
                    }}
                    accessibilityActions={[
                      { name: 'increment' },
                      { name: 'decrement' },
                    ]}
                    onAccessibilityAction={event =>
                      seekStep(
                        currentStep +
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
                      seekStep(
                        Math.round(
                          (event.nativeEvent.locationX / trackWidth) *
                            totalSteps,
                        ),
                      )
                    }
                    onResponderMove={event =>
                      seekStep(
                        Math.round(
                          (event.nativeEvent.locationX / trackWidth) *
                            totalSteps,
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
                              (currentStep / Math.max(1, totalSteps)) * 100
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
                            (currentStep / Math.max(1, totalSteps)) * 100
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
                      accessibilityLabel={t('replay.toStart')}
                      disabled={currentStep === 0}
                      onPress={() => seek(0)}
                      style={styles.icon}
                    >
                      <Text style={styles.transportIcon}>|◀</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('replay.previous')}
                      disabled={currentStep === 0}
                      onPress={() => seekStep(currentStep - 1)}
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
                        setCompletingFocus(false);
                        setAnalysisRequest(null);
                        if (currentStep === totalSteps) setIndex(0);
                        setPlaying(v => !v);
                      }}
                      style={styles.icon}
                    >
                      <Text style={styles.transportIcon}>
                        {playing ? '❚❚' : '▶'}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('replay.next')}
                      disabled={currentStep === totalSteps}
                      onPress={showNextAction}
                      style={styles.icon}
                    >
                      <Text style={styles.transportIcon}>›</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('replay.toEnd')}
                      disabled={currentStep === totalSteps}
                      onPress={() => seek(frames.length - 1)}
                      style={styles.icon}
                    >
                      <Text style={styles.transportIcon}>▶|</Text>
                    </Pressable>
                  </View>
                )}
                {analysisPanelOpened && (
                  <>
                    <View style={styles.listHeading}>
                      <Text style={styles.listTitle}>
                        {t('replay.boardAnalysis')}
                        {analysisRequested
                          ? ` · ${t('replay.compactStep', {
                              current: currentStep,
                              total: totalSteps,
                            })}`
                          : ''}
                      </Text>
                      {showAnalysisStatus && (
                        <Pressable
                          testID="replay-analysis-status"
                          accessibilityRole={
                            analysisBusy || retryAnalysis ? 'button' : undefined
                          }
                          accessibilityLabel={
                            analysisBusy
                              ? t('replay.cancelAnalysis')
                              : analysisStatus
                          }
                          accessibilityValue={{ text: analysisStatus }}
                          accessibilityLiveRegion="polite"
                          onPress={
                            analysisBusy
                              ? () => setAnalysisRequest(null)
                              : retryAnalysis
                              ? explanations.retry
                              : undefined
                          }
                          style={styles.infoButton}
                        >
                          {explanations.status === 'loading' ? (
                            <ActivityIndicator
                              size="small"
                              color={palette.accent}
                            />
                          ) : (
                            <Text style={styles.statusIcon}>
                              {retryAnalysis
                                ? '↻'
                                : explanations.outcome === 'budget'
                                ? '◷'
                                : '✓'}
                            </Text>
                          )}
                          <Text style={styles.statusCount}>
                            {analysisBusy
                              ? t('replay.cancelAnalysis')
                              : paths.length}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                    <ScrollView
                      style={styles.explanations}
                      contentContainerStyle={styles.explanationContent}
                      testID="replay-explanation-list"
                    >
                      {!analysisRequested && !finalOnly && (
                        <Text style={styles.meta}>
                          {t('replay.analysisPrompt')}
                        </Text>
                      )}
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
                                    hintCandidates:
                                      (frame.event?.kind === 'reveal_hint'
                                        ? frame.snapshot.candidates
                                            .hintCandidates
                                        : (frame.before ?? frame.snapshot)
                                            .candidates.hintCandidates) ??
                                      createSolverCandidates(
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
                      {(analysisRequested || finalOnly) &&
                        !paths.length &&
                        (!recordedHint || (analysisRequested && !canExplain)) &&
                        (!canExplain ||
                          !source.explainReplayMove ||
                          (analysisRequested &&
                            (explanations.status === 'ready' ||
                              explanations.status === 'timed_out'))) && (
                          <Text style={styles.meta}>
                            {t(
                              analysisRequested &&
                                (!canExplain || !source.explainReplayMove)
                                ? 'replay.analysisUnavailable'
                                : finalOnly
                                ? 'replay.finalReason'
                                : !frame.move
                                ? 'replay.selectStep'
                                : 'replay.noExplanation',
                            )}
                          </Text>
                        )}
                    </ScrollView>
                  </>
                )}
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const REPLAY_PAGE_SIZE = 30;

function localDateKey(epochMs: number): string {
  const date = new Date(epochMs);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function ReplayLibraryScreen({
  source,
  onClose,
  onOpen,
  onFootprint,
}: {
  source: SessionReplaySource;
  onClose(): void;
  onOpen(sessionId: string): void;
  onFootprint?(sessionId: string): void;
}): React.JSX.Element {
  const { locale, t } = useLocalization();
  const scroll = useScreenScroll('replay:library');
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [items, setItems] = useState<readonly ReplaySessionSummary[]>([]);
  const request = useRef<{
    source: SessionReplaySource;
    live: boolean;
    busy: boolean;
    offset: number;
  } | null>(null);

  const loadPage = useCallback(
    async (state: NonNullable<typeof request.current>) => {
      if (!state.live || state.busy) return;
      state.busy = true;
      setLoading(true);
      setFailed(false);
      try {
        const page = await state.source.listReplaySessions(
          REPLAY_PAGE_SIZE,
          state.offset,
        );
        if (!state.live) return;
        state.offset += page.length;
        setItems(previous => {
          const known = new Set(previous.map(item => item.sessionId));
          return [
            ...previous,
            ...page.filter(item => !known.has(item.sessionId)),
          ];
        });
        setHasMore(page.length === REPLAY_PAGE_SIZE);
      } catch {
        if (state.live) setFailed(true);
      } finally {
        state.busy = false;
        if (state.live) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const state = { source, live: true, busy: false, offset: 0 };
    request.current = state;
    setFailed(false);
    setHasMore(true);
    setItems([]);
    loadPage(state);
    return () => {
      state.live = false;
    };
  }, [loadPage, source]);

  const sections = useMemo(() => {
    const grouped = new Map<string, ReplaySessionSummary[]>();
    items.forEach(item => {
      const key = localDateKey(item.updatedAtEpochMs);
      const group = grouped.get(key) ?? [];
      group.push(item);
      grouped.set(key, group);
    });
    const today = new Date();
    const yesterday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - 1,
    );
    const todayKey = localDateKey(today.getTime());
    const yesterdayKey = localDateKey(yesterday.getTime());
    return Array.from(grouped.entries()).map(([key, data]) => ({
      key,
      title:
        key === todayKey
          ? t('replay.today')
          : key === yesterdayKey
          ? t('replay.yesterday')
          : new Date(data[0].updatedAtEpochMs).toLocaleDateString(locale, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }),
      data,
    }));
  }, [items, locale, t]);

  const footer = loading ? (
    <View style={styles.paginationStatus}>
      <ActivityIndicator color={palette.accent} size="small" />
      <Text style={styles.paginationText}>
        {t(items.length ? 'replay.loadingMore' : 'replay.loadingHistory')}
      </Text>
    </View>
  ) : failed ? (
    <Text accessibilityRole="alert" style={styles.paginationText}>
      {t(items.length ? 'replay.loadInterrupted' : 'replay.historyUnavailable')}
    </Text>
  ) : items.length > 0 && !hasMore ? (
    <View style={styles.paginationStatus}>
      <View style={styles.paginationLine} />
      <Text style={styles.paginationText}>{t('replay.historyComplete')}</Text>
      <View style={styles.paginationLine} />
    </View>
  ) : null;

  return (
    <View style={styles.screen}>
      <ReplayHeader
        backLabel={t('app.back')}
        onBack={onClose}
        right={
          items.length ? (
            <Text style={styles.libraryCount}>
              {t(
                locale === 'en' && items.length === 1
                  ? 'replay.gameCountOne'
                  : 'replay.gameCount',
                { count: items.length },
              )}
            </Text>
          ) : undefined
        }
        title={t('replay.history')}
      />
      <SectionList
        {...scroll}
        collapsable={false}
        contentContainerStyle={styles.library}
        initialNumToRender={8}
        keyExtractor={item => item.sessionId}
        ListEmptyComponent={
          !loading && !failed ? (
            <View style={styles.libraryState}>
              <Text style={styles.libraryStateSymbol}>↻</Text>
              <Text style={styles.libraryStateTitle}>
                {t('replay.historyEmpty')}
              </Text>
              <Text style={styles.libraryStateCopy}>
                {t('replay.historyEmptyNote')}
              </Text>
            </View>
          ) : undefined
        }
        ListFooterComponent={footer ?? undefined}
        ListHeaderComponent={
          <View style={styles.libraryIntro}>
            <Text style={styles.libraryIntroTitle}>
              {t('replay.historyIntroTitle')}
            </Text>
            <Text style={styles.libraryIntroCopy}>
              {t('replay.historyIntroCopy')}
            </Text>
          </View>
        }
        maxToRenderPerBatch={8}
        onEndReached={() => {
          if (hasMore && request.current) loadPage(request.current);
        }}
        onEndReachedThreshold={0.45}
        renderItem={({ item }) => (
          <View
            collapsable={false}
            style={styles.sessionCard}
            testID={`replay-session-${item.sessionId}`}
          >
            <View style={styles.sessionCardMain}>
              <View style={styles.cardTop}>
                <Text style={styles.sectionTitle}>
                  {t('game.level', { level: item.difficultyLevel })}
                </Text>
                <Text style={styles.status}>
                  {sessionStatusLabel(item.status, t)}
                </Text>
              </View>
              <Text style={styles.meta}>
                {new Date(item.updatedAtEpochMs).toLocaleTimeString(locale, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {item.elapsedMs !== null && item.hintUseCount !== null
                  ? `  ·  ${t('replay.sessionStats', {
                      duration: `${Math.floor(item.elapsedMs / 60000)}:${String(
                        Math.floor(item.elapsedMs / 1000) % 60,
                      ).padStart(2, '0')}`,
                      hints: item.hintUseCount,
                    })}`
                  : ''}
              </Text>
              {(item.recoverability === 'unavailable' ||
                item.recoverability === 'final_snapshot') && (
                <Text style={styles.recovery}>
                  {t(
                    item.recoverability === 'unavailable'
                      ? 'replay.unavailable'
                      : 'replay.finalSnapshot',
                  )}
                </Text>
              )}
            </View>
            <View style={styles.sessionActions}>
              <Pressable
                accessibilityRole="button"
                disabled={item.recoverability === 'unavailable'}
                onPress={() => onOpen(item.sessionId)}
                style={[
                  styles.sessionAction,
                  item.recoverability === 'unavailable' &&
                    styles.disabledAction,
                ]}
              >
                <Text style={styles.controlText}>{t('replay.watch')}</Text>
              </Pressable>
              {onFootprint ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onFootprint(item.sessionId)}
                  style={[styles.sessionAction, styles.secondarySessionAction]}
                >
                  <Text style={styles.secondarySessionActionText}>
                    {t('replay.techniqueSummary')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <Text style={styles.libraryGroupLabel}>{section.title}</Text>
        )}
        sections={sections}
        stickySectionHeadersEnabled={false}
        testID="replay-library-items"
        windowSize={5}
      />
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    referenceNotice: { padding: 16, gap: 8 },
    analysisBackdrop: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    analysisDialog: {
      alignSelf: 'center',
      width: '100%',
      maxWidth: 560,
      flexGrow: 0,
      maxHeight: '85%',
      borderRadius: 18,
      backgroundColor: palette.surface,
    },
    analysisSettings: { paddingHorizontal: 20, paddingVertical: 8, gap: 4 },
    boardStage: { alignItems: 'center', paddingVertical: 6, flexShrink: 0 },
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
      gap: 8,
    },
    analyzeButton: {
      minHeight: 44,
      paddingHorizontal: 12,
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.accent,
      backgroundColor: palette.selected,
    },
    stepSummary: {
      flexShrink: 1,
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
    listTitle: {
      flexShrink: 1,
      color: palette.ink,
      fontSize: 16,
      fontWeight: '700',
    },
    infoButton: {
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    statusIcon: { color: palette.accent, fontSize: 20 },
    statusCount: { color: palette.muted, fontSize: 14, fontWeight: '600' },
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
    speedPopover: {
      position: 'absolute',
      right: 12,
      top: 58,
      zIndex: 10,
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 10,
      borderWidth: 1,
      padding: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.16,
      shadowRadius: 7,
      elevation: 4,
    },
    speedTrigger: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: 4,
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
    libraryCount: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: '700',
    },
    center: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    library: {
      alignSelf: 'center',
      maxWidth: 720,
      padding: 16,
      paddingBottom: 32,
      width: '100%',
    },
    libraryIntro: { marginBottom: 20, paddingHorizontal: 2 },
    libraryIntroTitle: {
      color: palette.ink,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.5,
      lineHeight: 34,
    },
    libraryIntroCopy: {
      color: palette.muted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 7,
    },
    libraryGroupLabel: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 7,
      paddingHorizontal: 2,
    },
    libraryState: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 360,
      padding: 38,
    },
    libraryStateSymbol: {
      color: palette.accent,
      fontSize: 42,
    },
    libraryStateTitle: {
      color: palette.ink,
      fontSize: 18,
      fontWeight: '800',
      marginTop: 12,
      textAlign: 'center',
    },
    libraryStateCopy: {
      color: palette.muted,
      fontSize: 13,
      lineHeight: 20,
      marginTop: 5,
      textAlign: 'center',
    },
    paginationStatus: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 9,
      justifyContent: 'center',
      minHeight: 50,
    },
    paginationText: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: '700',
      minHeight: 50,
      paddingVertical: 17,
      textAlign: 'center',
    },
    paginationLine: {
      backgroundColor: palette.line,
      height: StyleSheet.hairlineWidth,
      width: 34,
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
      marginBottom: 11,
      overflow: 'hidden',
    },
    sessionCardMain: { gap: 5, paddingHorizontal: 15, paddingVertical: 13 },
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
    sessionActions: {
      borderTopColor: palette.line,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
    },
    sessionAction: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      minHeight: 45,
      padding: 8,
    },
    secondarySessionAction: {
      borderLeftColor: palette.line,
      borderLeftWidth: StyleSheet.hairlineWidth,
    },
    secondarySessionActionText: {
      color: palette.ink,
      fontSize: 13,
      fontWeight: '700',
      textAlign: 'center',
    },
    disabledAction: { opacity: 0.4 },
  });
}
