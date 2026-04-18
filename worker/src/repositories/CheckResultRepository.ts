import type { CheckOutcome } from '../types/check.ts'
import type { Result } from '../result.ts'

export type CheckResultRepositoryError = {
  readonly type: 'db_error'
  readonly message: string
}

export interface CheckResultRepository {
  insert(outcome: CheckOutcome): Promise<Result<void, CheckResultRepositoryError>>
  listByMonitor(
    monitorId: string,
    limitDays: number
  ): Promise<Result<ReadonlyArray<CheckOutcome>, CheckResultRepositoryError>>
  latestByMonitor(
    monitorId: string
  ): Promise<Result<CheckOutcome | null, CheckResultRepositoryError>>
  lastCheckedAtByMonitors(
    monitorIds: ReadonlyArray<string>
  ): Promise<Result<ReadonlyMap<string, number>, CheckResultRepositoryError>>
}
