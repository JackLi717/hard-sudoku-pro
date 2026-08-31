import {
  DatabaseSync,
  SQLInputValue,
  StatementResultingChanges,
} from 'node:sqlite';

import {
  SqlDatabase,
  SqlExecutor,
  SqlRow,
  SqlRunResult,
  SqlValue,
} from '../../src/data/sqlite/contracts';

function nodeParams(params: readonly SqlValue[] | undefined): SQLInputValue[] {
  return (params ?? []).map(value => {
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    return value instanceof ArrayBuffer ? new Uint8Array(value) : value;
  });
}

function runResult(result: StatementResultingChanges): SqlRunResult {
  return {
    rowsAffected: Number(result.changes),
    insertId: Number(result.lastInsertRowid),
  };
}

export class NodeSqliteDatabase implements SqlDatabase {
  constructor(readonly native: DatabaseSync = new DatabaseSync(':memory:')) {}

  async query<Row extends SqlRow>(
    sql: string,
    params?: readonly SqlValue[],
  ): Promise<readonly Row[]> {
    return this.native.prepare(sql).all(...nodeParams(params)) as Row[];
  }

  async run(sql: string, params?: readonly SqlValue[]): Promise<SqlRunResult> {
    return runResult(this.native.prepare(sql).run(...nodeParams(params)));
  }

  async transaction<Result>(
    operation: (transaction: SqlExecutor) => Promise<Result>,
  ): Promise<Result> {
    this.native.exec('BEGIN IMMEDIATE');
    try {
      const result = await operation(this);
      this.native.exec('COMMIT');
      return result;
    } catch (error) {
      this.native.exec('ROLLBACK');
      throw error;
    }
  }

  close(): void {
    this.native.close();
  }
}

export class FaultInjectingDatabase implements SqlDatabase {
  constructor(
    private readonly base: SqlDatabase,
    private readonly failWhenSqlIncludes: string,
  ) {}

  query<Row extends SqlRow>(
    sql: string,
    params?: readonly SqlValue[],
  ): Promise<readonly Row[]> {
    return this.base.query<Row>(sql, params);
  }

  run(sql: string, params?: readonly SqlValue[]): Promise<SqlRunResult> {
    if (sql.includes(this.failWhenSqlIncludes)) {
      throw new Error('Injected SQLite failure');
    }
    return this.base.run(sql, params);
  }

  transaction<Result>(
    operation: (transaction: SqlExecutor) => Promise<Result>,
  ): Promise<Result> {
    return this.base.transaction(transaction =>
      operation({
        query: transaction.query.bind(transaction),
        run: (sql, params) => {
          if (sql.includes(this.failWhenSqlIncludes)) {
            throw new Error('Injected SQLite failure');
          }
          return transaction.run(sql, params);
        },
      }),
    );
  }

  close(): void {
    this.base.close();
  }
}
