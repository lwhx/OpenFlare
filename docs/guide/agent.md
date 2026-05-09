# 接入 Agent

OpenFlare Agent 运行在节点侧，负责注册、心跳、同步配置、写入 OpenResty 文件、校验、reload、失败回滚与自更新。

## 接入方式

Agent 支持两种认证入口：

| 方式 | 适用场景 |
| --- | --- |
| `agent_token` | 已在管理端创建或分配节点，使用节点专属凭证接入 |
| `discovery_token` | 首次自动注册节点，由 Server 置换为节点专属凭证 |

二者至少填写一个。

## 安装脚本

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

安装脚本会写入 `/opt/openflare-agent`，创建 `openflare-agent.service`，并可重复执行以重装或升级 Agent。

## 配置文件示例

```json
{
  "server_url": "http://127.0.0.1:3000",
  "agent_token": "replace-with-node-auth-token",
  "data_dir": "./data",
  "openresty_container_name": "openflare-openresty",
  "openresty_docker_image": "openresty/openresty:alpine",
  "openresty_observability_port": 18081,
  "observability_replay_minutes": 15,
  "heartbeat_interval": 10000,
  "request_timeout": 10000
}
```

未配置 `openresty_path` 时，Agent 默认使用 Docker OpenResty。裸 OpenResty 模式需要显式配置本机路径和必要的配置写入目录。

## 源码运行

```bash
cd openflare_agent
export LOG_LEVEL='info'
go run ./cmd/agent -config /path/to/agent.json
```

## 编译后二进制运行

```bash
cd openflare_agent
go build -o openflare-agent ./cmd/agent
export LOG_LEVEL='info'
./openflare-agent -config /path/to/agent.json
```

## 卸载

如需彻底卸载 Agent 并清空本地数据：

```bash
curl -fsSL https://raw.githubusercontent.com/Rain-kl/OpenFlare/main/scripts/uninstall-agent.sh | bash
```

卸载脚本会停止并移除 `openflare-agent.service`，删除 `/opt/openflare-agent`，并根据配置尝试清理 Docker OpenResty 容器。
