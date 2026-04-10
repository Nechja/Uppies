<script lang="ts">
  import type { CheckResult } from '../lib/types.ts'

  type BucketRange = { start: number; end: number; label: string }

  type Props = {
    history: ReadonlyArray<CheckResult>
    days?: number
    onSelect?: (range: BucketRange) => void
  }

  let { history, days = 90, onSelect }: Props = $props()

  type Bucket = {
    label: string
    status: 'up' | 'degraded' | 'down' | 'empty'
    start: number
    end: number
  }

  const MS_PER_HOUR = 3_600_000
  const MS_PER_DAY = 86_400_000

  function resolveBucketStatus(
    results: ReadonlyArray<CheckResult>
  ): 'up' | 'degraded' | 'down' | 'empty' {
    if (results.length === 0) return 'empty'
    if (results.some((r) => r.status === 'down')) return 'down'
    if (results.some((r) => r.status === 'degraded')) return 'degraded'
    return 'up'
  }

  function effectiveDays(results: ReadonlyArray<CheckResult>, maxDays: number): number {
    if (results.length === 0) return 1
    const earliest = Math.min(...results.map((r) => r.checkedAt))
    const spanDays = Math.ceil((Date.now() - earliest) / MS_PER_DAY)
    return Math.max(1, Math.min(spanDays + 1, maxDays))
  }

  function buildFixedBuckets(
    results: ReadonlyArray<CheckResult>,
    count: number,
    intervalMs: number,
    formatLabel: (d: Date) => string
  ): ReadonlyArray<Bucket> {
    const now = Date.now()
    return Array.from({ length: count }, (_, i) => {
      const start = now - (count - i) * intervalMs
      const end = start + intervalMs
      const matches = results.filter((r) => r.checkedAt >= start && r.checkedAt < end)
      return {
        label: formatLabel(new Date(start)),
        status: resolveBucketStatus(matches),
        start,
        end,
      }
    })
  }

  const MS_PER_6H = MS_PER_HOUR * 6

  function formatHour(d: Date): string {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  function formatBlock(d: Date): string {
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  function formatDay(d: Date): string {
    return d.toLocaleDateString()
  }

  function buildBuckets(
    results: ReadonlyArray<CheckResult>,
    viewDays: number
  ): ReadonlyArray<Bucket> {
    const span = effectiveDays(results, viewDays)
    if (span <= 2) return buildFixedBuckets(results, span * 24, MS_PER_HOUR, formatHour)
    if (span <= 7) return buildFixedBuckets(results, span * 4, MS_PER_6H, formatBlock)
    return buildFixedBuckets(results, span, MS_PER_DAY, formatDay)
  }

  const buckets = $derived(buildBuckets(history, days))

  let selectedStart = $state<number | null>(null)

  function handleClick(bucket: Bucket) {
    if (bucket.status === 'empty') return
    selectedStart = selectedStart === bucket.start ? null : bucket.start
    onSelect?.({ start: bucket.start, end: bucket.end, label: bucket.label })
  }
</script>

<div class="bar" role="img" aria-label="Uptime history">
  {#each buckets as bucket (bucket.start)}
    <button
      class="segment"
      class:selected={selectedStart === bucket.start}
      class:clickable={bucket.status !== 'empty'}
      data-status={bucket.status}
      aria-label={bucket.status === 'empty' ? `${bucket.label}: no data` : `${bucket.label}: ${bucket.status}`}
      onclick={() => handleClick(bucket)}
    >
      <span class="tooltip">{bucket.status === 'empty' ? `${bucket.label}: no data` : `${bucket.label}: ${bucket.status}`}</span>
    </button>
  {/each}
</div>

<style>
  .bar {
    display: flex;
    gap: 2px;
    align-items: flex-end;
    height: 32px;
  }

  .segment {
    flex: 1;
    height: 100%;
    border-radius: 2px;
    border: none;
    padding: 0;
    position: relative;
    transition: opacity var(--upp-transition-fast);
  }

  .clickable {
    cursor: pointer;
  }

  .segment:hover {
    opacity: 0.7;
  }

  .selected {
    filter: brightness(1.8);
  }

  [data-status='up']       { background: var(--upp-color-status-up); }
  [data-status='degraded'] { background: var(--upp-color-status-degraded); }
  [data-status='down']     { background: var(--upp-color-status-down); }
  [data-status='empty']    { background: var(--upp-color-border-subtle); }

  .tooltip {
    display: none;
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--upp-color-bg-surface);
    border: 1px solid var(--upp-color-border-subtle);
    color: var(--upp-color-text-primary);
    font-size: var(--upp-font-size-xs);
    padding: var(--upp-spacing-1) var(--upp-spacing-2);
    border-radius: var(--upp-radius-sm);
    white-space: nowrap;
    pointer-events: none;
    z-index: 10;
  }

  .segment:hover .tooltip {
    display: block;
  }
</style>
