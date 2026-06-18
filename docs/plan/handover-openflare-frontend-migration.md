# OpenFlare 前端迁移 — 任务拆分与 AI 委派

> **状态**：基本完成（验证通过，少量 P1 打磨待办）  
> **目标前端**：`Wavelet/frontend/`（Next.js 16 + shadcn/ui + Session 鉴权）  
> **验证报告**：[`verify-frontend-routes.md`](./verify-frontend-routes.md)、[`verify-frontend-services.md`](./verify-frontend-services.md)、[`verify-frontend-ui.md`](./verify-frontend-ui.md)、[`verify-frontend-build.md`](./verify-frontend-build.md)

## 任务队列

| ID | 板块 | 状态 |
|---|---|---|
| F0 | 基建 | ✅ |
| F-NODE | 节点（含 Relay/Tunnel 详情） | ✅ |
| F-PROXY | 代理规则（含 6 Section 实装） | ✅ |
| F-CFG | 配置发布 + 应用日志 | ✅ |
| F-DASH | 总览仪表盘 | ✅（缺世界地图） |
| F-WAF | WAF 规则组 + IP 组 | ✅ |
| F-WEB | 网站/证书/DNS | ✅ |
| F-PAGES | Pages 托管 | ✅ |
| F-ORIGIN | 源站 | ✅ |
| F-LOGS | 访问日志 | ✅ |
| F-PERF | 性能调优 | ✅ |
| F-ADMIN | Admin 运维设置扩展 | ✅ |
| F-AUTH | Wavelet 登录/用户复用 | ✅（原生，未改登录页） |

## 验证结果摘要

| 门禁 | 结果 |
|---|---|
| `tsc --noEmit` | ✅ |
| `pnpm lint` | ✅ |
| `pnpm build:embed` | ✅（46 静态页；已修 Suspense） |
| 路由覆盖 FC-1~19 | ✅ 18 完整 + 1 部分 |
| Service 覆盖 | ⚠️ `update` 升级流程待补 |

## 剩余 P1 待办

1. **FC-20** About 页或链到 `/docs`
2. **UpdateService** 补全 upgrade/manual-upload/WS 日志
3. **UI 打磨**：部分 Dialog 补 Zod；access-logs/proxy-detail error 态
4. **FC-1** 世界地图（可选，当前用 geo 列表）

## 验收命令

```bash
cd Wavelet/frontend
pnpm exec tsc --noEmit
pnpm lint
pnpm build:embed
pnpm dev
```