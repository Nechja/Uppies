import { readFileSync, writeFileSync, unlinkSync } from 'fs'
import { execSync } from 'child_process'
import { load } from 'js-yaml'
import { tmpdir } from 'os'
import { join } from 'path'

type RawExpect = {
  status?: number
  body_contains?: string
  body_not_contains?: string
  json_path?: string
  json_value?: string
  max_ms?: number
}

type RawNotifyChannel = {
  type: string
  url: string
  on: ReadonlyArray<string>
}

type RawMonitor = {
  id: string
  name: string
  url?: string
  host?: string
  port?: number
  type: string
  interval_seconds?: number
  timeout_ms?: number
  tls_warn_days?: number
  history_days?: number
  enabled?: boolean
  expect?: RawExpect
  notify?: ReadonlyArray<RawNotifyChannel>
}

type MonitorsFile = {
  monitors: ReadonlyArray<RawMonitor>
}

function parseMonitorsFile(raw: unknown): MonitorsFile {
  if (
    raw === null ||
    typeof raw !== 'object' ||
    !('monitors' in raw) ||
    !Array.isArray((raw as Record<string, unknown>)['monitors'])
  ) {
    throw new Error('monitors.yml must contain a top-level "monitors" array')
  }
  return raw as MonitorsFile
}

function toConfigJson(monitor: RawMonitor): string {
  const expect = monitor.expect === undefined ? undefined : {
    ...(monitor.expect.status !== undefined && { status: monitor.expect.status }),
    ...(monitor.expect.body_contains !== undefined && { bodyContains: monitor.expect.body_contains }),
    ...(monitor.expect.body_not_contains !== undefined && { bodyNotContains: monitor.expect.body_not_contains }),
    ...(monitor.expect.json_path !== undefined && { jsonPath: monitor.expect.json_path }),
    ...(monitor.expect.json_value !== undefined && { jsonValue: monitor.expect.json_value }),
    ...(monitor.expect.max_ms !== undefined && { maxMs: monitor.expect.max_ms }),
  }

  const notify = (monitor.notify ?? []).map((channel) => ({
    type: channel.type,
    url: channel.url,
    on: channel.on,
  }))

  return JSON.stringify({
    ...(monitor.history_days !== undefined && { historyDays: monitor.history_days }),
    expect,
    notify,
  })
}

function escape(value: string): string {
  return value.replace(/'/g, "''")
}

function toInsertStatement(monitor: RawMonitor): string {
  const url = monitor.url !== undefined ? `'${escape(monitor.url)}'` : 'NULL'
  const host = monitor.host !== undefined ? `'${escape(monitor.host)}'` : 'NULL'
  const port = monitor.port !== undefined ? String(monitor.port) : 'NULL'
  const intervalSeconds = monitor.interval_seconds ?? 60
  const timeoutMs = monitor.timeout_ms ?? 10000
  const tlsWarnDays = monitor.tls_warn_days ?? 30
  const enabled = monitor.enabled === false ? 0 : 1
  const configJson = escape(toConfigJson(monitor))

  return [
    `INSERT INTO monitors (id, name, url, host, port, type, interval_seconds, timeout_ms, tls_warn_days, enabled, config_json)`,
    `VALUES ('${escape(monitor.id)}', '${escape(monitor.name)}', ${url}, ${host}, ${port}, '${escape(monitor.type)}', ${intervalSeconds}, ${timeoutMs}, ${tlsWarnDays}, ${enabled}, '${configJson}')`,
    `ON CONFLICT(id) DO UPDATE SET`,
    `  name = excluded.name, url = excluded.url, host = excluded.host, port = excluded.port,`,
    `  type = excluded.type, interval_seconds = excluded.interval_seconds,`,
    `  timeout_ms = excluded.timeout_ms, tls_warn_days = excluded.tls_warn_days,`,
    `  enabled = excluded.enabled, config_json = excluded.config_json;`,
  ].join('\n')
}

function run() {
  const args = process.argv.slice(2)
  const isRemote = args.includes('--remote')

  const raw = load(readFileSync(join(process.cwd(), 'monitors.yml'), 'utf8'))
  const monitorsFile = parseMonitorsFile(raw)

  const sql = monitorsFile.monitors.map(toInsertStatement).join('\n\n')

  const tmpFile = join(tmpdir(), `uppies-seed-${Date.now()}.sql`)
  writeFileSync(tmpFile, sql)

  const target = isRemote ? '--remote' : '--local'
  const command = `pnpm exec wrangler d1 execute uppies ${target} --file=${tmpFile}`

  console.log(`Seeding ${monitorsFile.monitors.length} monitors${isRemote ? ' (remote)' : ' (local)'}...`)

  try {
    execSync(command, { stdio: 'inherit', cwd: join(process.cwd(), 'worker') })
    console.log('Done.')
  } finally {
    unlinkSync(tmpFile)
  }
}

run()
