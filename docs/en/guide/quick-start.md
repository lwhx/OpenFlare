# Quick Start

The minimal OpenFlare setup contains one Server and at least one Agent. Server owns the web console, release versions, and node state. Agent runs on proxy nodes and applies OpenResty configuration.

## Run Server

Docker Compose with PostgreSQL is recommended:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: openflare
      POSTGRES_USER: openflare
      POSTGRES_PASSWORD: replace-with-strong-password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U openflare -d openflare"]
      interval: 10s
      timeout: 5s
      retries: 5

  openflare:
    image: ghcr.io/rain-kl/openflare:latest
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "3000:3000"
    environment:
      SESSION_SECRET: replace-with-random-string
      DSN: postgres://openflare:replace-with-strong-password@postgres:5432/openflare?sslmode=disable
      GIN_MODE: release
      LOG_LEVEL: info

volumes:
  postgres-data:
```

```bash
docker compose up -d
```

Open `http://localhost:3000`.

Default credentials:

| Username | Password |
| --- | --- |
| `root` | `123456` |

Change the default password immediately after first login.

## Connect a Node

Prepare a `discovery_token` or node-specific `agent_token` in the console, then run the install script on the node.

```bash
curl -fsSL https://raw.githubusercontent.com/Rain-kl/OpenFlare/main/scripts/install-agent.sh | bash -s -- \
  --server-url http://your-server:3000 \
  --agent-token YOUR_AGENT_TOKEN
```

The script installs Agent under `/opt/openflare-agent`, creates `openflare-agent.service`, and uses Docker OpenResty unless a local `openresty_path` is configured.

## Publish the First Configuration

1. Create a site configuration with a domain and origin URL.
2. Preview the release or check the diff before publishing.
3. Activate the new version.
4. Wait for Agent to discover and apply it through heartbeat.

Version numbers use `YYYYMMDD-NNN`. Historical versions are immutable; rollback reactivates an old version.
