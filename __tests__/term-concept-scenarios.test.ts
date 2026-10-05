import {
  TERM_CONCEPTS,
  TERM_CONCEPT_QUESTIONS,
  type TermScene,
} from '../src/data/lessons/term-concepts';
import {
  conceptArticlePatterns,
  conceptArticleScene,
} from '../src/data/lessons/term-concept-article-patterns';
import { LESSON_LOCALES } from '../src/domain/lessons/contracts';
import { conceptArticlePatternLabel } from '../src/localization/term-concept-patterns';
import { TERM_CONCEPT_COPY } from '../src/localization/term-concept-copy';

const row = (cell: number) => Math.floor(cell / 9);
const column = (cell: number) => cell % 9;
const box = (cell: number) =>
  Math.floor(row(cell) / 3) * 3 + Math.floor(column(cell) / 3);
const sameUnit = (a: number, b: number) =>
  row(a) === row(b) || column(a) === column(b) || box(a) === box(b);
const inRegion = (
  cell: number,
  region: { kind: 'row' | 'column' | 'box'; index: number },
) =>
  (region.kind === 'row'
    ? row(cell)
    : region.kind === 'column'
    ? column(cell)
    : box(cell)) === region.index;
const selectedCells = (scene: TermScene) => [
  ...new Set(scene.focus.map(item => item.cell)),
];

test('all 26 concepts have complete, localized pattern and question material', () => {
  for (const concept of TERM_CONCEPTS) {
    const patterns = conceptArticlePatterns(concept);
    const questions = TERM_CONCEPT_QUESTIONS[concept];
    expect(questions.length).toBeGreaterThanOrEqual(12);
    expect(questions.filter(question => question.valid)).toHaveLength(
      questions.length / 2,
    );
    expect(new Set(questions.map(question => question.id)).size).toBe(
      questions.length,
    );
    for (const locale of LESSON_LOCALES) {
      expect(TERM_CONCEPT_COPY[locale][concept].question).toBeTruthy();
      for (const pattern of patterns) {
        const label = conceptArticlePatternLabel(locale, pattern);
        expect(pattern === 'default' || label.length > 0).toBe(true);
        expect(
          conceptArticleScene(concept, pattern).candidates.length,
        ).toBeGreaterThan(0);
      }
    }
    for (const question of questions) {
      const scene = question.scene;
      const references = [
        ...scene.values,
        ...scene.candidates,
        ...scene.focus,
        ...(scene.fins ?? []),
        ...(scene.group ?? []),
        ...(scene.target ? [scene.target] : []),
      ];
      expect(
        references.every(
          item =>
            item.cell >= 0 &&
            item.cell < 81 &&
            item.digit >= 1 &&
            item.digit <= 9,
        ),
      ).toBe(true);
      const visible = new Set(
        [...scene.values, ...scene.candidates].map(
          item => `${item.cell}:${item.digit}`,
        ),
      );
      expect(
        [...scene.focus, ...(scene.fins ?? []), ...(scene.group ?? [])].every(
          item => visible.has(`${item.cell}:${item.digit}`),
        ),
      ).toBe(true);
      expect(
        scene.regions?.every(
          mark => mark.region.index >= 0 && mark.region.index < 9,
        ) ?? true,
      ).toBe(true);
    }
  }
});

test.each(['nakedSet', 'hiddenSet'] as const)(
  '%s covers pair, triple and quad in rows, columns and boxes with true and false cases',
  concept => {
    const cases = TERM_CONCEPT_QUESTIONS[concept];
    expect(cases).toHaveLength(18);
    const coverage = new Set<string>();
    for (const question of cases) {
      const scene = question.scene;
      const size = selectedCells(scene).length;
      const region = scene.regions![0].region;
      coverage.add(`${size}-${region.kind}-${question.valid}`);
      const focusedDigits = new Set(scene.focus.map(item => item.digit));
      if (concept === 'nakedSet') {
        const digits = new Set(
          scene.candidates
            .filter(item => selectedCells(scene).includes(item.cell))
            .map(item => item.digit),
        );
        expect(digits.size === size).toBe(question.valid);
      } else {
        const outside = scene.candidates.some(
          item =>
            inRegion(item.cell, region) &&
            !selectedCells(scene).includes(item.cell) &&
            focusedDigits.has(item.digit),
        );
        expect(outside).toBe(!question.valid);
      }
    }
    expect(coverage.size).toBe(18);
  },
);

test('fish, locks, chains, colors, groups and branches cover distinct structures', () => {
  for (const concept of ['fishBase', 'fishCover', 'fishFin'] as const) {
    const coverage = new Set<string>();
    for (const { scene, valid } of TERM_CONCEPT_QUESTIONS[concept]) {
      const bases = scene.regions!.filter(mark => mark.role === 'fishBase');
      const covers = scene.regions!.filter(mark => mark.role === 'fishCover');
      expect(bases.length).toBe(covers.length);
      expect([2, 3]).toContain(bases.length);
      coverage.add(`${bases.length}-${bases[0].region.kind}`);
      if (concept === 'fishFin') {
        expect(scene.fins).toHaveLength(1);
        const fin = scene.fins![0];
        expect(
          covers.some(mark => inRegion(scene.target!.cell, mark.region)) &&
            sameUnit(fin.cell, scene.target!.cell),
        ).toBe(valid);
      } else {
        const onBases = scene.candidates.filter(item =>
          bases.some(mark => inRegion(item.cell, mark.region)),
        );
        expect(
          onBases.every(item =>
            covers.some(mark => inRegion(item.cell, mark.region)),
          ),
        ).toBe(valid);
      }
    }
    expect(coverage).toEqual(
      new Set(['2-row', '2-column', '3-row', '3-column']),
    );
  }

  const locks = TERM_CONCEPT_QUESTIONS.lockedCandidate;
  expect(
    new Set(
      locks.map(
        ({ scene }) =>
          scene.regions!.find(mark => mark.role === 'source')!.region.kind,
      ),
    ),
  ).toEqual(new Set(['box', 'row', 'column']));
  for (const { scene, valid } of locks) {
    const source = scene.regions!.find(mark => mark.role === 'source')!.region;
    const affected = scene.regions!.find(
      mark => mark.role === 'affected',
    )!.region;
    const candidates = scene.candidates.filter(item =>
      inRegion(item.cell, source),
    );
    expect(candidates.every(item => inRegion(item.cell, affected))).toBe(valid);
  }

  for (const concept of [
    'alternatingChain',
    'endpoint',
    'chainTarget',
    'loop',
  ] as const) {
    expect(
      new Set(
        TERM_CONCEPT_QUESTIONS[concept].map(
          ({ scene }) =>
            selectedCells(scene).length - (concept === 'chainTarget' ? 1 : 0),
        ),
      ),
    ).toEqual(new Set([4, 6]));
  }
  for (const concept of ['colorState', 'colorComponent'] as const)
    expect(
      new Set(
        TERM_CONCEPT_QUESTIONS[concept].map(
          ({ scene }) => selectedCells(scene).length,
        ),
      ),
    ).toEqual(new Set([2, 3, 4]));
  for (const concept of ['groupNode', 'atLeastOne'] as const)
    expect(
      new Set(
        TERM_CONCEPT_QUESTIONS[concept]
          .filter(question => question.valid)
          .map(({ scene }) => scene.group!.length),
      ),
    ).toEqual(new Set([2, 3]));
  for (const { scene, valid } of TERM_CONCEPT_QUESTIONS.exhaustiveBranches)
    expect(scene.checkedBranches === scene.focus.length).toBe(valid);
  for (const { scene, valid } of TERM_CONCEPT_QUESTIONS.commonConclusion)
    expect(scene.branchResults!.every(Boolean)).toBe(valid);
  expect(
    new Set(
      TERM_CONCEPT_QUESTIONS.commonConclusion.map(
        ({ scene }) => scene.branchResults!.length,
      ),
    ),
  ).toEqual(new Set([2, 3, 4]));
});

test('each true and false diagram matches the question it asks', () => {
  for (const concept of ['candidate', 'assumption'] as const)
    for (const { scene, valid } of TERM_CONCEPT_QUESTIONS[concept])
      expect(scene.values.length === 0 && scene.candidates.length > 0).toBe(
        valid,
      );
  for (const concept of ['peer', 'elimination'] as const)
    for (const { scene, valid } of TERM_CONCEPT_QUESTIONS[concept]) {
      const first = concept === 'peer' ? scene.focus[0] : scene.values[0];
      const second = concept === 'peer' ? scene.focus[1] : scene.focus[0];
      expect(sameUnit(first.cell, second.cell)).toBe(valid);
    }

  for (const { scene, valid } of TERM_CONCEPT_QUESTIONS.bivalue)
    expect(scene.candidates.length === 2).toBe(valid);
  for (const concept of ['bilocation', 'strongLink'] as const)
    for (const { scene, valid } of TERM_CONCEPT_QUESTIONS[concept]) {
      const focusCells = selectedCells(scene);
      if (focusCells.length === 1) {
        expect(scene.candidates.length === 2).toBe(valid);
      } else {
        const region = scene.regions![0].region;
        const positions = scene.candidates.filter(item =>
          inRegion(item.cell, region),
        );
        expect(positions.length === 2).toBe(valid);
      }
    }
  for (const { scene, valid } of TERM_CONCEPT_QUESTIONS.weakLink) {
    const [first, second] = scene.focus;
    expect(
      (first.cell === second.cell && first.digit !== second.digit) ||
        (first.digit === second.digit && sameUnit(first.cell, second.cell)),
    ).toBe(valid);
  }

  for (const { scene, valid } of TERM_CONCEPT_QUESTIONS.alternatingChain)
    expect(
      scene.links!.every(
        (link, index) => link.kind === (index % 2 === 0 ? 'pair' : 'peer'),
      ),
    ).toBe(valid);
  for (const { scene, valid } of TERM_CONCEPT_QUESTIONS.endpoint)
    expect(
      scene.links![0].kind === 'pair' &&
        scene.links![scene.links!.length - 1].kind === 'pair',
    ).toBe(valid);
  for (const { scene, valid } of TERM_CONCEPT_QUESTIONS.chainTarget) {
    const ends = [scene.focus[0], scene.focus[scene.focus.length - 2]];
    expect(ends.every(item => sameUnit(item.cell, scene.target!.cell))).toBe(
      valid,
    );
  }
  for (const { scene, valid } of TERM_CONCEPT_QUESTIONS.loop)
    expect(scene.links!.length === selectedCells(scene).length).toBe(valid);

  for (const { scene, valid } of TERM_CONCEPT_QUESTIONS.colorState) {
    const colors = new Map(scene.colors!.map(item => [item.cell, item.color]));
    expect(
      scene.links!.every(link => colors.get(link.from) !== colors.get(link.to)),
    ).toBe(valid);
  }
  for (const { scene, valid } of TERM_CONCEPT_QUESTIONS.colorComponent)
    expect(new Set(scene.colors!.map(item => item.component)).size === 1).toBe(
      valid,
    );

  for (const { scene, valid } of TERM_CONCEPT_QUESTIONS.deadlyRectangle) {
    const cells = selectedCells(scene);
    const twoBoxes = new Set(cells.map(box)).size === 2;
    const samePair = cells.every(
      cell => scene.candidates.filter(item => item.cell === cell).length === 2,
    );
    expect(twoBoxes && samePair).toBe(valid);
  }
  for (const { scene, valid } of TERM_CONCEPT_QUESTIONS.groupNode)
    expect(new Set(scene.focus.map(item => box(item.cell))).size === 1).toBe(
      valid,
    );
  for (const { scene, valid } of TERM_CONCEPT_QUESTIONS.atLeastOne) {
    const region = scene.regions![0].region;
    const groupCells = new Set(scene.group!.map(item => item.cell));
    const outside = scene.candidates.filter(
      item => inRegion(item.cell, region) && !groupCells.has(item.cell),
    );
    expect(outside.length === 1).toBe(valid);
  }
});
