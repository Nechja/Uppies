<script lang="ts">
  import type { CheckResult } from '../lib/types.ts'

  type Props = { history: ReadonlyArray<CheckResult>; days?: number }
  let { history, days = 90 }: Props = $props()

  type DayBucket = { date: string; status: 'up' | 'degraded' | 'down' | 'empty' }

  function buildBuckets(
    results: ReadonlyArray<CheckResult>,
    bucketDays: number
  ): ReadonlyArray<DayBucket> {
    const now = Date.now()
    const msPerDay = 86_400_000

    return Array.from({ length: bucketDays }, (_, i) => {
      const dayStart = now - (bucketDays - i) * msPerDay
      const dayEnd = dayStart + msPerDay
      const dayResults = results.filter(
        (r) => r.checkedAt >= dayStart && r.checkedAt < dayEnd
      )

      if (dayResults.length === 0) return { date: new Date(dayStart).toDateString(), status: 'empty' }

      const hasDown = dayResults.some((r) => r.status === 'down')
      const hasDegraded = dayResults.some((r) => r.status === 'degraded')

      const status = hasDown ? 'down' : hasDegraded ? 'degraded' : 'up'
      return { date: new Date(dayStart).toDateString(), status }
    })
  }

  const buckets = $derived(buildBuckets(history, days))
</script>

<div class="bar" role="img" aria-label="Uptime history">
  {#each buckets as bucket (bucket.date)}
    <span
      class="segment"
      data-status={bucket.status}
      title={`${bucket.date}: ${bucket.status}`}
    ></span>
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
    transition: opacity var(--upp-transition-fast);
  }

  .segment:hover {
    opacity: 0.7;
  }

  [data-status='up']       { background: var(--upp-color-status-up); }
  [data-status='degraded'] { background: var(--upp-color-status-degraded); }
  [data-status='down']     { background: var(--upp-color-status-down); }
  [data-status='empty']    { background: var(--upp-color-border-subtle); }
</style>
