import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import {
  HINT_LAB_ALL_FIXTURES,
  HINT_LAB_FIXTURES,
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
  HINT_LAB_FIXTURES.filter(
    f => f.difficultyLevel === 5 && f.techniqueCode !== 'jellyfish',
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
      const isResultTarget = visuals.cellMarks?.some(
        mark => mark.cell === cell && mark.role === 'result',
      );
      expect(
        StyleSheet.flatten(
          tree.root.findByProps({ testID: `sudoku-cell-index-${cell}` }).props
            .style,
        ).backgroundColor,
      ).toBe(
        isResultTarget
          ? warmPaperTheme.appearances.light.boardTheme.colors.hintResult
          : warmPaperTheme.appearances.light.boardTheme.colors.hintRegion,
      );
    }
    act(() => tree.unmount());
  },
);

test.each(['light', 'dark'] as const)(
  '%s full house keeps its evidence region visible and uses the selected theme',
  async mode => {
    const fixture = HINT_LAB_ALL_FIXTURES.find(
      f => f.techniqueCode === 'fullHouse',
    )!;
    const pages = buildHintPresentation(
      fixture.step,
      undefined,
      'game',
      fixture.candidateMasks,
    ).pages;
    const source = warmPaperTheme.appearances[mode];
    const colors = {
      ...source.boardTheme.colors,
      hintRegion: '#123456',
      hintCandidate: '#ABCDEF',
      hintResult: '#345678',
    };
    const theme = {
      ...warmPaperTheme,
      appearances: {
        ...warmPaperTheme.appearances,
        [mode]: { ...source, boardTheme: { ...source.boardTheme, colors } },
      },
    };
    const regionCells = [33, 34, 35, 42, 43, 44, 51, 52, 53];
    expect(pages[0].visuals.valueEvidence).toHaveLength(8);
    let tree!: Renderer.ReactTestRenderer;
    for (const [index, page] of pages.entries()) {
      expect(page.visuals.spotlightCells).toEqual(regionCells);
      await act(async () => {
        const view = (
          <ThemeProvider preference={mode} theme={theme}>
            <SudokuBoard
              state={createHintLabSession(fixture).state}
              hintVisuals={page.visuals}
              hintAnimations={false}
              onSelectCell={jest.fn()}
            />
          </ThemeProvider>
        );
        if (tree) tree.update(view);
        else tree = Renderer.create(view);
      });
      for (const cell of regionCells) {
        const node = tree.root.findByProps({
          testID: `sudoku-cell-index-${cell}`,
        });
        expect(StyleSheet.flatten(node.props.style).backgroundColor).toBe(
          index === pages.length - 1 && cell === 52
            ? colors.hintResult
            : colors.hintRegion,
        );
      }
      if (index === 0) {
        const evidence = tree.root.findByProps({
          testID: 'sudoku-cell-index-33',
        });
        expect(
          evidence.findAll(
            node =>
              node.props.children === 7 &&
              StyleSheet.flatten(node.props.style)?.color ===
                colors.hintCandidate,
          ).length,
        ).toBeGreaterThan(0);
      }
    }
    await act(async () => tree.unmount());
  },
);

test('hidden single keeps the searched region and every current blocker above the mask', () => {
  const fixture = HINT_LAB_ALL_FIXTURES.find(
    f => f.techniqueCode === 'hiddenSingle',
  )!;
  const before = JSON.stringify(fixture);
  const pages = buildHintPresentation(
    fixture.step,
    undefined,
    'game',
    fixture.candidateMasks,
  ).pages;
  const regionCells = [72, 73, 74, 75, 76, 77, 78, 79, 80];
  const blockingPages = pages.filter(
    page => page.visuals.valueEvidence?.length,
  );
  expect(blockingPages).toHaveLength(3);
  for (const page of pages) {
    expect(page.visuals.spotlightCells).toEqual(
      expect.arrayContaining(regionCells),
    );
    for (const evidence of page.visuals.valueEvidence ?? []) {
      expect(page.visuals.spotlightCells).toContain(evidence.cell);
    }
    for (const exclusion of page.visuals.eliminations ?? []) {
      expect(page.visuals.spotlightCells).toContain(exclusion.cell);
    }
  }
  expect(pages.at(-1)?.visuals.placements).toEqual(fixture.step.placements);
  expect(JSON.stringify(fixture)).toBe(before);
});

test.each(['light', 'dark'] as const)(
  '%s fins use the current theme locally, keep a text legend and preserve exclusion marks',
  mode => {
    const f = HINT_LAB_ALL_FIXTURES.find(
      item => item.techniqueCode === 'finnedXWing',
    )!;
    const pages = buildHintPresentation(
      f.step,
      undefined,
      'game',
      f.candidateMasks,
    ).pages;
    const source = warmPaperTheme.appearances[mode];
    const colors = {
      ...source.boardTheme.colors,
      fishFin: '#127780',
      fishFinSoft: '#DEF3F4',
    };
    const theme = {
      ...warmPaperTheme,
      appearances: {
        ...warmPaperTheme.appearances,
        [mode]: { ...source, boardTheme: { ...source.boardTheme, colors } },
      },
    };
    let tree!: Renderer.ReactTestRenderer;
    const render = (visuals: HintPageVisuals) => (
      <ThemeProvider preference={mode} theme={theme}>
        <SudokuBoard
          state={createHintLabSession(f).state}
          hintVisuals={visuals}
          hintAnimations={false}
          onSelectCell={jest.fn()}
        />
      </ThemeProvider>
    );
    act(() => {
      tree = Renderer.create(render(pages[0].visuals));
    });
    const fin = pages[0].visuals.finCandidates![0];
    const badge = tree.root.findByProps({
      testID: `sudoku-diagram-${fin.cell}`,
    });
    expect(StyleSheet.flatten(badge.props.style)).toMatchObject({
      borderColor: colors.fishFin,
      backgroundColor: colors.fishFinSoft,
      borderWidth: 2,
    });
    expect(
      tree.root
        .findAllByProps({ testID: 'sudoku-fin-legend' })
        .filter(node => typeof node.type === 'string'),
    ).toHaveLength(1);
    for (const page of pages.filter(
      item => item.teaching?.rule === 'finTrue',
    )) {
      act(() => {
        tree.update(render(page.visuals));
      });
      const selected = page.visuals.hypotheticalValues![0];
      const assumptions = tree.root.findAll(
        node =>
          typeof node.type === 'string' &&
          String(node.props.testID ?? '').startsWith('sudoku-hypothetical-'),
      );
      expect(assumptions).toHaveLength(1);
      expect(assumptions[0].props.testID).toBe(
        `sudoku-hypothetical-${selected.cell}`,
      );
      for (const other of page.visuals.finCandidates!.filter(
        c => c.cell !== selected.cell,
      )) {
        expect(
          tree.root.findAllByProps({
            testID: `sudoku-diagram-cross-${other.cell}`,
          }),
        ).toHaveLength(0);
      }
    }
    act(() => {
      tree.update(
        render(pages.find(page => page.teaching?.rule === 'finFalse')!.visuals),
      );
    });
    expect(
      tree.root
        .findAllByProps({ testID: `sudoku-diagram-cross-${fin.cell}` })
        .filter(node => typeof node.type === 'string'),
    ).toHaveLength(1);
    act(() => {
      tree.update(render(pages[0].visuals));
    });
    expect(
      tree.root
        .findAllByProps({ testID: `sudoku-diagram-cross-${fin.cell}` })
        .filter(node => typeof node.type === 'string'),
    ).toHaveLength(0);
    act(() => {
      tree.unmount();
    });
  },
);
