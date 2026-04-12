export interface Env {
  readonly ASSETS: Fetcher
  readonly DB: D1Database
  readonly STATUS_HUB: DurableObjectNamespace
  readonly SITE_TITLE: string
  readonly SITE_THEME: string
  readonly SITE_THEMES?: string
  readonly CACHE_TTL: string
  readonly MAX_BODY_BYTES: string
  readonly HISTORY_DAYS: string
}
