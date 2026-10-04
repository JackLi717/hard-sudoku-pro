import React from 'react';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { View } from 'react-native';
import { type BasicScene, regionCells } from '../../data/lessons/basic-lessons';
import { useAppTheme } from '../theme';
import { SudokuBoard, type SudokuBoardState } from './SudokuBoard';
import { addCandidate } from '../../domain/sudoku/board';
import type { Digit } from '../../domain/sudoku/contracts';
import { PLAY_BOARD_EDGE_INSET } from '../layout/adaptive-layout';

/** Read-only teaching diagram, using the game's board colors and candidate positions. */
export function BasicLessonBoard({
  scene,
  size,
  label,
  gameLayout = false,
}: {
  scene: BasicScene;
  size: number;
  label: string;
  gameLayout?: boolean;
}) {
  const { boardTheme } = useAppTheme();
  if (gameLayout) {
    const state: SudokuBoardState = {
      values: scene.values.map(digit => (digit ? (digit as Digit) : null)),
      givens: scene.givens.map(digit => (digit ? (digit as Digit) : null)),
      selectedCell: scene.selected,
      incorrectCells: [],
      status: 'active',
      activeHint: null,
      candidates: {
        manualCandidates: scene.values.map((_, cell) =>
          (scene.notes[cell] ?? []).reduce(
            (mask, digit) => addCandidate(mask, digit as Digit),
            0,
          ),
        ),
        quickCandidates: Array(81).fill(0),
        hintCandidates: null,
        activeCandidateSource: 'manual',
        pencilMode: scene.pencil,
        quickDraftGenerated: false,
        quickDraftBoardFingerprint: null,
        hintBoardFingerprint: null,
      },
    };
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        testID="basic-board"
      >
        <SudokuBoard
          state={state}
          fillAvailableSpace
          maxSize={size - PLAY_BOARD_EDGE_INSET * 2}
          disabled
          accessibilityHidden
          onSelectCell={() => {}}
          highlightSameDigit={false}
          showHintLegend={false}
          hintAnimations={false}
          hintSpotlight={false}
          hintVisuals={
            scene.regions.length
              ? {
                  showFocusCells: false,
                  showFocusRegions: true,
                  showPremises: false,
                  showEliminations: false,
                  showPlacements: false,
                  regionMarks: scene.regions.map(region => ({
                    region,
                    role:
                      region.kind === 'row'
                        ? 'fishCover'
                        : region.kind === 'column'
                        ? 'fishBase'
                        : 'source',
                  })),
                }
              : undefined
          }
        />
      </View>
    );
  }
  const colors = boardTheme.colors;
  const regions = scene.regions.map(regionCells);
  const regionColors = [
    colors.fishCoverSoft,
    colors.fishBaseSoft,
    colors.colorGroup4Soft,
  ];
  const borderColors = [colors.fishCover, colors.fishBase, colors.accent];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      testID="basic-board"
      style={{ paddingHorizontal: PLAY_BOARD_EDGE_INSET }}
    >
      <Svg
        width={size - PLAY_BOARD_EDGE_INSET * 2}
        height={size - PLAY_BOARD_EDGE_INSET * 2}
        viewBox="0 0 450 450"
      >
        <Rect width={450} height={450} fill={colors.surface} />
        {scene.values.map((digit, cell) => {
          const x = (cell % 9) * 50;
          const y = Math.floor(cell / 9) * 50;
          const region = regions.findIndex(cells => cells.includes(cell));
          const tone =
            region >= 0
              ? ['row', 'column', 'box'].indexOf(scene.regions[region].kind)
              : 0;
          const selected = scene.selected === cell;
          const highlighted =
            scene.digit !== undefined && digit === scene.digit;
          const ink = selected
            ? colors.background
            : scene.givens[cell]
            ? colors.ink
            : colors.accent;
          return (
            <G key={cell}>
              <Rect
                x={x}
                y={y}
                width={50}
                height={50}
                fill={
                  selected
                    ? colors.accent
                    : highlighted
                    ? colors.accentSoft
                    : region >= 0
                    ? regionColors[tone]
                    : colors.surface
                }
              />
              {digit ? (
                <SvgText
                  x={x + 25}
                  y={y + 36}
                  textAnchor="middle"
                  fontSize={33}
                  fontWeight={scene.givens[cell] ? '600' : '500'}
                  fill={ink}
                >
                  {digit}
                </SvgText>
              ) : null}
              {(scene.notes[cell] ?? []).map(note => {
                const nx = x + ((note - 1) % 3) * 16.67 + 8.33;
                const ny = y + Math.floor((note - 1) / 3) * 16.67 + 12;
                return (
                  <G key={note}>
                    <SvgText
                      x={nx}
                      y={ny}
                      fontSize={12}
                      textAnchor="middle"
                      fill={ink}
                    >
                      {note}
                    </SvgText>
                    {scene.struckNotes.includes(note) ? (
                      <Line
                        x1={nx - 5}
                        y1={ny - 10}
                        x2={nx + 5}
                        y2={ny + 1}
                        stroke={colors.hintExcluded}
                        strokeWidth={2}
                      />
                    ) : null}
                  </G>
                );
              })}
              {scene.excluded.includes(cell) ? (
                <G stroke={colors.muted} strokeWidth={2.5}>
                  <Line x1={x + 19} y1={y + 19} x2={x + 31} y2={y + 31} />
                  <Line x1={x + 31} y1={y + 19} x2={x + 19} y2={y + 31} />
                </G>
              ) : null}
              {scene.evidence.includes(cell) ? (
                <Rect
                  x={x + 4}
                  y={y + 4}
                  width={42}
                  height={42}
                  rx={9}
                  fill="none"
                  stroke={colors.accent}
                  strokeWidth={2.5}
                />
              ) : null}
            </G>
          );
        })}
        {Array.from({ length: 10 }, (_, i) => (
          <G
            key={i}
            stroke={i % 3 === 0 ? colors.lineStrong : colors.gridLine}
            strokeWidth={i % 3 === 0 ? 2 : 0.65}
          >
            <Line x1={i * 50} y1={0} x2={i * 50} y2={450} />
            <Line x1={0} y1={i * 50} x2={450} y2={i * 50} />
          </G>
        ))}
        {scene.regions.map(region => {
          const cells = regionCells(region);
          const first = cells[0];
          const tone = ['row', 'column', 'box'].indexOf(region.kind);
          return (
            <Rect
              key={`${region.kind}-${region.index}`}
              x={(first % 9) * 50 + 1.5}
              y={Math.floor(first / 9) * 50 + 1.5}
              width={
                (region.kind === 'row'
                  ? 450
                  : region.kind === 'column'
                  ? 50
                  : 150) - 3
              }
              height={
                (region.kind === 'column'
                  ? 450
                  : region.kind === 'row'
                  ? 50
                  : 150) - 3
              }
              stroke={borderColors[tone]}
              strokeWidth={2.5}
              fill="none"
            />
          );
        })}
      </Svg>
    </View>
  );
}
