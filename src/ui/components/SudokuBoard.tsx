import React from 'react';
import {
  Animated,
  Easing,
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { GameState } from '../../domain/game/contracts';
import { findFullHousePlacements } from '../../domain/sudoku/full-house';
import {
  HintCellRole,
  HintHypotheticalValue,
  HintLinkMark,
  HintPageVisuals,
  HintRegionMark,
} from '../../domain/hints/presentation';
import {
  addCandidate,
  arePeers,
  digitsFromMask,
  hasCandidate,
  intersectCandidateMasks,
} from '../../domain/sudoku/board';
import {
  CandidateMask,
  CandidateRef,
  CellIndex,
  CellValue,
  Digit,
  RegionRef,
} from '../../domain/sudoku/contracts';
import { Translate, useLocalization } from '../../localization';
import { AppPalette, useAppTheme } from '../theme';
import { useReducedMotion } from '../use-reduced-motion';

export type SudokuBoardState = Pick<
  GameState,
  | 'values'
  | 'givens'
  | 'selectedCell'
  | 'incorrectCells'
  | 'candidates'
  | 'activeHint'
  | 'status'
>;

type SudokuBoardProps = {
  state: SudokuBoardState;
  maxSize?: number;
  accessibilityHidden?: boolean;
  disabled?: boolean;
  focusedDigits?: readonly Digit[];
  hintAnimations?: boolean;
  hintSpotlight?: boolean;
  hintVisuals?: HintPageVisuals;
  highlightDigit?: Digit | null;
  highlightRegions?: boolean;
  highlightSameDigit?: boolean;
  fullHouseAssist?: boolean;
  onCompleteFullHouse?(cell: CellIndex): void;
  onSelectCell(cell: CellIndex): void;
};

const DIGITS: readonly Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const EMPTY_DIGITS: readonly Digit[] = [];
const GRID_INDICES = Array.from({ length: 10 }, (_, index) => index);
const TABLET_SHORTEST_SIDE = 600;

export function sudokuBoardLayout(
  width: number,
  height: number,
): { boardSize: number; textScale: number } {
  const tablet = Math.min(width, height) >= TABLET_SHORTEST_SIDE;
  const horizontalInset = tablet ? 32 : 24;
  const maximumSize = tablet ? 700 : 540;
  const boardSize = Math.max(0, Math.min(width - horizontalInset, maximumSize));

  return {
    boardSize,
    textScale: tablet ? Math.min(boardSize / 540, 1.3) : 1,
  };
}

type BoardStyles = ReturnType<typeof createStyles>;

export type CandidateFocusMatch =
  | 'none'
  | 'occurrence'
  | 'partial'
  | 'contains'
  | 'exact';

export function candidateFocusMatch(
  value: CellValue,
  candidateMask: CandidateMask,
  focusedDigits: readonly Digit[],
): CandidateFocusMatch {
  if (focusedDigits.length === 0) {
    return 'none';
  }
  if (value !== null) {
    if (!focusedDigits.includes(value)) {
      return 'none';
    }
    return focusedDigits.length === 1 ? 'occurrence' : 'partial';
  }

  const candidates = digitsFromMask(candidateMask);
  const hitCount = focusedDigits.filter(digit =>
    candidates.includes(digit),
  ).length;
  if (focusedDigits.length === 1) {
    return hitCount === 1 ? 'occurrence' : 'none';
  }
  if (hitCount === focusedDigits.length) {
    return candidates.length === focusedDigits.length ? 'exact' : 'contains';
  }
  return hitCount > 0 ? 'partial' : 'none';
}

function candidateSlotPosition(digit: Digit): ViewStyle {
  const index = digit - 1;
  return {
    left: `${(index % 3) * 33.333333}%`,
    top: `${Math.floor(index / 3) * 33.333333}%`,
  };
}

/** Trim links at cell edges so the line never covers an endpoint's digit. */
export function hintLinkSegments(
  link: HintLinkMark,
  boardSize: number,
): readonly ViewStyle[] {
  const cellSize = boardSize / 9;
  const x1 = ((link.from % 9) + 0.5) * cellSize;
  const y1 = (Math.floor(link.from / 9) + 0.5) * cellSize;
  const x2 = ((link.to % 9) + 0.5) * cellSize;
  const y2 = (Math.floor(link.to / 9) + 0.5) * cellSize;
  const distance = Math.hypot(x2 - x1, y2 - y1);
  if (distance === 0) return [];
  const gap = Math.min(cellSize * 0.43, distance * 0.4);
  const length = distance - gap * 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const intervals =
    link.kind === 'pair' ? 1 : Math.max(1, Math.ceil(length / 9));
  const segments: ViewStyle[] = Array.from(
    { length: intervals },
    (_, index) => {
      const segmentLength =
        link.kind === 'pair' ? length : Math.min(5, length / intervals);
      const offset = gap + (index * length) / intervals + segmentLength / 2;
      return {
        left: x1 + Math.cos(angle) * offset - segmentLength / 2,
        top: y1 + Math.sin(angle) * offset - 1,
        width: segmentLength,
        transform: [{ rotate: `${angle}rad` }],
      };
    },
  );
  // Keep a gap around the candidate itself; only the two structural lines
  // continue outwards, stopping inside the board border.
  if (link.kind === 'pair' && link.extendFrom) {
    const inset = 3;
    if (y1 === y2) {
      const start = x1 + (x1 < x2 ? -gap : gap);
      const end = x1 < x2 ? inset : boardSize - inset;
      if (Math.abs(start - end) > 0)
        segments.push({
          left: Math.min(start, end),
          top: y1 - 1,
          width: Math.abs(start - end),
          height: 2,
        });
    } else if (x1 === x2) {
      const start = y1 + (y1 < y2 ? -gap : gap);
      const end = y1 < y2 ? inset : boardSize - inset;
      if (Math.abs(start - end) > 0)
        segments.push({
          left: x1 - 1,
          top: Math.min(start, end),
          width: 2,
          height: Math.abs(start - end),
        });
    }
  }
  return segments;
}

function evidenceMasks(
  candidates: readonly CandidateRef[],
): ReadonlyMap<CellIndex, CandidateMask> {
  const result = new Map<CellIndex, CandidateMask>();
  for (const candidate of candidates) {
    result.set(
      candidate.cell,
      addCandidate(result.get(candidate.cell) ?? 0, candidate.digit),
    );
  }
  return result;
}

const CandidateGrid = React.memo(function CandidateGridView({
  dimmed,
  candidateMask,
  premiseMask,
  eliminationMask,
  highlightedMask,
  focusedMask,
  transition,
  styles,
}: {
  dimmed: boolean;
  candidateMask: CandidateMask;
  premiseMask: CandidateMask;
  eliminationMask: CandidateMask;
  highlightedMask: CandidateMask;
  focusedMask: CandidateMask;
  transition: Animated.Value;
  styles: BoardStyles;
}): React.JSX.Element {
  const candidateEntrance = transition.interpolate({
    inputRange: [0, 0.35, 0.75, 1],
    outputRange: [0, 0, 1, 1],
  });
  const candidateScale = transition.interpolate({
    inputRange: [0, 0.35, 0.75, 1],
    outputRange: [0.82, 0.82, 1.04, 1],
  });
  const strikeEntrance = transition.interpolate({
    inputRange: [0, 0.62, 1],
    outputRange: [0, 0, 1],
  });
  const strikeScale = transition.interpolate({
    inputRange: [0, 0.62, 1],
    outputRange: [0.05, 0.05, 1],
  });
  return (
    <View
      style={[styles.candidateGrid, dimmed && styles.kiteBackground]}
      testID="sudoku-candidate-grid"
    >
      {DIGITS.map(digit => {
        const premise = hasCandidate(premiseMask, digit);
        const eliminated = hasCandidate(eliminationMask, digit);
        const highlighted =
          hasCandidate(highlightedMask, digit) &&
          hasCandidate(candidateMask, digit);
        const focused =
          hasCandidate(focusedMask, digit) &&
          hasCandidate(candidateMask, digit);
        const visible =
          hasCandidate(candidateMask, digit) || premise || eliminated;
        if (!visible) {
          return null;
        }
        return (
          <View
            key={digit}
            style={[
              styles.candidateSlot,
              candidateSlotPosition(digit),
              (highlighted || focused) && styles.candidateFocusSlot,
              focusedMask !== 0 &&
                !focused &&
                !premise &&
                !eliminated &&
                styles.unfocusedCandidate,
            ]}
            testID={`sudoku-candidate-slot-${digit}`}
          >
            <Animated.View
              style={[
                styles.candidateBadge,
                premise && styles.candidatePremiseBadge,
                premise && {
                  opacity: candidateEntrance,
                  transform: [{ scale: candidateScale }],
                },
              ]}
              testID={
                premise ? `sudoku-candidate-potential-${digit}` : undefined
              }
            >
              <Text
                allowFontScaling={false}
                style={[
                  styles.candidateDigit,
                  (highlighted || focused) && styles.candidateFocusDigit,
                  premise && styles.candidatePremise,
                  eliminated && styles.candidateElimination,
                ]}
              >
                {digit}
              </Text>
              {eliminated ? (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.eliminationStrike,
                    {
                      opacity: strikeEntrance,
                      transform: [{ rotate: '36deg' }, { scaleX: strikeScale }],
                    },
                  ]}
                  testID={`sudoku-candidate-strike-${digit}`}
                />
              ) : null}
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
});

function cellLayout(
  cell: CellIndex,
  boardSize: number,
): Pick<ViewStyle, 'height' | 'left' | 'top' | 'width'> {
  const row = Math.floor(cell / 9);
  const column = cell % 9;
  const left = PixelRatio.roundToNearestPixel((column * boardSize) / 9);
  const right = PixelRatio.roundToNearestPixel(((column + 1) * boardSize) / 9);
  const top = PixelRatio.roundToNearestPixel((row * boardSize) / 9);
  const bottom = PixelRatio.roundToNearestPixel(((row + 1) * boardSize) / 9);
  return {
    height: bottom - top,
    left,
    top,
    width: right - left,
  };
}

function gridLine(
  axis: 'horizontal' | 'vertical',
  index: number,
  boardSize: number,
): ViewStyle {
  const thickness = index === 0 || index === 9 ? 3 : index % 3 === 0 ? 2.5 : 1;
  const crossing = PixelRatio.roundToNearestPixel((index * boardSize) / 9);
  const offset =
    index === 0
      ? 0
      : index === 9
      ? boardSize - thickness
      : PixelRatio.roundToNearestPixel(crossing - thickness / 2);
  return axis === 'vertical'
    ? { bottom: 0, left: offset, top: 0, width: thickness }
    : { height: thickness, left: 0, right: 0, top: offset };
}

function cellIsInRegion(cell: CellIndex, region: RegionRef): boolean {
  const row = Math.floor(cell / 9);
  const column = cell % 9;
  if (region.kind === 'row') {
    return row === region.index;
  }
  if (region.kind === 'column') {
    return column === region.index;
  }
  return Math.floor(row / 3) * 3 + Math.floor(column / 3) === region.index;
}

function dimOverlayRuns(
  visibleCells: ReadonlySet<CellIndex>,
  boardSize: number,
): readonly ViewStyle[] {
  const runs: ViewStyle[] = [];
  for (let row = 0; row < 9; row += 1) {
    let startColumn: number | null = null;
    for (let column = 0; column <= 9; column += 1) {
      const cell = row * 9 + column;
      const dimmed = column < 9 && !visibleCells.has(cell as CellIndex);
      if (dimmed && startColumn === null) {
        startColumn = column;
      }
      if (!dimmed && startColumn !== null) {
        const first = cellLayout(
          (row * 9 + startColumn) as CellIndex,
          boardSize,
        );
        const last = cellLayout((row * 9 + column - 1) as CellIndex, boardSize);
        runs.push({
          height: first.height,
          left: first.left,
          top: first.top,
          width:
            (last.left as number) +
            (last.width as number) -
            (first.left as number),
        });
        startColumn = null;
      }
    }
  }
  return runs;
}

function semanticCellRoles(
  hintVisuals: HintPageVisuals | undefined,
  premiseMasks: ReadonlyMap<CellIndex, CandidateMask>,
  eliminationMasks: ReadonlyMap<CellIndex, CandidateMask>,
  placements: ReadonlyMap<CellIndex, Digit>,
): ReadonlyMap<CellIndex, HintCellRole> {
  const roles = new Map<CellIndex, HintCellRole>();
  const priority: Readonly<Record<HintCellRole, number>> = {
    potential: 1,
    eliminationTarget: 2,
    established: 3,
    result: 4,
  };
  const mark = (cell: CellIndex, role: HintCellRole) => {
    const current = roles.get(cell);
    if (!current || priority[role] > priority[current]) {
      roles.set(cell, role);
    }
  };

  if (hintVisuals?.cellMarks) {
    hintVisuals.cellMarks.forEach(item => mark(item.cell, item.role));
    return roles;
  }
  premiseMasks.forEach((_, cell) => mark(cell, 'potential'));
  eliminationMasks.forEach((_, cell) => mark(cell, 'eliminationTarget'));
  placements.forEach((_, cell) => mark(cell, 'result'));
  (hintVisuals?.focusCells ?? []).forEach(cell => mark(cell, 'established'));
  return roles;
}

function semanticRegionMarks(
  hintVisuals: HintPageVisuals | undefined,
  focusRegions: readonly RegionRef[],
): readonly HintRegionMark[] {
  return (
    hintVisuals?.regionMarks ??
    focusRegions.map(region => ({ region, role: 'source' as const }))
  );
}

type SudokuCellProps = {
  accessibilityHidden: boolean;
  backgroundColor: string;
  candidateMask: CandidateMask;
  cell: CellIndex;
  cellRole: HintCellRole | null;
  disabled: boolean;
  eliminationMask: CandidateMask;
  explanatoryEliminationMask: CandidateMask;
  focusMatch: CandidateFocusMatch;
  focusedMask: CandidateMask;
  highlightedMask: CandidateMask;
  hypotheticalValue: HintHypotheticalValue | null;
  isError: boolean;
  fullHouseDigit: Digit | null;
  onCompleteFullHouse?(cell: CellIndex): void;
  isGiven: boolean;
  isHintFocus: boolean;
  isKiteBackground: boolean;
  isHintRegion: boolean;
  isHintTarget: boolean;
  isHintQuestion: boolean;
  isHintValueEvidence: boolean;
  isSelected: boolean;
  layout: Pick<ViewStyle, 'height' | 'left' | 'top' | 'width'>;
  onSelectCell(cell: CellIndex): void;
  placement: Digit | null;
  premiseMask: CandidateMask;
  palette: AppPalette;
  styles: BoardStyles;
  t: Translate;
  transition: Animated.Value;
  value: CellValue;
};

const SudokuCell = React.memo(function SudokuCellView({
  accessibilityHidden,
  backgroundColor,
  candidateMask,
  cell,
  cellRole,
  disabled,
  eliminationMask,
  explanatoryEliminationMask,
  focusMatch,
  focusedMask,
  highlightedMask,
  hypotheticalValue,
  isError,
  fullHouseDigit,
  onCompleteFullHouse,
  isGiven,
  isHintFocus,
  isKiteBackground,
  isHintRegion,
  isHintTarget,
  isHintQuestion,
  isHintValueEvidence,
  isSelected,
  layout,
  onSelectCell,
  placement,
  premiseMask,
  palette,
  styles,
  t,
  transition,
  value,
}: SudokuCellProps): React.JSX.Element {
  const accessibilityParts = [
    t('board.cell', {
      row: Math.floor(cell / 9) + 1,
      column: (cell % 9) + 1,
    }),
    value ? String(value) : t('board.empty'),
  ];
  if (value === null) {
    const visibleCandidates = digitsFromMask(candidateMask);
    if (visibleCandidates.length > 0) {
      accessibilityParts.push(
        t('board.candidates', { digits: visibleCandidates.join(', ') }),
      );
    }
  }
  if (hypotheticalValue) {
    accessibilityParts.push(
      t(
        hypotheticalValue.role === 'assumption'
          ? 'board.assumption'
          : 'board.hypotheticalResult',
        { digit: hypotheticalValue.digit },
      ),
    );
    if (hypotheticalValue.conflict)
      accessibilityParts.push(t('board.hypotheticalConflict'));
  }
  if (isError) {
    accessibilityParts.push(t('board.incorrect'));
  }
  if (fullHouseDigit !== null) {
    accessibilityParts.push(t('board.fullHouse'));
  }
  if (isHintRegion) {
    accessibilityParts.push(t('board.hintRegion'));
  }
  if (isHintFocus) {
    accessibilityParts.push(t('board.hintCell'));
  }
  if (isHintQuestion) accessibilityParts.push(t('board.toCheck'));
  if (isHintValueEvidence) {
    accessibilityParts.push(t('board.valueEvidence'));
  }
  const premiseDigits = digitsFromMask(premiseMask);
  const explanatoryEliminatedDigits = digitsFromMask(
    explanatoryEliminationMask,
  );
  const eliminatedDigits = digitsFromMask(eliminationMask).filter(
    digit => !hasCandidate(explanatoryEliminationMask, digit),
  );
  if (premiseDigits.length > 0) {
    accessibilityParts.push(
      t('board.premise', { digits: premiseDigits.join(', ') }),
    );
  }
  if (eliminatedDigits.length > 0) {
    accessibilityParts.push(
      t('board.remove', { digits: eliminatedDigits.join(', ') }),
    );
  }
  if (explanatoryEliminatedDigits.length > 0) {
    accessibilityParts.push(
      t('board.ruledOut', {
        digits: explanatoryEliminatedDigits.join(', '),
      }),
    );
  }
  if (placement !== null) {
    accessibilityParts.push(t('board.place', { digit: placement }));
  }
  if (cellRole === 'potential') {
    accessibilityParts.push(t('board.potential'));
  } else if (cellRole === 'established') {
    accessibilityParts.push(t('board.established'));
  } else if (cellRole === 'eliminationTarget') {
    accessibilityParts.push(t('board.affected'));
  } else if (cellRole === 'result') {
    accessibilityParts.push(t('board.result'));
  }
  if (focusMatch === 'exact') {
    accessibilityParts.push(t('board.focusExact'));
  } else if (focusMatch === 'contains') {
    accessibilityParts.push(t('board.focusContains'));
  }

  const cellRoleEntrance = transition.interpolate({
    inputRange: [0, 0.22, 0.68, 1],
    outputRange: [0, 0, 1, 1],
  });
  const cellRoleColor =
    cellRole === 'established'
      ? palette.hintEstablished
      : cellRole === 'result'
      ? palette.hintResult
      : null;
  return (
    <Pressable
      accessible={!accessibilityHidden}
      accessibilityLabel={accessibilityParts.join(', ')}
      accessibilityHint={
        fullHouseDigit !== null
          ? t('board.completeFullHouse', { digit: fullHouseDigit })
          : undefined
      }
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled }}
      disabled={disabled}
      importantForAccessibility={
        accessibilityHidden ? 'no-hide-descendants' : 'yes'
      }
      onPress={() => {
        if (disabled) {
          return;
        }
        if (fullHouseDigit !== null && onCompleteFullHouse) {
          onCompleteFullHouse(cell);
        } else {
          onSelectCell(cell);
        }
      }}
      style={[styles.cell, layout, { backgroundColor }]}
      testID={`sudoku-cell-index-${cell}`}
    >
      {cellRoleColor ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cellRoleFill,
            { backgroundColor: cellRoleColor, opacity: cellRoleEntrance },
          ]}
          testID={`sudoku-cell-${cellRole}`}
        />
      ) : null}
      {isHintTarget || isHintQuestion ? (
        <View
          pointerEvents="none"
          testID={isHintQuestion ? `sudoku-question-${cell}` : undefined}
          style={[styles.hintTarget, isHintQuestion && styles.hintQuestion]}
        />
      ) : null}
      {value ? (
        <Text
          allowFontScaling={false}
          style={[
            styles.value,
            isGiven ? styles.given : styles.player,
            focusMatch === 'partial' && styles.valueFocusContext,
            isError && styles.error,
            isHintValueEvidence && styles.valueEvidence,
            isKiteBackground && styles.kiteBackground,
          ]}
        >
          {value}
        </Text>
      ) : hypotheticalValue ? (
        <View
          testID={`sudoku-hypothetical-${cell}`}
          style={[
            styles.hypotheticalValue,
            {
              backgroundColor: hypotheticalValue.conflict
                ? palette.errorSoft
                : hypotheticalValue.role === 'assumption'
                ? palette.hintEstablished
                : palette.hintEvidence,
              borderColor: hypotheticalValue.conflict
                ? palette.error
                : palette.accent,
            },
          ]}
        >
          <Text
            allowFontScaling={false}
            style={[styles.placementDigit, styles.hypotheticalDigit]}
          >
            {hypotheticalValue.digit}
          </Text>
          <Text allowFontScaling={false} style={styles.hypotheticalMark}>
            ?
          </Text>
        </View>
      ) : placement !== null ? (
        <View style={styles.placementResult}>
          <Text allowFontScaling={false} style={styles.placementMark}>
            +
          </Text>
          <Text allowFontScaling={false} style={styles.placementDigit}>
            {placement}
          </Text>
        </View>
      ) : candidateMask !== 0 || premiseMask !== 0 || eliminationMask !== 0 ? (
        <CandidateGrid
          dimmed={isKiteBackground}
          candidateMask={candidateMask}
          eliminationMask={eliminationMask}
          premiseMask={premiseMask}
          focusedMask={focusedMask}
          highlightedMask={highlightedMask}
          styles={styles}
          transition={transition}
        />
      ) : null}
    </Pressable>
  );
});

function SudokuBoardComponent({
  state,
  maxSize,
  accessibilityHidden = false,
  disabled = false,
  focusedDigits = EMPTY_DIGITS,
  hintVisuals,
  hintAnimations = true,
  hintSpotlight = true,
  highlightDigit = null,
  highlightRegions = true,
  highlightSameDigit = true,
  fullHouseAssist = false,
  onCompleteFullHouse,
  onSelectCell,
}: SudokuBoardProps): React.JSX.Element {
  const { height, width } = useWindowDimensions();
  const { t } = useLocalization();
  const { palette } = useAppTheme();
  const boardLayout = sudokuBoardLayout(width, height);
  const boardSize = PixelRatio.roundToNearestPixel(
    Math.min(boardLayout.boardSize, maxSize ?? Infinity),
  );
  const styles = React.useMemo(
    () => createStyles(palette, boardLayout.textScale),
    [boardLayout.textScale, palette],
  );
  const fullHousePlacements = React.useMemo(
    () =>
      fullHouseAssist &&
      onCompleteFullHouse &&
      !disabled &&
      !hintVisuals &&
      !state.activeHint &&
      state.status === 'active'
        ? findFullHousePlacements(state.values)
        : new Map<CellIndex, Digit>(),
    [
      fullHouseAssist,
      onCompleteFullHouse,
      disabled,
      hintVisuals,
      state.activeHint,
      state.status,
      state.values,
    ],
  );
  const reduceMotion = useReducedMotion(hintAnimations);
  const sceneTransition = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    sceneTransition.stopAnimation();
    if (!hintVisuals || reduceMotion) {
      sceneTransition.setValue(1);
      return;
    }
    sceneTransition.setValue(0);
    Animated.timing(sceneTransition, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [hintVisuals, reduceMotion, sceneTransition]);
  const cellLayouts = React.useMemo(
    () => Array.from({ length: 81 }, (_, cell) => cellLayout(cell, boardSize)),
    [boardSize],
  );
  const selected = state.selectedCell;
  const selectedValue =
    highlightDigit ?? (selected === null ? null : state.values[selected]);
  const activeFocusedDigits = hintVisuals
    ? hintVisuals.focusDigits ?? EMPTY_DIGITS
    : focusedDigits;
  const focusedMask = activeFocusedDigits.reduce(addCandidate, 0);
  const highlightedMask =
    !hintVisuals &&
    activeFocusedDigits.length === 0 &&
    highlightSameDigit &&
    selectedValue
      ? addCandidate(0, selectedValue)
      : 0;
  const candidates =
    hintVisuals && state.candidates.hintCandidates
      ? state.candidates.hintCandidates
      : state.candidates.activeCandidateSource === 'quick'
      ? state.candidates.quickCandidates
      : state.candidates.manualCandidates;
  const errors = new Set(state.incorrectCells);
  const hint = state.activeHint;
  const focusRegions =
    hintVisuals?.focusRegions ??
    (hintVisuals?.showFocusRegions ? hint?.focusRegions ?? [] : []);
  const hintFocus = new Set(
    hintVisuals?.focusCells ??
      (hintVisuals?.showFocusCells ? hint?.focusCells ?? [] : []),
  );
  const semanticCandidateMarks = hintVisuals?.candidateMarks;
  const premiseMasks = evidenceMasks(
    semanticCandidateMarks
      ? semanticCandidateMarks.filter(mark => mark.role === 'potential')
      : hintVisuals?.premiseCandidates ??
          (hintVisuals?.showPremises ? hint?.premiseCandidates ?? [] : []),
  );
  const displayedEliminations = semanticCandidateMarks
    ? semanticCandidateMarks.filter(mark => mark.role === 'excluded')
    : hintVisuals?.eliminations ??
      (hintVisuals?.showEliminations ? hint?.eliminations ?? [] : []);
  const eliminationMasks = evidenceMasks(displayedEliminations);
  const explanatoryEliminationMasks = evidenceMasks(
    semanticCandidateMarks
      ? semanticCandidateMarks.filter(
          mark =>
            mark.role === 'excluded' && mark.exclusionKind === 'explanation',
        )
      : [],
  );
  const placements = new Map(
    (
      hintVisuals?.placements ??
      (hintVisuals?.showPlacements ? hint?.placements ?? [] : [])
    ).map(placement => [placement.cell, placement.digit]),
  );
  const hypotheticalValues = new Map(
    (hintVisuals?.hypotheticalValues ?? []).map(value => [value.cell, value]),
  );
  const valueEvidence = new Set(
    (hintVisuals?.valueEvidence ?? []).map(evidence => evidence.cell),
  );
  const cellRoles = semanticCellRoles(
    hintVisuals,
    premiseMasks,
    eliminationMasks,
    placements,
  );
  const regionMarks = semanticRegionMarks(hintVisuals, focusRegions);
  const visibleCells = new Set<CellIndex>();
  if (hintVisuals) {
    for (let cell = 0; cell < 81; cell += 1) {
      if (
        regionMarks.some(mark => cellIsInRegion(cell as CellIndex, mark.region))
      ) {
        visibleCells.add(cell as CellIndex);
      }
    }
    hintFocus.forEach(cell => visibleCells.add(cell));
    premiseMasks.forEach((_, cell) => visibleCells.add(cell));
    eliminationMasks.forEach((_, cell) => visibleCells.add(cell));
    placements.forEach((_, cell) => visibleCells.add(cell));
    valueEvidence.forEach(cell => visibleCells.add(cell));
    hypotheticalValues.forEach((_, cell) => visibleCells.add(cell));
    cellRoles.forEach((_, cell) => visibleCells.add(cell));
  }
  if (hintVisuals?.spotlightCells) {
    visibleCells.clear();
    hintVisuals.spotlightCells.forEach(cell => visibleCells.add(cell));
  }
  const dimRuns =
    hintSpotlight && hintVisuals && visibleCells.size > 0
      ? dimOverlayRuns(visibleCells, boardSize)
      : [];
  const dimEntrance = sceneTransition.interpolate({
    inputRange: [0, 0.42, 1],
    outputRange: [0, 1, 1],
  });

  return (
    <View
      accessibilityElementsHidden={accessibilityHidden}
      accessibilityLabel={t('board.label')}
      collapsable={false}
      importantForAccessibility={
        accessibilityHidden ? 'no-hide-descendants' : 'auto'
      }
      style={[styles.board, { width: boardSize, height: boardSize }]}
    >
      {state.values.map((value, cell) => {
        const candidateMask = candidates[cell];
        const focusMatch = candidateFocusMatch(
          value,
          candidateMask,
          activeFocusedDigits,
        );
        const isSelected = selected === cell;
        const isPeer =
          highlightRegions && selected !== null && arePeers(selected, cell);
        const isSameDigit =
          value !== null && hasCandidate(highlightedMask, value);
        const isGiven = state.givens[cell] !== null;
        const isError = errors.has(cell);
        const isHintFocus = hintFocus.has(cell);
        const isKiteBackground = !!hintVisuals?.links?.length && !isHintFocus;
        const isHintRegion = focusRegions.some(region =>
          cellIsInRegion(cell, region),
        );
        const isHintValueEvidence = valueEvidence.has(cell);
        const cellRole = cellRoles.get(cell) ?? null;
        const isHintTarget = cellRole === 'result';
        const placement = placements.get(cell) ?? null;
        const fullHouseDigit = fullHousePlacements.get(cell) ?? null;
        const backgroundColor = isError
          ? palette.errorSoft
          : hintVisuals
          ? palette.surface
          : fullHouseDigit !== null
          ? palette.hintResult
          : isSelected
          ? palette.selected
          : focusMatch === 'exact' ||
            (focusMatch === 'occurrence' && value !== null)
          ? focusMatch === 'exact'
            ? palette.focusExact
            : palette.focusSoft
          : isSameDigit
          ? palette.sameDigit
          : isPeer
          ? palette.peer
          : palette.surface;
        return (
          <SudokuCell
            key={cell}
            accessibilityHidden={accessibilityHidden}
            backgroundColor={backgroundColor}
            candidateMask={candidateMask}
            cell={cell}
            cellRole={cellRole}
            disabled={disabled}
            eliminationMask={eliminationMasks.get(cell) ?? 0}
            explanatoryEliminationMask={
              explanatoryEliminationMasks.get(cell) ?? 0
            }
            focusMatch={focusMatch}
            focusedMask={
              value === null && !isKiteBackground
                ? hintVisuals
                  ? focusedMask
                  : intersectCandidateMasks(focusedMask, candidateMask)
                : 0
            }
            highlightedMask={
              value === null
                ? intersectCandidateMasks(highlightedMask, candidateMask)
                : 0
            }
            hypotheticalValue={hypotheticalValues.get(cell) ?? null}
            isError={isError}
            fullHouseDigit={fullHouseDigit}
            onCompleteFullHouse={onCompleteFullHouse}
            isGiven={isGiven}
            isHintFocus={isHintFocus}
            isKiteBackground={isKiteBackground}
            isHintRegion={isHintRegion}
            isHintTarget={isHintTarget}
            isHintQuestion={hintVisuals?.questionCells?.includes(cell) ?? false}
            isHintValueEvidence={isHintValueEvidence}
            isSelected={isSelected}
            layout={cellLayouts[cell]}
            onSelectCell={onSelectCell}
            placement={placement}
            premiseMask={premiseMasks.get(cell) ?? 0}
            palette={palette}
            styles={styles}
            t={t}
            transition={sceneTransition}
            value={value}
          />
        );
      })}
      {hintVisuals?.links?.length ? (
        <View
          pointerEvents="none"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={styles.linkLayer}
          testID="sudoku-hint-links"
        >
          {hintVisuals.links.flatMap((link, index) =>
            hintLinkSegments(link, boardSize).map((layout, segment) => (
              <View
                key={`${index}:${segment}`}
                testID={`sudoku-link-${index}-${segment}`}
                style={[
                  styles.hintLink,
                  layout,
                  link.active
                    ? styles.hintLinkActive
                    : link.kind === 'pair'
                    ? styles.hintLinkStructure
                    : link.kind === 'target'
                    ? styles.hintLinkTarget
                    : styles.hintLinkContext,
                  {
                    backgroundColor:
                      link.active || link.kind === 'pair'
                        ? palette.accent
                        : palette.muted,
                  },
                ]}
              />
            )),
          )}
        </View>
      ) : null}
      {dimRuns.length > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.spotlightMask,
            hintVisuals?.spotlightCells
              ? styles.stableSpotlight
              : { opacity: dimEntrance },
          ]}
          testID="sudoku-hint-mask"
        >
          {dimRuns.map((layout, index) => (
            <View
              key={`dim:${index}`}
              style={[styles.spotlightMaskRun, layout]}
            />
          ))}
        </Animated.View>
      ) : null}
      {GRID_INDICES.map(index => (
        <View
          key={`vertical:${index}`}
          pointerEvents="none"
          style={[styles.gridLine, gridLine('vertical', index, boardSize)]}
          testID={`sudoku-grid-vertical-${index}`}
        />
      ))}
      {GRID_INDICES.map(index => (
        <View
          key={`horizontal:${index}`}
          pointerEvents="none"
          style={[styles.gridLine, gridLine('horizontal', index, boardSize)]}
          testID={`sudoku-grid-horizontal-${index}`}
        />
      ))}
    </View>
  );
}

export const SudokuBoard = React.memo(SudokuBoardComponent);

function createStyles(palette: AppPalette, textScale = 1) {
  return StyleSheet.create({
    board: {
      alignSelf: 'center',
      overflow: 'hidden',
      position: 'relative',
    },
    cell: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'absolute',
    },
    cellRoleFill: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
    },
    value: {
      fontSize: 24 * textScale,
      fontVariant: ['tabular-nums'],
      lineHeight: 29 * textScale,
    },
    given: {
      color: palette.ink,
      fontWeight: '800',
    },
    player: {
      color: palette.accent,
      fontWeight: '600',
    },
    error: {
      color: palette.error,
      textDecorationLine: 'underline',
    },
    valueEvidence: {
      color: palette.hintCandidate,
      fontWeight: '900',
    },
    valueFocusContext: {
      color: palette.focus,
      fontWeight: '800',
    },
    unfocusedCandidate: { opacity: 0.35 },
    candidateGrid: {
      height: '100%',
      position: 'relative',
      width: '100%',
    },
    candidateSlot: {
      alignItems: 'center',
      height: '33.333333%',
      justifyContent: 'center',
      position: 'absolute',
      width: '33.333333%',
    },
    candidateFocusSlot: {
      backgroundColor: palette.focus,
      borderRadius: 3,
    },
    candidateBadge: {
      alignItems: 'center',
      aspectRatio: 1,
      borderRadius: 2,
      justifyContent: 'center',
      position: 'relative',
      width: '78%',
    },
    candidateDigit: {
      color: palette.accent,
      fontSize: (textScale > 1 ? 11 : 9) * textScale,
      fontVariant: ['tabular-nums'],
      lineHeight: (textScale > 1 ? 14 : 11) * textScale,
      textAlign: 'center',
    },
    candidateFocusDigit: {
      color: palette.focusText,
      fontWeight: '900',
    },
    candidatePremise: {
      color: palette.hintCandidateText,
      fontWeight: '900',
    },
    candidatePremiseBadge: {
      backgroundColor: palette.hintCandidate,
    },
    candidateElimination: {
      color: palette.ink,
      fontWeight: '900',
    },
    eliminationStrike: {
      backgroundColor: palette.hintExcluded,
      borderRadius: 1,
      height: 1.8,
      left: '-14%',
      position: 'absolute',
      top: '45%',
      width: '128%',
    },
    hypotheticalValue: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      margin: 3,
      borderRadius: 3,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    hypotheticalDigit: { color: palette.ink },
    hypotheticalMark: {
      color: palette.ink,
      fontSize: 12 * textScale,
      fontWeight: '700',
      alignSelf: 'flex-start',
    },
    placementResult: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    placementMark: {
      color: palette.accentWarm,
      fontSize: 12 * textScale,
      fontWeight: '900',
      marginRight: 1,
    },
    placementDigit: {
      color: palette.accent,
      fontSize: 24 * textScale,
      fontWeight: '900',
    },
    linkLayer: { ...StyleSheet.absoluteFill, zIndex: 3 },
    hintLink: { position: 'absolute', height: 2, borderRadius: 1 },
    kiteBackground: { opacity: 0.18 },
    hintLinkStructure: { opacity: 0.85 },
    hintLinkActive: { opacity: 0.9 },
    hintLinkTarget: { opacity: 0.3 },
    hintLinkContext: { opacity: 0.55 },
    stableSpotlight: { opacity: 1 },
    hintQuestion: { borderStyle: 'dashed' },
    hintTarget: {
      borderColor: palette.accentWarm,
      borderRadius: 2,
      borderWidth: 2,
      bottom: 3,
      left: 3,
      position: 'absolute',
      right: 3,
      top: 3,
    },
    spotlightMask: {
      bottom: 0,
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0,
      zIndex: 2,
    },
    spotlightMaskRun: {
      backgroundColor: palette.hintMask,
      position: 'absolute',
    },
    gridLine: {
      backgroundColor: palette.lineStrong,
      position: 'absolute',
      zIndex: 4,
    },
  });
}
