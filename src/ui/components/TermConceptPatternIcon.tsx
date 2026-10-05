import React from 'react';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import type { TermScene } from '../../data/lessons/term-concepts';
import type { AppPalette } from '../theme';

const SIZE = 80;
const INSET = 4;
const GRID_SIZE = SIZE - INSET * 2;

function windowFor(scene: TermScene) {
  const cells = [
    ...scene.focus,
    ...scene.values,
    ...(scene.target ? [scene.target] : []),
  ].map(item => item.cell);
  cells.push(...(scene.relatedCells ?? []));
  if (scene.referenceCell !== undefined) cells.push(scene.referenceCell);
  if (cells.length === 0) cells.push(40);
  const rows = cells.map(cell => Math.floor(cell / 9));
  const columns = cells.map(cell => cell % 9);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minColumn = Math.min(...columns);
  const maxColumn = Math.max(...columns);
  const extent = Math.max(maxRow - minRow + 1, maxColumn - minColumn + 1);
  const count = Math.min(9, Math.max(3, extent + (extent < 7 ? 1 : 0)));
  const start = (min: number, max: number) =>
    Math.max(0, Math.min(9 - count, Math.floor((min + max - count + 1) / 2)));
  return {
    count,
    row: start(minRow, maxRow),
    column: start(minColumn, maxColumn),
  };
}

/** Compact crop of the concept's own teaching pattern for the course hub. */
export function TermConceptPatternIcon({
  scene,
  palette,
  label,
}: {
  scene: TermScene;
  palette: AppPalette;
  label: string;
}): React.JSX.Element {
  const window = windowFor(scene);
  const cellSize = GRID_SIZE / window.count;
  const focused = new Set([
    ...scene.focus.map(item => item.cell),
    ...(scene.relatedCells ?? []),
  ]);
  const visible = (cell: number) => {
    const row = Math.floor(cell / 9);
    const column = cell % 9;
    return (
      row >= window.row &&
      row < window.row + window.count &&
      column >= window.column &&
      column < window.column + window.count
    );
  };
  const center = (cell: number) => ({
    x: INSET + ((cell % 9) - window.column + 0.5) * cellSize,
    y: INSET + (Math.floor(cell / 9) - window.row + 0.5) * cellSize,
  });
  return (
    <Svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      accessibilityRole="image"
      accessibilityLabel={label}
      testID="term-concept-pattern-icon"
    >
      {Array.from({ length: window.count * window.count }, (_, index) => {
        const row = Math.floor(index / window.count);
        const column = index % window.count;
        const boardCell = (window.row + row) * 9 + window.column + column;
        const colored = scene.colors?.find(item => item.cell === boardCell);
        const fill = scene.fins?.some(item => item.cell === boardCell)
          ? palette.fishFinSoft
          : colored
          ? colored.color === 0
            ? palette.hintRegion
            : palette.accentSoft
          : boardCell === scene.referenceCell
          ? palette.accent
          : focused.has(boardCell)
          ? palette.accentSoft
          : palette.panelSurface;
        return (
          <Rect
            key={boardCell}
            x={INSET + column * cellSize}
            y={INSET + row * cellSize}
            width={cellSize}
            height={cellSize}
            fill={fill}
            stroke={palette.line}
            strokeWidth={0.7}
          />
        );
      })}
      {scene.links
        ?.filter(link => visible(link.from) && visible(link.to))
        .map((link, index) => {
          const from = center(link.from);
          const to = center(link.to);
          return (
            <Line
              key={index}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={palette.accent}
              strokeWidth={1.8}
            />
          );
        })}
      {Array.from({ length: window.count + 1 }, (_, index) => {
        const x = INSET + index * cellSize;
        const y = INSET + index * cellSize;
        return (
          <React.Fragment key={index}>
            {(window.column + index) % 3 === 0 ? (
              <Line
                x1={x}
                y1={INSET}
                x2={x}
                y2={SIZE - INSET}
                stroke={palette.lineStrong}
                strokeWidth={1.4}
              />
            ) : null}
            {(window.row + index) % 3 === 0 ? (
              <Line
                x1={INSET}
                y1={y}
                x2={SIZE - INSET}
                y2={y}
                stroke={palette.lineStrong}
                strokeWidth={1.4}
              />
            ) : null}
          </React.Fragment>
        );
      })}
      {[...new Set([...scene.focus, ...scene.values].map(item => item.cell))]
        .filter(visible)
        .map(boardCell => {
          const point = center(boardCell);
          const digits = scene.values.some(item => item.cell === boardCell)
            ? scene.values.filter(item => item.cell === boardCell)
            : scene.focus.filter(item => item.cell === boardCell);
          return (
            <SvgText
              key={boardCell}
              x={point.x}
              y={point.y + cellSize * 0.17}
              textAnchor="middle"
              fontSize={Math.max(5, Math.min(12, cellSize * 0.43))}
              fontWeight="700"
              fill={focused.has(boardCell) ? palette.accent : palette.ink}
            >
              {digits
                .slice(0, 2)
                .map(item => item.digit)
                .join('·')}
            </SvgText>
          );
        })}
    </Svg>
  );
}
