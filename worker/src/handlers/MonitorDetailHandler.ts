import type { MonitorRepository } from '../repositories/MonitorRepository.ts'
import type { CheckResultRepository } from '../repositories/CheckResultRepository.ts'
import type { IncidentRepository } from '../repositories/IncidentRepository.ts'
import { unwrapOr } from '../result.ts'
import { calculateUptimePercent } from '../uptime.ts'

export class MonitorDetailHandler {
  constructor(
    private readonly monitorRepository: MonitorRepository,
    private readonly checkResultRepository: CheckResultRepository,
    private readonly incidentRepository: IncidentRepository,
    private readonly defaultHistoryDays: number
  ) {}

  async handle(monitorId: string): Promise<Response> {
    const monitorResult = await this.monitorRepository.findById(monitorId)
    if (!monitorResult.ok) {
      return Response.json({ error: 'Monitor not found' }, { status: 404 })
    }

    const days = monitorResult.value.historyDays ?? this.defaultHistoryDays

    const [historyResult, incidentsResult] = await Promise.all([
      this.checkResultRepository.listByMonitor(monitorId, days),
      this.incidentRepository.listByMonitor(monitorId),
    ])

    const history = unwrapOr(historyResult, [])
    const incidents = unwrapOr(incidentsResult, [])
    const latest = history[0] ?? null

    const monitor = {
      id: monitorResult.value.id,
      name: monitorResult.value.name,
      type: monitorResult.value.type,
      historyDays: days,
      currentStatus: latest?.status ?? null,
      lastCheckedAt: latest?.checkedAt ?? null,
      responseMs: latest?.responseMs ?? null,
      tlsDaysRemaining: latest?.tlsDaysRemaining ?? null,
      uptimePercent: calculateUptimePercent(history),
    }

    return Response.json({ monitor, history, incidents })
  }
}
