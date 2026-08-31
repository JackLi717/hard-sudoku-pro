import {
  NitroSQLiteConnection,
  QueryResultRow,
  SQLiteValue,
  Transaction,
  open,
} from 'react-native-nitro-sqlite';

import {
  SqlDatabase,
  SqlExecutor,
  SqlRow,
  SqlRunResult,
  SqlValue,
} from './contracts';

function toParams(params: readonly SqlValue[] | undefined): SQLiteValue[] {
  return params ? [...params] : [];
}

class NitroExecutor implements SqlExecutor {
  constructor(
    private readonly executeAsync: <Row extends QueryResultRow>(
      sql: string,
      params?: SQLiteValue[],
    ) => Promise<{
      rows: { _array: Row[] };
      rowsAffected?: number;
      insertId?: number;
    }>,
  ) {}

  async query<Row extends SqlRow>(
    sql: string,
    params?: readonly SqlValue[],
  ): Promise<readonly Row[]> {
    const result = await this.executeAsync<Row>(sql, toParams(params));
    return result.rows._array;
  }

  async run(sql: string, params?: readonly SqlValue[]): Promise<SqlRunResult> {
    const result = await this.executeAsync(sql, toParams(params));
    return {
      rowsAffected: result.rowsAffected ?? 0,
      insertId: result.insertId,
    };
  }
}

export class NitroSqliteDatabase implements SqlDatabase {
  private readonly executor: NitroExecutor;

  constructor(private readonly connection: NitroSQLiteConnection) {
    this.executor = new NitroExecutor(connection.executeAsync.bind(connection));
  }

  static open(name: string, location = 'databases'): NitroSqliteDatabase {
    return new NitroSqliteDatabase(open({ name, location }));
  }

  query<Row extends SqlRow>(
    sql: string,
    params?: readonly SqlValue[],
  ): Promise<readonly Row[]> {
    return this.executor.query<Row>(sql, params);
  }

  run(sql: string, params?: readonly SqlValue[]): Promise<SqlRunResult> {
    return this.executor.run(sql, params);
  }

  transaction<Result>(
    operation: (transaction: SqlExecutor) => Promise<Result>,
  ): Promise<Result> {
    return this.connection.transaction((transaction: Transaction) => {
      const executor = new NitroExecutor(
        transaction.executeAsync.bind(transaction),
      );
      return operation(executor);
    });
  }

  close(): void {
    this.connection.close();
  }
}
