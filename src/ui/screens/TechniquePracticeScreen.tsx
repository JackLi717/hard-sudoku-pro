import React, { useMemo, useState } from 'react';
import type { ProductPreferences } from '../../application/app/product-preferences';
import type { PracticeProgressStore } from '../../domain/practice/progress';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { buildLessonPresentation } from '../../domain/lessons/presentation';
import { validatePracticeAnswer } from '../../domain/practice/validate-answer';
import {
  boxOf,
  columnOf,
  createBoardFingerprint,
  hasCandidate,
  rowOf,
} from '../../domain/sudoku/board';
import type { Digit, RegionRef } from '../../domain/sudoku/contracts';
import type { TechniqueCode } from '../../domain/hints/techniques';
import {
  practiceContentKey,
  practiceReferenceSnapshot,
  type PracticeRepository,
} from '../../data/practice/practice-catalog';
import { HINT_PRESENTATION_COPIES, useLocalization } from '../../localization';
import { HintWalkthroughPlayer } from '../components/HintWalkthroughPlayer';
import { SudokuBoard, type SudokuBoardState } from '../components/SudokuBoard';
import { AppPalette, useAppTheme } from '../theme';
import { HiddenSinglePracticeScreen } from './HiddenSinglePracticeScreen';

const WORDS = {
  en: {
    demo: 'See it on a real board',
    start: 'Start practice',
    next: 'Next exercise',
    stepNext: 'Next',
    finish: 'Practice complete',
    retry: 'Try again',
    proof: 'Show explanation',
    check: 'Check answer',
    source: 'Select the two pair cells',
    target: 'Select a cell, then a digit to remove',
    single: 'Select the only cell, its region and digit',
    choose: 'Choose a region',
    row: 'Row',
    column: 'Column',
    box: 'Box',
    correct: 'Exactly. You found a valid deduction.',
    singleEvidence: 'That digit has more than one place in this region.',
    pairEvidence:
      'The two cells must share a region and contain the same two candidates.',
    singleTarget: 'Choose an empty cell and one of its candidates.',
    pairTarget: 'Remove a pair digit from another cell in the same region.',
    progress: 'Exercise',
    of: 'of {count}',
    continue: 'Choose the result',
    back: 'Back',
    step: 'Step',
    restart: 'Restart',
  },
  'zh-Hans': {
    demo: '先看真实盘面示范',
    start: '开始练习',
    next: '下一题',
    stepNext: '下一步',
    finish: '练习完成',
    retry: '再试一次',
    proof: '查看讲解',
    check: '验证答案',
    source: '先选出数对所在的两个格子',
    target: '选要排除的格子，再选候选数',
    single: '选唯一位置、所在区域和数字',
    choose: '选择区域',
    row: '行',
    column: '列',
    box: '宫',
    correct: '正确，找到了有效的推理。',
    singleEvidence: '这个数字在所选区域里不止一个可填位置。',
    pairEvidence: '两格要在同一区域，且都只含相同的两个候选数。',
    singleTarget: '选择空格及其中的一个候选数。',
    pairTarget: '从同一区域的其他格中排除数对里的数字。',
    progress: '第',
    of: '题 / 共 {count} 题',
    continue: '选择排除目标',
    back: '上一步',
    step: '步骤',
    restart: '重看',
  },
  ja: {
    demo: '実際の盤面で見る',
    start: '練習を始める',
    next: '次の問題',
    stepNext: '次へ',
    finish: '練習完了',
    retry: 'もう一度',
    proof: '解説を見る',
    check: '答えを確認',
    source: 'ペアの2マスを選ぶ',
    target: '除外するマスと候補を選ぶ',
    single: '唯一のマス、領域、数字を選ぶ',
    choose: '領域を選ぶ',
    row: '行',
    column: '列',
    box: 'ブロック',
    correct: '正解です。',
    singleEvidence: 'この領域では、その数字を置けるマスが複数あります。',
    pairEvidence: '同じ領域で、候補が同じ2数字の2マスを選んでください。',
    singleTarget: '空きマスとその候補を選んでください。',
    pairTarget: '同じ領域の別のマスからペアの数字を除外してください。',
    progress: '問題',
    of: '/ {count}',
    continue: '結果を選ぶ',
    back: '戻る',
    step: 'ステップ',
    restart: '最初から',
  },
  de: {
    demo: 'Am echten Raster ansehen',
    start: 'Üben',
    next: 'Nächste Aufgabe',
    stepNext: 'Weiter',
    finish: 'Übung abgeschlossen',
    retry: 'Erneut versuchen',
    proof: 'Erklärung ansehen',
    check: 'Antwort prüfen',
    source: 'Wähle die zwei Paarfelder',
    target: 'Wähle Feld und Kandidat zum Entfernen',
    single: 'Wähle einziges Feld, Bereich und Ziffer',
    choose: 'Bereich wählen',
    row: 'Zeile',
    column: 'Spalte',
    box: 'Block',
    correct: 'Richtig. Das ist ein gültiger Schluss.',
    singleEvidence:
      'Diese Ziffer hat im gewählten Bereich mehr als einen Platz.',
    pairEvidence:
      'Beide Felder müssen im selben Bereich dieselben zwei Kandidaten haben.',
    singleTarget: 'Wähle ein leeres Feld und einen seiner Kandidaten.',
    pairTarget:
      'Entferne eine Paarziffer aus einem anderen Feld desselben Bereichs.',
    progress: 'Aufgabe',
    of: 'von {count}',
    continue: 'Ergebnis wählen',
    back: 'Zurück',
    step: 'Schritt',
    restart: 'Neustart',
  },
} as const;

function cellLabel(cell: number): string {
  return `r${rowOf(cell) + 1}c${columnOf(cell) + 1}`;
}

function regionAt(cell: number, kind: RegionRef['kind']): RegionRef {
  return {
    kind,
    index:
      kind === 'row'
        ? rowOf(cell)
        : kind === 'column'
        ? columnOf(cell)
        : boxOf(cell),
  };
}

export function TechniquePracticeScreen({
  technique,
  onClose,
  preferences,
  practiceProgress,
  practiceRepository,
}: {
  technique: TechniqueCode;
  onClose(): void;
  preferences?: ProductPreferences;
  practiceProgress?: PracticeProgressStore;
  practiceRepository: PracticeRepository;
}): React.JSX.Element {
  return technique === 'hiddenSingle' ? (
    <HiddenSinglePracticeScreen
      onClose={onClose}
      preferences={preferences}
      practiceProgress={practiceProgress}
      practiceRepository={practiceRepository}
    />
  ) : (
    <LegacyTechniquePracticeScreen
      technique={technique}
      onClose={onClose}
      practiceProgress={practiceProgress}
      practiceRepository={practiceRepository}
    />
  );
}

function LegacyTechniquePracticeScreen({
  technique,
  onClose,
  practiceProgress,
  practiceRepository,
}: {
  technique: TechniqueCode;
  onClose(): void;
  practiceProgress?: PracticeProgressStore;
  practiceRepository: PracticeRepository;
}): React.JSX.Element {
  const scenes = practiceRepository.list(technique);
  const { locale } = useLocalization();
  const words = WORDS[locale];
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [analysis, setAnalysis] = useState(false);
  const [sources, setSources] = useState<number[]>([]);
  const [targetCell, setTargetCell] = useState<number | null>(null);
  const [digit, setDigit] = useState<Digit | null>(null);
  const [regionKind, setRegionKind] = useState<RegionRef['kind']>('row');
  const [phase, setPhase] = useState<'evidence' | 'target'>('evidence');
  const [feedback, setFeedback] = useState<
    'correct' | 'evidence' | 'target' | null
  >(null);
  const scene = scenes[index];
  const snapshot = practiceReferenceSnapshot(scene);
  const isPair = technique === 'nakedPair';
  const showingProof = index === 0 || analysis;
  const presentation = useMemo(
    () =>
      showingProof
        ? buildLessonPresentation(snapshot, HINT_PRESENTATION_COPIES[locale])
        : null,
    [locale, showingProof, snapshot],
  );
  const boardState: SudokuBoardState = useMemo(() => {
    const fingerprint = createBoardFingerprint(snapshot.values);
    return {
      values: snapshot.values,
      givens: snapshot.givens,
      selectedCell: targetCell ?? sources.at(-1) ?? null,
      incorrectCells: [],
      annotations: [],
      status: 'active',
      activeHint: null,
      candidates: {
        manualCandidates: [...snapshot.candidateMasks],
        quickCandidates: [...snapshot.candidateMasks],
        hintCandidates: [...snapshot.candidateMasks],
        hintCandidateOrigin: 'quick',
        appliedHintSteps: [],
        inferenceEliminations: [],
        activeCandidateSource: 'quick',
        pencilMode: false,
        quickDraftGenerated: true,
        quickDraftBoardFingerprint: fingerprint,
        hintBoardFingerprint: fingerprint,
      },
    };
  }, [snapshot, targetCell, sources]);
  const resetSelection = () => {
    setSources([]);
    setTargetCell(null);
    setDigit(null);
    setRegionKind('row');
    setPhase('evidence');
    setFeedback(null);
    setAnalysis(false);
    setPage(0);
  };
  const next = () => {
    resetSelection();
    setIndex(current => current + 1);
  };
  const onCell = (cell: number) => {
    setFeedback(null);
    if (snapshot.values[cell] !== null) return;
    if (isPair && phase === 'evidence') {
      setSources(current =>
        current.includes(cell)
          ? current.filter(value => value !== cell)
          : [...current.slice(-1), cell],
      );
    } else {
      setTargetCell(cell);
      setDigit(null);
    }
  };
  const anchor = isPair ? sources[0] : targetCell;
  const region =
    anchor === undefined || anchor === null
      ? null
      : regionAt(anchor, regionKind);
  const check = () => {
    if (region === null || targetCell === null || digit === null) return;
    const result = validatePracticeAnswer(snapshot, {
      region,
      sources,
      target: { cell: targetCell, digit },
    });
    setFeedback(result);
    practiceProgress
      ?.recordAttempt(
        scene.id,
        practiceContentKey(scene),
        result === 'correct' ? 'correct' : 'incorrect',
        Date.now(),
      )
      .catch(() => undefined);
  };
  const action = (
    label: string,
    onPress: () => void,
    disabled = false,
    outline = false,
    testID?: string,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.action,
        outline && styles.outline,
        disabled && styles.disabled,
      ]}
      testID={testID}
    >
      <Text style={[styles.actionText, outline && styles.outlineText]}>
        {label}
      </Text>
    </Pressable>
  );
  if (!scene) return <View style={styles.screen} />;
  return (
    <View style={styles.screen} testID="practice-screen">
      <View style={styles.header}>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          testID="practice-back"
        >
          <Text style={styles.back}>← {words.back}</Text>
        </Pressable>
        <Text style={styles.title}>
          {HINT_PRESENTATION_COPIES[locale].techniques[technique].name}
        </Text>
      </View>
      {showingProof && presentation ? (
        <HintWalkthroughPlayer
          key={scene.id}
          snapshot={snapshot}
          presentation={presentation}
          pageIndex={page}
          onPageChange={setPage}
          labels={{
            step: words.step,
            back: words.back,
            next: words.stepNext,
            restart: words.restart,
          }}
          renderHeader={() => (
            <Text style={styles.prompt}>
              {index === 0 ? words.demo : words.proof}
            </Text>
          )}
          renderFooter={() => (
            <View style={styles.footer}>
              {index === 0
                ? action(words.start, next, false, false, 'practice-start')
                : action(
                    feedback === 'correct'
                      ? index < scenes.length - 1
                        ? words.next
                        : words.finish
                      : words.retry,
                    () => {
                      if (feedback === 'correct') {
                        if (index < scenes.length - 1) next();
                        else onClose();
                      } else {
                        setAnalysis(false);
                        setPage(0);
                      }
                    },
                    false,
                    false,
                    'practice-proof-continue',
                  )}
            </View>
          )}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          testID="practice-exercise"
        >
          <Text style={styles.progress}>
            {words.progress} {index}{' '}
            {words.of.replace('{count}', String(scenes.length - 1))}
          </Text>
          <Text style={styles.prompt}>
            {isPair
              ? phase === 'evidence'
                ? words.source
                : words.target
              : words.single}
          </Text>
          <View style={styles.board}>
            <SudokuBoard
              state={boardState}
              maxSize={Math.min(width - 32, height * 0.47, 520)}
              onSelectCell={onCell}
              selectedCells={isPair && phase === 'evidence' ? sources : []}
              highlightRegions={false}
              highlightSameDigit={false}
            />
          </View>
          {isPair && sources.length > 0 ? (
            <Text style={styles.selection}>
              {sources.map(cellLabel).join(' · ')}
            </Text>
          ) : null}
          {isPair && phase === 'evidence' ? (
            action(
              words.continue,
              () => {
                setPhase('target');
                setFeedback(null);
              },
              sources.length !== 2,
              false,
              'practice-pair-continue',
            )
          ) : (
            <>
              {anchor !== null && anchor !== undefined ? (
                <View>
                  <Text style={styles.label}>{words.choose}</Text>
                  <View style={styles.choices}>
                    {(['row', 'column', 'box'] as const).map(kind => (
                      <Pressable
                        key={kind}
                        onPress={() => {
                          setRegionKind(kind);
                          setFeedback(null);
                        }}
                        style={[
                          styles.chip,
                          regionKind === kind && styles.selectedChip,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: regionKind === kind }}
                        testID={`practice-region-${kind}`}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            regionKind === kind && styles.selectedChipText,
                          ]}
                        >
                          {words[kind]} {regionAt(anchor, kind).index + 1}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
              {targetCell !== null ? (
                <View style={styles.choices}>
                  {([1, 2, 3, 4, 5, 6, 7, 8, 9] as Digit[])
                    .filter(value =>
                      hasCandidate(snapshot.candidateMasks[targetCell], value),
                    )
                    .map(value => (
                      <Pressable
                        key={value}
                        onPress={() => {
                          setDigit(value);
                          setFeedback(null);
                        }}
                        style={[
                          styles.digit,
                          digit === value && styles.selectedChip,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: digit === value }}
                        testID={`practice-digit-${value}`}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            digit === value && styles.selectedChipText,
                          ]}
                        >
                          {value}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              ) : null}
              {action(
                words.check,
                check,
                targetCell === null || digit === null,
                false,
                'practice-check',
              )}
            </>
          )}
          {feedback ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                styles.feedback,
                feedback === 'correct' && styles.correct,
              ]}
              testID="practice-feedback"
            >
              {feedback === 'correct'
                ? words.correct
                : feedback === 'evidence'
                ? isPair
                  ? words.pairEvidence
                  : words.singleEvidence
                : isPair
                ? words.pairTarget
                : words.singleTarget}
            </Text>
          ) : null}
          {feedback === 'correct'
            ? index < scenes.length - 1
              ? action(words.next, next, false, false, 'practice-next')
              : action(words.finish, onClose, false, false, 'practice-finish')
            : null}
          {action(
            words.proof,
            () => {
              setPage(0);
              setAnalysis(true);
            },
            false,
            true,
            'practice-show-proof',
          )}
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.background },
    header: { paddingHorizontal: 20, paddingVertical: 12, gap: 12 },
    back: { color: palette.accent, fontSize: 15, fontWeight: '700' },
    title: { color: palette.ink, fontSize: 22, fontWeight: '700' },
    content: {
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingBottom: 30,
      gap: 12,
    },
    progress: { color: palette.muted, fontSize: 14, alignSelf: 'flex-start' },
    prompt: {
      color: palette.ink,
      fontSize: 17,
      fontWeight: '600',
      alignSelf: 'flex-start',
      marginHorizontal: 16,
      marginVertical: 8,
    },
    board: { alignItems: 'center', width: '100%' },
    selection: { color: palette.accent, fontSize: 15 },
    label: { color: palette.muted, fontSize: 13, marginBottom: 8 },
    choices: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 7,
    },
    chip: {
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 9,
      paddingHorizontal: 13,
      paddingVertical: 9,
      backgroundColor: palette.panelSurface,
    },
    selectedChip: {
      borderColor: palette.accent,
      backgroundColor: palette.accentSoft,
    },
    chipText: { color: palette.ink, fontSize: 15, fontWeight: '600' },
    selectedChipText: { color: palette.accent },
    digit: {
      borderColor: palette.panelBorder,
      borderWidth: 1,
      borderRadius: 9,
      minWidth: 39,
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.panelSurface,
    },
    action: {
      minHeight: 45,
      minWidth: 200,
      borderRadius: 12,
      backgroundColor: palette.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
      marginTop: 4,
    },
    actionText: { color: palette.background, fontSize: 15, fontWeight: '700' },
    outline: {
      borderWidth: 1,
      borderColor: palette.panelBorder,
      backgroundColor: palette.panelSurface,
    },
    outlineText: { color: palette.accent },
    disabled: { opacity: 0.45 },
    feedback: { color: palette.ink, fontSize: 15, textAlign: 'center' },
    correct: { color: palette.accent },
    footer: { padding: 16, alignItems: 'center' },
  });
}
