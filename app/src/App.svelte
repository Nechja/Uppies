<script lang="ts">
  import { onMount } from 'svelte'
  import Overview from './components/Overview.svelte'
  import MonitorDetail from './components/MonitorDetail.svelte'
  import { fetchConfig, fetchAllMonitors } from './lib/api.ts'
  import { openLiveConnection } from './lib/live.ts'
  import { applyTheme } from './lib/theme.ts'
  import type { MonitorSummary, Theme, CheckStatus } from './lib/types.ts'

  type View = { type: 'overview' } | { type: 'detail'; monitorId: string }

  let view = $state<View>({ type: 'overview' })
  let siteTitle = $state('Uppies')
  let monitors = $state<ReadonlyArray<MonitorSummary> | null>(null)
  let liveConnected = $state(false)

  const overallStatus = $derived<CheckStatus>((() => {
    if (monitors === null || monitors.length === 0) return 'unknown'
    if (monitors.some((m) => m.currentStatus === 'down')) return 'down'
    if (monitors.some((m) => m.currentStatus === 'degraded')) return 'degraded'
    return 'up'
  })())

  const statusLabel: Record<CheckStatus, string> = {
    up: 'All systems operational',
    degraded: 'Degraded performance',
    down: 'Partial outage',
    unknown: 'Checking...',
  }

  function navigateToDetail(monitorId: string) {
    view = { type: 'detail', monitorId }
    history.pushState({ monitorId }, '', `/monitor/${monitorId}`)
  }

  function navigateToOverview() {
    view = { type: 'overview' }
    history.pushState({}, '', '/')
  }

  const VALID_THEMES = new Set<string>(['cyberpunk', 'terminal', 'clean-dark', 'light', 'corporate'])

  function isValidTheme(value: string): value is Theme {
    return VALID_THEMES.has(value)
  }

  onMount(async () => {
    const [configResult, monitorsResult] = await Promise.all([
      fetchConfig(),
      fetchAllMonitors(),
    ])

    if (configResult.ok) {
      siteTitle = configResult.data.title
      document.title = configResult.data.title
      if (isValidTheme(configResult.data.theme)) {
        applyTheme(configResult.data.theme)
      }
    }

    if (monitorsResult.ok) {
      monitors = monitorsResult.data.monitors
    }

    const disconnect = openLiveConnection({
      onMonitors: (updated) => { monitors = updated },
      onStateChange: (connected) => { liveConnected = connected },
    })

    const path = window.location.pathname
    const match = /^\/monitor\/(.+)$/.exec(path)
    if (match !== null && match[1] !== undefined) {
      view = { type: 'detail', monitorId: match[1] }
    }

    const onPopState = (e: PopStateEvent) => {
      const state = e.state as { monitorId?: string } | null
      view = state?.monitorId !== undefined
        ? { type: 'detail', monitorId: state.monitorId }
        : { type: 'overview' }
    }

    window.addEventListener('popstate', onPopState)

    return () => {
      disconnect()
      window.removeEventListener('popstate', onPopState)
    }
  })
</script>

<div class="layout">
  <header class="site-header">
    <button class="wordmark" onclick={navigateToOverview}>{siteTitle}</button>
    <div class="status-bar" data-status={overallStatus}>
      <span class="status-dot"></span>
      <span class="status-label">{statusLabel[overallStatus]}</span>
    </div>
  </header>

  <main class="content">
    {#if view.type === 'overview'}
      <Overview {monitors} onSelectMonitor={navigateToDetail} />
    {:else}
      <MonitorDetail monitorId={view.monitorId} onBack={navigateToOverview} />
    {/if}
  </main>
</div>

<style>
  .layout {
    min-height: 100vh;
    background: var(--upp-color-bg-base);
    color: var(--upp-color-text-primary);
    font-family: var(--upp-font-family-base);
  }

  .site-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--upp-spacing-4) var(--upp-spacing-8);
    border-bottom: 1px solid var(--upp-color-border-subtle);
  }

  .wordmark {
    background: none;
    border: none;
    color: var(--upp-color-accent-primary);
    font-family: inherit;
    font-size: var(--upp-font-size-lg);
    font-weight: var(--upp-font-weight-bold);
    cursor: pointer;
    padding: 0;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .status-bar {
    display: flex;
    align-items: center;
    gap: var(--upp-spacing-2);
    font-size: var(--upp-font-size-sm);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  [data-status='up'] .status-dot    { background: var(--upp-color-status-up); box-shadow: var(--upp-effect-glow-status); }
  [data-status='degraded'] .status-dot { background: var(--upp-color-status-degraded); }
  [data-status='down'] .status-dot  { background: var(--upp-color-status-down); box-shadow: var(--upp-effect-glow-status); }
  [data-status='unknown'] .status-dot  { background: var(--upp-color-status-unknown); }

  [data-status='up'] .status-label     { color: var(--upp-color-status-up); }
  [data-status='degraded'] .status-label { color: var(--upp-color-status-degraded); }
  [data-status='down'] .status-label   { color: var(--upp-color-status-down); }
  [data-status='unknown'] .status-label  { color: var(--upp-color-text-muted); }

  .content {
    max-width: 1100px;
    margin: 0 auto;
    padding: var(--upp-spacing-8);
  }
</style>
