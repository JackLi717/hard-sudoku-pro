import { HintStep } from './contracts';
import {
  CandidateGrid,
  CellIndex,
  Digit,
  RegionRef,
} from '../sudoku/contracts';
import {
  arePeers,
  boardFromFingerprint,
  createSolverCandidates,
  hasCandidate,
  intersectCandidateMasks,
} from '../sudoku/board';

export function inTurbotRegion(cell: CellIndex, region: RegionRef): boolean {
  return (
    (region.kind === 'row'
      ? Math.floor(cell / 9)
      : region.kind === 'column'
      ? cell % 9
      : Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3)) === region.index
  );
}
export function turbotRegions(cell: CellIndex): RegionRef[] {
  return [
    {
      kind: 'box',
      index: Math.floor(cell / 27) * 3 + Math.floor((cell % 9) / 3),
    },
    { kind: 'row', index: Math.floor(cell / 9) },
    { kind: 'column', index: cell % 9 },
  ];
}
export type TurbotFishProof = {
  digit: Digit;
  firstEnd: CellIndex;
  firstInner: CellIndex;
  secondInner: CellIndex;
  secondEnd: CellIndex;
  firstRegion: RegionRef;
  secondRegion: RegionRef;
  conflictRegion: RegionRef;
};

/** Validate two exact candidate pairs against the supplied pre-hint snapshot.
 * Presentation only: no search for new eliminations and no board mutation. */
export function turbotFishProof(
  step: HintStep,
  supplied?: CandidateGrid | null,
): TurbotFishProof | null {
  return linkedPairProof(step, supplied, false);
}

export function skyscraperProof(
  step: HintStep,
  supplied?: CandidateGrid | null,
): TurbotFishProof | null {
  return linkedPairProof(step, supplied, true);
}

function linkedPairProof(
  step: HintStep,
  supplied: CandidateGrid | null | undefined,
  skyscraper: boolean,
): TurbotFishProof | null {
  if (
    step.techniqueCode !== (skyscraper ? 'skyscraper' : 'turbotFish') ||
    !step.eliminations.length ||
    step.placements.length
  )
    return null;
  const digit = step.eliminations[0].digit;
  const refs = [...step.premiseCandidates, ...step.eliminations];
  const cells = [...new Set(step.premiseCandidates.map(c => c.cell))].sort(
    (a, b) => a - b,
  );
  if (cells.length !== 4 || refs.some(c => c.digit !== digit)) return null;
  const board = boardFromFingerprint(step.boardFingerprint);
  const legal = createSolverCandidates(board);
  const candidates = supplied ?? legal;
  if (
    candidates.length !== 81 ||
    candidates.some(
      (mask, cell) =>
        !Number.isInteger(mask) ||
        mask < 0 ||
        mask > 511 ||
        intersectCandidateMasks(mask, legal[cell]) !== mask,
    )
  )
    return null;
  if (
    refs.some(
      c => board[c.cell] !== null || !hasCandidate(candidates[c.cell], digit),
    )
  )
    return null;
  const pairRegions = (a: CellIndex, b: CellIndex) =>
    turbotRegions(a).filter(
      region =>
        inTurbotRegion(b, region) &&
        candidates.filter(
          (mask, cell) =>
            inTurbotRegion(cell, region) && hasCandidate(mask, digit),
        ).length === 2,
    );
  for (const firstEnd of cells)
    for (const firstInner of cells) {
      if (firstEnd === firstInner) continue;
      for (const firstRegion of pairRegions(firstEnd, firstInner)) {
        if (skyscraper && firstRegion.kind === 'box') continue;
        for (const secondEnd of cells.filter(
          c => c !== firstEnd && c !== firstInner,
        )) {
          const secondInner = cells.find(
            c => c !== firstEnd && c !== firstInner && c !== secondEnd,
          )!;
          if (
            !arePeers(firstInner, secondInner) ||
            (!skyscraper && arePeers(firstEnd, secondEnd)) ||
            (skyscraper &&
              (firstRegion.kind === 'column'
                ? Math.floor(firstEnd / 9) === Math.floor(secondEnd / 9)
                : firstEnd % 9 === secondEnd % 9))
          )
            continue;
          if (
            !step.eliminations.every(
              c =>
                !cells.includes(c.cell) &&
                arePeers(c.cell, firstEnd) &&
                arePeers(c.cell, secondEnd),
            )
          )
            continue;
          const secondRegion = pairRegions(secondEnd, secondInner).find(
            region =>
              !skyscraper ||
              (region.kind === firstRegion.kind &&
                region.index > firstRegion.index),
          );
          if (!secondRegion) continue;
          const conflictRegion = turbotRegions(firstInner).find(
            region =>
              inTurbotRegion(secondInner, region) &&
              (!skyscraper ||
                region.kind ===
                  (firstRegion.kind === 'column' ? 'row' : 'column')),
          );
          if (!conflictRegion) continue;
          return {
            digit,
            firstEnd,
            firstInner,
            secondInner,
            secondEnd,
            firstRegion,
            secondRegion,
            conflictRegion,
          };
        }
      }
    }
  return null;
}
