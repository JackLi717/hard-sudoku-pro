import React from 'react';
import Renderer from 'react-test-renderer';
import {
  HINT_LAB_ALL_FIXTURES,
  createHintLabSession,
} from '../src/debug/hint-lab';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import { teachingCellsIn } from '../src/domain/hints/teaching-presentation';
import { HINT_PRESENTATION_COPIES } from '../src/localization/hint-presentation-copy';
import { candidateMaskFor, digitsFromMask } from '../src/domain/sudoku/board';
import { SudokuBoard } from '../src/ui/components/SudokuBoard';
import { ThemeProvider } from '../src/ui/theme';
import type { Digit, RegionRef } from '../src/domain/sudoku/contracts';

const codes = ['nakedTriple'] as const;
const copy = HINT_PRESENTATION_COPIES['zh-Hans'];

describe.each(codes)('%s concise scenes', code => {
  const fixture = HINT_LAB_ALL_FIXTURES.find(f => f.techniqueCode === code)!;
  const hidden = code.startsWith('hidden');
  const count = code.endsWith('Triple') ? 3 : 4;
  const build = () =>
    buildHintPresentation(fixture.step, copy, 'game', fixture.candidateMasks);

  test('uses three stages, shows the evidence region, and preserves exact candidate marks', () => {
    const before = JSON.stringify(fixture);
    const { pages } = build();
    expect(pages.map(p => p.teaching?.rule)).toEqual([
      `${code}Observe`,
      `${code}Reserve`,
      `${code}Exclude`,
    ]);
    const region = pages[1].visuals.focusRegions![0];
    expect(pages[1].visuals.focusRegions).toHaveLength(1);
    expect(pages[0].visuals.spotlightCells).toEqual(
      hidden ? teachingCellsIn(region) : fixture.step.focusCells,
    );
    for (const page of pages.slice(1))
      expect(page.visuals.spotlightCells).toEqual(teachingCellsIn(region));
    for (const page of pages.slice(0, 2)) {
      expect(page.visuals.showEliminations).toBe(false);
      expect(page.visuals.candidateMarks).toEqual(
        fixture.step.premiseCandidates.map(c => ({ ...c, role: 'potential' })),
      );
    }
    expect(pages[2].visuals.eliminations).toEqual(fixture.step.eliminations);
    expect(pages[2].visuals.placements).toEqual([]);
    const removed = [...new Set(fixture.step.eliminations.map(c => c.digit))]
      .sort()
      .join(copy.regionSeparator);
    expect(pages[2].teaching?.params.digits).toBe(removed);
    expect(JSON.stringify(fixture)).toBe(before);
  });

  test.each(['en', 'ja', 'de', 'zh-Hans'] as const)(
    '%s has matching game and replay explanations',
    locale => {
      const localized = HINT_PRESENTATION_COPIES[locale];
      const game = buildHintPresentation(
        fixture.step,
        localized,
        'game',
        fixture.candidateMasks,
      );
      expect(
        buildHintPresentation(
          fixture.step,
          localized,
          'replay',
          fixture.candidateMasks,
        ).pages,
      ).toEqual(game.pages);
      for (const page of game.pages)
        expect(page.body + page.title).not.toMatch(
          /\{\w+\}|R\dC\d|并集|已验证/,
        );
    },
  );

  test.each(['row', 'column', 'box'] as const)(
    'validates the full %s evidence and rejects an incomplete claim',
    kind => {
      const region: RegionRef = { kind, index: 0 };
      const focus = (
        kind === 'row'
          ? [0, 2, 4, 6]
          : kind === 'column'
          ? [0, 18, 36, 54]
          : [0, 1, 10, 20]
      ).slice(0, count);
      const digits = [1, 2, 3, 4].slice(0, count) as Digit[];
      const mask = digits.reduce((m, d) => m + candidateMaskFor(d), 0);
      const candidates = Array(81).fill(511);
      const outside = teachingCellsIn(region).find(c => !focus.includes(c))!;
      if (hidden)
        for (const cell of teachingCellsIn(region)) candidates[cell] -= mask;
      for (const cell of focus)
        candidates[cell] = mask + (hidden ? candidateMaskFor(9) : 0);
      const step = {
        ...fixture.step,
        proofSteps: undefined,
        boardFingerprint: '0'.repeat(81),
        focusCells: focus,
        focusRegions: [region],
        premiseCandidates: focus.flatMap(cell =>
          digits.map(digit => ({ cell, digit })),
        ),
        eliminations: [
          {
            cell: hidden ? focus[0] : outside,
            digit: hidden ? (9 as const) : (1 as const),
          },
        ],
      };
      const pages = buildHintPresentation(step, copy, 'game', candidates).pages;
      expect(pages).toHaveLength(3);
      expect(pages[1].visuals.focusRegions).toEqual([region]);
      if (hidden) candidates[outside] += candidateMaskFor(1);
      else candidates[focus[0]] += candidateMaskFor(9);
      expect(
        buildHintPresentation(step, copy, 'game', candidates).pages[0].body,
      ).toBe(copy.teaching.legacy);
    },
  );

  test.each(['light', 'dark'] as const)(
    '%s never invents candidates and restores the observation on back',
    async mode => {
      const state = createHintLabSession(fixture).state;
      const before = JSON.stringify(state);
      const { pages } = build();
      let tree!: Renderer.ReactTestRenderer;
      for (const index of [0, 1, 2, 0]) {
        await Renderer.act(async () => {
          const view = (
            <ThemeProvider preference={mode}>
              <SudokuBoard
                state={state}
                hintVisuals={pages[index].visuals}
                hintAnimations={false}
                onSelectCell={jest.fn()}
              />
            </ThemeProvider>
          );
          if (tree) tree.update(view);
          else tree = Renderer.create(view);
        });
        for (const cell of fixture.step.focusCells) {
          const node = tree.root.findByProps({
            testID: `sudoku-cell-index-${cell}`,
          });
          for (const digit of digitsFromMask(511)) {
            expect(
              node.findAllByProps({ testID: `sudoku-candidate-slot-${digit}` })
                .length > 0,
            ).toBe(
              digitsFromMask(fixture.candidateMasks[cell]).includes(digit),
            );
          }
        }
        if (index !== 2)
          expect(
            tree.root.findAll(node =>
              String(node.props.testID).startsWith('sudoku-candidate-strike-'),
            ),
          ).toHaveLength(0);
      }
      expect(JSON.stringify(state)).toBe(before);
      await Renderer.act(async () => tree.unmount());
    },
  );
});
