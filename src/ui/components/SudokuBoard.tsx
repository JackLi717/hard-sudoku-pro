import React from 'react';
import {
  PixelRatio,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { GameState } from '../../domain/game/contracts';
import { HintPageVisuals } from '../../domain/hints/presentation';
import {
  addCandidate,
  arePeers,
  digitsFromMask,
  hasCandidate,
} from '../../domain/sudoku/board';
import {
  CandidateMask,
  CandidateRef,
  CellIndex,
  CellValue,
  Digit,
  RegionRef,
} from '../../domain/sudoku/contracts';
import { palette } from '../theme';

type SudokuBoardProps = {
  state: GameState;
  disabled?: boolean;
  hintVisuals?: HintPageVisuals;
  onSelectCell(cell: CellIndex): void;
};

const DIGITS: readonly Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const GRID_INDICES = Array.from({ length: 10 }, (_, index) => index);

function candidateSlotPosition(digit: Digit): ViewStyle {
  const index = digit - 1;
  return {
    left: `${(index % 3) * 33.333333}%`,
    top: `${Math.floor(index / 3) * 33.333333}%`,
  };
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
  candidateMask,
  premiseMask,
  eliminationMask,
}: {
  candidateMask: CandidateMask;
  premiseMask: CandidateMask;
  eliminationMask: CandidateMask;
}): React.JSX.Element {
  return (
    <View style={styles.candidateGrid} testID="sudoku-candidate-grid">
      {DIGITS.map(digit => {
        const premise = hasCandidate(premiseMask, digit);
        const eliminated = hasCandidate(eliminationMask, digit);
        const visible =
          hasCandidate(candidateMask, digit) || premise || eliminated;
        if (!visible) {
          return null;
        }
        return (
          <View
            key={digit}
            style={[styles.candidateSlot, candidateSlotPosition(digit)]}
            testID={`sudoku-candidate-slot-${digit}`}
          >
            <Text
              style={[
                styles.candidateDigit,
                premise && styles.candidatePremise,
                eliminated && styles.candidateElimination,
              ]}
            >
              {visible ? digit : ' '}
            </Text>
            {eliminated ? <Text style={styles.eliminationMark}>×</Text> : null}
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

function regionOverlay(region: RegionRef, boardSize: number): ViewStyle {
  const coordinate = (index: number) =>
    PixelRatio.roundToNearestPixel((index * boardSize) / 9);
  if (region.kind === 'row') {
    const top = coordinate(region.index);
    return {
      height: coordinate(region.index + 1) - top,
      left: 0,
      top,
      width: boardSize,
    };
  }
  if (region.kind === 'column') {
    const left = coordinate(region.index);
    return {
      height: boardSize,
      left,
      top: 0,
      width: coordinate(region.index + 1) - left,
    };
  }
  const row = Math.floor(region.index / 3) * 3;
  const column = (region.index % 3) * 3;
  const left = coordinate(column);
  const top = coordinate(row);
  return {
    height: coordinate(row + 3) - top,
    left,
    top,
    width: coordinate(column + 3) - left,
  };
}

type SudokuCellProps = {
  backgroundColor: string;
  candidateMask: CandidateMask;
  cell: CellIndex;
  disabled: boolean;
  eliminationMask: CandidateMask;
  isError: boolean;
  isGiven: boolean;
  isHintFocus: boolean;
  isHintRegion: boolean;
  isHintTarget: boolean;
  isSelected: boolean;
  layout: Pick<ViewStyle, 'height' | 'left' | 'top' | 'width'>;
  onSelectCell(cell: CellIndex): void;
  placement: Digit | null;
  premiseMask: CandidateMask;
  value: CellValue;
};

const SudokuCell = React.memo(function SudokuCellView({
  backgroundColor,
  candidateMask,
  cell,
  disabled,
  eliminationMask,
  isError,
  isGiven,
  isHintFocus,
  isHintRegion,
  isHintTarget,
  isSelected,
  layout,
  onSelectCell,
  placement,
  premiseMask,
  value,
}: SudokuCellProps): React.JSX.Element {
  const accessibilityParts = [
    `Row ${Math.floor(cell / 9) + 1}, column ${(cell % 9) + 1}`,
    value ? String(value) : 'empty',
  ];
  if (value === null) {
    const visibleCandidates = digitsFromMask(candidateMask);
    if (visibleCandidates.length > 0) {
      accessibilityParts.push(`candidates ${visibleCandidates.join(', ')}`);
    }
  }
  if (isError) {
    accessibilityParts.push('incorrect value');
  }
  if (isHintRegion) {
    accessibilityParts.push('hint focus region');
  }
  if (isHintFocus) {
    accessibilityParts.push('hint focus cell');
  }
  const premiseDigits = digitsFromMask(premiseMask);
  const eliminatedDigits = digitsFromMask(eliminationMask);
  if (premiseDigits.length > 0) {
    accessibilityParts.push(`hint premise ${premiseDigits.join(', ')}`);
  }
  if (eliminatedDigits.length > 0) {
    accessibilityParts.push(`remove candidate ${eliminatedDigits.join(', ')}`);
  }
  if (placement !== null) {
    accessibilityParts.push(`place ${placement}`);
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityParts.join(', ')}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled }}
      disabled={disabled}
      onPress={() => onSelectCell(cell)}
      style={[styles.cell, layout, { backgroundColor }]}
    >
      {isHintTarget ? (
        <View pointerEvents="none" style={styles.hintTarget} />
      ) : null}
      {value ? (
        <Text
          style={[
            styles.value,
            isGiven ? styles.given : styles.player,
            isError && styles.error,
          ]}
        >
          {value}
        </Text>
      ) : placement !== null ? (
        <View style={styles.placementResult}>
          <Text style={styles.placementMark}>+</Text>
          <Text style={styles.placementDigit}>{placement}</Text>
        </View>
      ) : candidateMask !== 0 || premiseMask !== 0 || eliminationMask !== 0 ? (
        <CandidateGrid
          candidateMask={candidateMask}
          eliminationMask={eliminationMask}
          premiseMask={premiseMask}
        />
      ) : null}
    </Pressable>
  );
});

function SudokuBoardComponent({
  state,
  disabled = false,
  hintVisuals,
  onSelectCell,
}: SudokuBoardProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const boardSize = PixelRatio.roundToNearestPixel(Math.min(width - 24, 540));
  const cellLayouts = React.useMemo(
    () => Array.from({ length: 81 }, (_, cell) => cellLayout(cell, boardSize)),
    [boardSize],
  );
  const selected = state.selectedCell;
  const selectedValue = selected === null ? null : state.values[selected];
  const candidates =
    state.candidates.activeCandidateSource === 'quick'
      ? state.candidates.quickCandidates
      : state.candidates.manualCandidates;
  const errors = new Set(state.incorrectCells);
  const hint = state.activeHint;
  const focusRegions = hintVisuals?.showFocusRegions
    ? hint?.focusRegions ?? []
    : [];
  const hintFocus = new Set(
    hintVisuals?.showFocusCells ? hint?.focusCells ?? [] : [],
  );
  const premiseMasks = evidenceMasks(
    hintVisuals?.showPremises ? hint?.premiseCandidates ?? [] : [],
  );
  const eliminationMasks = evidenceMasks(
    hintVisuals?.showEliminations ? hint?.eliminations ?? [] : [],
  );
  const placements = new Map(
    hintVisuals?.showPlacements
      ? (hint?.placements ?? []).map(placement => [
          placement.cell,
          placement.digit,
        ])
      : [],
  );
  const eliminationCells = new Set(eliminationMasks.keys());

  return (
    <View
      accessibilityLabel="Sudoku board"
      style={[styles.board, { width: boardSize, height: boardSize }]}
    >
      {state.values.map((value, cell) => {
        const isSelected = selected === cell;
        const isPeer = selected !== null && arePeers(selected, cell);
        const isSameDigit = selectedValue !== null && value === selectedValue;
        const isGiven = state.givens[cell] !== null;
        const isError = errors.has(cell);
        const isHintFocus = hintFocus.has(cell);
        const isHintRegion = focusRegions.some(region =>
          cellIsInRegion(cell, region),
        );
        const isHintTarget = eliminationCells.has(cell) || placements.has(cell);
        const isHintEvidence = premiseMasks.has(cell);
        const isHintDimmed =
          hintVisuals !== undefined &&
          !isHintFocus &&
          !isHintRegion &&
          !isHintTarget &&
          !isHintEvidence;
        const placement = placements.get(cell) ?? null;
        const backgroundColor = isError
          ? palette.errorSoft
          : isSelected
          ? palette.selected
          : isHintTarget
          ? '#F7E5BE'
          : isHintFocus
          ? palette.accentSoft
          : isHintRegion
          ? palette.hintRegion
          : isSameDigit
          ? palette.sameDigit
          : isPeer
          ? palette.peer
          : isHintDimmed
          ? palette.hintDim
          : palette.surface;
        const candidateMask = candidates[cell];
        return (
          <SudokuCell
            key={cell}
            backgroundColor={backgroundColor}
            candidateMask={candidateMask}
            cell={cell}
            disabled={disabled}
            eliminationMask={eliminationMasks.get(cell) ?? 0}
            isError={isError}
            isGiven={isGiven}
            isHintFocus={isHintFocus}
            isHintRegion={isHintRegion}
            isHintTarget={isHintTarget}
            isSelected={isSelected}
            layout={cellLayouts[cell]}
            onSelectCell={onSelectCell}
            placement={placement}
            premiseMask={premiseMasks.get(cell) ?? 0}
            value={value}
          />
        );
      })}
      {focusRegions.map(region => (
        <View
          key={`${region.kind}:${region.index}`}
          pointerEvents="none"
          style={[styles.regionOutline, regionOverlay(region, boardSize)]}
        />
      ))}
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

const styles = StyleSheet.create({
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
  value: {
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    lineHeight: 29,
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
  candidateDigit: {
    color: palette.accent,
    fontSize: 9,
    fontVariant: ['tabular-nums'],
    lineHeight: 11,
    textAlign: 'center',
  },
  candidatePremise: {
    fontWeight: '900',
    textDecorationLine: 'underline',
  },
  candidateElimination: {
    color: palette.error,
    fontWeight: '900',
    textDecorationLine: 'line-through',
  },
  eliminationMark: {
    color: palette.error,
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 8,
    position: 'absolute',
    right: 0,
    top: -1,
  },
  placementResult: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  placementMark: {
    color: palette.accentWarm,
    fontSize: 12,
    fontWeight: '900',
    marginRight: 1,
  },
  placementDigit: {
    color: palette.accent,
    fontSize: 24,
    fontWeight: '900',
  },
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
  regionOutline: {
    borderColor: palette.accent,
    borderRadius: 3,
    borderWidth: 2,
    position: 'absolute',
    zIndex: 3,
  },
  gridLine: {
    backgroundColor: palette.lineStrong,
    position: 'absolute',
    zIndex: 4,
  },
});
