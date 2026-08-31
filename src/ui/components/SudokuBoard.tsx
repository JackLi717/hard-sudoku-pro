import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { GameState } from '../../domain/game/contracts';
import { HintPageVisuals } from '../../domain/hints/presentation';
import {
  arePeers,
  digitsFromMask,
  hasCandidate,
} from '../../domain/sudoku/board';
import {
  CandidateRef,
  CellIndex,
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

function candidateKey(candidate: CandidateRef): string {
  return `${candidate.cell}:${candidate.digit}`;
}

function candidateGrid(
  cell: CellIndex,
  mask: number,
  premises: ReadonlySet<string>,
  eliminations: ReadonlySet<string>,
): React.JSX.Element {
  return (
    <View style={styles.candidateGrid}>
      {([1, 2, 3, 4, 5, 6, 7, 8, 9] as Digit[]).map(digit => {
        const key = `${cell}:${digit}`;
        const premise = premises.has(key);
        const eliminated = eliminations.has(key);
        const visible = hasCandidate(mask, digit) || premise || eliminated;
        return (
          <View key={digit} style={styles.candidateSlot}>
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
}

function cellBorder(cell: number): StyleProp<ViewStyle> {
  const row = Math.floor(cell / 9);
  const column = cell % 9;
  return {
    borderRightWidth: column === 8 ? 0 : column === 2 || column === 5 ? 2 : 0.5,
    borderBottomWidth: row === 8 ? 0 : row === 2 || row === 5 ? 2 : 0.5,
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

function regionOverlay(region: RegionRef, boardSize: number): ViewStyle {
  const cellSize = boardSize / 9;
  if (region.kind === 'row') {
    return {
      height: cellSize,
      left: 0,
      top: region.index * cellSize,
      width: boardSize,
    };
  }
  if (region.kind === 'column') {
    return {
      height: boardSize,
      left: region.index * cellSize,
      top: 0,
      width: cellSize,
    };
  }
  return {
    height: cellSize * 3,
    left: (region.index % 3) * cellSize * 3,
    top: Math.floor(region.index / 3) * cellSize * 3,
    width: cellSize * 3,
  };
}

export function SudokuBoard({
  state,
  disabled = false,
  hintVisuals,
  onSelectCell,
}: SudokuBoardProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 24, 540);
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
  const premises = new Set(
    hintVisuals?.showPremises
      ? (hint?.premiseCandidates ?? []).map(candidateKey)
      : [],
  );
  const eliminations = new Set(
    hintVisuals?.showEliminations
      ? (hint?.eliminations ?? []).map(candidateKey)
      : [],
  );
  const placements = new Map(
    hintVisuals?.showPlacements
      ? (hint?.placements ?? []).map(placement => [
          placement.cell,
          placement.digit,
        ])
      : [],
  );
  const premiseCells = new Set(
    hintVisuals?.showPremises
      ? (hint?.premiseCandidates ?? []).map(candidate => candidate.cell)
      : [],
  );
  const eliminationCells = new Set(
    hintVisuals?.showEliminations
      ? (hint?.eliminations ?? []).map(candidate => candidate.cell)
      : [],
  );

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
        const isHintEvidence = premiseCells.has(cell);
        const isHintDimmed =
          hintVisuals !== undefined &&
          !isHintFocus &&
          !isHintRegion &&
          !isHintTarget &&
          !isHintEvidence;
        const placement = placements.get(cell);
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
        const accessibilityParts = [
          `Row ${Math.floor(cell / 9) + 1}, column ${(cell % 9) + 1}`,
          value ? String(value) : 'empty',
        ];
        if (value === null) {
          const visibleCandidates = digitsFromMask(candidateMask);
          if (visibleCandidates.length > 0) {
            accessibilityParts.push(
              `candidates ${visibleCandidates.join(', ')}`,
            );
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
        const premiseDigits = (hint?.premiseCandidates ?? [])
          .filter(candidate =>
            hintVisuals?.showPremises ? candidate.cell === cell : false,
          )
          .map(candidate => candidate.digit);
        const eliminatedDigits = (hint?.eliminations ?? [])
          .filter(candidate =>
            hintVisuals?.showEliminations ? candidate.cell === cell : false,
          )
          .map(candidate => candidate.digit);
        if (premiseDigits.length > 0) {
          accessibilityParts.push(`hint premise ${premiseDigits.join(', ')}`);
        }
        if (eliminatedDigits.length > 0) {
          accessibilityParts.push(
            `remove candidate ${eliminatedDigits.join(', ')}`,
          );
        }
        if (placement !== undefined) {
          accessibilityParts.push(`place ${placement}`);
        }
        return (
          <Pressable
            key={cell}
            accessibilityLabel={accessibilityParts.join(', ')}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled }}
            disabled={disabled}
            onPress={() => onSelectCell(cell)}
            style={[
              styles.cell,
              cellBorder(cell),
              { backgroundColor },
              isHintTarget && styles.hintTarget,
            ]}
          >
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
            ) : placement !== undefined ? (
              <View style={styles.placementResult}>
                <Text style={styles.placementMark}>+</Text>
                <Text style={styles.placementDigit}>{placement}</Text>
              </View>
            ) : (
              candidateGrid(cell, candidateMask, premises, eliminations)
            )}
          </Pressable>
        );
      })}
      {focusRegions.map(region => (
        <View
          key={`${region.kind}:${region.index}`}
          pointerEvents="none"
          style={[styles.regionOutline, regionOverlay(region, boardSize)]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    alignSelf: 'center',
    borderColor: palette.lineStrong,
    borderWidth: 2.5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  cell: {
    alignItems: 'center',
    borderColor: palette.lineStrong,
    height: '11.111111%',
    justifyContent: 'center',
    width: '11.111111%',
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
    alignContent: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  candidateSlot: {
    alignItems: 'center',
    height: '33.333333%',
    justifyContent: 'center',
    position: 'relative',
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
    borderWidth: 2,
  },
  regionOutline: {
    borderColor: palette.accent,
    borderRadius: 3,
    borderWidth: 2,
    position: 'absolute',
    zIndex: 3,
  },
});
