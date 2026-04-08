import type { MonitorRepository } from '../repositories/MonitorRepository.ts'
import type { CheckResultRepository } from '../repositories/CheckResultRepository.ts'
import type { IncidentRepository } from '../repositories/IncidentRepository.ts'

type MonitorStatus = {
  readonly id: string
  readonly name: string
  readonly type: string
  readonly currentStatus: string | null
  readonly lastCheckedAt: number | null
  readonly responseMs: number | null
  readonly tlsDaysRemaining: number | null
  readonly uptimePercent30d: number | null
}

function calculateUptimePercent(results: ReadonlyArray<{ status: string }>): number {
  if (results.length === 0) return 100
  const upCount = results.filter((r) => r.status === 'up').length
  return Math.round((upCount / results.length) * 1000) / 10
}

export class StatusHandler {
  constructor(
    private readonly monitorRepository: MonitorRepository,
    private readonly checkResultRepository: CheckResultRepository,
    private readonly incidentRepository: IncidentRepository
  ) {}

  async handle(): Promise<Response> {
    const monitorsResult = await this.monitorRepository.listAll()
    if (!monitorsResult.ok) {
      return Response.json({ error: 'Failed to load monitors' }, { status: 500 })
    }

    const statuses = await Promise.all(
      monitorsResult.value.map(async (monitor): Promise<MonitorStatus> => {
        const [latestResult, historyResult] = await Promise.all([
          this.checkResultRepository.latestByMonitor(monitor.id),
          this.checkResultRepository.listByMonitor(monitor.id, 30),
        ])

        const latest = latestResult.ok ? latestResult.value : null
        const history = historyResult.ok ? historyResult.value : []

        return {
          id: monitor.id,
          name: monitor.name,
          type: monitor.type,
          currentStatus: latest?.status ?? null,
          lastCheckedAt: latest?.checkedAt ?? null,
          responseMs: latest?.responseMs ?? null,
          tlsDaysRemaining: latest?.tlsDaysRemaining ?? null,
          uptimePercent30d: calculateUptimePercent(history),
        }
      })
    )

    return Response.json({ monitors: statuses })
  }
}
