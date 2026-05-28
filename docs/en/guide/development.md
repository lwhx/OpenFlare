# Local Development

You will learn how to set up a local OpenFlare development environment, run the Server, Agent, and frontend, execute tests and builds, and understand the boundaries contributors must follow.

This page is for contributors. Product boundaries, data model constraints, API conventions, and frontend layering are defined in [Development Constraints](../design/development.md). This page focuses on executable local workflows.

## Repository Layout

| Path | Responsibility |
| --- | --- |
| `openflare_server` | Gin + GORM + SQLite/PostgreSQL monolithic control plane |
| `openflare_server/web` | Next.js management UI, statically exported and served by the Go Server |
| `openflare_agent` | Go Agent binary running on nodes |
| `scripts` | Agent install and uninstall scripts |
| `docs` | VitePress documentation site |

## Requirements

| Tool | Requirement |
| --- | --- |
| Go | `1.25+` |
| Node.js | `18+` |
| pnpm | Use `corepack enable` to follow the project-declared version |
| Docker | Needed for the default Docker OpenResty Agent mode and local integration |
| PostgreSQL | Optional. The Server uses SQLite when PostgreSQL is not configured. |

## Install Frontend Dependencies

```bash
cd openflare_server/web
corepack enable
pnpm install
```

Build static assets served by the Go Server:

```bash
pnpm build
```

## Run the Server

SQLite:

```bash
cd openflare_server
export SESSION_SECRET='dev-session-secret'
export SQLITE_PATH='./openflare-dev.db'
export LOG_LEVEL='debug'
go run .
```

PostgreSQL:

```bash
cd openflare_server
export SESSION_SECRET='dev-session-secret'
export DSN='postgres://openflare:secret@127.0.0.1:5432/openflare?sslmode=disable'
export LOG_LEVEL='debug'
go run .
```

Default URL:

```text
http://localhost:3000
```

Default account: `root` / `123456`.

## Run the Frontend Dev Server

The frontend dev server listens on `3001` by default and proxies API requests through `NEXT_DEV_BACKEND_URL`:

```bash
cd openflare_server/web
export NEXT_DEV_BACKEND_URL='http://127.0.0.1:3000'
pnpm dev
```

Open:

```text
http://localhost:3001
```

## Run the Agent

Create a local `agent.json`:

```json
{
  "server_url": "http://127.0.0.1:3000",
  "agent_token": "replace-with-node-auth-token",
  "data_dir": "./data",
  "heartbeat_interval": 10000,
  "request_timeout": 10000
}
```

Run:

```bash
cd openflare_agent
export LOG_LEVEL='debug'
go run ./cmd/agent -config ./agent.json
```

When `openresty_path` is not configured, the Agent uses Docker OpenResty. To debug local OpenResty, set `openresty_path`, `main_config_path`, `route_config_path`, `cert_dir`, and `lua_dir`.

## Tests

Server:

```bash
cd openflare_server
GOCACHE=/tmp/openflare-go-cache go test ./...
```

Agent:

```bash
cd openflare_agent
GOCACHE=/tmp/openflare-go-cache go test ./...
```

Frontend:

```bash
cd openflare_server/web
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

Docs:

```bash
cd docs
pnpm build
```

## Builds

Frontend static assets:

```bash
cd openflare_server/web
pnpm build
```

Server binary:

```bash
cd openflare_server
go build -o openflare-server .
```

Agent binary:

```bash
cd openflare_agent
go build -o openflare-agent ./cmd/agent
```

## Debugging Entrypoints

| Scenario | Command or Location |
| --- | --- |
| Server logs | `LOG_LEVEL=debug go run .` |
| Agent logs | `LOG_LEVEL=debug go run ./cmd/agent -config ./agent.json` |
| Swagger | `http://localhost:3000/swagger/index.html` |
| Frontend API proxy | `NEXT_DEV_BACKEND_URL=http://127.0.0.1:3000 pnpm dev` |
| Docker OpenResty container | `docker ps --filter name=openflare-openresty` |

## Change Acceptance

Before contributing, confirm that:

1. The change fits [Product Boundary](../design/index.md).
2. The implementation follows [Development Constraints](../design/development.md).
3. It does not break release, sync, rollback, or upgrade flows.
4. Documentation is updated when configuration, deployment, API, or product boundaries change.
5. Risky changes include tests or equivalent integration verification.

Database schema changes must bump the database version and include explicit migration and validation logic from the previous version.
