<div align="center">

# OpenFlare

**[📖 English](./README.md) | [中文](./README.zh-CN.md)**

OpenFlare is an open-source CDN orchestration and edge security platform. It supports reverse proxies, centralized configuration synchronization, secure intranet penetration (Tunnels), dynamic WAF protection, and anti-CC challenges.

</div>

<p align="center">
  <a href="https://raw.githubusercontent.com/Rain-kl/OpenFlare/main/LICENSE">
    <img src="https://img.shields.io/github/license/Rain-kl/OpenFlare?color=brightgreen" alt="license">
  </a>
  <a href="https://github.com/Rain-kl/OpenFlare/releases/latest">
    <img src="https://img.shields.io/github/v/release/Rain-kl/OpenFlare?color=brightgreen&include_prereleases" alt="release">
  </a>
  <a href="https://github.com/Rain-kl/OpenFlare/pkgs/container/openflare">
    <img src="https://img.shields.io/badge/GHCR-ghcr.io%2Frain--kl%2Fopenflare-brightgreen" alt="ghcr">
  </a>
</p>

> [!WARNING]
> After logging in for the first time with the `root` user, make sure to change the default password `123456`.
> 
> The BETA version is a temporary product for the development and testing phase. It may contain unknown issues and should not be used in production environments.

## Documentation

**https://open-flare.pages.dev**

Quick links:

* [Quick Start](https://open-flare.pages.dev/en/guide/quick-start)
* [Deployment Guide](https://open-flare.pages.dev/en/guide/deployment)
* [Configuration Reference](https://open-flare.pages.dev/reference/configuration)
* [System Design](https://open-flare.pages.dev/design/)

## Core Features

* **Centralized Real-Time Config Sync**: Sync configurations across all nodes in real time via WebSockets and heartbeats with sub-second hot reload. Instantly retrieve alerts and statuses. No manual SSH login or online patching required.
* **Distributed CDN Orchestration**: Orchestrate scattered and independent OpenResty nodes into a highly collaborative distributed Content Delivery Network (CDN) fleet, supporting website-level multi-domain aggregation, upstream Keepalive, and multi-origin load balancing.
* **Secure Intranet Penetration (Tunnels)**: An open-source alternative to Cloudflare Tunnels. Expose local intranet services securely to the public network without a public IP or exposing inbound ports.
* **Edge WAF Safety Protection**: Provides global and custom rule groups, supporting IP/CIDR filtering, MaxMind GeoIP country-level regional access control, asynchronous differential synchronization of IP group members without Nginx reloads, and custom block responses.
* **Anti-CC & Human-Machine Challenge (PoW)**: Built-in high-performance client-side cryptographic Proof of Work challenges (similar to Turnstile) to block and intercept botnets and scrapers at the gateway edge in seconds.
* **Publish & Sync Model**: Based on immutable configuration versions (`YYYYMMDD-NNN`), preview and compare differences before publishing, a single globally active version, and one-click sub-second rollbacks.
* **Three-Stage Disaster Recovery & Rollback**: Supports automatic node backup rollback, a built-in safety fallback page (Port 80/503 keeping status monitoring and security interception active), and an abnormal configuration blocklist.
* **Automated Certificate Hosting**: Supports dynamic certificate upload, automatic multi-domain certificate matching and binding, ACME automatic renewal, and full lifecycle status tracking.
* **Unified Observability**: Aggregates node request counts, provides real-time access analysis, host/Nginx resource snapshots, health logs, and a re-upload buffer for network fluctuations.

## Quick Start

### 1. Launch Server

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

Access at: `http://localhost:3000`

Default credentials:

* Username: `root`
* Password: `123456`

### 2. Install Agent

Before installing an Agent, please install OpenResty on the target node first, or use the Agent Docker image with OpenResty built-in.

You can copy the installation command from **Node Management -> Details -> Node Info -> Node Token & Deployment** in the control panel, or directly use the scripts below:

#### Docker Deployment

For Docker deployment, you can directly run the Agent image:

```bash
docker pull ghcr.io/rain-kl/openflare-agent:latest
docker rm -f openflare-agent 2>/dev/null || true
docker run -d --name openflare-agent --restart unless-stopped \
  -p 80:80 -p 443:443 \
  -e OPENFLARE_SERVER_URL=http://your-server:3000 \
  -e OPENFLARE_AGENT_TOKEN=YOUR_AGENT_TOKEN \
  ghcr.io/rain-kl/openflare-agent:latest
```

#### Local Installation

Using `discovery_token` to register:

```bash
curl -fsSL https://raw.githubusercontent.com/Rain-kl/OpenFlare/main/scripts/install-agent.sh | bash -s -- \
  --server-url http://your-server:3000 \
  --discovery-token YOUR_DISCOVERY_TOKEN
```

Using node-specific `agent_token`:

```bash
curl -fsSL https://raw.githubusercontent.com/Rain-kl/OpenFlare/main/scripts/install-agent.sh | bash -s -- \
  --server-url http://your-server:3000 \
  --agent-token YOUR_AGENT_TOKEN
```

The installation script defaults to `/opt/openflare-agent`, creates a `openflare-agent.service`, automatically searches for `openresty`, and can be executed repeatedly to reinstall or upgrade the Agent.

### 3. Uninstall Agent

To completely uninstall the Agent and clear local data, run:

```bash
curl -fsSL https://raw.githubusercontent.com/Rain-kl/OpenFlare/main/scripts/uninstall-agent.sh | bash
```

The uninstallation script will stop and remove the `openflare-agent.service`, and delete the entire `/opt/openflare-agent` directory. It will not delete the local OpenResty installation.

### 4. Publish Your First Configuration

1. Log in to the management panel and add a reverse proxy rule.
2. View the preview or change summary before publishing.
3. Activate the new version.
4. Agents will receive the configuration and apply it via WebSocket notification or subsequent heartbeats.

The version number format is fixed as `YYYYMMDD-NNN`. Historical versions are immutable, and rollback is achieved by reactivating an older version.

## UI Preview

### Dashboard Overview

![OpenFlare dashboard overview](./docs/assets/readme/dashboard-overview.png)

### Node Details

![OpenFlare node detail](./docs/assets/readme/node-detail.png)

### Proxy Configuration

![OpenFlare version release](./docs/assets/readme/proxy-route-detail.png)

## Management Panel & API

The management panel includes:

* Reverse Proxy Rules
* Configuration Versions
* Node Management
* Application Records
* TLS Certificates
* Domain Management
* WAF Rule Groups
* User Management
* Settings
* Version Updates
* POW Rules

After logging in to the dashboard, access Swagger UI at: `/swagger/index.html`

## License

This project is licensed under [Apache License 2.0](./LICENSE).

## Star History

<a href="https://www.star-history.com/?repos=Rain-kl%2FOpenFlare&type=date&legend=bottom-right">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=Rain-kl/OpenFlare&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=Rain-kl/OpenFlare&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=Rain-kl/OpenFlare&type=date&legend=top-left" />
 </picture>
</a>
