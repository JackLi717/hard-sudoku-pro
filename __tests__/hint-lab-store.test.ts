import type {
  SqlDatabase,
  SqlExecutor,
  SqlRow,
  SqlRunResult,
  SqlValue,
} from '../src/data/sqlite/contracts';
import { HintLabStore, emptyHintLabRecord } from '../src/debug/hint-lab-store';

describe('HintLabStore', () => {
  it('persists and validates the level filter', async () => {
    const runs: Array<readonly SqlValue[]> = [];
    let storedLevel: number | null = 4;
    const database: SqlDatabase = {
      close: jest.fn(),
      async query<Row extends SqlRow>(): Promise<readonly Row[]> {
        return (storedLevel === null
          ? []
          : [{ integer_value: storedLevel }]) as unknown as readonly Row[];
      },
      async run(
        sql: string,
        params: readonly SqlValue[] = [],
      ): Promise<SqlRunResult> {
        runs.push(params);
        storedLevel = sql.startsWith('DELETE') ? null : (params[1] as number);
        return { rowsAffected: 1 };
      },
      async transaction<Result>(
        operation: (transaction: SqlExecutor) => Promise<Result>,
      ): Promise<Result> {
        return operation(database);
      },
    };
    const store = new HintLabStore(database);

    expect(await store.readLevelFilter()).toBe(4);
    await store.saveLevelFilter(2);
    expect(runs.at(-1)).toEqual(['level_filter', 2]);
    expect(await store.readLevelFilter()).toBe(2);
    await store.saveLevelFilter(null);
    expect(await store.readLevelFilter()).toBeNull();

    storedLevel = 8;
    expect(await store.readLevelFilter()).toBeNull();
  });

  it('serializes acceptance writes and snapshots every record', async () => {
    let releaseFirstWrite: (() => void) | undefined;
    const firstWriteGate = new Promise<void>(resolve => {
      releaseFirstWrite = resolve;
    });
    const savedParams: SqlValue[][] = [];
    let startedWrites = 0;
    let activeWrites = 0;
    let maximumActiveWrites = 0;

    const database: SqlDatabase = {
      close: jest.fn(),
      async query<Row extends SqlRow>(): Promise<readonly Row[]> {
        return [];
      },
      async run(
        _sql: string,
        params: readonly SqlValue[] = [],
      ): Promise<SqlRunResult> {
        const writeIndex = startedWrites;
        startedWrites += 1;
        activeWrites += 1;
        maximumActiveWrites = Math.max(maximumActiveWrites, activeWrites);
        if (writeIndex === 0) {
          await firstWriteGate;
        }
        savedParams.push([...params]);
        activeWrites -= 1;
        return { rowsAffected: 1 };
      },
      async transaction<Result>(
        operation: (transaction: SqlExecutor) => Promise<Result>,
      ): Promise<Result> {
        return operation(database);
      },
    };
    const store = new HintLabStore(database);
    const first = emptyHintLabRecord('fixture');
    const second = {
      ...first,
      reasoningOk: true,
      visualsOk: true,
    };

    const firstSave = store.save(first);
    first.reasoningOk = true;
    await Promise.resolve();
    await Promise.resolve();
    const secondSave = store.save(second);
    await Promise.resolve();

    expect(startedWrites).toBe(1);
    releaseFirstWrite?.();
    await Promise.all([firstSave, secondSave]);

    expect(maximumActiveWrites).toBe(1);
    expect(savedParams).toHaveLength(2);
    expect(savedParams[0][3]).toBe(0);
    expect(savedParams[1][3]).toBe(1);
    expect(savedParams[1][4]).toBe(1);
  });
});
