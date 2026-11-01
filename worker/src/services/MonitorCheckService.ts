import type { MonitorRepository } from '../repositories/MonitorRepository.ts'
import type { CheckResultRepository } from '../repositories/CheckResultRepository.ts'
import type { CheckDispatcher } from '../checks/CheckDispatcher.ts'
import type { OutcomeHandler } from './OutcomeHandler.ts'
import type { NotificationSenderFactory } from '../notifications/NotificationSenderFactory.ts'
import type { Result } from '../result.ts'
import { ok } from '../result.ts'

export class MonitorCheckService {
  constructor(
    private readonly monitorRepository: MonitorRepository,
    private readonly checkResultRepository: CheckResultRepository,
    private readonly checkDispatcher: CheckDispatcher,
    private readonly outcomeHandler: OutcomeHandler,
    private readonly notificationSenderFactory: NotificationSenderFactory,
    private readonly defaultHistoryDays: number = 90
  ) {}

  async runAllChecks(): Promise<Result<{ checksRan: number }, { message: string }>> {
    const monitorsResult = await this.monitorRepository.listAll()
    if (!monitorsResult.ok) return ok({ checksRan: 0 })

    const allMonitors = monitorsResult.value
    const now = Date.now()
    const dueMonitors = allMonitors.filter((monitor) => {
      const lastChecked = monitor.lastCheckedAt
      if (lastChecked === null || lastChecked === undefined) return true
      return now - lastChecked >= monitor.intervalSeconds * 1000
    })

    if (dueMonitors.length === 0) {
      return ok({ checksRan: 0 })
    }

    await Promise.allSettled(
      dueMonitors.map(async (monitor) => {
        const result = await this.checkDispatcher.run(monitor)
        if (!result.ok) return

        const outcome = result.value
        await this.checkResultRepository.insert(outcome)

        const date = new Date(outcome.checkedAt).toISOString().slice(0, 10)
        await this.checkResultRepository.recordDailyStat(monitor.id, date, outcome.status)

        const days = monitor.historyDays ?? this.defaultHistoryDays
        const cutoffDate = new Date(now - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        const uptimeRes = await this.checkResultRepository.calculateUptimeFromStats(monitor.id, cutoffDate)
        const uptimePercent = uptimeRes.ok ? uptimeRes.value : null

        await this.monitorRepository.updateStatus(monitor.id, {
          lastCheckedAt: outcome.checkedAt,
          currentStatus: outcome.status,
          responseMs: outcome.responseMs ?? null,
          tlsDaysRemaining: outcome.tlsDaysRemaining ?? null,
          uptimePercent,
        })

        const notificationSender = this.notificationSenderFactory.buildForMonitor(monitor)
        await this.outcomeHandler.handleOutcome(monitor, outcome, notificationSender)
      })
    )

    return ok({ checksRan: dueMonitors.length })
  }
}

