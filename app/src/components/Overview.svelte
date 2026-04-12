<script lang="ts">
  import type { MonitorSummary } from '../lib/types.ts'
  import StatusBadge from './StatusBadge.svelte'

  type Props = {
    monitors: ReadonlyArray<MonitorSummary> | null
    onSelectMonitor: (id: string) => void
  }

  let { monitors, onSelectMonitor }: Props = $props()
</script>

{#if monitors === null}
  <p class="message">Connecting...</p>
{:else if monitors.length === 0}
  <p class="message">No monitors configured.</p>
{:else}
  <ul class="monitor-list">
    {#each monitors as monitor (monitor.id)}
      <li class="monitor-row" data-status={monitor.currentStatus ?? 'unknown'}>
        <button class="monitor-button" onclick={() => onSelectMonitor(monitor.id)}>
          <div class="monitor-info">
            <span class="monitor-name">{monitor.name}</span>
            <span class="monitor-type">{monitor.type}</span>
          </div>
          <span class="monitor-meta">
            {#if monitor.uptimePercent !== null}
              <span class="meta-item">
                <span class="meta-value">{monitor.uptimePercent}%</span>
                <span class="meta-label">uptime</span>
              </span>
            {/if}
            {#if monitor.responseMs !== null}
              <span class="meta-item">
                <span class="meta-value">{monitor.responseMs}ms</span>
                <span class="meta-label">latency</span>
              </span>
            {/if}
            {#if monitor.tlsDaysRemaining !== null}
              <span class="meta-item">
                <span class="meta-value">{monitor.tlsDaysRemaining}d</span>
                <span class="meta-label">TLS</span>
              </span>
            {/if}
          </span>
          <StatusBadge status={monitor.currentStatus ?? 'unknown'} />
        </button>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .message {
    color: var(--upp-color-text-secondary);
    font-size: var(--upp-font-size-sm);
  }

  .monitor-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--upp-spacing-2);
  }

  .monitor-row {
    border: 1px solid var(--upp-color-border-subtle);
    border-radius: var(--upp-radius-md);
    overflow: hidden;
    transition: border-color var(--upp-transition-fast);
  }

  .monitor-row:hover {
    border-color: var(--upp-color-border-default);
  }

  .monitor-button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--upp-spacing-4);
    padding: var(--upp-spacing-4) var(--upp-spacing-6);
    background: var(--upp-color-bg-surface);
    border: none;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background var(--upp-transition-fast);
  }

  .monitor-button:hover {
    background: var(--upp-color-bg-raised);
  }

  .monitor-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .monitor-name {
    font-size: var(--upp-font-size-md);
    font-weight: var(--upp-font-weight-medium);
  }

  .monitor-type {
    font-size: var(--upp-font-size-xs);
    color: var(--upp-color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .monitor-meta {
    display: flex;
    gap: var(--upp-spacing-6);
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
  }

  .meta-value {
    font-size: var(--upp-font-size-sm);
    font-weight: var(--upp-font-weight-medium);
    color: var(--upp-color-text-primary);
    font-variant-numeric: tabular-nums;
    font-family: var(--upp-font-family-ui);
  }

  .meta-label {
    font-size: 9px;
    color: var(--upp-color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-family: var(--upp-font-family-ui);
  }
</style>
