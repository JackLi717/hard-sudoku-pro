jest.mock('../src/data/sqlite/nitro-database', () => ({
  NitroSqliteDatabase: { open: jest.fn() },
}));

import {
  GameAccessAdapter,
  OfflineContentStore,
  OfflineGameCoordinator,
  StartOpportunity,
} from '../src/application';
import { UserRepository } from '../src/data/user/user-repository';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import { PuzzleRecord } from '../src/domain/content/contracts';
import { HintEngine } from '../src/domain/hints/engine';
import { HintEngineRequest } from '../src/domain/hints/contracts';
import { DifficultyLevel } from '../src/domain/hints/techniques';
import { NodeSqliteDatabase } from './helpers/node-sqlite';

const solution =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
const almostSolved =
  '534678910672195348198342567859761423426853791713924856961537284287419635345286179';

function puzzle(id: string, difficultyLevel: DifficultyLevel): PuzzleRecord {
  return {
    id,
    puzzle: almostSolved,
    solution,
    difficultyLevel,
    difficultyScore: difficultyLevel * 100,
    hardestTechnique: 'fullHouse',
    ratingVersion: 'test',
    source: 'test',
    contentVersion: 4,
    checksum: `checksum-${id}`,
    enabled: true,
  };
}

class FakeContent implements OfflineContentStore {
  readonly metadata = { contentVersion: 4 };
  readonly puzzles = [
    puzzle('level-1-a', 1),
    puzzle('level-1-b', 1),
    puzzle('level-2-a', 2),
    puzzle('level-3-a', 3),
    puzzle('level-4-a', 4),
    puzzle('level-5-a', 5),
  ];

  async getPuzzle(id: string): Promise<PuzzleRecord | null> {
    return this.puzzles.find(item => item.id === id) ?? null;
  }

  async listPuzzles(level: DifficultyLevel): Promise<readonly PuzzleRecord[]> {
    return this.puzzles.filter(item => item.difficultyLevel === level);
  }
}

class FakeAccess implements GameAccessAdapter {
  readonly opportunities: StartOpportunity[] = [];

  async isPremium(): Promise<boolean> {
    return false;
  }

  async showStartOpportunity(opportunity: StartOpportunity): Promise<void> {
    this.opportunities.push(opportunity);
  }
}

class FullHouseHintEngine implements HintEngine {
  async nextStep(request: HintEngineRequest) {
    return {
      status: 'step' as const,
      step: {
        contractVersion: 1 as const,
        boardFingerprint: request.boardFingerprint,
        techniqueCode: 'fullHouse' as const,
        difficultyLevel: 1 as const,
        focusCells: [8],
        focusRegions: [{ kind: 'row' as const, index: 0 }],
        premiseCandidates: [],
        eliminations: [],
        placements: [{ cell: 8, digit: 2 as const }],
        explanationKey: 'hint.fullHouse' as const,
        explanationParams: {},
      },
    };
  }
}

async function setup(hints: HintEngine = new FullHouseHintEngine()) {
  const database = new NodeSqliteDatabase();
  await migrateUserDatabase(database, 1);
  const players = new UserRepository(database);
  const content = new FakeContent();
  const access = new FakeAccess();
  let sequence = 0;
  let epochMs = 1_000;
  const coordinator = new OfflineGameCoordinator(
    content,
    players,
    hints,
    access,
    () => ++epochMs,
    kind => `${kind}-${++sequence}`,
  );
  await coordinator.initialize();
  return { access, content, coordinator, database, players };
}

describe('OfflineGameCoordinator', () => {
  test('selects cells immediately without entering busy state or persisting', async () => {
    const { coordinator, database, players } = await setup();
    await coordinator.requestNewGame(2);
    const persist = jest.spyOn(players, 'persistCommand');
    const revisions: number[] = [];
    const unsubscribe = coordinator.subscribe(snapshot => {
      if (snapshot.session) {
        revisions.push(snapshot.session.state.revision);
      }
    });

    const selection = coordinator.selectCell(8);

    expect(coordinator.snapshot.session?.state.selectedCell).toBe(8);
    expect(coordinator.snapshot.busy).toBe(false);
    expect(coordinator.snapshot.session?.state.revision).toBe(0);
    expect(persist).not.toHaveBeenCalled();
    await selection;
    expect(revisions).toEqual([0, 0]);

    unsubscribe();
    database.close();
  });

  test('starts an offline puzzle, saves every input and settles completion', async () => {
    const { access, coordinator, database, players } = await setup();

    await coordinator.requestNewGame(1);
    expect(coordinator.snapshot.screen).toBe('game');
    expect(access.opportunities).toEqual(['new_game']);

    await coordinator.selectCell(8);
    await coordinator.inputDigit(2);

    expect(coordinator.snapshot.screen).toBe('result');
    expect(coordinator.snapshot.session?.state.status).toBe('completed');
    expect(coordinator.snapshot.statistics.completions).toBe(1);
    expect((await players.restoreUnfinishedSession(4, 2_000)).status).toBe(
      'none',
    );
    database.close();
  });

  test('restores a paused game and requires confirmation before replacing it', async () => {
    const { content, coordinator, database, players } = await setup();
    await coordinator.requestNewGame(1);
    await coordinator.returnHome();
    expect(coordinator.snapshot.resumable).toBe(true);

    let sequence = 100;
    const restored = new OfflineGameCoordinator(
      content,
      players,
      new FullHouseHintEngine(),
      new FakeAccess(),
      () => 3_000 + sequence,
      kind => `${kind}-${++sequence}`,
    );
    await restored.initialize();
    expect(restored.snapshot.resumable).toBe(true);
    expect(restored.snapshot.session?.state.status).toBe('paused');

    await restored.requestNewGame(2);
    expect(restored.snapshot.replacementRequest).toEqual({ level: 2 });
    restored.cancelReplacement();
    expect(restored.snapshot.session?.state.difficultyLevel).toBe(1);

    await restored.requestNewGame(2);
    await restored.confirmReplacement();
    expect(restored.snapshot.screen).toBe('game');
    expect(restored.snapshot.session?.state.difficultyLevel).toBe(2);
    expect(restored.snapshot.statistics.abandonments).toBe(1);
    database.close();
  });

  test('persists quick-pencil and smart-hint credits through an atomic hint completion', async () => {
    const { coordinator, database } = await setup();
    await coordinator.requestNewGame(1);

    await coordinator.toggleQuickPencil();
    expect(coordinator.snapshot.session?.state.candidates.pencilMode).toBe(
      true,
    );
    expect(coordinator.snapshot.wallet.quick_pencil.balance).toBe(2);

    await coordinator.requestHint();
    expect(coordinator.snapshot.session?.state.activeHint?.techniqueCode).toBe(
      'fullHouse',
    );
    expect(coordinator.snapshot.wallet.smart_hint.balance).toBe(4);

    await coordinator.applyHint();
    expect(coordinator.snapshot.screen).toBe('result');
    expect(coordinator.snapshot.session?.state.completionKind).toBe(
      'hint_assisted',
    );
    expect(coordinator.snapshot.wallet.quick_pencil.balance).toBe(3);
    expect(coordinator.snapshot.wallet.smart_hint.balance).toBe(4);
    database.close();
  });

  test('starts the next unfinished puzzle at the completed level', async () => {
    const { coordinator, database } = await setup();
    await coordinator.requestNewGame(1);
    const completedPuzzleId = coordinator.snapshot.puzzle?.id;
    expect(completedPuzzleId).toMatch(/^level-1-[ab]$/);

    await coordinator.selectCell(8);
    await coordinator.inputDigit(2);
    await coordinator.nextPuzzle();

    expect(coordinator.snapshot.screen).toBe('game');
    expect(coordinator.snapshot.puzzle?.id).not.toBe(completedPuzzleId);
    expect(coordinator.snapshot.puzzle?.difficultyLevel).toBe(1);
    expect(coordinator.snapshot.session?.state.status).toBe('active');
    database.close();
  });

  test('pauses on interruption and resumes only after explicit user action', async () => {
    const { coordinator, database } = await setup();
    await coordinator.requestNewGame(3);
    await coordinator.pause();
    expect(coordinator.snapshot.session?.state.status).toBe('paused');

    await coordinator.resumePausedGame();
    expect(coordinator.snapshot.session?.state.status).toBe('active');
    database.close();
  });

  test('queues an interruption pause behind an in-flight persisted action', async () => {
    let releaseHint: () => void = () => undefined;
    const gate = new Promise<void>(resolve => {
      releaseHint = resolve;
    });
    const baseHints = new FullHouseHintEngine();
    const delayedHints: HintEngine = {
      async nextStep(request) {
        await gate;
        return baseHints.nextStep(request);
      },
    };
    const { coordinator, database } = await setup(delayedHints);
    await coordinator.requestNewGame(4);

    const pendingHint = coordinator.requestHint();
    expect(coordinator.snapshot.busy).toBe(true);
    await coordinator.pause();
    releaseHint();
    await pendingHint;

    expect(coordinator.snapshot.session?.state.status).toBe('paused');
    expect(coordinator.snapshot.session?.state.activeHint).toBeNull();
    database.close();
  });
});
