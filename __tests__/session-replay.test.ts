import { buildSessionReplay } from '../src/application/game/session-replay';
import { createGameSession, dispatchGameCommand } from '../src/domain/game/engine';
import { GameDefinition } from '../src/domain/game/contracts';

const definition: GameDefinition = {
  puzzleId: 'replay', contentVersion: 1, difficultyLevel: 1,
  puzzleFingerprint: '0'.repeat(81),
  solutionFingerprint: '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
};

test('replays durable snapshots without inventing undo events', () => {
  let session = createGameSession({ sessionId: 's', definition, startedAtEpochMs: 1 });
  session = dispatchGameCommand(session, definition, { type: 'select_cell', cell: 0, atEpochMs: 2 }).session;
  const placed = dispatchGameCommand(session, definition, { type: 'input_digit', digit: 5, moveId: 'm', atEpochMs: 3 });
  const replay = buildSessionReplay(placed.session);
  expect(replay.coverage).toBe('complete_active_history');
  expect(replay.frames).toHaveLength(2);
  expect(replay.frames[1].snapshot.values[0]).toBe(5);
  expect(replay.note).toContain('undo');
});

test('refuses a discontinuous history rather than guessing a board', () => {
  const session = createGameSession({ sessionId: 's', definition, startedAtEpochMs: 1 });
  const bad = { ...session, history: [{ id: 'bad', sessionId: 's', sequence: 2, kind: 'place_value' as const, cell: 0, digit: 1 as const, techniqueCode: null, appliedHint: null, before: { values: session.state.values, candidates: session.state.candidates, incorrectCells: [], errorCount: 0, status: 'active' as const, completionKind: null }, after: { values: session.state.values, candidates: session.state.candidates, incorrectCells: [], errorCount: 0, status: 'active' as const, completionKind: null }, createdAtEpochMs: 1 }] };
  expect(buildSessionReplay(bad).coverage).toBe('inconsistent_history');
});

test('opens a legacy game with only its final saved snapshot', () => {
  const session = createGameSession({ sessionId: 'legacy', definition, startedAtEpochMs: 1 });
  const replay = buildSessionReplay(session);
  expect(replay.coverage).toBe('final_snapshot_only');
  expect(replay.frames).toHaveLength(1);
  expect(replay.frames[0].snapshot.values).toEqual(session.state.values);
});
