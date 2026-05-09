# Repository Layout

| Path | Responsibility |
| --- | --- |
| `openflare_server` | Gin + GORM + SQLite/PostgreSQL control plane |
| `openflare_server/web` | Next.js 15 App Router admin frontend, statically exported and served by Go Server |
| `openflare_agent` | Go Agent running on nodes |
| `scripts` | Agent install, uninstall, and helper scripts |
| `docs` | VitePress docs site, design baseline, development rules, deployment and configuration docs |

## Server Layers

| Directory | Responsibility |
| --- | --- |
| `controller/` | Parse input, call service, return response |
| `service/` | Business logic, validation, transactions, rendering |
| `model/` | Models, database versioning, migrations |
| `router/` | Route registration |
| `middleware/` | Auth, authorization, rate limiting, cross-cutting logic |
| `common/` | Configuration, global state, initialization |
| `utils/` | Pure helpers |

## Frontend Layers

| Directory | Responsibility |
| --- | --- |
| `app/` | Routes, layouts, page composition |
| `features/` | Business-domain modules |
| `components/` | Cross-feature reusable components |
| `lib/` | API client, env, utilities, constants |
| `store/` | Small cross-page UI state |
| `types/` | Shared types |
