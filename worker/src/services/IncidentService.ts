import type { IncidentRepository } from '../repositories/IncidentRepository.ts'
import type { CheckOutcome } from '../types/check.ts'
import type { Monitor } from '../types/monitor.ts'
import type { NotificationSender, NotificationPayload } from '../notifications/NotificationSender.ts'
import type { Result } from '../result.ts'
import { ok } from '../result.ts'
import type { OutcomeHandler } from './OutcomeHandler.ts'

export class IncidentService implements OutcomeHandler {
  constructor(private readonly incidentRepository: IncidentRepository) {}

  async handleOutcome(
    monitor: Monitor,
    outcome: CheckOutcome,
    notificationSender: NotificationSender
  ): Promise<Result<void, { message: string }>> {
    const openResult = await this.incidentRepository.findOpenByMonitor(monitor.id)
    if (!openResult.ok) return ok(undefined)

    const openIncident = openResult.value

    if (outcome.status !== 'up' && openIncident === null) {
      const incidentResult = await this.incidentRepository.openIncident(
        monitor.id,
        outcome.error ?? outcome.status
      )
      if (!incidentResult.ok) return ok(undefined)

      const payload: NotificationPayload = {
        event: 'down',
        monitor,
        outcome,
        incident: incidentResult.value,
      }

      await notificationSender.send(payload)
      return ok(undefined)
    }

    if (outcome.status === 'up' && openIncident !== null) {
      await this.incidentRepository.closeIncident(openIncident.id)

      const payload: NotificationPayload = {
        event: 'recover',
        monitor,
        outcome,
        incident: openIncident,
      }

      await notificationSender.send(payload)
    }

    return ok(undefined)
  }
}
