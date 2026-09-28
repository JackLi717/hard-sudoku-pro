jest.mock('../src/data/sqlite/nitro-database', () => ({
  NitroSqliteDatabase: { open: jest.fn() },
}));

import { PersistentGameService } from '../src/application/game/persistent-game-service';
import { GameDefinition, GameFocus } from '../src/domain/game/contracts';
import { UserRepository } from '../src/data/user/user-repository';
import {
  deserializeGameState,
  serializeGameState,
} from '../src/data/user/game-serialization';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import { NodeSqliteDatabase } from './helpers/node-sqlite';

const definition: GameDefinition = {
  puzzleId: 'focus',
  contentVersion: 4,
  difficultyLevel: 3,
  difficultyScore: 600,
  puzzleFingerprint: '0'.repeat(81),
  solutionFingerprint:
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
};
const focus: GameFocus = {
  inputMode: 'digit_first',
  selectedDigits: [4, 7],
  focusedDigit: 5,
  multiCells: [2, 3],
  candidateBatchActive: true,
  candidateBatchApplied: true,
};
async function setup() {
  const db = new NodeSqliteDatabase();
  await migrateUserDatabase(db, 1);
  const repo = new UserRepository(db);
  const service = await PersistentGameService.start(
    { sessionId: 'focus-session', definition, startedAtEpochMs: 1 },
    repo,
    'start',
  );
  return { db, repo, service };
}

test('coalesces focus-only updates and restores them without moves or revision changes', async () => {
  const { db, repo, service } = await setup();
  try {
    const save = jest.spyOn(repo, 'persistFocus');
    const timer = { ...service.session.state.timer };
    service.selectCell({ type: 'select_cell', cell: 2, atEpochMs: 2 });
    const first = service.flushFocus();
    service.selectCell({ type: 'select_cell', cell: 3, atEpochMs: 3 });
    service.updateFocus(focus);
    await service.flushFocus();
    await first;
    expect(save).toHaveBeenCalledTimes(1);
    const restored = await new UserRepository(db).restoreUnfinishedSession(
      4,
      1,
    );
    expect(restored.status).toBe('ready');
    if (restored.status !== 'ready') throw Error('Expected saved game');
    const restarted = PersistentGameService.fromRestored(
      restored.session,
      definition,
      repo,
    );
    expect(restarted.session.state).toMatchObject({
      selectedCell: 3,
      focus,
      revision: 0,
      timer,
    });
    expect(restarted.session.history).toEqual([]);
    expect(await db.query('SELECT * FROM game_replay_events')).toEqual([]);
    restarted.selectCell({ type: 'select_cell', cell: null, atEpochMs: 4 });
    restarted.updateFocus({
      ...focus,
      selectedDigits: [],
      focusedDigit: null,
      multiCells: [],
      candidateBatchActive: false,
    });
    await restarted.flushFocus();
    expect(await repo.restoreUnfinishedSession(4, 1)).toMatchObject({
      session: {
        state: {
          selectedCell: null,
          focus: { selectedDigits: [], focusedDigit: null, multiCells: [] },
        },
      },
    });
  } finally {
    db.close();
  }
});

test('a delayed board save cannot overwrite newer focus or change its target cell', async () => {
  const { db, repo, service } = await setup();
  try {
    let release!: () => void;
    let entered!: () => void;
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const started = new Promise<void>(resolve => {
      entered = resolve;
    });
    const persist = repo.persistCommand.bind(repo);
    jest
      .spyOn(repo, 'persistCommand')
      .mockImplementationOnce(async (...args) => {
        entered();
        await gate;
        return persist(...args);
      });
    service.selectCell({ type: 'select_cell', cell: 0, atEpochMs: 2 });
    const move = service.dispatch(
      { type: 'input_digit', digit: 5, moveId: 'move', atEpochMs: 3 },
      'move',
    );
    await started;
    service.selectCell({ type: 'select_cell', cell: 8, atEpochMs: 4 });
    service.updateFocus(focus);
    const save = service.flushFocus();
    release();
    await Promise.all([move, save]);
    const restored = await repo.restoreUnfinishedSession(4, 5);
    expect(restored).toMatchObject({
      session: { state: { selectedCell: 8, focus, revision: 1 } },
    });
    if (restored.status !== 'ready') throw Error('Expected saved game');
    expect(restored.session.state.values[0]).toBe(5);
    expect(restored.session.state.values[8]).toBeNull();
  } finally {
    db.close();
  }
});

test('retains focus edits made during a focus save and retries a failed save', async () => {
  const { db, repo, service } = await setup();
  try {
    service.updateFocus(focus);
    const persist = repo.persistFocus.bind(repo);
    jest.spyOn(repo, 'persistFocus').mockImplementationOnce(async state => {
      service.updateFocus({ ...focus, selectedDigits: [9] });
      await persist(state);
    });
    await service.flushFocus();
    expect(await repo.restoreUnfinishedSession(4, 1)).toMatchObject({
      session: { state: { focus: { selectedDigits: [9] } } },
    });
    jest
      .spyOn(repo, 'persistFocus')
      .mockRejectedValueOnce(Error('disk failure'));
    service.updateFocus({ ...focus, selectedDigits: [] });
    await expect(service.flushFocus()).rejects.toThrow('disk failure');
    await service.flushFocus();
    expect(await repo.restoreUnfinishedSession(4, 1)).toMatchObject({
      session: { state: { focus: { selectedDigits: [] } } },
    });
  } finally {
    db.close();
  }
});

test('validates focus serialization without changing the development schema version', async () => {
  const { db, service } = await setup();
  try {
    const state = { ...service.session.state, focus };
    expect(deserializeGameState(serializeGameState(state)).focus).toEqual(
      focus,
    );
    for (const invalid of [
      { ...focus, selectedDigits: [0] },
      { ...focus, selectedDigits: [4, 4] },
      { ...focus, multiCells: [81] },
      { ...focus, focusedDigit: 10 },
    ]) {
      expect(() =>
        deserializeGameState(JSON.stringify({ ...state, focus: invalid })),
      ).toThrow('invalid focus');
    }
  } finally {
    db.close();
  }
});
