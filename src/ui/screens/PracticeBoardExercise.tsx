import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DEFAULT_PRODUCT_PREFERENCES,
  type ProductPreferences,
} from '../../application/app/product-preferences';
import {
  createPracticeGameSession,
  practiceDefinition,
  practiceGameSnapshot,
} from '../../application/practice/practice-session';
import {
  evaluatePractice,
  hasPracticeAnswer,
  practiceAnswerKind,
  practiceInitialCandidates,
} from '../../application/practice/practice-evaluator';
import {
  practiceContentKey,
  type PracticeScene,
} from '../../data/practice/practice-catalog';
import type { GameCommand, GameSession } from '../../domain/game/contracts';
import { dispatchGameCommand } from '../../domain/game/engine';
import type { HintWalkthroughSnapshot } from '../../domain/hints/walkthrough';
import type { CandidateRef } from '../../domain/sudoku/contracts';
import { buildLessonPresentation } from '../../domain/lessons/presentation';
import type { PracticeProgressStore } from '../../domain/practice/progress';
import { PracticeTimer } from '../../domain/practice/practice-timer';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { AppIcon } from '../components/AppIcon';
import { HintWalkthroughPlayer } from '../components/HintWalkthroughPlayer';
import { AppPalette, useAppTheme } from '../theme';
import { GameScreen } from './GameScreen';

const COPY = {
  en: {
    back: 'Exercises',
    check: 'Check answer',
    proof: 'Explanation',
    correct: 'Correct',
    incorrect: 'Try again',
    other: 'Find a Hidden Single',
    enter: 'Place a digit first',
    correctDetail: 'You found a Hidden Single.',
    incorrectDetail: 'Check the digit and its cell.',
    otherDetail: 'Look for the only place in a row, column or box.',
    enterDetail: 'Place a digit on the board, then check it.',
    unavailable: 'Could not check',
    unavailableDetail: 'Please try checking again.',
    checking: 'Checking…',
    nextExercise: 'Next exercise',
    returnToExercises: 'Exercises',
    board: 'Back to board',
    done: 'Exercises',
    step: 'Step',
    previous: 'Back',
    next: 'Next',
    restart: 'Restart',
  },
  'zh-Hans': {
    back: '选题',
    check: '检查答案',
    proof: '查看讲解',
    correct: '正确',
    incorrect: '再试一次',
    other: '请找隐性唯一数',
    enter: '先填一个数字',
    correctDetail: '你找到了一个隐性唯一数。',
    incorrectDetail: '再看看数字和格子是否对应。',
    otherDetail: '看看行、列或宫里是否只有这一个位置。',
    enterDetail: '先在棋盘填数，再检查答案。',
    unavailable: '暂时无法检查',
    unavailableDetail: '请再检查一次。',
    checking: '正在检查…',
    nextExercise: '下一题',
    returnToExercises: '返回选题',
    board: '返回棋盘',
    done: '返回选题',
    step: '步骤',
    previous: '上一步',
    next: '下一步',
    restart: '重看',
  },
  ja: {
    back: '問題一覧',
    check: '答えを確認',
    proof: '解説を見る',
    correct: '正解',
    incorrect: 'もう一度',
    other: 'ヒドゥンシングルを探す',
    enter: '先に数字を入れる',
    correctDetail: 'ヒドゥンシングルを見つけました。',
    incorrectDetail: '数字とマスを確認してください。',
    otherDetail: '行・列・ブロックの唯一の場所を探してください。',
    enterDetail: '盤面に数字を入れてから確認してください。',
    unavailable: '確認できませんでした',
    unavailableDetail: 'もう一度確認してください。',
    checking: '確認中…',
    nextExercise: '次の問題',
    returnToExercises: '問題一覧',
    board: '盤面に戻る',
    done: '問題一覧',
    step: 'ステップ',
    previous: '戻る',
    next: '次へ',
    restart: '最初から',
  },
  de: {
    back: 'Aufgaben',
    check: 'Antwort prüfen',
    proof: 'Erklärung',
    correct: 'Richtig',
    incorrect: 'Noch einmal',
    other: 'Finde einen Hidden Single',
    enter: 'Trage zuerst eine Ziffer ein',
    correctDetail: 'Du hast einen Hidden Single gefunden.',
    incorrectDetail: 'Prüfe Ziffer und Feld noch einmal.',
    otherDetail: 'Suche den einzigen Platz in Zeile, Spalte oder Block.',
    enterDetail: 'Trage zuerst eine Ziffer ein und prüfe sie dann.',
    unavailable: 'Prüfung nicht möglich',
    unavailableDetail: 'Bitte prüfe die Antwort erneut.',
    checking: 'Wird geprüft…',
    nextExercise: 'Nächste Aufgabe',
    returnToExercises: 'Aufgaben',
    board: 'Zurück zum Raster',
    done: 'Aufgaben',
    step: 'Schritt',
    previous: 'Zurück',
    next: 'Weiter',
    restart: 'Neustart',
  },
} as const;

const PAIR_COPY = {
  en: {
    ...COPY.en,
    other: 'Find a Naked Pair',
    enter: 'Remove a candidate first',
    correctDetail: 'You found a valid Naked Pair elimination.',
    incorrectDetail: 'Check the candidate you removed.',
    otherDetail: 'Look for two cells with the same two candidates.',
    enterDetail: 'Remove a candidate on the board, then check it.',
  },
  'zh-Hans': {
    ...COPY['zh-Hans'],
    other: '请找裸对',
    enter: '先排除一个候选数',
    correctDetail: '你找到了有效的裸对排除。',
    incorrectDetail: '再看看你排除的候选数。',
    otherDetail: '找出同一区域中候选数完全相同的两个格子。',
    enterDetail: '先在棋盘上排除一个候选数，再检查答案。',
  },
  ja: {
    ...COPY.ja,
    other: 'ネイキッドペアを探す',
    enter: '先に候補を除外',
    correctDetail: '有効なネイキッドペアの除外です。',
    incorrectDetail: '除外した候補を確認してください。',
    otherDetail: '同じ2候補を持つ2マスを探してください。',
    enterDetail: '盤面で候補を除外してから確認してください。',
  },
  de: {
    ...COPY.de,
    other: 'Finde ein nacktes Paar',
    enter: 'Entferne zuerst einen Kandidaten',
    correctDetail: 'Du hast einen Kandidaten mit einem nackten Paar entfernt.',
    incorrectDetail: 'Prüfe den entfernten Kandidaten.',
    otherDetail: 'Suche zwei Felder mit denselben zwei Kandidaten.',
    enterDetail: 'Entferne zuerst einen Kandidaten im Raster.',
  },
} as const;

const POINTING_COPY = {
  en: {
    ...COPY.en,
    other: 'Find a Pointing elimination',
    enter: 'Remove a candidate first',
    correctDetail: 'You used a box to eliminate a candidate from its line.',
    incorrectDetail: 'Check the candidate you removed.',
    otherDetail: 'Find a digit confined to one row or column inside a box.',
    enterDetail: 'Remove a candidate on the board, then check it.',
  },
  'zh-Hans': {
    ...COPY['zh-Hans'],
    other: '请找指向排除',
    enter: '先排除一个候选数',
    correctDetail: '你利用宫内的限制，完成了有效的排除。',
    incorrectDetail: '再看看你排除的候选数。',
    otherDetail: '找出宫内候选格都位于同一行或列的数字。',
    enterDetail: '先在棋盘上排除一个候选数，再检查答案。',
  },
  ja: {
    ...COPY.ja,
    other: 'ポインティングの除外を探す',
    enter: '先に候補を除外',
    correctDetail: 'ボックスの制約で候補を正しく除外しました。',
    incorrectDetail: '除外した候補を確認してください。',
    otherDetail: 'ボックス内で同じ行か列に限られる候補を探します。',
    enterDetail: '盤面で候補を除外してから確認してください。',
  },
  de: {
    ...COPY.de,
    other: 'Finde eine Zeige-Eliminierung',
    enter: 'Entferne zuerst einen Kandidaten',
    correctDetail:
      'Du hast eine Ziffer durch die Einschränkung im Block entfernt.',
    incorrectDetail: 'Prüfe den entfernten Kandidaten.',
    otherDetail:
      'Suche eine Ziffer, die im Block auf eine Zeile oder Spalte beschränkt ist.',
    enterDetail: 'Entferne zuerst einen Kandidaten im Raster.',
  },
} as const;

const GENERAL_COPY = {
  en: {
    ...COPY.en,
    other: 'Use this technique',
    correctDetail: 'You found a valid step.',
    otherDetail: 'Look for a step using this technique.',
  },
  'zh-Hans': {
    ...COPY['zh-Hans'],
    other: '请用当前技巧解题',
    correctDetail: '你找到了有效的一步。',
    otherDetail: '再找找这项技巧对应的解法。',
  },
  ja: {
    ...COPY.ja,
    other: 'このテクニックを使う',
    correctDetail: '有効な一手です。',
    otherDetail: 'このテクニックを使う手を探してください。',
  },
  de: {
    ...COPY.de,
    other: 'Nutze diese Technik',
    correctDetail: 'Du hast einen gültigen Schritt gefunden.',
    otherDetail: 'Suche einen Schritt mit dieser Technik.',
  },
} as const;

const GENERAL_ELIMINATION_COPY = {
  en: {
    ...GENERAL_COPY.en,
    enter: 'Remove a candidate first',
    incorrectDetail: 'Check the candidate you removed.',
    enterDetail: 'Remove a candidate on the board, then check it.',
  },
  'zh-Hans': {
    ...GENERAL_COPY['zh-Hans'],
    enter: '先排除一个候选数',
    incorrectDetail: '再看看你排除的候选数。',
    enterDetail: '先在棋盘上排除一个候选数，再检查答案。',
  },
  ja: {
    ...GENERAL_COPY.ja,
    enter: '先に候補を除外',
    incorrectDetail: '除外した候補を確認してください。',
    enterDetail: '盤面で候補を除外してから確認してください。',
  },
  de: {
    ...GENERAL_COPY.de,
    enter: 'Entferne zuerst einen Kandidaten',
    incorrectDetail: 'Prüfe den entfernten Kandidaten.',
    enterDetail: 'Entferne zuerst einen Kandidaten im Raster.',
  },
} as const;

type Feedback = 'correct' | 'incorrect' | 'other' | 'enter' | 'unavailable';
const RESPONSE_DURATION_MS = 2500;

export function PracticeBoardExercise({
  scene,
  number,
  preferences = DEFAULT_PRODUCT_PREFERENCES,
  practiceProgress,
  onBack,
  onNext,
  hasNext,
}: {
  scene: PracticeScene;
  number: number;
  preferences?: ProductPreferences;
  practiceProgress?: PracticeProgressStore;
  onBack(): void;
  onNext(): void;
  hasNext: boolean;
}): React.JSX.Element {
  const { locale } = useLocalization();
  const isPair = scene.techniqueCode === 'nakedPair';
  const answerKind = practiceAnswerKind(scene);
  const copy =
    scene.techniqueCode === 'lockedCandidates.pointing'
      ? POINTING_COPY[locale]
      : isPair
      ? PAIR_COPY[locale]
      : scene.techniqueCode === 'hiddenSingle'
      ? COPY[locale]
      : answerKind === 'placement'
      ? GENERAL_COPY[locale]
      : GENERAL_ELIMINATION_COPY[locale];
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const definition = useMemo(() => practiceDefinition(scene), [scene]);
  const [session, setSession] = useState<GameSession>(() =>
    createPracticeGameSession(scene, preferences, Date.now()),
  );
  const moveId = useRef(0);
  const appActive = useRef(
    AppState.currentState !== 'background' &&
      AppState.currentState !== 'inactive',
  );
  const timer = useRef<PracticeTimer | null>(null);
  if (timer.current === null)
    timer.current = new PracticeTimer(Date.now(), appActive.current);
  const completedThisVisit = useRef(false);
  const checkGeneration = useRef(0);
  const pendingCheck = useRef<AbortController | null>(null);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [response, setResponse] = useState<Feedback | null>(null);
  const [proof, setProof] = useState<HintWalkthroughSnapshot | null>(null);
  const [proofTarget, setProofTarget] = useState<CandidateRef | null>(null);
  const [showProof, setShowProof] = useState(false);
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (response === null) return;
    const timeout = setTimeout(() => setResponse(null), RESPONSE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [response]);
  useEffect(
    () => () => {
      checkGeneration.current += 1;
      pendingCheck.current?.abort();
    },
    [],
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      appActive.current = state === 'active';
      timer.current?.setActive(
        appActive.current && pendingCheck.current === null,
        Date.now(),
      );
    });
    return () => subscription.remove();
  }, []);
  const gamePreferences = useMemo<ProductPreferences>(
    () => ({
      ...preferences,
      showTimer: false,
      showMistakes: false,
      showRemainingDigits: false,
      boardColoring: false,
      forcingEnabled: false,
      oneTapFill: false,
      autoFinishMode: 'off',
      multiSelectEnabled: false,
      autoCheckErrors: false,
    }),
    [preferences],
  );
  const snapshot = useMemo(() => practiceGameSnapshot(session), [session]);
  const presentation = useMemo(
    () =>
      proof
        ? buildLessonPresentation(
            proof,
            HINT_PRESENTATION_COPIES[locale],
            proofTarget ?? undefined,
          )
        : null,
    [locale, proof, proofTarget],
  );
  const nextId = () => `practice:${scene.id}:${++moveId.current}`;
  const run = (
    command: GameCommand | ((current: GameSession) => GameCommand),
  ) => {
    if (pendingCheck.current)
      timer.current?.setActive(appActive.current, Date.now());
    checkGeneration.current += 1;
    pendingCheck.current?.abort();
    pendingCheck.current = null;
    setChecking(false);
    setSession(current => {
      const selected =
        typeof command === 'function' ? command(current) : command;
      const result = dispatchGameCommand(current, definition, selected);
      return result.accepted ? result.session : current;
    });
    setFeedback(null);
    setResponse(null);
    setProof(null);
    setProofTarget(null);
  };
  const respond = (result: Feedback) => {
    setFeedback(result);
    setResponse(result);
  };
  const check = async () => {
    if (checking) return;
    const generation = ++checkGeneration.current;
    const controller = new AbortController();
    pendingCheck.current = controller;
    const submittedAt = Date.now();
    timer.current?.setActive(false, submittedAt);
    setChecking(true);
    try {
      const result = await evaluatePractice(scene, session, controller.signal);
      if (controller.signal.aborted || generation !== checkGeneration.current)
        return;
      if (result.status !== 'correct')
        timer.current?.setActive(appActive.current, Date.now());
      if (
        !completedThisVisit.current &&
        result.status !== 'enter' &&
        result.status !== 'unavailable'
      ) {
        const now = submittedAt;
        const attempt =
          result.status === 'correct'
            ? {
                outcome: 'correct' as const,
                durationMs: timer.current!.finish(submittedAt),
              }
            : { outcome: 'incorrect' as const };
        try {
          await practiceProgress?.recordAttempt(
            scene.id,
            practiceContentKey(scene),
            attempt,
            now,
          );
          if (result.status === 'correct') completedThisVisit.current = true;
        } catch {
          // The answer remains valid; a later check can retry saving it.
        }
      }
      if (controller.signal.aborted || generation !== checkGeneration.current)
        return;
      setProof(result.status === 'correct' ? result.proof : null);
      setProofTarget(
        result.status === 'correct' && result.proof.step.eliminations.length
          ? result.target ?? null
          : null,
      );
      respond(result.status);
    } catch {
      if (
        !controller.signal.aborted &&
        generation === checkGeneration.current
      ) {
        timer.current?.setActive(appActive.current, Date.now());
        respond('unavailable');
      }
    } finally {
      if (generation === checkGeneration.current) {
        pendingCheck.current = null;
        setChecking(false);
      }
    }
  };
  if (showProof && proof && presentation) {
    return (
      <HintWalkthroughPlayer
        snapshot={proof}
        presentation={presentation}
        pageIndex={page}
        onPageChange={setPage}
        labels={{
          step: copy.step,
          back: copy.previous,
          next: copy.next,
          restart: copy.restart,
        }}
        renderFooter={() => (
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowProof(false)}
              style={styles.footerButton}
              testID="practice-board-proof-back"
            >
              <Text style={styles.footerText}>{copy.board}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onBack}
              style={styles.footerButton}
              testID="practice-board-proof-continue"
            >
              <Text style={styles.footerText}>{copy.done}</Text>
            </Pressable>
          </View>
        )}
        testID="practice-board-proof"
      />
    );
  }
  const hasAnswer = hasPracticeAnswer(scene, session);
  return (
    <View style={styles.game} testID="practice-board-exercise">
      <GameScreen
        snapshot={snapshot}
        preferences={gamePreferences}
        premium
        onBack={onBack}
        onPause={() => {}}
        onResume={() => {}}
        onAbandon={onBack}
        onSelectCell={cell =>
          run({ type: 'select_cell', cell, atEpochMs: Date.now() })
        }
        onOneTapFill={() => {}}
        onDigit={digit =>
          run({
            type: 'input_digit',
            digit,
            moveId: nextId(),
            atEpochMs: Date.now(),
          })
        }
        onEditCandidates={(cells, digits, action) => {
          const id = nextId();
          run(current => ({
            type: 'edit_candidates',
            cells,
            candidates: digits,
            action,
            source: current.state.candidates.activeCandidateSource,
            moveId: id,
            atEpochMs: Date.now(),
          }));
        }}
        onUndo={() => run({ type: 'undo', atEpochMs: Date.now() })}
        onErase={() =>
          run({ type: 'erase', moveId: nextId(), atEpochMs: Date.now() })
        }
        onQuickPencil={() => {
          const id = nextId();
          run(current => {
            const candidates = current.state.candidates;
            if (candidates.activeCandidateSource === 'quick')
              return {
                type: 'set_candidate_source',
                source: 'manual',
                atEpochMs: Date.now(),
              };
            if (candidates.quickDraftGenerated)
              return {
                type: 'set_candidate_source',
                source: 'quick',
                atEpochMs: Date.now(),
              };
            return {
              type: 'generate_quick_draft',
              confirmed: false,
              moveId: id,
              availableCredits: 0,
              premium: true,
              atEpochMs: Date.now(),
            };
          });
        }}
        onRegenerateQuickPencil={
          practiceInitialCandidates(scene) === 'verified'
            ? undefined
            : () =>
                run({
                  type: 'generate_quick_draft',
                  confirmed: true,
                  moveId: nextId(),
                  availableCredits: 0,
                  premium: true,
                  atEpochMs: Date.now(),
                })
        }
        onPencil={() =>
          run(current => ({
            type: 'set_pencil_mode',
            enabled: !current.state.candidates.pencilMode,
            atEpochMs: Date.now(),
          }))
        }
        onHint={() => {}}
        onApplyHint={() => {}}
        onDismissHint={() => {}}
        practice={{
          title: `${
            HINT_PRESENTATION_COPIES[locale].techniques[scene.techniqueCode]
              .name
          } · ${number}`,
          backLabel: copy.back,
          actionLabel: checking
            ? copy.checking
            : feedback === 'correct'
            ? copy.proof
            : copy.check,
          actionDisabled: checking || (feedback !== 'correct' && !hasAnswer),
          actionKind: feedback === 'correct' ? 'explain' : 'check',
          next:
            feedback === 'correct'
              ? {
                  label: hasNext ? copy.nextExercise : copy.returnToExercises,
                  onPress: onNext,
                }
              : undefined,
          onAction: () => {
            if (feedback === 'correct') {
              setResponse(null);
              setPage(0);
              setShowProof(true);
            } else return check();
          },
        }}
      />
      {response ? (
        <View style={styles.responseLayer} testID="practice-result-overlay">
          <Pressable
            accessibilityLabel={copy[response]}
            accessibilityRole="button"
            onPress={() => setResponse(null)}
            style={styles.responseBackdrop}
            testID="practice-result-dismiss"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityViewIsModal
            onPress={() => setResponse(null)}
            style={styles.responseCard}
            testID="practice-result-card"
          >
            <View
              style={[
                styles.responseBadge,
                response === 'correct'
                  ? styles.correctBadge
                  : styles.retryBadge,
              ]}
            >
              <AppIcon
                name={response === 'correct' ? 'check' : 'refresh'}
                color={response === 'correct' ? palette.accent : palette.error}
                size={30}
              />
            </View>
            <Text accessibilityRole="header" style={styles.responseTitle}>
              {copy[response]}
            </Text>
            <Text style={styles.responseDetail}>
              {copy[`${response}Detail`]}
            </Text>
            {response === 'correct' ? (
              <Pressable
                accessibilityRole="button"
                onPress={event => {
                  event?.stopPropagation();
                  onNext();
                }}
                style={styles.responseNext}
                testID="practice-result-next"
              >
                <Text style={styles.responseNextText}>
                  {hasNext ? copy.nextExercise : copy.returnToExercises}
                </Text>
                <AppIcon name="forward" color={palette.accent} size={18} />
              </Pressable>
            ) : null}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    game: { flex: 1, backgroundColor: palette.background },
    footer: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
    footerButton: {
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    footerText: { color: palette.ink, fontSize: 15, fontWeight: '600' },
    responseLayer: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
      elevation: 10,
    },
    responseBackdrop: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(13, 24, 20, 0.34)',
    },
    responseCard: {
      alignItems: 'center',
      backgroundColor: palette.panelSurface,
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 20,
      gap: 10,
      maxWidth: 340,
      paddingHorizontal: 24,
      paddingVertical: 24,
      width: '82%',
    },
    responseBadge: {
      alignItems: 'center',
      borderRadius: 28,
      height: 56,
      justifyContent: 'center',
      width: 56,
    },
    correctBadge: { backgroundColor: palette.accentSoft },
    retryBadge: { backgroundColor: palette.errorSoft },
    responseTitle: { color: palette.ink, fontSize: 22, fontWeight: '700' },
    responseDetail: {
      color: palette.muted,
      fontSize: 15,
      lineHeight: 21,
      textAlign: 'center',
    },
    responseNext: {
      alignItems: 'center',
      backgroundColor: palette.accentSoft,
      borderRadius: 12,
      flexDirection: 'row',
      gap: 8,
      marginTop: 6,
      paddingHorizontal: 18,
      paddingVertical: 11,
    },
    responseNextText: {
      color: palette.accent,
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
