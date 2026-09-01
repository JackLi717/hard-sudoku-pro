import rawFixtures from './generated/hint-lab-fixtures.json';
import {
  GameDefinition,
  GameSession,
  HintEngineRequest,
  HintStep,
  TECHNIQUES,
  TechniqueCode,
  boardFromFingerprint,
  createGameSession,
  dispatchGameCommand,
  validateHintEngineRequest,
  validateHintStepForState,
} from '../domain';
import { DifficultyLevel } from '../domain/hints/techniques';

export const HINT_LAB_FIXTURE_VERSION = 1;

export type HintLabFixture = {
  id: string;
  techniqueCode: TechniqueCode;
  difficultyLevel: DifficultyLevel;
  sourceKind: 'replay' | 'synthetic';
  sourcePuzzleId: string;
  sourceIteration: number;
  puzzleFingerprint: string;
  boardFingerprint: string;
  solutionFingerprint: string;
  givenCells: readonly boolean[];
  candidateMasks: readonly number[];
  step: HintStep;
};

type EncodedFixture = Omit<HintLabFixture, 'step'> & {
  engineResult: { status: 'step'; step: HintStep };
};

function loadFixtures(): readonly HintLabFixture[] {
  const encoded = rawFixtures as unknown as {
    fixtureContentVersion: number;
    fixtureCount: number;
    fixtures: readonly EncodedFixture[];
  };
  if (
    encoded.fixtureContentVersion !== HINT_LAB_FIXTURE_VERSION ||
    encoded.fixtureCount !== TECHNIQUES.length ||
    encoded.fixtures.length !== TECHNIQUES.length
  ) {
    throw new Error('Hint Lab fixture catalog is incomplete.');
  }
  const seen = new Set<string>();
  return encoded.fixtures.map((fixture, index) => {
    const expected = TECHNIQUES[index];
    if (
      fixture.techniqueCode !== expected.code ||
      fixture.difficultyLevel !== expected.level ||
      fixture.engineResult.status !== 'step' ||
      seen.has(fixture.techniqueCode)
    ) {
      throw new Error(`Invalid Hint Lab fixture at catalog index ${index}.`);
    }
    seen.add(fixture.techniqueCode);
    const request: HintEngineRequest = {
      contractVersion: 1,
      boardFingerprint: fixture.boardFingerprint,
      hintCandidates: fixture.candidateMasks,
      givenCells: fixture.givenCells,
    };
    const errors = [
      ...validateHintEngineRequest(request),
      ...validateHintStepForState(
        request,
        fixture.engineResult.step,
        fixture.solutionFingerprint,
      ),
    ];
    if (errors.length > 0) {
      throw new Error(
        `Invalid Hint Lab fixture ${fixture.techniqueCode}: ${errors.join(
          '; ',
        )}`,
      );
    }
    return {
      ...fixture,
      step: fixture.engineResult.step,
    };
  });
}

export const HINT_LAB_FIXTURES = loadFixtures();

export function hintLabDefinition(fixture: HintLabFixture): GameDefinition {
  return {
    puzzleId: fixture.id,
    contentVersion: HINT_LAB_FIXTURE_VERSION,
    difficultyLevel: fixture.difficultyLevel,
    puzzleFingerprint: fixture.puzzleFingerprint,
    solutionFingerprint: fixture.solutionFingerprint,
  };
}

export function createHintLabSession(
  fixture: HintLabFixture,
  atEpochMs = Date.now(),
): GameSession {
  const definition = hintLabDefinition(fixture);
  const initial = createGameSession({
    sessionId: `${fixture.id}-session`,
    definition,
    startedAtEpochMs: atEpochMs,
  });
  return {
    history: [],
    state: {
      ...initial.state,
      values: boardFromFingerprint(fixture.boardFingerprint),
      activeHint: fixture.step,
      candidates: {
        ...initial.state.candidates,
        manualCandidates: [...fixture.candidateMasks],
        quickCandidates: [...fixture.candidateMasks],
        hintCandidates: [...fixture.candidateMasks],
        activeCandidateSource: 'quick',
        quickDraftGenerated: true,
        quickDraftBoardFingerprint: fixture.boardFingerprint,
        hintBoardFingerprint: fixture.boardFingerprint,
      },
    },
  };
}

export function applyHintLabStep(
  fixture: HintLabFixture,
  session: GameSession,
  atEpochMs = Date.now(),
): GameSession {
  const result = dispatchGameCommand(session, hintLabDefinition(fixture), {
    type: 'apply_hint',
    moveId: `${fixture.id}-apply-${session.state.nextMoveSequence}`,
    atEpochMs,
  });
  if (!result.accepted) {
    throw new Error(`Hint Lab apply failed: ${result.reason ?? 'unknown'}`);
  }
  return result.session;
}

export function undoHintLabStep(
  fixture: HintLabFixture,
  session: GameSession,
  atEpochMs = Date.now(),
): GameSession {
  const result = dispatchGameCommand(session, hintLabDefinition(fixture), {
    type: 'undo',
    atEpochMs,
  });
  if (!result.accepted) {
    throw new Error(`Hint Lab undo failed: ${result.reason ?? 'unknown'}`);
  }
  return {
    ...result.session,
    state: { ...result.session.state, activeHint: fixture.step },
  };
}
