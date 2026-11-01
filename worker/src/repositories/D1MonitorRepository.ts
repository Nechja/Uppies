import type { D1Database } from '@cloudflare/workers-types'
import { ok, err } from '../result.ts'
import type { Result } from '../result.ts'
import type { Monitor } from '../types/monitor.ts'
import type { MonitorRepository, MonitorRepositoryError, MonitorStatusUpdate } from './MonitorRepository.ts'

type MonitorRow = {
  readonly id: string
  readonly name: string
  readonly url: string | null
  readonly host: string | null
  readonly port: number | null
  readonly type: string
  readonly interval_seconds: number
  readonly timeout_ms: number
  readonly tls_warn_days: number
  readonly enabled: number
  readonly config_json: string
  readonly last_checked_at: number | null
  readonly current_status: string | null
  readonly response_ms: number | null
  readonly tls_days_remaining: number | null
  readonly uptime_percent: number | null
}

function parseConfig(raw: string): Partial<Monitor> {
  try {
    return JSON.parse(raw) as Partial<Monitor>
  } catch {
    return {}
  }
}

function rowToMonitor(row: MonitorRow): Monitor {
  const config = parseConfig(row.config_json)
  return {
    id: row.id,
    name: row.name,
    type: row.type as Monitor['type'],
    intervalSeconds: row.interval_seconds,
    timeoutMs: row.timeout_ms,
    tlsWarnDays: row.tls_warn_days,
    enabled: row.enabled === 1,
    notify: config.notify ?? [],
    lastCheckedAt: row.last_checked_at ?? null,
    currentStatus: row.current_status ?? null,
    responseMs: row.response_ms ?? null,
    tlsDaysRemaining: row.tls_days_remaining ?? null,
    uptimePercent: row.uptime_percent ?? null,
    ...(row.url !== null && { url: row.url }),
    ...(row.host !== null && { host: row.host }),
    ...(row.port !== null && { port: row.port }),
    ...(config.historyDays !== undefined && { historyDays: config.historyDays }),
    ...(config.expect !== undefined && { expect: config.expect }),
  }
}

export class D1MonitorRepository implements MonitorRepository {
  constructor(private readonly db: D1Database) {}

  async listAll(): Promise<Result<ReadonlyArray<Monitor>, MonitorRepositoryError>> {
    const result = await this.db
      .prepare('SELECT * FROM monitors WHERE enabled = 1')
      .all<MonitorRow>()

    if (!result.success) {
      return err({ type: 'db_error', message: 'Failed to list monitors' })
    }

    return ok(result.results.map(rowToMonitor))
  }

  async findById(id: string): Promise<Result<Monitor, MonitorRepositoryError>> {
    const row = await this.db
      .prepare('SELECT * FROM monitors WHERE id = ?')
      .bind(id)
      .first<MonitorRow>()

    if (row === null) {
      return err({ type: 'not_found', message: `Monitor ${id} not found` })
    }

    return ok(rowToMonitor(row))
  }

  async upsertMany(monitors: ReadonlyArray<Monitor>): Promise<Result<void, MonitorRepositoryError>> {
    const statements = monitors.map((monitor) =>
      this.db
        .prepare(
          `INSERT INTO monitors (id, name, url, host, port, type, interval_seconds, timeout_ms, tls_warn_days, enabled, config_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             name = excluded.name, url = excluded.url, host = excluded.host,
             port = excluded.port, type = excluded.type,
             interval_seconds = excluded.interval_seconds, timeout_ms = excluded.timeout_ms,
             tls_warn_days = excluded.tls_warn_days, enabled = excluded.enabled,
             config_json = excluded.config_json`
        )
        .bind(
          monitor.id,
          monitor.name,
          monitor.url ?? null,
          monitor.host ?? null,
          monitor.port ?? null,
          monitor.type,
          monitor.intervalSeconds,
          monitor.timeoutMs,
          monitor.tlsWarnDays,
          monitor.enabled ? 1 : 0,
          JSON.stringify({
            ...(monitor.historyDays !== undefined && { historyDays: monitor.historyDays }),
            expect: monitor.expect,
            notify: monitor.notify,
          })
        )
    )

    const results = await this.db.batch(statements)
    const failed = results.find((r) => !r.success)

    if (failed !== undefined) {
      return err({ type: 'db_error', message: 'Failed to upsert monitors' })
    }

    return ok(undefined)
  }

  async updateStatus(
    id: string,
    update: MonitorStatusUpdate
  ): Promise<Result<void, MonitorRepositoryError>> {
    const query = update.uptimePercent !== undefined
      ? `UPDATE monitors SET
           last_checked_at = ?,
           current_status = ?,
           response_ms = ?,
           tls_days_remaining = ?,
           uptime_percent = ?
         WHERE id = ?`
      : `UPDATE monitors SET
           last_checked_at = ?,
           current_status = ?,
           response_ms = ?,
           tls_days_remaining = ?
         WHERE id = ?`

    const params = update.uptimePercent !== undefined
      ? [
          update.lastCheckedAt,
          update.currentStatus,
          update.responseMs ?? null,
          update.tlsDaysRemaining ?? null,
          update.uptimePercent ?? null,
          id,
        ]
      : [
          update.lastCheckedAt,
          update.currentStatus,
          update.responseMs ?? null,
          update.tlsDaysRemaining ?? null,
          id,
        ]

    const result = await this.db
      .prepare(query)
      .bind(...params)
      .run()

    if (!result.success) {
      return err({ type: 'db_error', message: `Failed to update status for monitor ${id}` })
    }

    return ok(undefined)
  }

  async updateUptimePercent(
    id: string,
    uptimePercent: number
  ): Promise<Result<void, MonitorRepositoryError>> {
    const result = await this.db
      .prepare('UPDATE monitors SET uptime_percent = ? WHERE id = ?')
      .bind(uptimePercent, id)
      .run()

    if (!result.success) {
      return err({ type: 'db_error', message: `Failed to update uptime percent for monitor ${id}` })
    }

    return ok(undefined)
  }
}

