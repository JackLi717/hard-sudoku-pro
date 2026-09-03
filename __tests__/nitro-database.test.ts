jest.mock('react-native-nitro-sqlite', () => ({
  open: jest.fn(),
}));

import { NitroSqliteDatabase } from '../src/data/sqlite/nitro-database';

type QueryResult = {
  rows: { _array: Record<string, string>[] };
  rowsAffected: number;
};

function deferred(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>(next => {
    resolve = next;
  });
  return { promise, resolve };
}

describe('NitroSqliteDatabase', () => {
  it('serializes operations submitted concurrently to one connection', async () => {
    const firstOperation = deferred();
    const calls: string[] = [];
    let activeOperations = 0;
    let peakOperations = 0;
    const executeAsync = jest.fn(async (sql: string): Promise<QueryResult> => {
      calls.push(sql);
      activeOperations += 1;
      peakOperations = Math.max(peakOperations, activeOperations);
      if (sql === 'first') {
        await firstOperation.promise;
      }
      activeOperations -= 1;
      return { rows: { _array: [{ sql }] }, rowsAffected: 0 };
    });
    const database = new NitroSqliteDatabase({
      executeAsync,
      transaction: jest.fn(),
      close: jest.fn(),
    } as never);

    const first = database.query('first');
    const second = database.query('second');
    await Promise.resolve();

    expect(calls).toEqual(['first']);
    expect(peakOperations).toBe(1);

    firstOperation.resolve();
    await Promise.all([first, second]);

    expect(calls).toEqual(['first', 'second']);
    expect(peakOperations).toBe(1);
  });

  it('waits for queued work before closing the native connection', async () => {
    const operation = deferred();
    const close = jest.fn();
    const database = new NitroSqliteDatabase({
      executeAsync: jest.fn(async (): Promise<QueryResult> => {
        await operation.promise;
        return { rows: { _array: [] }, rowsAffected: 1 };
      }),
      transaction: jest.fn(),
      close,
    } as never);

    const running = database.run('write');
    database.close();
    let drained = false;
    const drain = NitroSqliteDatabase.waitForPendingCloses().then(() => {
      drained = true;
    });
    await Promise.resolve();
    expect(drained).toBe(false);
    expect(close).not.toHaveBeenCalled();

    operation.resolve();
    await running;
    await Promise.resolve();

    expect(close).toHaveBeenCalledTimes(1);
    await drain;
    expect(drained).toBe(true);
    await expect(database.query('too late')).rejects.toThrow(
      'SQLite database is closing.',
    );
  });
});
