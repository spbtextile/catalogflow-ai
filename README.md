# CatalogFlow AI

Internal catalog workflow tool for SPB Textile.

## Phase 1 Status

Implemented:

- Next.js App Router + TypeScript + Tailwind CSS
- Prisma schema for PostgreSQL/Supabase
- JWT login with HTTP-only session cookie
- Users with roles: `super_admin`, `admin`, `staff`, `viewer`
- Seller accounts
- User-to-seller-account assignments with permission levels
- Category profiles with SKU rules, image style, listing style, and enabled agents
- Protected dashboard with sidebar navigation

Phase 2 and later catalog modules are intentionally not built yet because `BUILD_PHASES.md` requires one phase at a time.

## Setup

```bash
npm install
copy .env.example .env
```

Update `.env` with your Supabase PostgreSQL connection string and a long random `JWT_SECRET`.

```bash
npm run prisma:migrate
npm run db:seed
npm run dev
```

Seed login:

- Email: `admin@spbtextile.com`
- Password: `CatalogFlow@123`

## Commands

```bash
npm run dev
npm run build
npm run lint
npm run prisma:studio
```
