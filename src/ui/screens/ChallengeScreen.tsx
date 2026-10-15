import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  BackHandler,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LocalizedText as Text } from '../components/LocalizedText';
import { Pressable } from '../components/FocusablePressable';
import { AppIcon } from '../components/AppIcon';
import { GameScreen } from './GameScreen';
import { CHALLENGE_COPY } from '../../localization/challenge-copy';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import {
  ARTICLE_LABELS,
  TECHNIQUE_ARTICLE_COPY,
} from '../../localization/technique-articles';
import { useAppTheme, type AppPalette } from '../theme';
import { getChallengeCatalog } from '../../data/challenge/challenge-catalog';
import { ChallengeController } from '../../application/challenge/challenge-controller';
import {
  challengeBoardSession,
  editChallengeCandidates,
  placeChallengeDigit,
  challengeSubmission,
} from '../../application/challenge/challenge-board';
import { practiceGameSnapshot } from '../../application/practice/practice-session';
import type { ProductPreferences } from '../../application/app/product-preferences';
import { CHALLENGE_EPISODES } from '../../domain/challenge/contracts';
import type { CommercialController } from '../../application/commercial/controller';
import type {
  ChallengeAccessStore,
  ChallengeOperation,
  ChallengeProgressStore,
} from '../../domain/challenge/contracts';
import type { Digit } from '../../domain/sudoku/contracts';
import { useKeepAwake } from '../product-experience-effects';

const DIGITS: readonly Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type LevelDraft = {
  operations: readonly ChallengeOperation[];
  history: readonly ChallengeOperation[][];
  cell: number | null;
  pencil: boolean;
  showCandidates: boolean;
  started: boolean;
};

export function ChallengeScreen({
  store,
  access,
  commercial,
  premium = false,
  preferences,
  onClose,
}: {
  store: ChallengeProgressStore;
  access?: ChallengeAccessStore;
  commercial?: Pick<CommercialController, 'unlockChallengeEpisode'>;
  premium?: boolean;
  preferences: ProductPreferences;
  onClose(): void;
}): React.JSX.Element {
  const { locale, t } = useLocalization();
  const copy = CHALLENGE_COPY[locale];
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [controller, setController] = useState<ChallengeController | null>(
    null,
  );
  const [loadError, setLoadError] = useState(false);
  const [loadGeneration, reload] = useState(0);
  const [, redraw] = useState(0);
  const [stage, setStage] = useState<'briefing' | 'board' | 'result'>(
    'briefing',
  );
  const [started, setStarted] = useState(false);
  const draftHistory = useRef<readonly ChallengeOperation[][]>([]);
  const levelDrafts = useRef(new Map<number, LevelDraft>());
  const [selected, select] = useState<number | null>(null);
  const [draft, setDraft] = useState<readonly ChallengeOperation[]>([]);
  const [cell, setCellState] = useState<number | null>(null);
  const cellRef = useRef<number | null>(null);
  const setCell = (next: number | null) => {
    cellRef.current = next;
    setCellState(next);
  };
  const draftRef = useRef(draft);
  const setDraftState = setDraft;
  const updateDraft = (next: readonly ChallengeOperation[]) => {
    draftRef.current = next;
    setDraftState(next);
  };
  const editDraft = (next: readonly ChallengeOperation[]) => {
    if (JSON.stringify(next) === JSON.stringify(draftRef.current)) return;
    draftHistory.current = [...draftHistory.current, [...draftRef.current]];
    updateDraft(next);
  };
  const clearDraft = () => {
    draftHistory.current = [];
    updateDraft([]);
  };
  const [pencil, setPencil] = useState(true);
  const [showCandidates, setShowCandidates] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const alive = useRef(true);
  const [active, setActive] = useState(
    AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive',
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [helpExpanded, setHelpExpanded] = useState(false);
  useKeepAwake(
    preferences.keepAwake && selected !== null && stage === 'board' && active,
  );

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    let current: ChallengeController | null = null;
    setLoadError(false);
    try {
      const next = new ChallengeController(
        getChallengeCatalog(),
        store,
        undefined,
        access,
      );
      current = next;
      next
        .load()
        .then(() => {
          if (!cancelled) {
            const available = next.catalog.levels
              .map((_, i) => i)
              .filter(i => next.available(i));
            const pending = available.find(
              i => !next.progress(next.catalog.levels[i].id).everPassed,
            );
            const index = pending ?? available[available.length - 1];
            select(index);
            setPencil(
              next.catalog.levels[index].technique_code !== 'hiddenSingle',
            );
            setStage(pending === undefined ? 'result' : 'briefing');
            setController(next);
          }
        })
        .catch(() => {
          if (!cancelled) setLoadError(true);
        });
    } catch {
      setLoadError(true);
    }
    return () => {
      cancelled = true;
      current?.dispose();
    };
  }, [store, access, loadGeneration]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state =>
      setActive(state === 'active'),
    );
    return () => subscription.remove();
  }, []);
  const back = () => {
    if (busyRef.current) return;
    if (!controller || selected === null) {
      onClose();
      return;
    }
    const id = controller.catalog.levels[selected].id;
    run(async () => {
      await controller.flushTime(id);
      if (!alive.current) return;
      if (stage === 'board') {
        setStage('briefing');
        setFeedback(null);
      } else onClose();
    });
  };
  const home = () => {
    if (busyRef.current) return;
    if (!controller || selected === null) {
      onClose();
      return;
    }
    run(async () => {
      await controller.flushTime(controller.catalog.levels[selected].id);
      if (alive.current) onClose();
    });
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        back();
        return true;
      },
    );
    return () => subscription.remove();
  });
  const run = async (operation: () => Promise<void>) => {
    if (busyRef.current) return;
    controller?.setPlaying(null);
    busyRef.current = true;
    setBusy(true);
    try {
      await operation();
    } catch {
      if (alive.current) setFeedback(copy.saveError);
    } finally {
      busyRef.current = false;
      if (alive.current) {
        setBusy(false);
        redraw(n => n + 1);
      }
    }
  };
  const open = (index: number) => {
    if (!controller?.available(index) || busyRef.current) return;
    if (index === selected) {
      setStage('briefing');
      setHelpExpanded(false);
      return;
    }
    run(async () => {
      if (selected !== null) {
        await controller.flushTime(controller.catalog.levels[selected].id);
        if (!alive.current) return;
        levelDrafts.current.set(selected, {
          operations: draftRef.current,
          history: draftHistory.current,
          cell: cellRef.current,
          pencil,
          showCandidates,
          started,
        });
      }
      const saved = levelDrafts.current.get(index);
      select(index);
      setStage('briefing');
      setHelpExpanded(false);
      setStarted(saved?.started ?? false);
      draftHistory.current = saved?.history ?? [];
      updateDraft(saved?.operations ?? []);
      setCell(saved?.cell ?? null);
      setFeedback(null);
      setPencil(
        saved?.pencil ??
          controller.catalog.levels[index].technique_code !== 'hiddenSingle',
      );
      setShowCandidates(saved?.showCandidates ?? true);
    });
  };
  const level =
    selected === null ? null : controller?.catalog.levels[selected] ?? null;
  const episodeIndex = Math.floor((selected ?? 0) / 6);
  const localIndex = (selected ?? 0) % 6;
  const episodeName = [copy.episode, copy.episodeTwo, copy.episodeThree][
    episodeIndex
  ];
  const progress = level ? controller!.progress(level.id) : null;
  const title = level?.technique_code
    ? HINT_PRESENTATION_COPIES[locale].techniques[level.technique_code].name
    : copy.comprehensive;
  const article = level?.technique_code
    ? TECHNIQUE_ARTICLE_COPY[locale][level.technique_code]
    : null;
  const blocked =
    busy || !active || !!progress?.attempt.passed || !!progress?.attempt.ended;
  useEffect(() => {
    controller?.setPlaying(
      level && stage === 'board' && !blocked ? level.id : null,
    );
    return () => controller?.setPlaying(null);
  }, [controller, level, blocked, stage]);
  useEffect(() => {
    if (controller && level && !active && !busyRef.current)
      run(() => controller.flushTime(level.id));
    // Save once on backgrounding; busy state changes must not schedule another save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, controller, level]);
  const task = (
    level?.technique_code === null
      ? copy.goal
      : level?.technique_code === 'hiddenSingle'
      ? copy.place
      : copy.remove
  ).replace('{technique}', title);
  const session = useMemo(
    () =>
      level && progress
        ? challengeBoardSession(
            level,
            progress.attempt,
            draft,
            cell,
            pencil,
            showCandidates,
            preferences.autoRemoveCandidates,
          )
        : null,
    [
      level,
      progress,
      draft,
      cell,
      pencil,
      showCandidates,
      preferences.autoRemoveCandidates,
    ],
  );
  const gamePreferences = useMemo(
    () => ({
      ...preferences,
      showTimer: false,
      showMistakes: false,
      showRemainingDigits: false,
      boardColoring: false,
      forcingEnabled: false,
      oneTapFill: false,
      autoFinishMode: 'off' as const,
      autoCheckErrors: false,
    }),
    [preferences],
  );
  const button = (
    label: string,
    action: () => void,
    id: string,
    disabled = busy,
    primary = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={action}
      disabled={disabled}
      style={[
        styles.button,
        primary && styles.primaryButton,
        disabled && styles.disabled,
      ]}
      testID={id}
    >
      <Text style={[styles.buttonText, primary && styles.primaryButtonText]}>
        {label}
      </Text>
      {primary ? (
        <AppIcon name="forward" color={palette.background} size={20} />
      ) : null}
    </Pressable>
  );
  const begin = () => {
    if (!controller || !level || !progress || busyRef.current) return;
    if (progress.attempt.ended || progress.attempt.passed) {
      run(async () => {
        await controller.restart(level.id);
        if (!alive.current) return;
        clearDraft();
        setCell(null);
        setFeedback(null);
        setStage('board');
        setStarted(true);
      });
    } else {
      setStage('board');
      setStarted(true);
    }
  };
  if (
    !controller ||
    loadError ||
    selected === null ||
    !level ||
    !progress ||
    !session
  )
    return (
      <View style={styles.directory} testID="challenge-loading">
        <Text accessibilityRole="header" style={styles.title}>
          {copy.title}
        </Text>
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {loadError ? copy.saveError : copy.checking}
        </Text>
        {loadError
          ? button(copy.retry, () => reload(n => n + 1), 'challenge-retry')
          : null}
        {button(t('game.home'), onClose, 'challenge-close')}
      </View>
    );
  if (stage === 'briefing' || stage === 'result') {
    const result = stage === 'result';
    const finished = result && controller.episodeComplete(episodeIndex);
    const lastEpisode = episodeIndex === CHALLENGE_EPISODES.length - 1;
    const nextAvailable =
      !lastEpisode && controller.available((episodeIndex + 1) * 6);
    const advanceEpisode = () => {
      if (lastEpisode) {
        home();
        return;
      }
      if (nextAvailable) {
        open((episodeIndex + 1) * 6);
        return;
      }
      run(async () => {
        const outcome = await commercial?.unlockChallengeEpisode(
          CHALLENGE_EPISODES[episodeIndex + 1].id,
        );
        if (!alive.current) return;
        if (outcome?.status === 'unlocked') {
          await controller.refreshAccess();
          if (!alive.current) return;
          if (!controller.available((episodeIndex + 1) * 6))
            throw new Error('Access not saved');
          levelDrafts.current.set(selected, {
            operations: draftRef.current,
            history: draftHistory.current,
            cell: cellRef.current,
            pencil,
            showCandidates,
            started,
          });
          select((episodeIndex + 1) * 6);
          setStage('briefing');
          setStarted(false);
          clearDraft();
          setCell(null);
          setPencil(true);
          setShowCandidates(true);
          setHelpExpanded(false);
          setFeedback(null);
        } else
          setFeedback(
            outcome?.status === 'dismissed'
              ? copy.adIncomplete
              : outcome?.status === 'failed'
              ? copy.saveError
              : copy.adUnavailable,
          );
      });
    };
    const resumed =
      !progress.attempt.ended &&
      !progress.attempt.passed &&
      (started ||
        progress.attempt.accepted.length > 0 ||
        progress.attempt.elapsedMs > 0);
    return (
      <View
        style={styles.game}
        testID={result ? 'challenge-result' : 'challenge-briefing'}
      >
        <View style={styles.pageHeader} testID="challenge-page-header">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('game.home')}
            onPress={home}
            disabled={busy}
            style={styles.backButton}
            testID="challenge-page-back"
          >
            <AppIcon name="home" color={palette.accent} size={20} />
            <Text style={styles.backText}>{t('game.home')}</Text>
          </Pressable>
          <Text style={styles.progressLabel} testID="challenge-level-progress">
            {localIndex + 1} / {6}
          </Text>
        </View>
        <View style={styles.episodeHeader}>
          {episodeIndex > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.previousEpisode}
              disabled={busy}
              onPress={() => open((episodeIndex - 1) * 6)}
              style={styles.episodeArrow}
              testID="challenge-previous-episode"
            >
              <AppIcon name="back" color={palette.accent} size={20} />
            </Pressable>
          ) : null}
          <Text
            accessibilityRole="header"
            style={styles.episodeTitle}
            testID="challenge-episode-title"
          >
            {episodeIndex + 1} · {episodeName}
          </Text>
          {episodeIndex < 2 &&
          (controller.episodeComplete(episodeIndex) || nextAvailable) ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.nextEpisode}
              disabled={busy}
              onPress={() =>
                nextAvailable
                  ? open((episodeIndex + 1) * 6)
                  : setStage('result')
              }
              style={styles.episodeArrow}
              testID="challenge-next-episode"
            >
              <AppIcon name="forward" color={palette.accent} size={20} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.progressTrack}>
          {controller.catalog.levels
            .slice(episodeIndex * 6, episodeIndex * 6 + 6)
            .map((item, index) => {
              const passed = controller.progress(item.id).everPassed;
              const name = item.technique_code
                ? HINT_PRESENTATION_COPIES[locale].techniques[
                    item.technique_code
                  ].name
                : copy.comprehensive;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${index + 1} · ${name}${
                    passed ? ` · ${copy.completed}` : ''
                  }`}
                  accessibilityState={{
                    selected: index === localIndex,
                    disabled: busy,
                  }}
                  disabled={busy}
                  onPress={() => open(episodeIndex * 6 + index)}
                  style={[
                    styles.levelTab,
                    index === localIndex && styles.levelTabSelected,
                  ]}
                  testID={`challenge-level-${index + 1}`}
                >
                  <View style={styles.levelTabLabel}>
                    <Text
                      style={[
                        styles.levelNumber,
                        index === localIndex && styles.levelNumberSelected,
                      ]}
                    >
                      {index + 1}
                    </Text>
                    {passed ? (
                      <AppIcon
                        name="check"
                        color={palette.accent}
                        size={12}
                        testID={`challenge-level-${index + 1}-passed`}
                      />
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.progressSegment,
                      (passed || index === localIndex) &&
                        styles.progressSegmentActive,
                    ]}
                  />
                </Pressable>
              );
            })}
        </View>
        <ScrollView
          key={`${level.id}:${stage}`}
          contentContainerStyle={styles.pageContent}
          testID="challenge-instructions-scroll"
        >
          <View style={styles.intro}>
            {result ? (
              <View style={styles.completedBadge}>
                <AppIcon name="check" color={palette.accent} size={40} />
              </View>
            ) : null}
            <Text
              accessibilityRole="header"
              style={styles.title}
              testID={result ? 'challenge-passed' : 'challenge-level-title'}
            >
              {result ? (finished ? copy.finished : copy.completed) : title}
            </Text>
            {result ? (
              <Text style={styles.resultDetail}>
                {finished ? episodeName : title}
              </Text>
            ) : null}
          </View>
          {finished && lastEpisode ? (
            <Text style={styles.resultDetail} testID="challenge-coming-soon">
              {copy.comingSoon}
            </Text>
          ) : null}
          {finished && !lastEpisode && !nextAvailable && !premium ? (
            <Text style={styles.resultDetail} testID="challenge-ad-description">
              {copy.adDescription}
            </Text>
          ) : null}
          {!result ? (
            <>
              <View style={styles.mission}>
                <View style={styles.sectionHeading}>
                  <AppIcon name="goal" color={palette.accent} size={20} />
                  <Text style={styles.sectionLabel}>{copy.objective}</Text>
                </View>
                <Text style={styles.missionText} testID="challenge-goal">
                  {task}
                </Text>
              </View>
              <View style={styles.howToPlay}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.briefing}
                  accessibilityState={{ expanded: helpExpanded }}
                  onPress={() => setHelpExpanded(value => !value)}
                  style={styles.helpToggle}
                  testID="challenge-help-toggle"
                >
                  <Text style={styles.sectionLabel}>{copy.briefing}</Text>
                  <AppIcon
                    name={helpExpanded ? 'minus' : 'plus'}
                    color={palette.muted}
                    size={20}
                  />
                </Pressable>
                {helpExpanded ? (
                  <View
                    style={styles.helpContent}
                    testID="challenge-help-content"
                  >
                    <Text style={styles.sectionLabel}>
                      {article
                        ? ARTICLE_LABELS[locale].pattern
                        : t('techniques.title')}
                    </Text>
                    <Text style={styles.body}>
                      {article?.pattern ??
                        controller.catalog.levels
                          .slice(episodeIndex * 6, episodeIndex * 6 + 5)
                          .map(
                            item =>
                              HINT_PRESENTATION_COPIES[locale].techniques[
                                item.technique_code!
                              ].name,
                          )
                          .join(' · ')}
                    </Text>
                    <Text style={styles.helpText}>{copy.editingHelp}</Text>
                  </View>
                ) : null}
              </View>
            </>
          ) : null}
          {feedback ? (
            <Text accessibilityLiveRegion="polite" style={styles.feedback}>
              {feedback}
            </Text>
          ) : null}
        </ScrollView>
        <View style={styles.pageFooter}>
          {!result ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.previous}
              disabled={busy || localIndex === 0}
              onPress={() => open(selected - 1)}
              style={[
                styles.previousButton,
                (busy || localIndex === 0) && styles.disabled,
              ]}
              testID="challenge-previous"
            >
              <AppIcon name="back" color={palette.accent} size={20} />
            </Pressable>
          ) : null}
          <View style={styles.footerPrimary}>
            {result
              ? button(
                  finished
                    ? lastEpisode
                      ? t('game.home')
                      : nextAvailable
                      ? copy.nextEpisode
                      : (premium
                          ? copy.unlockEpisode
                          : copy.watchUnlock
                        ).replace('{episode}', String(episodeIndex + 2))
                    : copy.next,
                  () => {
                    if (finished) advanceEpisode();
                    else open(episodeIndex * 6 + ((localIndex + 1) % 6));
                  },
                  'challenge-next',
                  busy,
                  true,
                )
              : button(
                  resumed ? copy.continue : copy.start,
                  begin,
                  'challenge-start',
                  busy,
                  true,
                )}
          </View>
        </View>
      </View>
    );
  }
  const check = () => {
    run(async () => {
      const status = await controller.check(
        level.id,
        challengeSubmission(draftRef.current),
      );
      if (!alive.current) return;
      if (status === 'accepted' || status === 'rejected') clearDraft();
      if (
        status === 'accepted' &&
        controller.progress(level.id).attempt.passed
      ) {
        setStage('result');
        setFeedback(null);
      } else
        setFeedback(
          status === 'accepted'
            ? copy.progressAccepted
            : status === 'rejected'
            ? copy.rejected
            : status === 'enter'
            ? task
            : copy.unavailable,
        );
    });
  };
  return (
    <View style={styles.game} testID="challenge-board">
      <GameScreen
        snapshot={{ ...practiceGameSnapshot(session), busy }}
        preferences={gamePreferences}
        premium
        onBack={back}
        onPause={() => {}}
        onResume={() => {}}
        onAbandon={back}
        onSelectCell={target => {
          if (!blocked) setCell(target);
        }}
        onOneTapFill={() => {}}
        onDigit={digit => {
          if (
            blocked ||
            cellRef.current === null ||
            level.source.board_fingerprint[cellRef.current] !== '0'
          )
            return;
          setFeedback(null);
          if (pencil) {
            editDraft(
              editChallengeCandidates(
                level,
                progress.attempt,
                draftRef.current,
                [cellRef.current],
                [digit],
                'remove',
              ),
            );
          } else
            editDraft(
              placeChallengeDigit(draftRef.current, cellRef.current, digit),
            );
        }}
        onEditCandidates={(cells, digits, action) => {
          if (!blocked) {
            setFeedback(null);
            editDraft(
              editChallengeCandidates(
                level,
                progress.attempt,
                draftRef.current,
                cells,
                digits,
                action,
              ),
            );
          }
        }}
        onUndo={() => {
          if (blocked) return;
          if (draftHistory.current.length) {
            const previous = draftHistory.current.at(-1)!;
            draftHistory.current = draftHistory.current.slice(0, -1);
            updateDraft(previous);
          } else run(() => controller.undo(level.id));
          setFeedback(null);
        }}
        onErase={() => {
          if (
            blocked ||
            cellRef.current === null ||
            level.source.board_fingerprint[cellRef.current] !== '0'
          )
            return;
          const target = cellRef.current;
          if (
            draftRef.current.some(
              op => op.kind === 'placement' && op.cell === target,
            )
          )
            editDraft(
              draftRef.current.filter(
                op => op.kind !== 'placement' || op.cell !== target,
              ),
            );
          else if (showCandidates)
            editDraft(
              editChallengeCandidates(
                level,
                progress.attempt,
                draftRef.current,
                [target],
                DIGITS,
                'remove',
              ),
            );
          setFeedback(null);
        }}
        onQuickPencil={() => {
          if (!blocked) setShowCandidates(v => !v);
        }}
        onPencil={() => {
          if (!blocked) setPencil(v => !v);
        }}
        onHint={() => {}}
        onApplyHint={() => {}}
        onDismissHint={() => {}}
        practice={{
          title: `${localIndex + 1} / 6 · ${title}`,
          readOnly: blocked,
          backLabel: copy.back,
          actionLabel: busy ? copy.checking : copy.check,
          actionDisabled: blocked || !draft.length,
          actionKind: 'check',
          allowValueReplacement: !blocked,
          pencilLabel: pencil ? copy.eliminateMode : copy.fillMode,
          restart: {
            label: copy.restart,
            onPress: () => {
              run(async () => {
                await controller.restart(level.id);
                if (!alive.current) return;
                clearDraft();
                levelDrafts.current.delete(selected);
                setCell(null);
                setPencil(level.technique_code !== 'hiddenSingle');
                setShowCandidates(true);
                setFeedback(null);
              });
            },
          },
          onAction: check,
        }}
      />
      {feedback ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={feedback}
          onPress={() => setFeedback(null)}
          style={styles.feedbackToast}
          testID="challenge-feedback"
        >
          <Text accessibilityLiveRegion="polite" style={styles.feedback}>
            {feedback}
          </Text>
          <AppIcon name="close" color={palette.muted} size={20} />
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    game: { flex: 1, backgroundColor: palette.background },
    directory: {
      padding: 24,
      gap: 16,
      flexGrow: 1,
      backgroundColor: palette.background,
    },
    pageHeader: {
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      paddingHorizontal: 16,
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      minHeight: 48,
      paddingHorizontal: 8,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backText: { color: palette.accent, fontSize: 16, fontWeight: '600' },
    progressLabel: {
      color: palette.muted,
      fontSize: 13,
      fontWeight: '600',
      paddingHorizontal: 8,
    },
    episodeArrow: {
      minWidth: 48,
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    episodeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      paddingHorizontal: 24,
      paddingTop: 8,
      paddingBottom: 16,
    },
    episodeTitle: {
      flex: 1,
      color: palette.ink,
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '600',
    },
    progressTrack: {
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      paddingHorizontal: 16,
      flexDirection: 'row',
      gap: 4,
      paddingBottom: 8,
    },
    levelTab: {
      flex: 1,
      minHeight: 48,
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingVertical: 8,
      gap: 8,
      justifyContent: 'center',
    },
    levelTabSelected: { backgroundColor: palette.accentSoft },
    levelTabLabel: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 3,
    },
    levelNumber: { color: palette.muted, fontSize: 13, fontWeight: '600' },
    levelNumberSelected: { color: palette.accent },
    progressSegment: {
      height: 3,
      backgroundColor: palette.panelBorder,
      borderRadius: 2,
    },
    progressSegmentActive: { backgroundColor: palette.accent },
    pageContent: {
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      paddingHorizontal: 24,
      paddingBottom: 24,
      gap: 24,
      flexGrow: 1,
    },
    intro: { alignItems: 'center', paddingTop: 20, paddingBottom: 4, gap: 14 },
    completedBadge: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor: palette.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: palette.ink,
      fontSize: 26,
      lineHeight: 34,
      fontWeight: '700',
      textAlign: 'center',
    },
    resultDetail: {
      color: palette.muted,
      fontSize: 17,
      lineHeight: 25,
      textAlign: 'center',
    },
    mission: {
      backgroundColor: palette.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: palette.panelBorder,
      padding: 22,
      gap: 16,
    },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionLabel: { color: palette.ink, fontSize: 14, fontWeight: '700' },
    missionText: { color: palette.ink, fontSize: 18, lineHeight: 28 },
    howToPlay: {
      paddingHorizontal: 4,
      borderTopWidth: 1,
      borderTopColor: palette.panelBorder,
    },
    helpToggle: {
      minHeight: 56,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    helpContent: { gap: 12, paddingBottom: 12 },
    body: { color: palette.ink, fontSize: 15, lineHeight: 23, flexShrink: 1 },
    helpText: { color: palette.muted, fontSize: 13, lineHeight: 21 },
    pageFooter: {
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      paddingHorizontal: 24,
      paddingTop: 12,
      paddingBottom: 16,
      backgroundColor: palette.background,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 12,
    },
    footerPrimary: { flex: 1 },
    previousButton: {
      width: 56,
      minHeight: 56,
      borderRadius: 18,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.panelBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryButton: {
      backgroundColor: palette.accent,
      borderRadius: 18,
      minHeight: 56,
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    primaryButtonText: {
      color: palette.background,
      fontSize: 17,
      fontWeight: '700',
    },
    feedback: { color: palette.accent, fontSize: 14, flexShrink: 1 },
    feedbackToast: {
      position: 'absolute',
      top: 56,
      left: 20,
      right: 20,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.panelBorder,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      elevation: 6,
    },
    button: {
      minHeight: 44,
      paddingVertical: 10,
      paddingHorizontal: 12,
      justifyContent: 'center',
    },
    buttonText: {
      color: palette.accent,
      fontSize: 14,
      fontWeight: '600',
      flexShrink: 1,
    },
    disabled: { opacity: 0.45 },
  });
}
