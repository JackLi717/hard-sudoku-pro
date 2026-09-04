import {
  createGameSession,
  dispatchGameCommand,
} from '../../src/domain/game/engine';
import { GameDefinition } from '../../src/domain/game/contracts';
import { HintStep } from '../../src/domain/hints/contracts';
import { replayExplanationRequest } from '../../src/application/game/replay-explanations';
import {
  applyReasoningStep,
  DEFAULT_PATH_SEARCH,
  ReasoningPathsReport,
} from '../../src/application/technique-recognition/reasoning-paths';

export function teachingFixture() {
  const solution =
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
  const definition: GameDefinition = {
    puzzleId: 'p',
    contentVersion: 1,
    difficultyLevel: 1,
    puzzleFingerprint: '0' + solution.slice(1),
    solutionFingerprint: solution,
  };
  let session = createGameSession({
    sessionId: 's',
    definition,
    startedAtEpochMs: 1,
  });
  session = dispatchGameCommand(session, definition, {
    type: 'select_cell',
    cell: 0,
    atEpochMs: 2,
  }).session;
  session = dispatchGameCommand(session, definition, {
    type: 'input_digit',
    digit: 5,
    moveId: 'm',
    atEpochMs: 3,
  }).session;
  const step: HintStep = {
    contractVersion: 1,
    boardFingerprint: definition.puzzleFingerprint,
    techniqueCode: 'fullHouse',
    difficultyLevel: 1,
    focusCells: [0],
    focusRegions: [{ kind: 'row', index: 0 }],
    premiseCandidates: [],
    eliminations: [],
    placements: [{ cell: 0, digit: 5 }],
    humanCost: 1,
    explanationKey: 'hint.fullHouse',
    explanationParams: {},
    proofSteps: [
      {
        kind: 'observe',
        reason: 'scan_region',
        focusCells: [0],
        focusRegions: [{ kind: 'row', index: 0 }],
        premiseCandidates: [],
        valueEvidence: [],
        eliminations: [],
        placements: [],
      },
      {
        kind: 'conclusion',
        reason: 'forced_placement',
        focusCells: [0],
        focusRegions: [],
        premiseCandidates: [],
        valueEvidence: [],
        eliminations: [],
        placements: [{ cell: 0, digit: 5 }],
      },
    ],
  };
  const request = replayExplanationRequest(session, session.history[0]);
  const before = {
    board: request.startingBoardFingerprint,
    candidates: request.growthCandidates,
    givens: request.givenCells,
  };
  const report: ReasoningPathsReport = {
    paths: [
      {
        stages: [
          {
            before,
            after: applyReasoningStep(before, step),
            step,
            observedEffects: request.observedEffects.slice(),
            unobservedEffects: [],
          },
        ],
        totalHumanCost: 1,
        highestLevel: 1,
        explainedEffects: request.observedEffects,
        evidence: 'possible',
        independentUse: false,
        hintStatus: 'unknown',
      },
    ],
    expanded: 1,
    elapsedMs: 1,
    limits: [],
    scope: 'bounded_existing_techniques',
    automaticTechnique: null,
    selectedTechnique: null,
    budget: DEFAULT_PATH_SEARCH,
  };
  return { session, step, report };
}
