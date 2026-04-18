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
}
