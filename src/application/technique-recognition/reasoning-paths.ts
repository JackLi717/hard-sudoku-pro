/* eslint-disable no-bitwise -- Sudoku candidate grids are nine-bit masks. */
import { HintStep, validateHintStep } from '../../domain/hints/contracts';
import { TECHNIQUE_CATALOG } from '../../domain/hints/techniques';
import {
  boardFromFingerprint,
  createBoardFingerprint,
  createSolverCandidates,
  findConflictingCells,
} from '../../domain/sudoku/board';
import {
  GrowthAnalysisRequest,
  NormalizedPlayerEffect,
} from '../../domain/technique-recognition/contracts';

export type ReasoningSnapshot = {
  board: string;
  candidates: readonly number[];
  givens: readonly boolean[];
};
export type ReasoningEnumerator = (snapshot: ReasoningSnapshot) => Promise<{
  board: string;
  snapshotKey: string;
  complete: boolean;
  steps: readonly HintStep[];
}>;
export type ReasoningPath = {
  stages: {
    before: ReasoningSnapshot;
    after: ReasoningSnapshot;
    step: HintStep;
    observedEffects: NormalizedPlayerEffect[];
    unobservedEffects: NormalizedPlayerEffect[];
  }[];
  totalHumanCost: number;
  highestLevel: number;
  explainedEffects: readonly NormalizedPlayerEffect[];
  evidence: 'possible';
  independentUse: false;
  hintStatus: 'no_recorded_hint' | 'possible_hint_dependency' | 'unknown';
};
export type PathSearchOptions = {
  maxDepth: number;
  maxExpanded: number;
  maxFrontier: number;
  maxPaths: number;
  maxMs: number;
};
export const DEFAULT_PATH_SEARCH: PathSearchOptions = {
  maxDepth: 5,
  maxExpanded: 256,
  maxFrontier: 4096,
  // Storage capacity, not a product presentation limit. Every verified path
  // retained by this bounded search is eligible for display.
  maxPaths: 128,
  maxMs: 30000,
};
export type ReasoningPathsReport = {
  paths: ReasoningPath[];
  expanded: number;
  elapsedMs: number;
  limits: string[];
  /** Even exhausted enumeration is bounded by the existing detector families. */
  scope: 'bounded_existing_techniques';
  automaticTechnique: null;
  selectedTechnique: null;
  budget: PathSearchOptions;
};
const effectKey = (e: NormalizedPlayerEffect) =>
  `${e.kind}:${e.cell}:${e.digit}`;
const effects = (s: HintStep): NormalizedPlayerEffect[] => [
  ...s.placements.map(e => ({ ...e, kind: 'placement' as const })),
  ...s.eliminations.map(e => ({ ...e, kind: 'elimination' as const })),
];
const identity = (s: HintStep) =>
  `${s.techniqueCode}:${effects(s).map(effectKey).sort().join(',')}`;
const stateKey = (s: ReasoningSnapshot) =>
  `${s.board}:${s.candidates.join(',')}`;
export const reasoningSnapshotKey = (s: ReasoningSnapshot) =>
  `${s.board}|${s.candidates.join(',')}|${s.givens
    .map(v => (v ? '1' : '0'))
    .join('')}`;

function valid(s: ReasoningSnapshot) {
  if (
    !/^[0-9]{81}$/.test(s.board) ||
    s.candidates.length !== 81 ||
    s.givens.length !== 81
  )
    return false;
  const board = boardFromFingerprint(s.board);
  if (
    findConflictingCells(board).length ||
    s.givens.some((g, c) => typeof g !== 'boolean' || (g && s.board[c] === '0'))
  )
    return false;
  const legal = createSolverCandidates(board);
  return s.candidates.every(
    (m, c) =>
      Number.isInteger(m) &&
      m >= 0 &&
      m <= 511 &&
      (s.board[c] === '0' ? m !== 0 && (m & legal[c]) === m : m === 0),
  );
}

/** Applies proven effects only to a private theoretical state, never game history. */
export function applyReasoningStep(
  s: ReasoningSnapshot,
  step: HintStep,
): ReasoningSnapshot {
  if (
    step.boardFingerprint !== s.board ||
    validateHintStep(step).length ||
    !step.proofSteps?.length ||
    !Number.isFinite(step.humanCost) ||
    !(step.humanCost! > 0)
  )
    throw Error('invalid_step');
  const all = effects(step);
  if (
    !all.length ||
    all.some(
      e =>
        s.board[e.cell] !== '0' ||
        !(s.candidates[e.cell] & (1 << (e.digit - 1))),
    )
  )
    throw Error('invalid_effect');
  const board = [...boardFromFingerprint(s.board)];
  for (const e of step.placements) board[e.cell] = e.digit;
  const legal = createSolverCandidates(board);
  const candidates = s.candidates.map((m, c) => m & legal[c]);
  for (const e of step.eliminations)
    candidates[e.cell] &= ~(1 << (e.digit - 1));
  const next = {
    board: createBoardFingerprint(board),
    candidates,
    givens: [...s.givens],
  };
  if (!valid(next) || stateKey(next) === stateKey(s))
    throw Error('invalid_transition');
  return next;
}

const reached = (
  s: ReasoningSnapshot,
  targets: readonly NormalizedPlayerEffect[],
) =>
  targets.every(e =>
    e.kind === 'placement'
      ? Number(s.board[e.cell]) === e.digit
      : Number(s.board[e.cell]) !== e.digit &&
        !(s.candidates[e.cell] & (1 << (e.digit - 1))),
  );

/** Offline diagnostic search. No result ever grants a technique attribution or
 * independent growth credit. Enumerator must bind results to the full input. */
export async function searchReasoningPaths(
  request: GrowthAnalysisRequest,
  enumerate: ReasoningEnumerator,
  overrides: Partial<PathSearchOptions> = {},
  cancelled: () => boolean = () => false,
  onVerified?: (report: ReasoningPathsReport) => void | Promise<void>,
): Promise<ReasoningPathsReport> {
  const options = { ...DEFAULT_PATH_SEARCH, ...overrides },
    started = Date.now();
  const result: ReasoningPathsReport = {
    paths: [],
    expanded: 0,
    elapsedMs: 0,
    limits: [],
    scope: 'bounded_existing_techniques',
    automaticTechnique: null,
    selectedTechnique: null,
    budget: options,
  };
  const limit = (reason: string) => {
    if (!result.limits.includes(reason)) result.limits.push(reason);
  };
  const finish = () => {
    if (cancelled()) limit('cancelled');
    // Published proofs survive interruption; publication order stays stable.
    result.elapsedMs = Date.now() - started;
    return result;
  };
  if (Object.values(options).some(n => !Number.isSafeInteger(n) || n < 1)) {
    limit('invalid_budget');
    return finish();
  }
  const initial = {
    board: request.startingBoardFingerprint,
    candidates: [...request.growthCandidates],
    givens: [...request.givenCells],
  };
  const targets = request.observedEffects.map(e => ({ ...e }));
  if (
    !valid(initial) ||
    !targets.length ||
    targets.some(
      e =>
        !['placement', 'elimination'].includes(e.kind) ||
        !Number.isInteger(e.cell) ||
        e.cell < 0 ||
        e.cell > 80 ||
        !Number.isInteger(e.digit) ||
        e.digit < 1 ||
        e.digit > 9 ||
        initial.board[e.cell] !== '0' ||
        !(initial.candidates[e.cell] & (1 << (e.digit - 1))),
    )
  ) {
    limit('invalid_input');
    return finish();
  }
  const expected = [...initial.board];
  for (const e of targets)
    if (e.kind === 'placement') expected[e.cell] = String(e.digit);
  if (expected.join('') !== request.expectedBoardFingerprint) {
    limit('board_fingerprint_mismatch');
    return finish();
  }
  type Node = {
    snapshot: ReasoningSnapshot;
    steps: HintStep[];
    cost: number;
    order: number;
    progress: number;
  };
  const peers = (a: number, b: number) =>
    Math.floor(a / 9) === Math.floor(b / 9) ||
    a % 9 === b % 9 ||
    (Math.floor(a / 27) === Math.floor(b / 27) &&
      Math.floor((a % 9) / 3) === Math.floor((b % 9) / 3));
  // Scheduling only: never treat proximity or candidate counts as a proof.
  // Include both target-cell alternatives and same-digit peers, independently
  // of technique name, so eliminations and placements use the same heuristic.
  const potential = (s: ReasoningSnapshot) =>
    targets.reduce((sum, target) => {
      const bit = 1 << (target.digit - 1);
      return (
        sum +
        s.candidates.reduce((count, mask, cell) => {
          if (cell === target.cell) {
            const relevant =
              target.kind === 'placement' ? mask & ~bit : mask & bit;
            return count + relevant.toString(2).replace(/0/g, '').length;
          }
          return count + Number(peers(cell, target.cell) && (mask & bit) !== 0);
        }, 0)
      );
    }, 0);
  const initialPotential = potential(initial);
  const compare = (a: Node, b: Node, broad = false) =>
    Number(reached(b.snapshot, targets)) -
      Number(reached(a.snapshot, targets)) ||
    (broad ? 0 : Number(b.progress > 0) - Number(a.progress > 0)) ||
    a.steps.length - b.steps.length ||
    (broad ? 0 : b.progress - a.progress) ||
    a.cost - b.cost ||
    a.order - b.order;
  let order = 0;
  const queue: Node[] = [
    { snapshot: initial, steps: [], cost: 0, order: order++, progress: 0 },
  ];
  const seen = new Map<string, number>();
  const pathIds = new Set<string>();
  const halt = () => {
    if (cancelled()) {
      limit('cancelled');
      return true;
    }
    if (Date.now() - started >= options.maxMs) {
      limit('time_budget');
      return true;
    }
    return false;
  };
  async function checked(s: ReasoningSnapshot) {
    const r = await enumerate(s);
    if (halt()) return [];
    if (r.board !== s.board || r.snapshotKey !== reasoningSnapshotKey(s))
      throw Error('snapshot_mismatch');
    if (!r.complete) {
      limit('incomplete_enumeration');
      return [];
    }
    return [...r.steps].sort(
      (a, b) =>
        (a.humanCost ?? Infinity) - (b.humanCost ?? Infinity) ||
        TECHNIQUE_CATALOG.findIndex(t => t[0] === a.techniqueCode) -
          TECHNIQUE_CATALOG.findIndex(t => t[0] === b.techniqueCode) ||
        identity(a).localeCompare(identity(b)),
    );
  }
  try {
    while (queue.length && !halt()) {
      // Verify discovered goals immediately. Reserve every fourth expansion
      // for breadth/cost order so remote prerequisites still get explored.
      queue.sort((a, b) => compare(a, b, result.expanded % 4 === 3));
      if (result.expanded >= options.maxExpanded) {
        limit('expansion_limit');
        // Already discovered goals still deserve verification after expansion
        // stops. This does not expand any additional search state.
        const goals = queue.filter(n => reached(n.snapshot, targets));
        goals.sort((a, b) => a.cost - b.cost || a.order - b.order);
        queue.length = 0;
        queue.push(...goals);
        if (!queue.length) break;
      }
      const n = queue.shift()!;
      if (reached(n.snapshot, targets)) {
        // Re-enumerate each immutable starting state and check exact evidence.
        let before: ReasoningSnapshot = initial;
        const stages: ReasoningPath['stages'] = [];
        for (const step of n.steps) {
          if (halt()) return finish();
          const verifiedSteps = await checked(before);
          // checked returns no steps when the budget expires during native
          // enumeration. This is an interruption, not a failed proof.
          if (halt() || result.limits.includes('incomplete_enumeration'))
            return finish();
          const proof = verifiedSteps.find(
            s =>
              identity(s) === identity(step) && s.humanCost === step.humanCost,
          );
          if (!proof) throw Error('reverification_failed');
          const after = applyReasoningStep(before, proof),
            es = effects(proof);
          stages.push({
            before,
            after,
            step: proof,
            observedEffects: es.filter(e =>
              targets.some(t => effectKey(t) === effectKey(e)),
            ),
            unobservedEffects: es.filter(
              e => !targets.some(t => effectKey(t) === effectKey(e)),
            ),
          });
          before = after;
        }
        if (halt()) return finish();
        if (!reached(before, targets)) throw Error('target_not_proven');
        // Independent reorderings of the same proof steps are one explanation.
        const id = n.steps.map(identity).sort().join('|');
        const ids = new Set(n.steps.map(identity));
        const redundant = result.paths.some(
          p =>
            p.totalHumanCost <= n.cost &&
            p.stages.every(s => ids.has(identity(s.step))),
        );
        if (!pathIds.has(id) && !redundant) {
          pathIds.add(id);
          const hints = request.hintAssistance;
          result.paths.push({
            stages,
            totalHumanCost: n.cost,
            highestLevel: Math.max(...n.steps.map(s => s.difficultyLevel)),
            explainedEffects: targets,
            evidence: 'possible',
            independentUse: false,
            hintStatus:
              !hints || hints.exposureComplete !== true
                ? 'unknown'
                : hints.knownSources.length ||
                  hints.appliedSources.length ||
                  hints.affectedEffects.length
                ? 'possible_hint_dependency'
                : 'no_recorded_hint',
          });
          // Only complete, step-by-step reverified proofs cross this boundary.
          // Give subscribers a detached report; subsequent search never mutates it.
          await onVerified?.({
            ...result,
            paths: [...result.paths],
            limits: [...result.limits],
            elapsedMs: Date.now() - started,
          });
        }
        if (result.paths.length >= options.maxPaths) {
          limit('path_limit');
          break;
        }
        continue;
      }
      if (n.steps.length >= options.maxDepth) {
        limit('depth_limit');
        continue;
      }
      if (result.expanded >= options.maxExpanded) {
        limit('expansion_limit');
        break;
      }
      result.expanded++;
      for (const step of await checked(n.snapshot)) {
        if (halt()) return finish();
        const next = applyReasoningStep(n.snapshot, step);
        // Never extend a path that has contradicted an observed placement.
        if (
          targets.some(
            e =>
              e.kind === 'placement' &&
              (next.board[e.cell] !== '0'
                ? Number(next.board[e.cell]) !== e.digit
                : !(next.candidates[e.cell] & (1 << (e.digit - 1)))),
          )
        )
          continue;
        const cost = n.cost + step.humanCost!;
        // Depth matters: a cheaper longer path must not suppress a shorter one.
        const key = `${stateKey(next)}:${n.steps.length + 1}`;
        if ((seen.get(key) ?? Infinity) < cost) continue;
        if (seen.get(key) === cost && !reached(next, targets)) continue;
        seen.set(key, cost);
        queue.push({
          snapshot: next,
          steps: [...n.steps, step],
          cost,
          order: order++,
          progress: initialPotential - potential(next),
        });
      }
      if (queue.length > options.maxFrontier) {
        queue.sort((a, b) => compare(a, b));
        queue.length = options.maxFrontier;
        limit('frontier_limit');
      }
    }
  } catch (error) {
    limit(error instanceof Error ? error.message : 'analysis_failed');
  }
  return finish();
}
