import { ok, err } from '../result.ts'
import type { Result } from '../result.ts'
import type { NotificationSender, NotificationError, NotificationPayload } from './NotificationSender.ts'

const STATUS_COLORS: Record<string, number> = {
  down: 0xff1155,
  degraded: 0xffaa00,
  recover: 0x00ff88,
  tls_warn: 0xffaa00,
}

const STATUS_LABELS: Record<string, string> = {
  down: 'DOWN',
  degraded: 'DEGRADED',
  recover: 'RECOVERED',
  tls_warn: 'TLS WARNING',
}

function buildEmbed(payload: NotificationPayload): Record<string, unknown> {
  const color = STATUS_COLORS[payload.event] ?? 0x888888
  const label = STATUS_LABELS[payload.event] ?? payload.event.toUpperCase()

  const fields: Array<{ name: string; value: string; inline: boolean }> = []

  if (payload.outcome.responseMs !== undefined) {
    fields.push({ name: 'Response time', value: `${payload.outcome.responseMs}ms`, inline: true })
  }

  if (payload.outcome.statusCode !== undefined) {
    fields.push({ name: 'Status code', value: String(payload.outcome.statusCode), inline: true })
  }

  if (payload.outcome.tlsDaysRemaining !== undefined) {
    fields.push({
      name: 'TLS days remaining',
      value: String(payload.outcome.tlsDaysRemaining),
      inline: true,
    })
  }

  if (payload.outcome.error !== undefined) {
    fields.push({ name: 'Error', value: payload.outcome.error, inline: false })
  }

  return {
    title: `${label}: ${payload.monitor.name}`,
    color,
    fields,
    timestamp: new Date(payload.outcome.checkedAt).toISOString(),
    footer: { text: 'Uppies' },
  }
}

export class DiscordNotificationSender implements NotificationSender {
  constructor(private readonly webhookUrl: string) {}

  async send(payload: NotificationPayload): Promise<Result<void, NotificationError>> {
    const body = JSON.stringify({ embeds: [buildEmbed(payload)] })

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    if (!response.ok) {
      return err({ type: 'send_failed', message: `Discord returned ${response.status}` })
    }

    return ok(undefined)
  }
}
