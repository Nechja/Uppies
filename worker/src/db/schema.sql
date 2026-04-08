CREATE TABLE IF NOT EXISTS monitors (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  url             TEXT,
  host            TEXT,
  port            INTEGER,
  type            TEXT NOT NULL,
  interval_seconds INTEGER NOT NULL DEFAULT 60,
  timeout_ms      INTEGER NOT NULL DEFAULT 10000,
  tls_warn_days   INTEGER NOT NULL DEFAULT 30,
  enabled         INTEGER NOT NULL DEFAULT 1,
  config_json     TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS check_results (
  id              TEXT PRIMARY KEY,
  monitor_id      TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  checked_at      INTEGER NOT NULL,
  status          TEXT NOT NULL,
  response_ms     INTEGER,
  status_code     INTEGER,
  tls_days_remaining INTEGER,
  error           TEXT
);

CREATE INDEX IF NOT EXISTS idx_check_results_monitor_time
  ON check_results(monitor_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS incidents (
  id              TEXT PRIMARY KEY,
  monitor_id      TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  started_at      INTEGER NOT NULL,
  resolved_at     INTEGER,
  cause           TEXT
);

CREATE INDEX IF NOT EXISTS idx_incidents_monitor
  ON incidents(monitor_id, started_at DESC);
