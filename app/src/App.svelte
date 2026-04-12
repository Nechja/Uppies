<script lang="ts">
  import { onMount } from 'svelte'
  import Overview from './components/Overview.svelte'
  import MonitorDetail from './components/MonitorDetail.svelte'
  import ThemeSwitcher from './components/ThemeSwitcher.svelte'
  import { fetchConfig, fetchAllMonitors } from './lib/api.ts'
  import { openLiveConnection } from './lib/live.ts'
  import { applyTheme } from './lib/theme.ts'
  import type { MonitorSummary, Theme, CheckStatus } from './lib/types.ts'

  type View = { type: 'overview' } | { type: 'detail'; monitorId: string }

  let view = $state<View>({ type: 'overview' })
  let siteTitle = $state('Uppies')
  let monitors = $state<ReadonlyArray<MonitorSummary> | null>(null)
  let liveConnected = $state(false)

  const overallStatus = $derived.by<CheckStatus>(() => {
    if (monitors === null || monitors.length === 0) return 'unknown'
    if (monitors.some((m) => m.currentStatus === 'down')) return 'down'
    if (monitors.some((m) => m.currentStatus === 'degraded')) return 'degraded'
    return 'up'
  })

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
      siteTitle = configResult.value.title
      document.title = configResult.value.title
      if (isValidTheme(configResult.value.theme)) {
        applyTheme(configResult.value.theme)
      }
    }

    if (monitorsResult.ok) {
      monitors = monitorsResult.value.monitors
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
    <div class="header-right">
      <div class="status-bar" data-status={overallStatus}>
        <span class="status-dot"></span>
        <span class="status-label">{statusLabel[overallStatus]}</span>
      </div>
      <ThemeSwitcher />
    </div>
  </header>

  <main class="content">
    {#if view.type === 'overview'}
      <Overview {monitors} onSelectMonitor={navigateToDetail} />
    {:else}
      <MonitorDetail monitorId={view.monitorId} onBack={navigateToOverview} />
    {/if}
  </main>

  <footer class="site-footer">
    <span class="footer-connection" class:connected={liveConnected}>
      {liveConnected ? 'Live' : 'Reconnecting'}
    </span>
  </footer>
</div>

<style>
  .layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
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
    gap: var(--upp-spacing-4);
    flex-wrap: wrap;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: var(--upp-spacing-6);
  }

  .wordmark {
    background: none;
    border: none;
    color: var(--upp-color-accent-primary);
    font-family: var(--upp-font-family-ui);
    font-size: var(--upp-font-size-lg);
    font-weight: var(--upp-font-weight-bold);
    cursor: pointer;
    padding: 0;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .status-bar {
    display: flex;
    align-items: center;
    gap: var(--upp-spacing-2);
    font-size: var(--upp-font-size-sm);
    font-family: var(--upp-font-family-ui);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  [data-status='up'] .status-dot {
    background: var(--upp-color-status-up);
    box-shadow: var(--upp-effect-glow-status);
    animation: glow-pulse 2.5s ease-in-out infinite;
  }
  [data-status='degraded'] .status-dot {
    background: var(--upp-color-status-degraded);
    animation: pulse 1.5s ease-in-out infinite;
  }
  [data-status='down'] .status-dot {
    background: var(--upp-color-status-down);
    box-shadow: var(--upp-effect-glow-status);
    animation: pulse 1s ease-in-out infinite;
  }
  [data-status='unknown'] .status-dot {
    background: var(--upp-color-status-unknown);
    animation: pulse 2s ease-in-out infinite;
  }

  [data-status='up'] .status-label       { color: var(--upp-color-status-up); }
  [data-status='degraded'] .status-label  { color: var(--upp-color-status-degraded); }
  [data-status='down'] .status-label      { color: var(--upp-color-status-down); }
  [data-status='unknown'] .status-label   { color: var(--upp-color-text-muted); }

  .content {
    flex: 1;
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;
    padding: var(--upp-spacing-8);
  }

  .site-footer {
    padding: var(--upp-spacing-3) var(--upp-spacing-8);
    border-top: 1px solid var(--upp-color-border-subtle);
    display: flex;
    justify-content: flex-end;
    font-family: var(--upp-font-family-ui);
  }

  .footer-connection {
    font-size: var(--upp-font-size-xs);
    color: var(--upp-color-text-muted);
    display: flex;
    align-items: center;
    gap: var(--upp-spacing-2);
  }

  .footer-connection::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--upp-color-status-down);
  }

  .footer-connection.connected::before {
    background: var(--upp-color-status-up);
  }
</style>
