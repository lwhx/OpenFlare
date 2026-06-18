# Wavelet Frontend Build Verification

**Date:** 2026-06-18  
**Directory:** `/Users/ryan/DEV/Go/OpenFlare/Wavelet/frontend`  
**Node/Next:** Next.js 16.2.7 (Turbopack)

## Summary

| Gate | Command | Exit Code | Result |
|------|---------|-----------|--------|
| TypeScript | `pnpm exec tsc --noEmit` | **0** | ✅ Pass |
| Lint | `pnpm lint` | **0** | ✅ Pass |
| Production build | `pnpm build:embed` | **1** | ❌ Fail |
| Standard build | `pnpm build` | **1** | ❌ Fail (same error) |

**Overall:** TypeScript and lint are clean. Both build targets fail during static page generation due to a missing React `Suspense` boundary around `useSearchParams()`.

---

## 1. TypeScript (`pnpm exec tsc --noEmit`)

- **Exit code:** `0`
- **Duration:** ~6.2s
- **Errors:** None
- **Warnings:** None

---

## 2. ESLint (`pnpm lint`)

- **Exit code:** `0`
- **Duration:** ~5.6s
- **Command:** `eslint` (no extra args)
- **Errors:** None
- **Warnings:** None

---

## 3. Production Build (`pnpm build:embed`)

**Production target:** `build:embed` — sets `NEXT_STANDALONE_EXPORT=true`, which enables `output: 'export'` in `next.config.ts` for static export embedded in the Go backend.

- **Exit code:** `1`
- **Duration:** ~57s (compile ~29.5s, TypeScript check ~23.9s)

### Build progress

- ✅ Compiled successfully
- ✅ TypeScript check passed during build
- ❌ Static page generation failed at **0/46** pages

### Error

```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/openflare/nodes".
  Read more: https://nextjs.org/docs/messages/missing-suspense-with-csr-bailout

Error occurred prerendering page "/openflare/nodes".
Export encountered an error on /(main)/openflare/nodes/page: /openflare/nodes, exiting the build.
⨯ Next.js build worker exited with code: 1 and signal: null
```

### Affected files

| File | Issue |
|------|-------|
| `app/(main)/openflare/nodes/page.tsx` | `useSearchParams()` at line 36 (page default export) |
| `app/(main)/openflare/nodes/components/node-type-filter.tsx` | `useSearchParams()` at line 57 (rendered inside nodes page) |

### Build output size

Not available — build aborted before artifact generation completed.

---

## 4. Standard Build (`pnpm build`)

Ran for comparison (uses rewrites instead of static export).

- **Exit code:** `1`
- **Duration:** ~65s
- **Error:** Identical `useSearchParams()` / missing `Suspense` failure on `/openflare/nodes`

---

## Root Cause

Next.js 16 requires `useSearchParams()` to be used inside a `<Suspense>` boundary when pages are statically prerendered/exported. The nodes page is a client component that calls `useSearchParams()` directly in both the page and a child component (`NodeTypeFilter`).

Other pages in the codebase already follow the correct pattern:

- `app/(auth)/login/page.tsx` — wraps content in `<Suspense>`
- `app/(auth)/register/page.tsx` — wraps content in `<Suspense>`
- `app/(main)/admin/tasks/page.tsx` — wraps content in `<Suspense fallback={...}>`
- `app/(main)/openflare/proxy-routes/detail/page.tsx` — splits into `page.tsx` + `page-client.tsx` with `<Suspense>`

---

## Other `useSearchParams()` Usages (likely to fail after nodes fix)

These files also use `useSearchParams()` without a visible `Suspense` wrapper at the page level. They may fail once `/openflare/nodes` is fixed and generation continues:

| File |
|------|
| `app/(main)/openflare/nodes/detail/page.tsx` |
| `app/(main)/openflare/websites/detail/page.tsx` |
| `app/(main)/openflare/origins/detail/page.tsx` |
| `app/(main)/openflare/apply-logs/page.tsx` |
| `app/(main)/openflare/pages/detail/page.tsx` |
| `components/auth/login-form.tsx` |
| `components/auth/login-page.tsx` |
| `components/auth/register-form.tsx` |

(Auth pages are likely safe because `login/page.tsx` and `register/page.tsx` already wrap them in `<Suspense>`.)

---

## Recommendations

### Priority 1 — Fix `/openflare/nodes` build blocker

Refactor using the existing `proxy-routes/detail` pattern:

1. Create `app/(main)/openflare/nodes/page-client.tsx` with the current page logic.
2. Change `page.tsx` to a server component that wraps the client component in `<Suspense fallback={<LoadingState />}>`.

Alternatively, wrap `<NodeTypeFilter />` and the `useSearchParams()` usage in a single child component inside `<Suspense>`.

### Priority 2 — Audit remaining pages

Apply the same `Suspense` pattern to all detail/list pages using `useSearchParams()` (see table above) to avoid repeated build failures at 1/46, 2/46, etc.

### Priority 3 — Add a CI gate

Run all three checks in CI before merge:

```bash
pnpm exec tsc --noEmit
pnpm lint
pnpm build:embed
```

### Priority 4 — Optional lint rule

Consider an ESLint rule or codemod to flag `useSearchParams()` usage outside `Suspense` boundaries, since `tsc` and `eslint` pass even when the production build fails.

---

## Actions Taken

- No code fixes applied. The failure is a structural Next.js `Suspense` requirement, not a trivial one-line lint fix.