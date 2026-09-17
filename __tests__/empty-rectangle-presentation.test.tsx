import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { AppState, StyleSheet, Text } from 'react-native';
import { SessionReplayScreen } from '../src/ui/screens/SessionReplayScreen';
import { teachingFixture } from './helpers/replay';
import { HintStep } from '../src/domain/hints/contracts';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import { emptyRectangleProofs } from '../src/domain/hints/empty-rectangle-proof';
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

const board =
  '627419538139285700485637219574391682213800490968042301892063100351904800746108903';
const step: HintStep = {
  contractVersion: 1,
  boardFingerprint: board,
  techniqueCode: 'emptyRectangle',
  difficultyLevel: 4,
  focusCells: [44, 52, 76, 79],
  focusRegions: [],
  premiseCandidates: [44, 52, 76, 79].map(cell => ({ cell, digit: 5 })),
  eliminations: [{ cell: 40, digit: 5 }],
  placements: [],
  explanationKey: 'hint.emptyRectangle',
  explanationParams: {},
};
const candidates = createSolverCandidates(boardFromFingerprint(board));

test.each(Object.entries(HINT_PRESENTATION_COPIES))(
  '%s explains every structural role first in six concise scenes',
  (_, copy) => {
    const saved = JSON.stringify({ step, candidates });
    const pages = buildHintPresentation(step, copy, 'game', candidates).pages;
    expect(pages).toHaveLength(6);
    expect(emptyRectangleProofs(step)?.[0]).toMatchObject({
      box: 5,
      intersection: 43,
      emptyCells: [33, 35, 51, 53],
      drainedArm: [52],
      remainingArm: [44],
      pairFar: 76,
      pairNear: 79,
      target: 40,
    });
    for (const page of pages) {
      expect(page.body).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(page.visuals.placements).toEqual([]);
      expect(page.visuals.spotlightCells).toEqual(
        pages[0].visuals.spotlightCells,
      );
      expect(page.visuals.diagramBox).toBe(5);
    }
    expect(pages[0].visuals.diagramEmptyCells).toEqual([33, 35, 51, 53]);
    expect(pages[0].visuals.eliminations).toEqual([]);
    expect(pages[2].visuals.hypotheticalValues).toEqual([
      { cell: 40, digit: 5, role: 'assumption' },
    ]);
    expect(pages[2].visuals.eliminations).toEqual([{ cell: 76, digit: 5 }]);
    expect(pages[3].visuals.hypotheticalValues).toContainEqual({
      cell: 79,
      digit: 5,
      role: 'consequence',
    });
    expect(pages[3].visuals.eliminations).toEqual([
      { cell: 76, digit: 5 },
      { cell: 52, digit: 5 },
    ]);
    expect(
      pages[4].visuals.hypotheticalValues
        ?.filter(c => c.conflict)
        .map(c => c.cell),
    ).toEqual([40, 44]);
    expect(pages[4].visuals.diagramRegions).toEqual([
      { region: { kind: 'row', index: 4 }, conflict: true },
    ]);
    expect(pages[5].visuals.hypotheticalValues).toEqual([]);
    expect(pages[5].visuals.eliminations).toEqual(step.eliminations);
    expect(JSON.stringify({ step, candidates })).toBe(saved);
  },
);

test('Chinese introduces the standard candidate distribution before the deduction', () => {
  const pages = buildHintPresentation(
    step,
    HINT_PRESENTATION_COPIES['zh-Hans'],
  ).pages;
  expect(pages[0].body).toContain('形成候选十字');
  expect(pages[0].body).toContain('交点R5C8');
  expect(pages[0].body).toContain('这片空区是“空矩形”名称的由来');
  expect(pages[0].body).toContain('R9C5与R9C8是第9行中仅有的两个候选');
  expect(pages[0].body).toContain('构成强对');
  expect(pages[4].body).toContain('第5行');
});

test('rotates and renumbers the complete proof without inventing candidate positions', () => {
  const rotate = (cell: number) => (cell % 9) * 9 + 8 - Math.floor(cell / 9);
  const rotatedBoard = Array(81).fill('0');
  [...board].forEach((v, c) => {
    rotatedBoard[rotate(c)] = v === '5' ? '2' : v === '2' ? '5' : v;
  });
  const rotated: HintStep = {
    ...step,
    boardFingerprint: rotatedBoard.join(''),
    focusCells: step.focusCells.map(rotate),
    premiseCandidates: [...step.premiseCandidates]
      .reverse()
      .map(c => ({ cell: rotate(c.cell), digit: 2 })),
    eliminations: [{ cell: rotate(40), digit: 2 }],
  };
  const proof = emptyRectangleProofs(rotated)?.[0];
  expect(proof?.conflictRegion).toEqual({ kind: 'column', index: 4 });
  const pages = buildHintPresentation(rotated).pages;
  expect(pages).toHaveLength(6);
  expect(
    pages[4].visuals.hypotheticalValues
      ?.filter(c => c.conflict)
      .map(c => c.cell)
      .sort((a, b) => a - b),
  ).toEqual([rotate(40), rotate(44)].sort((a, b) => a - b));
});

function groupedFixture() {
  const pattern = [34, 42, 44, 52, 76, 79];
  const grouped: HintStep = {
    ...step,
    boardFingerprint: '0'.repeat(81),
    focusCells: pattern,
    premiseCandidates: pattern.map(cell => ({ cell, digit: 5 })),
  };
  const snapshot = Array.from({ length: 81 }, (_, cell) => {
    const inBox =
      Math.floor(cell / 27) === 1 && Math.floor((cell % 9) / 3) === 2;
    return (inBox || Math.floor(cell / 9) === 8) && !pattern.includes(cell)
      ? removeCandidate(511, 5)
      : 511;
  });
  return { grouped, snapshot };
}

test('multi-candidate arms stay groups: a required digit never becomes a fabricated placement', () => {
  const { grouped, snapshot } = groupedFixture();
  const proof = emptyRectangleProofs(grouped, snapshot)?.[0];
  expect(proof?.drainedArm).toEqual([34, 52]);
  expect(proof?.remainingArm).toEqual([42, 44]);
  const pages = buildHintPresentation(
    grouped,
    HINT_PRESENTATION_COPIES['zh-Hans'],
    'replay',
    snapshot,
  ).pages;
  expect(pages).toHaveLength(6);
  expect(pages[4].body).toContain('这个宫就无处放5了');
  expect(pages[4].visuals.hypotheticalValues?.map(c => c.cell)).toEqual([
    40, 79,
  ]);
  expect(pages[4].visuals.eliminations?.map(c => c.cell)).toEqual([
    76, 34, 52, 42, 44,
  ]);
  expect(pages[5].visuals.eliminations).toEqual(grouped.eliminations);
});

test('rejects missing pairs, an occupied intersection and candidates in the empty rectangle', () => {
  const { grouped, snapshot } = groupedFixture();
  expect(emptyRectangleProofs(grouped)).toBeNull();
  for (const cell of [43, 33, 72]) {
    const extra = [...snapshot];
    extra[cell] = addCandidate(extra[cell], 5);
    expect(emptyRectangleProofs(grouped, extra)).toBeNull();
    expect(
      buildHintPresentation(grouped, undefined, 'game', extra).pages.every(
        p => p.visuals.diagramBox === undefined,
      ),
    ).toBe(true);
  }
  expect(
    emptyRectangleProofs({ ...step, eliminations: [{ cell: 48, digit: 5 }] }),
  ).toBeNull();
  expect(
    emptyRectangleProofs({ ...step, eliminations: [{ cell: 40, digit: 4 }] }),
  ).toBeNull();
});

test('the native empty rectangle fixture gets a validated diagram', () => {
  const fixture = HINT_LAB_FIXTURES.find(
    f => f.techniqueCode === 'emptyRectangle',
  )!;
  const pages = buildHintPresentation(
    fixture.step,
    undefined,
    'game',
    fixture.candidateMasks,
  ).pages;
  expect(pages.length).toBeGreaterThanOrEqual(6);
  expect(pages[0].visuals.diagramEmptyCells).toHaveLength(4);
  expect(pages.at(-1)?.visuals.eliminations).toEqual(fixture.step.eliminations);
});

test.each(['light', 'dark'] as const)(
  'shows empty cells before assumptions and clears overlays on back/conclusion in %s',
  async theme => {
    const state = {
      ...kiteGame().state,
      values: boardFromFingerprint(board),
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
    expect(get('sudoku-cell-index-33').props.accessibilityLabel).toContain(
      '没有候选5，属于空矩形的四格之一',
    );
    for (const cell of [33, 35, 51, 53])
      expect(get(`sudoku-empty-rectangle-${cell}`)).toBeDefined();
    expect(get('sudoku-diagram-box')).toBeDefined();
    expect(
      StyleSheet.flatten(get('sudoku-diagram-box').props.style).width,
    ).toBeGreaterThan(0);
    const mask = () =>
      get('sudoku-hint-mask').props.children.map(
        (c: React.ReactElement<{ style: unknown }>) => c.props.style,
      );
    const original = mask();
    await act(async () => renderer.update(render(4)));
    expect(mask()).toEqual(original);
    expect(get('sudoku-cell-index-44').props.accessibilityLabel).toContain(
      '第5行出现重复数字',
    );
    expect(get('sudoku-diagram-cross-52')).toBeDefined();
    for (const page of [1, 5]) {
      await act(async () => renderer.update(render(page)));
      expect(
        renderer.root.findAll(
          n =>
            typeof n.props.testID === 'string' &&
            n.props.testID.startsWith('sudoku-hypothetical-'),
        ),
      ).toHaveLength(0);
      expect(
        renderer.root.findAll(
          n =>
            typeof n.props.testID === 'string' &&
            n.props.testID.startsWith('sudoku-empty-rectangle-'),
        ),
      ).toHaveLength(0);
    }
    expect(get('sudoku-diagram-cross-40')).toBeDefined();
    expect(JSON.stringify(state)).toBe(saved);
    await act(async () => renderer.unmount());
  },
);

test.each(['emptyRectangle', 'skyscraper'] as const)(
  'saved %s replay uses its candidate snapshot and has no apply action',
  async techniqueCode => {
    const replayStep: HintStep =
      techniqueCode === 'emptyRectangle'
        ? step
        : {
            ...step,
            techniqueCode,
            explanationKey: 'hint.skyscraper',
            focusCells: [48, 57, 44, 62],
            premiseCandidates: [48, 57, 44, 62].map(cell => ({
              cell,
              digit: 5,
            })),
          };
    jest.useFakeTimers();
    (AppState.addEventListener as jest.Mock).mockReturnValue({
      remove: jest.fn(),
    });
    const fixture = teachingFixture();
    const values = boardFromFingerprint(board);
    const before = {
      ...fixture.session.history[0].before,
      values,
      candidates: {
        ...fixture.session.history[0].before.candidates,
        hintCandidates: candidates,
      },
    };
    const session = {
      ...fixture.session,
      state: { ...fixture.session.state, values, givens: values },
      history: [
        {
          ...fixture.session.history[0],
          kind: 'apply_hint' as const,
          appliedHint: replayStep,
          before,
          after: before,
        },
      ],
    };
    const saved = JSON.stringify(session);
    const replayPageCount = buildHintPresentation(
      replayStep,
      HINT_PRESENTATION_COPIES['zh-Hans'],
      'replay',
      candidates,
    ).pages.length;
    let renderer!: Renderer.ReactTestRenderer;
    const button = (label: string) =>
      renderer.root
        .findAll(
          n =>
            n.props.accessibilityRole === 'button' &&
            typeof n.props.onPress === 'function',
        )
        .find(
          n =>
            n.props.accessibilityLabel === label ||
            n
              .findAllByType(Text)
              .some(t => [t.props.children].flat(Infinity).join('') === label),
        );
    await act(async () => {
      renderer = Renderer.create(
        <LocalizationProvider locale="zh-Hans">
          <ThemeProvider preference="light">
            <SessionReplayScreen
              sessionId="s"
              source={{
                readReplaySession: async () => session,
                listReplaySessions: async () => [],
              }}
              onClose={jest.fn()}
            />
          </ThemeProvider>
        </LocalizationProvider>,
      );
    });
    await act(async () => button('下一步操作')!.props.onPress());
    await act(async () => jest.advanceTimersByTime(500));
    await act(async () => button('分析盘面')!.props.onPress());
    await act(async () =>
      button(
        techniqueCode === 'emptyRectangle' ? '空矩形' : 'Skyscraper（摩天楼）',
      )!.props.onPress(),
    );
    const displayedBoard = () =>
      renderer.root.find(
        n => !!n.props.state?.givens && n.props.disabled === true,
      );
    expect(displayedBoard().props.hintVisuals.diagramDigit).toBe(5);
    expect(displayedBoard().props.state.candidates.hintCandidates).toEqual(
      candidates,
    );
    if (techniqueCode === 'emptyRectangle')
      expect(displayedBoard().props.hintVisuals.diagramEmptyCells).toHaveLength(
        4,
      );
    else
      expect(displayedBoard().props.hintVisuals.focusRegions).toEqual([
        { kind: 'column', index: 3 },
        { kind: 'column', index: 8 },
      ]);
    for (let i = 1; i < replayPageCount; i++)
      await act(async () => button('下一步')!.props.onPress());
    expect(button('应用这一步')).toBeUndefined();
    expect(displayedBoard().props.hintVisuals.hypotheticalValues).toEqual([]);
    expect(JSON.stringify(session)).toBe(saved);
    await act(async () => renderer.unmount());
    jest.useRealTimers();
  },
);
