import type { MonitorSummary, MonitorDetail, SiteConfig } from './types.ts'

type ApiError = { readonly message: string }
type ApiResult<T> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: ApiError }

async function get<T>(path: string): Promise<ApiResult<T>> {
  const response = await fetch(path)

  if (!response.ok) {
    return { ok: false, error: { message: `HTTP ${response.status}` } }
  }

  const data = await response.json() as T
  return { ok: true, data }
}

export async function fetchConfig(): Promise<ApiResult<SiteConfig>> {
  return get('/api/config')
}

export async function fetchAllMonitors(): Promise<ApiResult<{ monitors: ReadonlyArray<MonitorSummary> }>> {
  return get('/api/monitors')
}

export async function fetchMonitorDetail(id: string): Promise<ApiResult<MonitorDetail>> {
  return get(`/api/monitors/${id}`)
}
