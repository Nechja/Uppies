export function calculateUptimePercent(results: ReadonlyArray<{ status: string }>): number {
  if (results.length === 0) return 100
  const upCount = results.filter((r) => r.status === 'up').length
  return Math.round((upCount / results.length) * 1000) / 10
}
