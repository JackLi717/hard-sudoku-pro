import { GameMove, GameSession } from '../../domain/game/contracts';
import { HintStep } from '../../domain/hints/contracts';
import {
  boardFromFingerprint,
  boxOf,
  columnOf,
  createSolverCandidates,
  digitsFromMask,
  intersectCandidateMasks,
  removeCandidate,
  rowOf,
} from '../../domain/sudoku/board';
import { Board, CandidateGrid } from '../../domain/sudoku/contracts';
import {
  HintAssistanceSource,
  NormalizedPlayerEffect,
} from '../../domain/technique-recognition/contracts';

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
export function singles(candidates: CandidateGrid): NormalizedPlayerEffect[] {
  const digitsByCell = candidates.map(digitsFromMask);
  const counts = new Uint8Array(27 * 9);
  digitsByCell.forEach((digits, cell) => {
    for (const region of CELL_REGIONS[cell]) {
      for (const digit of digits) {
        counts[region * 9 + digit - 1] += 1;
      }
    }
  });
  const effects: NormalizedPlayerEffect[] = [];
  digitsByCell.forEach((digits, cell) => {
    for (const digit of digits) {
      if (
        digits.length === 1 ||
        CELL_REGIONS[cell].some(region => counts[region * 9 + digit - 1] === 1)
      ) {
        effects.push({ kind: 'placement', cell, digit });
      }
    }
  });
  return effects;
}

const CELL_REGIONS = Array.from({ length: 81 }, (_, cell) => [
  rowOf(cell),
  9 + columnOf(cell),
  18 + boxOf(cell),
]);

type Sources = readonly HintAssistanceSource[];
const EMPTY_SOURCES: Sources = [];

// Game history, moves and boards are immutable. These weak caches contain only
// derived data; they neither persist nor replace the observation's known hints.
const historySources = new WeakMap<GameSession['history'], Sources>();
const moveSources = new WeakMap<GameMove, WeakMap<Sources, Sources>>();
const hintSources = new WeakMap<HintStep, Map<string, HintAssistanceSource>>();
const candidateStates = new WeakMap<
  GameSession['history'],
  WeakMap<
    Board,
    Omit<HintAssistanceState, 'knownHintSources' | 'hintExposureComplete'>
  >
>();

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
  // A board/technique alone is insufficient: prior hint eliminations can
  // change which singles this hint enables on the same board.
  const context = candidates.join(',');
  let contexts = hintSources.get(step);
  const cached = contexts?.get(context);
  if (cached) {
    return cached;
  }
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
  const result: HintAssistanceSource = {
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
  if (!contexts) {
    contexts = new Map();
    hintSources.set(step, contexts);
  }
  contexts.set(context, result);
  return result;
}

export type HintAssistanceState = {
  hintExposureComplete: boolean;
  growthCandidates: CandidateGrid;
  appliedHintSources: readonly HintAssistanceSource[];
  knownHintSources: readonly HintAssistanceSource[];
};

function appliedSourcesForHistory(history: GameSession['history']): Sources {
  const cached = historySources.get(history);
  if (cached) {
    return cached;
  }
  let applied = EMPTY_SOURCES;
  for (const move of history) {
    let contexts = moveSources.get(move);
    const previous = applied;
    const checkpoint = contexts?.get(previous);
    if (checkpoint) {
      applied = checkpoint;
      continue;
    }
    applied = previous.filter(source =>
      extendsBoard(move.after.values, source.boardFingerprint),
    );
    const step = move.appliedHint;
    if (move.kind === 'apply_hint' && step) {
      const candidates = applyEliminations(
        createSolverCandidates(move.before.values),
        applied,
      );
      applied = [...applied, sourceFor(step, candidates)];
    }
    if (!contexts) {
      contexts = new WeakMap();
      moveSources.set(move, contexts);
    }
    contexts.set(previous, applied);
  }
  historySources.set(history, applied);
  return applied;
}

function candidatesForSession(
  session: GameSession,
): Omit<HintAssistanceState, 'knownHintSources' | 'hintExposureComplete'> {
  let boards = candidateStates.get(session.history);
  const cached = boards?.get(session.state.values);
  if (cached) {
    return cached;
  }
  const appliedHintSources = appliedSourcesForHistory(session.history).filter(
    source => extendsBoard(session.state.values, source.boardFingerprint),
  );
  const result = {
    growthCandidates: applyEliminations(
      createSolverCandidates(session.state.values),
      appliedHintSources,
    ),
    appliedHintSources,
  };
  if (!boards) {
    boards = new WeakMap();
    candidateStates.set(session.history, boards);
  }
  boards.set(session.state.values, result);
  return result;
}

// Rebuild only from accepted hint history, never from UI pencil marks. A shown
// but dismissed/undone hint remains known in this observation run, but its
// eliminations are NOT applied to the analysis board.
export function rebuildHintAssistance(
  session: GameSession,
  remembered: readonly HintAssistanceSource[] = [],
): HintAssistanceState {
  const { growthCandidates, appliedHintSources: applied } =
    candidatesForSession(session);
  const known = new Map(
    [...remembered, ...exposedSources(session), ...applied]
      .filter(source =>
        extendsBoard(session.state.values, source.boardFingerprint),
      )
      .map(source => [source.sourceId, source]),
  );
  if (session.state.activeHint) {
    const source = sourceFor(session.state.activeHint, growthCandidates);
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

const exposureSources = new WeakMap<object, Sources>();
function exposedSources(session: GameSession): Sources {
  const exposures = session.state.hintExposures;
  if (!exposures) return [];
  const cached = exposureSources.get(exposures);
  if (cached) return cached;
  const sources = exposures.map(({ step, candidates }) =>
    sourceFor(step, candidates),
  );
  exposureSources.set(exposures, sources);
  return sources;
}
