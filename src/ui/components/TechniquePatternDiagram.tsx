import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import {
  ARTICLE_PATTERN_VARIANTS,
  type ArticleTechnique,
  type TechniquePattern,
} from '../../localization/technique-articles';
import type { AppPalette } from '../theme';

const diagramStyles = StyleSheet.create({ spatial: { direction: 'ltr' } });

type Mark = {
  row: number;
  col: number;
  label: string;
  kind: 'focus' | 'remove' | 'quiet' | 'given' | 'fin';
  removedLabel?: string;
  stacked?: boolean;
};
type Sketch = {
  rows: number;
  cols: number;
  marks: readonly Mark[];
  boxAfter?: readonly number[];
  boxAfterRow?: readonly number[];
  activeRows?: readonly number[];
  activeCols?: readonly number[];
  links?: readonly {
    from: readonly [number, number];
    to: readonly [number, number];
    kind: 'strong' | 'weak';
  }[];
};

function transpose(sketch: Sketch): Sketch {
  return {
    rows: sketch.cols,
    cols: sketch.rows,
    marks: sketch.marks.map(mark => ({
      ...mark,
      row: mark.col,
      col: mark.row,
    })),
    boxAfterRow: sketch.boxAfter,
    boxAfter: sketch.boxAfterRow,
    activeCols: sketch.activeRows,
    activeRows: sketch.activeCols,
    links: sketch.links?.map(link => ({
      from: [link.from[1], link.from[0]],
      to: [link.to[1], link.to[0]],
      kind: link.kind,
    })),
  };
}

function subsetSketch(
  count: 2 | 3 | 4,
  kind: 'naked' | 'hidden',
  variant: 'row' | 'column' | 'box',
  locked = false,
): Sketch {
  const labels = {
    2: ['2·8', '2·8'],
    3: ['2·5', '5·8', '2·8'],
    4: ['1·2', '2·3', '3·4', '1·4'],
  }[count];
  const boxCells = {
    2: [
      [0, 0],
      [2, 2],
    ],
    3: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    4: [
      [0, 0],
      [0, 2],
      [1, 1],
      [2, 0],
    ],
  }[count];
  const lineCols = locked
    ? count === 2
      ? [0, 2]
      : [0, 1, 2]
    : {
        2: [0, 4],
        3: [0, 2, 4],
        4: [0, 1, 3, 4],
      }[count];
  const cells = variant === 'box' ? boxCells : lineCols.map(col => [1, col]);
  const marks: Mark[] = cells.map(([row, col], index) => ({
    row,
    col,
    label: labels[index],
    kind: 'focus',
    removedLabel: kind === 'hidden' ? ['4', '6', '7', '9'][index] : undefined,
    stacked: locked && count === 3,
  }));
  if (kind === 'naked') {
    marks.push({
      row: variant === 'box' ? 2 : 1,
      col: variant === 'box' ? 1 : locked ? 4 : 5,
      label: count === 4 ? '4' : count === 3 ? '5' : '8',
      kind: 'remove',
    });
    if (locked) {
      marks.push({ row: 0, col: 1, label: '2', kind: 'remove' });
    }
  }
  const rowSketch: Sketch = {
    rows: 3,
    cols: variant === 'box' ? 3 : kind === 'hidden' || locked ? 5 : 6,
    boxAfter: variant === 'box' ? undefined : [3],
    activeRows: variant === 'box' ? undefined : [1],
    marks,
  };
  return variant === 'column' ? transpose(rowSketch) : rowSketch;
}

const claimingRow: Sketch = {
  rows: 3,
  cols: 6,
  boxAfter: [3],
  activeRows: [1],
  marks: [
    { row: 1, col: 0, label: '7', kind: 'focus' },
    { row: 1, col: 2, label: '7', kind: 'focus' },
    { row: 0, col: 1, label: '7', kind: 'remove' },
    { row: 2, col: 2, label: '7', kind: 'remove' },
  ],
};

const fullHouseRow: Sketch = {
  rows: 1,
  cols: 9,
  marks: Array.from({ length: 9 }, (_, col) => ({
    row: 0,
    col,
    label: String(col + 1),
    kind: col === 4 ? ('focus' as const) : ('given' as const),
  })),
};

const fullHouseBox: Sketch = {
  rows: 3,
  cols: 3,
  marks: Array.from({ length: 9 }, (_, index) => ({
    row: Math.floor(index / 3),
    col: index % 3,
    label: String(index + 1),
    kind: index === 4 ? ('focus' as const) : ('given' as const),
  })),
};

function fishSketch(
  kind: 'swordfish' | 'finnedXWing' | 'sashimiXWing',
): Sketch {
  if (kind === 'swordfish') {
    return {
      rows: 6,
      cols: 6,
      boxAfter: [3],
      boxAfterRow: [3],
      activeRows: [0, 2, 5],
      marks: [
        { row: 0, col: 0, label: '6', kind: 'focus' },
        { row: 0, col: 2, label: '6', kind: 'focus' },
        { row: 2, col: 2, label: '6', kind: 'focus' },
        { row: 2, col: 5, label: '6', kind: 'focus' },
        { row: 5, col: 0, label: '6', kind: 'focus' },
        { row: 5, col: 5, label: '6', kind: 'focus' },
        { row: 3, col: 2, label: '6', kind: 'remove' },
      ],
    };
  }
  return {
    rows: 6,
    cols: 6,
    boxAfter: [3],
    boxAfterRow: [3],
    activeRows: [1, 4],
    marks: [
      { row: 1, col: 1, label: '6', kind: 'focus' },
      { row: 1, col: 4, label: '6', kind: 'focus' },
      { row: 4, col: 1, label: '6', kind: 'focus' },
      ...(kind === 'finnedXWing'
        ? [{ row: 4, col: 4, label: '6', kind: 'focus' as const }]
        : []),
      { row: 4, col: 5, label: '6', kind: 'fin' },
      { row: 3, col: 4, label: '6', kind: 'remove' },
    ],
  };
}

const skyscraperRow: Sketch = {
  rows: 6,
  cols: 6,
  boxAfter: [3],
  boxAfterRow: [3],
  activeRows: [0, 4],
  marks: [
    { row: 0, col: 0, label: '6', kind: 'focus' },
    { row: 0, col: 3, label: '6', kind: 'focus' },
    { row: 4, col: 0, label: '6', kind: 'focus' },
    { row: 4, col: 4, label: '6', kind: 'focus' },
    { row: 2, col: 4, label: '6', kind: 'remove' },
  ],
};

const kiteSketch: Sketch = {
  rows: 6,
  cols: 6,
  boxAfter: [3],
  boxAfterRow: [3],
  activeRows: [1],
  activeCols: [2],
  marks: [
    { row: 1, col: 1, label: '6', kind: 'focus' },
    { row: 1, col: 5, label: '6', kind: 'focus' },
    { row: 2, col: 2, label: '6', kind: 'focus' },
    { row: 5, col: 2, label: '6', kind: 'focus' },
    { row: 5, col: 5, label: '6', kind: 'remove' },
  ],
};

const emptyRectangleColumn: Sketch = {
  rows: 6,
  cols: 6,
  boxAfter: [3],
  boxAfterRow: [3],
  activeCols: [4],
  marks: [
    { row: 0, col: 0, label: '×', kind: 'quiet' },
    { row: 0, col: 1, label: '6', kind: 'focus' },
    { row: 1, col: 0, label: '6', kind: 'focus' },
    { row: 0, col: 4, label: '6', kind: 'focus' },
    { row: 5, col: 4, label: '6', kind: 'focus' },
    { row: 5, col: 0, label: '6', kind: 'remove' },
  ],
};

const xyRowLink: Sketch = {
  rows: 6,
  cols: 6,
  boxAfter: [3],
  boxAfterRow: [3],
  marks: [
    { row: 1, col: 1, label: '1·2', kind: 'focus' },
    { row: 1, col: 4, label: '1·3', kind: 'focus' },
    { row: 2, col: 2, label: '2·3', kind: 'focus' },
    { row: 2, col: 4, label: '3', kind: 'remove' },
  ],
};

const xyRowColumn: Sketch = {
  rows: 6,
  cols: 6,
  boxAfter: [3],
  boxAfterRow: [3],
  marks: [
    { row: 1, col: 1, label: '1·2', kind: 'focus' },
    { row: 1, col: 4, label: '1·3', kind: 'focus' },
    { row: 4, col: 1, label: '2·3', kind: 'focus' },
    { row: 4, col: 4, label: '3', kind: 'remove' },
  ],
};

const xyzRowLink: Sketch = {
  rows: 6,
  cols: 6,
  boxAfter: [3],
  boxAfterRow: [3],
  marks: [
    { row: 1, col: 1, label: '123', kind: 'focus' },
    { row: 2, col: 2, label: '1·3', kind: 'focus' },
    { row: 1, col: 4, label: '2·3', kind: 'focus' },
    { row: 1, col: 2, label: '3', kind: 'remove' },
  ],
};

const wStrongRow: Sketch = {
  rows: 6,
  cols: 6,
  boxAfter: [3],
  boxAfterRow: [3],
  activeRows: [2],
  marks: [
    { row: 0, col: 0, label: '1·6', kind: 'focus' },
    { row: 4, col: 4, label: '1·6', kind: 'focus' },
    { row: 2, col: 0, label: '1', kind: 'focus' },
    { row: 2, col: 4, label: '1', kind: 'focus' },
    { row: 0, col: 4, label: '6', kind: 'remove' },
  ],
};

const wStrongBox: Sketch = {
  rows: 6,
  cols: 6,
  boxAfter: [3],
  boxAfterRow: [3],
  marks: [
    { row: 0, col: 0, label: '1·6', kind: 'focus' },
    { row: 4, col: 4, label: '1·6', kind: 'focus' },
    { row: 3, col: 0, label: '1', kind: 'focus' },
    { row: 4, col: 2, label: '1', kind: 'focus' },
    { row: 0, col: 4, label: '6', kind: 'remove' },
  ],
};

const colorTrap: Sketch = {
  rows: 6,
  cols: 6,
  boxAfter: [3],
  boxAfterRow: [3],
  activeRows: [0],
  marks: [
    { row: 0, col: 0, label: 'A6', kind: 'focus' },
    { row: 0, col: 2, label: 'B6', kind: 'focus' },
    { row: 1, col: 1, label: '6', kind: 'remove' },
  ],
};

const colorConflict: Sketch = {
  rows: 6,
  cols: 6,
  boxAfter: [3],
  boxAfterRow: [3],
  marks: [
    { row: 0, col: 0, label: 'A6', kind: 'remove' },
    { row: 0, col: 1, label: 'B6', kind: 'focus' },
    { row: 1, col: 1, label: 'A6', kind: 'remove' },
  ],
};

const multiColor: Sketch = {
  rows: 6,
  cols: 6,
  boxAfter: [3],
  boxAfterRow: [3],
  marks: [
    { row: 0, col: 0, label: 'A1', kind: 'focus' },
    { row: 0, col: 4, label: 'B1', kind: 'focus' },
    { row: 1, col: 1, label: 'A2', kind: 'focus' },
    { row: 4, col: 1, label: 'B2', kind: 'focus' },
    { row: 2, col: 2, label: '6', kind: 'quiet' },
    { row: 4, col: 4, label: '6', kind: 'remove' },
  ],
};

const remoteShort: Sketch = {
  rows: 6,
  cols: 6,
  boxAfter: [3],
  boxAfterRow: [3],
  marks: [
    { row: 0, col: 0, label: 'A', kind: 'focus' },
    { row: 0, col: 4, label: 'B', kind: 'focus' },
    { row: 4, col: 4, label: 'A', kind: 'focus' },
    { row: 4, col: 1, label: 'B', kind: 'focus' },
    { row: 2, col: 1, label: '1·6', kind: 'remove' },
  ],
};

const remoteLong: Sketch = {
  rows: 9,
  cols: 9,
  boxAfter: [3, 6],
  boxAfterRow: [3, 6],
  marks: [
    { row: 0, col: 0, label: 'A', kind: 'focus' },
    { row: 0, col: 4, label: 'B', kind: 'focus' },
    { row: 4, col: 4, label: 'A', kind: 'focus' },
    { row: 4, col: 8, label: 'B', kind: 'focus' },
    { row: 8, col: 8, label: 'A', kind: 'focus' },
    { row: 8, col: 1, label: 'B', kind: 'focus' },
    { row: 8, col: 0, label: '1·6', kind: 'remove' },
  ],
};

const remoteBranch: Sketch = {
  rows: 9,
  cols: 9,
  boxAfter: [3, 6],
  boxAfterRow: [3, 6],
  marks: [
    { row: 4, col: 4, label: 'A', kind: 'focus' },
    { row: 4, col: 0, label: 'B', kind: 'focus' },
    { row: 0, col: 4, label: 'B', kind: 'focus' },
    { row: 5, col: 5, label: 'B', kind: 'focus' },
    { row: 7, col: 0, label: 'A', kind: 'focus' },
    { row: 7, col: 8, label: 'B', kind: 'focus' },
    { row: 7, col: 4, label: '1·6', kind: 'remove' },
  ],
};

type RectangleCorner =
  | 'corner-top-left'
  | 'corner-top-right'
  | 'corner-bottom-left'
  | 'corner-bottom-right';

function rectangleSketch(
  kind: 'unique' | 'hidden' | 'avoidable',
  corner: RectangleCorner,
): Sketch {
  const corners = [
    { row: 0, col: 1 },
    { row: 0, col: 4 },
    { row: 2, col: 1 },
    { row: 2, col: 4 },
  ];
  const targetIndex = {
    'corner-top-left': 0,
    'corner-top-right': 1,
    'corner-bottom-left': 2,
    'corner-bottom-right': 3,
  }[corner];
  return {
    rows: 3,
    cols: 6,
    boxAfter: [3],
    marks: corners.map((cell, index) => ({
      ...cell,
      label:
        index === targetIndex
          ? '9'
          : kind === 'avoidable'
          ? index === 0 || index === 3
            ? '2'
            : '7'
          : '2·7',
      removedLabel:
        index === targetIndex
          ? kind === 'unique'
            ? '2·7'
            : kind === 'avoidable'
            ? targetIndex === 0 || targetIndex === 3
              ? '2'
              : '7'
            : '7'
          : undefined,
      kind:
        index === targetIndex
          ? ('focus' as const)
          : kind === 'avoidable'
          ? ('given' as const)
          : ('focus' as const),
    })),
  };
}

function typeFourSketch(pattern: TechniquePattern): Sketch {
  const boxLink = pattern.startsWith('strong-box-');
  const column = pattern.endsWith('column');
  const base: Sketch = {
    rows: boxLink ? 6 : 3,
    cols: boxLink ? 3 : 6,
    boxAfter: boxLink ? undefined : [3],
    boxAfterRow: boxLink ? [3] : undefined,
    activeRows: boxLink ? [4] : [2],
    marks: boxLink
      ? [
          { row: 1, col: 0, label: '2·7', kind: 'focus' },
          { row: 1, col: 2, label: '2·7', kind: 'focus' },
          { row: 4, col: 0, label: '2·9', kind: 'focus', removedLabel: '7' },
          { row: 4, col: 2, label: '2·8', kind: 'focus', removedLabel: '7' },
        ]
      : [
          { row: 0, col: 1, label: '2·7', kind: 'focus' },
          { row: 0, col: 4, label: '2·7', kind: 'focus' },
          { row: 2, col: 1, label: '2·9', kind: 'focus', removedLabel: '7' },
          { row: 2, col: 4, label: '2·8', kind: 'focus', removedLabel: '7' },
        ],
  };
  return column ? transpose(base) : (base as Sketch);
}

const bugPlusOneSketch: Sketch = {
  rows: 3,
  cols: 3,
  marks: [
    { row: 0, col: 0, label: '2·7', kind: 'quiet' },
    { row: 0, col: 1, label: '2·9', kind: 'quiet' },
    { row: 1, col: 0, label: '7·9', kind: 'quiet' },
    { row: 1, col: 1, label: '2·7·9', kind: 'focus' },
    { row: 1, col: 2, label: '2·9', kind: 'quiet' },
    { row: 2, col: 1, label: '7·9', kind: 'quiet' },
  ],
};

const jellyfishRow: Sketch = {
  rows: 6,
  cols: 9,
  boxAfter: [3, 6],
  boxAfterRow: [3],
  activeRows: [0, 1, 3, 5],
  activeCols: [0, 2, 5, 8],
  marks: [
    { row: 0, col: 0, label: '6', kind: 'focus' },
    { row: 0, col: 5, label: '6', kind: 'focus' },
    { row: 1, col: 2, label: '6', kind: 'focus' },
    { row: 1, col: 8, label: '6', kind: 'focus' },
    { row: 3, col: 0, label: '6', kind: 'focus' },
    { row: 3, col: 2, label: '6', kind: 'focus' },
    { row: 5, col: 5, label: '6', kind: 'focus' },
    { row: 5, col: 8, label: '6', kind: 'focus' },
    { row: 2, col: 5, label: '6', kind: 'remove' },
  ],
};

function levelFiveChainSketch(
  length: 'short' | 'medium' | 'long',
  xy: boolean,
): Sketch {
  const nodes: [number, number][] =
    length === 'short'
      ? [
          [0, 0],
          [4, 0],
          [4, 8],
          [2, 8],
        ]
      : length === 'medium'
      ? [
          [0, 0],
          [4, 0],
          [4, 3],
          [1, 3],
          [1, 8],
          [2, 8],
        ]
      : [
          [0, 0],
          [4, 0],
          [4, 3],
          [1, 3],
          [1, 5],
          [6, 5],
          [6, 8],
          [2, 8],
        ];
  const xyLabels =
    length === 'short'
      ? ['1·6', '1·3', '3·8', '8·6']
      : length === 'medium'
      ? ['1·6', '1·3', '3·8', '8·2', '2·7', '7·6']
      : ['1·6', '1·3', '3·8', '8·2', '2·7', '7·4', '4·5', '5·6'];
  const marks: Mark[] = nodes.map(([row, col], index) => ({
    row,
    col,
    label: xy ? xyLabels[index] : '6',
    kind: 'focus',
  }));
  marks.push({ row: 2, col: 1, label: '6', kind: 'remove' });
  return {
    rows: 9,
    cols: 9,
    boxAfter: [3, 6],
    boxAfterRow: [3, 6],
    marks,
    links: nodes.slice(1).map((node, index) => ({
      from: nodes[index],
      to: node,
      kind: index % 2 ? 'weak' : 'strong',
    })),
  };
}

function aicSketch(pattern: TechniquePattern): Sketch {
  const placement = pattern === 'aic-discontinuous-placement';
  const loop = pattern === 'aic-continuous-loop';
  const marks: Mark[] = [
    { row: 1, col: 0, label: 'A', kind: 'focus' },
    { row: 1, col: 2, label: 'B', kind: 'focus' },
    { row: 3, col: 2, label: 'C', kind: 'focus' },
    { row: 3, col: 4, label: 'D', kind: 'focus' },
    { row: 1, col: 4, label: 'E', kind: 'focus' },
    {
      row: 2,
      col: 4,
      label: '6',
      kind: placement ? 'focus' : 'remove',
    },
  ];
  return {
    rows: 5,
    cols: 5,
    marks,
    links: [
      { from: [1, 0], to: [1, 2], kind: 'strong' },
      { from: [1, 2], to: [3, 2], kind: 'weak' },
      { from: [3, 2], to: [3, 4], kind: 'strong' },
      { from: [3, 4], to: [1, 4], kind: 'weak' },
      ...(loop
        ? [
            {
              from: [1, 4] as const,
              to: [1, 0] as const,
              kind: 'strong' as const,
            },
          ]
        : []),
    ],
  };
}

function groupedAicSketch(multiple: boolean): Sketch {
  return {
    rows: 5,
    cols: 7,
    marks: [
      { row: 2, col: 0, label: 'A', kind: 'focus' },
      { row: 1, col: 2, label: 'G', kind: 'focus' },
      { row: 3, col: 2, label: 'G', kind: 'focus' },
      ...(multiple
        ? [
            { row: 1, col: 4, label: 'H', kind: 'focus' as const },
            { row: 3, col: 4, label: 'H', kind: 'focus' as const },
          ]
        : []),
      { row: 2, col: 6, label: 'B', kind: 'focus' },
      { row: 0, col: 6, label: '6', kind: 'remove' },
    ],
    links: [
      { from: [2, 0], to: [1, 2], kind: 'strong' },
      { from: [3, 2], to: [2, multiple ? 4 : 6], kind: 'weak' },
      ...(multiple
        ? [
            {
              from: [2, 4] as const,
              to: [2, 6] as const,
              kind: 'strong' as const,
            },
          ]
        : []),
    ],
  };
}

const complexColorSketch: Sketch = {
  rows: 6,
  cols: 6,
  boxAfter: [3],
  boxAfterRow: [3],
  marks: [
    { row: 0, col: 0, label: 'A', kind: 'focus' },
    { row: 0, col: 2, label: 'B', kind: 'focus' },
    { row: 2, col: 3, label: 'C', kind: 'focus' },
    { row: 2, col: 5, label: 'D', kind: 'focus' },
    { row: 5, col: 0, label: 'E', kind: 'focus' },
    { row: 5, col: 2, label: 'F', kind: 'focus' },
    { row: 3, col: 2, label: '6', kind: 'remove' },
  ],
  links: [
    { from: [0, 0], to: [0, 2], kind: 'strong' },
    { from: [2, 3], to: [2, 5], kind: 'strong' },
    { from: [5, 0], to: [5, 2], kind: 'strong' },
    { from: [0, 2], to: [2, 3], kind: 'weak' },
  ],
};

function forcingSketch(
  kind: 'chain-two' | 'chain-multi' | 'net-conflict' | 'net-common',
): Sketch {
  const multi = kind === 'chain-multi' || kind === 'net-common';
  const conflict = kind === 'net-conflict';
  return {
    rows: 7,
    cols: 7,
    marks: [
      { row: 3, col: 0, label: 'A', kind: 'focus' },
      { row: 1, col: 2, label: 'B', kind: 'focus' },
      { row: 5, col: 2, label: 'C', kind: 'focus' },
      ...(multi
        ? [{ row: 3, col: 2, label: 'D', kind: 'focus' as const }]
        : []),
      { row: 1, col: 4, label: 'E', kind: 'focus' },
      { row: 5, col: 4, label: 'F', kind: 'focus' },
      { row: 3, col: 6, label: conflict ? '×' : '6', kind: 'remove' },
    ],
    links: [
      { from: [3, 0], to: [1, 2], kind: 'strong' },
      { from: [3, 0], to: [5, 2], kind: 'strong' },
      ...(multi
        ? [
            {
              from: [3, 0] as const,
              to: [3, 2] as const,
              kind: 'strong' as const,
            },
          ]
        : []),
      { from: [1, 2], to: [1, 4], kind: 'weak' },
      { from: [5, 2], to: [5, 4], kind: 'weak' },
      { from: [1, 4], to: [3, 6], kind: 'strong' },
      { from: [5, 4], to: [3, 6], kind: 'strong' },
    ],
  };
}

const SKETCHES: Record<
  ArticleTechnique,
  Partial<Record<TechniquePattern, Sketch>>
> = {
  fullHouse: {
    row: fullHouseRow,
    column: transpose(fullHouseRow),
    box: fullHouseBox,
  },
  nakedSingle: {
    cell: {
      rows: 5,
      cols: 5,
      boxAfter: [1, 4],
      boxAfterRow: [1, 4],
      activeRows: [2],
      activeCols: [2],
      marks: [
        { row: 2, col: 0, label: '1', kind: 'given' },
        { row: 2, col: 4, label: '2', kind: 'given' },
        { row: 0, col: 2, label: '3', kind: 'given' },
        { row: 4, col: 2, label: '4', kind: 'given' },
        { row: 2, col: 2, label: '5', kind: 'focus' },
        { row: 1, col: 1, label: '6', kind: 'given' },
        { row: 1, col: 3, label: '7', kind: 'given' },
        { row: 3, col: 1, label: '8', kind: 'given' },
        { row: 3, col: 3, label: '9', kind: 'given' },
      ],
    },
  },
  hiddenSingle: {
    box: {
      rows: 3,
      cols: 3,
      marks: Array.from({ length: 9 }, (_, index) => ({
        row: Math.floor(index / 3),
        col: index % 3,
        label: index === 4 ? '5' : '×',
        kind: index === 4 ? 'focus' : 'quiet',
      })),
    },
    row: {
      rows: 3,
      cols: 9,
      boxAfter: [3, 6],
      activeRows: [1],
      marks: Array.from({ length: 9 }, (_, col) => ({
        row: 1,
        col,
        label: col === 4 ? '5' : '×',
        kind: col === 4 ? 'focus' : 'quiet',
      })),
    },
    column: {
      rows: 9,
      cols: 3,
      boxAfterRow: [3, 6],
      activeCols: [1],
      marks: Array.from({ length: 9 }, (_, row) => ({
        row,
        col: 1,
        label: row === 4 ? '5' : '×',
        kind: row === 4 ? 'focus' : 'quiet',
      })),
    },
  },
  'lockedCandidates.pointing': {
    row: {
      rows: 3,
      cols: 6,
      boxAfter: [3],
      activeRows: [1],
      marks: [
        { row: 1, col: 0, label: '7', kind: 'focus' },
        { row: 1, col: 2, label: '7', kind: 'focus' },
        { row: 1, col: 4, label: '7', kind: 'remove' },
      ],
    },
    column: {
      rows: 6,
      cols: 3,
      boxAfterRow: [3],
      activeCols: [1],
      marks: [
        { row: 0, col: 1, label: '7', kind: 'focus' },
        { row: 2, col: 1, label: '7', kind: 'focus' },
        { row: 4, col: 1, label: '7', kind: 'remove' },
      ],
    },
  },
  'lockedCandidates.claiming': {
    row: claimingRow,
    column: transpose(claimingRow),
  },
  lockedPair: {
    row: subsetSketch(2, 'naked', 'row', true),
    column: subsetSketch(2, 'naked', 'column', true),
  },
  hiddenPair: {
    row: subsetSketch(2, 'hidden', 'row'),
    column: subsetSketch(2, 'hidden', 'column'),
    box: subsetSketch(2, 'hidden', 'box'),
  },
  lockedTriple: {
    row: subsetSketch(3, 'naked', 'row', true),
    column: subsetSketch(3, 'naked', 'column', true),
  },
  nakedTriple: {
    row: subsetSketch(3, 'naked', 'row'),
    column: subsetSketch(3, 'naked', 'column'),
    box: subsetSketch(3, 'naked', 'box'),
  },
  hiddenTriple: {
    row: subsetSketch(3, 'hidden', 'row'),
    column: subsetSketch(3, 'hidden', 'column'),
    box: subsetSketch(3, 'hidden', 'box'),
  },
  nakedQuad: {
    row: subsetSketch(4, 'naked', 'row'),
    column: subsetSketch(4, 'naked', 'column'),
    box: subsetSketch(4, 'naked', 'box'),
  },
  hiddenQuad: {
    row: subsetSketch(4, 'hidden', 'row'),
    column: subsetSketch(4, 'hidden', 'column'),
    box: subsetSketch(4, 'hidden', 'box'),
  },
  nakedPair: {
    row: {
      rows: 3,
      cols: 6,
      boxAfter: [3],
      activeRows: [1],
      marks: [
        { row: 1, col: 1, label: '2·8', kind: 'focus' },
        { row: 1, col: 4, label: '2·8', kind: 'focus' },
        { row: 1, col: 5, label: '2·8', kind: 'remove' },
      ],
    },
    column: {
      rows: 6,
      cols: 3,
      boxAfterRow: [3],
      activeCols: [1],
      marks: [
        { row: 1, col: 1, label: '2·8', kind: 'focus' },
        { row: 4, col: 1, label: '2·8', kind: 'focus' },
        { row: 5, col: 1, label: '2·8', kind: 'remove' },
      ],
    },
    box: {
      rows: 3,
      cols: 3,
      marks: [
        { row: 0, col: 0, label: '2·8', kind: 'focus' },
        { row: 1, col: 1, label: '2·8', kind: 'focus' },
        { row: 2, col: 2, label: '2·8', kind: 'remove' },
      ],
    },
  },
  xWing: {
    row: {
      rows: 5,
      cols: 5,
      activeRows: [0, 4],
      marks: [
        { row: 0, col: 0, label: '6', kind: 'focus' },
        { row: 0, col: 3, label: '6', kind: 'focus' },
        { row: 2, col: 0, label: '6', kind: 'remove' },
        { row: 4, col: 0, label: '6', kind: 'focus' },
        { row: 4, col: 3, label: '6', kind: 'focus' },
      ],
    },
    column: {
      rows: 5,
      cols: 5,
      activeCols: [0, 4],
      marks: [
        { row: 0, col: 0, label: '6', kind: 'focus' },
        { row: 3, col: 0, label: '6', kind: 'focus' },
        { row: 0, col: 2, label: '6', kind: 'remove' },
        { row: 0, col: 4, label: '6', kind: 'focus' },
        { row: 3, col: 4, label: '6', kind: 'focus' },
      ],
    },
  },
  swordfish: {
    row: fishSketch('swordfish'),
    column: transpose(fishSketch('swordfish')),
  },
  finnedXWing: {
    row: fishSketch('finnedXWing'),
    column: transpose(fishSketch('finnedXWing')),
  },
  sashimiXWing: {
    row: fishSketch('sashimiXWing'),
    column: transpose(fishSketch('sashimiXWing')),
  },
  skyscraper: {
    row: skyscraperRow,
    column: transpose(skyscraperRow),
  },
  twoStringKite: { kite: kiteSketch },
  emptyRectangle: {
    'strong-row': transpose(emptyRectangleColumn),
    'strong-column': emptyRectangleColumn,
  },
  turbotFish: {
    skyscraper: skyscraperRow,
    'two-string-kite': kiteSketch,
    'two-candidate-empty-rectangle': emptyRectangleColumn,
  },
  xyWing: {
    'row-link': xyRowLink,
    'column-link': transpose(xyRowLink),
    'row-column': xyRowColumn,
  },
  xyzWing: {
    'row-link': xyzRowLink,
    'column-link': transpose(xyzRowLink),
  },
  wWing: {
    'strong-row': wStrongRow,
    'strong-column': transpose(wStrongRow),
    'strong-box': wStrongBox,
  },
  simpleColoring: {
    'color-trap': colorTrap,
    'color-conflict': colorConflict,
  },
  multiColoring: { 'multi-color': multiColor },
  remotePair: {
    'linear-short': remoteShort,
    'linear-long': remoteLong,
    'branched-long': remoteBranch,
  },
  uniqueRectangle: {
    'corner-top-left': rectangleSketch('unique', 'corner-top-left'),
    'corner-top-right': rectangleSketch('unique', 'corner-top-right'),
    'corner-bottom-left': rectangleSketch('unique', 'corner-bottom-left'),
    'corner-bottom-right': rectangleSketch('unique', 'corner-bottom-right'),
  },
  uniqueRectangleType4: {
    'strong-row': typeFourSketch('strong-row'),
    'strong-column': typeFourSketch('strong-column'),
    'strong-box-strong-row': typeFourSketch('strong-box-strong-row'),
    'strong-box-strong-column': typeFourSketch('strong-box-strong-column'),
  },
  hiddenRectangle: {
    'corner-top-left': rectangleSketch('hidden', 'corner-top-left'),
    'corner-top-right': rectangleSketch('hidden', 'corner-top-right'),
    'corner-bottom-left': rectangleSketch('hidden', 'corner-bottom-left'),
    'corner-bottom-right': rectangleSketch('hidden', 'corner-bottom-right'),
  },
  avoidableRectangle: {
    'corner-top-left': rectangleSketch('avoidable', 'corner-top-left'),
    'corner-top-right': rectangleSketch('avoidable', 'corner-top-right'),
    'corner-bottom-left': rectangleSketch('avoidable', 'corner-bottom-left'),
    'corner-bottom-right': rectangleSketch('avoidable', 'corner-bottom-right'),
  },
  bugPlusOne: { 'bug-plus-one': bugPlusOneSketch },
  jellyfish: { row: jellyfishRow, column: transpose(jellyfishRow) },
  xChain: {
    'chain-short': levelFiveChainSketch('short', false),
    'chain-medium': levelFiveChainSketch('medium', false),
    'chain-long': levelFiveChainSketch('long', false),
  },
  xyChain: {
    'chain-short': levelFiveChainSketch('short', true),
    'chain-medium': levelFiveChainSketch('medium', true),
    'chain-long': levelFiveChainSketch('long', true),
  },
  aic: {
    'aic-discontinuous-elimination': aicSketch('aic-discontinuous-elimination'),
    'aic-discontinuous-placement': aicSketch('aic-discontinuous-placement'),
    'aic-type-1': aicSketch('aic-type-1'),
    'aic-type-2': aicSketch('aic-type-2'),
    'aic-continuous-loop': aicSketch('aic-continuous-loop'),
  },
  groupedAic: {
    'single-group': groupedAicSketch(false),
    'multiple-groups': groupedAicSketch(true),
  },
  complexColoring: { 'complex-color': complexColorSketch },
  forcingChain: {
    'two-branch': forcingSketch('chain-two'),
    'multi-branch': forcingSketch('chain-multi'),
  },
  forcingNet: {
    contradiction: forcingSketch('net-conflict'),
    'common-conclusion': forcingSketch('net-common'),
  },
};

export function TechniquePatternDiagram({
  technique,
  pattern,
  palette,
  size,
  accessibilityLabel,
}: {
  technique: ArticleTechnique;
  pattern: TechniquePattern;
  palette: AppPalette;
  size: number;
  accessibilityLabel: string;
}): React.JSX.Element {
  const sketch = SKETCHES[technique][pattern];
  if (
    !sketch ||
    !ARTICLE_PATTERN_VARIANTS[technique].some(item => item === pattern)
  ) {
    throw new Error(`Missing ${technique} ${pattern} pattern sketch`);
  }
  const cell = Math.min(27, 108 / Math.max(sketch.rows, sketch.cols));
  const width = cell * sketch.cols;
  const height = cell * sketch.rows;
  const x = (120 - width) / 2;
  const y = (120 - height) / 2;
  return (
    <Svg
      style={diagramStyles.spatial}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {Array.from({ length: sketch.rows * sketch.cols }, (_, index) => {
        const row = Math.floor(index / sketch.cols);
        const col = index % sketch.cols;
        const mark = sketch.marks.find(
          item => item.row === row && item.col === col,
        );
        const fill =
          mark?.kind === 'focus'
            ? palette.accentSoft
            : mark?.kind === 'fin'
            ? palette.fishFinSoft
            : mark?.kind === 'remove'
            ? palette.errorSoft
            : sketch.activeRows?.includes(row) ||
              sketch.activeCols?.includes(col)
            ? palette.hintRegion
            : palette.panelSurface;
        return (
          <Rect
            key={index}
            x={x + col * cell}
            y={y + row * cell}
            width={cell}
            height={cell}
            fill={fill}
            stroke={palette.line}
            strokeWidth={0.8}
          />
        );
      })}
      {sketch.boxAfter?.map(after => (
        <Line
          key={`column-${after}`}
          x1={x + after * cell}
          y1={y}
          x2={x + after * cell}
          y2={y + height}
          stroke={palette.lineStrong}
          strokeWidth={2.5}
        />
      ))}
      {sketch.boxAfterRow?.map(after => (
        <Line
          key={`row-${after}`}
          x1={x}
          y1={y + after * cell}
          x2={x + width}
          y2={y + after * cell}
          stroke={palette.lineStrong}
          strokeWidth={2.5}
        />
      ))}
      {sketch.links?.map((link, index) => (
        <Line
          key={`link-${index}`}
          x1={x + (link.from[1] + 0.5) * cell}
          y1={y + (link.from[0] + 0.5) * cell}
          x2={x + (link.to[1] + 0.5) * cell}
          y2={y + (link.to[0] + 0.5) * cell}
          stroke={link.kind === 'strong' ? palette.accent : palette.muted}
          strokeWidth={1.7}
          strokeDasharray={link.kind === 'weak' ? '3 2' : undefined}
        />
      ))}
      {sketch.marks.map(mark => {
        const centerX = x + (mark.col + 0.5) * cell;
        const centerY = y + (mark.row + 0.5) * cell;
        const color =
          mark.kind === 'focus'
            ? palette.accent
            : mark.kind === 'fin'
            ? palette.fishFin
            : mark.kind === 'remove'
            ? palette.error
            : mark.kind === 'given'
            ? palette.ink
            : palette.muted;
        const fontSize = Math.min(
          mark.label.length > 1 ? 10 : 16,
          cell * (mark.label.length > 1 ? 0.57 : 0.72),
        );
        return (
          <React.Fragment key={`${mark.row}-${mark.col}`}>
            {mark.stacked ? (
              mark.label.split('·').map((digit, index) => (
                <SvgText
                  key={index}
                  x={centerX}
                  y={centerY + cell * (index === 0 ? -0.05 : 0.39)}
                  textAnchor="middle"
                  fontSize={Math.min(9, cell * 0.42)}
                  fontWeight="700"
                  fill={color}
                >
                  {digit}
                </SvgText>
              ))
            ) : (
              <SvgText
                x={centerX}
                y={
                  mark.removedLabel
                    ? centerY - cell * 0.07
                    : centerY + fontSize * 0.33
                }
                textAnchor="middle"
                fontSize={fontSize}
                fontWeight={mark.kind === 'quiet' ? '400' : '700'}
                fill={color}
              >
                {mark.label}
              </SvgText>
            )}
            {mark.removedLabel ? (
              <>
                <SvgText
                  x={centerX}
                  y={centerY + cell * 0.39}
                  textAnchor="middle"
                  fontSize={Math.min(9, cell * 0.4)}
                  fill={palette.error}
                >
                  {mark.removedLabel}
                </SvgText>
                <Line
                  x1={centerX - cell * 0.16}
                  y1={centerY + cell * 0.22}
                  x2={centerX + cell * 0.16}
                  y2={centerY + cell * 0.22}
                  stroke={palette.error}
                  strokeWidth={1.4}
                />
              </>
            ) : null}
            {mark.kind === 'remove' ? (
              <Line
                x1={centerX - cell * 0.34}
                y1={centerY + cell * 0.31}
                x2={centerX + cell * 0.34}
                y2={centerY - cell * 0.31}
                stroke={palette.error}
                strokeWidth={2}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}
