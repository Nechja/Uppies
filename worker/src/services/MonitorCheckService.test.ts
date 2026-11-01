import { describe, it, expect, vi } from 'vitest'
import { MonitorCheckService } from './MonitorCheckService.ts'
import { StatusHandler } from '../handlers/StatusHandler.ts'
import { ok } from '../result.ts'
import type { Monitor } from '../types/monitor.ts'
import type { MonitorRepository } from '../repositories/MonitorRepository.ts'
import type { CheckResultRepository } from '../repositories/CheckResultRepository.ts'
import type { CheckDispatcher } from '../checks/CheckDispatcher.ts'
import type { OutcomeHandler } from './OutcomeHandler.ts'
import type { NotificationSenderFactory } from '../notifications/NotificationSenderFactory.ts'

describe('MonitorCheckService', () => {
  const dummyMonitor: Monitor = {
    id: 'test-1',
    name: 'Test Monitor',
    type: 'http',
    intervalSeconds: 60,
    timeoutMs: 5000,
    tlsWarnDays: 30,
    enabled: true,
    notify: [],
    lastCheckedAt: Date.now(), // checked just now, so NOT due
    currentStatus: 'up',
    responseMs: 120,
    tlsDaysRemaining: 25,
    uptimePercent: 99.9,
  }

  it('skips monitors that are not due and returns checksRan: 0', async () => {
    const mockMonitorRepo: MonitorRepository = {
      listAll: vi.fn().mockResolvedValue(ok([dummyMonitor])),
      findById: vi.fn(),
      upsertMany: vi.fn(),
      updateStatus: vi.fn(),
      updateUptimePercent: vi.fn(),
    }

    const mockCheckResultRepo: CheckResultRepository = {
      insert: vi.fn(),
      listByMonitor: vi.fn(),
      latestByMonitor: vi.fn(),
      lastCheckedAtByMonitors: vi.fn(),
      recordDailyStat: vi.fn(),
      calculateUptimeFromStats: vi.fn(),
      deleteOlderThan: vi.fn(),
    }

    const mockDispatcher: CheckDispatcher = {
      run: vi.fn(),
    }

    const mockOutcomeHandler: OutcomeHandler = {
      handleOutcome: vi.fn(),
    }

    const mockNotificationFactory: NotificationSenderFactory = {
      buildForMonitor: vi.fn(),
    }

    const service = new MonitorCheckService(
      mockMonitorRepo,
      mockCheckResultRepo,
      mockDispatcher,
      mockOutcomeHandler,
      mockNotificationFactory
    )

    const result = await service.runAllChecks()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.checksRan).toBe(0)
    }
    expect(mockDispatcher.run).not.toHaveBeenCalled()
    expect(mockCheckResultRepo.lastCheckedAtByMonitors).not.toHaveBeenCalled()
  })

  it('runs checks for due monitors and updates status', async () => {
    const dueMonitor: Monitor = {
      ...dummyMonitor,
      lastCheckedAt: Date.now() - 120_000, // checked 2 minutes ago, interval is 60s -> DUE
    }

    const mockMonitorRepo: MonitorRepository = {
      listAll: vi.fn().mockResolvedValue(ok([dueMonitor])),
      findById: vi.fn(),
      upsertMany: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue(ok(undefined)),
      updateUptimePercent: vi.fn(),
    }

    const outcome = {
      monitorId: 'test-1',
      checkedAt: Date.now(),
      status: 'up' as const,
      responseMs: 150,
    }

    const mockCheckResultRepo: CheckResultRepository = {
      insert: vi.fn().mockResolvedValue(ok(undefined)),
      listByMonitor: vi.fn(),
      latestByMonitor: vi.fn(),
      lastCheckedAtByMonitors: vi.fn(),
      recordDailyStat: vi.fn().mockResolvedValue(ok(undefined)),
      calculateUptimeFromStats: vi.fn().mockResolvedValue(ok(100)),
      deleteOlderThan: vi.fn(),
    }

    const mockDispatcher: CheckDispatcher = {
      run: vi.fn().mockResolvedValue(ok(outcome)),
    }

    const mockOutcomeHandler: OutcomeHandler = {
      handleOutcome: vi.fn().mockResolvedValue(ok(undefined)),
    }

    const mockNotificationFactory: NotificationSenderFactory = {
      buildForMonitor: vi.fn().mockReturnValue({ send: vi.fn() }),
    }

    const service = new MonitorCheckService(
      mockMonitorRepo,
      mockCheckResultRepo,
      mockDispatcher,
      mockOutcomeHandler,
      mockNotificationFactory
    )

    const result = await service.runAllChecks()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.checksRan).toBe(1)
    }
    expect(mockDispatcher.run).toHaveBeenCalledWith(dueMonitor)
    expect(mockCheckResultRepo.recordDailyStat).toHaveBeenCalled()
    expect(mockMonitorRepo.updateStatus).toHaveBeenCalledWith('test-1', expect.objectContaining({
      currentStatus: 'up',
      responseMs: 150,
      uptimePercent: 100,
    }))
  })
})

describe('StatusHandler', () => {
  it('reads monitors directly without checking historical check_results table', async () => {
    const monitorWithStatus: Monitor = {
      id: 'm1',
      name: 'Monitor One',
      type: 'http',
      intervalSeconds: 60,
      timeoutMs: 5000,
      tlsWarnDays: 30,
      enabled: true,
      notify: [],
      lastCheckedAt: 1700000000,
      currentStatus: 'up',
      responseMs: 80,
      tlsDaysRemaining: 45,
      uptimePercent: 99.8,
    }

    const mockMonitorRepo: MonitorRepository = {
      listAll: vi.fn().mockResolvedValue(ok([monitorWithStatus])),
      findById: vi.fn(),
      upsertMany: vi.fn(),
      updateStatus: vi.fn(),
      updateUptimePercent: vi.fn(),
    }

    const handler = new StatusHandler(mockMonitorRepo, 90)
    const response = await handler.handle()
    const data = await response.json() as { monitors: Array<{ id: string; currentStatus: string; uptimePercent: number }> }

    expect(data.monitors).toHaveLength(1)
    expect(data.monitors[0]?.id).toBe('m1')
    expect(data.monitors[0]?.currentStatus).toBe('up')
    expect(data.monitors[0]?.uptimePercent).toBe(99.8)
    expect(mockMonitorRepo.listAll).toHaveBeenCalledOnce()
  })
})
