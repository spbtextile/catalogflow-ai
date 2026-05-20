## 2026-05-20 - Memoization in Next.js App Router
**Learning:** In Next.js App Router, functions called multiple times during server-side rendering (like `getCurrentUser` in both `layout.tsx` and `page.tsx`) cause redundant database queries. Next.js does not auto-memoize custom data-fetching functions unless using the `fetch` API.
**Action:** Always wrap application-level data-fetching functions (like DB queries inside `getCurrentUser`) with `React.cache()` to ensure they are only executed once per request lifecycle.
