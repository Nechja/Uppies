import type { CheckOutcome } from '../types/check.ts'
import type { Monitor } from '../types/monitor.ts'
import type { NotificationSender } from '../notifications/NotificationSender.ts'
import type { Result } from '../result.ts'

export interface OutcomeHandler {
  handleOutcome(
    monitor: Monitor,
    outcome: CheckOutcome,
    notificationSender: NotificationSender
  ): Promise<Result<void, { message: string }>>
}
