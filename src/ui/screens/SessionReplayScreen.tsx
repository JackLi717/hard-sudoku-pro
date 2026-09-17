import { useScreenState, useScreenScroll } from '../screen-state';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  ProductPreferences,
} from '../../application/app/product-preferences';
import { GrowthReference } from '../../application/technique-growth/contracts';
import { TechniqueCode } from '../../domain/hints/techniques';
import { locateGrowthReferenceFrames } from '../../application/technique-growth/replay-reference';
import { ReplayAnalysisLevel } from '../../application/game/replay-analysis-policy';
import { useReplayBoardAnalysis } from './useReplayBoardAnalysis';
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
import { ReasoningPath } from '../../application/technique-recognition/reasoning-paths';
import { Board, Digit } from '../../domain/sudoku/contracts';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { RootPageHeader } from '../components/RootPageHeader';
import {
  SudokuBoard,
  SudokuBoardHintLegend,
  SudokuBoardState,
} from '../components/SudokuBoard';
import { ROOT_PAGE } from '../root-page-design';
import { AppPalette, useAppTheme } from '../theme';
import { ShareCardModal } from './ShareCardModal';
import {
  SHARE_CARD_COPY,
  ShareCardFacts,
  shareCardFactsFromCompletedGame,
  shareCardFactsFromReplayFrame,
} from './share-card-presentation';
import {
  fitSquareWithin,
  TABLET_SAFE_BOTTOM_CLEARANCE,
  useAdaptiveLayout,
} from '../layout/adaptive-layout';

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
  const { height, width } = useWindowDimensions();
  const { useLandscapeTabletLayout } = useAdaptiveLayout();
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
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [selectedShareFacts, setSelectedShareFacts] =
    useState<ShareCardFacts | null>(null);
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
    setShareMenuOpen(false);
    setSelectedShareFacts(null);
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
  const shareFacts = session
    ? shareCardFactsFromCompletedGame(session.state)
    : null;
  const frames = useMemo(() => replay?.frames ?? [], [replay]);
  const frameSteps = useMemo(() => replayFrameSteps(frames), [frames]);
  const currentStep = frameSteps[index] ?? 0;
  const totalSteps = frameSteps.at(-1) ?? 0;
  const frame = frames[index];
  const currentBoardFacts =
    session && frame
      ? shareCardFactsFromReplayFrame(
          session.state,
          frame.snapshot,
          currentStep,
          totalSteps,
        )
      : null;
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
          undefined,
          stage.snapshot.candidates.hintCandidateOrigin === 'quick'
            ? { kind: 'currentQuick' }
            : stage.snapshot.candidates.hintCandidateOrigin ===
                'applied_hint' &&
              stage.snapshot.candidates.appliedHintSteps?.length
            ? {
                kind: 'appliedHints',
                steps: stage.snapshot.candidates.appliedHintSteps,
              }
            : undefined,
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
        if (shareMenuOpen) {
          setShareMenuOpen(false);
        } else if (walkthrough) {
          setWalkthrough(null);
          setPage(0);
        } else onClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [shareMenuOpen, walkthrough, onClose]);
  const seek = (value: number) => {
    setPlaying(false);
    setCompletingFocus(false);
    setAnalysisPanelOpened(false);
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
    setAnalysisPanelOpened(false);
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
  const analysisRequested =
    analysisRequest?.session === session && analysisRequest?.index === index;
  const explanations = useReplayBoardAnalysis(
    session,
    frame?.snapshot ?? null,
    source,
    foreground && analysisRequested && !playing && !referenceMissing,
    analysisLevel,
  );
  const report = analysisRequested ? explanations.report : undefined;
  const recordedHint = frame?.event?.hint ?? frame?.move?.appliedHint;
  const paths = report?.paths ?? [];
  const analysisBusy = Boolean(
    analysisRequested &&
      source.analyzeReplayBoard &&
      explanations.status === 'loading',
  );
  const showAnalysisStatus = Boolean(
    analysisRequested && source.analyzeReplayBoard,
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
      <RootPageHeader
        backLabel={walkthrough ? t('replay.exitWalkthrough') : t('app.back')}
        onBack={() => (walkthrough ? leaveWalkthrough() : onClose())}
        showDivider
        title={t('replay.title')}
        right={
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('replay.speed')}
              onPress={() => {
                setShareMenuOpen(false);
                setSpeedMenuOpen(open => !open);
              }}
              style={styles.speedTrigger}
            >
              <Text style={styles.controlText}>
                {(stepDurationMs / 1000).toFixed(1)} s
              </Text>
            </Pressable>
            {shareFacts && currentBoardFacts && !walkthrough ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setPlaying(false);
                  setCompletingFocus(false);
                  setSpeedMenuOpen(false);
                  setShareMenuOpen(open => !open);
                }}
                style={styles.speedTrigger}
                testID="replay-share"
              >
                <Text style={styles.controlText}>
                  {SHARE_CARD_COPY[locale].entry}
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
      {shareMenuOpen && shareFacts && currentBoardFacts ? (
        <>
          <Pressable
            accessible={false}
            onPress={() => setShareMenuOpen(false)}
            style={styles.shareMenuDismiss}
          />
          <View
            accessibilityViewIsModal
            style={styles.sharePopover}
            testID="replay-share-menu"
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setShareMenuOpen(false);
                setSelectedShareFacts(shareFacts);
              }}
              style={styles.shareMenuOption}
              testID="replay-share-result"
            >
              <Text style={styles.controlText}>
                {SHARE_CARD_COPY[locale].shareResult}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setShareMenuOpen(false);
                setSelectedShareFacts(currentBoardFacts);
              }}
              style={styles.shareMenuOption}
              testID="replay-share-current-board"
            >
              <Text style={styles.controlText}>
                {SHARE_CARD_COPY[locale].shareCurrentBoard}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
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
          <View
            style={[
              styles.replayWorkspace,
              useLandscapeTabletLayout && styles.replayWorkspaceLandscape,
            ]}
            testID={
              useLandscapeTabletLayout
                ? 'replay-landscape-layout'
                : 'replay-portrait-layout'
            }
          >
            <View
              style={[
                styles.boardStage,
                useLandscapeTabletLayout && styles.boardStageLandscape,
              ]}
            >
              <SudokuBoard
                disabled
                maxSize={
                  useLandscapeTabletLayout
                    ? Math.max(
                        252,
                        fitSquareWithin({
                          availableWidth: width * 0.57,
                          availableHeight: layoutHeight,
                          horizontalInset: 40,
                          verticalInset: 86 + TABLET_SAFE_BOTTOM_CLEARANCE,
                          maxSize: 700,
                        }),
                      )
                    : Math.max(252, layoutHeight - 390)
                }
                hintAnimations={false}
                hintSpotlight={Boolean(walkthrough)}
                hintVisuals={hintPage?.visuals}
                showHintLegend={!useLandscapeTabletLayout}
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
            <View
              style={[
                styles.panel,
                useLandscapeTabletLayout && styles.panelLandscape,
              ]}
              testID="replay-panel"
            >
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
                    {useLandscapeTabletLayout ? (
                      <View
                        style={styles.walkthroughSideLegend}
                        testID="replay-walkthrough-side-legend"
                      >
                        <SudokuBoardHintLegend
                          hintVisuals={hintPage.visuals}
                          width="100%"
                        />
                      </View>
                    ) : null}
                  </ScrollView>
                  <View
                    style={styles.footer}
                    testID="replay-walkthrough-footer"
                  >
                    <View style={styles.footerSide}>
                      <Pressable
                        accessibilityRole="button"
                        disabled={page === 0}
                        onPress={() => setPage(p => p - 1)}
                        style={[
                          styles.footerAction,
                          styles.footerPrevious,
                          page === 0 && styles.footerActionDisabled,
                        ]}
                        testID="replay-walkthrough-previous"
                      >
                        <Text style={styles.footerPreviousText}>
                          {t('hint.back')}
                        </Text>
                      </Pressable>
                    </View>
                    <Text style={styles.progress}>
                      {page + 1}/{pages.length}
                    </Text>
                    <View style={[styles.footerSide, styles.footerSideEnd]}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() =>
                          page === pages.length - 1
                            ? completeWalkthrough()
                            : setPage(p => p + 1)
                        }
                        disabled={savingWalk}
                        style={[
                          styles.footerAction,
                          styles.footerNext,
                          savingWalk && styles.footerActionDisabled,
                        ]}
                        testID="replay-walkthrough-next"
                      >
                        <Text style={styles.footerNextText}>
                          {page === pages.length - 1
                            ? t('replay.finish', { step: currentStep })
                            : t('hint.next')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.panelHeading}>
                    <View
                      accessible
                      accessibilityLabel={`${t('game.level', {
                        level: session.state.difficultyLevel,
                      })}, ${
                        finalOnly
                          ? t('replay.finalSnapshot')
                          : t('replay.compactStep', {
                              current: currentStep,
                              total: totalSteps,
                            })
                      }`}
                      style={styles.positionSummary}
                      testID="replay-position-summary"
                    >
                      <Text style={styles.positionDifficulty}>
                        {t('game.level', {
                          level: session.state.difficultyLevel,
                        })}
                      </Text>
                      <Text style={styles.positionSeparator}>·</Text>
                      <Text style={styles.stepSummary}>
                        {finalOnly
                          ? t('replay.finalSnapshot')
                          : t('replay.compactStep', {
                              current: currentStep,
                              total: totalSteps,
                            })}
                      </Text>
                    </View>
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
                          setAnalysisPanelOpened(false);
                          setAnalysisRequest(null);
                          if (currentStep === totalSteps) setIndex(0);
                          setPlaying(v => !v);
                        }}
                        style={[styles.icon, styles.playIconButton]}
                      >
                        <Text
                          style={[
                            styles.transportIcon,
                            styles.playTransportIcon,
                          ]}
                        >
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
                  {analysisPanelOpened && analysisRequested && (
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
                              analysisBusy || retryAnalysis
                                ? 'button'
                                : undefined
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
                                          (frame.before ?? frame.snapshot)
                                            .values,
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
                                      HINT_PRESENTATION_COPIES[locale]
                                        .techniques[stage.step.techniqueCode]
                                        .name,
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
                        {analysisRequested &&
                          !paths.length &&
                          (!source.analyzeReplayBoard ||
                            explanations.status === 'ready' ||
                            explanations.status === 'timed_out') && (
                            <Text style={styles.meta}>
                              {t(
                                !source.analyzeReplayBoard
                                  ? 'replay.analysisUnavailable'
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
          </View>
        </>
      )}
      <ShareCardModal
        facts={selectedShareFacts}
        onClose={() => setSelectedShareFacts(null)}
      />
    </View>
  );
}

const REPLAY_PAGE_SIZE = 30;

function localDateKey(epochMs: number): string {
  const date = new Date(epochMs);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatReplayDuration(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function initialReplayBoardState(session: GameSession): SudokuBoardState {
  return {
    activeHint: null,
    annotations: [],
    candidates: session.state.candidates,
    givens: session.state.givens,
    incorrectCells: [],
    selectedCell: null,
    status: session.state.status,
    values: session.state.givens,
  };
}

export function ReplayLibraryScreen({
  source,
  onClose,
  onOpen,
  onFootprint,
}: {
  source: SessionReplaySource;
  onClose?(): void;
  onOpen(sessionId: string): void;
  onFootprint?(sessionId: string): void;
}): React.JSX.Element {
  const { locale, t } = useLocalization();
  const scroll = useScreenScroll('replay:library');
  const { palette } = useAppTheme();
  const { height, width } = useWindowDimensions();
  const { useLandscapeTabletLayout } = useAdaptiveLayout();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [items, setItems] = useState<readonly ReplaySessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );
  const [previewSession, setPreviewSession] = useState<GameSession | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const previewCache = useRef(new Map<string, GameSession | null>());
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

  useEffect(() => {
    if (!useLandscapeTabletLayout) {
      setSelectedSessionId(null);
      return;
    }
    if (
      selectedSessionId &&
      items.some(item => item.sessionId === selectedSessionId)
    ) {
      return;
    }
    setSelectedSessionId(
      items.find(item => item.recoverability !== 'unavailable')?.sessionId ??
        null,
    );
  }, [items, selectedSessionId, useLandscapeTabletLayout]);

  useEffect(() => {
    previewCache.current.clear();
  }, [source]);

  useEffect(() => {
    if (!useLandscapeTabletLayout || !selectedSessionId) {
      setPreviewSession(null);
      setPreviewLoading(false);
      setPreviewFailed(false);
      return;
    }

    if (previewCache.current.has(selectedSessionId)) {
      const cached = previewCache.current.get(selectedSessionId) ?? null;
      setPreviewSession(cached);
      setPreviewLoading(false);
      setPreviewFailed(!cached);
      return;
    }

    let live = true;
    setPreviewSession(null);
    setPreviewLoading(true);
    setPreviewFailed(false);
    source
      .readReplaySession(selectedSessionId)
      .then(session => {
        if (!live) return;
        previewCache.current.set(selectedSessionId, session);
        setPreviewSession(session);
        setPreviewFailed(!session);
      })
      .catch(() => {
        if (live) setPreviewFailed(true);
      })
      .finally(() => {
        if (live) setPreviewLoading(false);
      });
    return () => {
      live = false;
    };
  }, [selectedSessionId, source, useLandscapeTabletLayout]);

  const selectedItem =
    items.find(item => item.sessionId === selectedSessionId) ?? null;
  const previewBoardSize = Math.max(
    252,
    Math.min(400, width * 0.32, height - 300),
  );

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
  ) : null;

  return (
    <View style={styles.screen}>
      <RootPageHeader
        backLabel={t('app.back')}
        onBack={onClose}
        title={t('tab.replay')}
      />
      <View
        style={[
          styles.libraryWorkspace,
          useLandscapeTabletLayout && styles.libraryWorkspaceLandscape,
        ]}
        testID={
          useLandscapeTabletLayout
            ? 'replay-library-landscape-layout'
            : 'replay-library-portrait-layout'
        }
      >
        <SectionList
          {...scroll}
          collapsable={false}
          contentContainerStyle={[
            styles.library,
            useLandscapeTabletLayout && styles.libraryLandscape,
          ]}
          style={[
            styles.libraryList,
            useLandscapeTabletLayout && styles.libraryListLandscape,
          ]}
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
          maxToRenderPerBatch={8}
          onEndReached={() => {
            if (hasMore && request.current) loadPage(request.current);
          }}
          onEndReachedThreshold={0.45}
          renderItem={({ item }) => {
            const difficulty = t('game.level', { level: item.difficultyLevel });
            const status =
              item.status === 'completed'
                ? null
                : sessionStatusLabel(item.status, t);
            const duration =
              item.elapsedMs === null
                ? null
                : formatReplayDuration(item.elapsedMs);
            const hints =
              item.hintUseCount === null
                ? null
                : t(
                    item.hintUseCount === 1
                      ? 'replay.listHintOne'
                      : 'replay.listHints',
                    { count: item.hintUseCount },
                  );
            const clock = new Date(item.updatedAtEpochMs).toLocaleTimeString(
              locale,
              { hour: '2-digit', minute: '2-digit' },
            );
            const recovery =
              item.recoverability === 'unavailable'
                ? t('replay.unavailable')
                : item.recoverability === 'final_snapshot'
                ? t('replay.finalSnapshot')
                : null;
            const unavailable = item.recoverability === 'unavailable';
            return (
              <View style={styles.sessionItem}>
                <Pressable
                  accessibilityHint={
                    unavailable ? undefined : t('replay.watch')
                  }
                  accessibilityLabel={[
                    difficulty,
                    status,
                    duration,
                    hints,
                    clock,
                    recovery,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: unavailable,
                    selected:
                      useLandscapeTabletLayout &&
                      selectedSessionId === item.sessionId,
                  }}
                  collapsable={false}
                  disabled={unavailable}
                  onPress={() =>
                    useLandscapeTabletLayout
                      ? setSelectedSessionId(item.sessionId)
                      : onOpen(item.sessionId)
                  }
                  style={({ pressed }) => [
                    styles.sessionRow,
                    useLandscapeTabletLayout &&
                      selectedSessionId === item.sessionId &&
                      styles.sessionRowSelected,
                    pressed && styles.sessionRowPressed,
                    unavailable && styles.disabledAction,
                  ]}
                  testID={`replay-session-${item.sessionId}`}
                >
                  <View
                    style={styles.sessionLine}
                    testID={`replay-mainline-${item.sessionId}`}
                  >
                    <Text
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                      numberOfLines={1}
                      style={styles.sessionDifficulty}
                    >
                      {difficulty}
                    </Text>
                    {duration ? (
                      <Text numberOfLines={1} style={styles.sessionDuration}>
                        {duration}
                      </Text>
                    ) : null}
                    {hints ? (
                      <Text numberOfLines={1} style={styles.sessionHints}>
                        {duration ? '· ' : ''}
                        {hints}
                      </Text>
                    ) : null}
                    <Text numberOfLines={1} style={styles.sessionClock}>
                      {clock}
                    </Text>
                    <Text allowFontScaling={false} style={styles.sessionArrow}>
                      ›
                    </Text>
                  </View>
                  {status || recovery ? (
                    <View style={styles.sessionSpecial}>
                      {status ? (
                        <Text style={styles.sessionStatus}>{status}</Text>
                      ) : null}
                      {recovery ? (
                        <Text style={styles.sessionRecovery}>{recovery}</Text>
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
                {onFootprint ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => onFootprint(item.sessionId)}
                    style={styles.footprintAction}
                    testID={`replay-footprint-${item.sessionId}`}
                  >
                    <Text style={styles.footprintActionText}>
                      {t('replay.techniqueSummary')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          }}
          renderSectionHeader={({ section }) => (
            <Text style={styles.libraryGroupLabel}>{section.title}</Text>
          )}
          sections={sections}
          stickySectionHeadersEnabled={false}
          testID="replay-library-items"
          windowSize={5}
        />
        {useLandscapeTabletLayout ? (
          <View style={styles.libraryPreview} testID="replay-library-preview">
            {selectedItem ? (
              <>
                <Text style={styles.libraryPreviewEyebrow}>
                  {t('replay.initialBoard')}
                </Text>
                <View
                  style={[
                    styles.libraryPreviewBoard,
                    { minHeight: previewBoardSize },
                  ]}
                  testID="replay-library-preview-board"
                >
                  {previewLoading ? (
                    <ActivityIndicator color={palette.accent} size="small" />
                  ) : previewSession ? (
                    <SudokuBoard
                      disabled
                      highlightRegions={false}
                      highlightSameDigit={false}
                      maxSize={previewBoardSize}
                      onSelectCell={noSelect}
                      showCandidates={false}
                      showSelection={false}
                      state={initialReplayBoardState(previewSession)}
                    />
                  ) : previewFailed ? (
                    <Text style={styles.libraryPreviewUnavailable}>
                      {t('replay.unavailable')}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={styles.libraryPreviewSummary}
                  testID="replay-library-preview-summary"
                >
                  <View style={styles.libraryPreviewCopy}>
                    <Text
                      accessibilityRole="header"
                      style={styles.libraryPreviewTitle}
                    >
                      {t('game.level', {
                        level: selectedItem.difficultyLevel,
                      })}
                    </Text>
                    <Text style={styles.libraryPreviewDate}>
                      {new Date(selectedItem.updatedAtEpochMs).toLocaleString(
                        locale,
                        {
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        },
                      )}
                    </Text>
                    <View style={styles.libraryPreviewMetrics}>
                      {selectedItem.elapsedMs !== null ? (
                        <Text style={styles.libraryPreviewMetric}>
                          {formatReplayDuration(selectedItem.elapsedMs)}
                        </Text>
                      ) : null}
                      {selectedItem.hintUseCount !== null ? (
                        <Text style={styles.libraryPreviewMetric}>
                          {t(
                            selectedItem.hintUseCount === 1
                              ? 'replay.listHintOne'
                              : 'replay.listHints',
                            { count: selectedItem.hintUseCount },
                          )}
                        </Text>
                      ) : null}
                      {selectedItem.status !== 'completed' ? (
                        <Text style={styles.libraryPreviewMetric}>
                          {sessionStatusLabel(selectedItem.status, t)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.libraryPreviewActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => onOpen(selectedItem.sessionId)}
                      style={styles.libraryPreviewPrimary}
                      testID="replay-library-open-selected"
                    >
                      <Text style={styles.libraryPreviewPrimaryText}>
                        {t('replay.watch')}
                      </Text>
                    </Pressable>
                    {onFootprint ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => onFootprint(selectedItem.sessionId)}
                        style={styles.libraryPreviewSecondary}
                      >
                        <Text style={styles.libraryPreviewSecondaryText}>
                          {t('replay.techniqueSummary')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.libraryPreviewEmpty}>
                <Text style={styles.libraryStateSymbol}>↻</Text>
                <Text style={styles.libraryStateTitle}>
                  {t('replay.historyEmpty')}
                </Text>
              </View>
            )}
          </View>
        ) : null}
      </View>
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
    replayWorkspace: { flex: 1, minHeight: 0 },
    replayWorkspaceLandscape: {
      alignItems: 'stretch',
      flexDirection: 'row',
      gap: 28,
      paddingBottom: 12,
      paddingHorizontal: 20,
    },
    boardStage: { alignItems: 'center', paddingVertical: 6, flexShrink: 0 },
    boardStageLandscape: {
      flex: 3,
      justifyContent: 'center',
      minWidth: 0,
    },
    panel: {
      alignSelf: 'center',
      flex: 1,
      maxWidth: 720,
      minHeight: 0,
      paddingBottom: 16,
      width: '100%',
    },
    panelLandscape: {
      alignSelf: 'stretch',
      borderLeftColor: palette.line,
      borderLeftWidth: 1,
      flex: 2,
      maxWidth: 560,
      minWidth: 320,
      paddingLeft: 28,
      paddingRight: 8,
    },
    panelHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 8,
    },
    positionSummary: {
      alignItems: 'baseline',
      flexDirection: 'row',
      flexShrink: 1,
      gap: 7,
    },
    positionDifficulty: {
      color: palette.ink,
      fontSize: 16,
      fontWeight: '800',
    },
    positionSeparator: { color: palette.muted, fontSize: 15 },
    analyzeButton: {
      backgroundColor: palette.selected,
      borderRadius: 10,
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: 12,
    },
    stepSummary: {
      flexShrink: 1,
      color: palette.ink,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
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
    playIconButton: {
      backgroundColor: palette.accent,
      borderRadius: 22,
      minWidth: 44,
      width: 44,
    },
    playTransportIcon: {
      color: palette.white,
      fontSize: 18,
    },
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
    walkthroughSideLegend: {
      borderTopColor: palette.line,
      borderTopWidth: StyleSheet.hairlineWidth,
      marginTop: 8,
      paddingTop: 4,
      width: '100%',
    },
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
    shareMenuDismiss: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 9,
    },
    sharePopover: {
      position: 'absolute',
      right: 12,
      top: 58,
      zIndex: 10,
      minWidth: 200,
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 10,
      borderWidth: 1,
      paddingVertical: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.16,
      shadowRadius: 7,
      elevation: 4,
    },
    shareMenuOption: {
      justifyContent: 'center',
      minHeight: 48,
      paddingHorizontal: 14,
    },
    speedTrigger: {
      alignItems: 'flex-end',
      justifyContent: 'center',
      minHeight: 44,
      paddingHorizontal: 4,
    },
    headerActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
    speed: {
      paddingHorizontal: 16,
      minHeight: 40,
      justifyContent: 'center',
      borderRadius: 8,
    },
    explanationText: { flex: 1, gap: 5 },
    screen: { flex: 1, backgroundColor: palette.background },
    libraryWorkspace: { flex: 1, minHeight: 0 },
    libraryWorkspaceLandscape: {
      flexDirection: 'row',
      gap: 20,
      paddingBottom: 20,
      paddingHorizontal: 24,
    },
    libraryList: { flex: 1 },
    libraryListLandscape: { maxWidth: 620 },
    center: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    library: {
      alignSelf: 'center',
      maxWidth: ROOT_PAGE.contentMaxWidth,
      paddingHorizontal: ROOT_PAGE.contentHorizontalInset,
      paddingBottom: 32,
      paddingTop: 8,
      width: '100%',
    },
    libraryLandscape: {
      maxWidth: '100%',
      paddingHorizontal: 0,
    },
    libraryPreview: {
      alignItems: 'flex-start',
      alignSelf: 'stretch',
      borderLeftWidth: 1,
      borderColor: palette.line,
      flex: 1,
      maxWidth: 460,
      minWidth: 320,
      paddingLeft: 28,
      paddingRight: 8,
      paddingTop: 8,
    },
    libraryPreviewEyebrow: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    libraryPreviewBoard: {
      alignItems: 'flex-start',
      justifyContent: 'center',
      marginTop: 10,
      maxWidth: 400,
      width: '100%',
    },
    libraryPreviewUnavailable: {
      color: palette.muted,
      fontSize: 13,
      lineHeight: 19,
      maxWidth: 320,
    },
    libraryPreviewSummary: {
      alignItems: 'flex-end',
      flexDirection: 'row',
      gap: 16,
      marginTop: 16,
      maxWidth: 400,
      width: '100%',
    },
    libraryPreviewCopy: { flex: 1, minWidth: 0 },
    libraryPreviewTitle: {
      color: palette.ink,
      fontSize: 23,
      fontWeight: '800',
    },
    libraryPreviewDate: {
      color: palette.muted,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    libraryPreviewMetrics: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 8,
    },
    libraryPreviewMetric: {
      color: palette.ink,
      fontSize: 13,
      fontWeight: '700',
    },
    libraryPreviewActions: { alignItems: 'stretch', minWidth: 136 },
    libraryPreviewPrimary: {
      alignItems: 'center',
      backgroundColor: palette.accent,
      borderRadius: 11,
      justifyContent: 'center',
      minHeight: 46,
      paddingHorizontal: 18,
    },
    libraryPreviewPrimaryText: {
      color: palette.white,
      fontSize: 16,
      fontWeight: '800',
    },
    libraryPreviewSecondary: {
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
      minHeight: 42,
    },
    libraryPreviewSecondaryText: {
      color: palette.accent,
      fontSize: 14,
      fontWeight: '700',
    },
    libraryPreviewEmpty: {
      alignItems: 'center',
      alignSelf: 'stretch',
      flex: 1,
      justifyContent: 'center',
    },
    libraryGroupLabel: {
      color: palette.muted,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 4,
      marginTop: 18,
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
      borderTopColor: palette.line,
      borderTopWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      gap: 8,
      justifyContent: 'space-between',
      marginHorizontal: 16,
      minHeight: 68,
      paddingBottom: 4,
      paddingTop: 12,
    },
    footerSide: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      minWidth: 0,
    },
    footerSideEnd: { justifyContent: 'flex-end' },
    footerAction: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 44,
    },
    footerActionDisabled: { opacity: 0.35 },
    footerPrevious: {
      minWidth: 76,
      paddingHorizontal: 8,
    },
    footerPreviousText: {
      color: palette.accent,
      fontSize: 15,
      fontWeight: '700',
    },
    footerNext: {
      backgroundColor: palette.accent,
      borderRadius: 10,
      flexShrink: 1,
      maxWidth: '100%',
      minWidth: 112,
      paddingHorizontal: 16,
    },
    footerNextText: {
      color: palette.white,
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
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
      fontSize: 13,
      fontVariant: ['tabular-nums'],
      textAlign: 'center',
      width: 52,
    },
    sessionItem: {
      borderBottomColor: palette.line,
      borderBottomWidth: ROOT_PAGE.dividerWidth,
    },
    sessionRow: {
      minHeight: 60,
      paddingHorizontal: 2,
      paddingVertical: 10,
    },
    sessionRowPressed: { opacity: 0.65 },
    sessionRowSelected: {
      backgroundColor: palette.accentSoft,
      borderRadius: 12,
      paddingHorizontal: 12,
    },
    sessionLine: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 38,
    },
    sessionDifficulty: {
      color: palette.ink,
      flex: 1,
      fontSize: 16,
      fontWeight: '700',
      marginRight: 8,
    },
    sessionSpecial: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingBottom: 3,
    },
    sessionStatus: {
      color: palette.muted,
      fontSize: 12,
      fontWeight: '600',
    },
    sessionArrow: {
      color: palette.muted,
      fontSize: 23,
      lineHeight: 24,
      marginLeft: 8,
    },
    sessionDuration: {
      color: palette.ink,
      fontSize: 15,
      fontWeight: '700',
    },
    sessionHints: {
      color: palette.muted,
      fontSize: 13,
      marginLeft: 6,
    },
    sessionClock: {
      color: palette.muted,
      fontSize: 12,
      marginLeft: 10,
      opacity: 0.78,
    },
    sessionRecovery: {
      color: palette.muted,
      fontSize: 12,
    },
    footprintAction: {
      justifyContent: 'center',
      minHeight: 34,
      paddingBottom: 8,
      paddingHorizontal: 2,
    },
    footprintActionText: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: '600',
    },
    disabledAction: { opacity: 0.4 },
  });
}
