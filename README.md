# CatalogFlow AI

Internal catalog workflow tool for SPB Textile.

## Application Status

Implemented:

- Next.js App Router + TypeScript + Tailwind CSS
- Prisma schema for PostgreSQL/Supabase
- JWT login with HTTP-only session cookie
- Users with roles: `super_admin`, `admin`, `staff`, `viewer`
- Seller accounts
- User-to-seller-account assignments with permission levels
- Category profiles with SKU rules, image style, listing style, and enabled agents
- Protected dashboard with sidebar navigation
- Product creation with SKU/model-number generation
- Product variants, pricing, MRP, combo and pack support
- Image records with SKU-based Dropbox-style paths and links
- Image processing/audit workflow records
- Product image readiness rules: 3 images minimum for listing drafts, 7 recommended for marketplace-ready products, 8 maximum marketplace images
- Marketplace listing generation for Amazon, Flipkart, Myntra, Meesho, Shopify, and JioMart
- Excel-compatible marketplace export files
- Print prompt and print asset records
- Bulk jobs and synchronous queue processing
- SPB Manager Agent plus 19 specialist agents
- Agent run history and reusable memory records
- Marketplace push payload records for Shopify, Amazon, Flipkart, and other channels
- Settings page for Supabase, Dropbox, Photoroom, remove.bg, Shopify, Amazon SP-API, Flipkart, Meesho, JioMart, Upstash, OpenAI, and Vercel connection options

External providers are integration-ready but run in safe simulated mode until real credentials are added. This prevents accidental marketplace transmission during internal testing.

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

## Master Agent

The **SPB Manager Agent** coordinates the pipeline:

1. SKU Agent and Variant Agent prepare SKU/model/variant rows.
2. Image Audit, Storage, Dropbox, Photoroom, and Print agents prepare asset records.
3. SEO and Listing agents create marketplace-wise listing content.
4. Quality, Unique Validation, Memory, Notification, and Error Retry agents record readiness.
5. Excel Export and Marketplace Push agents prepare export/push payloads.

Use `/dashboard/agents` to sync the 20-agent registry and run the master agent against a product.

## API Connections

Use `/dashboard/settings` to configure provider metadata and required environment variable names. Raw secrets are not stored in the database. Add real values to `.env` or your hosting provider, then use **Test environment** in Settings to verify that required variables are present.

## Production Notes

Before live marketplace operations:

- Replace `.env` values with Supabase `DATABASE_URL` and a strong `JWT_SECRET`.
- Add real Dropbox, Photoroom/remove.bg, Shopify, Amazon SP-API, and Flipkart credentials.
- Replace simulated push/link behavior in the agent/provider layer with provider API calls.
- Review generated listing copy before pushing externally.
