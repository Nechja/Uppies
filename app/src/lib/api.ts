import type { MonitorSummary, MonitorDetail, SiteConfig } from './types.ts'
import type { Result } from './result.ts'
import { ok, err } from './result.ts'

type ApiError = { readonly message: string }

async function get<T>(path: string): Promise<Result<T, ApiError>> {
  const response = await fetch(path)

  if (!response.ok) {
    return err({ message: `HTTP ${response.status}` })
  }

  const data = await response.json() as T
  return ok(data)
}

export async function fetchConfig(): Promise<Result<SiteConfig, ApiError>> {
  return get('/api/config')
}

export async function fetchAllMonitors(): Promise<Result<{ monitors: ReadonlyArray<MonitorSummary> }, ApiError>> {
  return get('/api/monitors')
}

export async function fetchMonitorDetail(id: string): Promise<Result<MonitorDetail, ApiError>> {
  return get(`/api/monitors/${id}`)
}
