export interface Env {
  readonly ASSETS: Fetcher
  readonly DB: D1Database
  readonly STATUS_HUB: DurableObjectNamespace
  readonly SITE_TITLE: string
  readonly SITE_THEME: string
}
