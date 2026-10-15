import { getChallengeCatalog } from '../src/data/challenge/challenge-catalog';
import {
  challengeState,
  checkChallenge,
  createChallengeProgress,
  restoreChallenge,
  undoChallenge,
} from '../src/domain/challenge/engine';
import type {
  ChallengeLevel,
  ChallengeOperation,
  ChallengeProgress,
  ChallengeProgressStore,
} from '../src/domain/challenge/contracts';
import type { Digit } from '../src/domain/sudoku/contracts';
import {
  digitsFromMask,
  arePeers,
  hasCandidate,
  removeCandidate,
} from '../src/domain/sudoku/board';
import { ChallengeController } from '../src/application/challenge/challenge-controller';
import { challengeBoardSession } from '../src/application/challenge/challenge-board';
import { challengeTarget } from './helpers/challenge';
import { ChallengeProgressRepository } from '../src/data/user/challenge-progress-repository';
import { migrateUserDatabase } from '../src/data/sqlite/user-migrations';
import { NodeSqliteDatabase } from './helpers/node-sqlite';

const catalog = getChallengeCatalog();
const initial = (level: ChallengeLevel) =>
  createChallengeProgress(level.id, catalog.content_key, 'test').attempt;
const fill = (level: ChallengeLevel): ChallengeOperation => ({
  kind: 'placement',
  ...challengeTarget(level),
});
const deletion = (level: ChallengeLevel): ChallengeOperation => {
  for (let cell = 0; cell < 81; cell++)
    for (const digit of digitsFromMask(level.source.candidate_masks[cell]))
      if (level.source.solution_fingerprint[cell] !== String(digit))
        return { kind: 'elimination', cell, digit };
  throw new Error('No removable candidate');
};
class MemoryStore implements ChallengeProgressStore {
  rows = new Map<string, ChallengeProgress>();
  fail = false;
  async list() {
    return [...this.rows.values()];
  }
  async save(row: ChallengeProgress, revision: number) {
    if (this.fail) throw new Error('disk full');
    expect(this.rows.get(row.levelId)?.revision ?? 0).toBe(revision);
    this.rows.set(row.levelId, row);
  }
}

test.each(Array.from({ length: 18 }, (_, i) => i))(
  'level %i accepts every correct fill and rejects every incorrect digit without a route requirement',
  index => {
    const level = catalog.levels[index];
    for (let cell = 0; cell < 81; cell++) {
      if (level.source.board_fingerprint[cell] !== '0') continue;
      for (let digit = 1; digit <= 9; digit++) {
        const result = checkChallenge(level, initial(level), [
          { kind: 'placement', cell, digit: digit as Digit },
        ]);
        const correct =
          level.source.solution_fingerprint[cell] === String(digit);
        expect(result.status).toBe(correct ? 'accepted' : 'rejected');
        expect(result.attempt.passed).toBe(correct);
        expect(result.attempt.errors).toBe(correct ? 0 : 1);
      }
    }
  },
);

test.each(Array.from({ length: 18 }, (_, i) => i))(
  'level %i judges all candidate removals by the unique answer',
  index => {
    const level = catalog.levels[index];
    for (let cell = 0; cell < 81; cell++) {
      for (const digit of digitsFromMask(level.source.candidate_masks[cell])) {
        const result = checkChallenge(level, initial(level), [
          { kind: 'elimination', cell, digit },
        ]);
        const correct =
          level.source.solution_fingerprint[cell] !== String(digit);
        expect(result.status).toBe(correct ? 'accepted' : 'rejected');
        expect(result.attempt.passed).toBe(
          correct &&
            level.technique_code !== null &&
            level.technique_code !== 'hiddenSingle',
        );
      }
    }
  },
);

test('reported r9c5 = 7 passes directly, after either deletion, or together with deletions', () => {
  const level = catalog.levels[5];
  const answer: ChallengeOperation = { kind: 'placement', cell: 76, digit: 7 };
  const remove8: ChallengeOperation = {
    kind: 'elimination',
    cell: 76,
    digit: 8,
  };
  const remove9: ChallengeOperation = {
    kind: 'elimination',
    cell: 76,
    digit: 9,
  };
  for (const prefix of [[], [remove8], [remove9], [remove8, remove9]]) {
    const attempt = prefix.length
      ? checkChallenge(level, initial(level), prefix).attempt
      : initial(level);
    expect(attempt.passed).toBe(false);
    const result = checkChallenge(level, attempt, [answer]);
    expect(result.status).toBe('accepted');
    expect(result.attempt.passed).toBe(true);
    expect(result.attempt.errors).toBe(0);
    expect(
      restoreChallenge(level, {
        ...createChallengeProgress(level.id, catalog.content_key, 'test'),
        attempt: result.attempt,
      }).attempt,
    ).toEqual(result.attempt);
  }
  expect(
    checkChallenge(level, initial(level), [remove8, remove9, answer]).attempt
      .passed,
  ).toBe(true);
});

test('mixed batches are atomic; earlier accepted removals survive a rejection and undo preserves error counts', () => {
  const level = catalog.levels[5];
  const first = checkChallenge(level, initial(level), [
    { kind: 'elimination', cell: 76, digit: 8 },
  ]).attempt;
  const rejected = checkChallenge(level, first, [
    { kind: 'elimination', cell: 76, digit: 9 },
    { kind: 'placement', cell: 76, digit: 1 },
  ]);
  expect(rejected.status).toBe('rejected');
  expect(rejected.attempt.accepted).toEqual(first.accepted);
  expect(rejected.attempt.errors).toBe(1);
  expect(rejected.attempt.submissions).toBe(2);
  const undone = undoChallenge(rejected.attempt);
  expect(undone.accepted).toHaveLength(0);
  expect(undone.errors).toBe(1);
  const accepted = checkChallenge(level, first, [
    { kind: 'elimination', cell: 76, digit: 9 },
    { kind: 'placement', cell: 76, digit: 7 },
  ]).attempt;
  expect(undoChallenge(accepted).accepted).toEqual(first.accepted);
});

test('a correct fill plus an incorrect extra fill cannot partially pass', () => {
  const level = catalog.levels[5];
  const result = checkChallenge(level, initial(level), [
    { kind: 'placement', cell: 76, digit: 7 },
    { kind: 'placement', cell: 4, digit: 1 },
  ]);
  expect(result.status).toBe('rejected');
  expect(result.attempt.accepted).toHaveLength(0);
  expect(result.attempt.passed).toBe(false);
  expect(result.attempt.errors).toBe(1);
});

test('given cells, invalid requests and repeated removals do not change progress', () => {
  const level = catalog.levels[5];
  for (const operations of [
    [],
    [{ kind: 'placement', cell: 0, digit: 4 }],
    [{ kind: 'placement', cell: 81, digit: 7 }],
    [fill(level), fill(level)],
  ]) {
    expect(
      checkChallenge(level, initial(level), operations as ChallengeOperation[])
        .status,
    ).toBe('enter');
  }
  const op = deletion(level);
  const attempt = checkChallenge(level, initial(level), [op]).attempt;
  expect(checkChallenge(level, attempt, [op])).toEqual({
    status: 'enter',
    attempt,
  });
});

test('peer candidate cleanup follows preferences, never changes unrelated cells and rebuilds on replacement or undo', () => {
  const level = catalog.levels[5];
  const baseline = level.source.candidate_masks;
  for (const digit of [7, 8] as const) {
    const draft: ChallengeOperation[] = [
      { kind: 'placement', cell: 76, digit },
    ];
    const session = challengeBoardSession(
      level,
      initial(level),
      draft,
      76,
      false,
    );
    baseline.forEach((mask, cell) => {
      expect(session.state.candidates.quickCandidates[cell]).toBe(
        cell === 76
          ? 0
          : arePeers(cell, 76)
          ? removeCandidate(mask, digit)
          : mask,
      );
    });
    expect(
      challengeBoardSession(
        level,
        initial(level),
        draft,
        76,
        false,
        true,
        false,
      ).state.candidates.quickCandidates[58],
    ).toBe(baseline[58]);
  }
  expect(challengeState(level, []).candidates).toEqual(baseline);
  const kept: ChallengeOperation = { kind: 'elimination', cell: 76, digit: 8 };
  expect(hasCandidate(challengeState(level, [kept]).candidates[76], 8)).toBe(
    false,
  );
  expect(hasCandidate(challengeState(level, [kept]).candidates[58], 7)).toBe(
    true,
  );
});

test('failed saves retain progress, retry commits once, and historical passes survive undo and restart', async () => {
  const store = new MemoryStore();
  const controller = new ChallengeController(catalog, store);
  const level = catalog.levels[5];
  store.fail = true;
  await expect(controller.check(level.id, [fill(level)])).rejects.toThrow(
    'disk full',
  );
  expect(controller.progress(level.id).attempt.passed).toBe(false);
  store.fail = false;
  await controller.check(level.id, [fill(level)]);
  expect(controller.progress(level.id).attempt.submissions).toBe(1);
  await controller.undo(level.id);
  expect(controller.progress(level.id).everPassed).toBe(true);
  await controller.restart(level.id);
  expect(controller.progress(level.id).everPassed).toBe(true);
});

test('restoration validates every submitted result and resets damaged attempts without losing pass facts', async () => {
  const store = new MemoryStore();
  const level = catalog.levels[5];
  const progress = createChallengeProgress(
    level.id,
    catalog.content_key,
    'saved',
  );
  store.rows.set(level.id, {
    ...progress,
    everPassed: true,
    attempt: {
      ...checkChallenge(level, progress.attempt, [fill(level)]).attempt,
      accepted: [{ operation: { kind: 'placement', cell: 76, digit: 1 } }],
    },
  });
  const controller = new ChallengeController(catalog, store);
  await controller.load();
  expect(controller.progress(level.id).everPassed).toBe(true);
  expect(controller.progress(level.id).attempt.accepted).toHaveLength(0);
});

test('a pending save blocks duplicate checks; arbitrary level access does not grant other pass facts', async () => {
  const memory = new MemoryStore();
  let release!: () => void;
  const held = new Promise<void>(resolve => {
    release = resolve;
  });
  const controller = new ChallengeController(catalog, {
    list: () => memory.list(),
    save: async (row, revision) => {
      await held;
      await memory.save(row, revision);
    },
  });
  expect(
    catalog.levels.slice(0, 6).every((_, index) => controller.available(index)),
  ).toBe(true);
  const pending = controller.check(catalog.levels[5].id, [
    fill(catalog.levels[5]),
  ]);
  await expect(
    controller.check(catalog.levels[5].id, [fill(catalog.levels[5])]),
  ).rejects.toThrow('in flight');
  release();
  await pending;
  expect(controller.progress(catalog.levels[5].id).attempt.submissions).toBe(1);
  expect(
    catalog.levels
      .slice(0, 5)
      .every(level => !controller.progress(level.id).everPassed),
  ).toBe(true);
});

test('SQLite restores result histories without touching ordinary games', async () => {
  const db = new NodeSqliteDatabase();
  try {
    await migrateUserDatabase(db, 1000);
    const store = new ChallengeProgressRepository(db);
    const controller = new ChallengeController(catalog, store);
    const level = catalog.levels[5];
    await controller.check(level.id, [
      { kind: 'elimination', cell: 76, digit: 8 },
    ]);
    const restored = new ChallengeController(catalog, store);
    await restored.load();
    expect(restored.progress(level.id)).toEqual(controller.progress(level.id));
    await restored.check(level.id, [{ kind: 'placement', cell: 76, digit: 7 }]);
    expect(restored.progress(level.id).everPassed).toBe(true);
    expect(await db.query('SELECT * FROM game_sessions')).toHaveLength(0);
  } finally {
    db.close();
  }
});
