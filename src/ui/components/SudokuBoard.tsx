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
import { arePeers, hasCandidate } from '../../domain/sudoku/board';
import { CellIndex, Digit } from '../../domain/sudoku/contracts';
import { palette } from '../theme';

type SudokuBoardProps = {
  state: GameState;
  disabled?: boolean;
  onSelectCell(cell: CellIndex): void;
};

function candidateGrid(mask: number): React.JSX.Element {
  return (
    <View style={styles.candidateGrid}>
      {([1, 2, 3, 4, 5, 6, 7, 8, 9] as Digit[]).map(digit => (
        <Text key={digit} style={styles.candidateDigit}>
          {hasCandidate(mask, digit) ? digit : ' '}
        </Text>
      ))}
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

export function SudokuBoard({
  state,
  disabled = false,
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
  const hintFocus = new Set(state.activeHint?.focusCells ?? []);
  const hintTargets = new Set(
    [
      ...(state.activeHint?.eliminations ?? []),
      ...(state.activeHint?.placements ?? []),
    ].map(candidate => candidate.cell),
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
        const isHintTarget = hintTargets.has(cell);
        const backgroundColor = isError
          ? palette.errorSoft
          : isSelected
          ? palette.selected
          : isHintTarget
          ? '#F7E5BE'
          : isHintFocus
          ? palette.accentSoft
          : isSameDigit
          ? palette.sameDigit
          : isPeer
          ? palette.peer
          : palette.surface;
        return (
          <Pressable
            key={cell}
            accessibilityLabel={`Row ${Math.floor(cell / 9) + 1}, column ${
              (cell % 9) + 1
            }${value ? `, ${value}` : ', empty'}`}
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
            ) : (
              candidateGrid(candidates[cell])
            )}
          </Pressable>
        );
      })}
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
  candidateDigit: {
    color: palette.accent,
    fontSize: 9,
    fontVariant: ['tabular-nums'],
    lineHeight: 12,
    textAlign: 'center',
    width: '33.333333%',
  },
  hintTarget: {
    borderColor: palette.accentWarm,
    borderWidth: 2,
  },
});
