import type { D1Database } from '@cloudflare/workers-types'
import { ok, err } from '../result.ts'
import type { Result } from '../result.ts'
import type { Incident } from '../types/incident.ts'
import type { IncidentRepository, IncidentRepositoryError } from './IncidentRepository.ts'

type IncidentRow = {
  readonly id: string
  readonly monitor_id: string
  readonly started_at: number
  readonly resolved_at: number | null
  readonly cause: string | null
}

function rowToIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    monitorId: row.monitor_id,
    startedAt: row.started_at,
    ...(row.resolved_at !== null && { resolvedAt: row.resolved_at }),
    ...(row.cause !== null && { cause: row.cause }),
  }
}

export class D1IncidentRepository implements IncidentRepository {
  constructor(private readonly db: D1Database) {}

  async openIncident(
    monitorId: string,
    cause: string
  ): Promise<Result<Incident, IncidentRepositoryError>> {
    const incident: Incident = {
      id: crypto.randomUUID(),
      monitorId,
      startedAt: Date.now(),
      cause,
    }

    const result = await this.db
      .prepare(
        'INSERT INTO incidents (id, monitor_id, started_at, cause) VALUES (?, ?, ?, ?)'
      )
      .bind(incident.id, incident.monitorId, incident.startedAt, incident.cause)
      .run()

    if (!result.success) {
      return err({ type: 'db_error', message: 'Failed to open incident' })
    }

    return ok(incident)
  }

  async closeIncident(incidentId: string): Promise<Result<void, IncidentRepositoryError>> {
    const result = await this.db
      .prepare('UPDATE incidents SET resolved_at = ? WHERE id = ?')
      .bind(Date.now(), incidentId)
      .run()

    if (!result.success) {
      return err({ type: 'db_error', message: 'Failed to close incident' })
    }

    return ok(undefined)
  }

  async findOpenByMonitor(
    monitorId: string
  ): Promise<Result<Incident | null, IncidentRepositoryError>> {
    const row = await this.db
      .prepare(
        'SELECT * FROM incidents WHERE monitor_id = ? AND resolved_at IS NULL ORDER BY started_at DESC LIMIT 1'
      )
      .bind(monitorId)
      .first<IncidentRow>()

    if (row === null) return ok(null)

    return ok(rowToIncident(row))
  }

  async listByMonitor(
    monitorId: string
  ): Promise<Result<ReadonlyArray<Incident>, IncidentRepositoryError>> {
    const result = await this.db
      .prepare(
        'SELECT * FROM incidents WHERE monitor_id = ? ORDER BY started_at DESC LIMIT 50'
      )
      .bind(monitorId)
      .all<IncidentRow>()

    if (!result.success) {
      return err({ type: 'db_error', message: 'Failed to list incidents' })
    }

    return ok(result.results.map(rowToIncident))
  }
}
