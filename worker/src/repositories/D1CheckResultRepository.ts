import type { D1Database } from '@cloudflare/workers-types'
import { ok, err } from '../result.ts'
import type { Result } from '../result.ts'
import type { CheckOutcome } from '../types/check.ts'
import type { CheckResultRepository, CheckResultRepositoryError } from './CheckResultRepository.ts'

type CheckResultRow = {
  readonly id: string
  readonly monitor_id: string
  readonly checked_at: number
  readonly status: string
  readonly response_ms: number | null
  readonly status_code: number | null
  readonly tls_days_remaining: number | null
  readonly error: string | null
}

function rowToCheckOutcome(row: CheckResultRow): CheckOutcome {
  return {
    monitorId: row.monitor_id,
    checkedAt: row.checked_at,
    status: row.status as CheckOutcome['status'],
    ...(row.response_ms !== null && { responseMs: row.response_ms }),
    ...(row.status_code !== null && { statusCode: row.status_code }),
    ...(row.tls_days_remaining !== null && { tlsDaysRemaining: row.tls_days_remaining }),
    ...(row.error !== null && { error: row.error }),
  }
}

function generateId(): string {
  return crypto.randomUUID()
}

export class D1CheckResultRepository implements CheckResultRepository {
  constructor(private readonly db: D1Database) {}

  async insert(outcome: CheckOutcome): Promise<Result<void, CheckResultRepositoryError>> {
    const result = await this.db
      .prepare(
        `INSERT INTO check_results (id, monitor_id, checked_at, status, response_ms, status_code, tls_days_remaining, error)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        generateId(),
        outcome.monitorId,
        outcome.checkedAt,
        outcome.status,
        outcome.responseMs ?? null,
        outcome.statusCode ?? null,
        outcome.tlsDaysRemaining ?? null,
        outcome.error ?? null
      )
      .run()

    if (!result.success) {
      return err({ type: 'db_error', message: 'Failed to insert check result' })
    }

    return ok(undefined)
  }

  async listByMonitor(
    monitorId: string,
    limitDays: number
  ): Promise<Result<ReadonlyArray<CheckOutcome>, CheckResultRepositoryError>> {
    const since = Date.now() - limitDays * 24 * 60 * 60 * 1000

    const result = await this.db
      .prepare(
        'SELECT * FROM check_results WHERE monitor_id = ? AND checked_at > ? ORDER BY checked_at DESC'
      )
      .bind(monitorId, since)
      .all<CheckResultRow>()

    if (!result.success) {
      return err({ type: 'db_error', message: 'Failed to list check results' })
    }

    return ok(result.results.map(rowToCheckOutcome))
  }

  async latestByMonitor(
    monitorId: string
  ): Promise<Result<CheckOutcome | null, CheckResultRepositoryError>> {
    const row = await this.db
      .prepare(
        'SELECT * FROM check_results WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT 1'
      )
      .bind(monitorId)
      .first<CheckResultRow>()

    if (row === null) return ok(null)

    return ok(rowToCheckOutcome(row))
  }

  async lastCheckedAtByMonitors(
    monitorIds: ReadonlyArray<string>
  ): Promise<Result<ReadonlyMap<string, number>, CheckResultRepositoryError>> {
    if (monitorIds.length === 0) return ok(new Map())

    const placeholders = monitorIds.map(() => '?').join(', ')
    const result = await this.db
      .prepare(
        `SELECT monitor_id, MAX(checked_at) AS last_checked_at FROM check_results WHERE monitor_id IN (${placeholders}) GROUP BY monitor_id`
      )
      .bind(...monitorIds)
      .all<{ monitor_id: string; last_checked_at: number }>()

    if (!result.success) {
      return err({ type: 'db_error', message: 'Failed to fetch last checked times' })
    }

    const map = new Map(result.results.map((r) => [r.monitor_id, r.last_checked_at]))
    return ok(map)
  }

  async recordDailyStat(
    monitorId: string,
    date: string,
    status: string
  ): Promise<Result<void, CheckResultRepositoryError>> {
    const isUp = status === 'up' ? 1 : 0
    const isDegraded = status === 'degraded' ? 1 : 0
    const isDown = status === 'down' ? 1 : 0

    const result = await this.db
      .prepare(
        `INSERT INTO monitor_daily_stats (monitor_id, date, total_checks, up_checks, degraded_checks, down_checks)
         VALUES (?, ?, 1, ?, ?, ?)
         ON CONFLICT(monitor_id, date) DO UPDATE SET
           total_checks = total_checks + 1,
           up_checks = up_checks + excluded.up_checks,
           degraded_checks = degraded_checks + excluded.degraded_checks,
           down_checks = down_checks + excluded.down_checks`
      )
      .bind(monitorId, date, isUp, isDegraded, isDown)
      .run()

    if (!result.success) {
      return err({ type: 'db_error', message: 'Failed to record daily stat' })
    }

    return ok(undefined)
  }

  async calculateUptimeFromStats(
    monitorId: string,
    sinceDate: string
  ): Promise<Result<number | null, CheckResultRepositoryError>> {
    const row = await this.db
      .prepare(
        `SELECT
           SUM(total_checks) AS total,
           SUM(up_checks) AS up_count
         FROM monitor_daily_stats
         WHERE monitor_id = ? AND date >= ?`
      )
      .bind(monitorId, sinceDate)
      .first<{ total: number | null; up_count: number | null }>()

    if (row === null || row.total === null || row.total === 0) {
      return ok(null)
    }

    const upCount = row.up_count ?? 0
    const percent = Math.round((upCount / row.total) * 1000) / 10
    return ok(percent)
  }

  async deleteOlderThan(
    cutoffTimestampMs: number,
    cutoffDate: string
  ): Promise<Result<void, CheckResultRepositoryError>> {
    const results = await this.db.batch([
      this.db
        .prepare('DELETE FROM check_results WHERE checked_at < ?')
        .bind(cutoffTimestampMs),
      this.db
        .prepare('DELETE FROM monitor_daily_stats WHERE date < ?')
        .bind(cutoffDate),
    ])

    const failed = results.find((r) => !r.success)
    if (failed !== undefined) {
      return err({ type: 'db_error', message: 'Failed to delete expired records' })
    }

    return ok(undefined)
  }
}

