import { buildNakedSinglePages } from './naked-single-presentation';
import { validateHintEngineRequest } from './candidate-state';
import { digitsFromMask, hasCandidate } from '../sudoku/board';
import { isTeachingProof } from './contracts';
import type {
  CandidateGrid,
  CandidateRef,
  Digit,
  RegionRef,
} from '../sudoku/contracts';
import type { HintStep, TeachingNode } from './contracts';
import type {
  HintPageVisuals,
  HintPresentationCopy,
  HintPresentationPage,
  HintLinkMark,
} from './presentation';
import type { TeachingCopy } from './teaching-copy';

const digits = (mask: number): Digit[] => [...digitsFromMask(mask)];
const key = (c: CandidateRef) => `${c.cell}:${c.digit}`;
const same = (a: readonly CandidateRef[], b: readonly CandidateRef[]) =>
  a.length === b.length && a.every(c => b.some(d => key(c) === key(d)));
const sameIndexes = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);
const unique = <T>(a: readonly T[]) => [...new Set(a)];
const uniqueCandidates = (candidates: readonly CandidateRef[]) =>
  unique(candidates.map(key)).map(
    identity => candidates.find(candidate => key(candidate) === identity)!,
  );
const box = (c: number) => Math.floor(c / 27) * 3 + Math.floor((c % 9) / 3);
export const teachingPeers = (a: number, b: number) =>
  a !== b &&
  (Math.floor(a / 9) === Math.floor(b / 9) ||
    a % 9 === b % 9 ||
    box(a) === box(b));
const conflict = (a: CandidateRef, b: CandidateRef) =>
  (a.cell === b.cell && a.digit !== b.digit) ||
  (a.digit === b.digit && teachingPeers(a.cell, b.cell));
const allRegions: RegionRef[] = (['row', 'column', 'box'] as const).flatMap(
  kind => Array.from({ length: 9 }, (_, index) => ({ kind, index })),
);
export const teachingCellsIn = (r: RegionRef) =>
  Array.from({ length: 81 }, (_, c) => c).filter(
    c =>
      (r.kind === 'row'
        ? Math.floor(c / 9)
        : r.kind === 'column'
        ? c % 9
        : box(c)) === r.index,
  );
const commonRegions = (cells: readonly number[]) =>
  allRegions.filter(
    r => cells.length > 0 && cells.every(c => teachingCellsIn(r).includes(c)),
  );
const cellName = (c: number) => `R${Math.floor(c / 9) + 1}C${(c % 9) + 1}`;
const interpolate = (s: string, p: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(p[k] ?? ''));

/** Verifies only the supplied detection result. Never asks a solver for another hint. */
export function buildTeachingPages(
  step: HintStep,
  copy: HintPresentationCopy,
  grid: CandidateGrid | null | undefined,
  selectedTarget?: CandidateRef,
): readonly HintPresentationPage[] | null {
  if (
    !grid ||
    grid.length !== 81 ||
    (step.teaching !== undefined && !isTeachingProof(step.teaching))
  )
    return null;
  if (
    validateHintEngineRequest({
      contractVersion: 1,
      boardFingerprint: step.boardFingerprint,
      hintCandidates: grid,
    }).length
  )
    return null;
  const has = (c: CandidateRef) =>
    step.boardFingerprint[c.cell] === '0' &&
    hasCandidate(grid[c.cell], c.digit);
  if (
    ![
      ...step.premiseCandidates,
      ...step.eliminations,
      ...step.placements,
    ].every(has)
  )
    return null;
  if (step.techniqueCode === 'nakedSingle') {
    return buildNakedSinglePages(step, copy, grid);
  }
  const at = (cells: readonly number[], ds: readonly Digit[] = digits(511)) =>
    cells.flatMap(cell =>
      ds.filter(digit => has({ cell, digit })).map(digit => ({ cell, digit })),
    );
  const positions = (r: RegionRef, d: Digit) => at(teachingCellsIn(r), [d]);
  const regionName = (r: RegionRef) =>
    interpolate(
      r.kind === 'row'
        ? copy.regionRow
        : r.kind === 'column'
        ? copy.regionColumn
        : copy.regionBox,
      { index: r.index + 1 },
    );
  const regionsName = (rs: readonly RegionRef[]) =>
    rs.map(regionName).join(copy.regionSeparator);
  const cellsName = (cs: readonly number[]) => cs.map(cellName).join(', ');
  const csName = (cs: readonly CandidateRef[]) =>
    cs.map(c => `${cellName(c.cell)}=${c.digit}`).join(', ');
  const pages: HintPresentationPage[] = [];
  let background = unique([
    ...step.focusCells,
    ...step.premiseCandidates.map(c => c.cell),
    ...step.eliminations.map(c => c.cell),
    ...step.placements.map(c => c.cell),
  ]);
  let premises = [...step.premiseCandidates];
  let links: HintLinkMark[] = [];
  let regions: RegionRef[] = [];
  let semanticRegions: HintPageVisuals['regionMarks'];
  let finCandidates: readonly CandidateRef[] | undefined;
  let diagramDigit: Digit | undefined;
  let diagramEmptyCells: readonly number[] | undefined;
  let diagramRegions: HintPageVisuals['diagramRegions'];
  const add = (
    rule: keyof TeachingCopy,
    params: Record<string, string | number> = {},
    visual: Partial<HintPageVisuals> = {},
  ) => {
    const body = interpolate(copy.teaching[rule], params);
    pages.push({
      kind: 'reason',
      title: copy.titleReason,
      body,
      accessibilitySummary: body,
      teaching: { rule, params },
      visuals: {
        showFocusCells: true,
        showFocusRegions: regions.length > 0,
        showPremises: true,
        showEliminations: false,
        showPlacements: false,
        focusCells: background,
        spotlightCells: background,
        diagramDigit,
        diagramEmptyCells,
        finCandidates,
        diagramRegions,
        focusRegions: regions,
        premiseCandidates: premises,
        links: links.map(link => ({ ...link, active: false })),
        candidateMarks: premises.map(c => ({ ...c, role: 'potential' })),
        regionMarks:
          semanticRegions ??
          regions.map(region => ({
            region,
            role: 'source' as const,
          })),
        ...visual,
      },
    });
  };
  const reset = () =>
    add(
      'reset',
      {},
      { hypotheticalValues: [], questionCells: [], eliminations: [] },
    );
  const conclude = (resetAssumptions = true, resultOverride?: string) => {
    if (
      resetAssumptions &&
      pages[pages.length - 1]?.visuals.hypotheticalValues?.length
    )
      reset();
    const result =
      resultOverride ??
      (step.techniqueCode === 'forcingChain'
        ? interpolate(copy.teaching.result, {
            candidates: interpolate(
              step.placements.length
                ? copy.teaching.factTrue
                : copy.teaching.factFalse,
              {
                candidates: csName(
                  step.placements.length ? step.placements : step.eliminations,
                ),
              },
            ),
          })
        : step.placements.length
        ? interpolate(copy.resultPlacement, {
            placements: csName(step.placements),
          })
        : interpolate(copy.resultElimination, {
            eliminations: csName(step.eliminations),
          }));
    pages.push({
      kind: 'apply',
      title: copy.titleConclusion,
      body: result,
      accessibilitySummary: result,
      teaching: { rule: 'result', params: {} },
      visuals: {
        showFocusCells: true,
        showFocusRegions: regions.length > 0,
        showPremises: true,
        showEliminations: !!step.eliminations.length,
        showPlacements: !!step.placements.length,
        spotlightCells: background,
        diagramDigit,
        diagramEmptyCells,
        finCandidates,
        diagramRegions,
        focusCells: background,
        focusRegions: regions,
        regionMarks:
          semanticRegions ??
          regions.map(region => ({ region, role: 'source' })),
        premiseCandidates: premises,
        links,
        eliminations: step.eliminations,
        placements: step.placements,
        hypotheticalValues: [],
        questionCells: [],
        candidateMarks: [
          ...premises.map(c => ({ ...c, role: 'potential' as const })),
          ...step.eliminations.map(c => ({
            ...c,
            role: 'excluded' as const,
            exclusionKind: 'result' as const,
          })),
          ...step.placements.map(c => ({ ...c, role: 'result' as const })),
        ],
      },
    });
    pages[0] = { ...pages[0], kind: 'observe', title: copy.titleObserve };
    return pages;
  };
  const code = step.techniqueCode;
  const focus = unique(step.focusCells);
  const ds = unique(premises.map(c => c.digit)).sort();
  const targetDigit = step.eliminations[0]?.digit ?? step.placements[0]?.digit;
  if (['fullHouse', 'hiddenSingle'].includes(code)) {
    const target = step.placements[0];
    if (!target || step.placements.length !== 1) return null;
    const region = step.focusRegions.find(
      r =>
        teachingCellsIn(r).includes(target.cell) &&
        same(positions(r, target.digit), [target]),
    );
    if (!region) return null;
    regions = [region];
    if (code === 'fullHouse') {
      // Keep the entire evidence region above the spotlight mask.
      background = teachingCellsIn(region);
      if (
        teachingCellsIn(region).filter(c => step.boardFingerprint[c] === '0')
          .length !== 1
      )
        return null;
      add(
        'positions',
        {
          regions: regionName(region),
          digits: target.digit,
          cells: cellName(target.cell),
        },
        {
          valueEvidence: teachingCellsIn(region)
            .filter(c => c !== target.cell)
            .map(cell => ({
              cell,
              digit: Number(step.boardFingerprint[cell]) as Digit,
            })),
        },
      );
    } else {
      // The searched region stays visible throughout; each blocking scene also
      // keeps its external evidence above the shared spotlight mask.
      background = teachingCellsIn(region);
      const blockers =
        step.proofSteps?.filter(p => p.reason === 'value_blocks_cells') ?? [];
      const excluded = teachingCellsIn(region).filter(
        c => c !== target.cell && step.boardFingerprint[c] === '0',
      );
      const validBlockers =
        blockers.length > 0 &&
        blockers.every(
          p =>
            p.valueEvidence.length === 1 &&
            p.valueEvidence[0].digit === target.digit &&
            step.boardFingerprint[p.valueEvidence[0].cell] ===
              String(target.digit) &&
            p.focusCells.every(
              c =>
                excluded.includes(c) &&
                teachingPeers(c, p.valueEvidence[0].cell),
            ),
        ) &&
        excluded.every(c => blockers.some(p => p.focusCells.includes(c)));
      if (validBlockers) {
        add('snapshot');
        for (const proof of blockers) {
          const evidence = proof.valueEvidence[0];
          const body = interpolate(copy.valueBlocks, {
            digit: evidence.digit,
            evidenceCell: cellName(evidence.cell),
            focusCells: cellsName(proof.focusCells),
          });
          add(
            'snapshot',
            {},
            {
              valueEvidence: proof.valueEvidence,
              spotlightCells: unique([
                ...background,
                ...proof.valueEvidence.map(value => value.cell),
              ]),
              eliminations: proof.focusCells.map(cell => ({
                cell,
                digit: target.digit,
              })),
              showEliminations: true,
            },
          );
          pages[pages.length - 1] = {
            ...pages[pages.length - 1],
            body,
            accessibilitySummary: body,
          };
        }
      } else add('snapshot');
      add('positions', {
        regions: regionName(region),
        digits: target.digit,
        cells: cellName(target.cell),
      });
    }
    return conclude();
  }

  if (code.startsWith('lockedCandidates.')) {
    if (!targetDigit || !step.eliminations.every(c => c.digit === targetDigit))
      return null;
    const source = step.focusRegions.find(
      r =>
        (code.endsWith('pointing') ? r.kind === 'box' : r.kind !== 'box') &&
        same(positions(r, targetDigit), premises),
    );
    const cover = step.focusRegions.find(
      r =>
        r !== source &&
        (code.endsWith('pointing') ? r.kind !== 'box' : r.kind === 'box') &&
        premises.every(c => teachingCellsIn(r).includes(c.cell)),
    );
    if (
      !source ||
      !cover ||
      !premises.length ||
      !step.eliminations.every(
        c =>
          teachingCellsIn(cover).includes(c.cell) &&
          !teachingCellsIn(source).includes(c.cell),
      )
    )
      return null;
    regions = [source, cover];
    semanticRegions = [
      { region: source, role: 'source' },
      { region: cover, role: 'affected' },
    ];
    add(
      'positions',
      {
        regions: regionName(source),
        digits: targetDigit,
        cells: cellsName(premises.map(c => c.cell)),
      },
      { regionMarks: [{ region: source, role: 'source' as const }] },
    );
    add(
      'locked',
      {
        source: regionName(source),
        cover: regionName(cover),
        digits: targetDigit,
      },
      {
        regionMarks: [
          { region: source, role: 'source' as const },
          { region: cover, role: 'affected' as const },
        ],
      },
    );
    return conclude();
  }
  if (/^(locked|naked|hidden)(Pair|Triple|Quad)$/.test(code)) {
    const n = code.endsWith('Pair') ? 2 : code.endsWith('Triple') ? 3 : 4;
    const hidden = code.startsWith('hidden');
    if (
      focus.length !== n ||
      ds.length !== n ||
      (hidden && !same(at(focus, ds), premises))
    )
      return null;
    regions = commonRegions(focus).filter(
      r =>
        !hidden ||
        ds.every(d => positions(r, d).every(c => focus.includes(c.cell))),
    );
    if (!regions.length || (!hidden && !same(at(focus), premises))) return null;
    if (
      !step.eliminations.every(c =>
        hidden
          ? focus.includes(c.cell) && !ds.includes(c.digit)
          : !focus.includes(c.cell) &&
            ds.includes(c.digit) &&
            regions.some(r => teachingCellsIn(r).includes(c.cell)),
      )
    )
      return null;
    if (
      code === 'hiddenPair' ||
      code === 'hiddenTriple' ||
      code === 'hiddenQuad'
    ) {
      const region =
        regions.find(unit =>
          step.focusRegions.some(
            source => source.kind === unit.kind && source.index === unit.index,
          ),
        ) ?? regions[0];
      if (
        !region ||
        step.placements.length ||
        !step.eliminations.length ||
        ds.some(digit => positions(region, digit).length === 0)
      )
        return null;
      regions = [region];
      background = teachingCellsIn(region);
      const params = {
        first: ds[0],
        second: ds[1],
        digits: ds.join(copy.regionSeparator),
        region: regionName(region),
      };
      add(`${code}Observe`, params, {
        focusCells: focus,
        candidateRevealOrder: ds,
      });
      add(`${code}Reserve`, params, { focusCells: focus });
      const resultParams = {
        ...params,
        digits: unique(step.eliminations.map(candidate => candidate.digit))
          .sort()
          .join(copy.regionSeparator),
      };
      const result = interpolate(copy.teaching[`${code}Exclude`], resultParams);
      const resultPages = conclude(false, result);
      pages[0].title = copy.teaching[`${code}ObserveTitle`];
      pages[1].title = copy.teaching[`${code}ReserveTitle`];
      pages[2].title = copy.teaching[`${code}ExcludeTitle`];
      pages[2].visuals.focusCells = focus;
      pages[2].teaching = { rule: `${code}Exclude`, params: resultParams };
      pages[2].accessibilitySummary = `${result} ${csName(step.eliminations)}`;
      return resultPages;
    }
    if (
      code === 'nakedPair' ||
      code === 'nakedTriple' ||
      code === 'nakedQuad'
    ) {
      // Native naked-subset steps remove candidates within one shared unit.
      const region = regions.find(unit =>
        step.eliminations.every(candidate =>
          teachingCellsIn(unit).includes(candidate.cell),
        ),
      );
      if (
        !region ||
        step.placements.length ||
        !step.eliminations.length ||
        focus.some(
          cell =>
            digits(grid[cell]).length < 2 || digits(grid[cell]).length > n,
        )
      )
        return null;
      const params = {
        first: ds[0],
        second: ds[1],
        digits: ds.join(copy.regionSeparator),
        region: regionName(region),
      };
      background = focus;
      regions = [];
      add(`${code}Observe`, params);
      regions = [region];
      background = teachingCellsIn(region);
      add(`${code}Reserve`, params, { regionRevealOrder: regions });
      const resultParams = {
        ...params,
        digits: unique(step.eliminations.map(candidate => candidate.digit))
          .sort()
          .join(copy.regionSeparator),
      };
      const result = interpolate(copy.teaching[`${code}Exclude`], resultParams);
      const resultPages = conclude(false, result);
      pages[0].title = copy.teaching[`${code}ObserveTitle`];
      pages[1].title = copy.teaching[`${code}ReserveTitle`];
      pages[2].title = copy.teaching[`${code}ExcludeTitle`];
      pages[2].teaching = { rule: `${code}Exclude`, params: resultParams };
      pages[2].accessibilitySummary = `${result} ${csName(step.eliminations)}`;
      return resultPages;
    }
    if (code === 'lockedPair' || code === 'lockedTriple') {
      const line = regions.find(region => region.kind !== 'box');
      const boxRegion = regions.find(region => region.kind === 'box');
      if (
        !line ||
        !boxRegion ||
        step.placements.length ||
        !step.eliminations.length ||
        focus.some(cell => {
          const count = digits(grid[cell]).length;
          return count < 2 || count > n;
        })
      )
        return null;
      const params = {
        first: ds[0],
        second: ds[1],
        digits: ds.join(copy.regionSeparator),
        line: regionName(line),
        box: regionName(boxRegion),
      };
      const observeRule =
        code === 'lockedPair' ? 'lockedPairObserve' : 'lockedTripleObserve';
      const lockRule =
        code === 'lockedPair' ? 'lockedPairLock' : 'lockedTripleLock';
      const excludeRule =
        code === 'lockedPair' ? 'lockedPairExclude' : 'lockedTripleExclude';
      // Start with the subset alone; do not spotlight the deletion targets yet.
      background = focus;
      regions = [];
      add(observeRule, params);
      regions = [line, boxRegion];
      background = unique(regions.flatMap(teachingCellsIn));
      add(lockRule, params, { regionRevealOrder: regions });
      const resultParams = {
        ...params,
        digits: unique(step.eliminations.map(candidate => candidate.digit))
          .sort()
          .join(copy.regionSeparator),
      };
      const result = interpolate(copy.teaching[excludeRule], resultParams);
      const resultPages = conclude(false, result);
      pages[0].title = copy.teaching[`${code}ObserveTitle`];
      pages[1].title = copy.teaching[`${code}LockTitle`];
      pages[2].title = copy.teaching[`${code}ExcludeTitle`];
      pages[2].teaching = { rule: excludeRule, params: resultParams };
      pages[2].accessibilitySummary = `${result} ${csName(step.eliminations)}`;
      return resultPages;
    }
    add('snapshot');
    if (hidden)
      for (const d of ds)
        add('positions', {
          regions: regionsName(regions),
          digits: d,
          cells: cellsName(
            premises.filter(c => c.digit === d).map(c => c.cell),
          ),
        });
    else
      for (const cell of focus)
        add(
          'cell',
          { cells: cellName(cell), digits: digits(grid[cell]).join(', ') },
          { cellMarks: [{ cell, role: 'potential' }] },
        );
    add(hidden ? 'hidden' : 'naked', {
      count: n,
      digits: ds.join(', '),
      regions: regionsName(regions),
    });
    return conclude();
  }
  if (['xWing', 'swordfish', 'jellyfish'].includes(code)) {
    const n = code === 'xWing' ? 2 : code === 'swordfish' ? 3 : 4;
    const bases = step.focusRegions;
    if (
      !targetDigit ||
      bases.length !== n ||
      bases.some(r => r.kind === 'box' || r.kind !== bases[0].kind) ||
      !same(
        bases.flatMap(r => positions(r, targetDigit)),
        premises,
      )
    )
      return null;
    const coverKind = bases[0].kind === 'row' ? 'column' : 'row';
    const covers = allRegions.filter(
      r =>
        r.kind === coverKind &&
        premises.some(c => teachingCellsIn(r).includes(c.cell)),
    );
    if (
      covers.length !== n ||
      !step.eliminations.every(
        c =>
          c.digit === targetDigit &&
          covers.some(r => teachingCellsIn(r).includes(c.cell)) &&
          bases.every(r => !teachingCellsIn(r).includes(c.cell)),
      )
    )
      return null;
    regions = [...bases, ...covers];
    semanticRegions = [
      ...bases.map(region => ({ region, role: 'fishBase' as const })),
      ...covers.map(region => ({ region, role: 'fishCover' as const })),
    ];
    if (code === 'xWing') {
      const regionHas = (region: RegionRef, candidate: CandidateRef) =>
        teachingCellsIn(region).includes(candidate.cell);
      const candidateAt = (base: RegionRef, cover: RegionRef) =>
        premises.find(
          candidate =>
            regionHas(base, candidate) && regionHas(cover, candidate),
        );
      const [firstBase, secondBase] = bases;
      const [firstCover, secondCover] = covers;
      const directFirst = candidateAt(firstBase, firstCover);
      const directSecond = candidateAt(secondBase, secondCover);
      const crossedFirst = candidateAt(firstBase, secondCover);
      const crossedSecond = candidateAt(secondBase, firstCover);
      if (
        !directFirst ||
        !directSecond ||
        !crossedFirst ||
        !crossedSecond ||
        premises.length !== 4
      )
        return null;

      diagramDigit = targetDigit;
      diagramRegions = [
        ...bases.map(region => ({
          region,
          conflict: false,
          role: 'fishBase' as const,
        })),
        ...covers.map(region => ({
          region,
          conflict: false,
          role: 'fishCover' as const,
        })),
      ];
      background = unique(
        [...bases, ...covers].flatMap(region => teachingCellsIn(region)),
      );
      const visuals = (
        selected: readonly CandidateRef[] = [],
        crossed: readonly CandidateRef[] = [],
      ): Partial<HintPageVisuals> => ({
        candidateMarks: [
          ...premises.map(candidate => ({
            ...candidate,
            role: 'potential' as const,
          })),
          ...crossed.map(candidate => ({
            ...candidate,
            role: 'excluded' as const,
            exclusionKind: 'explanation' as const,
          })),
        ],
        diagramRegions,
        eliminations: crossed,
        hypotheticalValues: selected.map((candidate, index) => ({
          ...candidate,
          role:
            index === 0 ? ('assumption' as const) : ('consequence' as const),
        })),
        questionCells: step.eliminations.map(candidate => candidate.cell),
        showEliminations: crossed.length > 0,
      });

      add(
        'xWingPremise',
        { digits: targetDigit, source: regionsName(bases) },
        visuals(),
      );
      add('xWingPattern', { cover: regionsName(covers) }, visuals());
      const cases = [
        [directFirst, directSecond],
        [crossedFirst, crossedSecond],
      ];
      cases.forEach((pair, index) => {
        const crossed = cases[(index + 1) % cases.length];
        const caseEliminations = uniqueCandidates([
          ...crossed,
          ...step.eliminations,
        ]);
        add(
          'xWingCase',
          {
            branch: index + 1,
            crossed: csName(crossed),
            digits: targetDigit,
            first: csName([pair[0]]),
            second: csName([pair[1]]),
            targets: csName(step.eliminations),
          },
          visuals(pair, caseEliminations),
        );
      });
      add(
        'xWingInvariant',
        { cover: regionsName(covers), digits: targetDigit },
        visuals(),
      );
      return conclude(
        false,
        interpolate(copy.teaching.xWingResult, {
          targets: csName(step.eliminations),
        }),
      );
    }
    if (code === 'jellyfish') {
      type PropagationAction = {
        base: RegionRef;
        cover: RegionRef;
        crossed: readonly CandidateRef[];
        forced: boolean;
        selected: CandidateRef;
      };
      type BranchCase = {
        actions: readonly PropagationAction[];
        conflictBase: RegionRef;
      };
      type TargetProof = {
        actions: readonly PropagationAction[];
        branchCases: readonly BranchCase[];
        conflictBase?: RegionRef;
        initialCrossed: readonly CandidateRef[];
        target: CandidateRef;
        targetCover: RegionRef;
      };

      const regionHas = (region: RegionRef, candidate: CandidateRef) =>
        teachingCellsIn(region).includes(candidate.cell);
      const proofFor = (target: CandidateRef): TargetProof | null => {
        const targetCover = covers.find(region => regionHas(region, target));
        if (!targetCover) return null;
        const crossedPremises = new Set(
          premises
            .filter(candidate => regionHas(targetCover, candidate))
            .map(key),
        );
        const displayCrossed = new Set(
          positions(targetCover, targetDigit)
            .filter(candidate => key(candidate) !== key(target))
            .map(key),
        );
        const chosen = new Set<string>();
        const resolvedBases = new Set<number>();
        const actions: PropagationAction[] = [];
        let conflictBase: RegionRef | undefined;

        while (resolvedBases.size < bases.length) {
          const unresolved = bases.filter(
            region => !resolvedBases.has(region.index),
          );
          const choices = unresolved.map(base => ({
            base,
            candidates: premises.filter(
              candidate =>
                regionHas(base, candidate) &&
                !crossedPremises.has(key(candidate)),
            ),
          }));
          const empty = choices.find(choice => choice.candidates.length === 0);
          if (empty) {
            conflictBase = empty.base;
            break;
          }
          const forced = choices.find(choice => choice.candidates.length === 1);
          if (!forced) break;
          const selected = forced.candidates[0];
          const selectedCover = covers.find(region =>
            regionHas(region, selected),
          );
          if (!selectedCover) return null;
          chosen.add(key(selected));
          resolvedBases.add(forced.base.index);
          const crossed = uniqueCandidates(
            [
              ...positions(forced.base, targetDigit),
              ...positions(selectedCover, targetDigit),
            ].filter(
              candidate =>
                key(candidate) !== key(selected) &&
                !chosen.has(key(candidate)) &&
                !displayCrossed.has(key(candidate)),
            ),
          );
          crossed.forEach(candidate => displayCrossed.add(key(candidate)));
          premises
            .filter(
              candidate =>
                regionHas(selectedCover, candidate) &&
                key(candidate) !== key(selected),
            )
            .forEach(candidate => crossedPremises.add(key(candidate)));
          actions.push({
            base: forced.base,
            cover: selectedCover,
            crossed,
            forced: true,
            selected,
          });
        }

        const enumerateBranches = (
          branchResolvedBases: ReadonlySet<number>,
          branchCrossedPremises: ReadonlySet<string>,
          branchChosen: ReadonlySet<string>,
          branchDisplayCrossed: ReadonlySet<string>,
          path: readonly PropagationAction[],
        ): readonly BranchCase[] => {
          const unresolved = bases.filter(
            region => !branchResolvedBases.has(region.index),
          );
          const choices = unresolved.map(base => ({
            base,
            candidates: premises.filter(
              candidate =>
                regionHas(base, candidate) &&
                !branchCrossedPremises.has(key(candidate)),
            ),
          }));
          const empty = choices.find(choice => choice.candidates.length === 0);
          if (empty) {
            return [{ actions: path, conflictBase: empty.base }];
          }
          const next =
            choices.find(choice => choice.candidates.length === 1) ??
            [...choices].sort(
              (left, right) => left.candidates.length - right.candidates.length,
            )[0];
          if (!next) return [];

          return next.candidates.flatMap(selected => {
            const selectedCover = covers.find(region =>
              regionHas(region, selected),
            );
            if (!selectedCover) return [];
            const nextResolvedBases = new Set(branchResolvedBases);
            nextResolvedBases.add(next.base.index);
            const nextChosen = new Set(branchChosen);
            nextChosen.add(key(selected));
            const nextDisplayCrossed = new Set(branchDisplayCrossed);
            const newlyCrossed = uniqueCandidates(
              [
                ...positions(next.base, targetDigit),
                ...positions(selectedCover, targetDigit),
              ].filter(
                candidate =>
                  key(candidate) !== key(selected) &&
                  !nextChosen.has(key(candidate)) &&
                  !nextDisplayCrossed.has(key(candidate)),
              ),
            );
            newlyCrossed.forEach(candidate =>
              nextDisplayCrossed.add(key(candidate)),
            );
            const nextCrossedPremises = new Set(branchCrossedPremises);
            premises
              .filter(
                candidate =>
                  regionHas(selectedCover, candidate) &&
                  key(candidate) !== key(selected),
              )
              .forEach(candidate => nextCrossedPremises.add(key(candidate)));
            return enumerateBranches(
              nextResolvedBases,
              nextCrossedPremises,
              nextChosen,
              nextDisplayCrossed,
              [
                ...path,
                {
                  base: next.base,
                  cover: selectedCover,
                  crossed: newlyCrossed,
                  forced: next.candidates.length === 1,
                  selected,
                },
              ],
            );
          });
        };
        const branchCases = conflictBase
          ? []
          : enumerateBranches(
              resolvedBases,
              crossedPremises,
              chosen,
              displayCrossed,
              [],
            );
        if (!conflictBase && branchCases.length === 0) return null;
        return {
          actions,
          branchCases,
          conflictBase,
          initialCrossed: positions(targetCover, targetDigit).filter(
            candidate => key(candidate) !== key(target),
          ),
          target,
          targetCover,
        };
      };

      const targetProofs = step.eliminations
        .map(proofFor)
        .filter((proof): proof is TargetProof => proof !== null)
        .sort(
          (left, right) =>
            Number(key(right.target) === key(selectedTarget ?? right.target)) -
              Number(key(left.target) === key(selectedTarget ?? left.target)) ||
            Number(!!right.conflictBase) - Number(!!left.conflictBase) ||
            left.branchCases.length - right.branchCases.length ||
            right.actions.length - left.actions.length,
        );
      const proof = targetProofs[0];
      if (!proof) return null;

      diagramDigit = targetDigit;
      diagramRegions = [
        ...bases.map(region => ({
          region,
          conflict: false,
          role: 'fishBase' as const,
        })),
        ...covers.map(region => ({
          region,
          conflict: false,
          role: 'fishCover' as const,
        })),
      ];
      background = unique(
        [...bases, ...covers].flatMap(region => teachingCellsIn(region)),
      );
      const stableMarks = premises.map(candidate => ({
        ...candidate,
        role: 'potential' as const,
      }));
      const proofVisuals = (
        selected: readonly CandidateRef[] = [],
        crossed: readonly CandidateRef[] = [],
        currentCrossed: readonly CandidateRef[] = [],
        conflictBases: readonly RegionRef[] = [],
      ): Partial<HintPageVisuals> => {
        const currentKeys = new Set(currentCrossed.map(key));
        return {
          candidateMarks: [
            ...stableMarks,
            ...crossed.map(candidate => ({
              ...candidate,
              role: 'excluded' as const,
              exclusionKind: 'explanation' as const,
            })),
          ],
          diagramRegions: diagramRegions?.map(mark => ({
            ...mark,
            conflict: conflictBases.some(
              region =>
                region.kind === mark.region.kind &&
                region.index === mark.region.index,
            ),
          })),
          eliminations: crossed,
          priorEliminations: crossed.filter(
            candidate => !currentKeys.has(key(candidate)),
          ),
          hypotheticalValues: selected.map((candidate, index) => ({
            ...candidate,
            role:
              index === 0 ? ('assumption' as const) : ('consequence' as const),
          })),
          showEliminations: crossed.length > 0,
          selectedQuestionCell: proof.target.cell,
        };
      };

      add(
        'jellyfishPremise',
        {
          digits: targetDigit,
          source: regionsName(bases),
        },
        proofVisuals(),
      );
      add(
        'jellyfishPattern',
        {
          cover: regionsName(covers),
          digits: targetDigit,
        },
        proofVisuals(),
      );
      add(
        'jellyfishTarget',
        {
          digits: targetDigit,
          selected: csName([proof.target]),
        },
        proofVisuals(),
      );

      const selected: CandidateRef[] = [proof.target];
      const crossed: CandidateRef[] = [...proof.initialCrossed];
      add(
        'jellyfishAssume',
        {
          cover: regionName(proof.targetCover),
          crossed: csName(proof.initialCrossed),
          digits: targetDigit,
          selected: csName([proof.target]),
        },
        proofVisuals(selected, uniqueCandidates(crossed), proof.initialCrossed),
      );
      for (const action of proof.actions) {
        selected.push(action.selected);
        crossed.push(...action.crossed);
        add(
          'jellyfishForce',
          {
            base: regionName(action.base),
            crossed: csName(action.crossed),
            digits: targetDigit,
            selected: csName([action.selected]),
          },
          proofVisuals(selected, uniqueCandidates(crossed), action.crossed),
        );
      }

      if (proof.conflictBase) {
        add(
          'jellyfishNoPlace',
          {
            base: regionName(proof.conflictBase),
            digits: targetDigit,
          },
          proofVisuals(
            selected,
            uniqueCandidates(crossed),
            [],
            [proof.conflictBase],
          ),
        );
      } else {
        for (const [index, branch] of proof.branchCases.entries()) {
          const branchSelected = [...selected];
          const branchCrossed = [...crossed];
          for (const action of branch.actions) {
            branchSelected.push(action.selected);
            branchCrossed.push(...action.crossed);
            add(
              action.forced ? 'jellyfishForce' : 'jellyfishBranchChoose',
              {
                base: regionName(action.base),
                branch: index + 1,
                crossed: csName(action.crossed),
                digits: targetDigit,
                selected: csName([action.selected]),
              },
              proofVisuals(
                branchSelected,
                uniqueCandidates(branchCrossed),
                action.crossed,
              ),
            );
          }
          add(
            'jellyfishNoPlace',
            {
              base: regionName(branch.conflictBase),
              digits: targetDigit,
            },
            proofVisuals(
              branchSelected,
              uniqueCandidates(branchCrossed),
              [],
              [branch.conflictBase],
            ),
          );
          if (index < proof.branchCases.length - 1) {
            add(
              'jellyfishBranchReset',
              { branch: index + 1 },
              proofVisuals(selected, uniqueCandidates(crossed)),
            );
          }
        }
        add(
          'jellyfishBranchesExhausted',
          {
            branchCount: proof.branchCases.length,
            digits: targetDigit,
          },
          proofVisuals(selected, uniqueCandidates(crossed)),
        );
      }
      return conclude(
        false,
        interpolate(copy.teaching.jellyfishResult, {
          digits: targetDigit,
          selected: csName([proof.target]),
          targets: csName(step.eliminations),
        }),
      ).map(page => ({
        ...page,
        visuals: {
          ...page.visuals,
          selectedQuestionCell: proof.target.cell,
        },
      }));
    }
    diagramDigit = targetDigit;
    background = unique(regions.flatMap(teachingCellsIn));
    add('swordfishBases', { digits: targetDigit, source: regionsName(bases) });
    add('swordfishCovers', { digits: targetDigit, cover: regionsName(covers) });
    add('swordfishOccupied', { digits: targetDigit });
    return conclude(
      false,
      interpolate(copy.teaching.fishResult, { digits: targetDigit }),
    );
  }
  if (code === 'xyWing' || code === 'xyzWing') {
    if (focus.length !== 3 || !targetDigit || !same(at(focus), premises))
      return null;
    const xyz = code === 'xyzWing';
    const pivot = focus.find(
      c =>
        digits(grid[c]).length === (xyz ? 3 : 2) &&
        (xyz
          ? digits(grid[c]).includes(targetDigit)
          : !digits(grid[c]).includes(targetDigit)) &&
        focus
          .filter(w => w !== c)
          .every(
            w =>
              teachingPeers(c, w) &&
              digits(grid[w]).length === 2 &&
              digits(grid[w]).includes(targetDigit),
          ),
    );
    if (pivot === undefined) return null;
    const wings = focus.filter(c => c !== pivot);
    const pivotDigits = digits(grid[pivot]);
    const outer = wings.map(
      w => digits(grid[w]).filter(d => d !== targetDigit)[0],
    );
    if (
      outer[0] === outer[1] ||
      !outer.every(d => pivotDigits.includes(d)) ||
      !step.eliminations.every(
        c =>
          c.digit === targetDigit &&
          (xyz ? focus : wings).every(w => teachingPeers(c.cell, w)),
      )
    )
      return null;
    if (!xyz) {
      const structuralCandidates = at(focus);
      const targetCells = step.eliminations.map(candidate => candidate.cell);
      const sceneCells = unique([...focus, ...targetCells]);
      const pivotLinks: HintLinkMark[] = wings.map(wing => ({
        from: pivot,
        to: wing,
        kind: 'peer',
      }));
      const targetLinks = (wing: number): HintLinkMark[] =>
        targetCells.map(target => ({
          from: wing,
          to: target,
          kind: 'target',
        }));
      const structureCellMarks = (includeTargets: boolean) => [
        { cell: pivot, role: 'established' as const },
        ...wings.map(cell => ({ cell, role: 'potential' as const })),
        ...(includeTargets
          ? targetCells.map(cell => ({ cell, role: 'result' as const }))
          : []),
      ];
      const retitleLast = (title: string) => {
        const page = pages[pages.length - 1];
        pages[pages.length - 1] = { ...page, title };
      };

      background = focus;
      premises = structuralCandidates;
      regions = [];
      links = pivotLinks.map(link => ({ ...link, active: true }));
      const introParams = {
        pivot: cellName(pivot),
        pivotDigits: pivotDigits.join(copy.regionSeparator),
        wingA: cellName(wings[0]),
        wingADigits: digits(grid[wings[0]]).join(copy.regionSeparator),
        wingB: cellName(wings[1]),
        wingBDigits: digits(grid[wings[1]]).join(copy.regionSeparator),
      };
      add('xyWingIntro', introParams, {
        focusCells: focus,
        spotlightCells: focus,
        focusRegions: [],
        regionMarks: [],
        premiseCandidates: structuralCandidates,
        candidateMarks: structuralCandidates.map(candidate => ({
          ...candidate,
          role: 'potential' as const,
        })),
        cellMarks: structureCellMarks(false),
        links,
      });
      retitleLast(copy.teaching.xyWingIntroTitle);

      background = sceneCells;
      links = [
        ...pivotLinks.map(link => ({ ...link, active: true })),
        ...wings.flatMap(targetLinks),
      ];
      const structureParams = {
        targetDigit,
        targets: csName(step.eliminations),
      };
      add('xyWingStructure', structureParams, {
        focusCells: sceneCells,
        spotlightCells: sceneCells,
        focusRegions: [],
        regionMarks: [],
        premiseCandidates: structuralCandidates,
        candidateMarks: structuralCandidates.map(candidate => ({
          ...candidate,
          role: 'potential' as const,
        })),
        cellMarks: structureCellMarks(true),
        links,
      });
      retitleLast(copy.teaching.xyWingStructureTitle);

      for (const [index, pivotDigit] of pivotDigits.entries()) {
        const wing = wings[outer.indexOf(pivotDigit)];
        const params = {
          branch: index + 1,
          pivot: cellName(pivot),
          pivotDigit,
          wing: cellName(wing),
          targetDigit,
          targets: csName(step.eliminations),
        };
        links = [
          ...pivotLinks.map(link => ({
            ...link,
            active: link.to === wing,
          })),
          ...wings.flatMap(currentWing =>
            targetLinks(currentWing).map(link => ({
              ...link,
              active: false,
            })),
          ),
        ];
        add('xyWingCase', params, {
          focusCells: sceneCells,
          spotlightCells: sceneCells,
          premiseCandidates: structuralCandidates,
          hypotheticalValues: [
            { cell: pivot, digit: pivotDigit, role: 'assumption' },
            { cell: wing, digit: targetDigit, role: 'consequence' },
          ],
          showEliminations: false,
          candidateMarks: structuralCandidates.map(candidate => ({
            ...candidate,
            role: 'potential' as const,
          })),
          cellMarks: structureCellMarks(true),
          links,
        });
        retitleLast(interpolate(copy.teaching.xyWingCaseTitle, params));

        links = [
          ...pivotLinks.map(link => ({
            ...link,
            active: link.to === wing,
          })),
          ...wings.flatMap(currentWing =>
            targetLinks(currentWing).map(link => ({
              ...link,
              active: currentWing === wing,
            })),
          ),
        ];
        add('xyWingTarget', params, {
          focusCells: sceneCells,
          spotlightCells: sceneCells,
          premiseCandidates: structuralCandidates,
          hypotheticalValues: [
            { cell: pivot, digit: pivotDigit, role: 'assumption' },
            { cell: wing, digit: targetDigit, role: 'consequence' },
          ],
          eliminations: step.eliminations,
          showEliminations: true,
          candidateMarks: [
            ...structuralCandidates.map(candidate => ({
              ...candidate,
              role: 'potential' as const,
            })),
            ...step.eliminations.map(candidate => ({
              ...candidate,
              role: 'excluded' as const,
              exclusionKind: 'explanation' as const,
            })),
          ],
          cellMarks: structureCellMarks(true),
          links,
        });
        retitleLast(interpolate(copy.teaching.xyWingTargetTitle, params));
      }

      background = sceneCells;
      premises = structuralCandidates;
      links = [
        ...pivotLinks.map(link => ({ ...link, active: true })),
        ...wings.flatMap(targetLinks),
      ];
      const conclusionParams = {
        pivotDigits: pivotDigits.join(copy.regionSeparator),
        targetDigit,
        targets: csName(step.eliminations),
      };
      conclude(
        false,
        interpolate(copy.teaching.xyWingConclusion, conclusionParams),
      );
      pages[0] = { ...pages[0], title: copy.teaching.xyWingIntroTitle };
      const conclusion = pages[pages.length - 1];
      pages[pages.length - 1] = {
        ...conclusion,
        title: copy.teaching.xyWingConclusionTitle,
        visuals: {
          ...conclusion.visuals,
          cellMarks: structureCellMarks(true),
        },
      };
      return pages;
    }
    const structuralCandidates = at(focus);
    const targetCells = step.eliminations.map(candidate => candidate.cell);
    const sceneCells = unique([...focus, ...targetCells]);
    const pivotLinks: HintLinkMark[] = wings.map(wing => ({
      from: pivot,
      to: wing,
      kind: 'peer',
    }));
    const targetLinks: HintLinkMark[] = focus.flatMap(source =>
      targetCells.map(target => ({
        from: source,
        to: target,
        kind: 'target',
      })),
    );
    const structureCellMarks = (includeTargets: boolean) => [
      { cell: pivot, role: 'established' as const },
      ...wings.map(cell => ({ cell, role: 'potential' as const })),
      ...(includeTargets
        ? targetCells.map(cell => ({ cell, role: 'result' as const }))
        : []),
    ];
    const retitleLast = (title: string) => {
      const page = pages[pages.length - 1];
      pages[pages.length - 1] = { ...page, title };
    };
    const structuralMarks = structuralCandidates.map(candidate => ({
      ...candidate,
      role: 'potential' as const,
    }));

    background = focus;
    premises = structuralCandidates;
    regions = [];
    links = pivotLinks.map(link => ({ ...link, active: true }));
    const introParams = {
      pivot: cellName(pivot),
      pivotDigits: pivotDigits.join(copy.regionSeparator),
      wingA: cellName(wings[0]),
      wingADigits: digits(grid[wings[0]]).join(copy.regionSeparator),
      wingB: cellName(wings[1]),
      wingBDigits: digits(grid[wings[1]]).join(copy.regionSeparator),
    };
    add('xyzWingIntro', introParams, {
      focusCells: focus,
      spotlightCells: focus,
      focusRegions: [],
      regionMarks: [],
      premiseCandidates: structuralCandidates,
      candidateMarks: structuralMarks,
      cellMarks: structureCellMarks(false),
      links,
    });
    retitleLast(copy.teaching.xyzWingIntroTitle);

    background = sceneCells;
    links = [
      ...pivotLinks.map(link => ({ ...link, active: true })),
      ...targetLinks.map(link => ({ ...link, active: true })),
    ];
    const targetParams = {
      targetDigit,
      targets: csName(step.eliminations),
    };
    add('xyzWingTarget', targetParams, {
      focusCells: sceneCells,
      spotlightCells: sceneCells,
      focusRegions: [],
      regionMarks: [],
      premiseCandidates: structuralCandidates,
      candidateMarks: structuralMarks,
      cellMarks: structureCellMarks(true),
      links,
    });
    retitleLast(copy.teaching.xyzWingTargetTitle);

    const outerPivotDigits = pivotDigits.filter(digit => digit !== targetDigit);
    for (const [index, pivotDigit] of outerPivotDigits.entries()) {
      const wing = wings[outer.indexOf(pivotDigit)];
      const params = {
        branch: index + 1,
        pivot: cellName(pivot),
        pivotDigit,
        wing: cellName(wing),
        targetDigit,
      };
      links = [
        ...pivotLinks.map(link => ({
          ...link,
          active: link.to === wing,
        })),
        ...targetLinks.map(link => ({ ...link, active: false })),
      ];
      add('xyzWingCase', params, {
        focusCells: sceneCells,
        spotlightCells: sceneCells,
        premiseCandidates: structuralCandidates,
        hypotheticalValues: [
          { cell: pivot, digit: pivotDigit, role: 'assumption' },
          { cell: wing, digit: targetDigit, role: 'consequence' },
        ],
        candidateMarks: structuralMarks,
        cellMarks: structureCellMarks(true),
        links,
      });
      retitleLast(interpolate(copy.teaching.xyzWingCaseTitle, params));
    }

    const pivotCaseParams = {
      pivot: cellName(pivot),
      targetDigit,
    };
    links = [
      ...pivotLinks.map(link => ({ ...link, active: false })),
      ...targetLinks.map(link => ({
        ...link,
        active: link.from === pivot,
      })),
    ];
    add('xyzWingPivotCase', pivotCaseParams, {
      focusCells: sceneCells,
      spotlightCells: sceneCells,
      premiseCandidates: structuralCandidates,
      hypotheticalValues: [
        { cell: pivot, digit: targetDigit, role: 'assumption' },
      ],
      candidateMarks: structuralMarks,
      cellMarks: structureCellMarks(true),
      links,
    });
    retitleLast(
      interpolate(copy.teaching.xyzWingPivotCaseTitle, pivotCaseParams),
    );

    links = [
      ...pivotLinks.map(link => ({ ...link, active: true })),
      ...targetLinks.map(link => ({ ...link, active: true })),
    ];
    const conclusionParams = {
      sources: cellsName(focus),
      targetDigit,
      targets: csName(step.eliminations),
    };
    conclude(
      false,
      interpolate(copy.teaching.xyzWingConclusion, conclusionParams),
    );
    pages[0] = { ...pages[0], title: copy.teaching.xyzWingIntroTitle };
    const conclusion = pages[pages.length - 1];
    pages[pages.length - 1] = {
      ...conclusion,
      title: copy.teaching.xyzWingConclusionTitle,
      visuals: {
        ...conclusion.visuals,
        cellMarks: structureCellMarks(true),
      },
    };
    return pages;
  }
  if (code === 'finnedXWing' || code === 'sashimiXWing') {
    if (!targetDigit || ds.length !== 1) return null;
    // Recover orientation using only the exact supplied pattern and all original targets.
    for (const kind of ['row', 'column'] as const) {
      const bases = allRegions.filter(
        r => r.kind === kind && focus.some(c => teachingCellsIn(r).includes(c)),
      );
      if (
        bases.length !== 2 ||
        !same(
          bases.flatMap(r => positions(r, targetDigit)),
          premises,
        )
      )
        continue;
      for (const main of bases) {
        const mainCandidates = positions(main, targetDigit);
        if (mainCandidates.length !== 2) continue;
        const finBase = bases.find(r => r !== main)!;
        const covers = allRegions.filter(
          r =>
            r.kind === (kind === 'row' ? 'column' : 'row') &&
            mainCandidates.some(c => teachingCellsIn(r).includes(c.cell)),
        );
        const baseCandidates = positions(finBase, targetDigit);
        const fins = baseCandidates.filter(c =>
          covers.every(r => !teachingCellsIn(r).includes(c.cell)),
        );
        const body = premises.filter(c => !fins.some(f => key(f) === key(c)));
        const finBox = fins[0] && box(fins[0].cell);
        const missing = covers.flatMap(r =>
          teachingCellsIn(r).filter(
            c =>
              teachingCellsIn(finBase).includes(c) &&
              !has({ cell: c, digit: targetDigit }),
          ),
        );
        if (
          !fins.length ||
          !fins.every(c => box(c.cell) === finBox) ||
          missing.length !== (code === 'sashimiXWing' ? 1 : 0)
        )
          continue;
        const missingCover =
          code === 'sashimiXWing'
            ? covers.find(r => teachingCellsIn(r).includes(missing[0]))
            : undefined;
        if (
          !step.eliminations.every(
            c =>
              c.digit === targetDigit &&
              box(c.cell) === finBox &&
              !focus.includes(c.cell) &&
              covers.some(r => teachingCellsIn(r).includes(c.cell)) &&
              (code !== 'sashimiXWing' ||
                (!!missingCover &&
                  teachingCellsIn(missingCover).includes(c.cell) &&
                  fins.every(f => teachingPeers(c.cell, f.cell)))),
          )
        )
          continue;
        regions = [...bases, ...covers, { kind: 'box', index: finBox! }];
        semanticRegions = [
          ...bases.map(region => ({ region, role: 'fishBase' as const })),
          ...covers.map(region => ({ region, role: 'fishCover' as const })),
        ];
        background = unique([
          ...background,
          ...regions.flatMap(teachingCellsIn),
          ...missing,
        ]);
        finCandidates = fins;
        diagramDigit = targetDigit;
        diagramEmptyCells = missing;
        add(
          'fins',
          {
            cells: csName(body),
            fins: csName(fins),
            regions: regionName({ kind: 'box', index: finBox! }),
            missing: missing.length
              ? interpolate(copy.teaching.missing, {
                  cells: cellsName(missing),
                })
              : '',
          },
          { diagramEmptyCells: missing },
        );
        if (code === 'sashimiXWing') {
          if (!missingCover) continue;
          const direct = mainCandidates.find(c =>
            teachingCellsIn(missingCover).includes(c.cell),
          );
          const alternate = mainCandidates.find(c => c.cell !== direct?.cell);
          const alternateCover = alternate
            ? covers.find(r => teachingCellsIn(r).includes(alternate.cell))
            : undefined;
          const corner = alternateCover
            ? body.find(c => teachingCellsIn(alternateCover).includes(c.cell))
            : undefined;
          if (!direct || !alternate || !corner) continue;
          add(
            'sashimiPair',
            {
              regions: regionName(main),
              digits: targetDigit,
              candidates: csName(mainCandidates),
            },
            {
              spotlightCells: background,
              links: [
                {
                  from: mainCandidates[0].cell,
                  to: mainCandidates[1].cell,
                  kind: 'pair',
                  active: true,
                },
              ],
            },
          );
          const excluded = (candidates: readonly CandidateRef[]) =>
            candidates.map(c => ({
              ...c,
              role: 'excluded' as const,
              exclusionKind: 'explanation' as const,
            }));
          add(
            'sashimiDirect',
            {
              selected: csName([direct]),
              opposite: csName([alternate]),
              targets: csName(step.eliminations),
            },
            {
              spotlightCells: background,
              hypotheticalValues: [{ ...direct, role: 'assumption' }],
              eliminations: [alternate, ...step.eliminations],
              showEliminations: true,
              candidateMarks: excluded([alternate, ...step.eliminations]),
              links: [
                {
                  from: direct.cell,
                  to: alternate.cell,
                  kind: 'pair',
                  active: true,
                },
                ...step.eliminations.map(c => ({
                  from: direct.cell,
                  to: c.cell,
                  kind: 'target' as const,
                  active: true,
                })),
              ],
            },
          );
          add(
            'sashimiAlternate',
            { digits: targetDigit },
            {
              hypotheticalValues: [{ ...alternate, role: 'assumption' }],
              eliminations: [direct, corner],
              showEliminations: true,
              candidateMarks: [
                ...fins.map(c => ({ ...c, role: 'potential' as const })),
                ...excluded([direct, corner]),
              ],
            },
          );
          add(
            'sashimiFin',
            {
              selected: csName([alternate]),
              opposite: csName([direct]),
              corner: csName([corner]),
              regions: regionName(finBase),
              digits: targetDigit,
              fins: csName(fins),
              targets: csName(step.eliminations),
            },
            {
              spotlightCells: background,
              hypotheticalValues: [{ ...alternate, role: 'assumption' }],
              eliminations: [direct, corner, ...step.eliminations],
              showEliminations: true,
              candidateMarks: [
                ...fins.map(c => ({ ...c, role: 'potential' as const })),
                ...excluded([direct, corner, ...step.eliminations]),
              ],
              links: [
                {
                  from: alternate.cell,
                  to: direct.cell,
                  kind: 'pair',
                  active: true,
                },
                {
                  from: alternate.cell,
                  to: corner.cell,
                  kind: 'peer',
                  active: true,
                },
                ...fins.flatMap(fin =>
                  step.eliminations.map(c => ({
                    from: fin.cell,
                    to: c.cell,
                    kind: 'target' as const,
                    active: true,
                  })),
                ),
              ],
            },
          );
          return conclude(
            false,
            interpolate(copy.teaching.sashimiResult, {
              targets: csName(step.eliminations),
            }),
          );
        }
        const excluded = (candidates: readonly CandidateRef[]) =>
          candidates.map(c => ({
            ...c,
            role: 'excluded' as const,
            exclusionKind: 'explanation' as const,
          }));
        for (const [index, fin] of fins.entries()) {
          add(
            'finTrue',
            { digits: targetDigit },
            {
              eliminations: step.eliminations,
              showEliminations: true,
              candidateMarks: [
                ...premises.map(c => ({ ...c, role: 'potential' as const })),
                ...excluded(step.eliminations),
              ],
              hypotheticalValues: [{ ...fin, role: 'assumption' }],
              delayDiagramStrikes: true,
            },
          );
          pages[pages.length - 1].title = interpolate(
            copy.teaching.finCaseTitle,
            { index: index + 1 },
          );
        }
        add(
          'finFalse',
          { digits: targetDigit },
          {
            hypotheticalValues: [],
            finCondition: 'none',
            eliminations: [...fins, ...step.eliminations],
            showEliminations: true,
            candidateMarks: [
              ...body.map(c => ({ ...c, role: 'potential' as const })),
              ...excluded([...fins, ...step.eliminations]),
            ],
          },
        );
        return conclude(
          false,
          interpolate(copy.teaching.fishResult, { digits: targetDigit }),
        );
      }
    }
    return null;
  }
  const strongRegionRef = (
    a: readonly CandidateRef[],
    b: readonly CandidateRef[],
  ): RegionRef | null => {
    const both = [...a, ...b];
    if (both.length && both.every(c => c.digit === both[0].digit)) {
      return (
        commonRegions(both.map(c => c.cell)).find(unit =>
          same(positions(unit, both[0].digit), both),
        ) ?? null
      );
    }
    return null;
  };
  const strongRegion = (
    a: readonly CandidateRef[],
    b: readonly CandidateRef[],
  ) => {
    const both = [...a, ...b];
    if (
      both.length &&
      both.every(c => c.cell === both[0].cell) &&
      same(at([both[0].cell]), both)
    )
      return cellName(both[0].cell);
    const region = strongRegionRef(a, b);
    return region ? regionName(region) : null;
  };
  if (code === 'wWing') {
    if (!targetDigit) return null;
    for (const a of focus)
      for (const b of focus.filter(c => c > a)) {
        if (
          grid[a] !== grid[b] ||
          digits(grid[a]).length !== 2 ||
          !digits(grid[a]).includes(targetDigit) ||
          teachingPeers(a, b)
        )
          continue;
        const d = digits(grid[a]).find(v => v !== targetDigit)!;
        const pair = focus
          .filter(c => c !== a && c !== b)
          .map(cell => ({ cell, digit: d }));
        if (
          pair.length !== 2 ||
          !pair.every(has) ||
          !strongRegion([pair[0]], [pair[1]]) ||
          !(
            (teachingPeers(a, pair[0].cell) &&
              teachingPeers(b, pair[1].cell)) ||
            (teachingPeers(a, pair[1].cell) && teachingPeers(b, pair[0].cell))
          )
        )
          continue;
        if (
          !step.eliminations.every(
            c =>
              c.digit === targetDigit &&
              teachingPeers(c.cell, a) &&
              teachingPeers(c.cell, b),
          )
        )
          continue;
        if (!teachingPeers(a, pair[0].cell)) pair.reverse();
        const wings = [a, b];
        const linkRegion = strongRegionRef([pair[0]], [pair[1]])!;
        const wingCandidates = at(wings, digits(grid[a]));
        const structuralCandidates = [...wingCandidates, ...pair];
        const targetCells = step.eliminations.map(candidate => candidate.cell);
        const sceneCells = unique([
          ...wings,
          ...pair.map(c => c.cell),
          ...targetCells,
        ]);
        const chainLinks: HintLinkMark[] = [
          { from: a, to: pair[0].cell, kind: 'peer' },
          { from: pair[0].cell, to: pair[1].cell, kind: 'pair' },
          { from: pair[1].cell, to: b, kind: 'peer' },
        ];
        const targetLinks = (wing: number): HintLinkMark[] =>
          targetCells.map(target => ({
            from: wing,
            to: target,
            kind: 'target',
          }));
        const retitleLast = (title: string) => {
          const page = pages[pages.length - 1];
          pages[pages.length - 1] = { ...page, title };
        };

        background = wings;
        premises = wingCandidates;
        regions = [];
        links = [];
        const wingsParams = {
          wingA: cellName(a),
          wingB: cellName(b),
          targetDigit,
          linkDigit: d,
        };
        add('wWingWings', wingsParams, {
          focusCells: wings,
          spotlightCells: wings,
          focusRegions: [],
          regionMarks: [],
          premiseCandidates: wingCandidates,
          candidateMarks: wingCandidates.map(candidate => ({
            ...candidate,
            role: 'potential' as const,
          })),
          links: [],
        });
        retitleLast(copy.teaching.wWingWingsTitle);

        background = sceneCells;
        premises = structuralCandidates;
        regions = [linkRegion];
        links = [
          chainLinks[0],
          { ...chainLinks[1], active: true },
          chainLinks[2],
          ...wings.flatMap(targetLinks),
        ];
        const linkParams = {
          region: regionName(linkRegion),
          linkDigit: d,
          linkA: cellName(pair[0].cell),
          linkB: cellName(pair[1].cell),
          targets: csName(step.eliminations),
        };
        add('wWingLink', linkParams, {
          focusCells: background,
          spotlightCells: background,
          premiseCandidates: structuralCandidates,
          candidateMarks: structuralCandidates.map(candidate => ({
            ...candidate,
            role: 'potential' as const,
          })),
          cellMarks: [
            ...wings.map(cell => ({ cell, role: 'potential' as const })),
            ...pair.map(candidate => ({
              cell: candidate.cell,
              role: 'established' as const,
            })),
            ...targetCells.map(cell => ({ cell, role: 'result' as const })),
          ],
          links,
        });
        retitleLast(copy.teaching.wWingLinkTitle);

        for (const [index, wing] of wings.entries()) {
          const endpoint = pair[index];
          const otherEndpoint = pair[index === 0 ? 1 : 0];
          const params = {
            branch: index + 1,
            linkCell: cellName(endpoint.cell),
            linkDigit: d,
            wingCell: cellName(wing),
            targetDigit,
            targets: csName(step.eliminations),
          };
          links = [
            { ...chainLinks[1], active: true },
            { ...chainLinks[index === 0 ? 0 : 2], active: true },
            ...targetLinks(wing),
          ];
          add('wWingCase', params, {
            focusCells: sceneCells,
            spotlightCells: sceneCells,
            premiseCandidates: structuralCandidates,
            hypotheticalValues: [
              { ...endpoint, role: 'assumption' },
              { cell: wing, digit: targetDigit, role: 'consequence' },
            ],
            eliminations: step.eliminations,
            showEliminations: true,
            candidateMarks: [
              ...structuralCandidates.map(candidate => ({
                ...candidate,
                role: 'potential' as const,
              })),
              {
                ...otherEndpoint,
                role: 'excluded' as const,
                exclusionKind: 'explanation' as const,
              },
              ...step.eliminations.map(candidate => ({
                ...candidate,
                role: 'excluded' as const,
                exclusionKind: 'explanation' as const,
              })),
            ],
            cellMarks: targetCells.map(cell => ({
              cell,
              role: 'result' as const,
            })),
            links,
          });
          retitleLast(interpolate(copy.teaching.wWingCaseTitle, params));
        }

        background = sceneCells;
        premises = structuralCandidates;
        regions = [linkRegion];
        links = [
          ...chainLinks.map(link => ({ ...link, active: true })),
          ...wings.flatMap(targetLinks),
        ];
        const resultParams = {
          targetDigit,
          targets: csName(step.eliminations),
        };
        conclude(
          false,
          interpolate(copy.teaching.wWingConclusion, resultParams),
        );
        pages[0] = { ...pages[0], title: copy.teaching.wWingWingsTitle };
        const conclusion = pages[pages.length - 1];
        pages[pages.length - 1] = {
          ...conclusion,
          title: copy.teaching.wWingConclusionTitle,
          visuals: {
            ...conclusion.visuals,
            cellMarks: targetCells.map(cell => ({
              cell,
              role: 'result' as const,
            })),
          },
        };
        return pages;
      }
    return null;
  }
  if (
    ['uniqueRectangle', 'hiddenRectangle', 'avoidableRectangle'].includes(code)
  ) {
    if (
      focus.length !== 4 ||
      unique(focus.map(c => Math.floor(c / 9))).length !== 2 ||
      unique(focus.map(c => c % 9)).length !== 2 ||
      unique(focus.map(box)).length !== 2
    )
      return null;
    regions = allRegions.filter(
      r => teachingCellsIn(r).filter(c => focus.includes(c)).length === 2,
    );
    const sorted = [...focus].sort((a, b) => a - b);
    let pair: Digit[] = ds;
    let swapDigits: CandidateRef[] = [];
    let floor: number[] = [];
    let roofPair: CandidateRef[] = [];
    if (code === 'avoidableRectangle') {
      if (
        !step.teaching?.givenCells ||
        !step.teaching.givenCells.every(
          c => Number.isInteger(c) && c >= 0 && c < 81,
        ) ||
        focus.some(c => step.teaching!.givenCells!.includes(c))
      )
        return null;
      const values =
        step.teaching?.mode === 'avoidable'
          ? step.teaching.branches[0]?.nodes.flatMap(n =>
              n.rule === 'entered' ? n.candidates : [],
            )
          : [];
      if (
        values?.length !== 3 ||
        !values.every(
          c =>
            focus.includes(c.cell) &&
            step.boardFingerprint[c.cell] === String(c.digit),
        ) ||
        step.eliminations.length !== 1
      )
        return null;
      swapDigits = [...values, ...step.eliminations];
      pair = unique(swapDigits.map(c => c.digit));
      if (
        pair.length !== 2 ||
        swapDigits.some(a =>
          swapDigits.some(
            b => a.digit === b.digit && teachingPeers(a.cell, b.cell),
          ),
        )
      )
        return null;
    } else {
      if (pair.length !== 2 || !same(at(focus, pair), premises)) return null;
      if (code === 'uniqueRectangle') {
        const roof = unique(step.eliminations.map(c => c.cell));
        if (
          roof.length !== 1 ||
          !same(
            step.eliminations,
            pair.map(digit => ({ cell: roof[0], digit })),
          ) ||
          digits(grid[roof[0]]).length <= 2 ||
          !focus
            .filter(c => c !== roof[0])
            .every(c => digits(grid[c]).length === 2)
        )
          return null;
      } else {
        const roof = unique(step.eliminations.map(c => c.cell));
        floor = focus.filter(c => !roof.includes(c));
        const deleted = unique(step.eliminations.map(c => c.digit));
        if (
          roof.length !== 2 ||
          floor.length !== 2 ||
          deleted.length !== 1 ||
          !floor.every(c => digits(grid[c]).length === 2) ||
          Math.floor(roof[0] / 9) !== Math.floor(roof[1] / 9)
        )
          return null;
        roofPair = roof.map(cell => ({
          cell,
          digit: pair.find(d => d !== deleted[0])!,
        }));
        if (!strongRegion([roofPair[0]], [roofPair[1]])) return null;
      }
      swapDigits = sorted.map((cell, i) => ({
        cell,
        digit: pair[i === 0 || i === 3 ? 0 : 1],
      }));
    }
    add('uniqueness');
    if (code === 'uniqueRectangle') add('unique', { digits: pair.join(', ') });
    if (code === 'hiddenRectangle')
      add(
        'hiddenRectangle',
        {
          cells: cellsName(floor),
          digits: pair.join(', '),
          candidates: csName(roofPair),
        },
        {
          links: [
            { from: roofPair[0].cell, to: roofPair[1].cell, kind: 'pair' },
          ],
        },
      );
    if (code === 'avoidableRectangle')
      add(
        'avoidable',
        { candidates: csName(step.eliminations) },
        {
          valueEvidence: swapDigits.filter(
            c => step.boardFingerprint[c.cell] !== '0',
          ),
        },
      );
    for (let i = 0; i < 2; i++) {
      const values = swapDigits.map(c => ({
        ...c,
        digit: i === 0 ? c.digit : pair.find(d => d !== c.digit)!,
      }));
      add(
        'swap',
        { branch: i + 1, candidates: csName(values) },
        {
          hypotheticalValues: values.map(c => ({ ...c, role: 'assumption' })),
          questionCells: focus,
        },
      );
      reset();
    }
    return conclude();
  }
  if (code === 'bugPlusOne') {
    const target = step.placements[0];
    if (!target || step.placements.length !== 1) return null;
    const empty = Array.from({ length: 81 }, (_, c) => c).filter(
      c => step.boardFingerprint[c] === '0',
    );
    if (
      !empty.every(c => digits(grid[c]).length === (c === target.cell ? 3 : 2))
    )
      return null;
    if (
      !allRegions.every(r =>
        digits(511).every(d => {
          const placed = teachingCellsIn(r).some(
            c => step.boardFingerprint[c] === String(d),
          );
          return (
            positions(r, d).length ===
            (placed
              ? 0
              : teachingCellsIn(r).includes(target.cell) && d === target.digit
              ? 3
              : 2)
          );
        }),
      )
    )
      return null;
    background = empty;
    premises = at(empty);
    regions = commonRegions([target.cell]);
    add('bug', { candidates: csName([target]) });
    for (const r of regions)
      add('count', {
        regions: regionName(r),
        digits: target.digit,
        cells: cellsName(positions(r, target.digit).map(c => c.cell)),
        count: 3,
      });
    return conclude();
  }
  const teaching = step.teaching;
  if (!teaching || !isTeachingProof(teaching) || !teaching.branches.length)
    return null;
  if (
    [
      'color_conflict',
      'color_trap',
      'multi_color',
      'complex_color',
      'remote_pair',
    ].includes(teaching.mode)
  ) {
    const remote = teaching.mode === 'remote_pair';
    const components = teaching.branches.filter(
      b => b.nodes.length === 2 && b.nodes.every(n => n.rule === 'color'),
    );
    if (!components.length || !targetDigit) return null;
    const colors = components.map(b => b.nodes.map(n => n.candidates));
    const all = colors.flat(2);
    if (
      !all.length ||
      !all.every(has) ||
      new Set(all.map(key)).size !== all.length
    )
      return null;
    const d = all[0].digit;
    if (!all.every(c => c.digit === d)) return null;
    if (
      remote &&
      (ds.length !== 2 ||
        !same(at(focus), premises) ||
        !focus.every(c => digits(grid[c]).length === 2))
    )
      return null;
    // Every component must be connected by genuine conjugate links (or bivalue peer edges).
    const colorLinks: HintLinkMark[] = [];
    for (const component of colors) {
      const nodes = component.flat();
      const adjacency = nodes.map(a =>
        nodes
          .map((b, j) => ({ b, j }))
          .filter(({ b }) =>
            remote ? teachingPeers(a.cell, b.cell) : !!strongRegion([a], [b]),
          )
          .map(({ j }) => j),
      );
      if (component.some(side => !side.length)) return null;
      const seen = new Set<number>([0]);
      const pending = [0];
      while (pending.length) {
        const i = pending.shift()!;
        for (const j of adjacency[i]) {
          if (!seen.has(j)) {
            seen.add(j);
            pending.push(j);
          }
          if (i < j) {
            if (
              component[0].some(c => key(c) === key(nodes[i])) ===
              component[0].some(c => key(c) === key(nodes[j]))
            )
              return null;
            colorLinks.push({
              from: nodes[i].cell,
              to: nodes[j].cell,
              kind: 'pair',
            });
          }
        }
      }
      if (seen.size !== nodes.length) return null;
    }
    links = colorLinks;
    premises = remote ? premises : all;
    background = unique([...background, ...all.map(c => c.cell)]);
    const colorMarks = colors.flatMap((sides, component) =>
      sides.flatMap((side, color) =>
        side.map(c => ({ ...c, component, color: color as 0 | 1 })),
      ),
    );
    const colorVisual = { colorMarks };
    if (
      code === 'simpleColoring' &&
      colors.length === 1 &&
      (teaching.mode === 'color_trap' || teaching.mode === 'color_conflict')
    ) {
      const firstLink = colorLinks[0];
      if (!firstLink) return null;
      const firstCandidates = [firstLink.from, firstLink.to].map(cell => ({
        cell,
        digit: d,
      }));
      const firstRegion = strongRegionRef(
        [firstCandidates[0]],
        [firstCandidates[1]],
      );
      if (!firstRegion) return null;
      const retitleLast = (title: string) => {
        const page = pages[pages.length - 1];
        pages[pages.length - 1] = { ...page, title };
      };
      const activeLinks = (marks: readonly HintLinkMark[]) =>
        marks.map(link => ({ ...link, active: true }));
      const networkCells = unique(all.map(candidate => candidate.cell));
      const targetCells = unique(
        step.eliminations.map(candidate => candidate.cell),
      );
      const sceneCells = unique([...networkCells, ...targetCells]);
      const targetCellMarks = targetCells.map(cell => ({
        cell,
        role: 'result' as const,
      }));
      const potentialMarks = all.map(candidate => ({
        ...candidate,
        role: 'potential' as const,
      }));
      const spanningLinks: HintLinkMark[] = [firstLink];
      const reached = new Set([firstLink.from, firstLink.to]);
      while (reached.size < networkCells.length) {
        const next = colorLinks.find(
          link =>
            !spanningLinks.includes(link) &&
            reached.has(link.from) !== reached.has(link.to),
        );
        if (!next) return null;
        spanningLinks.push(next);
        reached.add(next.from);
        reached.add(next.to);
      }

      links = [firstLink];
      add(
        'simpleColorStart',
        {
          region: regionName(firstRegion),
          digit: d,
          first: cellName(firstLink.from),
          second: cellName(firstLink.to),
        },
        {
          focusCells: sceneCells,
          spotlightCells: sceneCells,
          focusRegions: [firstRegion],
          regionMarks: [{ region: firstRegion, role: 'source' }],
          premiseCandidates: all,
          candidateMarks: potentialMarks,
          colorMarks: colorMarks.filter(mark =>
            [firstLink.from, firstLink.to].includes(mark.cell),
          ),
          cellMarks: targetCellMarks,
          links: activeLinks([firstLink]),
        },
      );
      retitleLast(copy.teaching.simpleColorStartTitle);

      add(
        'simpleColorAlternate',
        { digit: d },
        {
          focusCells: sceneCells,
          spotlightCells: sceneCells,
          focusRegions: [],
          regionMarks: [],
          premiseCandidates: all,
          candidateMarks: potentialMarks,
          colorMarks,
          cellMarks: targetCellMarks,
          links: activeLinks(spanningLinks),
        },
      );
      retitleLast(copy.teaching.simpleColorAlternateTitle);

      add(
        teaching.mode === 'color_conflict'
          ? 'simpleColorNetworkWithStates'
          : 'simpleColorNetwork',
        { count: all.length, digit: d },
        {
          focusCells: sceneCells,
          spotlightCells: sceneCells,
          focusRegions: [],
          regionMarks: [],
          premiseCandidates: all,
          candidateMarks: potentialMarks,
          colorMarks,
          cellMarks: targetCellMarks,
          links: activeLinks(colorLinks),
        },
      );
      retitleLast(copy.teaching.simpleColorNetworkTitle);

      if (teaching.mode !== 'color_conflict') {
        add(
          'simpleColorStates',
          {},
          {
            focusCells: sceneCells,
            spotlightCells: sceneCells,
            focusRegions: [],
            regionMarks: [],
            premiseCandidates: all,
            candidateMarks: potentialMarks,
            colorMarks,
            cellMarks: targetCellMarks,
            links: colorLinks.map(link => ({ ...link, active: false })),
          },
        );
        retitleLast(copy.teaching.simpleColorStatesTitle);
      }

      if (teaching.mode === 'color_trap') {
        const trapWitnesses = step.eliminations.map(target => {
          const a = colors[0][0].find(candidate => conflict(target, candidate));
          const b = colors[0][1].find(candidate => conflict(target, candidate));
          return a && b ? { target, a, b } : null;
        });
        if (trapWitnesses.some(witness => witness === null)) return null;
        const witnesses = trapWitnesses.filter(
          (witness): witness is NonNullable<typeof witness> => witness !== null,
        );
        const witnessA = uniqueCandidates(witnesses.map(witness => witness.a));
        const witnessB = uniqueCandidates(witnesses.map(witness => witness.b));
        const targetLinks: HintLinkMark[] = witnesses.flatMap(witness => [
          {
            from: witness.a.cell,
            to: witness.target.cell,
            kind: 'target',
            active: true,
          },
          {
            from: witness.b.cell,
            to: witness.target.cell,
            kind: 'target',
            active: true,
          },
        ]);
        links = [
          ...colorLinks.map(link => ({ ...link, active: false })),
          ...targetLinks,
        ];
        add(
          'simpleColorTrap',
          {
            targets: csName(step.eliminations),
            a: csName(witnessA),
            b: csName(witnessB),
          },
          {
            focusCells: sceneCells,
            spotlightCells: sceneCells,
            focusRegions: [],
            regionMarks: [],
            premiseCandidates: all,
            candidateMarks: [
              ...potentialMarks,
              ...step.eliminations.map(candidate => ({
                ...candidate,
                role: 'potential' as const,
              })),
            ],
            colorMarks,
            cellMarks: targetCellMarks,
            links,
          },
        );
        retitleLast(copy.teaching.simpleColorTrapTitle);
        conclude(
          false,
          interpolate(copy.teaching.simpleColorTrapConclusion, {
            targets: csName(step.eliminations),
          }),
        );
        pages[0] = { ...pages[0], title: copy.teaching.simpleColorStartTitle };
        const conclusion = pages[pages.length - 1];
        pages[pages.length - 1] = {
          ...conclusion,
          title: copy.teaching.simpleColorTrapConclusionTitle,
          visuals: {
            ...conclusion.visuals,
            colorMarks,
            cellMarks: targetCellMarks,
            links,
          },
        };
        return pages;
      }

      const badColor = colors[0].findIndex(side =>
        same(side, step.eliminations),
      );
      const bad = colors[0][badColor];
      const a = bad?.find(candidate =>
        bad.some(other => conflict(candidate, other)),
      );
      const b = a && bad?.find(candidate => conflict(a, candidate));
      if (badColor < 0 || !bad || !a || !b) return null;
      const conflictRegion = commonRegions([a.cell, b.cell])[0];
      if (!conflictRegion) return null;
      const conflictLink: HintLinkMark = {
        from: a.cell,
        to: b.cell,
        kind: 'peer',
        conflict: true,
        active: true,
      };
      links = [
        ...colorLinks.map(link => ({ ...link, active: false })),
        conflictLink,
      ];
      add(
        'simpleColorWrap',
        {
          a: csName([a]),
          b: csName([b]),
          color: badColor === 0 ? 'A' : 'B',
          digit: d,
        },
        {
          focusCells: sceneCells,
          spotlightCells: sceneCells,
          focusRegions: [conflictRegion],
          regionMarks: [{ region: conflictRegion, role: 'affected' }],
          diagramRegions: [{ region: conflictRegion, conflict: true }],
          premiseCandidates: all,
          candidateMarks: potentialMarks,
          colorMarks,
          cellMarks: targetCellMarks,
          links,
        },
      );
      retitleLast(copy.teaching.simpleColorWrapTitle);

      links = colorLinks.map(link => ({ ...link, active: false }));
      add(
        'simpleColorWrapInvalid',
        {
          color: badColor === 0 ? 'A' : 'B',
          targets: csName(step.eliminations),
        },
        {
          showEliminations: true,
          focusCells: sceneCells,
          spotlightCells: sceneCells,
          focusRegions: [],
          regionMarks: [],
          diagramRegions: [],
          premiseCandidates: all,
          candidateMarks: [
            ...potentialMarks,
            ...step.eliminations.map(candidate => ({
              ...candidate,
              role: 'excluded' as const,
              exclusionKind: 'result' as const,
            })),
          ],
          colorMarks,
          cellMarks: targetCellMarks,
          links,
        },
      );
      retitleLast(
        interpolate(copy.teaching.simpleColorWrapInvalidTitle, {
          color: badColor === 0 ? 'A' : 'B',
        }),
      );
      conclude(
        false,
        interpolate(copy.teaching.simpleColorWrapConclusion, {
          color: badColor === 0 ? 'A' : 'B',
          targets: csName(step.eliminations),
        }),
      );
      pages[0] = { ...pages[0], title: copy.teaching.simpleColorStartTitle };
      const conclusion = pages[pages.length - 1];
      pages[pages.length - 1] = {
        ...conclusion,
        title: copy.teaching.simpleColorWrapConclusionTitle,
        visuals: {
          ...conclusion.visuals,
          colorMarks,
          cellMarks: targetCellMarks,
          links,
        },
      };
      return pages;
    }
    if (code === 'multiColoring' && teaching.mode === 'multi_color') {
      if (colors.length !== 2) return null;
      const retitleLast = (title: string) => {
        const page = pages[pages.length - 1];
        pages[pages.length - 1] = { ...page, title };
      };
      const networkCells = unique(all.map(candidate => candidate.cell));
      const targetCells = unique(
        step.eliminations.map(candidate => candidate.cell),
      );
      const sceneCells = unique([...networkCells, ...targetCells]);
      const targetCellMarks = targetCells.map(cell => ({
        cell,
        role: 'result' as const,
      }));
      const potentialMarks = all.map(candidate => ({
        ...candidate,
        role: 'potential' as const,
      }));
      const inactiveColorLinks = colorLinks.map(link => ({
        ...link,
        active: false,
      }));
      const marksEmphasizing = (
        predicate: (mark: (typeof colorMarks)[number]) => boolean,
      ) => colorMarks.map(mark => ({ ...mark, active: predicate(mark) }));

      let proof:
        | {
            firstColor: 0 | 1;
            secondColor: 0 | 1;
            conflictA: CandidateRef;
            conflictB: CandidateRef;
            forcedFirst: readonly CandidateRef[];
            forcedSecond: readonly CandidateRef[];
            witnesses: readonly {
              target: CandidateRef;
              first: CandidateRef;
              second: CandidateRef;
            }[];
          }
        | undefined;
      for (const firstColor of [0, 1] as const) {
        for (const secondColor of [0, 1] as const) {
          const conflictA = colors[0][firstColor].find(candidate =>
            colors[1][secondColor].some(other => conflict(candidate, other)),
          );
          const conflictB = conflictA
            ? colors[1][secondColor].find(candidate =>
                conflict(conflictA, candidate),
              )
            : undefined;
          const forcedFirst = colors[0][1 - firstColor];
          const forcedSecond = colors[1][1 - secondColor];
          const witnesses = step.eliminations.map(target => {
            const first = forcedFirst.find(candidate =>
              conflict(target, candidate),
            );
            const second = forcedSecond.find(candidate =>
              conflict(target, candidate),
            );
            return first && second ? { target, first, second } : null;
          });
          if (
            conflictA &&
            conflictB &&
            witnesses.every(witness => witness !== null)
          ) {
            proof = {
              firstColor,
              secondColor,
              conflictA,
              conflictB,
              forcedFirst,
              forcedSecond,
              witnesses: witnesses.filter(
                (witness): witness is NonNullable<typeof witness> =>
                  witness !== null,
              ),
            };
            break;
          }
        }
        if (proof) break;
      }
      if (!proof) return null;
      const conflictRegion = commonRegions([
        proof.conflictA.cell,
        proof.conflictB.cell,
      ])[0];
      if (!conflictRegion) return null;
      const conflictLink: HintLinkMark = {
        from: proof.conflictA.cell,
        to: proof.conflictB.cell,
        kind: 'peer',
        conflict: true,
        active: true,
      };
      const targetLinks: HintLinkMark[] = proof.witnesses.flatMap(witness => [
        {
          from: witness.first.cell,
          to: witness.target.cell,
          kind: 'target' as const,
          active: true,
        },
        {
          from: witness.second.cell,
          to: witness.target.cell,
          kind: 'target' as const,
          active: true,
        },
      ]);
      const baseVisual = {
        showColorLegend: true,
        focusCells: sceneCells,
        spotlightCells: sceneCells,
        focusRegions: [] as RegionRef[],
        regionMarks: [] as HintPageVisuals['regionMarks'],
        premiseCandidates: all,
        candidateMarks: potentialMarks,
        cellMarks: targetCellMarks,
      };

      add(
        'multiOverview',
        { digit: d, targets: csName(step.eliminations) },
        {
          ...baseVisual,
          colorMarks,
          links: colorLinks.map(link => ({ ...link, active: true })),
        },
      );
      retitleLast(copy.teaching.multiOverviewTitle);

      for (const component of [0, 1] as const) {
        const componentCells = new Set(
          colors[component].flat().map(candidate => candidate.cell),
        );
        add(
          'multiComponent',
          {
            component: component + 1,
            a: csName(colors[component][0]),
            b: csName(colors[component][1]),
          },
          {
            ...baseVisual,
            colorMarks: marksEmphasizing(mark => mark.component === component),
            links: colorLinks.map(link => ({
              ...link,
              active:
                componentCells.has(link.from) && componentCells.has(link.to),
            })),
          },
        );
        retitleLast(
          interpolate(copy.teaching.multiComponentTitle, {
            component: component + 1,
          }),
        );
      }

      links = [...inactiveColorLinks, conflictLink];
      add(
        'multiConflict',
        {
          first: csName([proof.conflictA]),
          second: csName([proof.conflictB]),
          region: regionName(conflictRegion),
        },
        {
          ...baseVisual,
          focusRegions: [conflictRegion],
          regionMarks: [{ region: conflictRegion, role: 'affected' }],
          diagramRegions: [{ region: conflictRegion, conflict: true }],
          colorMarks,
          links,
        },
      );
      retitleLast(copy.teaching.multiConflictTitle);

      const forcedFirstName = csName(proof.forcedFirst);
      const forcedSecondName = csName(proof.forcedSecond);
      const forcedCells = unique([
        ...proof.forcedFirst.map(candidate => candidate.cell),
        ...proof.forcedSecond.map(candidate => candidate.cell),
        ...targetCells,
      ]);
      links = inactiveColorLinks;
      add(
        'multiOpposite',
        {
          firstOpposite: forcedFirstName,
          secondOpposite: forcedSecondName,
        },
        {
          ...baseVisual,
          focusCells: forcedCells,
          spotlightCells: forcedCells,
          colorMarks: marksEmphasizing(
            mark =>
              (mark.component === 0 && mark.color === 1 - proof.firstColor) ||
              (mark.component === 1 && mark.color === 1 - proof.secondColor),
          ),
          links,
        },
      );
      retitleLast(copy.teaching.multiOppositeTitle);

      const firstWitnesses = uniqueCandidates(
        proof.witnesses.map(witness => witness.first),
      );
      const secondWitnesses = uniqueCandidates(
        proof.witnesses.map(witness => witness.second),
      );
      const targetFocusCells = unique([
        ...firstWitnesses.map(candidate => candidate.cell),
        ...secondWitnesses.map(candidate => candidate.cell),
        ...targetCells,
      ]);
      links = [...inactiveColorLinks, ...targetLinks];
      add(
        'multiTarget',
        {
          targets: csName(step.eliminations),
          firstWitness: csName(firstWitnesses),
          secondWitness: csName(secondWitnesses),
        },
        {
          ...baseVisual,
          focusCells: targetFocusCells,
          spotlightCells: targetFocusCells,
          candidateMarks: [
            ...potentialMarks,
            ...step.eliminations.map(candidate => ({
              ...candidate,
              role: 'potential' as const,
            })),
          ],
          colorMarks: marksEmphasizing(
            mark =>
              firstWitnesses.some(candidate => key(candidate) === key(mark)) ||
              secondWitnesses.some(candidate => key(candidate) === key(mark)),
          ),
          links,
        },
      );
      retitleLast(copy.teaching.multiTargetTitle);

      conclude(
        false,
        interpolate(copy.teaching.multiConclusion, {
          targets: csName(step.eliminations),
        }),
      );
      const conclusion = pages[pages.length - 1];
      pages[pages.length - 1] = {
        ...conclusion,
        title: copy.teaching.multiConclusionTitle,
        visuals: {
          ...conclusion.visuals,
          showColorLegend: true,
          colorMarks,
          cellMarks: targetCellMarks,
          links,
        },
      };
      pages[0] = { ...pages[0], title: copy.teaching.multiOverviewTitle };
      return pages;
    }
    if (code === 'remotePair' && remote) {
      if (colors.length !== 1 || ds.length !== 2) return null;
      const sides = colors[0];
      const networkCells = unique(all.map(candidate => candidate.cell));
      const targetCells = unique(
        step.eliminations.map(candidate => candidate.cell),
      );
      const sceneCells = unique([...networkCells, ...targetCells]);
      const targetCellMarks = targetCells.map(cell => ({
        cell,
        role: 'result' as const,
      }));
      const potentialMarks = premises.map(candidate => ({
        ...candidate,
        role: 'potential' as const,
      }));
      const targetCandidateMarks = step.eliminations.map(candidate => ({
        ...candidate,
        role: 'potential' as const,
      }));
      const linkKey = (from: number, to: number) =>
        from < to ? `${from}:${to}` : `${to}:${from}`;
      const neighbors = (cell: number) =>
        colorLinks.flatMap(link =>
          link.from === cell ? [link.to] : link.to === cell ? [link.from] : [],
        );
      const shortestPath = (start: number, end: number) => {
        const pending: number[][] = [[start]];
        const seen = new Set([start]);
        while (pending.length) {
          const path = pending.shift()!;
          const last = path[path.length - 1];
          if (last === end) return path;
          for (const next of neighbors(last)) {
            if (seen.has(next)) continue;
            seen.add(next);
            pending.push([...path, next]);
          }
        }
        return null;
      };
      const targetProofs = targetCells.map(target => {
        let best:
          | {
              target: number;
              first: CandidateRef;
              second: CandidateRef;
              path: number[];
            }
          | undefined;
        for (const first of sides[0].filter(candidate =>
          teachingPeers(candidate.cell, target),
        ))
          for (const second of sides[1].filter(candidate =>
            teachingPeers(candidate.cell, target),
          )) {
            const path = shortestPath(first.cell, second.cell);
            if (path && (!best || path.length < best.path.length))
              best = { target, first, second, path };
          }
        return best;
      });
      if (targetProofs.some(proof => proof === undefined)) return null;
      const proofs = targetProofs.filter(
        (proof): proof is NonNullable<typeof proof> => proof !== undefined,
      );
      const pathCells = unique(proofs.flatMap(proof => proof.path));
      const activePathEdges = new Set(
        proofs.flatMap(proof =>
          proof.path
            .slice(1)
            .map((cell, index) => linkKey(proof.path[index], cell)),
        ),
      );
      const pathLinks = colorLinks.map(link => ({
        ...link,
        active: activePathEdges.has(linkKey(link.from, link.to)),
      }));
      const targetLinks: HintLinkMark[] = proofs.flatMap(proof => [
        {
          from: proof.first.cell,
          to: proof.target,
          kind: 'target' as const,
          active: true,
        },
        {
          from: proof.second.cell,
          to: proof.target,
          kind: 'target' as const,
          active: true,
        },
      ]);
      const witnessCells = unique(
        proofs.flatMap(proof => [proof.first.cell, proof.second.cell]),
      );
      const targetFocusCells = unique([...witnessCells, ...targetCells]);
      const marksEmphasizing = (cells: readonly number[]) =>
        colorMarks.map(mark => ({
          ...mark,
          active: cells.includes(mark.cell),
        }));
      const caseValues = (firstDigit: Digit, secondDigit: Digit) => [
        ...uniqueCandidates(
          proofs.map(proof => ({
            cell: proof.first.cell,
            digit: firstDigit,
          })),
        ).map(candidate => ({
          ...candidate,
          role: 'assumption' as const,
        })),
        ...uniqueCandidates(
          proofs.map(proof => ({
            cell: proof.second.cell,
            digit: secondDigit,
          })),
        ).map(candidate => ({
          ...candidate,
          role: 'consequence' as const,
        })),
      ];
      const retitleLast = (title: string) => {
        const page = pages[pages.length - 1];
        pages[pages.length - 1] = { ...page, title };
      };
      const baseVisual = {
        showColorLegend: true,
        focusCells: sceneCells,
        spotlightCells: sceneCells,
        focusRegions: [] as RegionRef[],
        regionMarks: [] as HintPageVisuals['regionMarks'],
        premiseCandidates: premises,
        candidateMarks: [...potentialMarks, ...targetCandidateMarks],
        colorMarks,
        cellMarks: targetCellMarks,
      };

      add(
        'remoteOverview',
        { digits: ds.join(', '), targets: csName(step.eliminations) },
        {
          ...baseVisual,
          links: colorLinks.map(link => ({ ...link, active: true })),
        },
      );
      retitleLast(copy.teaching.remoteOverviewTitle);

      add(
        'remotePairCells',
        { cells: cellsName(networkCells), digits: ds.join(', ') },
        {
          ...baseVisual,
          links: colorLinks.map(link => ({ ...link, active: false })),
        },
      );
      retitleLast(copy.teaching.remotePairCellsTitle);

      add(
        'remoteAlternate',
        { digits: ds.join(', ') },
        {
          ...baseVisual,
          focusCells: unique([...pathCells, ...targetCells]),
          spotlightCells: unique([...pathCells, ...targetCells]),
          colorMarks: marksEmphasizing(pathCells),
          links: pathLinks,
        },
      );
      retitleLast(copy.teaching.remoteAlternateTitle);

      for (const [index, assignment] of [
        [ds[0], ds[1]],
        [ds[1], ds[0]],
      ].entries()) {
        const [firstDigit, secondDigit] = assignment as [Digit, Digit];
        add(
          'remoteCase',
          {
            case: index + 1,
            firstDigit,
            secondDigit,
            firstWitness: csName(
              proofs.map(proof => ({
                cell: proof.first.cell,
                digit: firstDigit,
              })),
            ),
            secondWitness: csName(
              proofs.map(proof => ({
                cell: proof.second.cell,
                digit: secondDigit,
              })),
            ),
            targets: csName(step.eliminations),
          },
          {
            ...baseVisual,
            focusCells: targetFocusCells,
            spotlightCells: targetFocusCells,
            colorMarks: marksEmphasizing(witnessCells),
            links: [
              ...pathLinks.map(link => ({ ...link, active: false })),
              ...targetLinks,
            ],
            hypotheticalValues: caseValues(firstDigit, secondDigit),
          },
        );
        retitleLast(
          interpolate(copy.teaching.remoteCaseTitle, {
            case: index + 1,
            firstDigit,
            secondDigit,
          }),
        );
      }

      links = [
        ...pathLinks.map(link => ({ ...link, active: false })),
        ...targetLinks,
      ];
      conclude(
        false,
        interpolate(copy.teaching.remoteConclusion, {
          targets: csName(step.eliminations),
        }),
      );
      const conclusion = pages[pages.length - 1];
      pages[pages.length - 1] = {
        ...conclusion,
        title: copy.teaching.remoteConclusionTitle,
        visuals: {
          ...conclusion.visuals,
          showColorLegend: true,
          focusCells: targetFocusCells,
          spotlightCells: targetFocusCells,
          colorMarks: marksEmphasizing(witnessCells),
          cellMarks: targetCellMarks,
          links,
        },
      };
      pages[0] = { ...pages[0], title: copy.teaching.remoteOverviewTitle };
      return pages;
    }
    if (code === 'complexColoring' && teaching.mode === 'complex_color') {
      if (colors.length < 3) return null;
      const path = teaching.branches.find(branch =>
        branch.nodes.every(node => node.rule === 'color_on'),
      )?.nodes;
      if (
        !path ||
        path.length < 4 ||
        !same(path[0].candidates, step.eliminations)
      )
        return null;
      const sides = colors.flat();
      const indices = path.map(node =>
        sides.findIndex(side => same(side, node.candidates)),
      );
      if (
        indices.some(index => index < 0) ||
        (indices[0] % 2 === 0 ? indices[0] + 1 : indices[0] - 1) !==
          indices[indices.length - 1]
      )
        return null;

      const transitions: {
        from: readonly CandidateRef[];
        to: readonly CandidateRef[];
        conflictCandidate: CandidateRef;
        sourceWitness: CandidateRef;
        fromComponent: number;
        toComponent: number;
      }[] = [];
      for (let i = 1; i < path.length; i++) {
        const opposite =
          sides[indices[i] % 2 === 0 ? indices[i] + 1 : indices[i] - 1];
        const sourceWitness = path[i - 1].candidates.find(candidate =>
          opposite.some(other => conflict(candidate, other)),
        );
        const conflictCandidate =
          sourceWitness &&
          opposite.find(candidate => conflict(sourceWitness, candidate));
        if (
          !sourceWitness ||
          !conflictCandidate ||
          path[i].parents.length !== 1 ||
          path[i].parents[0] !== i - 1
        )
          return null;
        transitions.push({
          from: path[i - 1].candidates,
          to: path[i].candidates,
          conflictCandidate,
          sourceWitness,
          fromComponent: Math.floor(indices[i - 1] / 2),
          toComponent: Math.floor(indices[i] / 2),
        });
      }

      const targetCells = unique(
        step.eliminations.map(candidate => candidate.cell),
      );
      const networkCells = unique(all.map(candidate => candidate.cell));
      const sceneCells = unique([...networkCells, ...targetCells]);
      const targetCellMarks = targetCells.map(cell => ({
        cell,
        role: 'result' as const,
      }));
      const potentialMarks = all.map(candidate => ({
        ...candidate,
        role: 'potential' as const,
      }));
      const inactiveLinks = colorLinks.map(link => ({
        ...link,
        active: false,
      }));
      const stateKeys = (states: readonly (readonly CandidateRef[])[]) =>
        new Set(states.flat().map(key));
      const marksEmphasizing = (
        states: readonly (readonly CandidateRef[])[],
        conflictStates: readonly (readonly CandidateRef[])[] = [],
      ) => {
        const activeKeys = stateKeys(states);
        const conflictKeys = stateKeys(conflictStates);
        return colorMarks.map(mark => ({
          ...mark,
          active: activeKeys.has(key(mark)),
          conflict: conflictKeys.has(key(mark)),
        }));
      };
      const retitleLast = (title: string) => {
        const page = pages[pages.length - 1];
        pages[pages.length - 1] = { ...page, title };
      };
      const baseVisual = {
        showColorLegend: true,
        focusCells: sceneCells,
        spotlightCells: sceneCells,
        focusRegions: [] as RegionRef[],
        regionMarks: [] as HintPageVisuals['regionMarks'],
        premiseCandidates: all,
        candidateMarks: potentialMarks,
        colorMarks,
        cellMarks: targetCellMarks,
      };

      add(
        'complexOverview',
        {
          digit: d,
          components: colors.length,
          targets: csName(step.eliminations),
        },
        {
          ...baseVisual,
          links: colorLinks.map(link => ({ ...link, active: true })),
        },
      );
      retitleLast(copy.teaching.complexOverviewTitle);

      add(
        'complexAssume',
        { candidates: csName(path[0].candidates) },
        {
          ...baseVisual,
          colorMarks: marksEmphasizing([path[0].candidates]),
          links: inactiveLinks,
          hypotheticalValues: path[0].candidates.map(candidate => ({
            ...candidate,
            role: 'assumption' as const,
          })),
        },
      );
      retitleLast(copy.teaching.complexAssumeTitle);

      transitions.forEach((transition, index) => {
        const conflictLink: HintLinkMark = {
          from: transition.sourceWitness.cell,
          to: transition.conflictCandidate.cell,
          kind: 'peer',
          conflict: true,
          active: true,
        };
        const focusCells = unique([
          ...targetCells,
          transition.sourceWitness.cell,
          transition.conflictCandidate.cell,
          ...transition.to.map(candidate => candidate.cell),
        ]);
        add(
          'complexPropagation',
          {
            step: index + 1,
            total: transitions.length,
            source: csName([transition.sourceWitness]),
            conflict: csName([transition.conflictCandidate]),
            forced: csName(transition.to),
          },
          {
            ...baseVisual,
            focusCells,
            spotlightCells: focusCells,
            colorMarks: marksEmphasizing([
              transition.from,
              [transition.conflictCandidate],
              transition.to,
            ]),
            links: [...inactiveLinks, conflictLink],
            candidateMarks: [
              ...potentialMarks,
              {
                ...transition.conflictCandidate,
                role: 'excluded' as const,
                exclusionKind: 'explanation' as const,
              },
            ],
            hypotheticalValues: uniqueCandidates([
              transition.sourceWitness,
              ...transition.to,
            ]).map(candidate => ({
              ...candidate,
              role: 'consequence' as const,
            })),
          },
        );
        retitleLast(
          interpolate(copy.teaching.complexPropagationTitle, {
            step: index + 1,
            total: transitions.length,
            from: transition.fromComponent + 1,
            to: transition.toComponent + 1,
          }),
        );
      });

      const startState = path[0].candidates;
      const oppositeState = path[path.length - 1].candidates;
      const contradictionCells = unique([
        ...startState.map(candidate => candidate.cell),
        ...oppositeState.map(candidate => candidate.cell),
      ]);
      add(
        'complexContradiction',
        {
          assumption: csName(startState),
          opposite: csName(oppositeState),
        },
        {
          ...baseVisual,
          focusCells: contradictionCells,
          spotlightCells: contradictionCells,
          colorMarks: marksEmphasizing(
            [startState, oppositeState],
            [startState, oppositeState],
          ),
          links: inactiveLinks,
          hypotheticalValues: [
            ...startState.map(candidate => ({
              ...candidate,
              role: 'assumption' as const,
              conflict: true,
            })),
            ...oppositeState.map(candidate => ({
              ...candidate,
              role: 'consequence' as const,
              conflict: true,
            })),
          ],
        },
      );
      retitleLast(copy.teaching.complexContradictionTitle);

      links = inactiveLinks;
      conclude(
        false,
        interpolate(copy.teaching.complexConclusion, {
          targets: csName(step.eliminations),
        }),
      );
      const conclusion = pages[pages.length - 1];
      pages[pages.length - 1] = {
        ...conclusion,
        title: copy.teaching.complexConclusionTitle,
        visuals: {
          ...conclusion.visuals,
          showColorLegend: true,
          focusCells: targetCells,
          spotlightCells: targetCells,
          colorMarks: marksEmphasizing([startState]),
          cellMarks: targetCellMarks,
          links: inactiveLinks,
        },
      };
      pages[0] = { ...pages[0], title: copy.teaching.complexOverviewTitle };
      return pages;
    }
    for (const [i, component] of colors.entries())
      add(
        'colors',
        { component: i + 1, a: csName(component[0]), b: csName(component[1]) },
        colorVisual,
      );
    if (remote) {
      if (
        colors.length !== 1 ||
        !step.eliminations.every(
          c =>
            ds.includes(c.digit) &&
            colors[0].every(side =>
              side.some(p => teachingPeers(p.cell, c.cell)),
            ),
        )
      )
        return null;
      add('remote', { digits: ds.join(', ') }, colorVisual);
    } else if (teaching.mode === 'color_conflict') {
      if (colors.length !== 1) return null;
      const bad = colors[0].find(side => same(side, step.eliminations));
      const a = bad?.find(c => bad.some(b => conflict(c, b)));
      const b = a && bad?.find(c => conflict(a, c));
      if (!a || !b) return null;
      add(
        'colorConflict',
        { a: csName([a]), b: csName([b]) },
        {
          ...colorVisual,
          hypotheticalValues: [
            { ...a, role: 'assumption', conflict: true },
            { ...b, role: 'consequence', conflict: true },
          ],
        },
      );
    } else if (teaching.mode === 'color_trap') {
      if (
        colors.length !== 1 ||
        !step.eliminations.every(c =>
          colors[0].every(side => side.some(p => conflict(c, p))),
        )
      )
        return null;
      add('colorTrap', {}, colorVisual);
    } else if (teaching.mode === 'multi_color') {
      if (colors.length !== 2) return null;
      let valid = false;
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          const a = colors[0][i].find(c =>
            colors[1][j].some(b => conflict(c, b)),
          );
          const b = a && colors[1][j].find(c => conflict(a, c));
          if (
            a &&
            b &&
            step.eliminations.every(
              c =>
                colors[0][1 - i].some(p => conflict(c, p)) &&
                colors[1][1 - j].some(p => conflict(c, p)),
            )
          ) {
            add('multi', { a: csName([a]), b: csName([b]) }, colorVisual);
            valid = true;
            break;
          }
        }
      if (!valid) return null;
    } else {
      if (colors.length < 3) return null;
      const path = teaching.branches.find(b =>
        b.nodes.every(n => n.rule === 'color_on'),
      )?.nodes;
      if (
        !path ||
        path.length < 4 ||
        !same(path[0].candidates, step.eliminations)
      )
        return null;
      const sides = colors.flat();
      const indices = path.map(n =>
        sides.findIndex(side => same(side, n.candidates)),
      );
      if (
        indices.some(i => i < 0) ||
        (indices[0] % 2 === 0 ? indices[0] + 1 : indices[0] - 1) !==
          indices[indices.length - 1]
      )
        return null;
      add(
        'assume',
        { branch: 1, candidates: csName(path[0].candidates) },
        colorVisual,
      );
      for (let i = 1; i < path.length; i++) {
        const opposite =
          sides[indices[i] % 2 === 0 ? indices[i] + 1 : indices[i] - 1];
        const a = path[i - 1].candidates.find(c =>
          opposite.some(b => conflict(c, b)),
        );
        const b = a && opposite.find(c => conflict(a, c));
        if (
          !a ||
          !b ||
          path[i].parents.length !== 1 ||
          path[i].parents[0] !== i - 1
        )
          return null;
        add(
          'colorPropagation',
          {
            a: csName([a]),
            b: csName([b]),
            candidates: csName(path[i].candidates),
          },
          colorVisual,
        );
      }
      add(
        'opposite',
        {
          assumption: interpolate(copy.teaching.factTrue, {
            candidates: csName(path[0].candidates),
          }),
          result: interpolate(copy.teaching.factFalse, {
            candidates: csName(step.eliminations),
          }),
        },
        colorVisual,
      );
    }
    // Preserve identity and all connecting edges on every page, including withdrawal.
    const result = conclude();
    return result.map(p => ({ ...p, visuals: { ...p.visuals, colorMarks } }));
  }
  if (!['endpoints', 'contradiction', 'common'].includes(teaching.mode))
    return null;
  const branches = teaching.branches;
  if (
    !branches.every(
      b =>
        b.nodes.length > 0 &&
        b.nodes.every(n => n.candidates.length > 0 && n.candidates.every(has)),
    )
  )
    return null;
  premises = Array.from(
    new Map(
      [
        ...premises,
        ...branches.flatMap(b => b.nodes.flatMap(n => n.candidates)),
      ].map(c => [key(c), c]),
    ).values(),
  );
  background = unique([...background, ...premises.map(c => c.cell)]);
  const groupMarks = Array.from(
    new Map(
      branches
        .flatMap(branch => branch.nodes)
        .filter(n => n.candidates.length > 1 && n.rule !== 'conflict')
        .map(node => [
          node.candidates
            .map(candidate => key(candidate))
            .sort()
            .join('|'),
          node.candidates,
        ]),
    ).values(),
  ).map((candidates, index) => ({ id: index + 1, candidates }));
  const groupedStrongRegions: RegionRef[] = [];
  if (code === 'groupedAic') {
    const groupedDigits = unique(
      branches.flatMap(branch =>
        branch.nodes.flatMap(node => node.candidates.map(c => c.digit)),
      ),
    );
    if (groupedDigits.length !== 1) return null;
    diagramDigit = groupedDigits[0];
    const strongRegions = new Map<string, RegionRef>();
    for (const branch of branches)
      for (const node of branch.nodes) {
        if (node.rule !== 'strong' || node.parents.length !== 1) continue;
        const parent = branch.nodes[node.parents[0]];
        const region = parent
          ? strongRegionRef(parent.candidates, node.candidates)
          : null;
        if (region) strongRegions.set(`${region.kind}:${region.index}`, region);
      }
    groupedStrongRegions.push(...strongRegions.values());
    if (!groupedStrongRegions.length) return null;
    regions = groupedStrongRegions;
    background = unique([
      ...background,
      ...groupedStrongRegions.flatMap(teachingCellsIn),
    ]);
    diagramRegions = groupedStrongRegions.map(region => ({
      region,
      conflict: false,
    }));
  } else if (code === 'aic' || code === 'forcingChain') {
    const chainRegions = new Map<string, RegionRef>();
    for (const branch of branches)
      for (const node of branch.nodes) {
        if (
          !['strong', 'weak'].includes(node.rule) ||
          node.parents.length !== 1
        )
          continue;
        const parent = branch.nodes[node.parents[0]];
        const both = parent ? [...parent.candidates, ...node.candidates] : [];
        const region =
          node.rule === 'strong'
            ? strongRegionRef(parent.candidates, node.candidates)
            : both.length > 0 &&
              both.every(c => c.digit === both[0].digit) &&
              !both.every(c => c.cell === both[0].cell)
            ? commonRegions(both.map(c => c.cell))[0] ?? null
            : null;
        if (region) chainRegions.set(`${region.kind}:${region.index}`, region);
      }
    regions = [...chainRegions.values()];
    background = unique([...background, ...regions.flatMap(teachingCellsIn)]);
    diagramRegions = regions.map(region => ({ region, conflict: false }));
  }
  if (groupMarks.length) {
    for (const region of groupedStrongRegions)
      add(
        'positions',
        {
          regions: regionName(region),
          digits: diagramDigit!,
          cells: cellsName(
            positions(region, diagramDigit!).map(candidate => candidate.cell),
          ),
        },
        {
          candidateGroups: groupMarks,
          diagramRegions: [{ region, conflict: false }],
          focusRegions: [region],
          regionMarks: [{ region, role: 'source' }],
          spotlightCells: teachingCellsIn(region),
        },
      );
    if (!groupedStrongRegions.length)
      add('groups', {}, { candidateGroups: groupMarks });
  } else if (code === 'forcingChain')
    add('forcingChainSnapshot', {
      candidates: csName(branches[0].nodes[0].candidates),
      targets: csName(
        step.placements.length ? step.placements : step.eliminations,
      ),
    });
  else
    add(code === 'aic' ? 'aicSnapshot' : 'snapshot', {
      regions: regionsName(regions),
    });
  let aicContradictionVisual: Partial<HintPageVisuals> | undefined;
  let aicContradictionConcluded = false;
  let endpointResultOverride: string | undefined;
  for (const [branchIndex, branch] of branches.entries()) {
    const nodes = branch.nodes;
    const trueFacts: CandidateRef[] = [];
    const falseFacts: CandidateRef[] = [];
    const first = nodes[0];
    if (first.rule !== 'assume' || first.parents.length) return null;
    for (let index = 0; index < nodes.length; ) {
      const node = nodes[index];
      if (!node.parents.every(p => Number.isInteger(p) && p >= 0 && p < index))
        return null;
      const batchedNodes = [node];
      if (node.rule === 'weak') {
        while (index + batchedNodes.length < nodes.length) {
          const nextIndex = index + batchedNodes.length;
          const next = nodes[nextIndex];
          if (
            next.rule !== 'weak' ||
            next.truth ||
            !sameIndexes(next.parents, node.parents)
          )
            break;
          if (
            !next.parents.every(
              p => Number.isInteger(p) && p >= 0 && p < nextIndex,
            )
          )
            return null;
          batchedNodes.push(next);
        }
      }
      const parents = node.parents.map(p => nodes[p]);
      const falseFromParents = parents
        .filter(n => !n.truth)
        .flatMap(n => n.candidates);
      const current = batchedNodes.flatMap(n => n.candidates);
      let rule: keyof TeachingCopy;
      let region = '';
      if (index === 0) rule = node.truth ? 'assume' : 'assumeFalse';
      else if (node.rule === 'weak') {
        if (
          node.truth ||
          parents.length !== 1 ||
          !parents[0].truth ||
          !parents[0].candidates.every(a => current.every(b => conflict(a, b)))
        )
          return null;
        const weakRegion =
          code === 'forcingChain' &&
          [...parents[0].candidates, ...current].every(
            candidate => candidate.digit === current[0].digit,
          )
            ? commonRegions(
                [...parents[0].candidates, ...current].map(
                  candidate => candidate.cell,
                ),
              )[0] ?? null
            : null;
        region = weakRegion ? regionName(weakRegion) : '';
        rule = weakRegion ? 'forcingChainWeak' : 'weak';
      } else if (node.rule === 'strong') {
        if (!node.truth || parents.length !== 1 || parents[0].truth)
          return null;
        const r = strongRegion(parents[0].candidates, current);
        if (!r) return null;
        region = r;
        rule = [...parents[0].candidates, ...current].every(
          candidate => candidate.cell === current[0].cell,
        )
          ? 'cellStrong'
          : 'strong';
      } else if (node.rule === 'cell_single' || node.rule === 'region_single') {
        if (!node.truth || current.length !== 1) return null;
        const c = current[0];
        const options =
          node.rule === 'cell_single'
            ? at([c.cell])
            : node.regions.length === 1
            ? positions(node.regions[0], c.digit)
            : [];
        if (
          !options.some(option => key(option) === key(c)) ||
          !options.every(
            a =>
              key(a) === key(c) ||
              falseFromParents.some(b => key(a) === key(b)),
          )
        )
          return null;
        region =
          node.rule === 'cell_single'
            ? cellName(c.cell)
            : regionsName(node.regions);
        rule = 'single';
      } else if (node.rule === 'conflict') {
        if (
          node.truth ||
          !current.every(c => falseFromParents.some(f => key(c) === key(f)))
        )
          return null;
        if (node.regions.length === 1) {
          if (!same(positions(node.regions[0], current[0].digit), current))
            return null;
          region = regionsName(node.regions);
        } else {
          if (
            !current.every(c => c.cell === current[0].cell) ||
            !same(at([current[0].cell]), current)
          )
            return null;
          region = cellName(current[0].cell);
        }
        rule = 'conflict';
      } else return null;
      const priorLinkCount = links.length;
      if (index > 0)
        for (const parent of parents)
          for (const a of parent.candidates)
            for (const b of current) {
              if (
                a.cell !== b.cell &&
                (node.rule === 'weak' || node.rule === 'strong')
              )
                links.push({
                  from: a.cell,
                  to: b.cell,
                  kind: node.rule === 'strong' ? 'pair' : 'peer',
                  active: true,
                });
            }
      if (node.rule !== 'conflict')
        (node.truth ? trueFacts : falseFacts).push(...current);
      const implicitCellExclusion =
        node.rule === 'weak' &&
        parents.length === 1 &&
        parents[0].candidates.every(a => current.every(b => a.cell === b.cell));
      if (implicitCellExclusion) {
        index += batchedNodes.length;
        continue;
      }
      const pendingAicClosingConflict =
        code === 'aic' &&
        teaching.mode === 'contradiction' &&
        first.truth &&
        index + 1 === nodes.length - 1 &&
        node.truth &&
        nodes[index + 1].rule === 'weak' &&
        !nodes[index + 1].truth &&
        same(nodes[index + 1].candidates, first.candidates) &&
        sameIndexes(nodes[index + 1].parents, [index]);
      if (pendingAicClosingConflict) {
        index += batchedNodes.length;
        continue;
      }
      const closesAicContradiction =
        code === 'aic' &&
        teaching.mode === 'contradiction' &&
        index === nodes.length - 1 &&
        node.rule === 'weak' &&
        first.truth &&
        !node.truth &&
        same(current, first.candidates) &&
        parents.length === 1;
      if (closesAicContradiction) {
        const pair = [
          ...first.candidates,
          ...parents[0].candidates.filter(candidate =>
            first.candidates.every(assumption =>
              conflict(assumption, candidate),
            ),
          ),
        ];
        const conflictRegion =
          pair.length === 2 && pair[0].digit === pair[1].digit
            ? commonRegions(pair.map(candidate => candidate.cell))[0] ?? null
            : null;
        if (conflictRegion) {
          aicContradictionVisual = {
            diagramRegions: [{ region: conflictRegion, conflict: true }],
            focusRegions: [conflictRegion],
            hypotheticalValues: pair.map((candidate, pairIndex) => ({
              ...candidate,
              role: pairIndex === 0 ? 'assumption' : 'consequence',
              conflict: true,
              conflictRegion: regionName(conflictRegion),
            })),
            links: links.map((link, linkIndex) => ({
              ...link,
              active: linkIndex >= priorLinkCount,
              conflict: linkIndex >= priorLinkCount,
            })),
            spotlightCells: unique([
              ...teachingCellsIn(conflictRegion),
              ...pair.map(candidate => candidate.cell),
            ]),
          };
        }
      }
      const closesReverseAicContradiction =
        code === 'aic' &&
        teaching.mode === 'contradiction' &&
        index === nodes.length - 1 &&
        node.rule === 'strong' &&
        !first.truth &&
        node.truth &&
        same(current, first.candidates) &&
        parents.length === 1;
      if (closesReverseAicContradiction) {
        const conflictRegion = strongRegionRef(parents[0].candidates, current);
        if (conflictRegion) {
          const conflictCells = new Set([
            ...first.candidates.map(candidate => candidate.cell),
            ...parents[0].candidates.map(candidate => candidate.cell),
          ]);
          aicContradictionVisual = {
            diagramRegions: [{ region: conflictRegion, conflict: true }],
            focusRegions: [conflictRegion],
            hypotheticalValues: trueFacts.map(candidate => ({
              ...candidate,
              role:
                first.truth &&
                first.candidates.length === 1 &&
                key(first.candidates[0]) === key(candidate)
                  ? 'assumption'
                  : 'consequence',
              conflict: conflictCells.has(candidate.cell),
              conflictRegion: conflictCells.has(candidate.cell)
                ? regionName(conflictRegion)
                : undefined,
            })),
            links: links.map((link, linkIndex) => ({
              ...link,
              active: linkIndex >= priorLinkCount,
              conflict: linkIndex >= priorLinkCount,
            })),
            spotlightCells: unique([
              ...teachingCellsIn(conflictRegion),
              ...conflictCells,
            ]),
          };
        }
      }
      const compactXYEndpoints =
        code === 'xyChain' && teaching.mode === 'endpoints';
      const compactGroupedEndpoints =
        code === 'groupedAic' && teaching.mode === 'endpoints';
      const reachesXChainEndpoint =
        code === 'xChain' &&
        teaching.mode === 'endpoints' &&
        index === nodes.length - 1 &&
        node.truth;
      const reachesXYChainEndpoint =
        compactXYEndpoints && index === nodes.length - 1 && node.truth;
      const closesAnyAicContradiction =
        closesAicContradiction || closesReverseAicContradiction;
      if (reachesXChainEndpoint) rule = 'xChainIndirect';
      if (compactXYEndpoints && node.rule === 'weak')
        rule = index === 2 ? 'xyChainStart' : 'xyChainHop';
      if (reachesXYChainEndpoint) rule = 'xyChainEnd';
      if (compactGroupedEndpoints && node.rule === 'strong')
        rule =
          index === 1
            ? 'groupedAicStart'
            : index === nodes.length - 1
            ? 'groupedAicEnd'
            : 'groupedAicStrong';
      if (compactGroupedEndpoints && node.rule === 'weak')
        rule = 'groupedAicWeak';
      if (closesAnyAicContradiction) {
        rule = 'aicContradictionResult';
        aicContradictionConcluded = true;
      }
      if (
        (compactXYEndpoints &&
          (index === 0 ||
            (node.rule === 'strong' && !reachesXYChainEndpoint))) ||
        (compactGroupedEndpoints && index === 0)
      ) {
        index += batchedNodes.length;
        continue;
      }
      const xySelected =
        compactXYEndpoints && node.rule === 'weak'
          ? parents.flatMap(parent => parent.candidates)
          : [];
      const groupedSelected =
        compactGroupedEndpoints && node.rule === 'weak'
          ? parents.flatMap(parent => parent.candidates)
          : [];
      const xyPeerEliminations = xySelected.length
        ? [...premises, ...step.eliminations].filter(candidate =>
            xySelected.every(selected => conflict(selected, candidate)),
          )
        : [];
      const displayedEliminations =
        reachesXChainEndpoint ||
        reachesXYChainEndpoint ||
        (compactGroupedEndpoints && index === nodes.length - 1)
          ? [...falseFacts, ...step.eliminations]
          : Array.from(
              new Map(
                [...falseFacts, ...xyPeerEliminations].map(candidate => [
                  key(candidate),
                  candidate,
                ]),
              ).values(),
            );
      add(
        rule,
        {
          branch: branchIndex + 1,
          from: csName(parents.flatMap(n => n.candidates)),
          candidates:
            current.length > 1 ? `{${csName(current)}}` : csName(current),
          regions: region,
          targets: csName(step.eliminations),
          selected: xySelected.length
            ? csName(xySelected)
            : groupedSelected.length
            ? `{${csName(groupedSelected)}}`
            : current.length > 1
            ? `{${csName(current)}}`
            : csName(current),
          crossed: csName(current),
          assumption: interpolate(
            first.truth ? copy.teaching.factTrue : copy.teaching.factFalse,
            { candidates: csName(first.candidates) },
          ),
          result: interpolate(
            first.truth ? copy.teaching.factFalse : copy.teaching.factTrue,
            { candidates: csName(first.candidates) },
          ),
        },
        {
          links: links.map((link, i) => ({
            ...link,
            active: i >= priorLinkCount,
          })),
          candidateGroups: groupMarks,
          hypotheticalValues: trueFacts
            .filter(c =>
              nodes.some(
                n =>
                  n.truth &&
                  n.candidates.length === 1 &&
                  key(n.candidates[0]) === key(c),
              ),
            )
            .map(c => ({
              ...c,
              role:
                first.truth &&
                first.candidates.length === 1 &&
                key(first.candidates[0]) === key(c)
                  ? 'assumption'
                  : 'consequence',
              conflict: node.rule === 'conflict',
            })),
          questionCells: first.candidates.map(c => c.cell),
          eliminations: displayedEliminations,
          showEliminations: !!displayedEliminations.length,
          candidateMarks: [
            ...premises.map(c => ({ ...c, role: 'potential' as const })),
            ...displayedEliminations.map(c => ({
              ...c,
              role: 'excluded' as const,
              exclusionKind: 'explanation' as const,
            })),
          ],
          ...(aicContradictionVisual ?? {}),
        },
      );
      index += batchedNodes.length;
    }
    const hasNextRecordedBranch = branchIndex < branches.length - 1;
    const hasComplementaryEndpointCase =
      teaching.mode === 'endpoints' &&
      (code === 'xChain' || code === 'xyChain' || code === 'groupedAic');
    if (hasNextRecordedBranch || hasComplementaryEndpointCase) reset();
  }
  const first = branches[0].nodes[0];
  const last = (nodes: readonly TeachingNode[]) => nodes[nodes.length - 1];
  if (teaching.mode === 'endpoints') {
    const end = last(branches[0].nodes);
    if (
      branches.length !== 1 ||
      first.truth ||
      !end.truth ||
      !step.eliminations.length ||
      !step.eliminations.every(c =>
        [...first.candidates, ...end.candidates].every(p => conflict(c, p)),
      )
    )
      return null;
    if (code === 'xChain') {
      add(
        'xChainDirect',
        {
          selected: csName(first.candidates),
          targets: csName(step.eliminations),
        },
        {
          hypotheticalValues: first.candidates.map(candidate => ({
            ...candidate,
            role: 'assumption' as const,
          })),
          questionCells: first.candidates.map(candidate => candidate.cell),
          eliminations: step.eliminations,
          showEliminations: true,
          candidateMarks: [
            ...premises.map(candidate => ({
              ...candidate,
              role: 'potential' as const,
            })),
            ...step.eliminations.map(candidate => ({
              ...candidate,
              role: 'excluded' as const,
              exclusionKind: 'explanation' as const,
            })),
          ],
        },
      );
      endpointResultOverride = interpolate(copy.teaching.xChainResult, {
        targets: csName(step.eliminations),
      });
    } else if (code === 'xyChain') {
      const directEliminations = Array.from(
        new Map(
          [
            ...premises.filter(candidate =>
              first.candidates.every(selected => conflict(selected, candidate)),
            ),
            ...step.eliminations,
          ].map(candidate => [key(candidate), candidate]),
        ).values(),
      );
      add(
        'xyChainDirect',
        {
          selected: csName(first.candidates),
          crossed: csName(directEliminations),
        },
        {
          hypotheticalValues: first.candidates.map(candidate => ({
            ...candidate,
            role: 'assumption' as const,
          })),
          questionCells: first.candidates.map(candidate => candidate.cell),
          eliminations: directEliminations,
          showEliminations: true,
          candidateMarks: [
            ...premises.map(candidate => ({
              ...candidate,
              role: 'potential' as const,
            })),
            ...directEliminations.map(candidate => ({
              ...candidate,
              role: 'excluded' as const,
              exclusionKind: 'explanation' as const,
            })),
          ],
        },
      );
      endpointResultOverride = interpolate(copy.teaching.xyChainResult, {
        targets: csName(step.eliminations),
      });
    } else if (code === 'groupedAic') {
      const directEliminations = Array.from(
        new Map(
          [
            ...premises.filter(candidate =>
              first.candidates.every(selected => conflict(selected, candidate)),
            ),
            ...step.eliminations,
          ].map(candidate => [key(candidate), candidate]),
        ).values(),
      );
      add(
        'groupedAicDirect',
        {
          selected: `{${csName(first.candidates)}}`,
          targets: csName(step.eliminations),
        },
        {
          candidateGroups: groupMarks,
          questionCells: first.candidates.map(candidate => candidate.cell),
          eliminations: directEliminations,
          showEliminations: true,
          candidateMarks: [
            ...premises.map(candidate => ({
              ...candidate,
              role: 'potential' as const,
            })),
            ...directEliminations.map(candidate => ({
              ...candidate,
              role: 'excluded' as const,
              exclusionKind: 'explanation' as const,
            })),
          ],
        },
      );
      endpointResultOverride = interpolate(copy.teaching.groupedAicResult, {
        targets: csName(step.eliminations),
      });
    } else add('endpoints');
  } else if (teaching.mode === 'contradiction') {
    const end = last(branches[0].nodes);
    if (
      branches.length !== 1 ||
      first.candidates.length !== 1 ||
      !(
        end.rule === 'conflict' ||
        (end.truth !== first.truth && same(end.candidates, first.candidates))
      )
    )
      return null;
    if (
      first.truth
        ? !same(step.eliminations, first.candidates)
        : !same(step.placements, first.candidates)
    )
      return null;
    if (!aicContradictionConcluded)
      add(
        'opposite',
        {
          assumption: interpolate(
            first.truth ? copy.teaching.factTrue : copy.teaching.factFalse,
            { candidates: csName(first.candidates) },
          ),
          result: interpolate(
            first.truth ? copy.teaching.factFalse : copy.teaching.factTrue,
            { candidates: csName(first.candidates) },
          ),
        },
        aicContradictionVisual,
      );
  } else {
    const assumptions = branches.map(b => b.nodes[0]);
    const binary =
      assumptions.length === 2 &&
      assumptions[0].truth !== assumptions[1].truth &&
      same(assumptions[0].candidates, assumptions[1].candidates) &&
      assumptions[0].candidates.length === 1;
    const allAssumptions = assumptions.flatMap(n => n.candidates);
    const exhaustive =
      assumptions.every(n => n.truth && n.candidates.length === 1) &&
      (same(at([allAssumptions[0].cell]), allAssumptions) ||
        allRegions.some(r =>
          same(positions(r, allAssumptions[0].digit), allAssumptions),
        ));
    if (!binary && !exhaustive) return null;
    const result = step.placements.length ? step.placements : step.eliminations;
    if (
      !branches.every(
        b =>
          last(b.nodes).truth === !!step.placements.length &&
          same(last(b.nodes).candidates, result),
      )
    )
      return null;
    add(
      'common',
      {
        candidates: interpolate(
          step.placements.length
            ? copy.teaching.factTrue
            : copy.teaching.factFalse,
          { candidates: csName(result) },
        ),
      },
      code === 'forcingChain'
        ? {
            eliminations: step.eliminations,
            placements: step.placements,
            showEliminations: step.eliminations.length > 0,
            showPlacements: step.placements.length > 0,
            candidateMarks: [
              ...premises.map(candidate => ({
                ...candidate,
                role: 'potential' as const,
              })),
              ...step.eliminations.map(candidate => ({
                ...candidate,
                role: 'excluded' as const,
                exclusionKind: 'explanation' as const,
              })),
            ],
          }
        : {},
    );
  }
  const result = conclude(
    teaching.mode !== 'contradiction' && !endpointResultOverride,
    endpointResultOverride,
  );
  // Every page retains the full spatial graph, with current links emphasized.
  const stable = unique(links.map(l => `${l.from}:${l.to}:${l.kind}`)).map(
    k => links.find(l => `${l.from}:${l.to}:${l.kind}` === k)!,
  );
  return result.map(p => ({
    ...p,
    visuals: {
      ...p.visuals,
      candidateGroups: groupMarks,
      links: stable.map(l => {
        const pageLink = p.visuals.links?.find(
          candidate =>
            candidate.from === l.from &&
            candidate.to === l.to &&
            candidate.kind === l.kind,
        );
        return {
          ...l,
          active: pageLink?.active ?? false,
          conflict: pageLink?.conflict,
        };
      }),
    },
  }));
}
