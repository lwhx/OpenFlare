# Upgrade and Maintenance

## Server Upgrade

Root users can check and upgrade stable Server releases from the console header. Manual binary upload is also supported.

Preview releases require manual selection. Stable releases are recommended for production.

## Agent Upgrade

Agents follow stable releases by default. Preview upgrades must be triggered manually.

The install script can be re-run for reinstall or upgrade:

```bash
curl -fsSL https://raw.githubusercontent.com/Rain-kl/OpenFlare/main/scripts/install-agent.sh | bash -s -- \
  --server-url http://your-server:3000 \
  --agent-token YOUR_AGENT_TOKEN
```

## Data Maintenance

The settings page controls observability cleanup:

| Option | Description |
| --- | --- |
| `DatabaseAutoCleanupEnabled` | Enable daily cleanup |
| `DatabaseAutoCleanupRetentionDays` | Retention days, minimum 1 |

When enabled, Server cleans access logs, metric snapshots, and request reports at 03:00 every day.

## Validation Commands

```bash
cd openflare_server
GOCACHE=/tmp/openflare-go-cache go test ./...
```

```bash
cd openflare_agent
GOCACHE=/tmp/openflare-go-cache go test ./...
```

```bash
cd openflare_server/web
pnpm build
```
