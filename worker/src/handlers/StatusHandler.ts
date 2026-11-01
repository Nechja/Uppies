import type { MonitorRepository } from '../repositories/MonitorRepository.ts'

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
    private readonly defaultHistoryDays: number
  ) {}

  async handle(): Promise<Response> {
    const monitorsResult = await this.monitorRepository.listAll()
    if (!monitorsResult.ok) {
      return Response.json({ error: 'Failed to load monitors' }, { status: 500 })
    }

    const statuses: ReadonlyArray<MonitorStatus> = monitorsResult.value.map((monitor) => ({
      id: monitor.id,
      name: monitor.name,
      type: monitor.type,
      historyDays: monitor.historyDays ?? this.defaultHistoryDays,
      currentStatus: monitor.currentStatus ?? null,
      lastCheckedAt: monitor.lastCheckedAt ?? null,
      responseMs: monitor.responseMs ?? null,
      tlsDaysRemaining: monitor.tlsDaysRemaining ?? null,
      uptimePercent: monitor.uptimePercent ?? null,
    }))

    return Response.json({ monitors: statuses })
  }
}

