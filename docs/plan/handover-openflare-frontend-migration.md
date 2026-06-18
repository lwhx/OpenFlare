# OpenFlare 前端迁移 — 任务拆分与 AI 委派

> **状态**：进行中（阶段 0 基建 + 阶段 2 核心链路并行）  
> **目标前端**：`Wavelet/frontend/`（Next.js 16 + shadcn/ui + Session 鉴权）  
> **业务 API**：阶段一仍调用 `/api/*` legacy 兼容层（响应 `{success,message,data}`）  
> **平台 API**：认证/用户/Admin 使用 `/api/v1/*`（响应 `{error_msg,data}`）

## 任务隔离规则

| 规则 | 说明 |
|---|---|
| 文件所有权 | 每个任务 **仅修改** 自己的 `app/(main)/openflare/<module>/`、`lib/services/openflare/<module>.service.ts` |
| 共享文件 | `F0` 独占：`lib/navigation/`、`lib/services/openflare/legacy-base.service.ts`、`lib/services/openflare/index.ts`（注册入口）、`components/layout/sidebar.tsx`（仅新增 OpenFlare 导航组）、`app/(main)/openflare/layout.tsx` |
| 禁止修改 | Wavelet 框架核心：`app/(auth)/*` 逻辑、`lib/services/core/*`、`components/ui/*` 源码 |
| UI 规范 | 标题 `h1 text-2xl font-semibold tracking-tight`；单文件 ≤600 行；参考 `/admin/demo`、`/admin/database` 拆分模式 |
| 组件 | 仅用 `@/components/ui/*`（shadcn），**禁止**复制旧 `openflare-server/web/components/ui` |
| 服务层 | 业务 API 继承 `LegacyOpenFlareBaseService`；平台 API 继续用 `BaseService` |
| 鉴权 | Session Cookie（`withCredentials`），**禁止** `OpenFlare-Token` localStorage |
| 质量门禁 | `cd Wavelet/frontend && pnpm typecheck && pnpm lint` |

## 任务队列

| ID | 板块 | 状态 | 负责目录/文件 |
|---|---|---|---|
| F0 | 基建：Legacy 服务基类 + 导航 + 侧栏 + 路由骨架 | ✅ 完成 | `legacy-base.service.ts`、`openflare-nav.ts`、`sidebar.tsx`、`/home` → `/openflare` |
| F-NODE | 节点列表 + Edge 详情 | ✅ 完成（Relay/Tunnel 详情待补） | `node.service.ts`、`openflare/nodes/` |
| F-PROXY | 代理规则列表 + 详情骨架 | ✅ 骨架完成（6 Tab 待实装） | `proxy-route.service.ts`、`openflare/proxy-routes/` |
| F-CFG | 配置发布 + 应用日志 | ✅ 完成 | `config-version.service.ts`、`apply-log.service.ts` |
| F-DASH | 总览仪表盘 | ⏳ | `dashboard.service.ts`、`openflare/page.tsx` |
| F-WAF | WAF 规则组 + IP 组 | ⏳ | `waf.service.ts`、`openflare/waf/` |
| F-WEB | 网站/证书/DNS | ⏳ | `website.service.ts`、`tls-certificate.service.ts`、`openflare/websites/` |
| F-PAGES | Pages 托管 | ⏳ | `pages.service.ts`、`openflare/pages/` |
| F-ORIGIN | 源站 | ⏳ | `origin.service.ts`、`openflare/origins/` |
| F-LOGS | 访问日志 | ⏳ | `access-log.service.ts`、`openflare/access-logs/` |
| F-ADMIN | 运维设置扩展 Admin | ⏳ | `option.service.ts`、`admin/settings` 扩展块 |
| F-AUTH | 认证复用验证（Wavelet 原生） | ⏳ | 仅导航/回调 URL，不改登录页 |

## Legacy API 适配要点

旧 OpenFlare 业务 API 响应：

```json
{ "success": true, "message": "", "data": { ... } }
```

Wavelet `BaseService` 期望 `{ "error_msg": "", "data": ... }`。业务服务必须使用 `LegacyOpenFlareBaseService`：

```typescript
// lib/services/openflare/legacy-base.service.ts
protected static async legacyGet<T>(path: string, params?: Record<string, unknown>): Promise<T>
protected static async legacyPost<T>(path: string, data?: unknown): Promise<T>
// 解析 success/message/data；success=false 时 throw ApiErrorBase(message)
```

阶段一 `basePath` 示例：`/api/nodes`、`/api/proxy-routes`（无 `/v1` 前缀）。

## 页面规范速查

```tsx
// 标准页面外壳（参考 admin/demo）
<div className="py-6 px-1 space-y-6">
  <div className="flex items-center gap-2">
    <Icon className="size-5 text-primary" />
    <h1 className="text-2xl font-semibold tracking-tight">页面标题</h1>
  </div>
  {/* 内容 */}
</div>
```

| 旧组件 | Wavelet 替代 |
|---|---|
| `app-modal` | `Dialog` / `Sheet` |
| `app-table` | `Table` + `@tanstack/react-table` 或简易 Table |
| `status-badge` | `Badge` variant |
| `primary-button` | `Button` |
| ECharts 趋势图 | Recharts（世界地图可暂保留 ECharts） |

## 源代码参考

| 类型 | 路径 |
|---|---|
| 旧前端业务 | `openflare-server/web/features/<module>/` |
| 新前端标杆 | `Wavelet/frontend/app/(main)/admin/database/`、`admin/demo/` |
| 服务层范例 | `Wavelet/frontend/lib/services/admin/user.service.ts` |
| 迁移计划 | `docs/plan/20260618-openflare-wavelet-frontend-migration.md` |
| 后端 API | `docs/plan/20260618-openflare-wavelet-backend-migration.md` §12 |

## 验收命令

```bash
cd Wavelet/frontend
pnpm typecheck
pnpm lint
pnpm dev   # 联调 wavelet api :3000
```

## 阶段验收标准

| 阶段 | 验收 |
|---|---|
| F0 完成 | 登录后侧栏可见 OpenFlare 导航；`/home` → `/openflare`；各路由有占位或骨架页 |
| F-NODE + F-PROXY + F-CFG | 节点 CRUD、规则 CRUD、配置发布/激活、应用日志列表可联调 |
| 全量 | 旧前端 18 个控制台路由功能对等；E2E 核心路径通过 |

## 下一步（F0 完成后）

1. 启动 **F-DASH**（仪表盘，依赖 dashboard API）
2. 启动 **F-WAF** + **F-WEB**（阶段 3 并行）
3. **F-ADMIN** 合并运维设置到 `admin/settings`
4. 更新 `docs/changelog/index.md`（代码变更时）