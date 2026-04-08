import type { NotificationSender, NotificationPayload, NotificationError } from './NotificationSender.ts'
import type { Result } from '../result.ts'
import { ok } from '../result.ts'

export class CompositeNotificationSender implements NotificationSender {
  constructor(private readonly senders: ReadonlyArray<NotificationSender>) {}

  async send(payload: NotificationPayload): Promise<Result<void, NotificationError>> {
    await Promise.allSettled(this.senders.map((s) => s.send(payload)))
    return ok(undefined)
  }
}
