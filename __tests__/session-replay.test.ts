import {
  buildSessionReplay,
  replayRecoverability,
} from '../src/application/game/session-replay';
import {
  replayChanges,
  replayExplanationRequest,
  replayActionEffects,
} from '../src/application/game/replay-explanations';
import {
  createGameSession,
  dispatchGameCommand,
} from '../src/domain/game/engine';
import { GameCommand, GameDefinition } from '../src/domain/game/contracts';

const definition: GameDefinition = {
  puzzleId: 'replay',
  contentVersion: 1,
  difficultyLevel: 1,
  puzzleFingerprint: '0'.repeat(81),
  solutionFingerprint:
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
};
export function replayFixture() {
  let session = createGameSession({
    sessionId: 's',
    definition,
    startedAtEpochMs: 1,
  });
  const command = (c: GameCommand) => {
    session = dispatchGameCommand(session, definition, c).session;
  };
  command({ type: 'select_cell', cell: 0, atEpochMs: 2 });
  command({ type: 'input_digit', digit: 5, moveId: 'm', atEpochMs: 3 });
  return session;
}

test('replays snapshots without inventing undo events or player deletions', () => {
  const session = replayFixture();
  const replay = buildSessionReplay(session);
  expect(replay.coverage).toBe('complete_active_history');
  expect(replay.frames).toHaveLength(2);
  expect(replay.frames[1].snapshot.values[0]).toBe(5);
  expect(replayChanges(session.history[0])).toEqual([
    { kind: 'place', cell: 0, digit: 5 },
  ]);
  expect(replayActionEffects(session.history[0])).toEqual([
    { kind: 'placement', cell: 0, digit: 5 },
  ]);
  expect(
    replayExplanationRequest(session, session.history[0]).growthCandidates[1],
  ).toBe(511);
});

test('undo sequence gaps and mode changes still permit the retained active path', () => {
  let session = replayFixture();
  session = dispatchGameCommand(session, definition, {
    type: 'undo',
    atEpochMs: 4,
  }).session;
  session = dispatchGameCommand(session, definition, {
    type: 'set_pencil_mode',
    enabled: true,
    atEpochMs: 5,
  }).session;
  session = dispatchGameCommand(session, definition, {
    type: 'input_digit',
    digit: 5,
    moveId: 'note',
    atEpochMs: 6,
  }).session;
  session = dispatchGameCommand(session, definition, {
    type: 'input_digit',
    digit: 5,
    moveId: 'remove',
    atEpochMs: 7,
  }).session;
  expect(session.history[0].sequence).toBeGreaterThan(1);
  expect(buildSessionReplay(session).coverage).toBe('complete_active_history');
  expect(replayChanges(session.history[2 - 1])).toEqual([
    { kind: 'remove', cell: 0, digit: 5 },
  ]);
  expect(replayActionEffects(session.history[0])).toEqual([]);
  expect(replayActionEffects(session.history[1])).toEqual([
    { kind: 'elimination', cell: 0, digit: 5 },
  ]);
});

test('broken board continuity degrades to the saved final board in list and detail', () => {
  const session = replayFixture();
  const bad = {
    ...session,
    state: { ...session.state, values: [...session.state.givens] },
  };
  const replay = buildSessionReplay(bad);
  expect(replay.coverage).toBe('inconsistent_history');
  expect(replay.frames).toHaveLength(1);
  expect(replay.frames[0].snapshot.values).toEqual(bad.state.values);
  expect(replayRecoverability(bad)).toBe('final_snapshot');
});

test('missing opening and mismatched session IDs cannot claim complete history', () => {
  const session = replayFixture();
  expect(
    replayRecoverability({
      ...session,
      history: [{ ...session.history[0], before: session.history[0].after }],
    }),
  ).toBe('final_snapshot');
  expect(
    replayRecoverability({
      ...session,
      history: [{ ...session.history[0], sessionId: 'other' }],
    }),
  ).toBe('final_snapshot');
});

test('legacy and missing games have honest availability', () => {
  const session = createGameSession({
    sessionId: 'legacy',
    definition,
    startedAtEpochMs: 1,
  });
  expect(buildSessionReplay(session).frames[0].snapshot.values).toEqual(
    session.state.values,
  );
  expect(replayRecoverability(session)).toBe('final_snapshot');
  expect(replayRecoverability(null)).toBe('unavailable');
});
