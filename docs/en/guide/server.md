# Run Server

OpenFlare Server is the Gin + GORM control plane. It owns the web console, management API, Agent API, configuration rendering, release publishing, and state storage.

## Requirements

| Item | Requirement |
| --- | --- |
| Go | `1.24+` |
| Node.js | `18+` |
| Database | Writable SQLite path or reachable PostgreSQL instance |

Set `SESSION_SECRET` explicitly in production and prefer PostgreSQL.

## Build Frontend

```bash
cd openflare_server/web
corepack enable
pnpm install
pnpm build
```

## Run from Source

```bash
cd openflare_server
export SESSION_SECRET='replace-with-random-string'
export SQLITE_PATH='./openflare.db'
export LOG_LEVEL='info'
# Optional PostgreSQL:
# export DSN='postgres://openflare:secret@127.0.0.1:5432/openflare?sslmode=disable'
go run .
```

The default port is `3000`.

## Swagger

After logging in, open:

```text
http://localhost:3000/swagger/index.html
```

Regenerate Swagger files locally:

```bash
go install github.com/swaggo/swag/cmd/swag@v1.16.4
cd openflare_server
swag init -g main.go -o docs
```
