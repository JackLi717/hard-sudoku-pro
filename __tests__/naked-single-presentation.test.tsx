import React from 'react';
import Renderer from 'react-test-renderer';
import { HINT_LAB_REGRESSION_FIXTURES as HINT_LAB_FIXTURES, createHintLabSession } from '../src/debug/hint-lab';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import { HINT_PRESENTATION_COPIES } from '../src/localization/hint-presentation-copy';
import {
  arePeers,
  addCandidate,
  candidateMaskFor,
  boardFromFingerprint,
  createSolverCandidates,
} from '../src/domain/sudoku/board';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import { ThemeProvider } from '../src/ui/theme';

const fixture = HINT_LAB_FIXTURES.find(f => f.techniqueCode === 'nakedSingle')!;
const chinese = HINT_PRESENTATION_COPIES['zh-Hans'];
const presentation = () =>
  buildHintPresentation(fixture.step, chinese, 'game', fixture.candidateMasks);

test('explains the actual R3C8 laboratory case using all three regions together, with no invented notes', () => {
  expect(fixture.sourcePuzzleId).toBe('hsp-bec7b14c7309c1129bc9');
  const before = JSON.stringify(fixture);
  const { pages } = presentation();
  expect(pages.map(page => page.teaching?.rule)).toEqual([
    'singleDirect',
    'singleConclusion',
  ]);
  expect(pages[0].visuals.focusRegions).toEqual([
    { kind: 'row', index: 2 },
    { kind: 'column', index: 7 },
    { kind: 'box', index: 2 },
  ]);
  expect(pages[0].visuals.spotlightCells).toHaveLength(21);
  expect(pages[0].visuals.selectedQuestionCell).toBe(25);
  expect(pages[0].body).toBe(
    '同行、同列和同宫已出现其他数字，只剩一个候选数。',
  );
  expect(pages[0].body).not.toMatch(/R\dC\d|=/);
  expect(pages[0].accessibilitySummary).toContain(
    '已排除：1, 2, 3, 4, 5, 6, 7, 9。剩余：8。',
  );
  expect(pages[1].body).toBe('这里只能填 8。');
  expect(pages[1].visuals.placements).toEqual([{ cell: 25, digit: 8 }]);
  for (const page of pages.slice(0, -1)) {
    expect(page.visuals.placements).toEqual([]);
    expect(page.visuals.eliminations).toEqual([]);
    expect(page.visuals.candidateMarks).toEqual([]);
    expect(page.visuals.showPremises).toBe(false);
    for (const evidence of page.visuals.valueEvidence ?? []) {
      expect(arePeers(evidence.cell, 25)).toBe(true);
      expect(fixture.boardFingerprint[evidence.cell]).toBe(
        String(evidence.digit),
      );
    }
    expect((page.visuals.valueEvidence ?? []).map(e => e.digit)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 9,
    ]);
  }
  expect(JSON.stringify(fixture)).toBe(before);
});

test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
  '%s has the same proof in live play and replay',
  locale => {
    const copy = HINT_PRESENTATION_COPIES[locale];
    const game = buildHintPresentation(
      fixture.step,
      copy,
      'game',
      fixture.candidateMasks,
    );
    const replay = buildHintPresentation(
      fixture.step,
      copy,
      'replay',
      fixture.candidateMasks,
    );
    expect(replay.pages).toEqual(game.pages);
    expect(
      game.pages.every(page => !/\{\w+\}/.test(page.body + page.title)),
    ).toBe(true);
  },
);

test('acknowledges earlier exclusions when placed digits cannot prove the last candidate', () => {
  const fingerprint = fixture.boardFingerprint.split('');
  fingerprint[19] = '0'; // Remove the row's 5: direct constraints now leave 5 and 8.
  const boardFingerprint = fingerprint.join('');
  const candidates = [
    ...createSolverCandidates(boardFromFingerprint(boardFingerprint)),
  ];
  candidates[25] = candidateMaskFor(8);
  const step = { ...fixture.step, boardFingerprint };
  const { pages } = buildHintPresentation(step, chinese, 'game', candidates);
  const earlier = pages.find(page => page.teaching?.rule === 'singleEarlier')!;
  expect(earlier.accessibilitySummary).toContain('已排除：5。剩余：8。');
  expect(pages[0].teaching?.rule).toBe('singleRegion');
  expect(pages[0].body).not.toContain('只剩');
  expect(earlier.body).toBe('结合此前已验证的排除，只剩 8。');
  expect(earlier.visuals.valueEvidence).toEqual([]);
  expect(pages.at(-1)?.visuals.placements).toEqual(step.placements);
});

test('refuses a non-single or illegal candidate snapshot', () => {
  for (const mask of [
    addCandidate(candidateMaskFor(8), 2),
    candidateMaskFor(2),
  ]) {
    const candidates = [...fixture.candidateMasks];
    candidates[25] = mask;
    const { pages } = buildHintPresentation(
      fixture.step,
      chinese,
      'game',
      candidates,
    );
    expect(pages[0].body).toBe(chinese.teaching.legacy);
  }
});

test.each(['light', 'dark'] as const)(
  '%s preserves board evidence and reveals the result only on the final page',
  async mode => {
    const session = createHintLabSession(fixture);
    const state = { ...session.state, activeHint: fixture.step };
    const before = JSON.stringify(state);
    const { pages } = presentation();
    let tree!: Renderer.ReactTestRenderer;
    const render = (index: number) => (
      <ThemeProvider preference={mode}>
        <SudokuBoard
          disabled
          hintAnimations={false}
          state={state}
          hintVisuals={pages[index].visuals}
          onSelectCell={jest.fn()}
        />
      </ThemeProvider>
    );
    await Renderer.act(() => {
      tree = Renderer.create(render(0));
    });
    expect(
      tree.root.findAllByProps({ testID: 'sudoku-candidate-potential-8' }),
    ).toHaveLength(0);
    await Renderer.act(() => tree.update(render(1)));
    expect(
      tree.root.findAllByProps({ testID: 'hint-candidate-check' }),
    ).toHaveLength(0);
    expect(tree.root.findAllByProps({ children: '✓' }).length).toBeGreaterThan(
      0,
    );
    await Renderer.act(() => tree.update(render(0)));
    expect(tree.root.findAllByProps({ children: '✓' })).toHaveLength(0);
    expect(JSON.stringify(state)).toBe(before);
    await Renderer.act(() => tree.unmount());
  },
);

test.each([
  [[18, 19, 20, 21, 22, 23, 24, 26]],
  [[18, 19, 20, 21, 22, 24, 43, 15]],
] as const)(
  'uses a single compact observation for evidence at %j',
  evidenceCells => {
    const boardFingerprint = Array.from({ length: 81 }, (_, cell) =>
      (evidenceCells as readonly number[]).includes(cell)
        ? fixture.solutionFingerprint[cell]
        : '0',
    ).join('');
    const candidates = createSolverCandidates(
      boardFromFingerprint(boardFingerprint),
    );
    expect(candidates[25]).toBe(candidateMaskFor(8));
    const { pages } = buildHintPresentation(
      { ...fixture.step, boardFingerprint },
      chinese,
      'game',
      candidates,
    );
    const checks = pages.filter(page => page.teaching?.rule === 'singleDirect');
    expect(checks).toHaveLength(1);
    expect(checks[0].visuals.focusRegions).toHaveLength(3);
    expect(pages).toHaveLength(2);
    const removed = checks.flatMap(page =>
      (page.visuals.valueEvidence ?? []).map(value => value.digit),
    );
    expect(new Set(removed).size).toBe(8);
    expect(removed).toHaveLength(8);
    expect(removed).not.toContain(8);
    expect(pages.at(-1)?.visuals.placements).toEqual(fixture.step.placements);
  },
);
