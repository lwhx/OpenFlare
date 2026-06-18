# OpenFlare 前端 UI 规范验收报告

> **验证日期**：2026-06-18  
> **范围**：`Wavelet/frontend/app/(main)/openflare/`

## 总体

| 维度 | 结果 |
|---|---|
| 标题 `h1 text-2xl font-semibold tracking-tight` | ✅ |
| 外壳 `py-6 px-1` | ✅ |
| shadcn 组件（无旧 UI） | ✅ |
| 单文件 ≤600 行 | ✅（最大 access-logs 584 行） |
| loading/empty/error | ⚠️ 部分 Tab 缺 error |
| RHF + Zod 表单 | ⚠️ 部分 Dialog 待补 |

## 分模块

| 模块 | 结论 |
|---|---|
| Dashboard | ✅ PASS |
| Nodes | ⚠️ `node-editor-dialog` 缺 Zod |
| Proxy detail | ⚠️ 无效 ID/error 态待统一组件 |
| WAF | ⚠️ `rule-entry-dialog` 缺 RHF+Zod |
| Websites/Certificates | ⚠️ `dns-account-create-dialog` 缺 Zod |
| Access logs | ⚠️ folds/ip-summary Tab 缺 error |
| Config versions | ⚠️ cleanup dialog 缺 Zod |

## P1 修复建议

1. `proxy-routes/detail/page-client.tsx` — `EmptyStateWithBorder` / `ErrorInline`
2. `access-logs/page.tsx` — folds、ip-summary 的 `isError` 分支
3. `node-editor-dialog.tsx`、`rule-entry-dialog.tsx` — 补 Zod schema