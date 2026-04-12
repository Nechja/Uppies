import type { Monitor } from '../types/monitor.ts'
import type { CheckOutcome, CheckError } from '../types/check.ts'
import type { Result } from '../result.ts'

export interface CheckDispatcher {
  run(monitor: Monitor): Promise<Result<CheckOutcome, CheckError>>
}
