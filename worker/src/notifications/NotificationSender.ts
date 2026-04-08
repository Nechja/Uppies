import type { Monitor } from '../types/monitor.ts'
import type { CheckOutcome } from '../types/check.ts'
import type { Incident } from '../types/incident.ts'
import type { NotifyEvent } from '../types/monitor.ts'
import type { Result } from '../result.ts'

export type NotificationError = {
  readonly type: 'send_failed'
  readonly message: string
}

export type NotificationPayload = {
  readonly event: NotifyEvent
  readonly monitor: Monitor
  readonly outcome: CheckOutcome
  readonly incident?: Incident
}

export interface NotificationSender {
  send(payload: NotificationPayload): Promise<Result<void, NotificationError>>
}
