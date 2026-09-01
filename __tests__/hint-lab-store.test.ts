import type {
  SqlDatabase,
  SqlExecutor,
  SqlRow,
  SqlRunResult,
  SqlValue,
} from '../src/data/sqlite/contracts';
import { HintLabStore, emptyHintLabRecord } from '../src/debug/hint-lab-store';

describe('HintLabStore', () => {
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
