import { GameMove, GameSession } from '../../domain/game/contracts';
import { HintStep } from '../../domain/hints/contracts';
import {
  boardFromFingerprint,
  boxOf,
  columnOf,
  createBoardFingerprint,
  createSolverCandidates,
  digitsFromMask,
  hasCandidate,
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
const sourceCandidates = new WeakMap<HintAssistanceSource, CandidateGrid>();
const sourceAnchors = new WeakMap<HintAssistanceSource, number>();
const dependencyRoots = new WeakMap<
  HintAssistanceSource,
  HintAssistanceSource
>();
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
  nextMoveSequence?: number,
): HintAssistanceSource {
  // A board/technique alone is insufficient: prior hint eliminations can
  // change which singles this hint enables on the same board.
  const context = `${nextMoveSequence ?? ''}:${candidates.join(',')}`;
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
  sourceCandidates.set(result, candidates);
  if (nextMoveSequence !== undefined)
    sourceAnchors.set(result, nextMoveSequence);
  return result;
}

export function sourceAssists(
  source: HintAssistanceSource,
  effect: NormalizedPlayerEffect,
): boolean {
  return (
    source.assistedEffects.some(e => sameEffect(e, effect)) ||
    (source.dependentEffects?.some(e => sameEffect(e.effect, effect)) ?? false)
  );
}

type DependencyCursor = {
  board: Board;
  candidates: CandidateGrid;
  source: HintAssistanceSource;
  started: boolean;
  stopped: boolean;
};
const dependencyCache = new WeakMap<
  HintAssistanceSource,
  {
    initial: DependencyCursor;
    moves: WeakMap<GameMove, WeakMap<DependencyCursor, DependencyCursor>>;
  }
>();

/** Replay only accepted history from the exposure anchor. Each move can reveal
 * one new layer; no future placements are executed to discover a closure.
 * Prefix caches make normal forward play incremental. Undo uses active history.
 */
function withObservedDependencies(
  session: GameSession,
  remembered: HintAssistanceSource,
): HintAssistanceSource {
  const root = dependencyRoots.get(remembered) ?? remembered;
  const candidates = sourceCandidates.get(root);
  // A repeated value board is not a temporal anchor: pencil edits and their
  // retractions may predate exposure. For imported evidence without an anchor,
  // an accepted application is the earliest provable replay boundary.
  const anchor =
    sourceAnchors.get(root) ??
    session.history.find(
      move =>
        move.kind === 'apply_hint' &&
        move.appliedHint &&
        JSON.stringify([
          move.appliedHint.boardFingerprint,
          move.appliedHint.techniqueCode,
          move.appliedHint.eliminations,
          move.appliedHint.placements,
        ]) === root.sourceId,
    )?.sequence;
  if (!candidates || anchor === undefined) {
    // Never trust remembered derived paths without their original context.
    const direct = { ...root };
    delete direct.dependentEffects;
    return root.dependentEffects ? direct : root;
  }
  let cache = dependencyCache.get(root);
  if (!cache) {
    cache = {
      initial: {
        board: boardFromFingerprint(root.boardFingerprint),
        candidates,
        source: root,
        started: false,
        stopped: false,
      },
      moves: new WeakMap(),
    };
    dependencyCache.set(root, cache);
  }
  let cursor = cache.initial;
  for (const move of session.history) {
    if (move.sequence < anchor) continue;
    if (move.sessionId !== session.state.sessionId) return root;
    let prefixes = cache.moves.get(move);
    const hit = prefixes?.get(cursor);
    if (hit) {
      cursor = hit;
      continue;
    }
    const previous = cursor;
    const beforeFingerprint = createBoardFingerprint(move.before.values);
    if (beforeFingerprint !== createBoardFingerprint(cursor.board)) {
      if (cursor.started) cursor = { ...cursor, stopped: true };
    } else if (!cursor.stopped) {
      const forward = move.before.values.every(
        (value, cell) => value === null || move.after.values[cell] === value,
      );
      if (!forward || move.after.incorrectCells.length) {
        cursor = { ...cursor, stopped: true };
      } else {
        const effects: NormalizedPlayerEffect[] = move.after.values.flatMap(
          (digit, cell) =>
            digit !== null && move.before.values[cell] === null
              ? [{ kind: 'placement' as const, cell, digit }]
              : [],
        );
        let next = [...cursor.candidates];
        if (move.appliedHint && move.kind === 'apply_hint') {
          effects.push(
            ...move.appliedHint.eliminations.map(e => ({
              ...e,
              kind: 'elimination' as const,
            })),
          );
        }
        if (
          (move.kind === 'edit_manual_candidate' ||
            move.kind === 'edit_quick_candidate') &&
          move.cell !== null &&
          move.digit !== null
        ) {
          const field =
            move.kind === 'edit_manual_candidate'
              ? 'manualCandidates'
              : 'quickCandidates';
          const removed =
            hasCandidate(
              move.before.candidates[field][move.cell],
              move.digit,
            ) &&
            !hasCandidate(move.after.candidates[field][move.cell], move.digit);
          if (removed)
            effects.push({
              kind: 'elimination',
              cell: move.cell,
              digit: move.digit,
            });
          else if (!hasCandidate(next[move.cell], move.digit))
            cursor = { ...cursor, stopped: true };
        }
        // Contradicting an earlier deletion retracts that candidate history.
        if (
          effects.some(
            e => e.kind === 'placement' && !hasCandidate(next[e.cell], e.digit),
          )
        )
          cursor = { ...cursor, stopped: true };
        if (!cursor.stopped) {
          const beforeSingles = effects.length ? singles(next) : [];
          if (effects.some(e => e.kind === 'placement')) {
            const legal = createSolverCandidates(move.after.values);
            next = next.map((mask, cell) =>
              intersectCandidateMasks(mask, legal[cell]),
            );
          }
          for (const e of effects)
            if (e.kind === 'elimination')
              next[e.cell] = removeCandidate(next[e.cell], e.digit);
          const via = effects.filter(e => sourceAssists(cursor.source, e));
          // A batched hint can contain effects with different provenance. Only
          // source-dependent effects may justify this source's new children.
          let attributable = next;
          if (via.length && via.length !== effects.length) {
            const parentBoard = [...move.before.values];
            for (const e of via)
              if (e.kind === 'placement') parentBoard[e.cell] = e.digit;
            const legal = createSolverCandidates(parentBoard);
            attributable = cursor.candidates.map((mask, cell) =>
              intersectCandidateMasks(mask, legal[cell]),
            );
            for (const e of via)
              if (e.kind === 'elimination')
                attributable[e.cell] = removeCandidate(
                  attributable[e.cell],
                  e.digit,
                );
          }
          const additions = via.length
            ? singles(attributable)
                .filter(
                  e =>
                    !beforeSingles.some(b => sameEffect(b, e)) &&
                    !sourceAssists(cursor.source, e),
                )
                .map(effect => ({
                  effect,
                  via,
                  moveId: move.id,
                  beforeBoardFingerprint: beforeFingerprint,
                  afterBoardFingerprint: createBoardFingerprint(
                    move.after.values,
                  ),
                }))
            : [];
          const source = additions.length
            ? {
                ...cursor.source,
                dependentEffects: [
                  ...(cursor.source.dependentEffects ?? []),
                  ...additions,
                ],
              }
            : cursor.source;
          dependencyRoots.set(source, root);
          cursor = {
            board: move.after.values,
            candidates: next,
            source,
            started: true,
            stopped: false,
          };
        }
      }
    }
    if (!prefixes) {
      prefixes = new WeakMap();
      cache.moves.set(move, prefixes);
    }
    prefixes.set(previous, cursor);
  }
  // Missing/reordered history or a changed premise cannot revive derived credit.
  return !cursor.stopped &&
    createBoardFingerprint(cursor.board) ===
      createBoardFingerprint(session.state.values)
    ? cursor.source
    : root;
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
    [
      ...remembered,
      ...exposedSources(session),
      ...applied,
      ...exposedSources(session),
    ]
      .filter(source =>
        extendsBoard(session.state.values, source.boardFingerprint),
      )
      .map(source => [source.sourceId, source]),
  );
  if (session.state.activeHint) {
    const source = sourceFor(session.state.activeHint, growthCandidates);
    if (!exposedSources(session).some(e => e.sourceId === source.sourceId))
      known.set(source.sourceId, source);
  }
  return {
    hintExposureComplete:
      session.state.hintExposures !== null &&
      session.state.hintExposures.length === session.state.hintUseCount,
    growthCandidates,
    appliedHintSources: applied,
    knownHintSources: [...known.values()].map(source =>
      withObservedDependencies(session, source),
    ),
  };
}

const exposureSources = new WeakMap<object, Sources>();
function exposedSources(session: GameSession): Sources {
  const exposures = session.state.hintExposures;
  if (!exposures) return [];
  const cached = exposureSources.get(exposures);
  if (cached) return cached;
  const sources = exposures.map(({ step, candidates, nextMoveSequence }) =>
    sourceFor(step, candidates, nextMoveSequence),
  );
  exposureSources.set(exposures, sources);
  return sources;
}
