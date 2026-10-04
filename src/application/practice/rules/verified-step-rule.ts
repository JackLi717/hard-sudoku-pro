import { practiceReferenceSnapshot } from '../../../data/practice/practice-catalog';
import type { PracticeScene } from '../../../data/practice/practice-catalog';
import {
  validateHintEngineRequest,
  validateHintStepForState,
} from '../../../domain/hints/candidate-state';
import type { HintStep } from '../../../domain/hints/contracts';
import type { HintWalkthroughSnapshot } from '../../../domain/hints/walkthrough';
import type { TechniqueCode } from '../../../domain/hints/techniques';
import { practiceCandidatesBeforeMove } from '../../../domain/practice/practice-board';
import {
  createBoardFingerprint,
  hasCandidate,
} from '../../../domain/sudoku/board';
import type {
  Board,
  CandidateGrid,
  CandidateRef,
} from '../../../domain/sudoku/contracts';
import type {
  PracticeBoardAction,
  PracticeEvaluation,
  PracticeTechniqueRule,
} from '../practice-evaluator';

let requestSequence = 0;

function sameCandidate(a: CandidateRef, b: CandidateRef): boolean {
  return a.cell === b.cell && a.digit === b.digit;
}

function effects(step: HintStep, kind: PracticeBoardAction['kind']) {
  return kind === 'placement' ? step.placements : step.eliminations;
}

function proofFor(
  scene: PracticeScene,
  values: Board,
  masks: CandidateGrid,
  step: HintStep,
  target: CandidateRef,
): PracticeEvaluation {
  const proof: HintWalkthroughSnapshot = {
    id: `${scene.id}:${target.cell}:${target.digit}`,
    values: [...values],
    givens: scene.board.givens,
    candidateMasks: masks,
    step,
  };
  return { status: 'correct', proof, target };
}

async function findNativeStep(
  scene: PracticeScene,
  values: Board,
  masks: CandidateGrid,
  kind: PracticeBoardAction['kind'],
  targets: readonly CandidateRef[],
  signal?: AbortSignal,
): Promise<PracticeEvaluation> {
  const board = createBoardFingerprint(values);
  const candidates = masks.join(',');
  const givens = scene.board.givens
    .map(value => (value === null ? '0' : '1'))
    .join('');
  const request = {
    contractVersion: 1 as const,
    boardFingerprint: board,
    hintCandidates: masks,
    givenCells: scene.board.givens.map(value => value !== null),
  };
  if (validateHintEngineRequest(request).length)
    return { status: 'unavailable' };
  const native = (
    require('../../../native/NativeHintEngine') as typeof import('../../../native/NativeHintEngine')
  ).default;
  const requestId = `practice:${scene.id}:${++requestSequence}`;
  const cancel = () => native.cancel(requestId);
  signal?.addEventListener('abort', cancel, { once: true });
  try {
    if (signal?.aborted) return { status: 'unavailable' };
    const raw: unknown = JSON.parse(
      await native.enumerateSteps(requestId, board, candidates, givens),
    );
    if (
      signal?.aborted ||
      !raw ||
      typeof raw !== 'object' ||
      !('board' in raw) ||
      raw.board !== board ||
      !('snapshotKey' in raw) ||
      raw.snapshotKey !== `${board}|${candidates}|${givens}` ||
      !('complete' in raw) ||
      typeof raw.complete !== 'boolean' ||
      !('steps' in raw) ||
      !Array.isArray(raw.steps)
    )
      return { status: 'unavailable' };

    const matching: HintStep[] = [];
    for (const item of raw.steps) {
      if (
        item?.status !== 'step' ||
        item.step?.techniqueCode !== scene.techniqueCode
      )
        continue;
      const step = item.step as HintStep;
      if (validateHintStepForState(request, step).length)
        return { status: 'unavailable' };
      matching.push(step);
    }
    const allSupported = targets.every(target =>
      matching.some(step =>
        effects(step, kind).some(effect => sameCandidate(effect, target)),
      ),
    );
    if (allSupported) {
      const target = targets.at(-1)!;
      const step = matching.find(candidate =>
        effects(candidate, kind).some(effect => sameCandidate(effect, target)),
      )!;
      return proofFor(scene, values, masks, step, target);
    }
    return { status: raw.complete ? 'other' : 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  } finally {
    signal?.removeEventListener('abort', cancel);
  }
}

/** Use the signed-off scene proof immediately; enumerate verified alternatives on demand. */
export function verifiedStepRule(
  technique: TechniqueCode,
  answerKind: PracticeBoardAction['kind'] | 'from-scene',
): PracticeTechniqueRule {
  const sceneAnswerKind = (scene: PracticeScene): PracticeBoardAction['kind'] =>
    scene.explanation.placements.length ? 'placement' : 'elimination';
  return {
    initialCandidates: answerKind === 'placement' ? 'empty' : 'verified',
    answerKind: answerKind === 'from-scene' ? 'elimination' : answerKind,
    ...(answerKind === 'from-scene'
      ? {
          answerKindForScene: sceneAnswerKind,
          initialCandidatesForScene: (scene: PracticeScene) =>
            sceneAnswerKind(scene) === 'placement'
              ? ('empty' as const)
              : ('verified' as const),
        }
      : {}),
    evaluate(scene, session, actions, signal) {
      if (scene.techniqueCode !== technique) return { status: 'unavailable' };
      const expectedKind =
        answerKind === 'from-scene' ? sceneAnswerKind(scene) : answerKind;
      const source = session.state.candidates.activeCandidateSource;
      const relevant = actions.filter(
        action =>
          action.kind === expectedKind &&
          (action.kind !== 'elimination' || action.source === source),
      );
      if (!relevant.length) return { status: 'enter' };
      const submitted =
        expectedKind === 'placement' ? relevant.slice(-1) : relevant;
      const values =
        expectedKind === 'placement'
          ? [
              ...(
                submitted[0] as Extract<
                  PracticeBoardAction,
                  { kind: 'placement' }
                >
              ).beforeValues,
            ]
          : session.state.values;
      const reference = practiceReferenceSnapshot(scene);
      const masks = practiceCandidatesBeforeMove(reference, values);
      if (
        values.some(
          (value, cell) =>
            value !== null &&
            scene.board.solutionFingerprint[cell] !== String(value),
        ) ||
        submitted.some(action =>
          action.kind === 'placement'
            ? values[action.target.cell] !== null ||
              scene.board.solutionFingerprint[action.target.cell] !==
                String(action.target.digit)
            : !hasCandidate(masks[action.target.cell], action.target.digit) ||
              scene.board.solutionFingerprint[action.target.cell] ===
                String(action.target.digit) ||
              hasCandidate(
                (source === 'quick'
                  ? session.state.candidates.quickCandidates
                  : session.state.candidates.manualCandidates)[
                  action.target.cell
                ],
                action.target.digit,
              ),
        )
      )
        return { status: 'incorrect' };
      const targets = submitted.map(action => action.target);
      if (
        createBoardFingerprint(values) ===
          createBoardFingerprint(scene.board.values) &&
        targets.every(target =>
          effects(scene.explanation, expectedKind).some(effect =>
            sameCandidate(effect, target),
          ),
        )
      )
        return proofFor(
          scene,
          values,
          masks,
          scene.explanation,
          targets.at(-1)!,
        );
      return findNativeStep(
        scene,
        values,
        masks,
        expectedKind,
        targets,
        signal,
      );
    },
  };
}
