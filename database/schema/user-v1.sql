PRAGMA foreign_keys = ON;
PRAGMA user_version = 1;

CREATE TABLE schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at_ms INTEGER NOT NULL
);

CREATE TABLE user_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE game_sessions (
  id TEXT PRIMARY KEY,
  puzzle_id TEXT NOT NULL,
  content_version INTEGER NOT NULL CHECK (content_version > 0),
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  status TEXT NOT NULL CHECK (
    status IN ('active', 'paused', 'failed', 'completed', 'abandoned')
  ),
  revision INTEGER NOT NULL CHECK (revision >= 0),
  state_schema_version INTEGER NOT NULL CHECK (state_schema_version > 0),
  state_json TEXT NOT NULL CHECK (json_valid(state_json)),
  started_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  completed_at_ms INTEGER
);

CREATE UNIQUE INDEX one_unfinished_game
  ON game_sessions ((1))
  WHERE status IN ('active', 'paused');

CREATE INDEX game_sessions_puzzle_status
  ON game_sessions(puzzle_id, status);

CREATE TABLE game_moves (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  move_kind TEXT NOT NULL CHECK (
    move_kind IN (
      'place_value',
      'erase_value',
      'edit_manual_candidate',
      'edit_quick_candidate',
      'apply_hint'
    )
  ),
  before_snapshot_json TEXT NOT NULL CHECK (json_valid(before_snapshot_json)),
  after_snapshot_json TEXT NOT NULL CHECK (json_valid(after_snapshot_json)),
  created_at_ms INTEGER NOT NULL,
  UNIQUE (session_id, sequence)
);

CREATE TABLE game_attempts (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  puzzle_id TEXT NOT NULL,
  content_version INTEGER NOT NULL,
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  outcome TEXT NOT NULL CHECK (
    outcome IN ('completed', 'failed', 'abandoned')
  ),
  completion_kind TEXT CHECK (
    completion_kind IS NULL OR
    completion_kind IN ('independent', 'hint_assisted', 'perfect')
  ),
  elapsed_ms INTEGER NOT NULL CHECK (elapsed_ms >= 0),
  error_count INTEGER NOT NULL CHECK (error_count >= 0),
  hint_use_count INTEGER NOT NULL CHECK (hint_use_count >= 0),
  quick_pencil_use_count INTEGER NOT NULL CHECK (quick_pencil_use_count >= 0),
  started_at_ms INTEGER NOT NULL,
  ended_at_ms INTEGER NOT NULL
);

CREATE INDEX game_attempts_recent
  ON game_attempts(ended_at_ms DESC);

CREATE INDEX game_attempts_level_outcome
  ON game_attempts(difficulty_level, outcome);

CREATE TABLE puzzle_progress (
  puzzle_id TEXT PRIMARY KEY,
  content_version INTEGER NOT NULL,
  first_completed_at_ms INTEGER,
  last_completed_at_ms INTEGER,
  completion_count INTEGER NOT NULL DEFAULT 0 CHECK (completion_count >= 0),
  best_time_ms INTEGER CHECK (best_time_ms IS NULL OR best_time_ms >= 0)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL CHECK (json_valid(value_json)),
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE credit_wallet (
  resource TEXT PRIMARY KEY CHECK (resource IN ('smart_hint', 'quick_pencil')),
  balance INTEGER NOT NULL CHECK (balance >= 0),
  earned_total INTEGER NOT NULL DEFAULT 0 CHECK (earned_total >= 0),
  spent_total INTEGER NOT NULL DEFAULT 0 CHECK (spent_total >= 0),
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE credit_ledger (
  id TEXT PRIMARY KEY,
  resource TEXT NOT NULL CHECK (resource IN ('smart_hint', 'quick_pencil')),
  amount INTEGER NOT NULL CHECK (amount != 0),
  reason TEXT NOT NULL,
  puzzle_id TEXT,
  session_id TEXT,
  external_event_id TEXT UNIQUE,
  balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
  created_at_ms INTEGER NOT NULL
);

CREATE INDEX credit_ledger_created
  ON credit_ledger(created_at_ms DESC);

CREATE TABLE puzzle_completion_rewards (
  puzzle_id TEXT PRIMARY KEY,
  content_version INTEGER NOT NULL,
  session_id TEXT NOT NULL,
  rewarded_at_ms INTEGER NOT NULL
);

CREATE TABLE purchase_entitlements (
  product_id TEXT PRIMARY KEY,
  entitlement TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  active INTEGER NOT NULL CHECK (active IN (0, 1)),
  original_transaction_id TEXT,
  last_verified_at_ms INTEGER NOT NULL
);

INSERT INTO schema_migrations(version, applied_at_ms) VALUES (1, 0);
INSERT INTO credit_wallet(resource, balance, updated_at_ms)
VALUES ('smart_hint', 5, 0), ('quick_pencil', 3, 0);
