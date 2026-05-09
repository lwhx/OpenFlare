# 升级与维护

## Server 升级

Root 用户可以在管理端顶栏检查并升级 Server 正式版。也可以通过上传 Server 二进制的方式执行确认升级。

如需尝试 preview 版本，可手动检查对应发布。生产环境建议优先使用正式版。

## Agent 升级

节点 Agent 默认只跟随正式版自动更新。preview 升级需要手动触发。

安装脚本可重复执行，用于重装或升级 Agent：

```bash
curl -fsSL https://raw.githubusercontent.com/Rain-kl/OpenFlare/main/scripts/install-agent.sh | bash -s -- \
  --server-url http://your-server:3000 \
  --agent-token YOUR_AGENT_TOKEN
```

## 数据维护

管理端设置页可以维护观测数据自动清理策略：

| 配置项 | 说明 |
| --- | --- |
| `DatabaseAutoCleanupEnabled` | 是否启用每日自动清理 |
| `DatabaseAutoCleanupRetentionDays` | 自动清理保留天数，至少 1 天 |

开启后，Server 会在每天凌晨 3 点清理访问日志、指标快照与请求报告。

## 常用验证命令

Server：

```bash
cd openflare_server
GOCACHE=/tmp/openflare-go-cache go test ./...
```

Agent：

```bash
cd openflare_agent
GOCACHE=/tmp/openflare-go-cache go test ./...
```

Frontend：

```bash
cd openflare_server/web
pnpm build
```
