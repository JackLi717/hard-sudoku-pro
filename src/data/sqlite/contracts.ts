export type SqlValue = boolean | number | string | ArrayBuffer | null;

export type SqlRow = Record<string, SqlValue>;

export type SqlRunResult = {
  rowsAffected: number;
  insertId?: number;
};

export interface SqlExecutor {
  query<Row extends SqlRow>(
    sql: string,
    params?: readonly SqlValue[],
  ): Promise<readonly Row[]>;
  run(sql: string, params?: readonly SqlValue[]): Promise<SqlRunResult>;
}

export interface SqlDatabase extends SqlExecutor {
  transaction<Result>(
    operation: (transaction: SqlExecutor) => Promise<Result>,
  ): Promise<Result>;
  close(): void;
}

export type DatabaseRecoveryReason =
  | 'content_corrupt'
  | 'content_incompatible'
  | 'migration_failed'
  | 'user_corrupt'
  | 'user_schema_newer';

export class DatabaseRecoveryError extends Error {
  constructor(
    readonly reason: DatabaseRecoveryReason,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'DatabaseRecoveryError';
  }
}
