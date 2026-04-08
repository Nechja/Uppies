import { ok, err } from '../result.ts'
import type { Result } from '../result.ts'
import type { Monitor } from '../types/monitor.ts'
import type { CheckOutcome, CheckError } from '../types/check.ts'
import type { CheckRunner } from './CheckRunner.ts'

function resolveJsonPath(body: unknown, path: string): unknown {
  const segments = path.replace(/^\$\./, '').split('.')
  let current: unknown = body
  for (const segment of segments) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[segment]
  }
  return current
}

async function assertBody(
  response: Response,
  monitor: Monitor
): Promise<Result<void, CheckError>> {
  if (monitor.expect === undefined) return ok(undefined)
  if (
    monitor.expect.bodyContains === undefined &&
    monitor.expect.bodyNotContains === undefined &&
    monitor.expect.jsonPath === undefined
  ) {
    return ok(undefined)
  }

  const text = await response.text()

  if (
    monitor.expect.bodyContains !== undefined &&
    !text.includes(monitor.expect.bodyContains)
  ) {
    return err({
      type: 'assertion',
      message: `Body missing expected string: "${monitor.expect.bodyContains}"`,
    })
  }

  if (
    monitor.expect.bodyNotContains !== undefined &&
    text.includes(monitor.expect.bodyNotContains)
  ) {
    return err({
      type: 'assertion',
      message: `Body contained unexpected string: "${monitor.expect.bodyNotContains}"`,
    })
  }

  if (monitor.expect.jsonPath !== undefined) {
    const parsed: unknown = JSON.parse(text)
    const value = resolveJsonPath(parsed, monitor.expect.jsonPath)
    if (String(value) !== monitor.expect.jsonValue) {
      return err({
        type: 'assertion',
        message: `JSON path "${monitor.expect.jsonPath}" = "${String(value)}", expected "${monitor.expect.jsonValue}"`,
      })
    }
  }

  return ok(undefined)
}

export class HttpCheckRunner implements CheckRunner {
  readonly supportedType = 'http' as const

  async run(monitor: Monitor): Promise<Result<CheckOutcome, CheckError>> {
    if (monitor.url === undefined) {
      return err({ type: 'unsupported', message: 'HTTP monitor requires a url' })
    }

    const startedAt = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), monitor.timeoutMs)

    let response: Response
    try {
      response = await fetch(monitor.url, { signal: controller.signal })
    } catch (e) {
      clearTimeout(timeout)
      const message = e instanceof Error ? e.message : 'Unknown fetch error'
      const isTimeout = e instanceof Error && e.name === 'AbortError'
      return err({ type: isTimeout ? 'timeout' : 'network', message })
    }

    clearTimeout(timeout)
    const responseMs = Date.now() - startedAt

    const expectedStatus = monitor.expect?.status ?? 200
    if (response.status !== expectedStatus) {
      return ok({
        monitorId: monitor.id,
        checkedAt: startedAt,
        status: 'down',
        responseMs,
        statusCode: response.status,
        error: `Expected status ${expectedStatus}, got ${response.status}`,
      })
    }

    const bodyResult = await assertBody(response, monitor)
    if (!bodyResult.ok) {
      return ok({
        monitorId: monitor.id,
        checkedAt: startedAt,
        status: 'down',
        responseMs,
        statusCode: response.status,
        error: bodyResult.error.message,
      })
    }

    const maxMs = monitor.expect?.maxMs
    const isDegraded = maxMs !== undefined && responseMs > maxMs

    return ok({
      monitorId: monitor.id,
      checkedAt: startedAt,
      status: isDegraded ? 'degraded' : 'up',
      responseMs,
      statusCode: response.status,
    })
  }
}
