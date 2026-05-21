## 2024-05-21 - React Cache for Deduplicating DB Queries across App Router
**Learning:** In Next.js App Router, layout.tsx and page.tsx do not automatically share data fetches. Calling `getCurrentUser()` which queries the database via Prisma in both components causes redundant queries during a single Server Component render pass.
**Action:** Always wrap shared data-fetching functions (especially Prisma queries) used across Next.js Server Components with `React.cache()` to automatically deduplicate the requests per render pass.
