export type Incident = {
  readonly id: string
  readonly monitorId: string
  readonly startedAt: number
  readonly resolvedAt?: number
  readonly cause?: string
}
