import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { HintStep } from '../src/domain/hints/contracts';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import { turbotFishProof } from '../src/domain/hints/turbot-fish-proof';
import {
  HINT_PRESENTATION_COPIES,
  LocalizationProvider,
} from '../src/localization';
import { HINT_LAB_FIXTURES } from '../src/debug/hint-lab';
import {
  boardFromFingerprint,
  createSolverCandidates,
  removeCandidate,
  addCandidate,
} from '../src/domain/sudoku/board';
import { kiteGame } from './helpers/ipad-hint-assistance';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import { ThemeProvider } from '../src/ui/theme';

// The user's approved diagram: box 6 + row 9, conflicting in column 8.
const board =
  '627419538139285700485637219574391682213800490968042301892063100351904800746108903';
const step: HintStep = {
  contractVersion: 1,
  boardFingerprint: board,
  techniqueCode: 'turbotFish',
  difficultyLevel: 4,
  focusCells: [44, 52, 76, 79],
  focusRegions: [],
  premiseCandidates: [44, 52, 76, 79].map(cell => ({ cell, digit: 5 })),
  eliminations: [{ cell: 40, digit: 5 }],
  placements: [],
  explanationKey: 'hint.turbotFish',
  explanationParams: {},
};
const candidates = createSolverCandidates(boardFromFingerprint(board));

test.each(Object.entries(HINT_PRESENTATION_COPIES))(
  '%s follows the approved eight diagram scenes without applying hypothetical values',
  (_, copy) => {
    const saved = JSON.stringify({ step, candidates });
    const pages = buildHintPresentation(step, copy, 'game', candidates).pages;
    expect(pages).toHaveLength(8);
    expect(turbotFishProof(step)).toMatchObject({
      firstEnd: 44,
      firstInner: 52,
      secondEnd: 76,
      secondInner: 79,
      firstRegion: { kind: 'box', index: 5 },
      secondRegion: { kind: 'row', index: 8 },
      conflictRegion: { kind: 'column', index: 7 },
    });
    for (const page of pages) {
      expect(page.body).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(page.visuals.diagramDigit).toBe(5);
      expect(page.visuals.placements).toEqual([]);
      expect(page.visuals.spotlightCells).toEqual(
        pages[0].visuals.spotlightCells,
      );
      expect(page.visuals.links?.map(l => [l.from, l.to, l.kind])).toEqual(
        pages[0].visuals.links?.map(l => [l.from, l.to, l.kind]),
      );
    }
    expect(pages[3].visuals.hypotheticalValues).toEqual([
      { cell: 40, digit: 5, role: 'assumption' },
    ]);
    expect(pages[4].visuals.eliminations).toEqual([
      { cell: 44, digit: 5 },
      { cell: 76, digit: 5 },
    ]);
    expect(pages[5].visuals.hypotheticalValues).toContainEqual({
      cell: 52,
      digit: 5,
      role: 'consequence',
    });
    expect(
      pages[6].visuals.hypotheticalValues
        ?.filter(c => c.conflict)
        .map(c => c.cell),
    ).toEqual([52, 79]);
    expect(pages[6].visuals.diagramRegions).toEqual([
      { region: { kind: 'column', index: 7 }, conflict: true },
    ]);
    expect(pages[7].visuals.eliminations).toEqual(step.eliminations);
    expect(pages[7].visuals.hypotheticalValues).toEqual([]);
    expect(JSON.stringify({ step, candidates })).toBe(saved);
  },
);

test('rotations and digit changes use the actual region, not a hardcoded column or box', () => {
  const rotate = (cell: number) => (cell % 9) * 9 + 8 - Math.floor(cell / 9);
  const transformed = Array(81).fill('0');
  [...board].forEach((v, c) => {
    transformed[rotate(c)] = v === '5' ? '2' : v === '2' ? '5' : v;
  });
  const rotated: HintStep = {
    ...step,
    boardFingerprint: transformed.join(''),
    focusCells: step.focusCells.map(rotate),
    premiseCandidates: [...step.premiseCandidates]
      .reverse()
      .map(c => ({ cell: rotate(c.cell), digit: 2 })),
    eliminations: [{ cell: rotate(40), digit: 2 }],
  };
  expect(turbotFishProof(rotated)?.conflictRegion).toEqual({
    kind: 'row',
    index: 7,
  });
  expect(
    buildHintPresentation(rotated)
      .pages[6].visuals.hypotheticalValues?.filter(c => c.conflict)
      .every(c => c.digit === 2),
  ).toBe(true);
});

test('verifies saved eliminations and falls back when the pairs cannot be established', () => {
  const empty: HintStep = { ...step, boardFingerprint: '0'.repeat(81) };
  const snapshot = Array.from({ length: 81 }, (_, cell) => {
    const inBox =
      Math.floor(cell / 27) === 1 && Math.floor((cell % 9) / 3) === 2;
    return (inBox || Math.floor(cell / 9) === 8) &&
      ![44, 52, 76, 79].includes(cell)
      ? removeCandidate(511, 5)
      : 511;
  });
  expect(turbotFishProof(empty)).toBeNull();
  expect(
    buildHintPresentation(empty, undefined, 'replay', snapshot).pages,
  ).toHaveLength(8);
  const extra = [...snapshot];
  extra[42] = addCandidate(extra[42], 5);
  expect(turbotFishProof(empty, extra)).toBeNull();
  expect(
    turbotFishProof({ ...step, eliminations: [{ cell: 40, digit: 4 }] }),
  ).toBeNull();
  expect(
    turbotFishProof({ ...step, eliminations: [{ cell: 48, digit: 5 }] }),
  ).toBeNull();
  expect(
    buildHintPresentation(empty, undefined, 'game', extra).pages.every(
      p => p.visuals.diagramDigit === undefined,
    ),
  ).toBe(true);
});

test('native fixture also receives a verified diagram', () => {
  const fixture = HINT_LAB_FIXTURES.find(
    f => f.techniqueCode === 'turbotFish',
  )!;
  const pages = buildHintPresentation(
    fixture.step,
    undefined,
    'game',
    fixture.candidateMasks,
  ).pages;
  expect(pages.length).toBeGreaterThanOrEqual(8);
  expect(pages[0].visuals.diagramDigit).toBeDefined();
  expect(pages.at(-1)?.visuals.eliminations).toEqual(fixture.step.eliminations);
});

test.each(['light', 'dark'] as const)(
  'renders circles, assumptions, correct conflict and cleanup in %s',
  async theme => {
    const values = boardFromFingerprint(board);
    const state = {
      ...kiteGame().state,
      values,
      activeHint: step,
      candidates: {
        ...kiteGame().state.candidates,
        hintCandidates: candidates,
      },
    };
    const saved = JSON.stringify(state);
    const pages = buildHintPresentation(
      step,
      HINT_PRESENTATION_COPIES['zh-Hans'],
    ).pages;
    let renderer!: Renderer.ReactTestRenderer;
    const render = (page: number) => (
      <LocalizationProvider locale="zh-Hans">
        <ThemeProvider preference={theme}>
          <SudokuBoard
            state={state}
            hintVisuals={pages[page].visuals}
            hintAnimations={false}
            disabled
            onSelectCell={jest.fn()}
          />
        </ThemeProvider>
      </LocalizationProvider>
    );
    await act(async () => {
      renderer = Renderer.create(render(0));
    });
    const get = (testID: string) => renderer.root.findAllByProps({ testID })[0];
    expect(
      StyleSheet.flatten(get('sudoku-diagram-44').props.style).borderRadius,
    ).toBe(999);
    expect(get('sudoku-question-40')).toBeDefined();
    expect(
      renderer.root.findAllByProps({ testID: 'sudoku-candidate-grid' }),
    ).toHaveLength(0);
    await act(async () => renderer.update(render(4)));
    expect(get('sudoku-diagram-cross-44')).toBeDefined();
    expect(get('sudoku-hypothetical-40')).toBeDefined();
    await act(async () => renderer.update(render(6)));
    expect(get('sudoku-cell-index-79').props.accessibilityLabel).toContain(
      '第8列出现重复数字',
    );
    for (const page of [2, 7]) {
      await act(async () => renderer.update(render(page)));
      expect(
        renderer.root.findAll(
          n =>
            typeof n.props.testID === 'string' &&
            n.props.testID.startsWith('sudoku-hypothetical-'),
        ),
      ).toHaveLength(0);
    }
    expect(get('sudoku-diagram-cross-40')).toBeDefined();
    expect(JSON.stringify(state)).toBe(saved);
    await act(async () => renderer.unmount());
  },
);
