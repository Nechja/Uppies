<script lang="ts">
  import type { CheckStatus } from '../lib/types.ts'

  type Props = { status: CheckStatus }
  let { status }: Props = $props()

  const labels: Record<CheckStatus, string> = {
    up: 'UP',
    degraded: 'DEGRADED',
    down: 'DOWN',
    unknown: 'UNKNOWN',
  }
</script>

<span class="badge" data-status={status}>{labels[status]}</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    font-family: var(--upp-font-family-ui);
    font-size: var(--upp-font-size-xs);
    font-weight: var(--upp-font-weight-bold);
    letter-spacing: 0.06em;
    padding: 3px 10px;
    border-radius: var(--upp-radius-full);
    white-space: nowrap;
  }

  [data-status='up'] {
    color: var(--upp-color-status-up);
    background: color-mix(in srgb, var(--upp-color-status-up) 12%, transparent);
    box-shadow: var(--upp-effect-glow-status);
  }

  [data-status='degraded'] {
    color: var(--upp-color-status-degraded);
    background: color-mix(in srgb, var(--upp-color-status-degraded) 12%, transparent);
  }

  [data-status='down'] {
    color: var(--upp-color-status-down);
    background: color-mix(in srgb, var(--upp-color-status-down) 12%, transparent);
    box-shadow: var(--upp-effect-glow-status);
  }

  [data-status='unknown'] {
    color: var(--upp-color-status-unknown);
    background: color-mix(in srgb, var(--upp-color-status-unknown) 12%, transparent);
  }
</style>
