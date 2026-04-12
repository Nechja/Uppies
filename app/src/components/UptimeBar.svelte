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

  function earliestTimestamp(results: ReadonlyArray<CheckResult>): number {
    let min = Infinity
    for (const r of results) if (r.checkedAt < min) min = r.checkedAt
    return min
  }

  function effectiveDays(results: ReadonlyArray<CheckResult>, maxDays: number): number {
    if (results.length === 0) return 1
    const spanDays = Math.ceil((Date.now() - earliestTimestamp(results)) / MS_PER_DAY)
    return Math.max(1, Math.min(spanDays + 1, maxDays))
  }

  function buildFixedBuckets(
    results: ReadonlyArray<CheckResult>,
    count: number,
    intervalMs: number,
    formatLabel: (d: Date) => string
  ): ReadonlyArray<Bucket> {
    const now = Date.now()
    const sorted = [...results].sort((a, b) => a.checkedAt - b.checkedAt)
    let cursor = 0
    return Array.from({ length: count }, (_, i) => {
      const start = now - (count - i) * intervalMs
      const end = start + intervalMs
      while (cursor < sorted.length && sorted[cursor].checkedAt < start) cursor++
      const matches: Array<CheckResult> = []
      for (let j = cursor; j < sorted.length && sorted[j].checkedAt < end; j++) {
        matches.push(sorted[j])
      }
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
    {@const tip = bucket.status === 'empty' ? `${bucket.label}: no data` : `${bucket.label}: ${bucket.status}`}
    <button
      class="segment"
      class:selected={selectedStart === bucket.start}
      class:clickable={bucket.status !== 'empty'}
      data-status={bucket.status}
      aria-label={tip}
      onclick={() => handleClick(bucket)}
    >
      <span class="tooltip">{tip}</span>
    </button>
  {/each}
</div>

<style>
  .bar {
    display: flex;
    gap: 2px;
    align-items: stretch;
    height: 40px;
    padding: var(--upp-spacing-2) 0;
  }

  .segment {
    flex: 1;
    border-radius: 3px;
    border: none;
    padding: 0;
    position: relative;
    transition: filter var(--upp-transition-fast), transform var(--upp-transition-fast);
  }

  .clickable {
    cursor: pointer;
  }

  .segment:hover {
    filter: brightness(1.3);
    transform: scaleY(1.15);
  }

  .selected {
    filter: brightness(1.8);
    transform: scaleY(1.25);
  }

  [data-status='up']       { background: var(--upp-color-status-up); }
  [data-status='degraded'] { background: var(--upp-color-status-degraded); }
  [data-status='down']     { background: var(--upp-color-status-down); }
  [data-status='empty']    { background: var(--upp-color-border-subtle); opacity: 0.5; }

  .tooltip {
    display: none;
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--upp-color-bg-raised);
    border: 1px solid var(--upp-color-border-default);
    color: var(--upp-color-text-primary);
    font-family: var(--upp-font-family-ui);
    font-size: var(--upp-font-size-xs);
    padding: var(--upp-spacing-1) var(--upp-spacing-3);
    border-radius: var(--upp-radius-sm);
    white-space: nowrap;
    pointer-events: none;
    z-index: 10;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .segment:hover .tooltip {
    display: block;
  }
</style>
