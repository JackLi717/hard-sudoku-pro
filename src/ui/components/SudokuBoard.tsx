import React from 'react';
import {
  AccessibilityInfo,
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
import {
  HintCellRole,
  HintPageVisuals,
  HintRegionMark,
} from '../../domain/hints/presentation';
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
  transition,
}: {
  candidateMask: CandidateMask;
  premiseMask: CandidateMask;
  eliminationMask: CandidateMask;
  transition: Animated.Value;
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
                style={[
                  styles.candidateDigit,
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
  backgroundColor: string;
  candidateMask: CandidateMask;
  cell: CellIndex;
  cellRole: HintCellRole | null;
  disabled: boolean;
  eliminationMask: CandidateMask;
  explanatoryEliminationMask: CandidateMask;
  isError: boolean;
  isGiven: boolean;
  isHintFocus: boolean;
  isHintRegion: boolean;
  isHintTarget: boolean;
  isHintValueEvidence: boolean;
  isSelected: boolean;
  layout: Pick<ViewStyle, 'height' | 'left' | 'top' | 'width'>;
  onSelectCell(cell: CellIndex): void;
  placement: Digit | null;
  premiseMask: CandidateMask;
  transition: Animated.Value;
  value: CellValue;
};

const SudokuCell = React.memo(function SudokuCellView({
  backgroundColor,
  candidateMask,
  cell,
  cellRole,
  disabled,
  eliminationMask,
  explanatoryEliminationMask,
  isError,
  isGiven,
  isHintFocus,
  isHintRegion,
  isHintTarget,
  isHintValueEvidence,
  isSelected,
  layout,
  onSelectCell,
  placement,
  premiseMask,
  transition,
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
  if (isHintValueEvidence) {
    accessibilityParts.push('placed value used as hint evidence');
  }
  const premiseDigits = digitsFromMask(premiseMask);
  const explanatoryEliminatedDigits = digitsFromMask(
    explanatoryEliminationMask,
  );
  const eliminatedDigits = digitsFromMask(eliminationMask).filter(
    digit => !hasCandidate(explanatoryEliminationMask, digit),
  );
  if (premiseDigits.length > 0) {
    accessibilityParts.push(`hint premise ${premiseDigits.join(', ')}`);
  }
  if (eliminatedDigits.length > 0) {
    accessibilityParts.push(`remove candidate ${eliminatedDigits.join(', ')}`);
  }
  if (explanatoryEliminatedDigits.length > 0) {
    accessibilityParts.push(
      `candidate ruled out ${explanatoryEliminatedDigits.join(', ')}`,
    );
  }
  if (placement !== null) {
    accessibilityParts.push(`place ${placement}`);
  }
  if (cellRole === 'potential') {
    accessibilityParts.push('potential pattern cell');
  } else if (cellRole === 'established') {
    accessibilityParts.push('established pattern cell');
  } else if (cellRole === 'eliminationTarget') {
    accessibilityParts.push('affected candidate cell');
  } else if (cellRole === 'result') {
    accessibilityParts.push('hint result cell');
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
      accessibilityLabel={accessibilityParts.join(', ')}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected, disabled }}
      disabled={disabled}
      onPress={() => onSelectCell(cell)}
      style={[styles.cell, layout, { backgroundColor }]}
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
      {isHintTarget ? (
        <View pointerEvents="none" style={styles.hintTarget} />
      ) : null}
      {value ? (
        <Text
          style={[
            styles.value,
            isGiven ? styles.given : styles.player,
            isError && styles.error,
            isHintValueEvidence && styles.valueEvidence,
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
          transition={transition}
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
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const sceneTransition = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
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
  const boardSize = PixelRatio.roundToNearestPixel(Math.min(width - 24, 540));
  const cellLayouts = React.useMemo(
    () => Array.from({ length: 81 }, (_, cell) => cellLayout(cell, boardSize)),
    [boardSize],
  );
  const selected = state.selectedCell;
  const selectedValue = selected === null ? null : state.values[selected];
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
    cellRoles.forEach((_, cell) => visibleCells.add(cell));
  }
  const dimRuns =
    hintVisuals && visibleCells.size > 0
      ? dimOverlayRuns(visibleCells, boardSize)
      : [];
  const dimEntrance = sceneTransition.interpolate({
    inputRange: [0, 0.42, 1],
    outputRange: [0, 1, 1],
  });

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
        const isHintValueEvidence = valueEvidence.has(cell);
        const cellRole = cellRoles.get(cell) ?? null;
        const isHintTarget = cellRole === 'result';
        const placement = placements.get(cell) ?? null;
        const backgroundColor = isError
          ? palette.errorSoft
          : hintVisuals
          ? palette.surface
          : isSelected
          ? palette.selected
          : isSameDigit
          ? palette.sameDigit
          : isPeer
          ? palette.peer
          : palette.surface;
        const candidateMask = candidates[cell];
        return (
          <SudokuCell
            key={cell}
            backgroundColor={backgroundColor}
            candidateMask={candidateMask}
            cell={cell}
            cellRole={cellRole}
            disabled={disabled}
            eliminationMask={eliminationMasks.get(cell) ?? 0}
            explanatoryEliminationMask={
              explanatoryEliminationMasks.get(cell) ?? 0
            }
            isError={isError}
            isGiven={isGiven}
            isHintFocus={isHintFocus}
            isHintRegion={isHintRegion}
            isHintTarget={isHintTarget}
            isHintValueEvidence={isHintValueEvidence}
            isSelected={isSelected}
            layout={cellLayouts[cell]}
            onSelectCell={onSelectCell}
            placement={placement}
            premiseMask={premiseMasks.get(cell) ?? 0}
            transition={sceneTransition}
            value={value}
          />
        );
      })}
      {dimRuns.length > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.spotlightMask, { opacity: dimEntrance }]}
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
  cellRoleFill: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
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
  valueEvidence: {
    color: palette.hintCandidate,
    fontWeight: '900',
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
    fontSize: 9,
    fontVariant: ['tabular-nums'],
    lineHeight: 11,
    textAlign: 'center',
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
