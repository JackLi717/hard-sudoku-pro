import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
jest.mock('../src/data/sqlite/nitro-database', () => ({
  NitroSqliteDatabase: { open: jest.fn() },
}));
import { PersistentGameService } from '../src/application/game/persistent-game-service';
import { UserRepository } from '../src/data/user/user-repository';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import {
  deserializeGameState,
  serializeGameState,
} from '../src/data/user/game-serialization';
import {
  createBehaviorRecognitionState,
  observeAcceptedGameCommand,
} from '../src/application/technique-recognition/behavior-adapter';
import {
  attributionFromAnalysis,
  GrowthAnalysisRequest,
} from '../src/domain/technique-recognition/contracts';
import { dispatchGameCommand } from '../src/domain/game/engine';
import { hasCandidate } from '../src/domain/sudoku/board';
import {
  kiteDefinition,
  kiteGame,
  kiteHint,
} from './helpers/ipad-hint-assistance';
import {
  FaultInjectingDatabase,
  NodeSqliteDatabase,
} from './helpers/node-sqlite';

function result(request: GrowthAnalysisRequest) {
  return attributionFromAnalysis(
    {
      ...request,
      status: 'matched',
      candidateTechniques: [
        {
          technique: 'hiddenSingle',
          humanCost: 1,
          matchingOpportunityCount: 1,
          directPlacementMatch: true,
          oneHopPlacementMatch: false,
        },
      ],
      diagnostics: {
        opportunityCount: 1,
        opportunitySetComplete: true,
        usedExpandedSearch: false,
        reachedEnumerationLimitTechniques: [],
      },
    },
    request,
  );
}

test.each(['dismiss', 'undo', 'apply'] as const)(
  '%s hint exposure survives a closed SQLite connection and fresh observer',
  async mode => {
    const dir = mkdtempSync(join(tmpdir(), 'hint-exposure-'));
    let database = new NodeSqliteDatabase(
      new DatabaseSync(join(dir, 'user.sqlite')),
    );
    try {
      await migrateUserDatabase(database, 100);
      let repository = new UserRepository(database);
      await repository.createSession(kiteGame(), 'start');
      const service = PersistentGameService.fromRestored(
        kiteGame(),
        kiteDefinition,
        repository,
      );
      await service.dispatch(
        {
          type: 'reveal_hint',
          step: kiteHint,
          premium: true,
          availableCredits: 0,
          atEpochMs: 2_000,
        },
        'show',
      );
      if (mode !== 'dismiss')
        await service.dispatch(
          { type: 'apply_hint', moveId: 'hint', atEpochMs: 2_100 },
          'apply',
        );
      if (mode === 'undo')
        await service.dispatch({ type: 'undo', atEpochMs: 2_200 }, 'undo');
      if (mode === 'dismiss')
        await service.dispatch(
          { type: 'dismiss_hint', atEpochMs: 2_200 },
          'dismiss',
        );
      expect(service.session.state.hintExposures).toHaveLength(1);
      database.close();
      const child = spawnSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          'import {DatabaseSync} from "node:sqlite"; const db=new DatabaseSync(process.argv[1],{readOnly:true}); console.log(db.prepare("SELECT state_json FROM game_sessions").get().state_json); db.close();',
          join(dir, 'user.sqlite'),
        ],
        { encoding: 'utf8' },
      );
      expect(child.status).toBe(0);
      expect(deserializeGameState(child.stdout).hintExposures).toHaveLength(1);
      database = new NodeSqliteDatabase(
        new DatabaseSync(join(dir, 'user.sqlite')),
      );
      repository = new UserRepository(database);
      const restored = await repository.restoreUnfinishedSession(4, 3_000);
      expect(restored.status).toBe('ready');
      if (restored.status !== 'ready') throw new Error('Restore failed');
      const session = {
        ...restored.session,
        state: { ...restored.session.state, selectedCell: 77 },
      };
      const state = createBehaviorRecognitionState(session);
      expect(state.hintExposureComplete).toBe(true);
      expect(hasCandidate(state.growthCandidates[32], 3)).toBe(
        mode !== 'apply',
      );
      const command = {
        type: 'input_digit' as const,
        digit: 3 as const,
        moveId: 'player',
        atEpochMs: 3_100,
      };
      const accepted = dispatchGameCommand(session, kiteDefinition, command);
      expect(accepted.accepted).toBe(true);
      const request = observeAcceptedGameCommand(
        state,
        session,
        command,
        accepted,
      ).analysisRequest!;
      expect(request.hintAssistance?.affectedEffects).toContainEqual({
        kind: 'placement',
        cell: 77,
        digit: 3,
      });
      expect(result(request).attributionEligibility).toEqual({
        status: 'ineligible',
        reason: 'hint_polluted',
      });
      // Exposure belongs to this session only; a fresh game has no remembered hint.
      expect(
        createBehaviorRecognitionState(kiteGame()).knownHintSources,
      ).toEqual([]);
    } finally {
      database.close();
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

test('a failed reveal save rolls back the hint, its exposure and its charge together', async () => {
  const database = new NodeSqliteDatabase();
  try {
    await migrateUserDatabase(database, 100);
    const repository = new UserRepository(database);
    await repository.createSession(kiteGame(), 'start');
    const failing = new UserRepository(
      new FaultInjectingDatabase(database, 'UPDATE game_sessions SET'),
    );
    const service = PersistentGameService.fromRestored(
      kiteGame(),
      kiteDefinition,
      failing,
    );
    const before = await repository.readWallet();
    await expect(
      service.dispatch(
        {
          type: 'reveal_hint',
          step: kiteHint,
          availableCredits: 10,
          atEpochMs: 2_000,
        },
        'show',
      ),
    ).rejects.toThrow('Injected SQLite failure');
    expect(service.session.state.activeHint).toBeNull();
    expect(service.session.state.hintExposures).toEqual([]);
    expect(await repository.readWallet()).toEqual(before);
    const restored = await repository.restoreUnfinishedSession(4, 3_000);
    if (restored.status !== 'ready') throw new Error('Restore failed');
    expect(restored.session.state.hintExposures).toEqual([]);
  } finally {
    database.close();
  }
});

test('missing historical exposure is unknown, never reconstructed as an empty hint history', () => {
  const state = JSON.parse(serializeGameState(kiteGame().state));
  delete state.hintExposures;
  state.hintUseCount = 1;
  state.usedSmartHint = true;
  const restored = {
    ...kiteGame(),
    state: deserializeGameState(JSON.stringify(state)),
  };
  expect(restored.state.hintExposures).toBeNull();
  const recognition = createBehaviorRecognitionState(restored);
  expect(recognition.hintExposureComplete).toBe(false);
  const before = {
    ...restored,
    state: { ...restored.state, selectedCell: 27 },
  };
  const command = {
    type: 'input_digit' as const,
    digit: 9 as const,
    moveId: 'p',
    atEpochMs: 2_000,
  };
  const accepted = dispatchGameCommand(before, kiteDefinition, command);
  const request = observeAcceptedGameCommand(
    recognition,
    before,
    command,
    accepted,
  ).analysisRequest!;
  expect(result(request).automaticTechnique).toBeNull();
  expect(result(request).attributionEligibility.status).toBe('ineligible');
});

test('malformed exposure evidence is rejected during restore', () => {
  const state = {
    ...kiteGame().state,
    hintUseCount: 1,
    hintExposures: [{ step: kiteHint, candidates: [] }],
  };
  expect(() => deserializeGameState(JSON.stringify(state))).toThrow(
    'hintExposures',
  );
});
