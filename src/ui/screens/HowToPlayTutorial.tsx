import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ProductPreferences } from '../../application';
import type { HintPageVisuals } from '../../domain/hints/presentation';
import { addCandidate, removeCandidate } from '../../domain/sudoku/board';
import type {
  Board,
  CandidateGrid,
  CellIndex,
  CellValue,
  Digit,
} from '../../domain/sudoku/contracts';
import { useLocalization } from '../../localization';
import { SudokuBoard } from '../components/SudokuBoard';
import { AppPalette, useAppTheme } from '../theme';
import { useReducedMotion } from '../use-reduced-motion';

type TutorialProps = {
  initialProgress: number;
  onBack(): void;
  onComplete(): void;
  onProgress(progress: number): void;
  onStartLevelOne?(): void;
};

type TutorialStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

const FIRST_CELL = 2;
const NOTES_CELL = 10;
const EMPTY_CANDIDATES: CandidateGrid = Array.from({ length: 81 }, () => 0);
const SOLUTION: readonly Digit[] = [
  5, 3, 4, 6, 7, 8, 9, 1, 2, 6, 7, 2, 1, 9, 5, 3, 4, 8, 1, 9, 8, 3, 4, 2, 5, 6,
  7, 8, 5, 9, 7, 6, 1, 4, 2, 3, 4, 2, 6, 8, 5, 3, 7, 9, 1, 7, 1, 3, 9, 2, 4, 8,
  5, 6, 9, 6, 1, 5, 3, 7, 2, 8, 4, 2, 8, 7, 4, 1, 9, 6, 3, 5, 3, 4, 5, 2, 8, 6,
  1, 7, 9,
];
const INITIAL_VALUES: Board = SOLUTION.map((value, cell) =>
  cell === FIRST_CELL || cell === NOTES_CELL ? null : value,
);

const STEP_KEYS = [
  'help.tutorial.step.select',
  'help.tutorial.step.enter4',
  'help.tutorial.step.selectNotes',
  'help.tutorial.step.pencilOn',
  'help.tutorial.step.add2',
  'help.tutorial.step.add7',
  'help.tutorial.step.remove2',
  'help.tutorial.step.pencilOff',
  'help.tutorial.step.place7',
  'help.tutorial.step.undo',
  'help.tutorial.step.finish',
] as const;

function lessonForStep(step: TutorialStep): number {
  if (step === 0) return 1;
  if (step === 1) return 2;
  if (step <= 7) return 3;
  if (step === 8) return 4;
  if (step === 9) return 5;
  return 6;
}

function targetCellForStep(step: TutorialStep): CellIndex | null {
  if (step <= 1) return FIRST_CELL;
  if (step <= 10) return NOTES_CELL;
  return null;
}

function tutorialVisuals(step: TutorialStep): HintPageVisuals | undefined {
  const target = targetCellForStep(step);
  if (target === null) return undefined;
  return {
    focusCells: [target],
    focusRegions:
      step === 0
        ? [
            { kind: 'row', index: 0 },
            { kind: 'column', index: 2 },
            { kind: 'box', index: 0 },
          ]
        : undefined,
    questionCells: step === 0 || step === 2 ? [target] : undefined,
    showEliminations: false,
    showFocusCells: true,
    showFocusRegions: step === 0,
    showPlacements: false,
    showPremises: false,
    spotlightCells: step === 0 ? undefined : [target],
  };
}

function clampProgress(progress: number): TutorialStep {
  const step = Math.max(0, Math.min(10, progress - 1));
  return step as TutorialStep;
}

function valuesAtStep(step: TutorialStep): Board {
  return INITIAL_VALUES.map((value, cell) => {
    if (cell === FIRST_CELL && step >= 2) return 4;
    if (cell === NOTES_CELL && (step === 9 || step === 11)) return 7;
    return value;
  });
}

function candidatesAtStep(step: TutorialStep): CandidateGrid {
  let mask = 0;
  if (step === 5) mask = addCandidate(mask, 2);
  if (step === 6) mask = addCandidate(addCandidate(mask, 2), 7);
  if (step === 7 || step === 8 || step === 10) mask = addCandidate(mask, 7);
  return EMPTY_CANDIDATES.map((value, cell) =>
    cell === NOTES_CELL ? mask : value,
  );
}

export function HowToPlayTutorial({
  initialProgress,
  onBack,
  onComplete,
  onProgress,
  onStartLevelOne,
}: TutorialProps): React.JSX.Element {
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const reduceMotion = useReducedMotion();
  const initialStep = clampProgress(initialProgress);
  const [step, setStep] = useState<TutorialStep>(initialStep);
  const [values, setValues] = useState<Board>(() => valuesAtStep(initialStep));
  const [selectedCell, setSelectedCell] = useState<CellIndex | null>(() =>
    initialStep === 0 ? null : initialStep <= 1 ? FIRST_CELL : NOTES_CELL,
  );
  const [manualCandidates, setManualCandidates] = useState<CandidateGrid>(() =>
    candidatesAtStep(initialStep),
  );
  const [pencilMode, setPencilMode] = useState(
    initialStep >= 4 && initialStep <= 7,
  );
  const [transitioning, setTransitioning] = useState(false);
  const [wrongAction, setWrongAction] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const instructionScale = useRef(new Animated.Value(1)).current;
  const instructionX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion || step === 11) {
      pulse.setValue(1);
      return;
    }
    pulse.setValue(0);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reduceMotion, step]);

  const advance = (nextStep: TutorialStep, update?: () => void) => {
    if (transitioning) return;
    update?.();
    setWrongAction(false);
    setTransitioning(true);
    AccessibilityInfo.announceForAccessibility(t('help.tutorial.good'));
    const finish = () => {
      setStep(nextStep);
      setTransitioning(false);
      if (nextStep <= 10) onProgress(nextStep + 1);
      if (nextStep === 11) onComplete();
    };
    if (reduceMotion) {
      finish();
      return;
    }
    Animated.sequence([
      Animated.timing(instructionScale, {
        duration: 120,
        toValue: 1.035,
        useNativeDriver: true,
      }),
      Animated.timing(instructionScale, {
        duration: 180,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) finish();
      else setTransitioning(false);
    });
  };

  const reject = () => {
    if (transitioning) return;
    setWrongAction(true);
    AccessibilityInfo.announceForAccessibility(t('help.tutorial.wrong'));
    if (reduceMotion) return;
    instructionX.setValue(0);
    Animated.sequence(
      [-7, 7, -4, 4, 0].map(toValue =>
        Animated.timing(instructionX, {
          duration: 55,
          toValue,
          useNativeDriver: true,
        }),
      ),
    ).start();
  };

  const setValue = (cell: CellIndex, value: CellValue) =>
    setValues(current =>
      current.map((existing, index) => (index === cell ? value : existing)),
    );
  const setCandidate = (digit: Digit, present: boolean) =>
    setManualCandidates(current =>
      current.map((mask, cell) =>
        cell === NOTES_CELL
          ? present
            ? addCandidate(mask, digit)
            : removeCandidate(mask, digit)
          : mask,
      ),
    );

  const selectCell = (cell: CellIndex) => {
    if (step === 0 && cell === FIRST_CELL) {
      advance(1, () => setSelectedCell(cell));
    } else if (step === 2 && cell === NOTES_CELL) {
      advance(3, () => setSelectedCell(cell));
    } else {
      reject();
    }
  };

  const enterDigit = (digit: Digit) => {
    if (step === 1 && digit === 4) {
      advance(2, () => setValue(FIRST_CELL, 4));
    } else if (step === 4 && digit === 2) {
      advance(5, () => setCandidate(2, true));
    } else if (step === 5 && digit === 7) {
      advance(6, () => setCandidate(7, true));
    } else if (step === 6 && digit === 2) {
      advance(7, () => setCandidate(2, false));
    } else if (step === 8 && digit === 7) {
      advance(9, () => {
        setValue(NOTES_CELL, 7);
        setCandidate(7, false);
      });
    } else if (step === 10 && digit === 7) {
      advance(11, () => {
        setValue(NOTES_CELL, 7);
        setCandidate(7, false);
      });
    } else {
      reject();
    }
  };

  const togglePencil = () => {
    if (step === 3) {
      advance(4, () => setPencilMode(true));
    } else if (step === 7) {
      advance(8, () => setPencilMode(false));
    } else {
      reject();
    }
  };

  const undo = () => {
    if (step === 9) {
      advance(10, () => {
        setValue(NOTES_CELL, null);
        setCandidate(7, true);
      });
    } else {
      reject();
    }
  };

  const targetScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });
  const boardState = {
    activeHint: null,
    candidates: {
      activeCandidateSource: 'manual' as const,
      hintBoardFingerprint: null,
      hintCandidates: null,
      manualCandidates,
      pencilMode,
      quickCandidates: EMPTY_CANDIDATES,
      quickDraftBoardFingerprint: null,
      quickDraftGenerated: false,
    },
    givens: INITIAL_VALUES,
    incorrectCells: [],
    selectedCell,
    status: step === 11 ? ('completed' as const) : ('active' as const),
    values,
  };
  const expectedDigit =
    step === 1 ? 4 : [4, 5, 6].includes(step) ? (step === 5 ? 7 : 2) : 7;
  const expectsDigit = [1, 4, 5, 6, 8, 10].includes(step);
  const expectsPencil = step === 3 || step === 7;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onBack}>
          <Text style={styles.back}>‹ {t('app.back')}</Text>
        </Pressable>
        {step < 11 ? (
          <Text style={styles.progress}>
            {t('help.tutorial.progress', {
              current: lessonForStep(step),
              total: 6,
            })}
          </Text>
        ) : null}
        <Pressable accessibilityRole="button" onPress={onBack}>
          <Text style={styles.skip}>{t('help.tutorial.skip')}</Text>
        </Pressable>
      </View>

      {step === 11 ? (
        <View style={styles.complete} testID="how-to-play-complete">
          <Text style={styles.completeMark}>✓</Text>
          <Text accessibilityRole="header" style={styles.completeTitle}>
            {t('help.tutorial.complete.title')}
          </Text>
          <Text style={styles.completeBody}>
            {t('help.tutorial.complete.body')}
          </Text>
          {onStartLevelOne ? (
            <Pressable
              accessibilityRole="button"
              onPress={onStartLevelOne}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>
                {t('help.tutorial.complete.startLevel')}
              </Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={onBack}>
            <Text style={styles.homeAction}>
              {t('help.tutorial.complete.home')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            accessibilityLiveRegion="polite"
            style={[
              styles.instructionCard,
              wrongAction && styles.instructionCardWrong,
              {
                transform: [
                  { translateX: instructionX },
                  { scale: instructionScale },
                ],
              },
            ]}
          >
            <Animated.Text
              style={[styles.pointer, { transform: [{ scale: targetScale }] }]}
            >
              ☝︎
            </Animated.Text>
            <View style={styles.instructionCopy}>
              <Text style={styles.lessonLabel}>
                {t('help.tutorial.lesson', {
                  current: lessonForStep(step),
                })}
              </Text>
              <Text style={styles.instruction} testID="tutorial-instruction">
                {wrongAction ? t('help.tutorial.wrong') : t(STEP_KEYS[step])}
              </Text>
            </View>
          </Animated.View>

          <SudokuBoard
            candidateNoteAssist={false}
            fullHouseAssist={false}
            highlightRegions
            highlightSameDigit
            hintAnimationDurationMs={260}
            hintVisuals={tutorialVisuals(step)}
            maxSize={420}
            onSelectCell={selectCell}
            state={boardState}
          />

          <View style={styles.numberPad}>
            {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map(digit => {
              const target = expectsDigit && digit === expectedDigit;
              return (
                <Animated.View
                  key={digit}
                  style={
                    target ? { transform: [{ scale: targetScale }] } : null
                  }
                >
                  <Pressable
                    accessibilityLabel={t('game.enterDigit', {
                      count: 0,
                      digit,
                    })}
                    accessibilityRole="button"
                    onPress={() => enterDigit(digit)}
                    style={[styles.numberKey, target && styles.targetControl]}
                    testID={`tutorial-digit-${digit}`}
                  >
                    <Text style={styles.numberText}>{digit}</Text>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          <View style={styles.tools}>
            <Animated.View
              style={
                step === 9 ? { transform: [{ scale: targetScale }] } : null
              }
            >
              <Pressable
                accessibilityRole="button"
                onPress={undo}
                style={[styles.tool, step === 9 && styles.targetControl]}
                testID="tutorial-undo"
              >
                <Text style={styles.toolMark}>↶</Text>
                <Text style={styles.toolLabel}>{t('game.undo')}</Text>
              </Pressable>
            </Animated.View>
            <Animated.View
              style={
                expectsPencil ? { transform: [{ scale: targetScale }] } : null
              }
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: pencilMode }}
                onPress={togglePencil}
                style={[
                  styles.tool,
                  pencilMode && styles.toolActive,
                  expectsPencil && styles.targetControl,
                ]}
                testID="tutorial-pencil"
              >
                <Text style={styles.toolMark}>✎</Text>
                <Text style={styles.toolLabel}>{t('game.pencil')}</Text>
              </Pressable>
            </Animated.View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

export type HowToPlayPreferencePatch = Pick<
  ProductPreferences,
  'howToPlayCompleted' | 'howToPlayProgress'
>;

function createStyles(palette: AppPalette) {
  return StyleSheet.create({
    root: { backgroundColor: palette.background, flex: 1 },
    header: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 56,
      paddingHorizontal: 18,
    },
    back: { color: palette.accent, fontSize: 15, fontWeight: '800' },
    skip: { color: palette.muted, fontSize: 14, fontWeight: '700' },
    progress: { color: palette.muted, fontSize: 12, fontWeight: '800' },
    content: { alignItems: 'center', paddingBottom: 36, paddingHorizontal: 12 },
    instructionCard: {
      alignItems: 'center',
      alignSelf: 'stretch',
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row',
      marginBottom: 14,
      minHeight: 76,
      padding: 13,
    },
    instructionCardWrong: {
      backgroundColor: palette.errorSoft,
      borderColor: palette.error,
    },
    pointer: { color: palette.accent, fontSize: 27, width: 39 },
    instructionCopy: { flex: 1 },
    lessonLabel: {
      color: palette.accent,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    instruction: {
      color: palette.ink,
      fontSize: 15,
      fontWeight: '700',
      lineHeight: 21,
      marginTop: 4,
    },
    numberPad: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 16,
      maxWidth: 420,
      width: '100%',
    },
    numberKey: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 9,
      borderWidth: 1,
      height: 42,
      justifyContent: 'center',
      width: 36,
    },
    numberText: { color: palette.ink, fontSize: 20, fontWeight: '800' },
    targetControl: {
      borderColor: palette.accent,
      borderWidth: 2,
    },
    tools: {
      flexDirection: 'row',
      gap: 16,
      justifyContent: 'center',
      marginTop: 18,
    },
    tool: {
      alignItems: 'center',
      backgroundColor: palette.surface,
      borderColor: palette.line,
      borderRadius: 12,
      borderWidth: 1,
      minWidth: 92,
      paddingHorizontal: 18,
      paddingVertical: 9,
    },
    toolActive: { backgroundColor: palette.accentSoft },
    toolMark: { color: palette.accent, fontSize: 20, fontWeight: '800' },
    toolLabel: { color: palette.ink, fontSize: 12, fontWeight: '700' },
    complete: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      padding: 28,
    },
    completeMark: {
      color: palette.accent,
      fontSize: 64,
      fontWeight: '900',
    },
    completeTitle: {
      color: palette.ink,
      fontSize: 25,
      fontWeight: '900',
      marginTop: 12,
      textAlign: 'center',
    },
    completeBody: {
      color: palette.muted,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 10,
      maxWidth: 420,
      textAlign: 'center',
    },
    primaryButton: {
      backgroundColor: palette.accent,
      borderRadius: 13,
      marginTop: 28,
      minWidth: 220,
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    primaryButtonText: {
      color: palette.white,
      fontSize: 15,
      fontWeight: '800',
      textAlign: 'center',
    },
    homeAction: {
      color: palette.accent,
      fontSize: 14,
      fontWeight: '800',
      marginTop: 20,
    },
  });
}
