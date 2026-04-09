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

  const selectedLogs = $derived<ReadonlyArray<CheckResult>>((() => {
    if (state.type !== 'loaded' || selectedRange === null) return []
    return state.detail.history.filter(
      (r) => r.checkedAt >= selectedRange.start && r.checkedAt < selectedRange.end
    )
  })())

  async function load() {
    state = { type: 'loading' }
    const result = await fetchMonitorDetail(monitorId)
    state = result.ok
      ? { type: 'loaded', detail: result.data }
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

  function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString()
  }

  function handleBucketSelect(range: { start: number; end: number; label: string }) {
    selectedRange = selectedRange?.label === range.label ? null : range
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
          <span class="stat-label">{state.detail.monitor.historyDays}-day uptime</span>
          <span class="stat-value">{state.detail.monitor.uptimePercent}%</span>
        </div>
      {/if}
      {#if state.detail.monitor.responseMs !== null}
        <div class="stat">
          <span class="stat-label">Last response</span>
          <span class="stat-value">{state.detail.monitor.responseMs}ms</span>
        </div>
      {/if}
      {#if state.detail.monitor.tlsDaysRemaining !== null}
        <div class="stat">
          <span class="stat-label">TLS expires</span>
          <span class="stat-value">{state.detail.monitor.tlsDaysRemaining} days</span>
        </div>
      {/if}
      {#if state.detail.monitor.lastCheckedAt !== null}
        <div class="stat">
          <span class="stat-label">Last checked</span>
          <span class="stat-value">{formatTimestamp(state.detail.monitor.lastCheckedAt)}</span>
        </div>
      {/if}
    </div>

    <section class="section">
      <h2 class="section-title">{state.detail.monitor.historyDays}-day history</h2>
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
          <ul class="log-list">
            {#each selectedLogs as entry (entry.checkedAt)}
              <li class="log-entry" data-status={entry.status}>
                <span class="log-time">{formatTime(entry.checkedAt)}</span>
                <StatusBadge status={entry.status} />
                {#if entry.responseMs !== undefined}
                  <span class="log-meta">{entry.responseMs}ms</span>
                {/if}
                {#if entry.statusCode !== undefined}
                  <span class="log-meta">{entry.statusCode}</span>
                {/if}
                {#if entry.error !== undefined}
                  <span class="log-error">{entry.error}</span>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}

    {#if state.detail.incidents.length > 0}
      <section class="section">
        <h2 class="section-title">Incidents</h2>
        <ul class="incident-list">
          {#each state.detail.incidents as incident (incident.id)}
            <li class="incident">
              <span class="incident-time">{formatTimestamp(incident.startedAt)}</span>
              {#if incident.resolvedAt !== undefined}
                <span class="incident-duration">
                  {formatDuration(incident.resolvedAt - incident.startedAt)}
                </span>
              {:else}
                <span class="incident-open">Ongoing</span>
              {/if}
              {#if incident.cause !== undefined}
                <span class="incident-cause">{incident.cause}</span>
              {/if}
            </li>
          {/each}
        </ul>
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
    font-family: inherit;
    font-size: var(--upp-font-size-sm);
    padding: var(--upp-spacing-2) var(--upp-spacing-4);
    border-radius: var(--upp-radius-sm);
    cursor: pointer;
    align-self: flex-start;
    transition: all var(--upp-transition-fast);
  }

  .back:hover {
    border-color: var(--upp-color-accent-primary);
    color: var(--upp-color-accent-primary);
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
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: var(--upp-spacing-4);
  }

  .stat {
    background: var(--upp-color-bg-surface);
    border: 1px solid var(--upp-color-border-subtle);
    border-radius: var(--upp-radius-md);
    padding: var(--upp-spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--upp-spacing-1);
  }

  .stat-label {
    font-size: var(--upp-font-size-xs);
    color: var(--upp-color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .stat-value {
    font-size: var(--upp-font-size-xl);
    font-weight: var(--upp-font-weight-bold);
    color: var(--upp-color-text-primary);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--upp-spacing-4);
  }

  .section-title {
    margin: 0;
    font-size: var(--upp-font-size-sm);
    font-weight: var(--upp-font-weight-medium);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--upp-color-text-muted);
  }

  .message { color: var(--upp-color-text-secondary); font-size: var(--upp-font-size-sm); }
  .message.error { color: var(--upp-color-status-down); }

  .log-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .log-entry {
    display: flex;
    gap: var(--upp-spacing-3);
    align-items: center;
    padding: var(--upp-spacing-2) var(--upp-spacing-4);
    background: var(--upp-color-bg-surface);
    font-size: var(--upp-font-size-sm);
    font-family: var(--upp-font-family-base);
  }

  .log-entry:first-child { border-radius: var(--upp-radius-sm) var(--upp-radius-sm) 0 0; }
  .log-entry:last-child { border-radius: 0 0 var(--upp-radius-sm) var(--upp-radius-sm); }
  .log-entry:only-child { border-radius: var(--upp-radius-sm); }

  .log-time {
    color: var(--upp-color-text-muted);
    min-width: 80px;
  }

  .log-meta {
    color: var(--upp-color-text-secondary);
  }

  .log-error {
    color: var(--upp-color-status-down);
    margin-left: auto;
    text-align: right;
  }

  .incident-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--upp-spacing-2);
  }

  .incident {
    display: flex;
    gap: var(--upp-spacing-4);
    align-items: center;
    padding: var(--upp-spacing-3) var(--upp-spacing-4);
    background: var(--upp-color-bg-surface);
    border: 1px solid var(--upp-color-border-subtle);
    border-radius: var(--upp-radius-sm);
    font-size: var(--upp-font-size-sm);
  }

  .incident-time { color: var(--upp-color-text-secondary); }
  .incident-duration { color: var(--upp-color-text-muted); }
  .incident-open { color: var(--upp-color-status-down); }
  .incident-cause { color: var(--upp-color-text-primary); margin-left: auto; }
</style>
