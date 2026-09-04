PRAGMA foreign_keys = ON;

ALTER TABLE game_moves
  ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1));

ALTER TABLE game_moves ADD COLUMN cell_index INTEGER;
ALTER TABLE game_moves ADD COLUMN digit INTEGER;
ALTER TABLE game_moves ADD COLUMN technique_code TEXT;
ALTER TABLE game_moves ADD COLUMN applied_hint_json TEXT;

ALTER TABLE puzzle_completion_rewards
  ADD COLUMN reward_json TEXT CHECK (reward_json IS NULL OR json_valid(reward_json));
ALTER TABLE game_attempts
  ADD COLUMN reward_json TEXT CHECK (reward_json IS NULL OR json_valid(reward_json));

CREATE INDEX game_moves_active_history
  ON game_moves(session_id, active, sequence);

CREATE TABLE game_action_receipts (
  event_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  state_revision INTEGER NOT NULL CHECK (state_revision >= 0),
  committed_at_ms INTEGER NOT NULL
);

CREATE INDEX game_action_receipts_session
  ON game_action_receipts(session_id, state_revision);

CREATE TABLE app_recovery_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  database_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  detail TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);

INSERT INTO schema_migrations(version, applied_at_ms) VALUES (2, 0);
PRAGMA user_version = 2;

-- Current pre-release event baseline; retained databases receive the same
-- idempotent addition on open. Missing old events are never backfilled.
CREATE TABLE IF NOT EXISTS game_replay_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  revision INTEGER NOT NULL CHECK (revision > 0),
  event_json TEXT NOT NULL CHECK (json_valid(event_json)),
  UNIQUE(session_id, revision)
);

-- Current pre-release growth facts, separate from the original game timeline.
CREATE TABLE technique_growth_projection (session_id TEXT PRIMARY KEY REFERENCES game_sessions(id) ON DELETE CASCADE, projection_json TEXT NOT NULL CHECK(json_valid(projection_json)));
CREATE TABLE technique_learning_events (id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE, event_json TEXT NOT NULL CHECK(json_valid(event_json)));
CREATE TABLE growth_feedback_receipts (id TEXT PRIMARY KEY, recorded_at_ms INTEGER NOT NULL);
