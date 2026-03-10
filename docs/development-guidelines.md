# ATSFlare 开发规范（V3 准备版）

## 1. 适用范围

本规范适用于当前代码基线以及第三版开始前后的所有开发工作。

当前系统状态：

* 第一版、第二版功能已完成
* 当前开发重点不再是补历史阶段细节，而是稳定基线并准备第三版
* 超出 `docs/design.md` 当前边界的需求，必须先补设计，再编码

---

## 2. 技术基线

### 2.1 Server

`atsf_server` 继续作为单体控制面：

* Gin
* GORM
* SQLite
* 现有 ATSFlare 登录体系
* 现有 `atsf_server/web` 前端

约束：

* 默认不依赖 Redis
* 默认不依赖 MQ
* 默认不依赖对象存储
* 不为第三版预埋平台化基础设施

### 2.2 Agent

`atsf_agent` 继续作为 Go 单体程序：

* 单二进制
* 本地执行
* `nginx_path` 优先
* 无 `nginx_path` 时默认 Docker Nginx
* 生成资源默认放在 `./data`，由 `data_dir` 统一覆盖

### 2.3 前端

前端继续基于现有 React 管理端：

* 保持现有目录结构
* 继续复用现有 UI 与 helper 组织方式
* 不为第三版提前引入新的大型框架或状态管理方案

---

## 3. 分层与目录约束

### 3.1 Server 分层

* `controller/`：参数解析、调用 service、返回响应
* `service/`：业务逻辑、校验、渲染、事务编排
* `model/`：模型定义与持久化
* `router/`：路由注册
* `middleware/`：认证、鉴权、限流等横切逻辑
* `common/`：通用配置与工具

禁止：

* 在 `controller/` 堆积业务逻辑
* 在 `middleware/` 中写业务流程
* 为简单需求新增平台层抽象

### 3.2 Agent 分层

保持现有模块边界：

* `config`
* `heartbeat`
* `sync`
* `nginx`
* `state`
* `httpclient`
* `protocol`

要求：

* 每个模块职责单一
* 外部命令调用集中封装
* 状态落盘与配置落盘保持分离

---

## 4. 数据模型规范

当前有效实体：

* `proxy_routes`
* `config_versions`
* `nodes`
* `apply_logs`
* `tls_certificates`
* `managed_domains`

通用约束：

* 不新增平台化对象，除非第三版设计明确要求
* `proxy_routes` 仍保持一条域名对应一个 `origin_url`
* `config_versions` 必须保存完整快照与渲染结果
* 全局同时只能有一个激活版本
* 回滚通过重新激活旧版本实现
* 域名证书匹配必须同时支持精确匹配与通配符匹配
* 节点专属 `agent_token` 必须可立即失效

新增表或关键字段前，必须先回答两个问题：

1. 是否服务于第三版主链路？
2. 是否能在现有模型上扩展而不是平行造新模型？

---

## 5. API 与鉴权规范

### 5.1 API 约定

* 管理端与 Agent API 统一使用 JSON
* 成功与失败都必须返回清晰 `message`
* 列表接口返回稳定字段
* Agent API 固定放在 `/api/agent/*`

统一响应结构保持现有风格：

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

### 5.2 鉴权约定

管理端：

* 继续复用 ATSFlare 登录、角色与 session

Agent：

* 正式请求统一使用节点专属 `agent_token`
* 首次接入可使用全局 `discovery_token`
* 请求头统一使用 `X-Agent-Token`
* Agent 认证逻辑不得与用户登录态混用

禁止：

* 将本地 Nginx 操作暴露为远程执行接口
* 在日志中打印完整 Token

---

## 6. 发布与渲染规范

发布逻辑必须保持以下事实：

* 发布时读取全部启用的 `proxy_routes`
* 生成完整 Nginx 配置
* 计算 `checksum`
* 写入 `config_versions`
* 通过切换 `is_active` 激活版本

版本号格式保持：

```text
YYYYMMDD-NNN
```

限制：

* 不做在线改历史版本
* 不做按节点分组的差异化版本
* 预览与 diff 是只读能力，不产生发布记录

---

## 7. Agent 行为规范

Agent 必须满足：

* 启动后读取或生成本地 `node_id`
* 未显式配置 `node_name` 时自动获取主机名
* 未显式配置 `node_ip` 时自动探测本机 IP
* 周期性心跳
* 周期性检查激活版本
* 发现新版本时先备份旧文件
* 写入新路由与必要证书文件
* 先执行 `nginx -t`
* 成功后执行 `nginx -s reload`
* 失败时自动回滚并上报最终结果
* 本地 `agent_token` 为空且存在 `discovery_token` 时，自动注册并完成 Token 置换

容错要求：

* Server 不可用时继续使用旧配置
* 下载失败时不修改本地配置
* 本地状态文件损坏时允许重建，但不能破坏当前生效配置
* Docker 容器异常时，启动阶段应自动重建

---

## 8. 前端开发规范

要求：

* 只为当前版本主链路增加页面与交互
* API 请求统一放在已有 helper 体系
* 页面状态优先保持简单
* 沿用现有组件与样式体系，不大规模重构后台 UI

如果第三版要新增页面，优先原则：

* 能复用现有页面结构就不新增一套页面框架
* 能复用已有表单模式就不自造 DSL 编辑器

---

## 9. 代码风格与日志规范

### 9.1 Go

* 错误必须显式处理
* 函数尽量单一职责
* 输入校验放在边界层
* 业务枚举使用明确常量
* 不写无意义注释

### 9.2 命名

* 统一使用 `route`、`version`、`node`、`agent`
* 不混用 `client`、`edge`、`worker` 指代 Agent

### 9.3 日志

必须覆盖关键事件：

* 发布成功/失败
* Agent 注册
* 心跳异常
* 配置下载失败
* Nginx 校验或 reload 成功/失败
* 回滚触发

要求：

* 日志要足够定位问题
* 不打印敏感凭证完整值

---

## 10. 测试与验收规范

当前基线至少要持续覆盖：

* 路由校验与渲染
* 激活版本切换
* 节点在线状态判定
* 证书导入与匹配
* 自定义请求头渲染
* Agent 同步、回滚、本地状态读写
* 自动注册与 Token 置换
* 预览与 diff 的只读行为

第三版新增需求时：

* 先补单元测试或服务层测试
* 再补联调验证步骤
* 涉及发布链路、Agent 链路、鉴权链路的改动，必须补回归测试

---

## 11. 文档维护规范

出现以下情况必须同步更新文档：

* 第三版范围确定或变更
* API 出现破坏性变更
* 数据模型新增、删除或关键语义变化
* Agent 本地文件结构变化
* 部署方式变化
* 新增基础设施依赖

更新顺序：

1. `docs/design.md`
2. `docs/development-guidelines.md`
3. `docs/development-plan.md`
4. `docs/deployment.md`
