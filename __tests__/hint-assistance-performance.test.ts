import * as assistance from '../src/application/technique-recognition/hint-assistance';
import {
  createBehaviorRecognitionState,
  observeAcceptedGameCommand,
} from '../src/application/technique-recognition/behavior-adapter';
import * as board from '../src/domain/sudoku/board';
import {
  createGameSession,
  dispatchGameCommand,
} from '../src/domain/game/engine';
import {
  GameCommand,
  GameDefinition,
  GameSession,
} from '../src/domain/game/contracts';
import { HintStep } from '../src/domain/hints/contracts';
import {
  HINT_LAB_FIXTURES,
  createHintLabSession,
  hintLabDefinition,
} from '../src/debug/hint-lab';
import { referenceHintAssistance } from './helpers/reference-hint-assistance';
import {
  kiteDefinition,
  kiteGame,
  kiteHint,
} from './helpers/ipad-hint-assistance';

const definition: GameDefinition = {
  puzzleId: 'hint-performance',
  contentVersion: 4,
  difficultyLevel: 3,
  puzzleFingerprint:
    '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  solutionFingerprint:
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
};

function singleFor(session: GameSession): HintStep {
  const candidates = board.createSolverCandidates(session.state.values);
  const cell = candidates.findIndex(
    mask => board.digitsFromMask(mask).length === 1,
  );
  if (cell < 0) {
    throw new Error('The performance puzzle must offer a naked single.');
  }
  const digit = board.digitsFromMask(candidates[cell])[0];
  return {
    contractVersion: 1,
    boardFingerprint: board.createBoardFingerprint(session.state.values),
    techniqueCode: 'nakedSingle',
    difficultyLevel: 1,
    focusCells: [cell],
    focusRegions: [],
    premiseCandidates: [{ cell, digit }],
    placements: [{ cell, digit }],
    eliminations: [],
    explanationKey: 'hint.nakedSingle',
    explanationParams: {},
  };
}

function longGame(hintCount: number) {
  let session = createGameSession({
    definition,
    sessionId: 'hint-performance',
    startedAtEpochMs: 1_000,
  });
  let state = createBehaviorRecognitionState(session);
  let time = 2_000;
  function act(command: GameCommand, compare = false) {
    const result = dispatchGameCommand(session, definition, command);
    expect(result.accepted).toBe(true);
    const observed = observeAcceptedGameCommand(
      state,
      session,
      command,
      result,
    );
    if (compare) {
      const reference = jest
        .spyOn(assistance, 'rebuildHintAssistance')
        .mockImplementation(referenceHintAssistance);
      try {
        expect(observed).toEqual(
          observeAcceptedGameCommand(state, session, command, result),
        );
      } finally {
        reference.mockRestore();
      }
    }
    session = result.session;
    state = observed.state;
    return observed;
  }
  function hint(compare = false) {
    const step = singleFor(session);
    act({ type: 'prepare_hint', atEpochMs: time++ }, compare);
    act(
      { type: 'reveal_hint', step, availableCredits: 1, atEpochMs: time++ },
      compare,
    );
    act(
      { type: 'apply_hint', moveId: `hint-${time}`, atEpochMs: time++ },
      compare,
    );
  }
  for (let index = 0; index < hintCount; index += 1) {
    hint();
  }
  return {
    act,
    hint,
    get session() {
      return session;
    },
    get state() {
      return state;
    },
  };
}

test.each(
  HINT_LAB_FIXTURES.map(fixture => [fixture.techniqueCode, fixture] as const),
)(
  '%s assistance matches exhaustive evaluation through apply, undo and restoration',
  (_, fixture) => {
    const shown = createHintLabSession(fixture, 1_000);
    const remembered = assistance.rebuildHintAssistance(shown).knownHintSources;
    expect(assistance.rebuildHintAssistance(shown)).toEqual(
      referenceHintAssistance(shown),
    );
    const applied = dispatchGameCommand(shown, hintLabDefinition(fixture), {
      type: 'apply_hint',
      moveId: 'apply',
      atEpochMs: 2_000,
    });
    expect(applied.accepted).toBe(true);
    const undone = dispatchGameCommand(
      applied.session,
      hintLabDefinition(fixture),
      {
        type: 'undo',
        atEpochMs: 3_000,
      },
    );
    expect(undone.accepted).toBe(true);
    for (const session of [applied.session, undone.session]) {
      for (const restored of [
        session,
        JSON.parse(JSON.stringify(session)) as GameSession,
      ]) {
        expect(assistance.rebuildHintAssistance(restored, remembered)).toEqual(
          referenceHintAssistance(restored, remembered),
        );
      }
    }
  },
);

test('the same hint is evaluated against its full candidate context', () => {
  const game = kiteGame();
  const shown = { ...game, state: { ...game.state, activeHint: kiteHint } };
  const ordinary = assistance.rebuildHintAssistance(shown);
  // Before the kite, another accepted exclusion can already enable its follow-up.
  const prior: HintStep = {
    ...kiteHint,
    eliminations: [{ cell: 32, digit: 3 }],
  };
  const withPrior = dispatchGameCommand(
    {
      ...game,
      state: {
        ...game.state,
        activeHint: prior,
        candidates: {
          ...game.state.candidates,
          hintCandidates: board.createSolverCandidates(game.state.values),
        },
      },
    },
    kiteDefinition,
    { type: 'apply_hint', moveId: 'prior', atEpochMs: 2_000 },
  );
  expect(withPrior.accepted).toBe(true);
  const reshown = {
    ...withPrior.session,
    state: { ...withPrior.session.state, activeHint: kiteHint },
  };
  const narrowed = assistance.rebuildHintAssistance(reshown);
  expect(narrowed).toEqual(referenceHintAssistance(reshown));
  expect(narrowed.knownHintSources[0].assistedEffects).not.toEqual(
    ordinary.knownHintSources[0].assistedEffects,
  );
});

test('long-game observations preserve recognition requests and invalidations', () => {
  const game = longGame(20);
  game.hint(true);
  game.act({ type: 'undo', atEpochMs: 4_000 }, true);
  game.act({ type: 'pause', atEpochMs: 4_001 }, true);
  game.act({ type: 'resume', atEpochMs: 4_002 }, true);
  const single = singleFor(game.session).placements[0];
  game.act({ type: 'select_cell', cell: single.cell, atEpochMs: 4_003 });
  const placed = game.act(
    {
      type: 'input_digit',
      digit: single.digit,
      moveId: 'player',
      atEpochMs: 4_004,
    },
    true,
  );
  expect(placed.analysisRequest).not.toBeNull();
  game.act({ type: 'erase', moveId: 'erase-player', atEpochMs: 4_005 }, true);
  game.hint(true);
});

test('preparing, revealing and applying another hint never recomputes old hint boards', () => {
  const game = longGame(25);
  const historicalBoards = new Set(
    game.session.history.map(move => move.before.values),
  );
  const solver = jest.spyOn(board, 'createSolverCandidates');
  try {
    game.hint();
    expect(
      solver.mock.calls.some(([values]) => historicalBoards.has(values)),
    ).toBe(false);
  } finally {
    solver.mockRestore();
  }
  expect(game.state.appliedHintSources).toHaveLength(26);
  expect(game.state.growthCandidates).toEqual(
    referenceHintAssistance(game.session).growthCandidates,
  );
});

test('cached history prefixes remain correct when replayed in a different order', () => {
  const game = longGame(20);
  const reordered = {
    ...game.session,
    history: [...game.session.history].reverse(),
  };
  expect(assistance.rebuildHintAssistance(reordered)).toEqual(
    referenceHintAssistance(reordered),
  );
  const restored = JSON.parse(JSON.stringify(game.session)) as GameSession;
  expect(assistance.rebuildHintAssistance(restored)).toEqual(
    referenceHintAssistance(restored),
  );
});
