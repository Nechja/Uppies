import type { Monitor } from '../types/monitor.ts'
import type { CheckOutcome, CheckError } from '../types/check.ts'
import type { Result } from '../result.ts'
import { err } from '../result.ts'
import type { CheckRunner } from './CheckRunner.ts'

export class CheckRunnerRegistry {
  private readonly runners: ReadonlyMap<Monitor['type'], CheckRunner>

  constructor(runners: ReadonlyArray<CheckRunner>) {
    this.runners = new Map(runners.map((r) => [r.supportedType, r]))
  }

  run(monitor: Monitor): Promise<Result<CheckOutcome, CheckError>> {
    const runner = this.runners.get(monitor.type)
    if (runner === undefined) {
      return Promise.resolve(
        err({ type: 'unsupported', message: `No runner for type: ${monitor.type}` })
      )
    }
    return runner.run(monitor)
  }
}
