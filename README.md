# Uppies

Uptime monitor that runs on Cloudflare Workers. Checks HTTP endpoints, TCP ports, and TLS certificates on a cron schedule. Stores results in D1. Shows a status page with live updates over WebSocket.

## What you need

- A Cloudflare account (free tier works)
- Node.js and pnpm
- Wrangler CLI authenticated (`pnpm dlx wrangler login`)

## Setup

1. Fork and clone the repo. Install dependencies:

```
pnpm install
```

2. Create a D1 database:

```
cd worker
pnpm exec wrangler d1 create uppies
```

Copy the `database_id` from the output into `worker/wrangler.toml`, replacing `your-d1-database-id-here`.

3. Apply the schema:

```
cd worker
pnpm exec wrangler d1 execute uppies --remote --file=src/db/schema.sql
```

4. Edit `monitors.yml` at the repo root with the endpoints you want to monitor. Each monitor needs an `id`, `name`, `type` (http, tcp, or tls), and a target (`url` for http/tls, `host`/`port` for tcp).

5. Seed the monitors into D1:

```
pnpm seed:remote
```

6. Remove or update the `[[routes]]` block in `worker/wrangler.toml`. Delete it to use the default `*.workers.dev` URL, or set the pattern to your own domain.

7. Deploy:

```
pnpm deploy
```

The cron runs every minute. Each monitor runs according to its `interval_seconds` setting. Results show up at your worker URL.

## Notifications (optional)

Add a `notify` block to any monitor in `monitors.yml`:

```yaml
notify:
  - type: discord
    url: $DISCORD_WEBHOOK_URL
    on: [down, recover]
```

URLs starting with `$` are resolved from worker secrets:

```
cd worker
pnpm exec wrangler secret put DISCORD_WEBHOOK_URL
```

Supported types: `discord`, `webhook`. If the secret is missing, notifications are silently skipped.

## Configuration

These are set in `worker/wrangler.toml` under `[vars]`:

| Variable | Default | What it does |
|---|---|---|
| SITE_TITLE | Uppies | Page title |
| SITE_THEME | cyberpunk | Default theme |
| SITE_THEMES | cyberpunk,terminal,clean-dark,light,corporate | Comma-separated list of themes available in the switcher |
| CACHE_TTL | 30 | API cache duration in seconds |
| MAX_BODY_BYTES | 1048576 | Max response body size read during HTTP checks |
| HISTORY_DAYS | 90 | How many days of check history to show |

## Local dev

```
cd worker
pnpm exec wrangler d1 execute uppies --local --file=src/db/schema.sql
cd ..
pnpm seed
pnpm dev
```

Opens at `http://localhost:8787`. The dev script includes `--test-scheduled`, so you can trigger the cron manually by hitting `http://localhost:8787/__scheduled`.

## Project structure

```
monitors.yml     - define what to monitor
worker/          - Cloudflare Worker (cron, API, WebSocket)
app/             - Svelte 5 frontend (status page)
tokens/          - design tokens (Style Dictionary)
scripts/         - seed script
```
