import { ok, err } from '../result.ts'
import type { Result } from '../result.ts'
import type { Monitor } from '../types/monitor.ts'
import type { CheckOutcome, CheckError } from '../types/check.ts'
import type { CheckRunner } from './CheckRunner.ts'

const MS_PER_DAY = 86_400_000

export class TlsCheckRunner implements CheckRunner {
  readonly supportedType = 'tls' as const

  async run(monitor: Monitor): Promise<Result<CheckOutcome, CheckError>> {
    if (monitor.url === undefined) {
      return err({ type: 'unsupported', message: 'TLS monitor requires a url' })
    }

    const checkedAt = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), monitor.timeoutMs)

    let response: Response
    try {
      response = await fetch(monitor.url, {
        method: 'HEAD',
        signal: controller.signal,
      })
    } catch (e) {
      clearTimeout(timeout)
      const message = e instanceof Error ? e.message : 'Unknown error'
      const isTimeout = e instanceof Error && e.name === 'AbortError'
      return err({ type: isTimeout ? 'timeout' : 'network', message })
    }

    clearTimeout(timeout)

    const expiryHeader = response.headers.get('cf-tls-cert-expiry-seconds')

    if (expiryHeader === null) {
      return ok({ monitorId: monitor.id, checkedAt, status: 'up' })
    }

    const expirySeconds = parseInt(expiryHeader, 10)
    const tlsDaysRemaining = Math.floor(expirySeconds / 86_400)
    const isExpiringSoon = tlsDaysRemaining <= monitor.tlsWarnDays
    const isExpired = tlsDaysRemaining <= 0

    return ok({
      monitorId: monitor.id,
      checkedAt,
      status: isExpired ? 'down' : isExpiringSoon ? 'degraded' : 'up',
      tlsDaysRemaining,
    })
  }
}
