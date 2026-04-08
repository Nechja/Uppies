import { connect } from 'cloudflare:sockets'
import { ok, err } from '../result.ts'
import type { Result } from '../result.ts'
import type { Monitor } from '../types/monitor.ts'
import type { CheckOutcome, CheckError } from '../types/check.ts'
import type { CheckRunner } from './CheckRunner.ts'

export class TcpCheckRunner implements CheckRunner {
  readonly supportedType = 'tcp' as const

  async run(monitor: Monitor): Promise<Result<CheckOutcome, CheckError>> {
    if (monitor.host === undefined || monitor.port === undefined) {
      return err({ type: 'unsupported', message: 'TCP monitor requires host and port' })
    }

    const checkedAt = Date.now()

    const socket = connect({ hostname: monitor.host, port: monitor.port })

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TCP timeout')), monitor.timeoutMs)
    )

    try {
      await Promise.race([socket.opened, timeout])
      const responseMs = Date.now() - checkedAt
      void socket.close()
      return ok({ monitorId: monitor.id, checkedAt, status: 'up', responseMs })
    } catch (e) {
      void socket.close()
      const message = e instanceof Error ? e.message : 'Connection failed'
      const isTimeout = message === 'TCP timeout'
      return ok({
        monitorId: monitor.id,
        checkedAt,
        status: 'down',
        error: message,
        ...(isTimeout && { responseMs: monitor.timeoutMs }),
      })
    }
  }
}
