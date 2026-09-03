import {
  acceptBehaviorAnalysisResult,
  createBehaviorRecognitionState,
  observeAcceptedGameCommand,
} from '../src/application/technique-recognition/behavior-adapter';
import {
  rebuildHintAssistance,
  sourceAssists,
  singles,
} from '../src/application/technique-recognition/hint-assistance';
import {
  boardFromFingerprint,
  createBoardFingerprint,
  createSolverCandidates,
  digitsFromMask,
  removeCandidate,
} from '../src/domain/sudoku/board';
import {
  kiteGame,
  kiteDefinition,
  kiteHint,
} from './helpers/ipad-hint-assistance';
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
import { TECHNIQUES } from '../src/domain/hints/techniques';
import { Digit } from '../src/domain/sudoku/contracts';

// Frozen geometry from Android session-1788440018226-w21duc9r, moves 44–59.
const definition: GameDefinition = {
  puzzleId: 'hint-dependency-real',
  contentVersion: 4,
  difficultyLevel: 3,
  puzzleFingerprint:
    '000000400805000620063074890378000000100039000000000006900000008000402300000300070',
  solutionFingerprint:
    '791628453845913627263574891378246915156739284429851736932167548517482369684395172',
};
const initialBoard =
  '791000453845913627263574891378040910106039084409000036932000048517482369684390070';
function harness() {
  let session = createGameSession({
    definition,
    sessionId: 'dependent',
    startedAtEpochMs: 1000,
  });
  const values = boardFromFingerprint(initialBoard);
  session = {
    ...session,
    state: {
      ...session.state,
      values,
      candidates: {
        ...session.state.candidates,
        quickCandidates: createSolverCandidates(values),
      },
    },
  };
  let state = createBehaviorRecognitionState(session),
    time = 2000;
  function act(command: GameCommand) {
    const result = dispatchGameCommand(session, definition, command);
    expect(result.accepted).toBe(true);
    const observation = observeAcceptedGameCommand(
      state,
      session,
      command,
      result,
    );
    state = observation.state;
    session = result.session;
    const q = observation.analysisRequest;
    if (q) {
      const accepted = acceptBehaviorAnalysisResult(
        state,
        {
          ...q,
          status: 'matched',
          candidateTechniques: [
            {
              technique: 'nakedSingle',
              humanCost: 100,
              directPlacementMatch: true,
              oneHopPlacementMatch: false,
              matchingOpportunityCount: 1,
            },
          ],
          diagnostics: {
            opportunityCount: 1,
            opportunitySetComplete: true,
            usedExpandedSearch: false,
            reachedEnumerationLimitTechniques: [],
          },
        },
        session,
      );
      state = accepted.state;
      return { ...observation, attribution: accepted.diagnostic.attribution };
    }
    return { ...observation, attribution: null };
  }
  function place(cell: number, digit: Digit, fullHouse = false) {
    if (fullHouse)
      return act({
        type: 'complete_full_house',
        cell,
        moveId: `move-${time}`,
        atEpochMs: time++,
      });
    act({ type: 'select_cell', cell, atEpochMs: time++ });
    return act({
      type: 'input_digit',
      digit,
      moveId: `move-${time}`,
      atEpochMs: time++,
    });
  }
  function hint(
    techniqueCode: HintStep['techniqueCode'],
    placements: HintStep['placements'],
    eliminations: HintStep['eliminations'],
  ) {
    const step: HintStep = {
      contractVersion: 1,
      boardFingerprint: createBoardFingerprint(session.state.values),
      techniqueCode,
      difficultyLevel: TECHNIQUES.find(t => t.code === techniqueCode)!.level,
      focusCells: [],
      focusRegions: [],
      premiseCandidates: [],
      placements,
      eliminations,
      explanationKey: `hint.${techniqueCode}`,
      explanationParams: {},
    };
    act({ type: 'reveal_hint', step, availableCredits: 1, atEpochMs: time++ });
    act({ type: 'apply_hint', moveId: `hint-${time}`, atEpochMs: time++ });
  }
  hint(
    'hiddenPair',
    [],
    [
      { cell: 48, digit: 2 },
      { cell: 48, digit: 7 },
      { cell: 50, digit: 5 },
      { cell: 50, digit: 7 },
    ],
  );
  hint('hiddenSingle', [{ cell: 39, digit: 7 }], []);
  place(59, 7);
  hint('hiddenSingle', [{ cell: 51, digit: 7 }], []);
  hint('xWing', [], [{ cell: 78, digit: 5 }]);
  hint('bugPlusOne', [{ cell: 3, digit: 6 }], []);
  return {
    act,
    place,
    get session() {
      return session;
    },
    get state() {
      return state;
    },
    restore() {
      session = JSON.parse(JSON.stringify(session)) as GameSession;
      state = createBehaviorRecognitionState(session);
    },
    undo() {
      act({ type: 'undo', atEpochMs: time++ });
    },
  };
}
const target = { kind: 'placement' as const, cell: 49, digit: 5 as const };
const bugSource = (h: ReturnType<typeof harness>) =>
  h.state.knownHintSources.find(s => s.technique === 'bugPlusOne')!;

test.each([false, true])(
  'real second-layer singles inherit assistance, including cold restore=%s',
  restore => {
    const h = harness();
    expect(sourceAssists(bugSource(h), target)).toBe(false);
    expect(bugSource(h).dependentEffects).toBeUndefined();
    h.place(5, 8);
    h.place(4, 2, true);
    h.place(30, 2);
    if (restore) h.restore();
    const first = h.place(49, 5);
    expect(
      first.analysisRequest?.hintAssistance?.affectedEffects,
    ).toContainEqual(target);
    expect(first.attribution).toMatchObject({
      automaticTechnique: null,
      selectedTechnique: null,
      attributionEligibility: { status: 'ineligible', reason: 'hint_polluted' },
    });
    h.place(58, 6, true);
    const second = h.place(50, 1);
    expect(
      second.analysisRequest?.hintAssistance?.affectedEffects,
    ).toContainEqual({ kind: 'placement', cell: 50, digit: 1 });
    expect(second.attribution?.automaticTechnique).toBeNull();
    expect(
      bugSource(h).dependentEffects?.every(d =>
        h.session.history.some(m => m.id === d.moveId),
      ),
    ).toBe(true);
  },
);

test('no hypothetical future play; undo removes the only parent path and redo reconstructs it', () => {
  const h = harness();
  const before = h.session;
  h.place(30, 2);
  expect(sourceAssists(bugSource(h), target)).toBe(true);
  const after = h.session;
  h.undo();
  expect(sourceAssists(bugSource(h), target)).toBe(false);
  h.restore();
  expect(sourceAssists(bugSource(h), target)).toBe(false);
  h.place(30, 2);
  expect(sourceAssists(bugSource(h), target)).toBe(true);
  expect(
    rebuildHintAssistance(before).knownHintSources.find(
      s => s.technique === 'bugPlusOne',
    )?.dependentEffects,
  ).toBeUndefined();
  expect(
    rebuildHintAssistance(JSON.parse(JSON.stringify(after))).knownHintSources,
  ).toEqual(rebuildHintAssistance(after).knownHintSources);
});

test('missing history and foreign sessions cannot resurrect remembered derived paths', () => {
  const h = harness();
  h.place(30, 2);
  const remembered = h.state.knownHintSources;
  const missing = rebuildHintAssistance(
    { ...h.session, history: [] },
    remembered,
  );
  expect(missing.knownHintSources.some(s => sourceAssists(s, target))).toBe(
    false,
  );
  const foreign = rebuildHintAssistance(
    { ...h.session, state: { ...h.session.state, sessionId: 'other' } },
    remembered,
  );
  expect(foreign.knownHintSources.some(s => sourceAssists(s, target))).toBe(
    false,
  );
});

test('a mixed batch cannot give an old source credit for another elimination', () => {
  let session = kiteGame();
  const act = (command: GameCommand) => {
    const result = dispatchGameCommand(session, kiteDefinition, command);
    expect(result.accepted).toBe(true);
    session = result.session;
  };
  act({
    type: 'reveal_hint',
    step: kiteHint,
    availableCredits: 1,
    atEpochMs: 2000,
  });
  const original = rebuildHintAssistance(session).knownHintSources[0];
  const masks = createSolverCandidates(session.state.values);
  const before = singles(masks);
  // Deliberate contract fixture: choose a separate sound elimination which
  // creates a single, not a claim that a native kite has this combined outcome.
  const extra = masks
    .flatMap((mask, cell) =>
      digitsFromMask(mask).map(digit => ({ cell, digit })),
    )
    .find(e => {
      if (Number(kiteDefinition.solutionFingerprint[e.cell]) === e.digit)
        return false;
      const after = [...masks];
      after[e.cell] = removeCandidate(after[e.cell], e.digit);
      return singles(after).some(
        s =>
          s.cell === e.cell &&
          !sourceAssists(original, s) &&
          !before.some(b => b.cell === s.cell && b.digit === s.digit),
      );
    })!;
  expect(extra).toBeDefined();
  act({ type: 'dismiss_hint', atEpochMs: 2001 });
  act({
    type: 'reveal_hint',
    step: { ...kiteHint, eliminations: [...kiteHint.eliminations, extra] },
    availableCredits: 1,
    atEpochMs: 2002,
  });
  act({ type: 'apply_hint', moveId: 'mixed', atEpochMs: 2003 });
  const old = rebuildHintAssistance(session).knownHintSources.find(
    s => s.sourceId === original.sourceId,
  )!;
  expect(
    old.dependentEffects?.some(d => d.effect.cell === extra.cell) ?? false,
  ).toBe(false);
});
