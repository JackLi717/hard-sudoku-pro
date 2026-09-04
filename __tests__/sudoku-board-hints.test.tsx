import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import { ThemeProvider, darkPalette, lightPalette } from '../src/ui/theme';
import {
  SudokuBoard,
  candidateFocusMatch,
  hintLinkSegments,
  sudokuBoardLayout,
} from '../src/ui/components/SudokuBoard';
import {
  addCandidate,
  GameDefinition,
  HINT_STEP_CONTRACT_VERSION,
  HintPageVisuals,
  HintStep,
  createGameSession,
} from '../src/domain';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import { kiteGame, kiteHint } from './helpers/ipad-hint-assistance';

const puzzle =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

test.each(['light', 'dark'] as const)(
  'kite keeps its whole spotlight in %s, labels assumptions and cleans them up on back/conclusion',
  async theme => {
    const state = { ...kiteGame().state, activeHint: kiteHint };
    const before = JSON.stringify(state);
    const pages = buildHintPresentation(kiteHint).pages;
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    const render = (index: number) => (
      <ThemeProvider preference={theme}>
        <SudokuBoard
          disabled
          hintAnimations={false}
          state={state}
          hintVisuals={pages[index].visuals}
          onSelectCell={jest.fn()}
        />
      </ThemeProvider>
    );
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(render(0));
    });
    const mask = () =>
      renderer.root
        .findAllByProps({ testID: 'sudoku-hint-mask' })[0]
        .props.children.map(
          (child: React.ReactElement<{ style: unknown }>) => child.props.style,
        );
    const originalMask = mask();
    const litValue = renderer.root
      .findAllByProps({
        testID: 'sudoku-cell-index-28',
      })[0]
      .findByType(Text);
    expect(StyleSheet.flatten(litValue.props.style).opacity ?? 1).toBe(1);
    const backgroundValue = renderer.root
      .findAllByProps({
        testID: 'sudoku-cell-index-0',
      })[0]
      .findByType(Text);
    expect(StyleSheet.flatten(backgroundValue.props.style).opacity).toBe(0.18);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-hint-links' }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-question-32' }).length,
    ).toBeGreaterThan(0);
    for (const page of [3, 4, 5, 6]) {
      await ReactTestRenderer.act(async () => renderer.update(render(page)));
      expect(mask()).toEqual(originalMask);
      expect(
        renderer.root.findAllByProps({ testID: 'sudoku-hypothetical-32' })
          .length,
      ).toBeGreaterThan(0);
      expect(
        renderer.root.findAllByProps({ testID: 'sudoku-cell-index-32' })[0]
          .props.accessibilityLabel,
      ).toContain('not a confirmed answer');
    }
    const conflictCell = renderer.root.findAllByProps({
      testID: 'sudoku-cell-index-62',
    })[0];
    expect(conflictCell.props.accessibilityLabel).toContain('repeated digit');
    for (const page of [2, 7]) {
      await ReactTestRenderer.act(async () => renderer.update(render(page)));
      expect(
        renderer.root.findAll(
          n =>
            typeof n.props.testID === 'string' &&
            n.props.testID.startsWith('sudoku-hypothetical-'),
        ),
      ).toHaveLength(0);
      expect(mask()).toEqual(originalMask);
    }
    expect(JSON.stringify(state)).toBe(before);
    await ReactTestRenderer.act(async () => renderer.unmount());
  },
);

test('kite links stay inside the board at phone and tablet sizes', () => {
  for (const size of [296, 366, 700]) {
    for (const link of buildHintPresentation(kiteHint).pages[0].visuals
      .links!) {
      const segments = hintLinkSegments(link, size);
      expect(segments.length).toBeGreaterThan(0);
      for (const segment of segments) {
        expect(segment.width).toBeGreaterThan(0);
        expect(segment.left).toBeGreaterThanOrEqual(0);
        expect(segment.top).toBeGreaterThanOrEqual(0);
      }
    }
  }
});

test('only the two pair lines extend past their outer candidates to the board edge', () => {
  const pages = buildHintPresentation(kiteHint).pages;
  for (const page of pages) {
    expect(page.visuals.links!.filter(link => link.extendFrom)).toHaveLength(2);
  }
  const row = hintLinkSegments(
    { from: 77, to: 79, kind: 'pair', extendFrom: true },
    360,
  );
  const column = hintLinkSegments(
    { from: 35, to: 62, kind: 'pair', extendFrom: true },
    360,
  );
  expect(row).toHaveLength(2);
  expect(column).toHaveLength(2);
  expect(row[1]).toMatchObject({ left: 3, top: 339, height: 2 });
  expect(column[1]).toMatchObject({ left: 339, top: 3, width: 2 });
  // The extension stops before the digit, preserving its legibility.
  expect(Number(row[1].left) + Number(row[1].width)).toBeLessThan(220);
  expect(Number(column[1].top) + Number(column[1].height)).toBeLessThan(140);
});

const definition: GameDefinition = {
  puzzleId: 'hint-board',
  contentVersion: 4,
  difficultyLevel: 3,
  puzzleFingerprint: puzzle,
  solutionFingerprint: solution,
};

const visuals: HintPageVisuals = {
  showFocusCells: true,
  showFocusRegions: true,
  showPremises: true,
  showEliminations: true,
  showPlacements: true,
};

function renderStep(step: HintStep, pageVisuals: HintPageVisuals = visuals) {
  const session = createGameSession({
    sessionId: 'hint-board-session',
    definition,
    startedAtEpochMs: 1_000,
  });
  const state = { ...session.state, activeHint: step };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SudokuBoard
        disabled
        hintVisuals={pageVisuals}
        onSelectCell={() => undefined}
        state={state}
      />,
    );
  });
  return renderer;
}

describe('SudokuBoard responsive layout', () => {
  test('keeps the existing phone size', () => {
    expect(sudokuBoardLayout(390, 844)).toEqual({
      boardSize: 366,
      textScale: 1,
    });
  });

  test('uses the available iPad mini width and scales board text', () => {
    expect(sudokuBoardLayout(744, 1133)).toEqual({
      boardSize: 700,
      textScale: 700 / 540,
    });
  });
});

describe('candidate focus hierarchy', () => {
  test('classifies exact, containing, partial and non-adjacent combinations', () => {
    const twoThree = addCandidate(addCandidate(0, 2), 3);
    const oneTwoThree = addCandidate(twoThree, 1);
    const twoSeven = addCandidate(addCandidate(0, 2), 7);

    expect(candidateFocusMatch(null, twoThree, [2, 3])).toBe('exact');
    expect(candidateFocusMatch(null, oneTwoThree, [2, 3])).toBe('contains');
    expect(candidateFocusMatch(null, twoThree, [2, 7])).toBe('partial');
    expect(candidateFocusMatch(null, twoSeven, [2, 7])).toBe('exact');
    expect(candidateFocusMatch(2, 0, [2])).toBe('occurrence');
    expect(candidateFocusMatch(2, 0, [2, 3])).toBe('partial');
  });
});

describe('SudokuBoard hint evidence', () => {
  test('keeps board glyphs fixed when system text size changes', () => {
    const session = createGameSession({
      sessionId: 'fixed-board-type',
      definition,
      startedAtEpochMs: 1_000,
    });
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SudokuBoard onSelectCell={() => undefined} state={session.state} />,
      );
    });
    const boardGlyphs = renderer.root.findAllByType(Text);
    expect(boardGlyphs.length).toBeGreaterThan(0);
    expect(
      boardGlyphs.every(glyph => glyph.props.allowFontScaling === false),
    ).toBe(true);
  });

  test('respects normal-play region and same-digit highlight settings', () => {
    const session = createGameSession({
      sessionId: 'highlight-preferences',
      definition,
      startedAtEpochMs: 1_000,
    });
    const state = { ...session.state, selectedCell: 0 as const };
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SudokuBoard
          highlightDigit={5}
          highlightRegions={false}
          highlightSameDigit={false}
          onSelectCell={() => undefined}
          state={state}
        />,
      );
    });

    const peer = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'sudoku-cell-index-1' }).props.style,
    );
    const sameDigit = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'sudoku-cell-index-0' }).props.style,
    );
    expect(peer.backgroundColor).toBe('#FFFDF8');
    expect(sameDigit.backgroundColor).toBe('#B9DED1');

    ReactTestRenderer.act(() => {
      renderer.update(
        <SudokuBoard
          highlightDigit={5}
          highlightRegions={false}
          highlightSameDigit
          onSelectCell={() => undefined}
          state={{ ...state, selectedCell: null }}
        />,
      );
    });
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'sudoku-cell-index-0' }).props
          .style,
      ).backgroundColor,
    ).toBe('#CDE7DE');
  });

  test.each([
    ['light', 'manual', lightPalette],
    ['dark', 'manual', darkPalette],
    ['light', 'quick', lightPalette],
    ['dark', 'quick', darkPalette],
  ] as const)(
    'uses Focus colors for selected candidates in %s theme with %s notes',
    (theme, candidateSource, palette) => {
      const session = createGameSession({
        sessionId: 'candidate-highlight',
        definition,
        startedAtEpochMs: 1_000,
      });
      const candidates = [...session.state.candidates.manualCandidates];
      candidates[2] = addCandidate(addCandidate(0, 4), 5);
      const state = {
        ...session.state,
        candidates: {
          ...session.state.candidates,
          activeCandidateSource: candidateSource,
          manualCandidates: candidates,
          quickCandidates: candidates,
        },
        selectedCell: 0 as const,
      };

      const renderBoard = (highlightSameDigit: boolean) => (
        <ThemeProvider preference={theme}>
          <SudokuBoard
            highlightSameDigit={highlightSameDigit}
            onSelectCell={() => undefined}
            state={state}
          />
        </ThemeProvider>
      );
      let renderer!: ReactTestRenderer.ReactTestRenderer;
      ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(renderBoard(true));
      });

      const highlighted = renderer.root.findByProps({
        testID: 'sudoku-candidate-slot-5',
      });
      const other = renderer.root.findByProps({
        testID: 'sudoku-candidate-slot-4',
      });
      expect(StyleSheet.flatten(highlighted.props.style).backgroundColor).toBe(
        palette.focus,
      );
      expect(
        StyleSheet.flatten(highlighted.findByType(Text).props.style).color,
      ).toBe(palette.focusText);
      expect(
        StyleSheet.flatten(other.props.style).backgroundColor,
      ).toBeUndefined();
      expect(StyleSheet.flatten(other.findByType(Text).props.style).color).toBe(
        palette.accent,
      );

      ReactTestRenderer.act(() => {
        renderer.update(renderBoard(false));
      });
      expect(
        StyleSheet.flatten(highlighted.props.style).backgroundColor,
      ).toBeUndefined();
      expect(
        StyleSheet.flatten(highlighted.findByType(Text).props.style).color,
      ).toBe(palette.accent);
    },
  );

  test('fills exact combinations and keeps other matches inside candidates', () => {
    const session = createGameSession({
      sessionId: 'candidate-focus',
      definition,
      startedAtEpochMs: 1_000,
    });
    const manualCandidates = [...session.state.candidates.manualCandidates];
    manualCandidates[2] = addCandidate(addCandidate(0, 2), 3);
    manualCandidates[3] = addCandidate(addCandidate(addCandidate(0, 1), 2), 3);
    manualCandidates[5] = addCandidate(addCandidate(0, 2), 4);
    const state = {
      ...session.state,
      candidates: {
        ...session.state.candidates,
        manualCandidates,
      },
      selectedCell: 1,
    };

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SudokuBoard
          focusedDigits={[2, 3]}
          highlightRegions={false}
          highlightSameDigit
          onSelectCell={() => undefined}
          state={state}
        />,
      );
    });

    const exactCell = renderer.root.findByProps({
      testID: 'sudoku-cell-index-2',
    });
    const containingCell = renderer.root.findByProps({
      testID: 'sudoku-cell-index-3',
    });
    const partialCell = renderer.root.findByProps({
      testID: 'sudoku-cell-index-5',
    });

    expect(StyleSheet.flatten(exactCell.props.style).backgroundColor).toBe(
      '#BDD2FF',
    );
    expect(
      StyleSheet.flatten(
        exactCell.findByProps({ testID: 'sudoku-candidate-slot-2' }).props
          .style,
      ).backgroundColor,
    ).toBe('#2563D6');
    expect(
      StyleSheet.flatten(
        exactCell.findByProps({ testID: 'sudoku-candidate-slot-3' }).props
          .style,
      ).backgroundColor,
    ).toBe('#2563D6');
    expect(
      exactCell.findAllByProps({ testID: 'sudoku-cell-focus-exact-2' }),
    ).toHaveLength(0);

    expect(StyleSheet.flatten(containingCell.props.style).backgroundColor).toBe(
      '#FFFDF8',
    );
    expect(
      containingCell.findAllByProps({
        testID: 'sudoku-cell-focus-contains-3',
      }),
    ).toHaveLength(0);
    expect(
      StyleSheet.flatten(
        containingCell.findByProps({ testID: 'sudoku-candidate-slot-2' }).props
          .style,
      ).backgroundColor,
    ).toBe('#2563D6');

    expect(
      StyleSheet.flatten(
        partialCell.findByProps({ testID: 'sudoku-candidate-slot-2' }).props
          .style,
      ).backgroundColor,
    ).toBe('#2563D6');
    expect(
      StyleSheet.flatten(
        partialCell
          .findByProps({ testID: 'sudoku-candidate-slot-2' })
          .findByType(Text).props.style,
      ).color,
    ).toBe('#FFFFFF');
    expect(
      partialCell.findAllByProps({ testID: 'sudoku-cell-focus-partial-5' }),
    ).toHaveLength(0);
    const filledContextCell = renderer.root.findByProps({
      testID: 'sudoku-cell-index-35',
    });
    expect(
      StyleSheet.flatten(filledContextCell.props.style).backgroundColor,
    ).toBe('#FFFDF8');
    expect(
      StyleSheet.flatten(filledContextCell.findByType(Text).props.style).color,
    ).toBe('#2563D6');
  });

  test('announces a filled value used by the current proof page', () => {
    const step: HintStep = {
      contractVersion: HINT_STEP_CONTRACT_VERSION,
      boardFingerprint: puzzle,
      techniqueCode: 'hiddenSingle',
      difficultyLevel: 1,
      focusCells: [44],
      focusRegions: [{ kind: 'box', index: 5 }],
      premiseCandidates: [{ cell: 44, digit: 4 }],
      eliminations: [],
      placements: [{ cell: 44, digit: 4 }],
      explanationKey: 'hint.hiddenSingle',
      explanationParams: {},
    };
    const renderer = renderStep(step, {
      showFocusCells: false,
      showFocusRegions: true,
      showPremises: false,
      showEliminations: false,
      showPlacements: false,
      focusCells: [1],
      focusRegions: [{ kind: 'row', index: 0 }],
      valueEvidence: [{ cell: 0, digit: 5 }],
    });

    expect(
      renderer.root.findByProps({
        accessibilityLabel:
          'Row 1, column 1, 5, hint focus region, placed value used as hint evidence',
      }),
    ).toBeTruthy();
  });

  test('draws a complete independent grid with stable line weights', () => {
    const step: HintStep = {
      contractVersion: HINT_STEP_CONTRACT_VERSION,
      boardFingerprint: puzzle,
      techniqueCode: 'nakedSingle',
      difficultyLevel: 1,
      focusCells: [],
      focusRegions: [],
      premiseCandidates: [],
      eliminations: [],
      placements: [{ cell: 40, digit: 5 }],
      explanationKey: 'hint.nakedSingle',
      explanationParams: {},
    };
    const renderer = renderStep(step);
    const vertical = Array.from({ length: 10 }, (_, index) =>
      renderer.root.findByProps({ testID: `sudoku-grid-vertical-${index}` }),
    );
    const horizontal = Array.from({ length: 10 }, (_, index) =>
      renderer.root.findByProps({ testID: `sudoku-grid-horizontal-${index}` }),
    );

    expect(vertical).toHaveLength(10);
    expect(horizontal).toHaveLength(10);
    expect(StyleSheet.flatten(vertical[1].props.style).width).toBe(1);
    expect(StyleSheet.flatten(vertical[3].props.style).width).toBe(2.5);
    expect(StyleSheet.flatten(vertical[9].props.style).width).toBe(3);
    expect(StyleSheet.flatten(horizontal[1].props.style).height).toBe(1);
    expect(StyleSheet.flatten(horizontal[6].props.style).height).toBe(2.5);
    expect(StyleSheet.flatten(horizontal[0].props.style).height).toBe(3);
  });

  test('does not mount empty candidate grids', () => {
    const session = createGameSession({
      sessionId: 'empty-candidates',
      definition,
      startedAtEpochMs: 1_000,
    });
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SudokuBoard onSelectCell={() => undefined} state={session.state} />,
      );
    });

    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-candidate-grid' }),
    ).toHaveLength(0);
  });

  test('announces premise and crossed-out elimination candidates', () => {
    const step: HintStep = {
      contractVersion: HINT_STEP_CONTRACT_VERSION,
      boardFingerprint: puzzle,
      techniqueCode: 'lockedCandidates.pointing',
      difficultyLevel: 2,
      focusCells: [2],
      focusRegions: [{ kind: 'row', index: 0 }],
      premiseCandidates: [{ cell: 2, digit: 2 }],
      eliminations: [{ cell: 2, digit: 1 }],
      placements: [],
      explanationKey: 'hint.lockedCandidates.pointing',
      explanationParams: {},
    };
    const renderer = renderStep(step);
    const cell = renderer.root.find(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Row 1, column 3,'),
    );

    expect(cell.props.accessibilityLabel).toContain('hint premise 2');
    expect(cell.props.accessibilityLabel).toContain('remove candidate 1');
    expect(cell.props.accessibilityLabel).toContain('hint focus region');
    expect(cell.props.accessibilityLabel).toContain('hint focus cell');
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-candidate-slot-1' }),
    ).not.toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-candidate-slot-2' }),
    ).not.toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-candidate-slot-3' }),
    ).toHaveLength(0);
  });

  test('announces a placement before the user applies it', () => {
    const step: HintStep = {
      contractVersion: HINT_STEP_CONTRACT_VERSION,
      boardFingerprint: puzzle,
      techniqueCode: 'nakedSingle',
      difficultyLevel: 1,
      focusCells: [40],
      focusRegions: [{ kind: 'box', index: 4 }],
      premiseCandidates: [{ cell: 40, digit: 5 }],
      eliminations: [],
      placements: [{ cell: 40, digit: 5 }],
      explanationKey: 'hint.nakedSingle',
      explanationParams: {},
    };
    const renderer = renderStep(step);
    const cell = renderer.root.find(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Row 5, column 5,'),
    );

    expect(cell.props.accessibilityLabel).toContain('place 5');
  });

  test('renders semantic spotlight and marks without restyling grid lines', () => {
    const step: HintStep = {
      contractVersion: HINT_STEP_CONTRACT_VERSION,
      boardFingerprint: puzzle,
      techniqueCode: 'lockedCandidates.pointing',
      difficultyLevel: 2,
      focusCells: [18],
      focusRegions: [
        { kind: 'box', index: 0 },
        { kind: 'column', index: 0 },
      ],
      premiseCandidates: [{ cell: 18, digit: 1 }],
      eliminations: [{ cell: 54, digit: 1 }],
      placements: [],
      explanationKey: 'hint.lockedCandidates.pointing',
      explanationParams: {},
    };
    const renderer = renderStep(step, {
      showFocusCells: true,
      showFocusRegions: true,
      showPremises: true,
      showEliminations: true,
      showPlacements: false,
      focusCells: [18],
      focusRegions: [
        { kind: 'box', index: 0 },
        { kind: 'column', index: 0 },
      ],
      premiseCandidates: [{ cell: 18, digit: 1 }],
      eliminations: [{ cell: 54, digit: 1 }],
      regionMarks: [
        { region: { kind: 'box', index: 0 }, role: 'source' },
        { region: { kind: 'column', index: 0 }, role: 'affected' },
      ],
      cellMarks: [
        { cell: 18, role: 'established' },
        { cell: 54, role: 'eliminationTarget' },
        { cell: 56, role: 'eliminationTarget' },
      ],
      candidateMarks: [
        { cell: 18, digit: 1, role: 'potential' },
        {
          cell: 54,
          digit: 1,
          role: 'excluded',
          exclusionKind: 'result',
        },
        {
          cell: 56,
          digit: 2,
          role: 'excluded',
          exclusionKind: 'explanation',
        },
      ],
    });

    expect(
      renderer.root.findByProps({ testID: 'sudoku-hint-mask' }),
    ).toBeTruthy();
    expect(
      renderer.root.findAllByProps({
        testID: 'sudoku-region-source-box-0',
      }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({
        testID: 'sudoku-region-affected-column-0',
      }),
    ).toHaveLength(0);
    const thinGridLine = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'sudoku-grid-vertical-1' }).props
        .style,
    );
    const boxGridLine = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'sudoku-grid-vertical-3' }).props
        .style,
    );
    expect(thinGridLine.backgroundColor).toBe('#26312D');
    expect(thinGridLine.width).toBe(1);
    expect(boxGridLine.backgroundColor).toBe('#26312D');
    expect(boxGridLine.width).toBe(2.5);
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'sudoku-cell-established' }).props
          .style,
      ).backgroundColor,
    ).toBe('#FFF0B3');
    const candidateBadgeStyle = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'sudoku-candidate-potential-1' })
        .props.style,
    );
    expect(candidateBadgeStyle.backgroundColor).toBe('#2563D6');
    expect(candidateBadgeStyle.aspectRatio).toBe(1);
    expect(candidateBadgeStyle.width).toBe('78%');
    expect(candidateBadgeStyle.minHeight).toBeUndefined();
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'sudoku-candidate-strike-1' }).props
          .style,
      ).backgroundColor,
    ).toBe('#D83B57');
    const explanatoryCell = renderer.root.find(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Row 7, column 3,'),
    );
    expect(explanatoryCell.props.accessibilityLabel).toContain(
      'candidate ruled out 2',
    );
    expect(explanatoryCell.props.accessibilityLabel).not.toContain(
      'remove candidate 2',
    );
  });
});
