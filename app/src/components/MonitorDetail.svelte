<script lang="ts">
  import { onMount } from 'svelte'
  import { fetchMonitorDetail } from '../lib/api.ts'
  import type { MonitorDetail as MonitorDetailType, CheckResult } from '../lib/types.ts'
  import StatusBadge from './StatusBadge.svelte'
  import UptimeBar from './UptimeBar.svelte'

  type Props = { monitorId: string; onBack: () => void }
  let { monitorId, onBack }: Props = $props()

  type LoadState =
    | { type: 'loading' }
    | { type: 'loaded'; detail: MonitorDetailType }
    | { type: 'error'; message: string }

  let state = $state<LoadState>({ type: 'loading' })
  let selectedRange = $state<{ start: number; end: number; label: string } | null>(null)

  const MS_PER_DAY = 86_400_000

  const selectedLogs = $derived.by<ReadonlyArray<CheckResult>>(() => {
    if (state.type !== 'loaded' || selectedRange === null) return []
    return state.detail.history.filter(
      (r) => r.checkedAt >= selectedRange.start && r.checkedAt < selectedRange.end
    )
  })

  const hasErrors = $derived.by<boolean>(() =>
    selectedLogs.some((e) => e.error !== undefined)
  )

  const historySpanLabel = $derived.by<string>(() => {
    if (state.type !== 'loaded') return ''
    const h = state.detail.history
    if (h.length === 0) return `${state.detail.monitor.historyDays}-day history`
    let earliest = Infinity
    for (const r of h) if (r.checkedAt < earliest) earliest = r.checkedAt
    const spanDays = Math.ceil((Date.now() - earliest) / MS_PER_DAY)
    return spanDays <= 1 ? 'Today' : `${spanDays}-day history`
  })

  async function load() {
    state = { type: 'loading' }
    const result = await fetchMonitorDetail(monitorId)
    state = result.ok
      ? { type: 'loaded', detail: result.value }
      : { type: 'error', message: result.error.message }
  }

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  function formatTimestamp(ts: number): string {
    return new Date(ts).toLocaleString()
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString()
  }

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  function handleBucketSelect(range: { start: number; end: number; label: string }) {
    selectedRange = selectedRange?.start === range.start ? null : range
  }

  onMount(load)
</script>

<div class="detail">
  <button class="back" onclick={onBack}>Back</button>

  {#if state.type === 'loading'}
    <p class="message">Loading...</p>
  {:else if state.type === 'error'}
    <p class="message error">{state.message}</p>
  {:else}
    <div class="header">
      <h1 class="name">{state.detail.monitor.name}</h1>
      <StatusBadge status={state.detail.monitor.currentStatus ?? 'unknown'} />
    </div>

    <div class="stats">
      {#if state.detail.monitor.uptimePercent !== null}
        <div class="stat">
          <span class="stat-label">Uptime</span>
          <span class="stat-value">{state.detail.monitor.uptimePercent}%</span>
        </div>
      {/if}
      {#if state.detail.monitor.responseMs !== null}
        <div class="stat">
          <span class="stat-label">Latency</span>
          <span class="stat-value">{state.detail.monitor.responseMs}ms</span>
        </div>
      {/if}
      {#if state.detail.monitor.tlsDaysRemaining !== null}
        <div class="stat">
          <span class="stat-label">TLS</span>
          <span class="stat-value">{state.detail.monitor.tlsDaysRemaining}d</span>
        </div>
      {/if}
      {#if state.detail.monitor.lastCheckedAt !== null}
        <div class="stat">
          <span class="stat-label">Checked</span>
          <span class="stat-value stat-value-sm">{formatTimestamp(state.detail.monitor.lastCheckedAt)}</span>
        </div>
      {/if}
    </div>

    <section class="section">
      <h2 class="section-title">{historySpanLabel}</h2>
      <UptimeBar
        history={state.detail.history}
        days={state.detail.monitor.historyDays}
        onSelect={handleBucketSelect}
      />
    </section>

    {#if selectedRange !== null}
      <section class="section">
        <h2 class="section-title">Checks for {selectedRange.label}</h2>
        {#if selectedLogs.length === 0}
          <p class="message">No checks recorded for this period.</p>
        {:else}
          <div class="table-wrap">
            <table class="log-table">
              <thead>
                <tr>
                  <th class="col-time">Time</th>
                  <th class="col-status"></th>
                  <th class="col-num">ms</th>
                  <th class="col-num">Code</th>
                  {#if hasErrors}
                    <th>Error</th>
                  {/if}
                </tr>
              </thead>
              <tbody>
                {#each selectedLogs as entry (entry.checkedAt)}
                  <tr>
                    <td class="cell-time">{formatTime(entry.checkedAt)}</td>
                    <td><span class="status-pip" data-status={entry.status}></span></td>
                    <td class="cell-num">{entry.responseMs ?? ''}</td>
                    <td class="cell-num">{entry.statusCode ?? ''}</td>
                    {#if hasErrors}
                      <td class="cell-error">{entry.error ?? ''}</td>
                    {/if}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>
    {/if}

    {#if state.detail.incidents.length > 0}
      <section class="section">
        <h2 class="section-title">Incidents</h2>
        <div class="incident-list">
          {#each state.detail.incidents as incident (incident.id)}
            <div class="incident" class:ongoing={incident.resolvedAt === undefined}>
              <div class="incident-header">
                <span class="incident-date">{formatDate(incident.startedAt)}</span>
                <span class="incident-time">{formatTime(incident.startedAt)}</span>
                {#if incident.resolvedAt !== undefined}
                  <span class="incident-badge resolved">{formatDuration(incident.resolvedAt - incident.startedAt)}</span>
                {:else}
                  <span class="incident-badge open">Ongoing</span>
                {/if}
              </div>
              {#if incident.cause !== undefined}
                <span class="incident-cause">{incident.cause}</span>
              {/if}
            </div>
          {/each}
        </div>
      </section>
    {/if}
  {/if}
</div>

<style>
  .detail {
    display: flex;
    flex-direction: column;
    gap: var(--upp-spacing-8);
  }

  .back {
    background: none;
    border: 1px solid var(--upp-color-border-subtle);
    color: var(--upp-color-text-secondary);
    font-family: var(--upp-font-family-ui);
    font-size: var(--upp-font-size-sm);
    padding: var(--upp-spacing-2) var(--upp-spacing-4);
    border-radius: var(--upp-radius-sm);
    cursor: pointer;
    align-self: flex-start;
    transition: all var(--upp-transition-fast);
    letter-spacing: 0.02em;
  }

  .back:hover {
    border-color: var(--upp-color-accent-primary);
    color: var(--upp-color-accent-primary);
    transform: translateX(-2px);
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--upp-spacing-4);
  }

  .name {
    margin: 0;
    font-size: var(--upp-font-size-2xl);
    font-weight: var(--upp-font-weight-bold);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--upp-spacing-3);
  }

  @media (max-width: 640px) {
    .stats { grid-template-columns: repeat(2, 1fr); }
  }

  .stat {
    background: var(--upp-color-bg-surface);
    border: 1px solid var(--upp-color-border-subtle);
    border-radius: var(--upp-radius-md);
    padding: var(--upp-spacing-3) var(--upp-spacing-4);
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .stat-label {
    font-size: var(--upp-font-size-xs);
    color: var(--upp-color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-family: var(--upp-font-family-ui);
  }

  .stat-value {
    font-size: var(--upp-font-size-xl);
    font-weight: var(--upp-font-weight-bold);
    color: var(--upp-color-text-primary);
    font-variant-numeric: tabular-nums;
    font-family: var(--upp-font-family-ui);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stat-value-sm {
    font-size: var(--upp-font-size-sm);
    font-weight: var(--upp-font-weight-medium);
    line-height: 1.8;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--upp-spacing-3);
  }

  .section-title {
    margin: 0;
    font-size: var(--upp-font-size-xs);
    font-weight: var(--upp-font-weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--upp-color-text-muted);
    font-family: var(--upp-font-family-ui);
  }

  .message { color: var(--upp-color-text-secondary); font-size: var(--upp-font-size-sm); }
  .message.error { color: var(--upp-color-status-down); }

  /* Table */

  .table-wrap {
    overflow-x: auto;
    overflow-y: auto;
    max-height: 400px;
    border-radius: var(--upp-radius-md);
    border: 1px solid var(--upp-color-border-subtle);
  }

  .log-table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--upp-font-size-sm);
    font-family: var(--upp-font-family-ui);
  }

  .log-table th {
    text-align: left;
    padding: var(--upp-spacing-2) var(--upp-spacing-3);
    font-size: 10px;
    font-weight: var(--upp-font-weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--upp-color-text-muted);
    background: var(--upp-color-bg-surface);
    border-bottom: 1px solid var(--upp-color-border-subtle);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .log-table td {
    padding: var(--upp-spacing-1) var(--upp-spacing-3);
    border-bottom: 1px solid var(--upp-color-border-subtle);
  }

  .log-table tbody tr:nth-child(even) {
    background: var(--upp-color-bg-raised);
  }

  .log-table tbody tr:last-child td {
    border-bottom: none;
  }

  .col-time { width: 110px; }
  .col-status { width: 24px; }
  .col-num { text-align: right; width: 64px; }

  .cell-time {
    color: var(--upp-color-text-muted);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .cell-num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: var(--upp-color-text-secondary);
  }

  .cell-error {
    color: var(--upp-color-status-down);
    font-size: var(--upp-font-size-xs);
  }

  .status-pip {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .status-pip[data-status='up']       { background: var(--upp-color-status-up); }
  .status-pip[data-status='degraded'] { background: var(--upp-color-status-degraded); }
  .status-pip[data-status='down']     { background: var(--upp-color-status-down); }
  .status-pip[data-status='unknown']  { background: var(--upp-color-status-unknown); }

  /* Incidents */

  .incident-list {
    display: flex;
    flex-direction: column;
    gap: var(--upp-spacing-2);
  }

  .incident {
    display: flex;
    flex-direction: column;
    gap: var(--upp-spacing-1);
    padding: var(--upp-spacing-3) var(--upp-spacing-4);
    background: var(--upp-color-bg-surface);
    border: 1px solid var(--upp-color-border-subtle);
    border-radius: var(--upp-radius-md);
    border-left: 3px solid var(--upp-color-status-up);
    font-size: var(--upp-font-size-sm);
  }

  .incident.ongoing {
    border-left-color: var(--upp-color-status-down);
  }

  .incident-header {
    display: flex;
    align-items: center;
    gap: var(--upp-spacing-3);
  }

  .incident-date {
    color: var(--upp-color-text-primary);
    font-weight: var(--upp-font-weight-medium);
    font-family: var(--upp-font-family-ui);
  }

  .incident-time {
    color: var(--upp-color-text-muted);
    font-variant-numeric: tabular-nums;
    font-family: var(--upp-font-family-ui);
  }

  .incident-badge {
    margin-left: auto;
    font-size: var(--upp-font-size-xs);
    font-weight: var(--upp-font-weight-medium);
    padding: 2px 8px;
    border-radius: var(--upp-radius-full);
    font-family: var(--upp-font-family-ui);
  }

  .incident-badge.resolved {
    color: var(--upp-color-text-muted);
    background: var(--upp-color-bg-raised);
  }

  .incident-badge.open {
    color: var(--upp-color-status-down);
    background: color-mix(in srgb, var(--upp-color-status-down) 12%, transparent);
  }

  .incident-cause {
    color: var(--upp-color-text-secondary);
    font-size: var(--upp-font-size-xs);
    padding-left: 1px;
  }
</style>
