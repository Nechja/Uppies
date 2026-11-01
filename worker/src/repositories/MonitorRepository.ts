import type { Monitor } from '../types/monitor.ts'
import type { Result } from '../result.ts'

export type MonitorRepositoryError = {
  readonly type: 'not_found' | 'db_error'
  readonly message: string
}

export type MonitorStatusUpdate = {
  readonly lastCheckedAt: number
  readonly currentStatus: string
  readonly responseMs?: number | null
  readonly tlsDaysRemaining?: number | null
  readonly uptimePercent?: number | null
}

export interface MonitorRepository {
  listAll(): Promise<Result<ReadonlyArray<Monitor>, MonitorRepositoryError>>
  findById(id: string): Promise<Result<Monitor, MonitorRepositoryError>>
  upsertMany(monitors: ReadonlyArray<Monitor>): Promise<Result<void, MonitorRepositoryError>>
  updateStatus(id: string, update: MonitorStatusUpdate): Promise<Result<void, MonitorRepositoryError>>
  updateUptimePercent(id: string, uptimePercent: number): Promise<Result<void, MonitorRepositoryError>>
}
