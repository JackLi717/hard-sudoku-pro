import { HINT_LAB_ALL_FIXTURES } from '../src/debug/hint-lab';
import { buildHintPresentation } from '../src/domain/hints/presentation';
import { HINT_PRESENTATION_COPIES } from '../src/localization/hint-presentation-copy';

const examples = HINT_LAB_ALL_FIXTURES.filter(
  fixture => fixture.techniqueCode === 'groupedAic',
);

test.each(examples)(
  '$sourcePuzzleId / Grouped AIC names every OR group in all locales',
  fixture => {
    for (const locale of ['en', 'ja', 'de', 'zh-Hans'] as const) {
      const copy = HINT_PRESENTATION_COPIES[locale];
      const pages = buildHintPresentation(
        fixture.step,
        copy,
        'game',
        fixture.candidateMasks,
      ).pages;
      expect(pages).toHaveLength(4);
      const directRule =
        fixture.step.teaching!.branches[0].nodes[0].candidates.length === 1
          ? 'groupedAicDirectSingle'
          : 'groupedAicDirect';
      expect(pages.map(page => page.teaching?.rule)).toEqual([
        'groupedAicStructure',
        'groupedAicChainSummary',
        directRule,
        'result',
      ]);
      const intro = pages[0];
      expect(intro).toBeDefined();
      expect(intro.title).toBe(copy.teaching.groupedAicStructureTitle);
      expect(intro.body).toContain(String(intro.teaching!.params.groups));
      expect(intro.body).toContain(String(intro.teaching!.params.strongLinks));

      const groups = intro.visuals.candidateGroups!;
      const labels = intro.visuals.candidateGroupLabels!;
      expect(groups.length).toBeGreaterThan(0);
      expect(labels).toHaveLength(groups.length);
      expect(new Set(labels.map(label => label.id)).size).toBe(groups.length);
      for (const group of groups) {
        expect(group.candidates.length).toBeGreaterThan(1);
        expect(labels.find(label => label.id === group.id)?.label).toBeTruthy();
        for (const candidate of group.candidates) {
          const coordinate = `R${Math.floor(candidate.cell / 9) + 1}C${
            (candidate.cell % 9) + 1
          }=${candidate.digit}`;
          expect(intro.body).toContain(coordinate);
        }
      }

      for (const page of pages) {
        expect(page.body).not.toMatch(/\{R\d+C\d+=\d/);
        expect(page.body).not.toMatch(/\{\w+\}/);
        expect(page.visuals.candidateGroups).toEqual(groups);
        expect(page.visuals.candidateGroupLabels).toEqual(labels);
      }

      expect(pages[1].title).toBe(copy.teaching.groupedAicChainSummaryTitle);
      expect(pages[1].body).toBe(pages[1].accessibilitySummary);
      expect(pages[1].visuals.links?.every(link => link.active)).toBe(true);
      expect(pages[1].visuals.eliminations).toEqual(fixture.step.eliminations);
      expect(pages[2].title).toBe(copy.teaching.groupedAicDirectTitle);
      if (directRule === 'groupedAicDirectSingle') {
        expect(pages[2].body).not.toContain('OR state');
        expect(pages[2].body).not.toContain('OR 状态');
        expect(pages[2].body).not.toContain('OR-Zustand');
        expect(pages[2].body).not.toContain('OR 状態');
      }
      expect(pages.at(-1)!.title).toBe(copy.teaching.groupedAicResultTitle);
      expect(pages.at(-1)!.visuals.hypotheticalValues).toEqual([]);
      expect(pages.at(-1)!.visuals.eliminations).toEqual(
        fixture.step.eliminations,
      );
    }
  },
);
