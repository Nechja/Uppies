import type { MonitorRepository } from '../repositories/MonitorRepository.ts'
import type { CheckResultRepository } from '../repositories/CheckResultRepository.ts'
import type { IncidentRepository } from '../repositories/IncidentRepository.ts'

function calculateUptimePercent(results: ReadonlyArray<{ status: string }>): number {
  if (results.length === 0) return 100
  const upCount = results.filter((r) => r.status === 'up').length
  return Math.round((upCount / results.length) * 1000) / 10
}

export class MonitorDetailHandler {
  constructor(
    private readonly monitorRepository: MonitorRepository,
    private readonly checkResultRepository: CheckResultRepository,
    private readonly incidentRepository: IncidentRepository
  ) {}

  async handle(monitorId: string): Promise<Response> {
    const [monitorResult, historyResult, incidentsResult] = await Promise.all([
      this.monitorRepository.findById(monitorId),
      this.checkResultRepository.listByMonitor(monitorId, 90),
      this.incidentRepository.listByMonitor(monitorId),
    ])

    if (!monitorResult.ok) {
      return Response.json({ error: 'Monitor not found' }, { status: 404 })
    }

    const history = historyResult.ok ? historyResult.value : []
    const incidents = incidentsResult.ok ? incidentsResult.value : []
    const latest = history[0] ?? null

    const monitor = {
      id: monitorResult.value.id,
      name: monitorResult.value.name,
      type: monitorResult.value.type,
      currentStatus: latest?.status ?? null,
      lastCheckedAt: latest?.checkedAt ?? null,
      responseMs: latest?.responseMs ?? null,
      tlsDaysRemaining: latest?.tlsDaysRemaining ?? null,
      uptimePercent30d: calculateUptimePercent(history),
    }

    return Response.json({ monitor, history, incidents })
  }
}
