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
    display: inline-block;
    font-size: var(--upp-font-size-xs);
    font-weight: var(--upp-font-weight-bold);
    letter-spacing: 0.08em;
    padding: 2px 8px;
    border-radius: var(--upp-radius-full);
    border: 1px solid currentColor;
  }

  [data-status='up'] {
    color: var(--upp-color-status-up);
    box-shadow: var(--upp-effect-glow-status);
  }

  [data-status='degraded'] {
    color: var(--upp-color-status-degraded);
  }

  [data-status='down'] {
    color: var(--upp-color-status-down);
    box-shadow: var(--upp-effect-glow-status);
  }

  [data-status='unknown'] {
    color: var(--upp-color-status-unknown);
  }
</style>
