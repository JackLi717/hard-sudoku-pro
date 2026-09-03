// Test-only exhaustive oracle. Keep this independent of the production caches
// and region-counting optimization so recognition inputs can be compared exactly.
import { GameSession } from '../../src/domain/game/contracts';
import { HintStep } from '../../src/domain/hints/contracts';
import {
  boardFromFingerprint,
  boxOf,
  columnOf,
  createSolverCandidates,
  digitsFromMask,
  hasCandidate,
  intersectCandidateMasks,
  removeCandidate,
  rowOf,
} from '../../src/domain/sudoku/board';
import { Board, CandidateGrid } from '../../src/domain/sudoku/contracts';
import {
  HintAssistanceSource,
  NormalizedPlayerEffect,
} from '../../src/domain/technique-recognition/contracts';

export function sameEffect(
  left: NormalizedPlayerEffect,
  right: NormalizedPlayerEffect,
): boolean {
  return (
    left.kind === right.kind &&
    left.cell === right.cell &&
    left.digit === right.digit
  );
}

function extendsBoard(board: Board, fingerprint: string): boolean {
  return [...fingerprint].every(
    (digit, cell) => digit === '0' || board[cell] === Number(digit),
  );
}

// Only direct singles are used to delimit assistance, never a recursive solver.
function singles(candidates: CandidateGrid): NormalizedPlayerEffect[] {
  return candidates.flatMap((mask, cell) =>
    digitsFromMask(mask)
      .filter(
        digit =>
          digitsFromMask(mask).length === 1 ||
          [rowOf, columnOf, boxOf].some(region =>
            candidates.every(
              (other, peer) =>
                peer === cell ||
                region(peer) !== region(cell) ||
                !hasCandidate(other, digit),
            ),
          ),
      )
      .map(digit => ({ kind: 'placement' as const, cell, digit })),
  );
}

function applyEliminations(
  candidates: CandidateGrid,
  sources: readonly HintAssistanceSource[],
): CandidateGrid {
  const next = [...candidates];
  for (const source of sources) {
    for (const { cell, digit } of source.eliminations) {
      next[cell] = removeCandidate(next[cell], digit);
    }
  }
  return next;
}

function sourceFor(
  step: HintStep,
  candidates: CandidateGrid,
): HintAssistanceSource {
  const source: HintAssistanceSource = {
    sourceId: JSON.stringify([
      step.boardFingerprint,
      step.techniqueCode,
      step.eliminations,
      step.placements,
    ]),
    boardFingerprint: step.boardFingerprint,
    technique: step.techniqueCode,
    eliminations: step.eliminations,
    placements: step.placements,
    assistedEffects: [],
  };
  const afterBoard = [...boardFromFingerprint(step.boardFingerprint)];
  for (const { cell, digit } of step.placements) {
    afterBoard[cell] = digit;
  }
  const legal = createSolverCandidates(afterBoard);
  const after = applyEliminations(
    candidates.map((mask, cell) => intersectCandidateMasks(mask, legal[cell])),
    [source],
  );
  const beforeSingles = singles(candidates);
  return {
    ...source,
    assistedEffects: [
      ...step.eliminations.map(effect => ({
        ...effect,
        kind: 'elimination' as const,
      })),
      ...step.placements.map(effect => ({
        ...effect,
        kind: 'placement' as const,
      })),
      ...singles(after).filter(
        effect => !beforeSingles.some(before => sameEffect(before, effect)),
      ),
    ],
  };
}

export type HintAssistanceState = {
  hintExposureComplete: boolean;
  growthCandidates: CandidateGrid;
  appliedHintSources: readonly HintAssistanceSource[];
  knownHintSources: readonly HintAssistanceSource[];
};

// Rebuild only from accepted hint history, never from UI pencil marks. A shown
// but dismissed/undone hint remains known in this observation run, but its
// eliminations are NOT applied to the analysis board.
export function referenceHintAssistance(
  session: GameSession,
  remembered: readonly HintAssistanceSource[] = [],
): HintAssistanceState {
  let applied: HintAssistanceSource[] = [];
  for (const move of session.history) {
    applied = applied.filter(source =>
      extendsBoard(move.after.values, source.boardFingerprint),
    );
    const step = move.appliedHint;
    if (move.kind === 'apply_hint' && step) {
      const candidates = applyEliminations(
        createSolverCandidates(move.before.values),
        applied,
      );
      applied.push(sourceFor(step, candidates));
    }
  }
  applied = applied.filter(source =>
    extendsBoard(session.state.values, source.boardFingerprint),
  );
  const growthCandidates = applyEliminations(
    createSolverCandidates(session.state.values),
    applied,
  );
  const known = new Map(
    [
      ...remembered,
      ...(session.state.hintExposures ?? []).map(e =>
        sourceFor(e.step, e.candidates),
      ),
      ...applied,
      ...(session.state.hintExposures ?? []).map(e =>
        sourceFor(e.step, e.candidates),
      ),
    ]
      .filter(source =>
        extendsBoard(session.state.values, source.boardFingerprint),
      )
      .map(source => [source.sourceId, source]),
  );
  if (session.state.activeHint) {
    const source = sourceFor(session.state.activeHint, growthCandidates);
    if (
      !(session.state.hintExposures ?? []).some(
        e => sourceFor(e.step, e.candidates).sourceId === source.sourceId,
      )
    )
      known.set(source.sourceId, source);
  }
  return {
    hintExposureComplete:
      session.state.hintExposures !== null &&
      session.state.hintExposures.length === session.state.hintUseCount,
    growthCandidates,
    appliedHintSources: applied,
    knownHintSources: [...known.values()],
  };
}
