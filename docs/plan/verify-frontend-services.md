# OpenFlare 前端 Service 层验证报告

> **验证日期**：2026-06-18  
> **目录**：`Wavelet/frontend/lib/services/openflare/`

## §7.1 对照结果

| 计划服务 | 实际文件 | 注册 | 方法覆盖 |
|---|---|---|---|
| dashboard | ✅ | `openflareDashboard` | ✅ |
| node | ✅ | `openflareNode` | ✅ 12 方法 |
| proxy-route | ✅ | `openflareProxyRoute` | ✅ |
| config-version | ✅ | `openflareConfigVersion` | ✅ |
| waf | ✅ | `openflareWaf` | ✅ |
| website | ✅ | `openflareWebsite` | ✅ |
| tls-certificate | ✅ | `openflareTls` | ✅ |
| dns-account | ✅ | `openflareDns` | ✅ |
| acme-account | ⚠️ 合并 | 经 `openflareTls` | `getDefaultAcmeAccount()` |
| pages | ✅ | `openflarePages` | ✅ |
| origin | ✅ | `openflareOrigin` | ✅ |
| access-log | ✅ | `openflareAccessLog` | ✅ |
| apply-log | ✅ | `openflareApplyLog` | ✅ |
| option | ✅ | `openflareOption` | ✅ |
| update | ⚠️ partial | `openflareUpdate` | 仅 `getLatestRelease` |

## 计划外（已实现）

- `status.service.ts` → `openflareStatus`
- `uptimekuma.service.ts` → `openflareUptimeKuma`
- `legacy-base.service.ts`（基类）

## 待补 API

| 端点 | 说明 |
|---|---|
| `POST /api/update/upgrade` | 顶栏升级流程 |
| `POST /api/update/manual-upload` | 手动上传 |
| `POST /api/update/manual-upgrade` | 手动确认升级 |
| `WS /api/update/logs/ws` | 升级日志流 |
| `GET /api/about` | About 页（FC-20） |

业务 `/api/*` 其余端点均已由 Service 覆盖。