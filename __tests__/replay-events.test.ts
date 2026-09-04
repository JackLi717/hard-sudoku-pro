jest.mock('../src/data/sqlite/nitro-database', () => ({
  NitroSqliteDatabase: { open: jest.fn() },
}));
import { PersistentGameService } from '../src/application/game/persistent-game-service';
import {
  buildSessionReplay,
  replayRecoverability,
} from '../src/application/game/session-replay';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import { UserRepository } from '../src/data/user/user-repository';
import { GameDefinition } from '../src/domain/game/contracts';
import {
  NodeSqliteDatabase,
  FaultInjectingDatabase,
} from './helpers/node-sqlite';
import {
  kiteDefinition,
  kiteHint,
  kiteBoard,
} from './helpers/ipad-hint-assistance';

const definition: GameDefinition = {
  puzzleId: 'events',
  contentVersion: 1,
  difficultyLevel: 1,
  puzzleFingerprint: '0'.repeat(81),
  solutionFingerprint:
    '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
};
async function setup(def = definition) {
  const db = new NodeSqliteDatabase();
  await migrateUserDatabase(db, 1);
  const repo = new UserRepository(db);
  const service = await PersistentGameService.start(
    { sessionId: 'events', definition: def, startedAtEpochMs: 1 },
    repo,
    'start',
  );
  return { db, repo, service };
}

test('rapid place, undo target, replacement and duplicate delivery retain the actual ordered timeline', async () => {
  const { db, repo, service } = await setup();
  try {
    service.selectCell({ type: 'select_cell', cell: 0, atEpochMs: 2 });
    const command = {
      type: 'input_digit' as const,
      digit: 5 as const,
      moveId: 'first',
      atEpochMs: 3,
    };
    const first = service.dispatch(command, 'first-event');
    const duplicate = service.dispatch(command, 'first-event');
    const undo = service.dispatch({ type: 'undo', atEpochMs: 3 }, 'undo');
    const replacement = service.dispatch(
      { ...command, moveId: 'replacement' },
      'replacement-event',
    );
    await Promise.all([first, duplicate, undo, replacement]);
    const saved = (await repo.readReplaySession('events'))!;
    const replay = buildSessionReplay(saved);
    expect(replay.coverage).toBe('complete_event_history');
    expect(saved.replayEvents?.map(e => e.kind)).toEqual([
      'input_digit',
      'undo',
      'input_digit',
    ]);
    expect(saved.replayEvents?.[1].targetMoveId).toBe('first');
    expect(replay.frames.map(f => f.snapshot.values[0])).toEqual([
      null,
      5,
      null,
      5,
    ]);
    expect(saved.history.map(m => m.id)).toEqual(['replacement']);
    expect(
      await repo.persistCommand(await first, 'first-event', 0),
    ).toMatchObject({ alreadyCommitted: true });
    expect(await db.query('SELECT * FROM game_replay_events')).toHaveLength(3);
    expect(replay.frames[2].move).toBeNull();
  } finally {
    db.close();
  }
});

test('automatic drafts, mode/source changes and resumed commands preserve both candidate grids', async () => {
  const { db, repo, service } = await setup();
  try {
    await service.dispatch(
      {
        type: 'generate_quick_draft',
        confirmed: true,
        availableCredits: 3,
        atEpochMs: 2,
      },
      'draft',
    );
    await service.dispatch(
      { type: 'set_candidate_source', source: 'manual', atEpochMs: 3 },
      'source',
    );
    await service.dispatch(
      { type: 'set_pencil_mode', enabled: false, atEpochMs: 4 },
      'pencil',
    );
    const restored = await repo.restoreUnfinishedSession(1, 10);
    if (restored.status !== 'ready') throw new Error('Missing restore');
    const resumed = PersistentGameService.fromRestored(
      restored.session,
      definition,
      repo,
    );
    await resumed.dispatch(
      {
        type: 'generate_quick_draft',
        confirmed: true,
        availableCredits: 2,
        atEpochMs: 11,
      },
      'regenerate',
    );
    const saved = (await repo.readReplaySession('events'))!;
    expect(buildSessionReplay(saved).coverage).toBe('complete_event_history');
    expect(saved.replayEvents?.map(e => e.kind)).toEqual([
      'generate_quick_draft',
      'set_candidate_source',
      'set_pencil_mode',
      'generate_quick_draft',
    ]);
    expect(saved.replayEvents?.every(e => e.move === null)).toBe(true);
    expect(saved.replayEvents?.[1].after.candidates.activeCandidateSource).toBe(
      'manual',
    );
    expect(saved.replayEvents?.[0].after.candidates.quickCandidates[0]).toBe(
      511,
    );
    expect((await repo.readWallet()).quick_pencil.balance).toBe(2);
    await expect(
      resumed.dispatch(
        { type: 'set_pencil_mode', enabled: true, atEpochMs: 12 },
        'draft',
      ),
    ).rejects.toThrow('another game state');
    expect(resumed.session.state.revision).toBe(saved.state.revision);
  } finally {
    db.close();
  }
});

test('hint shown without application survives restore separately from a later applied hint', async () => {
  const { db, repo, service } = await setup({
    ...kiteDefinition,
    puzzleFingerprint: kiteBoard,
  });
  try {
    await service.dispatch(
      {
        type: 'reveal_hint',
        step: kiteHint,
        availableCredits: 5,
        atEpochMs: 2,
      },
      'shown',
    );
    await service.dispatch({ type: 'dismiss_hint', atEpochMs: 3 }, 'dismissed');
    let saved = (await repo.readReplaySession('events'))!;
    expect(saved.history).toHaveLength(0);
    expect(saved.state.hintExposures).toHaveLength(1);
    expect(buildSessionReplay(saved).coverage).toBe('complete_event_history');
    expect(saved.replayEvents?.[0].hint).toEqual(kiteHint);
    await service.dispatch(
      {
        type: 'reveal_hint',
        step: kiteHint,
        availableCredits: 4,
        atEpochMs: 4,
      },
      'shown-again',
    );
    await service.dispatch(
      { type: 'apply_hint', moveId: 'hint-move', atEpochMs: 5 },
      'applied',
    );
    saved = (await repo.readReplaySession('events'))!;
    expect(buildSessionReplay(saved).coverage).toBe('complete_event_history');
    expect(saved.replayEvents?.map(e => e.kind)).toEqual([
      'reveal_hint',
      'dismiss_hint',
      'reveal_hint',
      'apply_hint',
    ]);
    expect(saved.history).toHaveLength(1);
    expect((await repo.readWallet()).smart_hint.balance).toBe(3);
  } finally {
    db.close();
  }
});

test('event insert failure rolls back state, credit, receipt, and is retryable', async () => {
  const { db, repo, service } = await setup();
  try {
    const faulty = new UserRepository(
      new FaultInjectingDatabase(db, 'INSERT INTO game_replay_events'),
    );
    const restored = PersistentGameService.fromRestored(
      service.session,
      definition,
      faulty,
    );
    const command = {
      type: 'generate_quick_draft' as const,
      confirmed: true,
      availableCredits: 3,
      atEpochMs: 2,
    };
    await expect(restored.dispatch(command, 'draft')).rejects.toThrow();
    expect(restored.session.state.revision).toBe(0);
    expect((await repo.readWallet()).quick_pencil.balance).toBe(3);
    expect(await db.query('SELECT * FROM game_replay_events')).toHaveLength(0);
    expect(
      await db.query(
        "SELECT * FROM game_action_receipts WHERE event_id = 'draft'",
      ),
    ).toHaveLength(0);
    await service.dispatch(command, 'draft');
    expect(
      buildSessionReplay((await repo.readReplaySession('events'))!).coverage,
    ).toBe('complete_event_history');
  } finally {
    db.close();
  }
});

test('legacy snapshots expose unknown candidate updates and damaged events fall back without hiding the game', async () => {
  const { db, repo, service } = await setup();
  try {
    service.selectCell({ type: 'select_cell', cell: 0, atEpochMs: 2 });
    await service.dispatch(
      { type: 'input_digit', digit: 5, moveId: 'first', atEpochMs: 3 },
      'first',
    );
    await service.dispatch(
      {
        type: 'generate_quick_draft',
        confirmed: true,
        availableCredits: 3,
        atEpochMs: 4,
      },
      'draft',
    );
    service.selectCell({ type: 'select_cell', cell: 1, atEpochMs: 5 });
    await service.dispatch(
      { type: 'input_digit', digit: 3, moveId: 'second', atEpochMs: 6 },
      'second',
    );
    await service.dispatch({ type: 'abandon', atEpochMs: 7 }, 'end');
    const saved = (await repo.readReplaySession('events'))!;
    const legacy = { ...saved, replayEvents: undefined };
    const replay = buildSessionReplay(legacy);
    expect(replay.coverage).toBe('complete_active_history');
    expect(replay.frames.filter(f => f.candidateUpdate)).toHaveLength(1);
    expect(replay.frames.find(f => f.candidateUpdate)?.move).toBeNull();
    const snapshotBefore = JSON.stringify(
      await db.query('SELECT * FROM game_sessions'),
    );
    await db.run(
      "UPDATE game_replay_events SET event_json = '{}' WHERE id = 'draft'",
    );
    expect(replayRecoverability(await repo.readReplaySession('events'))).toBe(
      'action_history',
    );
    expect((await repo.listReplaySessions())[0].recoverability).toBe(
      'action_history',
    );
    expect(JSON.stringify(await db.query('SELECT * FROM game_sessions'))).toBe(
      snapshotBefore,
    );
  } finally {
    db.close();
  }
});

test('retained games begin recording at their actual revision and never manufacture an earlier timeline', async () => {
  const { db, repo, service } = await setup();
  try {
    service.selectCell({ type: 'select_cell', cell: 0, atEpochMs: 2 });
    await service.dispatch(
      { type: 'input_digit', digit: 5, moveId: 'old', atEpochMs: 3 },
      'old',
    );
    const legacy = {
      ...service.session,
      state: {
        ...service.session.state,
        replayRecordingSinceRevision: undefined,
      },
    };
    // Represent a retained pre-event archive with an existing effective move.
    await db.run('DELETE FROM game_replay_events');
    await db.run('UPDATE game_sessions SET state_json = ? WHERE id = ?', [
      JSON.stringify(legacy.state),
      'events',
    ]);
    const resumed = PersistentGameService.fromRestored(
      legacy,
      definition,
      repo,
    );
    await resumed.dispatch(
      { type: 'set_pencil_mode', enabled: true, atEpochMs: 4 },
      'new',
    );
    const saved = (await repo.readReplaySession('events'))!;
    expect(saved.state.replayRecordingSinceRevision).toBe(1);
    expect(saved.replayEvents).toHaveLength(1);
    expect(buildSessionReplay(saved).coverage).toBe('complete_active_history');
    expect(
      buildSessionReplay(saved).frames.some(f => f.event?.kind === 'undo'),
    ).toBe(false);
  } finally {
    db.close();
  }
});
