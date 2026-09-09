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
  coverage?: {
    mode: string;
    layouts: readonly string[];
    result: 'placement' | 'elimination';
    targetCount: number;
  };
};

type EncodedFixture = Omit<HintLabFixture, 'step'> & {
  engineResult: { status: 'step'; step: HintStep };
  replaySteps?: readonly {
    techniqueCode: TechniqueCode;
    placements: HintStep['placements'];
    eliminations: HintStep['eliminations'];
  }[];
};

export type EncodedHintLabCatalog = {
  fixtureContentVersion: number;
  fixtureCount: number;
  fixtures: readonly EncodedFixture[];
  variants?: readonly EncodedFixture[];
};

export function loadHintLabCatalog(encoded: EncodedHintLabCatalog): {
  fixtures: readonly HintLabFixture[];
  variants: readonly HintLabFixture[];
} {
  if (
    encoded.fixtureContentVersion !== HINT_LAB_FIXTURE_VERSION ||
    encoded.fixtureCount !== TECHNIQUES.length ||
    encoded.fixtures.length !== TECHNIQUES.length
  ) {
    throw new Error('Hint Lab fixture catalog is incomplete.');
  }
  const ids = new Set<string>();
  function decode(fixture: EncodedFixture): HintLabFixture {
    const technique = TECHNIQUES.find(
      item => item.code === fixture.techniqueCode,
    );
    if (!fixture.id || ids.has(fixture.id)) {
      throw new Error(`Duplicate or empty Hint Lab fixture ID: ${fixture.id}.`);
    }
    ids.add(fixture.id);
    if (
      !technique ||
      fixture.difficultyLevel !== technique.level ||
      fixture.engineResult.status !== 'step' ||
      fixture.engineResult.step.techniqueCode !== fixture.techniqueCode ||
      fixture.engineResult.step.difficultyLevel !== fixture.difficultyLevel
    ) {
      throw new Error(`Invalid Hint Lab technique: ${fixture.id}.`);
    }
    if (
      !/^[0-9]{81}$/.test(fixture.puzzleFingerprint) ||
      !fixture.sourcePuzzleId ||
      fixture.sourceKind !== 'replay' ||
      !Number.isInteger(fixture.sourceIteration) ||
      fixture.sourceIteration < 0 ||
      !Array.isArray(fixture.replaySteps) ||
      fixture.sourceIteration !== fixture.replaySteps.length
    ) {
      throw new Error(`Invalid Hint Lab source: ${fixture.id}.`);
    }
    for (const action of fixture.replaySteps ?? []) {
      if (
        !TECHNIQUES.some(item => item.code === action.techniqueCode) ||
        !Array.isArray(action.placements) ||
        !Array.isArray(action.eliminations) ||
        action.placements.length > 0 === action.eliminations.length > 0 ||
        [...action.placements, ...action.eliminations].some(
          candidate =>
            !Number.isInteger(candidate.cell) ||
            candidate.cell < 0 ||
            candidate.cell >= 81 ||
            !Number.isInteger(candidate.digit) ||
            candidate.digit < 1 ||
            candidate.digit > 9,
        )
      ) {
        throw new Error(`Invalid Hint Lab replay action: ${fixture.id}.`);
      }
    }
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
    for (let cell = 0; cell < 81; cell += 1) {
      const given = fixture.puzzleFingerprint[cell] !== '0';
      if (
        fixture.givenCells[cell] !== given ||
        (given &&
          fixture.puzzleFingerprint[cell] !== fixture.boardFingerprint[cell])
      ) {
        errors.push(`source givens disagree at cell ${cell}`);
      }
    }
    if (!fixture.coverage || !Array.isArray(fixture.coverage.layouts)) {
      errors.push('coverage metadata is required');
    } else {
      const { mode, layouts, result, targetCount } = fixture.coverage;
      const step = fixture.engineResult.step;
      if (
        mode !== (step.teaching?.mode || 'direct') ||
        layouts.some(
          layout =>
            typeof layout !== 'string' || !/^[a-z][a-z0-9-]*$/.test(layout),
        ) ||
        new Set(layouts).size !== layouts.length ||
        result !== (step.placements.length ? 'placement' : 'elimination') ||
        targetCount !== step.placements.length + step.eliminations.length
      ) {
        errors.push('coverage metadata disagrees with the hint step');
      }
    }
    if (errors.length > 0) {
      throw new Error(
        `Invalid Hint Lab fixture ${fixture.id}: ${errors.join('; ')}`,
      );
    }
    return { ...fixture, step: fixture.engineResult.step };
  }
  const fixtures = encoded.fixtures.map((fixture, index) => {
    if (fixture.techniqueCode !== TECHNIQUES[index].code) {
      throw new Error(`Invalid Hint Lab fixture at catalog index ${index}.`);
    }
    return decode(fixture);
  });
  return { fixtures, variants: (encoded.variants ?? []).map(decode) };
}

const catalog = loadHintLabCatalog(
  rawFixtures as unknown as EncodedHintLabCatalog,
);
export const HINT_LAB_FIXTURES = catalog.fixtures;
export const HINT_LAB_TEACHING_VARIANTS = catalog.variants;
export const HINT_LAB_ALL_FIXTURES = TECHNIQUES.flatMap(technique => [
  ...HINT_LAB_FIXTURES.filter(
    fixture => fixture.techniqueCode === technique.code,
  ),
  ...HINT_LAB_TEACHING_VARIANTS.filter(
    fixture => fixture.techniqueCode === technique.code,
  ),
]);

// Structural regression cases are intentionally excluded from the formal catalog.
export const HINT_LAB_REGRESSION_FIXTURES: readonly HintLabFixture[] = (
  (rawFixtures as unknown as { regressionFixtures?: readonly EncodedFixture[] })
    .regressionFixtures ?? []
).map((fixture, index) => ({
  ...fixture,
  id:
    index < TECHNIQUES.length
      ? fixture.id
      : `hint-lab-${fixture.sourcePuzzleId}`,
  step: fixture.engineResult.step,
}));

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
