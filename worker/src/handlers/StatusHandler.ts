import type { MonitorRepository } from '../repositories/MonitorRepository.ts'
import type { CheckResultRepository } from '../repositories/CheckResultRepository.ts'
import type { IncidentRepository } from '../repositories/IncidentRepository.ts'
import { unwrapOr } from '../result.ts'
import { calculateUptimePercent } from '../uptime.ts'

type MonitorStatus = {
  readonly id: string
  readonly name: string
  readonly type: string
  readonly historyDays: number
  readonly currentStatus: string | null
  readonly lastCheckedAt: number | null
  readonly responseMs: number | null
  readonly tlsDaysRemaining: number | null
  readonly uptimePercent: number | null
}

export class StatusHandler {
  constructor(
    private readonly monitorRepository: MonitorRepository,
    private readonly checkResultRepository: CheckResultRepository,
    private readonly incidentRepository: IncidentRepository,
    private readonly defaultHistoryDays: number
  ) {}

  async handle(): Promise<Response> {
    const monitorsResult = await this.monitorRepository.listAll()
    if (!monitorsResult.ok) {
      return Response.json({ error: 'Failed to load monitors' }, { status: 500 })
    }

    const statuses = await Promise.all(
      monitorsResult.value.map(async (monitor): Promise<MonitorStatus> => {
        const days = monitor.historyDays ?? this.defaultHistoryDays

        const [latestResult, historyResult] = await Promise.all([
          this.checkResultRepository.latestByMonitor(monitor.id),
          this.checkResultRepository.listByMonitor(monitor.id, days),
        ])

        const latest = unwrapOr(latestResult, null)
        const history = unwrapOr(historyResult, [])

        return {
          id: monitor.id,
          name: monitor.name,
          type: monitor.type,
          historyDays: days,
          currentStatus: latest?.status ?? null,
          lastCheckedAt: latest?.checkedAt ?? null,
          responseMs: latest?.responseMs ?? null,
          tlsDaysRemaining: latest?.tlsDaysRemaining ?? null,
          uptimePercent: calculateUptimePercent(history),
        }
      })
    )

    return Response.json({ monitors: statuses })
  }
}
