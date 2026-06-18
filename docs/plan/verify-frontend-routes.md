# OpenFlare 前端路由验证报告

> **验证日期**：2026-06-18  
> **对照**：`20260618-openflare-wavelet-frontend-migration.md` §6.1（FC-1 ~ FC-20）

## 路由对照

| # | 计划路由 | 状态 | 备注 |
|---|---|---|---|
| FC-1 | `/openflare` | ⚠️ partial | 仪表盘已实现；世界地图以国家列表替代 |
| FC-2 | `/openflare/nodes` | ✅ | |
| FC-3 | `/openflare/nodes/detail` | ✅ | Edge/Relay/Tunnel 三种详情 |
| FC-4 | `/openflare/proxy-routes` | ✅ | |
| FC-5 | `/openflare/proxy-routes/detail` | ✅ | 6 Section + 发布 |
| FC-6 | `/openflare/config-versions` | ✅ | |
| FC-7 | `/openflare/waf` | ✅ | |
| FC-8 | `/openflare/waf/ip-groups` | ✅ | 页内链接 |
| FC-9 | `/openflare/websites` | ✅ | |
| FC-10 | `/openflare/websites/detail` | ✅ | |
| FC-11 | `/openflare/websites/certificates` | ✅ | |
| FC-12 | `/openflare/websites/dns-accounts` | ✅ | |
| FC-13 | `/openflare/pages` | ✅ | |
| FC-14 | `/openflare/pages/detail` | ✅ | |
| FC-15 | `/openflare/origins` | ✅ | |
| FC-16 | `/openflare/origins/detail` | ✅ | |
| FC-17 | `/openflare/access-logs` | ✅ | 4 Tab |
| FC-18 | `/openflare/apply-logs` | ✅ | |
| FC-19 | `/openflare/performance` | ✅ | |
| FC-20 | `/openflare/about` | ❌ | 待实现或复用 `/docs` |

## 覆盖率

- **严格完成**：18/20（90%）
- **加权**：92.5%（FC-1 计 0.5）
- **PlaceholderPage 使用**：0（组件仍存在但未引用）

## 子路由（不在侧栏顶级）

`/openflare/nodes/detail`、`proxy-routes/detail`、`pages/detail`、`websites/detail`、`websites/certificates`、`websites/dns-accounts`、`waf/ip-groups`、`origins/detail`