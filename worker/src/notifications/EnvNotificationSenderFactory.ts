import type { Monitor, NotifyChannel, NotifyEvent } from '../types/monitor.ts'
import type { NotificationSender } from './NotificationSender.ts'
import type { NotificationSenderFactory } from './NotificationSenderFactory.ts'
import { EventFilteredNotificationSender } from './EventFilteredNotificationSender.ts'
import { CompositeNotificationSender } from './CompositeNotificationSender.ts'

export type SenderConstructor = (url: string) => NotificationSender
export type UrlResolver = (raw: string) => string | null

export class EnvNotificationSenderFactory implements NotificationSenderFactory {
  constructor(
    private readonly resolveUrl: UrlResolver,
    private readonly senderTypes: ReadonlyMap<string, SenderConstructor>
  ) {}

  buildForMonitor(monitor: Monitor): NotificationSender {
    const senders = monitor.notify
      .map((channel) => this.buildFilteredSender(channel))
      .filter((s): s is NotificationSender => s !== null)

    return new CompositeNotificationSender(senders)
  }

  private buildFilteredSender(channel: NotifyChannel): NotificationSender | null {
    const url = this.resolveUrl(channel.url)
    if (url === null) return null

    const create = this.senderTypes.get(channel.type)
    if (create === undefined) return null

    return new EventFilteredNotificationSender(
      create(url),
      channel.on as ReadonlyArray<NotifyEvent>
    )
  }
}
