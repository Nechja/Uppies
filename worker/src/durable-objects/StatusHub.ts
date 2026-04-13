const DEFAULT_MAX_CONNECTIONS = 50

export class StatusHub implements DurableObject {
  private readonly maxConnections: number

  constructor(private readonly state: DurableObjectState, env: Record<string, unknown>) {
    const raw = env['MAX_WS_CONNECTIONS']
    this.maxConnections = typeof raw === 'string' && raw.length > 0
      ? parseInt(raw, 10)
      : DEFAULT_MAX_CONNECTIONS
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/connect') {
      return this.handleConnect()
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      return this.handleBroadcast(request)
    }

    return new Response('not found', { status: 404 })
  }

  private handleConnect(): Response {
    if (this.state.getWebSockets().length >= this.maxConnections) {
      return new Response('too many connections', { status: 503 })
    }

    const pair = new WebSocketPair()
    this.state.acceptWebSocket(pair[1])
    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    const payload = await request.text()
    const sockets = this.state.getWebSockets()

    for (const ws of sockets) {
      ws.send(payload)
    }

    return Response.json({ delivered: sockets.length })
  }

  webSocketMessage(): void {}
  webSocketClose(): void {}
  webSocketError(): void {}
}
