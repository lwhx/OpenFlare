# 快速开始

OpenFlare 的最小运行单元包含一个 Server 和至少一个 Agent。Server 负责管理端、配置版本与节点状态，Agent 运行在代理节点上，负责写入 OpenResty 配置并 reload。

## 启动 Server

推荐使用 PostgreSQL 与 Docker Compose：

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

访问 `http://localhost:3000`。

默认账号：

| 用户名 | 密码 |
| --- | --- |
| `root` | `123456` |

首次登录后请立即修改默认密码，并按需关闭新用户注册。

## 接入第一个节点

在管理端准备 `discovery_token` 或节点专属 `agent_token`，然后在节点上执行安装脚本。

使用 `discovery_token`：

```bash
curl -fsSL https://raw.githubusercontent.com/Rain-kl/OpenFlare/main/scripts/install-agent.sh | bash -s -- \
  --server-url http://your-server:3000 \
  --discovery-token YOUR_DISCOVERY_TOKEN
```

使用节点专属 `agent_token`：

```bash
curl -fsSL https://raw.githubusercontent.com/Rain-kl/OpenFlare/main/scripts/install-agent.sh | bash -s -- \
  --server-url http://your-server:3000 \
  --agent-token YOUR_AGENT_TOKEN
```

安装脚本默认把 Agent 放在 `/opt/openflare-agent`，创建 `openflare-agent.service`，并在未显式配置本机 OpenResty 时使用 Docker OpenResty。

## 发布第一份配置

1. 在管理端新增网站配置，填写域名与源站地址。
2. 发布前查看预览或变更摘要。
3. 激活新版本。
4. 等待 Agent 通过 heartbeat 发现版本变更并应用。

版本号格式为 `YYYYMMDD-NNN`。历史版本不可变，回滚通过重新激活旧版本完成。
