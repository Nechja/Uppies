-- Migration script for existing databases
-- Run via: pnpm exec wrangler d1 execute uppies --remote --file=src/db/migrate-v2.sql

ALTER TABLE monitors ADD COLUMN last_checked_at INTEGER;
ALTER TABLE monitors ADD COLUMN current_status TEXT;
ALTER TABLE monitors ADD COLUMN response_ms INTEGER;
ALTER TABLE monitors ADD COLUMN tls_days_remaining INTEGER;
ALTER TABLE monitors ADD COLUMN uptime_percent REAL;

CREATE TABLE IF NOT EXISTS monitor_daily_stats (
  monitor_id      TEXT NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,
  total_checks    INTEGER NOT NULL DEFAULT 0,
  up_checks       INTEGER NOT NULL DEFAULT 0,
  degraded_checks INTEGER NOT NULL DEFAULT 0,
  down_checks     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (monitor_id, date)
);

-- Backfill daily stats from existing check_results if present
INSERT OR IGNORE INTO monitor_daily_stats (monitor_id, date, total_checks, up_checks, degraded_checks, down_checks)
SELECT
  monitor_id,
  date(checked_at / 1000, 'unixepoch') AS date,
  COUNT(*) AS total_checks,
  SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) AS up_checks,
  SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END) AS degraded_checks,
  SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END) AS down_checks
FROM check_results
GROUP BY monitor_id, date(checked_at / 1000, 'unixepoch');

-- Backfill latest monitor status from most recent check_results
UPDATE monitors
SET
  last_checked_at = (SELECT checked_at FROM check_results WHERE monitor_id = monitors.id ORDER BY checked_at DESC LIMIT 1),
  current_status = (SELECT status FROM check_results WHERE monitor_id = monitors.id ORDER BY checked_at DESC LIMIT 1),
  response_ms = (SELECT response_ms FROM check_results WHERE monitor_id = monitors.id ORDER BY checked_at DESC LIMIT 1),
  tls_days_remaining = (SELECT tls_days_remaining FROM check_results WHERE monitor_id = monitors.id ORDER BY checked_at DESC LIMIT 1),
  uptime_percent = (SELECT ROUND(CAST(SUM(up_checks) AS REAL) / SUM(total_checks) * 100, 1) FROM monitor_daily_stats WHERE monitor_id = monitors.id AND total_checks > 0);
