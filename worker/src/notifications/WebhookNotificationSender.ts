import { ok, err } from '../result.ts'
import type { Result } from '../result.ts'
import type { NotificationSender, NotificationError, NotificationPayload } from './NotificationSender.ts'

export class WebhookNotificationSender implements NotificationSender {
  constructor(private readonly webhookUrl: string) {}

  async send(payload: NotificationPayload): Promise<Result<void, NotificationError>> {
    const body = JSON.stringify({
      event: payload.event,
      monitor: {
        id: payload.monitor.id,
        name: payload.monitor.name,
        url: payload.monitor.url,
        type: payload.monitor.type,
      },
      outcome: payload.outcome,
      incident: payload.incident,
    })

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    if (!response.ok) {
      return err({ type: 'send_failed', message: `Webhook returned ${response.status}` })
    }

    return ok(undefined)
  }
}
