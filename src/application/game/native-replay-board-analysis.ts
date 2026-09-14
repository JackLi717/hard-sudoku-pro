import NativeHintEngine from '../../native/NativeHintEngine';
import { GameSession, UndoSnapshot } from '../../domain/game/contracts';
import {
  HINT_STEP_CONTRACT_VERSION,
  HintStep,
} from '../../domain/hints/contracts';
import {
  validateHintEngineRequest,
  validateHintStepForState,
} from '../../domain/hints/candidate-state';
import {
  createBoardFingerprint,
  createSolverCandidates,
} from '../../domain/sudoku/board';
import {
  applyReasoningStep,
  ReasoningPathsReport,
  ReasoningSnapshot,
  reasoningSnapshotKey,
} from '../technique-recognition/reasoning-paths';
import {
  ReplayAnalysisOptions,
  REPLAY_ANALYSIS_BUDGETS,
  REPLAY_PREVIEW_BUDGET,
} from './replay-analysis-policy';

let serial = 0;
let nativePending: Promise<string> | undefined;

/** Find possible next deductions from the displayed board, never from a move. */
export async function analyzeReplayBoard(
  session: GameSession,
  snapshot: UndoSnapshot,
  signal: AbortSignal,
  { level = 'basic', preview = false, onVerified }: ReplayAnalysisOptions = {},
): Promise<ReasoningPathsReport> {
  const budget = preview
    ? REPLAY_PREVIEW_BUDGET
    : REPLAY_ANALYSIS_BUDGETS[level];
  const started = Date.now();
  const report: ReasoningPathsReport = {
    paths: [],
    expanded: 0,
    elapsedMs: 0,
    limits: [],
    scope: 'bounded_existing_techniques',
    automaticTechnique: null,
    selectedTechnique: null,
    budget,
  };
  const finish = () => {
    report.elapsedMs = Date.now() - started;
    return report;
  };
  const board = createBoardFingerprint(snapshot.values);
  const candidates = createSolverCandidates(snapshot.values);
  const givens = session.state.givens.map(value => value !== null);
  const request = {
    contractVersion: HINT_STEP_CONTRACT_VERSION,
    boardFingerprint: board,
    hintCandidates: candidates,
    givenCells: givens,
  };
  if (validateHintEngineRequest(request).length) {
    report.limits.push('invalid_input');
    return finish();
  }
  const initial: ReasoningSnapshot = { board, candidates, givens };
  const requestId = `replay-board:${++serial}`;
  const cancel = () => NativeHintEngine.cancel(requestId);
  signal.addEventListener('abort', cancel, { once: true });
  try {
    if (signal.aborted) {
      report.limits.push('cancelled');
      return finish();
    }
    while (nativePending) {
      try {
        await nativePending;
      } catch {
        // The owning request reports its own failure.
      }
      if (signal.aborted) {
        report.limits.push('cancelled');
        return finish();
      }
    }
    const pending = NativeHintEngine.enumerateSteps(
      requestId,
      board,
      candidates.join(','),
      givens.map(value => (value ? '1' : '0')).join(''),
    );
    nativePending = pending;
    let raw: unknown;
    try {
      raw = JSON.parse(await pending);
    } finally {
      if (nativePending === pending) nativePending = undefined;
    }
    if (signal.aborted) {
      report.limits.push('cancelled');
      return finish();
    }
    if (
      !raw ||
      typeof raw !== 'object' ||
      !('board' in raw) ||
      raw.board !== board ||
      !('snapshotKey' in raw) ||
      raw.snapshotKey !== reasoningSnapshotKey(initial) ||
      !('complete' in raw) ||
      typeof raw.complete !== 'boolean' ||
      !('steps' in raw) ||
      !Array.isArray(raw.steps)
    )
      throw Error('analysis_failed');
    if (!raw.complete) report.limits.push('incomplete_enumeration');
    for (const item of raw.steps) {
      if (signal.aborted) {
        report.limits.push('cancelled');
        return finish();
      }
      const step = item?.step as HintStep | undefined;
      if (!step || validateHintStepForState(request, step).length)
        throw Error('analysis_failed');
      const after = applyReasoningStep(initial, step);
      report.paths.push({
        stages: [
          {
            before: initial,
            after,
            step,
            observedEffects: [],
            unobservedEffects: [],
          },
        ],
        totalHumanCost: step.humanCost!,
        highestLevel: step.difficultyLevel,
        explainedEffects: [],
        evidence: 'possible',
        independentUse: false,
        hintStatus: 'unknown',
      });
      if (report.paths.length >= budget.maxPaths) {
        if (raw.steps.length > budget.maxPaths)
          report.limits.push('path_limit');
        break;
      }
    }
    report.expanded = 1;
    if (report.paths.length) onVerified?.(finish());
    return finish();
  } catch {
    report.paths = [];
    report.limits.push(signal.aborted ? 'cancelled' : 'analysis_failed');
    return finish();
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}
