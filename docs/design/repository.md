# 仓库结构

你会学到：OpenFlare 仓库中 Server、Agent、前端、脚本和文档目录分别负责什么，以及贡献代码时应把逻辑放到哪一层。

| 路径                   | 职责                                                 |
| ---------------------- | ---------------------------------------------------- |
| `openflare_server`     | Gin + GORM + SQLite/PostgreSQL 单体控制面            |
| `openflare_server/web` | Next.js 15 App Router 管理端前端，由 Go Server 托管  |
| `openflare_agent`      | Go 单体 Agent，运行在节点侧                          |
| `scripts`              | Agent 安装、卸载等辅助脚本                           |
| `docs`                 | VitePress 文档站、设计基线、开发规范、部署与配置文档 |
| `docs/en`              | 英文版文档                                           |

## Server 分层

| 目录          | 职责                                             |
| ------------- | ------------------------------------------------ |
| `controller/` | 参数解析、调用 service、返回响应                 |
| `service/`    | 业务逻辑、校验、事务编排、配置渲染               |
| `model/`      | 模型定义、数据库版本与迁移                       |
| `router/`     | 路由注册                                         |
| `middleware/` | 认证、鉴权、限流、CORS、Turnstile 验证等横切逻辑 |
| `common/`     | 配置、全局状态与初始化入口                       |
| `utils/`      | 纯工具函数与通用 helper                          |
| `job/`        | 定时任务（如 SSL 证书续期）                      |
| `upload/`     | 文件上传处理                                     |
| `docs/`       | API 文档（Swagger）                              |
| `data/`       | 静态数据（如 GeoIP 数据库）                      |

## Agent 模块

| 模块             | 职责                                         |
| ---------------- | -------------------------------------------- |
| `config/`        | 配置读取与默认值                             |
| `heartbeat/`     | 心跳与版本摘要判断                           |
| `sync/`          | 配置拉取与应用编排                           |
| `nginx/`         | OpenResty 文件写入、校验、reload、启动与回滚 |
| `state/`         | 本地状态与观测补报缓冲                       |
| `httpclient/`    | Server 通信                                  |
| `wsclient/`      | WebSocket 客户端通信                         |
| `protocol/`      | Agent API 协议类型                           |
| `updater/`       | Agent 自更新逻辑                             |
| `logging/`       | 日志处理                                     |
| `observability/` | 可观测性（指标、链路等）                     |
| `geoipdata/`     | GeoIP 数据处理                               |
| `geoipupdate/`   | GeoIP 数据更新                               |
| `agent/`         | 核心 Agent 逻辑与生命周期                    |

## Frontend 分层

| 目录          | 职责                                         |
| ------------- | -------------------------------------------- |
| `app/`        | Next.js App Router 路由、布局、页面组装      |
| `features/`   | 按业务域组织的功能模块                       |
| `components/` | 跨 feature 复用的 UI 组件                    |
| `lib/`        | 请求客户端、环境变量、工具函数、常量         |
| `store/`      | 少量跨页面 UI 状态管理                       |
| `types/`      | 共享类型定义                                 |
| `styles/`     | 全局样式                                     |
| `tests/`      | 前端单元测试与集成测试（Vitest、Playwright） |
| `scripts/`    | 构建和部署相关脚本                           |
| `public/`     | 静态资源                                     |
