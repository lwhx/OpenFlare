# 命令与脚本

## Server

源码启动：

```bash
cd openflare_server
export SESSION_SECRET='replace-with-random-string'
export SQLITE_PATH='./openflare.db'
export LOG_LEVEL='info'
go run .
```

指定监听端口与日志目录：

```bash
go run . --port 3000 --log-dir ./logs
```

测试：

```bash
cd openflare_server
GOCACHE=/tmp/openflare-go-cache go test ./...
```

## Frontend

开发：

```bash
cd openflare_server/web
pnpm install
pnpm dev
```

构建静态产物：

```bash
cd openflare_server/web
pnpm build
```

## Agent

源码运行：

```bash
cd openflare_agent
go run ./cmd/agent -config /path/to/agent.json
```

编译：

```bash
cd openflare_agent
go build -o openflare-agent ./cmd/agent
```

测试：

```bash
cd openflare_agent
GOCACHE=/tmp/openflare-go-cache go test ./...
```

## 安装 Agent

```bash
curl -fsSL https://raw.githubusercontent.com/Rain-kl/OpenFlare/main/scripts/install-agent.sh | bash -s -- \
  --server-url http://your-server:3000 \
  --agent-token YOUR_AGENT_TOKEN
```

## 卸载 Agent

```bash
curl -fsSL https://raw.githubusercontent.com/Rain-kl/OpenFlare/main/scripts/uninstall-agent.sh | bash
```

## Swagger

重新生成 Swagger 文档：

```bash
go install github.com/swaggo/swag/cmd/swag@v1.16.4
cd openflare_server
swag init -g main.go -o docs
```
