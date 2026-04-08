export type MonitorType = 'http' | 'tcp' | 'tls'

export type HttpExpectation = {
  readonly status?: number
  readonly bodyContains?: string
  readonly bodyNotContains?: string
  readonly jsonPath?: string
  readonly jsonValue?: string
  readonly maxMs?: number
}

export type NotifyEvent = 'down' | 'recover' | 'tls_warn'

export type NotifyChannel = {
  readonly type: 'discord' | 'webhook'
  readonly url: string
  readonly on: ReadonlyArray<NotifyEvent>
}

export type Monitor = {
  readonly id: string
  readonly name: string
  readonly url?: string
  readonly host?: string
  readonly port?: number
  readonly type: MonitorType
  readonly intervalSeconds: number
  readonly timeoutMs: number
  readonly tlsWarnDays: number
  readonly enabled: boolean
  readonly expect?: HttpExpectation
  readonly notify: ReadonlyArray<NotifyChannel>
}
