import { ok } from '../result.ts'
import type { Result } from '../result.ts'
import type { NotifyEvent } from '../types/monitor.ts'
import type { NotificationSender, NotificationPayload, NotificationError } from './NotificationSender.ts'

export class EventFilteredNotificationSender implements NotificationSender {
  constructor(
    private readonly sender: NotificationSender,
    private readonly allowedEvents: ReadonlyArray<NotifyEvent>
  ) {}

  send(payload: NotificationPayload): Promise<Result<void, NotificationError>> {
    if (!this.allowedEvents.includes(payload.event)) return Promise.resolve(ok(undefined))
    return this.sender.send(payload)
  }
}
