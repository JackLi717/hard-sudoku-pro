import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  practiceContentKey,
  practiceReferenceSnapshot,
  type PracticeScene,
} from '../../data/practice/practice-catalog';
import type { GameCommand, GameSession } from '../../domain/game/contracts';
import { dispatchGameCommand } from '../../domain/game/engine';
import type { HintWalkthroughSnapshot } from '../../domain/hints/walkthrough';
import { buildLessonPresentation } from '../../domain/lessons/presentation';
import { submitHiddenSingle } from '../../domain/practice/hidden-single-submission';
import type { PracticeProgressStore } from '../../domain/practice/progress';
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

type Feedback = 'correct' | 'incorrect' | 'other' | 'enter';
const RESPONSE_DURATION_MS = 2500;

export function HiddenSingleBoardExercise({
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
  const copy = COPY[locale];
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const definition = useMemo(() => practiceDefinition(scene), [scene]);
  const reference = useMemo(() => practiceReferenceSnapshot(scene), [scene]);
  const [session, setSession] = useState<GameSession>(() =>
    createPracticeGameSession(scene, preferences, Date.now()),
  );
  const moveId = useRef(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [response, setResponse] = useState<Feedback | null>(null);
  const [proof, setProof] = useState<HintWalkthroughSnapshot | null>(null);
  const [showProof, setShowProof] = useState(false);
  const [page, setPage] = useState(0);
  useEffect(() => {
    if (response === null) return;
    const timeout = setTimeout(() => setResponse(null), RESPONSE_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [response]);
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
        ? buildLessonPresentation(proof, HINT_PRESENTATION_COPIES[locale])
        : null,
    [locale, proof],
  );
  const nextId = () => `practice:${scene.id}:${++moveId.current}`;
  const run = (
    command: GameCommand | ((current: GameSession) => GameCommand),
  ) => {
    setSession(current => {
      const selected =
        typeof command === 'function' ? command(current) : command;
      const result = dispatchGameCommand(current, definition, selected);
      return result.accepted ? result.session : current;
    });
    setFeedback(null);
    setResponse(null);
    setProof(null);
  };
  const respond = (result: Feedback) => {
    setFeedback(result);
    setResponse(result);
  };
  const check = () => {
    const last = [...session.history]
      .reverse()
      .find(move =>
        move.kind === 'place_value' && move.cell !== null
          ? session.state.values[move.cell] === move.digit
          : false,
      );
    if (!last || last.cell === null || last.digit === null) {
      respond('enter');
      return;
    }
    const beforeValues = [...last.before.values];
    beforeValues[last.cell] = null;
    const result = submitHiddenSingle(
      reference,
      scene.board.solutionFingerprint,
      beforeValues,
      { cell: last.cell, digit: last.digit },
    );
    practiceProgress
      ?.recordAttempt(
        scene.id,
        practiceContentKey(scene),
        result.status === 'correct' ? 'correct' : 'incorrect',
        Date.now(),
      )
      .catch(() => undefined);
    if (result.status === 'correct') {
      setProof(result.proof);
      respond('correct');
    } else {
      setProof(null);
      respond(result.status === 'incorrect' ? 'incorrect' : 'other');
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
  const lastPlacement = session.history.some(
    move => move.kind === 'place_value',
  );
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
        onRegenerateQuickPencil={() =>
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
          title: `${HINT_PRESENTATION_COPIES[locale].techniques.hiddenSingle.name} · ${number}`,
          backLabel: copy.back,
          actionLabel: feedback === 'correct' ? copy.proof : copy.check,
          actionDisabled: feedback !== 'correct' && !lastPlacement,
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
            } else check();
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
