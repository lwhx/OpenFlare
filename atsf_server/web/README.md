# ATSFlare Web

ATSFlare 管理端新版前端已切换为 Next.js App Router + TypeScript + Tailwind CSS 工程。

## 常用命令

```shell
corepack enable
pnpm install

# 本地开发
pnpm dev

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 单元测试
pnpm test

# 生成静态构建产物到 build/
pnpm build
```

## 构建说明

* 构建采用 Next.js 静态导出模式。
* `pnpm build` 会先生成 `out/`，随后自动复制为 Go Server 兼容的 `build/` 目录。
* 默认 API Base URL 为 `/api`，如需覆盖可在构建时设置 `NEXT_PUBLIC_API_BASE_URL`。
* 构建版本号可通过 `NEXT_PUBLIC_APP_VERSION` 注入，例如 `NEXT_PUBLIC_APP_VERSION=v0.4.0 pnpm build`。

## 目录约定

* `app/`：路由与布局
* `features/`：业务模块
* `components/`：复用组件
* `lib/`：请求、环境变量、工具与常量
* `tests/`：测试代码