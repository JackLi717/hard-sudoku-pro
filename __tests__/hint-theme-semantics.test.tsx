import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import {
  HINT_LAB_ALL_FIXTURES,
  createHintLabSession,
} from '../src/debug/hint-lab';
import {
  buildHintPresentation,
  HintPageVisuals,
} from '../src/domain/hints/presentation';
import {
  SudokuBoard,
  semanticCellRoles,
  semanticRegionMarks,
} from '../src/ui/components/SudokuBoard';
import { hintBackground } from '../src/ui/themes/hint-background';
import { warmPaperTheme } from '../src/ui/themes/warm-paper';
import { ThemeProvider } from '../src/ui/theme';

const emptyVisuals: HintPageVisuals = {
  showFocusCells: true,
  showFocusRegions: true,
  showPremises: true,
  showEliminations: false,
  showPlacements: false,
};
const fishSizes: Record<string, number> = {
  xWing: 2,
  swordfish: 3,
  jellyfish: 4,
  finnedXWing: 2,
  sashimiXWing: 2,
};

test.each(HINT_LAB_ALL_FIXTURES.filter(f => f.techniqueCode in fishSizes))(
  '$id keeps explicit base and cover roles throughout the walkthrough',
  f => {
    const pages = buildHintPresentation(
      f.step,
      undefined,
      'game',
      f.candidateMasks,
    ).pages;
    for (const page of pages) {
      const marks = semanticRegionMarks(
        page.visuals,
        page.visuals.focusRegions ?? [],
      );
      const bases = marks.filter(m => m.role === 'fishBase');
      const covers = marks.filter(m => m.role === 'fishCover');
      expect(bases).toHaveLength(fishSizes[f.techniqueCode]);
      expect(covers).toHaveLength(fishSizes[f.techniqueCode]);
      expect(bases.every(m => m.region.kind === bases[0].region.kind)).toBe(
        true,
      );
      expect(
        covers.every(
          m =>
            m.region.kind !== bases[0].region.kind && m.region.kind !== 'box',
        ),
      ).toBe(true);
    }
    expect(pages.at(-1)!.visuals.eliminations).toEqual(f.step.eliminations);
  },
);

test.each(HINT_LAB_ALL_FIXTURES.filter(f => f.difficultyLevel === 5))(
  '$id never promotes its spotlight cells to confirmed facts',
  f => {
    for (const { visuals } of buildHintPresentation(
      f.step,
      undefined,
      'game',
      f.candidateMasks,
    ).pages) {
      const roles = semanticCellRoles(visuals, new Map(), new Map(), new Map());
      for (const [cell, role] of roles) {
        if (role === 'established') {
          expect(visuals.cellMarks).toContainEqual({
            cell,
            role: 'established',
          });
        }
      }
      // Empty explicit marks and omitted marks must not change background meaning.
      const plain = { ...visuals, cellMarks: undefined };
      expect([
        ...semanticCellRoles(plain, new Map(), new Map(), new Map()),
      ]).toEqual([
        ...semanticCellRoles(
          { ...plain, cellMarks: [] },
          new Map(),
          new Map(),
          new Map(),
        ),
      ]);
    }
  },
);

test.each(['light', 'dark'] as const)(
  '%s diagrams and normal notes share background precedence',
  mode => {
    const colors = warmPaperTheme.appearances[mode].boardTheme.colors;
    const region = { kind: 'row' as const, index: 0 };
    const plain = {
      ...emptyVisuals,
      regionMarks: [{ region, role: 'source' as const }],
    };
    const diagram = {
      ...emptyVisuals,
      diagramRegions: [{ region, conflict: false }],
    };
    const background = (visuals: HintPageVisuals) =>
      hintBackground(colors, {
        regions: semanticRegionMarks(visuals, []),
        cellRole: null,
        focused: false,
        conflict: false,
      });
    expect(background(plain)).toBe(colors.hintRegion);
    expect(background(diagram)).toBe(background(plain));
    expect(
      hintBackground(colors, {
        regions: [],
        cellRole: 'potential',
        focused: true,
        conflict: false,
      }),
    ).toBe(colors.hintRegion);
    expect(
      hintBackground(colors, {
        regions: [],
        cellRole: 'result',
        focused: true,
        conflict: false,
      }),
    ).toBe(colors.hintResult);
    expect(
      hintBackground(colors, {
        regions: [],
        cellRole: 'result',
        focused: true,
        conflict: true,
      }),
    ).toBe(colors.errorSoft);
  },
);

test.each(['light', 'dark'] as const)(
  '%s fish uses distinct themed regions, a legend and no region outlines',
  mode => {
    const f = HINT_LAB_ALL_FIXTURES.find(
      item => item.techniqueCode === 'jellyfish',
    )!;
    const visuals = buildHintPresentation(
      f.step,
      undefined,
      'game',
      f.candidateMasks,
    ).pages[0].visuals;
    const sourceTheme = warmPaperTheme.appearances[mode];
    const colors = {
      ...sourceTheme.boardTheme.colors,
      fishBaseSoft: '#CCDDEE',
      fishCoverSoft: '#EEDDCC',
    };
    const theme = {
      ...warmPaperTheme,
      appearances: {
        ...warmPaperTheme.appearances,
        [mode]: {
          ...sourceTheme,
          boardTheme: { ...sourceTheme.boardTheme, colors },
        },
      },
    };
    let tree!: Renderer.ReactTestRenderer;
    act(() => {
      tree = Renderer.create(
        <ThemeProvider preference={mode} theme={theme}>
          <SudokuBoard
            state={createHintLabSession(f).state}
            hintVisuals={visuals}
            hintAnimations={false}
            onSelectCell={jest.fn()}
          />
        </ThemeProvider>,
      );
    });
    const marks = semanticRegionMarks(visuals, []);
    const inRegion = (cell: number, index: number, kind: string) =>
      (kind === 'row' ? Math.floor(cell / 9) : cell % 9) === index;
    for (let cell = 0; cell < 81; cell++) {
      const base = marks.some(
        m =>
          m.role === 'fishBase' &&
          inRegion(cell, m.region.index, m.region.kind),
      );
      const cover = marks.some(
        m =>
          m.role === 'fishCover' &&
          inRegion(cell, m.region.index, m.region.kind),
      );
      if (!base && !cover) continue;
      expect(
        StyleSheet.flatten(
          tree.root.findByProps({ testID: `sudoku-cell-index-${cell}` }).props
            .style,
        ).backgroundColor,
      ).toBe(base ? colors.fishBaseSoft : colors.fishCoverSoft);
    }
    expect(
      tree.root.findAll(
        node =>
          typeof node.props.testID === 'string' &&
          /^sudoku-fish-(base|cover)-/.test(node.props.testID),
      ),
    ).toHaveLength(0);
    expect(
      tree.root.findByProps({ testID: 'sudoku-fish-legend' }),
    ).toBeDefined();
    expect(
      tree.root.findAllByProps({ testID: 'sudoku-cell-established' }),
    ).toHaveLength(0);
    act(() => tree.unmount());
  },
);

test.each(
  HINT_LAB_ALL_FIXTURES.filter(
    f =>
      f.difficultyLevel === 5 &&
      f.id === `hint-lab-${f.techniqueCode}-v1` &&
      f.techniqueCode !== 'jellyfish',
  ),
)(
  '$techniqueCode renders its observed cells without the old green fallback',
  f => {
    const visuals = buildHintPresentation(
      f.step,
      undefined,
      'game',
      f.candidateMasks,
    ).pages[0].visuals;
    let tree!: Renderer.ReactTestRenderer;
    act(() => {
      tree = Renderer.create(
        <ThemeProvider preference="light">
          <SudokuBoard
            state={createHintLabSession(f).state}
            hintVisuals={visuals}
            hintAnimations={false}
            onSelectCell={jest.fn()}
          />
        </ThemeProvider>,
      );
    });
    expect(
      tree.root.findAllByProps({ testID: 'sudoku-cell-established' }),
    ).toHaveLength(0);
    for (const cell of visuals.focusCells ?? []) {
      expect(
        StyleSheet.flatten(
          tree.root.findByProps({ testID: `sudoku-cell-index-${cell}` }).props
            .style,
        ).backgroundColor,
      ).toBe(warmPaperTheme.appearances.light.boardTheme.colors.hintRegion);
    }
    act(() => tree.unmount());
  },
);
