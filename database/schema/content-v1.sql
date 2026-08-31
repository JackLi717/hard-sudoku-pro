PRAGMA foreign_keys = ON;
PRAGMA user_version = 1;

CREATE TABLE content_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE puzzles (
  id TEXT PRIMARY KEY,
  puzzle TEXT NOT NULL UNIQUE CHECK (length(puzzle) = 81),
  solution TEXT NOT NULL CHECK (length(solution) = 81),
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  difficulty_score INTEGER NOT NULL CHECK (difficulty_score >= 0),
  hardest_technique TEXT NOT NULL,
  rating_version TEXT NOT NULL,
  source TEXT NOT NULL,
  content_version INTEGER NOT NULL CHECK (content_version > 0),
  checksum TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1))
);

CREATE TABLE puzzle_technique_usage (
  puzzle_id TEXT NOT NULL REFERENCES puzzles(id),
  rating_version TEXT NOT NULL,
  technique_code TEXT NOT NULL,
  use_count INTEGER NOT NULL CHECK (use_count > 0),
  PRIMARY KEY (puzzle_id, rating_version, technique_code)
);

CREATE INDEX puzzles_difficulty_order
  ON puzzles(difficulty_level, difficulty_score, id);
