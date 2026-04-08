import type { Monitor } from '../types/monitor.ts'
import type { NotificationSender } from './NotificationSender.ts'

export interface NotificationSenderFactory {
  buildForMonitor(monitor: Monitor): NotificationSender
}
