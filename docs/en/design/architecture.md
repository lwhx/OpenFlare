# Architecture

OpenFlare consists of Server, Agent, and local OpenResty on each node.

```text
OpenFlare Server (Gin + SQLite/PostgreSQL + Web UI)
        |
        | HTTP API / Config Pull
        v
OpenFlare Agent (register / heartbeat / sync / apply / update)
        |
        v
Local OpenResty or Docker OpenResty
        |
        v
Origin
```

## Server

`openflare_server` is a monolithic control plane based on Gin, GORM, SQLite/PostgreSQL, the existing login/session system, and the static frontend build.

It owns the admin UI and API, Agent API, configuration rendering, version publishing, storage, and aggregate queries.

## Agent

`openflare_agent` is a single Go binary that runs locally on each node. It prefers `openresty_path` when configured and uses Docker OpenResty by default otherwise.

It handles registration, heartbeat, sync, file writes, `openresty -t`, reload, rollback, self-update, and lightweight collection.

## Frontend

`openflare_server/web` is the production frontend baseline: Next.js App Router, React 19, TypeScript, and Tailwind CSS.
