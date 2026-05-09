# 配置项

## Server 命令行参数

| 参数 | 作用 | 默认值 |
| --- | --- | --- |
| `--port` | 指定 Server 监听端口 | `3000` |
| `--log-dir` | 指定日志目录 | 空 |
| `--version` | 输出当前版本后退出 | `false` |
| `--help` | 输出帮助信息后退出 | `false` |

## Server 环境变量

| 环境变量 | 作用 | 默认值 |
| --- | --- | --- |
| `PORT` | Server 监听端口 | `3000` |
| `GIN_MODE` | Gin 运行模式 | 非 `debug` 时按 release |
| `LOG_LEVEL` | 日志等级 | `info` |
| `SESSION_SECRET` | Session 签名密钥 | 启动时随机生成 |
| `SQLITE_PATH` | SQLite 数据库文件路径 | `openflare.db` |
| `DSN` | PostgreSQL DSN，设置后优先于 SQLite | 空 |
| `SQL_DSN` | 兼容旧命名的 PostgreSQL DSN，优先级低于 `DSN` | 空 |
| `REDIS_CONN_STRING` | Redis 连接串 | 空 |
| `UPLOAD_PATH` | 上传目录 | `upload` |
| `AGENT_TOKEN` | 兼容旧部署的全局 Agent Token | 空 |

`DSN` 与 `SQL_DSN` 同时存在时优先使用 `DSN`。配置 PostgreSQL 后，Server 优先使用 PostgreSQL；当目标 PostgreSQL 为空且本地 SQLite 文件存在时，启动阶段会自动迁移 SQLite 数据。

## 前端构建环境变量

| 环境变量 | 作用 | 默认值 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | 前端请求 API 的基础路径 | `/api` |
| `NEXT_PUBLIC_APP_VERSION` | 前端展示版本号 | `dev` |
| `NEXT_DEV_BACKEND_URL` | 本地开发服务器代理的后端地址 | `http://127.0.0.1:3000` |

## 运行时 Option

以下配置由管理端设置页维护，可热更新：

| 配置项 | 作用 | 默认值 |
| --- | --- | --- |
| `AgentHeartbeatInterval` | Agent 心跳间隔，毫秒 | `10000` |
| `NodeOfflineThreshold` | 节点离线阈值，毫秒 | `120000` |
| `AgentUpdateRepo` | Agent 自更新仓库 | `Rain-kl/OpenFlare` |
| `GeoIPProvider` | 节点/IP 归属解析方式 | `ipinfo` |
| `RegisterEnabled` | 是否允许新用户注册 | `false` |
| `PasswordRegisterEnabled` | 是否允许通过密码方式注册 | `true` |
| `DatabaseAutoCleanupEnabled` | 是否启用每日自动清理观测数据 | `false` |
| `DatabaseAutoCleanupRetentionDays` | 自动清理保留天数 | `30` |
| `GlobalApiRateLimitNum` / `GlobalApiRateLimitDuration` | 全局 API 限流次数 / 时间窗口 | `300` / `180` |
| `GlobalWebRateLimitNum` / `GlobalWebRateLimitDuration` | 全局 Web 限流次数 / 时间窗口 | `300` / `180` |
| `UploadRateLimitNum` / `UploadRateLimitDuration` | 上传接口限流次数 / 时间窗口 | `50` / `60` |
| `DownloadRateLimitNum` / `DownloadRateLimitDuration` | 下载接口限流次数 / 时间窗口 | `50` / `60` |
| `CriticalRateLimitNum` / `CriticalRateLimitDuration` | 敏感接口限流次数 / 时间窗口 | `100` / `1200` |

OpenResty 性能参数与缓存参数也保存在 Option 表，常用项包括 `OpenRestyWorkerProcesses`、`OpenRestyWorkerConnections`、`OpenRestyProxyConnectTimeout`、`OpenRestyProxyReadTimeout`、`OpenRestyCacheEnabled`、`OpenRestyCachePath` 与 `OpenRestyCacheMaxSize`。

## Agent 配置

Agent 支持 `-config` 命令行参数、`agent.json` 配置文件和 `LOG_LEVEL` 环境变量。

| 字段 | 作用 | 是否必填 | 默认值/行为 |
| --- | --- | --- | --- |
| `server_url` | 控制面地址 | 是 | 无 |
| `agent_token` | 节点专属认证 Token | 与 `discovery_token` 二选一 | 空 |
| `discovery_token` | 首次自动注册使用的全局 Token | 与 `agent_token` 二选一 | 空 |
| `node_name` | 节点名称 | 否 | 自动使用主机名 |
| `node_ip` | 节点 IP | 否 | 自动探测 |
| `openresty_path` | 本机 OpenResty 路径 | 否 | 空，未设置时走 Docker 模式 |
| `openresty_container_name` | Docker 模式下的容器名 | 否 | `openflare-openresty` |
| `openresty_docker_image` | Docker 模式下的镜像 | 否 | `openresty/openresty:alpine` |
| `openresty_observability_port` | 本地观测端口 | 否 | `18081` |
| `docker_binary` | Docker 可执行文件名或路径 | 否 | `docker` |
| `data_dir` | Agent 数据目录 | 否 | 配置文件所在目录下的 `data` |
| `main_config_path` | OpenResty 主配置写入路径 | 否 | 本机模式建议显式配置 |
| `route_config_path` | 路由配置写入路径 | 否 | `data_dir/etc/nginx/conf.d/openflare_routes.conf` |
| `cert_dir` | 本机证书写入目录 | 否 | `data_dir/etc/nginx/certs` |
| `lua_dir` | 本机 Lua 脚本写入目录 | 否 | `data_dir/etc/nginx/lua` |
| `observability_buffer_path` | 观测补报缓冲文件路径 | 否 | `data_dir/var/lib/openflare/observability-buffer.json` |
| `observability_replay_minutes` | 自动补传最近观测窗口分钟数 | 否 | `15` |
| `state_path` | Agent 本地状态文件路径 | 否 | `data_dir/var/lib/openflare/agent-state.json` |
| `heartbeat_interval` | 心跳间隔 | 否 | `10000` 毫秒 |
| `request_timeout` | HTTP 请求超时 | 否 | `10000` 毫秒 |

`heartbeat_interval` 与 `request_timeout` 支持毫秒整数或 Go duration 字符串。
