import type { Monitor } from '../types/monitor.ts'
import type { Result } from '../result.ts'

export type MonitorRepositoryError = {
  readonly type: 'not_found' | 'db_error'
  readonly message: string
}

export interface MonitorRepository {
  listAll(): Promise<Result<ReadonlyArray<Monitor>, MonitorRepositoryError>>
  findById(id: string): Promise<Result<Monitor, MonitorRepositoryError>>
  upsertMany(monitors: ReadonlyArray<Monitor>): Promise<Result<void, MonitorRepositoryError>>
}
