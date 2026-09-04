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
const unique = <T>(a: readonly T[]) => [...new Set(a)];
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
  let diagramDigit: Digit | undefined;
  let diagramEmptyCells: readonly number[] | undefined;
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
  const conclude = () => {
    if (pages[pages.length - 1]?.visuals.hypotheticalValues?.length) reset();
    const result = step.placements.length
      ? interpolate(copy.resultPlacement, {
          placements: csName(step.placements),
        })
      : interpolate(copy.resultElimination, {
          eliminations: csName(step.eliminations),
        });
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
  const assume = (c: CandidateRef, branch: number) =>
    add(
      'assume',
      { candidates: csName([c]), branch },
      {
        hypotheticalValues: [{ ...c, role: 'assumption' }],
        questionCells: [c.cell],
      },
    );

  if (['fullHouse', 'nakedSingle', 'hiddenSingle'].includes(code)) {
    const target = step.placements[0];
    if (!target || step.placements.length !== 1) return null;
    if (code === 'nakedSingle') {
      if (digits(grid[target.cell]).length !== 1) return null;
      regions = [];
      add('cell', { cells: cellName(target.cell), digits: target.digit });
    } else {
      const region = step.focusRegions.find(
        r =>
          teachingCellsIn(r).includes(target.cell) &&
          same(positions(r, target.digit), [target]),
      );
      if (!region) return null;
      regions = [region];
      if (code === 'fullHouse') {
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
          { cellMarks: [{ cell, role: 'established' }] },
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
      ...bases.map(region => ({ region, role: 'source' as const })),
      ...covers.map(region => ({ region, role: 'affected' as const })),
    ];
    for (const r of bases)
      add(
        'positions',
        {
          regions: regionName(r),
          digits: targetDigit,
          cells: cellsName(positions(r, targetDigit).map(c => c.cell)),
        },
        {
          regionMarks: bases
            .map(region => ({
              region,
              role: 'source' as 'source' | 'affected',
            }))
            .concat(
              covers.map(region => ({ region, role: 'affected' as const })),
            ),
        },
      );
    add('fish', {
      count: n,
      digits: targetDigit,
      source: regionsName(bases),
      cover: regionsName(covers),
    });
    return conclude();
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
    links = wings.map(w => ({ from: pivot, to: w, kind: 'peer' }));
    add('wing', {
      cells: cellName(pivot),
      digits: pivotDigits.join(', '),
      wings: cellsName(wings),
    });
    for (const [i, d] of pivotDigits.entries()) {
      const a = { cell: pivot, digit: d };
      assume(a, i + 1);
      if (d !== targetDigit) {
        const w = wings[outer.indexOf(d)];
        const excluded = { cell: w, digit: d };
        add(
          'weak',
          { from: csName([a]), candidates: csName([excluded]) },
          {
            hypotheticalValues: [{ ...a, role: 'assumption' }],
            eliminations: [excluded],
            showEliminations: true,
            candidateMarks: [
              { ...excluded, role: 'excluded', exclusionKind: 'explanation' },
            ],
          },
        );
        add(
          'single',
          {
            regions: cellName(w),
            candidates: csName([{ cell: w, digit: targetDigit }]),
          },
          {
            hypotheticalValues: [
              { ...a, role: 'assumption' },
              { cell: w, digit: targetDigit, role: 'consequence' },
            ],
          },
        );
      }
      reset();
    }
    add('wingResult', {
      digits: targetDigit,
      cells: cellsName(xyz ? focus : wings),
    });
    return conclude();
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
        const finCandidates = positions(finBase, targetDigit);
        const fins = finCandidates.filter(c =>
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
        if (
          !step.eliminations.every(
            c =>
              c.digit === targetDigit &&
              box(c.cell) === finBox &&
              !focus.includes(c.cell) &&
              covers.some(r => teachingCellsIn(r).includes(c.cell)) &&
              (code !== 'sashimiXWing' ||
                finCandidates.some(f =>
                  kind === 'row'
                    ? f.cell % 9 === c.cell % 9
                    : Math.floor(f.cell / 9) === Math.floor(c.cell / 9),
                )),
          )
        )
          continue;
        regions = [...bases, ...covers, { kind: 'box', index: finBox! }];
        background = unique([...background, ...missing]);
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
        for (const r of bases)
          add('positions', {
            regions: regionName(r),
            digits: targetDigit,
            cells: cellsName(positions(r, targetDigit).map(c => c.cell)),
          });
        add('finTrue', { digits: targetDigit });
        reset();
        add(
          'finFalse',
          { digits: targetDigit },
          {
            eliminations: fins,
            showEliminations: true,
            candidateMarks: fins.map(c => ({
              ...c,
              role: 'excluded',
              exclusionKind: 'explanation',
            })),
          },
        );
        return conclude();
      }
    }
    return null;
  }
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
    if (both.length && both.every(c => c.digit === both[0].digit)) {
      const r = commonRegions(both.map(c => c.cell)).find(unit =>
        same(positions(unit, both[0].digit), both),
      );
      if (r) return regionName(r);
    }
    return null;
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
        links = [
          { from: a, to: pair[0].cell, kind: 'peer' },
          { from: pair[0].cell, to: pair[1].cell, kind: 'pair' },
          { from: pair[1].cell, to: b, kind: 'peer' },
        ];
        add('cell', {
          cells: cellsName([a, b]),
          digits: digits(grid[a]).join(', '),
        });
        add('positions', {
          regions: strongRegion([pair[0]], [pair[1]])!,
          digits: d,
          cells: cellsName(pair.map(c => c.cell)),
        });
        add(
          'wWing',
          {
            cells: cellsName([a, b]),
            digits: digits(grid[a]).join(', '),
            candidates: csName(pair),
          },
          {
            hypotheticalValues: [
              { cell: a, digit: d, role: 'assumption' },
              { cell: b, digit: d, role: 'assumption' },
            ],
            eliminations: pair,
            showEliminations: true,
          },
        );
        add('wingResult', { digits: targetDigit, cells: cellsName([a, b]) });
        return conclude();
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
        { candidates: csName(path[path.length - 1].candidates) },
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
  const groupMarks = branches[0].nodes
    .filter(n => n.candidates.length > 1 && n.rule !== 'conflict')
    .map((n, index) => ({ id: index + 1, candidates: n.candidates }));
  if (groupMarks.length) add('groups', {}, { candidateGroups: groupMarks });
  else add('snapshot');
  for (const [branchIndex, branch] of branches.entries()) {
    const nodes = branch.nodes;
    const trueFacts: CandidateRef[] = [];
    const falseFacts: CandidateRef[] = [];
    const first = nodes[0];
    if (first.rule !== 'assume' || first.parents.length) return null;
    for (const [index, node] of nodes.entries()) {
      if (!node.parents.every(p => Number.isInteger(p) && p >= 0 && p < index))
        return null;
      const parents = node.parents.map(p => nodes[p]);
      const falseFromParents = parents
        .filter(n => !n.truth)
        .flatMap(n => n.candidates);
      const current = node.candidates;
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
        rule = 'weak';
      } else if (node.rule === 'strong') {
        if (!node.truth || parents.length !== 1 || parents[0].truth)
          return null;
        const r = strongRegion(parents[0].candidates, current);
        if (!r) return null;
        region = r;
        rule = 'strong';
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
      add(
        rule,
        {
          branch: branchIndex + 1,
          from: csName(parents.flatMap(n => n.candidates)),
          candidates:
            current.length > 1 ? `{${csName(current)}}` : csName(current),
          regions: region,
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
          eliminations: [...falseFacts],
          showEliminations: !!falseFacts.length,
          candidateMarks: [
            ...premises.map(c => ({ ...c, role: 'potential' as const })),
            ...falseFacts.map(c => ({
              ...c,
              role: 'excluded' as const,
              exclusionKind: 'explanation' as const,
            })),
          ],
        },
      );
    }
    reset();
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
    add('endpoints');
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
    add('opposite', {
      candidates: interpolate(
        first.truth ? copy.teaching.factFalse : copy.teaching.factTrue,
        { candidates: csName(first.candidates) },
      ),
    });
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
    add('common', {
      candidates: interpolate(
        step.placements.length
          ? copy.teaching.factTrue
          : copy.teaching.factFalse,
        { candidates: csName(result) },
      ),
    });
  }
  const result = conclude();
  // Every page retains the full spatial graph, with current links emphasized.
  const stable = unique(links.map(l => `${l.from}:${l.to}:${l.kind}`)).map(
    k => links.find(l => `${l.from}:${l.to}:${l.kind}` === k)!,
  );
  return result.map(p => ({
    ...p,
    visuals: {
      ...p.visuals,
      candidateGroups: groupMarks,
      links: stable.map(l => ({
        ...l,
        active: p.visuals.links?.some(
          a => a.from === l.from && a.to === l.to && a.active,
        ),
      })),
    },
  }));
}
