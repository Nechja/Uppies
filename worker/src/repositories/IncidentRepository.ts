import type { Incident } from '../types/incident.ts'
import type { Result } from '../result.ts'

export type IncidentRepositoryError = {
  readonly type: 'not_found' | 'db_error'
  readonly message: string
}

export interface IncidentRepository {
  openIncident(monitorId: string, cause: string): Promise<Result<Incident, IncidentRepositoryError>>
  closeIncident(incidentId: string): Promise<Result<void, IncidentRepositoryError>>
  findOpenByMonitor(monitorId: string): Promise<Result<Incident | null, IncidentRepositoryError>>
  listByMonitor(monitorId: string): Promise<Result<ReadonlyArray<Incident>, IncidentRepositoryError>>
}
