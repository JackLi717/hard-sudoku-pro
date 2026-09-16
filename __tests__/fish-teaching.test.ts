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
      const copy = HINT_PRESENTATION_COPIES[locale];
      const pages = buildHintPresentation(
        f.step,
        copy,
        'game',
        f.candidateMasks,
      ).pages;
      const first = pages[0].visuals;
      const baseRegions = first
        .regionMarks!.filter(m => m.role === 'fishBase')
        .map(m => m.region);
      const coverRegions = first
        .regionMarks!.filter(m => m.role === 'fishCover')
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
        expect(pages).toHaveLength(3);
        expect(pages.map(page => page.teaching?.rule)).toEqual([
          'swordfishPattern',
          'swordfishReason',
          'swordfishResult',
        ]);
        expect(pages.map(page => page.title)).toEqual([
          copy.teaching.swordfishPatternTitle,
          copy.teaching.swordfishReasonTitle,
          copy.teaching.swordfishResultTitle,
        ]);
        continue;
      }
      const fins = first.finCandidates!;
      expect(fins.length).toBeGreaterThan(0);
      expect(baseRegions).toHaveLength(2);
      expect(coverRegions).toHaveLength(2);
      const body = f.step.premiseCandidates.filter(
        candidate =>
          !fins.some(
            fin => fin.cell === candidate.cell && fin.digit === candidate.digit,
          ),
      );
      expect(body).toHaveLength(f.techniqueCode === 'finnedXWing' ? 4 : 3);
      expect(
        f.step.eliminations.every(t =>
          fins.every(fin => teachingPeers(t.cell, fin.cell)),
        ),
      ).toBe(true);
      for (const target of f.step.eliminations) {
        expect(
          coverRegions.some(region =>
            teachingCellsIn(region).includes(target.cell),
          ),
        ).toBe(true);
        expect(
          baseRegions.every(
            region => !teachingCellsIn(region).includes(target.cell),
          ),
        ).toBe(true);
      }
      for (const page of pages) {
        expect(
          page.visuals.regionMarks
            ?.filter(mark => mark.role === 'fishBase')
            .map(mark => mark.region),
        ).toEqual(baseRegions);
        expect(
          page.visuals.regionMarks
            ?.filter(mark => mark.role === 'fishCover')
            .map(mark => mark.region),
        ).toEqual(coverRegions);
      }
      for (const target of f.step.eliminations) {
        expect(first.cellMarks).toContainEqual({
          cell: target.cell,
          role: 'eliminationTarget',
        });
      }
      if (f.techniqueCode === 'finnedXWing') {
        expect(pages.map(p => p.teaching?.rule)).toEqual([
          'finnedPattern',
          'fins',
          ...fins.map(() => 'finTrue'),
          'finFalse',
          'finnedResult',
        ]);
        expect(pages[0].title).toBe(copy.teaching.finnedPatternTitle);
        expect(pages[1].title).toBe(copy.teaching.finsTitle);
        expect(pages.at(-1)!.title).toBe(copy.teaching.finnedResultTitle);
        for (const key of ['source', 'cover', 'body', 'fins', 'targets']) {
          expect(pages[0].body).toContain(
            String(pages[0].teaching!.params[key]),
          );
        }
        const cases = pages.slice(2, 2 + fins.length);
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
          for (const target of f.step.eliminations) {
            expect(page.visuals.links).toContainEqual({
              from: fins[index].cell,
              to: target.cell,
              kind: 'target',
              active: true,
            });
          }
        }
        const noFins = pages[2 + fins.length];
        expect(noFins.visuals.finCondition).toBe('none');
        expect(noFins.visuals.hypotheticalValues).toEqual([]);
        for (const fin of fins) {
          expect(noFins.visuals.candidateMarks).toContainEqual({
            ...fin,
            role: 'excluded',
            exclusionKind: 'explanation',
          });
        }
        for (const page of [...cases, noFins]) {
          for (const target of f.step.eliminations) {
            expect(page.visuals.candidateMarks).toContainEqual({
              ...target,
              role: 'excluded',
              exclusionKind: 'explanation',
            });
          }
        }
        const result = pages.at(-1)!;
        for (const fin of fins) {
          for (const target of f.step.eliminations) {
            expect(result.visuals.links).toContainEqual({
              from: fin.cell,
              to: target.cell,
              kind: 'target',
              active: true,
            });
          }
        }
      } else {
        expect(pages).toHaveLength(4);
        expect(pages.map(page => page.teaching?.rule)).toEqual([
          'sashimiPattern',
          'sashimiDirect',
          'sashimiFin',
          'sashimiResult',
        ]);
        expect(pages.map(page => page.title)).toEqual([
          copy.teaching.sashimiPatternTitle,
          copy.teaching.sashimiDirectTitle,
          copy.teaching.sashimiFinTitle,
          copy.teaching.sashimiResultTitle,
        ]);
        expect(first.diagramEmptyCells).toHaveLength(1);
        expect(
          hasCandidate(f.candidateMasks[first.diagramEmptyCells![0]], d),
        ).toBe(false);
        const params = pages[0].teaching!.params;
        for (const key of [
          'source',
          'cover',
          'body',
          'direct',
          'alternate',
          'corner',
          'missing',
          'fins',
          'targets',
        ])
          expect(pages[0].body).toContain(String(params[key]));
        for (const key of ['direct', 'alternate', 'targets', 'directCover'])
          expect(pages[1].body).toContain(String(params[key]));
        for (const key of ['direct', 'alternate', 'corner', 'fins', 'targets'])
          expect(pages[2].body).toContain(String(params[key]));
        for (const key of ['direct', 'alternate', 'targets'])
          expect(pages[3].body).toContain(String(params[key]));
        const cellFromCandidate = (value: string | number) => {
          const match = String(value).match(/^R(\d+)C(\d+)=/)!;
          return (Number(match[1]) - 1) * 9 + Number(match[2]) - 1;
        };
        expect(pages[1].visuals.hypotheticalValues).toEqual([
          {
            cell: cellFromCandidate(params.direct),
            digit: d,
            role: 'assumption',
          },
        ]);
        expect(pages[2].visuals.hypotheticalValues).toEqual([
          {
            cell: cellFromCandidate(params.alternate),
            digit: d,
            role: 'assumption',
          },
        ]);
        expect(pages[2].visuals.eliminations).toEqual(
          expect.arrayContaining(f.step.eliminations),
        );
        expect(pages[2].visuals.finCondition).toBe('some');
        for (const fin of fins) {
          for (const target of f.step.eliminations) {
            expect(pages.at(-1)!.visuals.links).toContainEqual({
              from: fin.cell,
              to: target.cell,
              kind: 'target',
              active: true,
            });
          }
        }
      }
    }
  },
);
