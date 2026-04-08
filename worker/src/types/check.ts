export type CheckStatus = 'up' | 'degraded' | 'down'

export type CheckOutcome = {
  readonly monitorId: string
  readonly checkedAt: number
  readonly status: CheckStatus
  readonly responseMs?: number
  readonly statusCode?: number
  readonly tlsDaysRemaining?: number
  readonly error?: string
}

export type CheckError = {
  readonly type: 'timeout' | 'network' | 'assertion' | 'unsupported'
  readonly message: string
}
