import { hasCandidate } from '../src/domain/sudoku/board';
import { HINT_LAB_ALL_FIXTURES } from '../src/debug/hint-lab';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import {
  teachingCellsIn,
  teachingPeers,
} from '../src/domain/hints/teaching-presentation';
import { HINT_PRESENTATION_COPIES } from '../src/localization/hint-presentation-copy';

const examples = HINT_LAB_ALL_FIXTURES.filter(f =>
  ['swordfish', 'finnedXWing', 'sashimiXWing'].includes(f.techniqueCode),
);

test.each(examples)(
  '$sourcePuzzleId / $techniqueCode has valid examples and stable complete context',
  f => {
    for (const locale of ['en', 'ja', 'de', 'zh-Hans'] as const) {
      const pages = buildHintPresentation(
        f.step,
        HINT_PRESENTATION_COPIES[locale],
        'game',
        f.candidateMasks,
      ).pages;
      const first = pages[0].visuals;
      const baseRegions = first
        .regionMarks!.filter(m => m.role === 'fishBase')
        .map(m => m.region);
      const d = f.step.premiseCandidates[0].digit;
      for (const page of pages) {
        expect(page.visuals.diagramDigit).toBe(d);
        expect(page.body).not.toMatch(/\{\w+\}/);
        expect(page.visuals.spotlightCells).toEqual(first.spotlightCells);
        expect(page.visuals.spotlightCells).toEqual(
          expect.arrayContaining(first.focusRegions!.flatMap(teachingCellsIn)),
        );
        expect(page.visuals.finCandidates).toEqual(first.finCandidates);
      }
      // Independently enumerate every legal placement across the base lines.
      // Every such placement must block every proposed target.
      let placements: number[][] = [[]];
      for (const region of baseRegions) {
        const cells = teachingCellsIn(region).filter(c =>
          hasCandidate(f.candidateMasks[c], d),
        );
        placements = placements.flatMap(previous =>
          cells
            .filter(c => previous.every(p => !teachingPeers(p, c)))
            .map(c => [...previous, c]),
        );
      }
      expect(placements.length).toBeGreaterThan(0);
      for (const target of f.step.eliminations) {
        expect(
          placements.every(cells =>
            cells.some(c => teachingPeers(c, target.cell)),
          ),
        ).toBe(true);
      }
      expect(pages.at(-1)!.visuals.eliminations).toEqual(f.step.eliminations);
      expect(pages.at(-1)!.visuals.hypotheticalValues).toEqual([]);
      if (f.techniqueCode === 'swordfish') {
        expect(pages).toHaveLength(4);
        continue;
      }
      const fins = first.finCandidates!;
      expect(fins.length).toBeGreaterThan(0);
      expect(
        f.step.eliminations.every(t =>
          fins.every(fin => teachingPeers(t.cell, fin.cell)),
        ),
      ).toBe(true);
      if (f.techniqueCode === 'finnedXWing') {
        expect(pages.map(p => p.teaching?.rule)).toEqual([
          'fins',
          ...fins.map(() => 'finTrue'),
          'finFalse',
          'result',
        ]);
        const cases = pages.slice(1, 1 + fins.length);
        for (const [index, page] of cases.entries()) {
          expect(page.visuals.hypotheticalValues).toEqual([
            { ...fins[index], role: 'assumption' },
          ]);
          expect(page.visuals.delayDiagramStrikes).toBe(true);
          expect(page.title).toContain(String(index + 1));
          expect(page.visuals.eliminations).toEqual(f.step.eliminations);
          expect(
            page.visuals.candidateMarks?.filter(c => c.role === 'excluded'),
          ).toHaveLength(f.step.eliminations.length);
        }
        const noFins = pages[1 + fins.length];
        expect(noFins.visuals.finCondition).toBe('none');
        expect(noFins.visuals.hypotheticalValues).toEqual([]);
        for (const page of [...cases, noFins]) {
          for (const target of f.step.eliminations) {
            expect(page.visuals.candidateMarks).toContainEqual({
              ...target,
              role: 'excluded',
              exclusionKind: 'explanation',
            });
          }
        }
      } else {
        expect(pages).toHaveLength(6);
        expect(first.diagramEmptyCells).toHaveLength(1);
        expect(
          hasCandidate(f.candidateMasks[first.diagramEmptyCells![0]], d),
        ).toBe(false);
        expect(pages[3].visuals.eliminations).toHaveLength(2);
        expect(pages[3].visuals.eliminations).not.toEqual(
          expect.arrayContaining(f.step.eliminations),
        );
      }
    }
  },
);
