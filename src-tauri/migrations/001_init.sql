CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS timer_snapshot (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS focus_sessions (
  id TEXT PRIMARY KEY,
  completion_key TEXT NOT NULL UNIQUE,
  task_id TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS focus_sessions_ended_at
ON focus_sessions (ended_at);
