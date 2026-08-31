import NativeContentDatabase from '../../native/NativeContentDatabase';
import { PuzzleRecord } from '../../domain/content/contracts';
import { TECHNIQUES, TechniqueCode } from '../../domain/hints/techniques';
import {
  DatabaseRecoveryError,
  SqlDatabase,
  SqlRow,
} from '../sqlite/contracts';
import { NitroSqliteDatabase } from '../sqlite/nitro-database';

export const PRODUCTION_CONTENT = {
  assetName: 'content.sqlite',
  databaseName: 'content-v4.sqlite',
  contentVersion: 4,
  schemaVersion: 1,
  sha256: '9ddc17c8195a4342e9e5ae11cb02906103d4df55476fbf5c1441a2c4f16e849a',
} as const;

export type ContentMetadata = {
  contentVersion: number;
  schemaVersion: number;
  puzzleCount: number;
  ratingVersion: string;
};

type PuzzleRow = SqlRow & {
  id: string;
  puzzle: string;
  solution: string;
  difficulty_level: number;
  difficulty_score: number;
  hardest_technique: string;
  rating_version: string;
  source: string;
  content_version: number;
  checksum: string;
  enabled: number;
};

const PUZZLE_COLUMNS = `
  id, puzzle, solution, difficulty_level, difficulty_score,
  hardest_technique, rating_version, source, content_version,
  checksum, enabled
`;

const techniqueCodes = new Set<string>(TECHNIQUES.map(item => item.code));

function requireInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new DatabaseRecoveryError(
      'content_corrupt',
      `content.sqlite has an invalid ${field}.`,
    );
  }
  return value;
}

function mapPuzzle(row: PuzzleRow): PuzzleRecord {
  const level = requireInteger(row.difficulty_level, 'difficulty_level');
  const technique = row.hardest_technique;
  if (
    typeof row.id !== 'string' ||
    typeof row.puzzle !== 'string' ||
    typeof row.solution !== 'string' ||
    !/^[0-9]{81}$/.test(row.puzzle) ||
    !/^[1-9]{81}$/.test(row.solution) ||
    level < 1 ||
    level > 5 ||
    typeof technique !== 'string' ||
    !techniqueCodes.has(technique) ||
    typeof row.rating_version !== 'string' ||
    typeof row.source !== 'string' ||
    typeof row.checksum !== 'string'
  ) {
    throw new DatabaseRecoveryError(
      'content_corrupt',
      `content.sqlite puzzle row ${String(row.id)} is invalid.`,
    );
  }

  return {
    id: row.id,
    puzzle: row.puzzle,
    solution: row.solution,
    difficultyLevel: level as PuzzleRecord['difficultyLevel'],
    difficultyScore: requireInteger(row.difficulty_score, 'difficulty_score'),
    hardestTechnique: technique as TechniqueCode,
    ratingVersion: row.rating_version,
    source: row.source,
    contentVersion: requireInteger(row.content_version, 'content_version'),
    checksum: row.checksum,
    enabled: row.enabled === 1,
  };
}

async function readMetadata(database: SqlDatabase): Promise<ContentMetadata> {
  const rows = await database.query<{ key: string; value: string }>(
    'SELECT key, value FROM content_metadata',
  );
  const values = new Map(rows.map(row => [row.key, row.value]));
  const contentVersion = Number(values.get('content_version'));
  const schemaVersion = Number(values.get('schema_version'));
  const puzzleCount = Number(values.get('puzzle_count'));
  const ratingVersion = values.get('rating_version');
  if (
    !Number.isInteger(contentVersion) ||
    !Number.isInteger(schemaVersion) ||
    !Number.isInteger(puzzleCount) ||
    typeof ratingVersion !== 'string'
  ) {
    throw new DatabaseRecoveryError(
      'content_corrupt',
      'content.sqlite metadata is missing or invalid.',
    );
  }
  return { contentVersion, schemaVersion, puzzleCount, ratingVersion };
}

export class ContentRepository {
  constructor(
    private readonly database: SqlDatabase,
    readonly metadata: ContentMetadata,
  ) {}

  async getPuzzle(id: string): Promise<PuzzleRecord | null> {
    const [row] = await this.database.query<PuzzleRow>(
      `SELECT ${PUZZLE_COLUMNS} FROM puzzles WHERE id = ? AND enabled = 1`,
      [id],
    );
    return row ? mapPuzzle(row) : null;
  }

  async listPuzzles(
    difficultyLevel: PuzzleRecord['difficultyLevel'],
  ): Promise<readonly PuzzleRecord[]> {
    const rows = await this.database.query<PuzzleRow>(
      `SELECT ${PUZZLE_COLUMNS}
       FROM puzzles
       WHERE difficulty_level = ? AND enabled = 1
       ORDER BY difficulty_score, id`,
      [difficultyLevel],
    );
    return rows.map(mapPuzzle);
  }

  close(): void {
    this.database.close();
  }
}

export async function openProductionContentDatabase(): Promise<ContentRepository> {
  const location = await NativeContentDatabase.installBundledContentDatabase(
    PRODUCTION_CONTENT.assetName,
    PRODUCTION_CONTENT.databaseName,
    PRODUCTION_CONTENT.sha256,
  );
  const database = NitroSqliteDatabase.open(
    PRODUCTION_CONTENT.databaseName,
    location,
  );
  try {
    await database.run('PRAGMA query_only = ON');
    const [integrity] = await database.query<{ quick_check: string }>(
      'PRAGMA quick_check',
    );
    if (!integrity || integrity.quick_check !== 'ok') {
      throw new DatabaseRecoveryError(
        'content_corrupt',
        'Bundled content.sqlite failed SQLite quick_check.',
      );
    }
    const metadata = await readMetadata(database);
    if (
      metadata.contentVersion !== PRODUCTION_CONTENT.contentVersion ||
      metadata.schemaVersion !== PRODUCTION_CONTENT.schemaVersion
    ) {
      throw new DatabaseRecoveryError(
        'content_incompatible',
        `Bundled content.sqlite version ${metadata.contentVersion}/${metadata.schemaVersion} is incompatible.`,
      );
    }
    const [catalog] = await database.query<{
      puzzle_count: number;
      minimum_version: number;
      maximum_version: number;
    }>(
      `SELECT COUNT(*) AS puzzle_count,
              MIN(content_version) AS minimum_version,
              MAX(content_version) AS maximum_version
       FROM puzzles`,
    );
    if (
      !catalog ||
      catalog.puzzle_count !== metadata.puzzleCount ||
      catalog.minimum_version !== metadata.contentVersion ||
      catalog.maximum_version !== metadata.contentVersion
    ) {
      throw new DatabaseRecoveryError(
        'content_corrupt',
        'Bundled content.sqlite catalog does not match its metadata.',
      );
    }
    return new ContentRepository(database, metadata);
  } catch (error) {
    database.close();
    throw error;
  }
}
