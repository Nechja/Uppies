export type CheckStatus = 'up' | 'degraded' | 'down' | 'unknown'

export type MonitorSummary = {
  readonly id: string
  readonly name: string
  readonly type: string
  readonly historyDays: number
  readonly currentStatus: CheckStatus
  readonly lastCheckedAt: number | null
  readonly responseMs: number | null
  readonly tlsDaysRemaining: number | null
  readonly uptimePercent: number | null
}

export type CheckResult = {
  readonly monitorId: string
  readonly checkedAt: number
  readonly status: CheckStatus
  readonly responseMs?: number
  readonly statusCode?: number
  readonly tlsDaysRemaining?: number
  readonly error?: string
}

export type Incident = {
  readonly id: string
  readonly monitorId: string
  readonly startedAt: number
  readonly resolvedAt?: number
  readonly cause?: string
}

export type MonitorDetail = {
  readonly monitor: MonitorSummary
  readonly history: ReadonlyArray<CheckResult>
  readonly incidents: ReadonlyArray<Incident>
}

export type Theme = 'cyberpunk' | 'terminal' | 'clean-dark' | 'light' | 'corporate'

export type SiteConfig = {
  readonly title: string
  readonly theme: Theme
  readonly themes: ReadonlyArray<string>
}
