export class StatusHub implements DurableObject {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/connect') {
      return this.handleConnect(request)
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      return this.handleBroadcast(request)
    }

    return new Response('not found', { status: 404 })
  }

  private handleConnect(request: Request): Response {
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
