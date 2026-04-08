import type { Env } from './env.ts'
import { StatusHub } from './durable-objects/StatusHub.ts'
import { D1MonitorRepository } from './repositories/D1MonitorRepository.ts'
import { D1CheckResultRepository } from './repositories/D1CheckResultRepository.ts'
import { D1IncidentRepository } from './repositories/D1IncidentRepository.ts'
import { HttpCheckRunner } from './checks/HttpCheckRunner.ts'
import { TlsCheckRunner } from './checks/TlsCheckRunner.ts'
import { TcpCheckRunner } from './checks/TcpCheckRunner.ts'
import { CheckRunnerRegistry } from './checks/CheckRunnerRegistry.ts'
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

  const checkRunnerRegistry = new CheckRunnerRegistry([
    new HttpCheckRunner(),
    new TlsCheckRunner(),
    new TcpCheckRunner(),
  ])

  const notificationSenderFactory = new EnvNotificationSenderFactory(
    env as unknown as Record<string, unknown>
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
    incidentRepository
  )

  const monitorDetailHandler = new MonitorDetailHandler(
    monitorRepository,
    checkResultRepository,
    incidentRepository
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/config') {
      return Response.json({ title: env.SITE_TITLE, theme: env.SITE_THEME })
    }

    if (url.pathname === '/api/monitors') {
      const { statusHandler } = buildServices(env)
      return statusHandler.handle()
    }

    if (url.pathname === '/api/live') {
      const hub = globalHub(env)
      return hub.fetch('http://internal/connect', {
        headers: { upgrade: 'websocket' },
      })
    }

    const monitorMatch = monitorIdPattern.exec(url.pathname)
    if (monitorMatch !== null && monitorMatch[1] !== undefined) {
      const { monitorDetailHandler } = buildServices(env)
      return monitorDetailHandler.handle(monitorMatch[1])
    }

    return env.ASSETS.fetch(request)
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const { monitorCheckService, statusHandler } = buildServices(env)
    await monitorCheckService.runAllChecks()
    ctx.waitUntil(broadcastStatus(env, statusHandler))
  },
}
