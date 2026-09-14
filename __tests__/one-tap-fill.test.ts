import {
  GameDefinition,
  GameSession,
  addCandidate,
  createGameSession,
  dispatchGameCommand,
  findSingleCandidatePlacements,
} from '../src/domain';

const puzzle =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const definition: GameDefinition = {
  puzzleId: 'one-tap-fill',
  contentVersion: 4,
  difficultyLevel: 3,
  puzzleFingerprint: puzzle,
  solutionFingerprint: solution,
};

function withNotes(
  manualDigit: 1 | 4 | 5,
  quickDigit?: 1 | 4 | 5,
): GameSession {
  const session = createGameSession({
    sessionId: 'one-tap-session',
    definition,
    startedAtEpochMs: 1_000,
  });
  return {
    ...session,
    state: {
      ...session.state,
      selectedCell: 3,
      candidates: {
        ...session.state.candidates,
        pencilMode: true,
        manualCandidates: session.state.candidates.manualCandidates.map(
          (mask, cell) => (cell === 2 ? addCandidate(0, manualDigit) : mask),
        ),
        quickCandidates: session.state.candidates.quickCandidates.map(
          (mask, cell) =>
            cell === 2 && quickDigit ? addCandidate(0, quickDigit) : mask,
        ),
      },
    },
  };
}

describe('One-tap Fill single candidates', () => {
  test('requires exactly one legal visible note', () => {
    const session = withNotes(4);
    const grid = session.state.candidates.manualCandidates;
    expect([
      ...findSingleCandidatePlacements(session.state.values, grid),
    ]).toEqual([[2, 4]]);
    expect(
      findSingleCandidatePlacements(
        session.state.values,
        grid.map((mask, cell) => (cell === 2 ? addCandidate(mask, 1) : mask)),
      ).has(2),
    ).toBe(false);
    const illegal = withNotes(5);
    expect(
      findSingleCandidatePlacements(
        illegal.state.values,
        illegal.state.candidates.manualCandidates,
      ).has(2),
    ).toBe(false);
  });

  test('fills a manual note despite Pencil mode, records one ordinary move, and undoes it', () => {
    const before = withNotes(4);
    const result = dispatchGameCommand(before, definition, {
      type: 'fill_single_candidate',
      cell: 2,
      moveId: 'fill-note',
      atEpochMs: 1_100,
    });
    expect(result.accepted).toBe(true);
    expect(result.session.state.values[2]).toBe(4);
    expect(result.session.state.selectedCell).toBe(3);
    expect(result.session.state.candidates.pencilMode).toBe(true);
    expect(result.session.history).toHaveLength(1);
    expect(result.session.history[0]).toMatchObject({
      kind: 'place_value',
      cell: 2,
      digit: 4,
      techniqueCode: null,
    });
    const undone = dispatchGameCommand(result.session, definition, {
      type: 'undo',
      atEpochMs: 1_200,
    });
    expect(undone.session.state.values[2]).toBeNull();
    expect(undone.session.state.candidates).toEqual(before.state.candidates);
  });

  test('rechecks the active note set when the queued tap executes', () => {
    const before = withNotes(4, 1);
    const command = {
      type: 'fill_single_candidate' as const,
      cell: 2,
      moveId: 'quick-note',
      atEpochMs: 1_100,
    };
    const quick = {
      ...before,
      state: {
        ...before.state,
        candidates: {
          ...before.state.candidates,
          activeCandidateSource: 'quick' as const,
        },
      },
    };
    const filled = dispatchGameCommand(quick, definition, command);
    expect(filled.session.state.values[2]).toBe(1);
    expect(filled.session.state.errorCount).toBe(1);
    expect(filled.session.history[0].techniqueCode).toBeNull();

    const changed = {
      ...quick,
      state: {
        ...quick.state,
        candidates: {
          ...quick.state.candidates,
          quickCandidates: quick.state.candidates.quickCandidates.map(
            (mask, cell) => (cell === 2 ? addCandidate(mask, 4) : mask),
          ),
        },
      },
    };
    expect(dispatchGameCommand(changed, definition, command).session).toBe(
      changed,
    );
    expect(
      dispatchGameCommand(before, definition, { ...command, cell: 0 }).session,
    ).toBe(before);
  });
});
