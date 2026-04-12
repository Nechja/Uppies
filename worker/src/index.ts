import type { Env } from './env.ts'
import { StatusHub } from './durable-objects/StatusHub.ts'
import { D1MonitorRepository } from './repositories/D1MonitorRepository.ts'
import { D1CheckResultRepository } from './repositories/D1CheckResultRepository.ts'
import { D1IncidentRepository } from './repositories/D1IncidentRepository.ts'
import { HttpCheckRunner } from './checks/HttpCheckRunner.ts'
import { TlsCheckRunner } from './checks/TlsCheckRunner.ts'
import { TcpCheckRunner } from './checks/TcpCheckRunner.ts'
import { CheckRunnerRegistry } from './checks/CheckRunnerRegistry.ts'
import { DiscordNotificationSender } from './notifications/DiscordNotificationSender.ts'
import { WebhookNotificationSender } from './notifications/WebhookNotificationSender.ts'
import { EnvNotificationSenderFactory } from './notifications/EnvNotificationSenderFactory.ts'
import { IncidentService } from './services/IncidentService.ts'
import { MonitorCheckService } from './services/MonitorCheckService.ts'
import { StatusHandler } from './handlers/StatusHandler.ts'
import { MonitorDetailHandler } from './handlers/MonitorDetailHandler.ts'

export { StatusHub }

function buildServices(env: Env) {
  const monitorRepository = new D1MonitorRepository(env.DB)
  const checkResultRepository = new D1CheckResultRepository(env.DB)
  const incidentRepository = new D1IncidentRepository(env.DB)

  const maxBodyBytes = parseInt(env.MAX_BODY_BYTES, 10)
  const defaultHistoryDays = parseInt(env.HISTORY_DAYS, 10)

  const checkRunnerRegistry = new CheckRunnerRegistry([
    new HttpCheckRunner(maxBodyBytes),
    new TlsCheckRunner(),
    new TcpCheckRunner(),
  ])

  const envRecord = env as unknown as Record<string, unknown>
  const resolveUrl = (raw: string): string | null => {
    if (!raw.startsWith('$')) return raw
    const value = envRecord[raw.slice(1)]
    return typeof value === 'string' && value.length > 0 ? value : null
  }

  const notificationSenderFactory = new EnvNotificationSenderFactory(
    resolveUrl,
    new Map([
      ['discord', (url: string) => new DiscordNotificationSender(url)],
      ['webhook', (url: string) => new WebhookNotificationSender(url)],
    ])
  )

  const incidentService = new IncidentService(incidentRepository)

  const monitorCheckService = new MonitorCheckService(
    monitorRepository,
    checkResultRepository,
    checkRunnerRegistry,
    incidentService,
    notificationSenderFactory
  )

  const statusHandler = new StatusHandler(
    monitorRepository,
    checkResultRepository,
    defaultHistoryDays
  )

  const monitorDetailHandler = new MonitorDetailHandler(
    monitorRepository,
    checkResultRepository,
    incidentRepository,
    defaultHistoryDays
  )

  return { monitorCheckService, statusHandler, monitorDetailHandler }
}

function globalHub(env: Env): DurableObjectStub {
  return env.STATUS_HUB.get(env.STATUS_HUB.idFromName('global'))
}

async function broadcastStatus(env: Env, statusHandler: StatusHandler): Promise<void> {
  const response = await statusHandler.handle()
  const body = await response.text()
  const hub = globalHub(env)
  await hub.fetch('http://internal/broadcast', { method: 'POST', body })
}

const monitorIdPattern = /^\/api\/monitors\/([^/]+)$/

async function cachedJson(
  request: Request,
  env: Env,
  handler: () => Promise<Response>
): Promise<Response> {
  const cache = caches.default
  const cached = await cache.match(request)
  if (cached !== undefined) return cached

  const fresh = await handler()
  const response = new Response(fresh.body, fresh)
  response.headers.set('Cache-Control', `public, max-age=${env.CACHE_TTL}`)
  await cache.put(request, response.clone())
  return response
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/config') {
      return Response.json({ title: env.SITE_TITLE, theme: env.SITE_THEME })
    }

    if (url.pathname === '/api/live') {
      const hub = globalHub(env)
      return hub.fetch('http://internal/connect', {
        headers: { upgrade: 'websocket' },
      })
    }

    const services = buildServices(env)

    if (url.pathname === '/api/monitors') {
      return cachedJson(request, env, () => services.statusHandler.handle())
    }

    const monitorMatch = monitorIdPattern.exec(url.pathname)
    if (monitorMatch !== null && monitorMatch[1] !== undefined) {
      return cachedJson(request, env, () =>
        services.monitorDetailHandler.handle(monitorMatch[1])
      )
    }

    return env.ASSETS.fetch(request)
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const { monitorCheckService, statusHandler } = buildServices(env)
    await monitorCheckService.runAllChecks()
    ctx.waitUntil(broadcastStatus(env, statusHandler))
  },
}
