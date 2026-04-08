import type { MonitorRepository } from '../repositories/MonitorRepository.ts'
import type { CheckResultRepository } from '../repositories/CheckResultRepository.ts'
import type { CheckRunnerRegistry } from '../checks/CheckRunnerRegistry.ts'
import type { IncidentService } from './IncidentService.ts'
import type { NotificationSenderFactory } from '../notifications/NotificationSenderFactory.ts'
import type { Result } from '../result.ts'
import { ok } from '../result.ts'

export class MonitorCheckService {
  constructor(
    private readonly monitorRepository: MonitorRepository,
    private readonly checkResultRepository: CheckResultRepository,
    private readonly checkRunnerRegistry: CheckRunnerRegistry,
    private readonly incidentService: IncidentService,
    private readonly notificationSenderFactory: NotificationSenderFactory
  ) {}

  async runAllChecks(): Promise<Result<void, { message: string }>> {
    const monitorsResult = await this.monitorRepository.listAll()
    if (!monitorsResult.ok) return ok(undefined)

    await Promise.allSettled(
      monitorsResult.value.map(async (monitor) => {
        const result = await this.checkRunnerRegistry.run(monitor)
        if (!result.ok) return

        await this.checkResultRepository.insert(result.value)

        const notificationSender = this.notificationSenderFactory.buildForMonitor(monitor)
        await this.incidentService.handleOutcome(monitor, result.value, notificationSender)
      })
    )

    return ok(undefined)
  }
}
