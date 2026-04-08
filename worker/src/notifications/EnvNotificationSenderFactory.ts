import type { Monitor, NotifyChannel, NotifyEvent } from '../types/monitor.ts'
import type { NotificationSender } from './NotificationSender.ts'
import type { NotificationSenderFactory } from './NotificationSenderFactory.ts'
import { DiscordNotificationSender } from './DiscordNotificationSender.ts'
import { WebhookNotificationSender } from './WebhookNotificationSender.ts'
import { EventFilteredNotificationSender } from './EventFilteredNotificationSender.ts'
import { CompositeNotificationSender } from './CompositeNotificationSender.ts'

export class EnvNotificationSenderFactory implements NotificationSenderFactory {
  constructor(private readonly env: Record<string, unknown>) {}

  buildForMonitor(monitor: Monitor): NotificationSender {
    const senders = monitor.notify
      .map((channel) => this.buildFilteredSender(channel))
      .filter((s): s is NotificationSender => s !== null)

    return new CompositeNotificationSender(senders)
  }

  private buildFilteredSender(channel: NotifyChannel): NotificationSender | null {
    const url = this.resolveUrl(channel.url)
    if (url === null) return null

    const inner = channel.type === 'discord'
      ? new DiscordNotificationSender(url)
      : new WebhookNotificationSender(url)

    return new EventFilteredNotificationSender(inner, channel.on as ReadonlyArray<NotifyEvent>)
  }

  private resolveUrl(rawUrl: string): string | null {
    if (!rawUrl.startsWith('$')) return rawUrl
    const varName = rawUrl.slice(1)
    const value = this.env[varName]
    if (typeof value !== 'string' || value.length === 0) return null
    return value
  }
}
