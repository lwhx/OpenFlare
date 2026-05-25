# 启动 Server

OpenFlare Server 是 Gin + GORM 单体控制面，负责管理端 UI、管理 API、Agent API、配置渲染、版本发布与状态存储。

## 前置条件

| 项目 | 要求                                |
| --- |-----------------------------------|
| Go | `1.25+`                           |
| Node.js | `18+`                             |
| 数据库 | SQLite 文件目录可写，或可访问的 PostgreSQL 实例 |

生产环境建议显式配置 `SESSION_SECRET`，并优先使用 PostgreSQL。

## 构建管理端前端

```bash
cd openflare_server/web
corepack enable
pnpm install
pnpm build
```

`pnpm build` 会生成供 Go Server 托管的静态产物。

## 源码启动

```bash
cd openflare_server
export SESSION_SECRET='replace-with-random-string'
export SQLITE_PATH='./openflare.db'
export LOG_LEVEL='info'
# 可选：设置后优先使用 PostgreSQL。
# export DSN='postgres://openflare:secret@127.0.0.1:5432/openflare?sslmode=disable'
go run .
```

默认监听 `3000` 端口。也可以通过命令行指定：

```bash
go run . --port 3000 --log-dir ./logs
```

## 首次登录

访问 `http://localhost:3000`。

| 用户名 | 密码 |
| --- | --- |
| `root` | `123456` |

## Swagger

登录管理端后访问：

```text
http://localhost:3000/swagger/index.html
```

如需在本地重新生成 Swagger 文档：

```bash
go install github.com/swaggo/swag/cmd/swag@v1.16.4
cd openflare_server
swag init -g main.go -o docs
```
