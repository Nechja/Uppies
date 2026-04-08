import type { MonitorSummary } from './types.ts'

type LiveMessage = {
  readonly monitors: ReadonlyArray<MonitorSummary>
}

type LiveCallbacks = {
  readonly onMonitors: (monitors: ReadonlyArray<MonitorSummary>) => void
  readonly onStateChange: (connected: boolean) => void
}

export function openLiveConnection(callbacks: LiveCallbacks): () => void {
  let ws: WebSocket | null = null
  let disposed = false
  let backoffMs = 1000

  function connect(): void {
    if (disposed) return

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws = new WebSocket(`${protocol}//${location.host}/api/live`)

    ws.onopen = () => {
      backoffMs = 1000
      callbacks.onStateChange(true)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as LiveMessage
        callbacks.onMonitors(data.monitors)
      } catch {
      }
    }

    ws.onclose = () => {
      callbacks.onStateChange(false)
      if (disposed) return
      setTimeout(connect, backoffMs)
      backoffMs = Math.min(backoffMs * 2, 30_000)
    }

    ws.onerror = () => ws?.close()
  }

  connect()

  return () => {
    disposed = true
    ws?.close()
  }
}
