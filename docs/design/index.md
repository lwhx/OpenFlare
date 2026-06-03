# 产品边界

你会学到：OpenFlare 是什么、解决什么问题、目标用户是谁、当前稳定能力有哪些，以及哪些设计边界在实现时不能被绕过。

OpenFlare 是一套自托管的 OpenResty 控制面，面向单团队或单组织内部运维场景。它解决反向代理配置、节点同步、证书托管、配置发布回滚与基础观测分散管理的问题。

## 项目定位

OpenFlare 适合需要统一管理多台 OpenResty 代理节点的团队：

* 希望用管理端维护反向代理网站配置。
* 希望每次配置变更都有完整版本、预览、激活与回滚。
* 希望节点主动同步配置，而不是由控制面 SSH 到节点执行命令。
* 希望在同一系统中管理 TLS 证书、域名资产、节点状态和基础访问分析。

OpenFlare 当前不定位为通用日志平台、服务网格、Kubernetes Ingress Controller 或多租户云平台。

## 当前能力

| 能力 | 说明 |
| --- | --- |
| 反代规则管理 | 以网站配置为聚合边界，支持多域名与源站配置 |
| 网站级配置 | 一条规则对应一个网站，可绑定一个或多个域名，并共享站点级配置 |
| 源站管理 | 维护轻量源站目录，并允许网站保存可渲染的源站快照 |
| 配置版本 | 支持预览、发布、激活、不可变历史与回滚 |
| Agent 同步 | 支持注册、心跳、同步、应用结果上报与自更新 |
| OpenResty 托管 | 管理主配置模板、性能参数、缓存参数与 Lua 资源 |
| HTTPS/TLS | 托管证书与域名资产，并按域名绑定证书 |
| WAF | 以全局规则组与网站自定义规则组维护 IP/IP 段、IP 组、国家级地域黑白名单 |
| 基础观测 | 聚合节点请求、资源快照、健康事件和访问分析 |
| 节点管理 | 节点状态、令牌体系、部署与更新链路 |
| 管理端前端 | 基于 Next.js 的正式管理端 |
| 认证源登录 | 支持以认证源形式配置 GitHub 与标准 OIDC 登录入口，并允许第三方账号绑定已有本地用户 |
| 内网穿透 | 通过 TunnelRelay 节点与 OpenFlared 客户端，将内网 HTTP 服务安全暴露到公网，复用 Agent 的 HTTPS/WAF 能力 |
| Pages 静态托管 | 以 Pages 项目管理静态站点部署包，发布后由边缘 Agent 拉取并在本地 OpenResty 静态服务 |

默认工作方式：

* 所有节点消费同一份全局激活版本。
* Server 保存配置与状态，不直接 SSH 管理节点。
* Agent 是节点侧唯一受控落地入口。
* TunnelRelay 节点同时运行 Agent（OpenResty）和 Relay（frps），提供内网穿透中继。
* OpenFlared 客户端在内网运行，管理 frpc 进程连接 Relay，将流量转发到内网服务。

## 典型使用场景

| 场景 | 说明 |
| --- | --- |
| 内部服务统一入口 | 把多个内部 HTTP 服务通过统一域名和证书暴露 |
| 多节点反代配置同步 | 多台 OpenResty 节点消费同一份激活配置 |
| 配置变更审查 | 发布前查看预览或 diff，发布后保留不可变历史 |
| 快速回滚 | 重新激活旧版本，让 Agent 拉取并应用 |
| 证书托管 | 为不同域名绑定 TLS 证书 |
| 基础观测 | 查看节点状态、请求聚合、访问分析和健康事件 |
| 内网穿透 | 通过 Tunnel 将无法直接公网访问的内网 HTTP 服务暴露到互联网，享有 HTTPS、WAF 等全部防护能力 |
| 静态站点托管 | 上传已构建的静态资源包，将网站规则上游绑定到 Pages 项目，在边缘节点本地服务静态文件 |


## 网站配置约束

`proxy_routes` 是“网站配置”的聚合对象。一条记录对应一个网站，可绑定一个或多个域名，并共享一组站点级配置。

约束：

* `proxy_routes.site_name` 是网站的业务唯一标识。
* `proxy_routes.domains` 至少包含一个域名，且 `domains[0]` 作为主域名。
* 任一域名全局只能属于一个 `proxy_routes`。
* 网站级流量限制、反向代理与缓存配置均按站点共享，不在同一网站内做域名级差异化配置。
* HTTPS 允许在同一站点内按域名绑定证书。

## 源站与上游约束

`origins` 服务于源站目录复用，仅保存源站地址、展示名与备注，不承载协议、端口、路径、权重或健康检查策略。`proxy_routes` 可选关联一个 `origins`，但规则内部仍保存完整上游快照以参与渲染。

上游约束：

* `proxy_routes` 至少包含一个上游地址（直连类型 `direct`），或关联一个 Tunnel（内网穿透类型 `tunnel`），或关联一个 Pages 项目（静态托管类型 `pages`）。
* 多上游负载均衡统一渲染为带 keepalive 的 named `upstream`。
* 单上游允许附带 base path 或 query，并在 `proxy_pass` 中追加。多上游限定为纯 `scheme://host[:port]` 结构，且同一规则内的协议必须一致。
* `proxy_routes.origin_host` 为可选字段，用于回源时覆盖 `Host` 请求头。
* 所有直连类型上游地址都必须为合法的 `http://` 或 `https://`。
* 内网穿透类型上游必须关联有效 `tunnel_id`，并指定内网目标地址与协议。
* Pages 类型上游必须关联有效 Pages 项目，且项目必须存在已激活部署。Pages 站点不执行服务端构建、边缘函数或动态运行时代码，仅托管预构建静态资源。

## Pages 静态托管约束

OpenFlare Pages 面向边缘节点静态站点托管，采用“项目 + 不可变部署 + 网站规则绑定”的模型。

约束：

* Pages 项目保存名称、标识、启用状态、SPA fallback 启用状态、自定义回退路径和当前激活部署。
* Pages 部署由管理端上传预构建 zip 包生成；部署包保存在 Server 本地 Pages 存储目录，数据库只保存部署元数据和文件清单，不保存大体积文件内容。
* 只有项目存在激活部署后，`proxy_routes.upstream_type = 'pages'` 的网站规则才能绑定该项目。
* Pages 网站继续复用网站规则的域名、HTTPS、WAF、PoW、Basic Auth、限流、缓存配置和配置版本发布机制。
* 发布快照保存 Pages 项目、部署 ID、部署 checksum、入口文件、SPA fallback 启用状态和回退路径。Agent 拉取激活配置时按部署 checksum 下载并校验部署包，解压到本地 `pages_dir` 后再应用 OpenResty 配置。
* V1 不支持 Git 自动构建、预览域名、边缘函数、动态 SSR、外部对象存储或多租户隔离。

## 内网穿透约束

OpenFlare 通过 TunnelRelay 节点与 OpenFlared 客户端实现内网穿透，底层基于 frp（快速反向代理）构建。

### 节点与组件模型

**节点类型**：

* `nodes.node_type` 区分节点类型：`edge_node`（边缘节点，默认）和 `tunnel_relay`（隧道中继）。
* TunnelRelay 节点同时运行 Agent（OpenResty）和 Relay（frps 管理器），共享同一个 `agent_token`。
  - Agent 负责 HTTPS 终结、WAF 防护、缓存与流量限制等。
  - Relay 管理 frps 进程，为内网客户端提供隧道中继服务。
* TunnelRelay 节点新增字段：`node_type`、`relay_bind_port`（frpc 连接端口，默认 7000）、`relay_vhost_http_port`（HTTP Vhost 端口，默认 8080）、`relay_auth_token`（自动生成）、`relay_status` 等。

**Tunnel 客户端**：

* `tunnels` 表独立存储内网穿透客户端注册信息，与 `nodes` 体系无关。
* 每个 Tunnel 拥有唯一的 `tunnel_id`（格式 `tun-<32hex>`）和 `tunnel_token`（客户端认证凭据）。
* OpenFlared 客户端运行在内网，不对外暴露，使用 `tunnel_token` 认证，通过 `/api/flared/*` 端点与 Server 通信。
* 一个 OpenFlared 客户端可同时连接多个 Relay（为高可用）。

### 上游类型扩展

`proxy_routes` 的上游配置分为两种类型，通过 `upstream_type` 字段区分：

* **直连上游（`direct`，默认）**：直接将流量转发到源站地址，行为与现有完全一致。
* **内网穿透上游（`tunnel`）**：通过 TunnelRelay 节点将流量转发到内网服务。
  - 必须指定 `tunnel_id`（关联 `tunnels` 表）。
  - 必须指定 `tunnel_target_addr`（内网目标地址，如 `192.168.1.100:8080`）和 `tunnel_target_protocol`（`http` 或 `https`）。
  - 发布时，Server 自动将上游地址替换为 `http://127.0.0.1:{relay_vhost_http_port}`。

### 流量路径与协议

**完整数据面流量路径**：

```
浏览器 → OpenResty (Agent, TLS/WAF)         [TunnelRelay 节点]
       ↓
     frps (Relay, HTTP Vhost 路由)          [TunnelRelay 节点, 127.0.0.1:{vhost_port}]
       ↓
   frp 隧道协议 (Host 头路由)
       ↓
     frpc (Client, 多进程)                  [内网服务器]
       ↓
   内网服务 (192.168.x.x:port)
```

**关键特性**：

* frps 使用 HTTP Vhost 单端口复用机制，所有 HTTP 隧道共享一个 `vhost_port`，通过 Host 头自动路由到对应 frpc。
* Agent 保留原始 `Host` 请求头，frps 依据此头进行虚拟主机匹配。
* 每个隧道对应一条 `proxy_routes`，可绑定多个域名。
* OpenFlared 客户端为每个连接的 Relay 管理一个独立的 frpc 进程，通过单一 frp 隧道传输多个 HTTP 代理定义。

### 配置同步模型

发布流程同时生成两类配置版本数据，统一使用 `config_version` 版本号关联：

* **Agent 侧配置**：OpenResty 主配置 + 路由配置 + WAF 规则。包含 tunnel 上游时，自动渲染为 `http://127.0.0.1:{vhost_port}` 上游。
* **Tunnel 侧配置**：Relay 列表 + frpc 代理定义。随发布流程版本化，变更时优先使用 `frpc reload` 热重载。
* **Relay 配置**：通过心跳响应下发，相对静态，不纳入版本化流程。

### 隧道设计约束

* 仅支持 HTTP 协议隧道流量（保留 TCP/UDP 隧道的可扩展性），暂不支持单独的 TCP/UDP 端口分配。
* Tunnel 类型上游的域名 DNS 应当解析到指定的 TunnelRelay 中继节点。
* frp 二进制（v0.61+）由系统部署脚本或容器镜像统一打包提供。


## HTTPS 约束

`proxy_routes.domain_cert_ids` 用于记录与 `domains` 平行的域名证书绑定；值为 `0` 表示该域名不启用 HTTPS，仅保留 HTTP。

发布渲染时：

* 带证书的域名按证书分组输出独立 `443 ssl` `server` 块。
* 未绑定证书的域名不得被自动带入 HTTPS。
* 必须将 `proxy_routes.domains` 中的全部域名一并纳入同一站点配置，避免同站点在版本快照中被拆散。

## WAF 约束

WAF 以规则组为核心配置边界。系统提供唯一的全局规则组（默认应用至所有站点），网站可在此基础上叠加多个自定义规则组。

核心能力：

* 支持单个 IP / CIDR 网段黑白名单。
* 支持 IP 组引用（包括手动、自动Expr计算、URL订阅三类 IP 组）。
* 支持基于 GeoIP 的国家/地区级地域准入过滤。
* 支持规则组自定义拦截响应（支持自定义状态码与拦截 HTML 页面，默认返回 `418`）。

IP 组与判定约束：

* **运行时解耦**：WAF 运行时只读取本地 JSON，不访问 Server 数据库；配置版本仅保存引用的 IP 组 ID。IP 组成员通过哈希 Checksum 差分心跳及 WebSocket 异步推送，实现无需平滑重载 Nginx 的热生效。
* **内置预设 Expr 规则**：
  * 高频 404 扫描封禁：`request_count > 100 && status_404_ratio >= 0.8`
  * 恶意 IP 直连探测：`ip_host_count > 50 && ip_host_ratio > 0.5`
* **判决优先级**：白名单拥有绝对优先权。若未命中白名单，则触发黑名单漏斗匹配（全局规则组优先，自定义组按 ID 升序匹配）。
* 地域解析依赖节点本地 MaxMind 库；当 GeoIP 异常时自动忽略地域规则，不得破坏 IP 规则与反代主链路的可用性。

## 认证源约束

`auth_sources` 统一支持 `github` 与 `oidc` 登录配置入口。`external_accounts` 存储第三方与本地用户的绑定关系。第三方账号首次接入逻辑：

* 已绑定时直接授权登录；若已有本地会话则自动建立绑定。
* 未绑定且允许注册时自动创建本地账号；若关闭注册，则要求用户提供已有本地账号密码以建立关联。

## 版本与观测约束

* `config_versions` 必须保存完整快照、渲染结果与 `checksum`。
* 全局同时只能有一个激活版本。
* 回滚通过重新激活旧版本实现。
* `nodes` 只承载控制面状态与低频摘要，不承载高频观测事实。
* 指标、趋势和访问分析优先使用服务端聚合结果，而不是前端临时统计。
* 访问明细只保留受控时间窗口，不演变成通用日志平台。

## 文档维护原则

* 产品范围或系统边界变化时更新本文档。
* 系统结构或模块职责变化时更新 [系统架构](./architecture.md)。
* 发布、同步、回滚与 Agent 模型变化时更新 [Agent 与发布模型](./agent-design.md)。
* 开发约束、代码规范、接口约定变化时更新 [开发约束](../guildline/development-constraints.md)。
* 部署方式变化时更新 [部署说明](../deployment/deployment.md) 与 README.
* 配置项变化时更新 [配置项参考](../reference/configuration.md)。
* 已完成阶段不再以“版本计划”形式回填。
* 新阶段开始前，先补设计，再进入实现。
