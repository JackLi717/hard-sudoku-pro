import React from 'react';
import {
  Animated,
  Easing,
  PixelRatio,
  Pressable,
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
import { useAppTheme } from '../theme';
import {
  BoardColors,
  BoardTheme,
  boardCellSurface,
} from '../themes/board-theme';
import { hintBackground } from '../themes/hint-background';
import { createBoardStyles } from '../themes/sudoku-board-styles';
import { useReducedMotion } from '../use-reduced-motion';
import { uniqueCandidateNotes } from './candidate-note-assistance';

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
  hintAnimationDurationMs?: number;
  hintAnimations?: boolean;
  hintSpotlight?: boolean;
  hintVisuals?: HintPageVisuals;
  /** Historical deletions overlay ordinary cells without entering hint mode. */
  replayEliminations?: HintPageVisuals['eliminations'];
  /** Hide player candidate notes while retaining values and hint overlays. */
  showCandidates?: boolean;
  highlightDigit?: Digit | null;
  /** Allow a replay frame's focused digits to use normal same-digit styling. */
  highlightFocusedDigits?: boolean;
  /** Hide only the visible cursor; keep the input target and accessibility. */
  showSelection?: boolean;
  /** Keep the input cell on the same background as its related region. */
  blendSelectionBackground?: boolean;
  highlightRegions?: boolean;
  highlightSameDigit?: boolean;
  /** Omit on non-game surfaces to retain their ordinary note highlighting. */
  candidateNoteAssist?: boolean;
  fullHouseAssist?: boolean;
  onCompleteFullHouse?(cell: CellIndex): void;
  onSelectCell(cell: CellIndex): void;
};

const DIGITS: readonly Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const EMPTY_DIGITS: readonly Digit[] = [];
const GRID_INDICES = Array.from({ length: 10 }, (_, index) => index);
const TABLET_SHORTEST_SIDE = 600;
const PHONE_REFERENCE_BOARD_SIZE = 366;
const PHONE_MIN_TEXT_SCALE = 0.95;
const PHONE_MAX_TEXT_SCALE = 1.12;

export function sudokuBoardLayout(
  width: number,
  height: number,
): { boardSize: number; textScale: number } {
  const tablet = Math.min(width, height) >= TABLET_SHORTEST_SIDE;
  const horizontalInset = tablet ? 32 : 24;
  const maximumSize = tablet ? 700 : 540;
  const boardSize = Math.max(0, Math.min(width - horizontalInset, maximumSize));

  const textScale = tablet
    ? Math.min(boardSize / 540, 1.3)
    : Math.min(
        Math.max(boardSize / PHONE_REFERENCE_BOARD_SIZE, PHONE_MIN_TEXT_SCALE),
        PHONE_MAX_TEXT_SCALE,
      );

  return { boardSize, textScale };
}

type BoardStyles = ReturnType<typeof createBoardStyles>;

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
  uniqueNoteDigit,
  strikeAngle,
  focusedMask,
  transition,
  candidateRevealOrder,
  styles,
}: {
  dimmed: boolean;
  candidateMask: CandidateMask;
  premiseMask: CandidateMask;
  eliminationMask: CandidateMask;
  highlightedMask: CandidateMask;
  uniqueNoteDigit: Digit | null;
  strikeAngle: BoardTheme['marks']['strikeAngle'];
  focusedMask: CandidateMask;
  transition: Animated.Value;
  candidateRevealOrder?: readonly Digit[];
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
        const revealIndex = premise
          ? candidateRevealOrder?.indexOf(digit) ?? -1
          : -1;
        const revealOpacity =
          revealIndex >= 0
            ? transition.interpolate({
                inputRange: revealIndex === 0 ? [0, 0.4, 1] : [0, 0.45, 1],
                outputRange: revealIndex === 0 ? [0, 1, 1] : [0, 0, 1],
              })
            : candidateEntrance;
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
            {revealIndex >= 0 && hasCandidate(candidateMask, digit) ? (
              <View
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.candidateRevealBase}
                testID={`sudoku-candidate-base-${digit}`}
              >
                <Text allowFontScaling={false} style={styles.candidateDigit}>
                  {digit}
                </Text>
              </View>
            ) : null}
            <Animated.View
              style={[
                styles.candidateBadge,
                uniqueNoteDigit === digit && styles.uniqueNoteBadge,
                premise && styles.candidatePremiseBadge,
                premise && {
                  opacity: revealOpacity,
                  transform: [{ scale: revealIndex >= 0 ? 1 : candidateScale }],
                },
              ]}
              testID={
                uniqueNoteDigit === digit
                  ? `sudoku-candidate-unique-${digit}`
                  : premise
                  ? `sudoku-candidate-potential-${digit}`
                  : undefined
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
                      transform: [
                        { rotate: strikeAngle },
                        { scaleX: strikeScale },
                      ],
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
  const outer = index === 0 || index === 9;
  const crossing = PixelRatio.roundToNearestPixel((index * boardSize) / 9);
  const offset =
    index === 0
      ? -thickness
      : index === 9
      ? boardSize
      : PixelRatio.roundToNearestPixel(crossing - thickness / 2);
  return axis === 'vertical'
    ? {
        bottom: outer ? -thickness : 0,
        left: offset,
        top: outer ? -thickness : 0,
        width: thickness,
      }
    : {
        height: thickness,
        left: outer ? -thickness : 0,
        right: outer ? -thickness : 0,
        top: offset,
      };
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

export function semanticCellRoles(
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

  premiseMasks.forEach((_, cell) => mark(cell, 'potential'));
  eliminationMasks.forEach((_, cell) => mark(cell, 'eliminationTarget'));
  placements.forEach((_, cell) => mark(cell, 'result'));
  (hintVisuals?.focusCells ?? []).forEach(cell => mark(cell, 'potential'));
  hintVisuals?.cellMarks?.forEach(item => mark(item.cell, item.role));
  return roles;
}

export function semanticRegionMarks(
  hintVisuals: HintPageVisuals | undefined,
  focusRegions: readonly RegionRef[],
): readonly HintRegionMark[] {
  const marks = new Map<string, HintRegionMark>();
  for (const mark of hintVisuals?.diagramRegions ?? []) {
    marks.set(`${mark.region.kind}:${mark.region.index}`, {
      region: mark.region,
      role: mark.role ?? 'source',
    });
  }
  for (const mark of hintVisuals?.regionMarks ??
    focusRegions.map(region => ({ region, role: 'source' as const }))) {
    const key = `${mark.region.kind}:${mark.region.index}`;
    // An explicit diagram fish role must not be erased by generic focus context.
    const previous = marks.get(key);
    if (previous?.role === 'fishBase' || previous?.role === 'fishCover')
      continue;
    marks.set(key, mark);
  }
  return [...marks.values()];
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
  priorEliminationMask: CandidateMask;
  focusMatch: CandidateFocusMatch;
  focusedMask: CandidateMask;
  highlightedMask: CandidateMask;
  uniqueNoteDigit: Digit | null;
  hypotheticalValue: HintHypotheticalValue | null;
  diagramDigit: Digit | null;
  isDiagramEmpty: boolean;
  isError: boolean;
  fullHouseDigit: Digit | null;
  onCompleteFullHouse?(cell: CellIndex): void;
  isGiven: boolean;
  isHintFocus: boolean;
  isKiteBackground: boolean;
  isHintRegion: boolean;
  isHintTarget: boolean;
  isHintQuestion: boolean;
  isHintSelectedQuestion: boolean;
  isHintValueEvidence: boolean;
  isSelected: boolean;
  showSelection: boolean;
  layout: Pick<ViewStyle, 'height' | 'left' | 'top' | 'width'>;
  onSelectCell(cell: CellIndex): void;
  placement: Digit | null;
  premiseMask: CandidateMask;
  palette: BoardColors;
  strikeAngle: BoardTheme['marks']['strikeAngle'];
  styles: BoardStyles;
  t: Translate;
  transition: Animated.Value;
  regionRevealIndex: number | null;
  candidateRevealOrder?: readonly Digit[];
  value: CellValue;
  showCandidates: boolean;
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
  priorEliminationMask,
  focusMatch,
  focusedMask,
  highlightedMask,
  uniqueNoteDigit,
  hypotheticalValue,
  diagramDigit,
  isDiagramEmpty,
  isError,
  fullHouseDigit,
  onCompleteFullHouse,
  isGiven,
  isHintFocus,
  isKiteBackground,
  isHintRegion,
  isHintTarget,
  isHintQuestion,
  isHintSelectedQuestion,
  isHintValueEvidence,
  isSelected,
  showSelection,
  layout,
  onSelectCell,
  placement,
  premiseMask,
  palette,
  strikeAngle,
  styles,
  t,
  transition,
  regionRevealIndex,
  candidateRevealOrder,
  value,
  showCandidates,
}: SudokuCellProps): React.JSX.Element {
  const accessibilityParts = [
    t('board.cell', {
      row: Math.floor(cell / 9) + 1,
      column: (cell % 9) + 1,
    }),
    value ? String(value) : t('board.empty'),
  ];
  if (value === null && showCandidates) {
    const visibleCandidates = digitsFromMask(candidateMask);
    if (visibleCandidates.length > 0) {
      accessibilityParts.push(
        t('board.candidates', { digits: visibleCandidates.join(', ') }),
      );
    }
  }
  if (isDiagramEmpty && diagramDigit !== null)
    accessibilityParts.push(
      t('board.emptyRectangleCell', { digit: diagramDigit }),
    );
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
      accessibilityParts.push(
        hypotheticalValue.conflictRegion
          ? t('board.hypotheticalConflictIn', {
              region: hypotheticalValue.conflictRegion,
            })
          : t('board.hypotheticalConflict'),
      );
  }
  if (isError) {
    accessibilityParts.push(t('board.incorrect'));
  }
  if (uniqueNoteDigit !== null) {
    accessibilityParts.push(t('board.uniqueNote', { digit: uniqueNoteDigit }));
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
      ? backgroundColor
      : cellRole === 'result'
      ? backgroundColor
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
      style={[
        styles.cell,
        layout,
        {
          backgroundColor:
            regionRevealIndex === null
              ? backgroundColor
              : boardCellSurface(palette, cell),
        },
      ]}
      testID={`sudoku-cell-index-${cell}`}
    >
      {regionRevealIndex !== null ? (
        <Animated.View
          pointerEvents="none"
          testID={`sudoku-region-reveal-${cell}`}
          style={[
            styles.cellRoleFill,
            {
              backgroundColor,
              opacity: transition.interpolate({
                inputRange:
                  regionRevealIndex === 0 ? [0, 0.4, 1] : [0, 0.45, 1],
                outputRange: regionRevealIndex === 0 ? [0, 1, 1] : [0, 0, 1],
              }),
            },
          ]}
        />
      ) : null}
      {isDiagramEmpty ? (
        <View
          pointerEvents="none"
          accessible={false}
          style={styles.emptyRectangleHatch}
          testID={`sudoku-empty-rectangle-${cell}`}
        >
          {Array.from({ length: 9 }, (_, index) => (
            <View
              key={index}
              style={[
                styles.emptyRectangleStripe,
                { top: `${index * 20 - 30}%` },
              ]}
            />
          ))}
        </View>
      ) : null}
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
          style={[
            styles.hintTarget,
            isHintQuestion && styles.hintQuestion,
            isHintSelectedQuestion && styles.hintSelectedQuestion,
          ]}
        />
      ) : null}
      {isSelected && showSelection ? (
        <View
          pointerEvents="none"
          testID={`sudoku-selection-${cell}`}
          style={styles.selection}
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
            diagramDigit !== null &&
              hypotheticalValue.role === 'consequence' &&
              styles.diagramHypothetical,
            {
              backgroundColor: hypotheticalValue.conflict
                ? palette.errorSoft
                : palette.assumptionSoft,
              borderColor: hypotheticalValue.conflict
                ? palette.error
                : palette.assumption,
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
            ✓
          </Text>
          <Text allowFontScaling={false} style={styles.placementDigit}>
            {placement}
          </Text>
        </View>
      ) : diagramDigit !== null ? (
        hasCandidate(candidateMask, diagramDigit) || eliminationMask !== 0 ? (
          <View
            testID={`sudoku-diagram-${cell}`}
            style={[
              styles.diagramCandidate,
              !isHintQuestion &&
                (premiseMask !== 0 || eliminationMask !== 0) &&
                styles.diagramCircle,
              eliminationMask !== 0 && styles.diagramExcluded,
              isKiteBackground && styles.kiteBackground,
            ]}
          >
            <Text
              allowFontScaling={false}
              style={[
                styles.diagramDigit,
                (isHintQuestion ||
                  (premiseMask === 0 && eliminationMask === 0)) &&
                  styles.diagramPlainDigit,
                eliminationMask !== 0 && styles.candidateElimination,
              ]}
            >
              {diagramDigit}
            </Text>
            {eliminationMask !== 0 ? (
              <View
                testID={`sudoku-diagram-cross-${cell}`}
                style={[
                  styles.diagramStrike,
                  priorEliminationMask !== 0 && styles.diagramStrikePrior,
                ]}
              />
            ) : null}
          </View>
        ) : null
      ) : (showCandidates && candidateMask !== 0) ||
        premiseMask !== 0 ||
        eliminationMask !== 0 ? (
        <CandidateGrid
          dimmed={isKiteBackground}
          candidateMask={candidateMask}
          eliminationMask={eliminationMask}
          premiseMask={premiseMask}
          focusedMask={focusedMask}
          highlightedMask={highlightedMask}
          uniqueNoteDigit={uniqueNoteDigit}
          strikeAngle={strikeAngle}
          styles={styles}
          transition={transition}
          candidateRevealOrder={candidateRevealOrder}
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
  hintAnimationDurationMs = 360,
  hintVisuals,
  replayEliminations = [],
  hintAnimations = true,
  hintSpotlight = true,
  showCandidates = true,
  highlightDigit = null,
  highlightFocusedDigits = false,
  showSelection = true,
  blendSelectionBackground = !showSelection,
  highlightRegions = true,
  highlightSameDigit = true,
  candidateNoteAssist,
  fullHouseAssist = false,
  onCompleteFullHouse,
  onSelectCell,
}: SudokuBoardProps): React.JSX.Element {
  const { height, width } = useWindowDimensions();
  const { t } = useLocalization();
  const { boardTheme } = useAppTheme();
  const palette = boardTheme.colors;
  const boardLayout = sudokuBoardLayout(width, height);
  const boardSize = PixelRatio.roundToNearestPixel(
    Math.min(boardLayout.boardSize, maxSize ?? Infinity),
  );
  const styles = React.useMemo(
    () => createBoardStyles(boardTheme, boardLayout.textScale, boardSize),
    [boardLayout.textScale, boardSize, boardTheme],
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
      duration:
        hintVisuals?.regionRevealOrder?.length ||
        hintVisuals?.candidateRevealOrder?.length
          ? Math.max(hintAnimationDurationMs, 900)
          : hintAnimationDurationMs,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [hintAnimationDurationMs, hintVisuals, reduceMotion, sceneTransition]);
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
  const highlightedDigits =
    hintVisuals && highlightFocusedDigits
      ? activeFocusedDigits
      : !hintVisuals &&
        activeFocusedDigits.length === 0 &&
        highlightSameDigit &&
        selectedValue
      ? [selectedValue]
      : EMPTY_DIGITS;
  const highlightedMask = highlightedDigits.reduce(addCandidate, 0);
  const candidates =
    hintVisuals && state.candidates.hintCandidates
      ? state.candidates.hintCandidates
      : state.candidates.activeCandidateSource === 'quick'
      ? state.candidates.quickCandidates
      : state.candidates.manualCandidates;
  const noteAssistActive =
    candidateNoteAssist === true &&
    state.candidates.pencilMode &&
    showCandidates &&
    !disabled &&
    !hintVisuals &&
    !state.activeHint &&
    state.status === 'active' &&
    activeFocusedDigits.length === 0 &&
    selectedValue !== null;
  const noteHighlightedMask = noteAssistActive
    ? addCandidate(0, selectedValue)
    : candidateNoteAssist === undefined ||
      !state.candidates.pencilMode ||
      hintVisuals
    ? highlightedMask
    : 0;
  const uniqueNotes = React.useMemo(
    () =>
      noteAssistActive
        ? uniqueCandidateNotes(state.values, candidates, selectedValue)
        : new Set<CellIndex>(),
    [noteAssistActive, state.values, candidates, selectedValue],
  );
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
  const replayEliminationMasks = evidenceMasks(
    hintVisuals ? [] : replayEliminations,
  );
  const priorEliminationMasks = evidenceMasks(
    hintVisuals?.priorEliminations ?? [],
  );
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

  const fishRegions = regionMarks.filter(
    mark => mark.role === 'fishBase' || mark.role === 'fishCover',
  );
  return (
    <View style={styles.boardContainer}>
      <View
        accessibilityElementsHidden={accessibilityHidden}
        accessibilityLabel={t('board.label')}
        collapsable={false}
        importantForAccessibility={
          accessibilityHidden ? 'no-hide-descendants' : 'auto'
        }
        style={[styles.board, { width: boardSize, height: boardSize }]}
        testID="sudoku-board"
      >
        {state.values.map((value, cell) => {
          const candidateMask = showCandidates ? candidates[cell] : 0;
          const focusMatch = candidateFocusMatch(
            value,
            candidateMask,
            activeFocusedDigits,
          );
          const isSelected = selected === cell;
          const isPeer =
            highlightRegions &&
            selected !== null &&
            (arePeers(selected, cell) ||
              (blendSelectionBackground && isSelected));
          const isSameDigit =
            value !== null && hasCandidate(highlightedMask, value);
          const isGiven = state.givens[cell] !== null;
          const isError = errors.has(cell);
          const isHintFocus = hintFocus.has(cell);
          const isKiteBackground =
            !!hintVisuals?.links?.length &&
            (hintVisuals.diagramDigit
              ? !isHintFocus
              : !hintVisuals.spotlightCells?.includes(cell));
          const isHintRegion = focusRegions.some(region =>
            cellIsInRegion(cell, region),
          );
          const isHintValueEvidence = valueEvidence.has(cell);
          const cellRole = cellRoles.get(cell) ?? null;
          const isHintTarget = cellRole === 'result';
          const placement = placements.get(cell) ?? null;
          const fullHouseDigit = fullHousePlacements.get(cell) ?? null;
          const diagramRegionMarks = hintVisuals?.diagramRegions?.filter(mark =>
            cellIsInRegion(cell, mark.region),
          );
          const diagramRegionConflict = diagramRegionMarks?.some(
            mark => mark.conflict,
          );
          const cellRegions = regionMarks.filter(mark =>
            cellIsInRegion(cell, mark.region),
          );
          const backgroundColor = hintVisuals
            ? hintBackground(palette, {
                baseSurface: boardCellSurface(palette, cell),
                regions: cellRegions,
                cellRole,
                focused: isHintFocus || (highlightFocusedDigits && isSameDigit),
                conflict: isError || !!diagramRegionConflict,
              })
            : isError
            ? palette.errorSoft
            : fullHouseDigit !== null
            ? palette.hintResult
            : focusMatch === 'exact' ||
              (focusMatch === 'occurrence' && value !== null)
            ? focusMatch === 'exact'
              ? palette.focusExact
              : palette.focusSoft
            : isSameDigit
            ? palette.sameDigit
            : isPeer
            ? palette.peer
            : boardCellSurface(palette, cell);
          return (
            <SudokuCell
              key={cell}
              accessibilityHidden={accessibilityHidden}
              backgroundColor={backgroundColor}
              candidateMask={candidateMask}
              cell={cell}
              cellRole={cellRole}
              disabled={disabled}
              eliminationMask={
                (hintVisuals ? eliminationMasks : replayEliminationMasks).get(
                  cell,
                ) ?? 0
              }
              explanatoryEliminationMask={
                explanatoryEliminationMasks.get(cell) ?? 0
              }
              priorEliminationMask={priorEliminationMasks.get(cell) ?? 0}
              focusMatch={focusMatch}
              focusedMask={
                value === null && (!hintVisuals?.links?.length || isHintFocus)
                  ? hintVisuals
                    ? focusedMask
                    : intersectCandidateMasks(focusedMask, candidateMask)
                  : 0
              }
              highlightedMask={
                value === null
                  ? intersectCandidateMasks(noteHighlightedMask, candidateMask)
                  : 0
              }
              uniqueNoteDigit={uniqueNotes.has(cell) ? selectedValue : null}
              hypotheticalValue={hypotheticalValues.get(cell) ?? null}
              diagramDigit={hintVisuals?.diagramDigit ?? null}
              isDiagramEmpty={
                hintVisuals?.diagramEmptyCells?.includes(cell) ?? false
              }
              isError={isError}
              fullHouseDigit={fullHouseDigit}
              onCompleteFullHouse={onCompleteFullHouse}
              isGiven={isGiven}
              isHintFocus={isHintFocus}
              isKiteBackground={isKiteBackground}
              isHintRegion={isHintRegion}
              isHintTarget={isHintTarget}
              isHintQuestion={
                hintVisuals?.questionCells?.includes(cell) ?? false
              }
              isHintSelectedQuestion={
                hintVisuals?.selectedQuestionCell === cell
              }
              isHintValueEvidence={isHintValueEvidence}
              isSelected={isSelected}
              showSelection={showSelection}
              layout={cellLayouts[cell]}
              onSelectCell={onSelectCell}
              placement={placement}
              premiseMask={premiseMasks.get(cell) ?? 0}
              palette={palette}
              strikeAngle={boardTheme.marks.strikeAngle}
              styles={styles}
              t={t}
              regionRevealIndex={(() => {
                const index =
                  hintVisuals?.regionRevealOrder?.findIndex(region =>
                    cellIsInRegion(cell, region),
                  ) ?? -1;
                return index < 0 ? null : index;
              })()}
              candidateRevealOrder={hintVisuals?.candidateRevealOrder}
              transition={sceneTransition}
              value={value}
              showCandidates={showCandidates}
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
                      backgroundColor: link.conflict
                        ? palette.error
                        : palette.hintCandidate,
                      borderColor: link.conflict
                        ? palette.error
                        : palette.hintCandidate,
                    },
                  ]}
                />
              )),
            )}
          </View>
        ) : null}
        {hintVisuals?.colorMarks?.map(mark => (
          <View
            pointerEvents="none"
            key={`color:${mark.cell}:${mark.digit}`}
            testID={`sudoku-color-${mark.component}-${mark.color}-${mark.cell}-${mark.digit}`}
            accessibilityLabel={`${mark.component + 1}${
              mark.color === 0 ? 'A' : 'B'
            }: ${mark.digit}`}
            style={[
              styles.teachingColorFrame,
              mark.color === 0 && styles.teachingColorRounded,
              {
                left: ((mark.cell % 9) * boardSize) / 9 + 2,
                top: (Math.floor(mark.cell / 9) * boardSize) / 9 + 2,
                width: boardSize / 9 - 4,
                height: boardSize / 9 - 4,
                borderColor: mark.color === 0 ? palette.groupA : palette.groupB,
              },
            ]}
          >
            <Text allowFontScaling={false} style={styles.teachingColorLabel}>
              {`${mark.component + 1}${mark.color === 0 ? 'A' : 'B'}`}
            </Text>
          </View>
        ))}
        {hintVisuals?.candidateGroups?.flatMap(group =>
          group.candidates.map(candidate => (
            <View
              pointerEvents="none"
              key={`group:${group.id}:${candidate.cell}:${candidate.digit}`}
              testID={`sudoku-group-${group.id}-${candidate.cell}-${candidate.digit}`}
              style={[
                styles.teachingGroupFrame,
                {
                  left: ((candidate.cell % 9) * boardSize) / 9 + 3,
                  top: (Math.floor(candidate.cell / 9) * boardSize) / 9 + 3,
                  width: boardSize / 9 - 6,
                  height: boardSize / 9 - 6,
                },
              ]}
            >
              <Text
                allowFontScaling={false}
                style={styles.teachingGroupLabel}
              >{`{${group.id}}`}</Text>
            </View>
          )),
        )}
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
        {hintVisuals?.diagramBox !== undefined ? (
          <View
            pointerEvents="none"
            accessible={false}
            testID="sudoku-diagram-box"
            style={[
              styles.diagramBox,
              {
                left: ((hintVisuals.diagramBox % 3) * boardSize) / 3,
                top: (Math.floor(hintVisuals.diagramBox / 3) * boardSize) / 3,
                width: boardSize / 3,
                height: boardSize / 3,
              },
            ]}
          />
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
      {fishRegions.length > 0 && !accessibilityHidden ? (
        <View
          style={[styles.fishLegend, { width: boardSize }]}
          testID="sudoku-fish-legend"
        >
          {(['fishBase', 'fishCover'] as const).map(role => {
            const regions = fishRegions.filter(mark => mark.role === role);
            if (!regions.length) return null;
            return (
              <View key={role} style={styles.fishLegendItem}>
                <View
                  accessible={false}
                  style={[
                    styles.fishLegendSwatch,
                    role === 'fishBase'
                      ? styles.fishBaseSwatch
                      : styles.fishCoverSwatch,
                  ]}
                />
                <Text style={styles.fishLegendText}>
                  {t(
                    role === 'fishBase' ? 'board.fishBase' : 'board.fishCover',
                  )}
                  {' · '}
                  {regions
                    .map(
                      mark =>
                        `${mark.region.kind === 'row' ? 'R' : 'C'}${
                          mark.region.index + 1
                        }`,
                    )
                    .join(' ')}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export const SudokuBoard = React.memo(SudokuBoardComponent);
