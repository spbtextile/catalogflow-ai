# CatalogFlow AI — Project Master Document

## App Overview
CatalogFlow AI is an internal company tool for SPB Textile (spbtextile).
It is a SellerMitra-like application for catalog management, AI listing generation, image processing, and marketplace publishing.

**App name:** CatalogFlow AI
**Type:** Internal tool — no subscription, no credits system
**Users:** Company staff only (multi-user, role-based)
**Stack:** Next.js + Prisma + PostgreSQL (Supabase) + Tailwind CSS

---

## Business Context
SPB Textile sells garments (Kids T-shirts, Mens Shorts, Trackpants, etc.) on multiple marketplaces:
- Amazon
- Flipkart
- Myntra
- Meesho
- Shopify
- JioMart

The app automates the full catalog pipeline: from product data input to AI-generated listings, image processing, and marketplace publishing.

---

## User Roles
- **super_admin** — full access to all seller accounts and settings
- **admin** — manages staff and seller accounts
- **staff** — works on assigned seller accounts
- **viewer** — read-only access

---

## Seller Accounts
Each seller account represents one marketplace seller profile.
Staff are assigned to specific seller accounts with a permission level.

---

## Category Profiles
Each category (e.g., Kids T-shirt, Mens Shorts) has a profile with:
- category_name
- requires_print (boolean)
- image_style (white_bg / lifestyle / studio)
- sku_rules (prefix, numbering format)
- listing_style (short / detailed / premium)
- enabled_agents (list of AI agents active for this category)

---

## Product Data Model
Each product includes:
- Seller account
- Brand
- Category
- Fabric (Cotton / Polyester / etc.)
- Color
- Size range
- Fit (Regular / Slim / etc.)
- Pattern / Print
- Features (no pocket / elastic waist / etc.)
- Target audience (boys / girls / men / women)
- is_combo (boolean for combo products)
- Pack of (quantity)
- SKU (auto-generated)
- Model number (auto-generated)
- Product options / variants
- Pricing

---

## SKU Generator
- Auto-generate SKU based on category + brand + color + size
- SKU format defined per category profile
- Model number auto-generation
- Combo product support (multi-item SKUs)

---

## Image Module
Images are uploaded per product and processed via Photoroom API:
- Background removal
- White / light grey studio background
- Resize for each marketplace (Amazon 1000x1000, Flipkart 1000x1000, Myntra 1080x1350, Meesho 1000x1000)
- Compress under marketplace file size limits
- Product shadow
- Crop / center product
- Bulk image processing
- Save images by SKU folder in Dropbox
- Before / after preview

**APIs:** Photoroom API (primary), remove.bg API (fallback)

---

## Dropbox Integration
- Upload processed images to Dropbox per SKU folder
- Generate public image links for marketplace listing
- Store Dropbox links in product record
- Use links in marketplace API push and Excel export

---

## Listing Generator (AI)
Input: product data (brand, category, fabric, color, size, features, target)
Output per marketplace:

**Amazon:**
- Title (200 char, SEO optimized)
- 5 bullet points (fabric, comfort, fit, use case, wash care)
- Description (paragraph + detailed)
- Backend search terms / keywords

**Flipkart:**
- Title
- Key features (short points)
- Description
- Specifications table

**Myntra:**
- Title
- Style note
- Size & fit
- Material & care

**Meesho / JioMart:**
- Simple title
- Short description
- Bullet points

**Shopify:**
- SEO title
- Meta description
- Tags
- Body HTML

**Smart features:**
- Category-based templates (Kids / Mens / Womens styles)
- Brand tone control (premium / budget / sporty)
- Auto variant generation (color + size)
- Duplicate content prevention

---

## Excel Export
- Generate marketplace-ready bulk upload Excel files per marketplace
- Fields: SKU, title, bullet points, description, keywords, image links, specifications, pricing
- Support for combo products and variants
- Bulk export for multiple products at once

---

## AI Agents (Phase 6 — 20 agents)
1. **SPB Manager Agent** — master controller, assigns tasks to sub-agents
2. **SEO Agent** — keyword research and optimization
3. **Listing Agent** — generates all marketplace content
4. **Image Audit Agent** — checks image quality and compliance
5. **Base Image Agent** — image upload and storage
6. **Photoroom Edit Agent** — background removal and editing
7. **Print Generation Agent** — generates print-ready files
8. **SKU Agent** — SKU and model number generation
9. **Marketplace Push Agent** — pushes to marketplace APIs
10. **Excel Export Agent** — creates bulk upload files
11. **Quality Check Agent** — validates listings (missing fields, wrong sizes, duplicate SKUs, banned words)
12. **Storage Agent** — saves files to Dropbox by SKU folder
13. **Dropbox Agent** — manages Dropbox uploads and link generation
14. **Variant Agent** — auto-generates product variants
15. **Combo Agent** — handles combo product creation
16. **Bulk Job Agent** — manages bulk operations queue
17. **Error Retry Agent** — retries failed operations
18. **Unique Validation Agent** — prevents duplicate content
19. **Notification Agent** — alerts staff on job completion
20. **Memory Agent** — stores brand/category preferences for reuse

---

## Marketplace API Push
Push listings directly via API (Phase 7):
1. Shopify (first — easiest API)
2. Amazon SP-API
3. Flipkart Seller API

Flow: Product data → Generate listing → Generate/edit images → Upload to Dropbox → Get image links → Push to marketplace API

---

## Cloud Infrastructure (Free Tier)
| Service | Purpose | Free Plan |
|---------|---------|-----------|
| Supabase | PostgreSQL DB | Yes |
| Vercel | Frontend hosting | Yes |
| Railway | Backend/worker | Yes (limited) |
| Upstash | Redis queue | Yes |
| Dropbox | Image storage | Yes |

---

## Daily Work Loop
1. Morning → Claude gives next task
2. Paste task into Codex CLI
3. Codex builds
4. Test the feature
5. Codex fixes errors
6. Push to GitHub → auto-deploys

---

## Build Phases Summary
See BUILD_PHASES.md for full phase breakdown.

Phase 1: Auth, roles, seller accounts, category profiles, dashboard
Phase 2: Product creation, SKU/model numbers, options/pricing
Phase 3: Image upload, Dropbox upload, Dropbox links
Phase 4: Listing generator, marketplace listings, Excel export
Phase 5: AI image generation, Photoroom API, print generation
Phase 6: Bulk jobs, queue worker, 20 agents, memory system
Phase 7: Marketplace API push (Shopify → Amazon → Flipkart)

---

## First Codex Prompt (Phase 1)
Read AGENTS.md, PROJECT_MASTER.md, and BUILD_PHASES.md.
Build Phase 1 only:
- Next.js + Prisma + Tailwind setup
- PostgreSQL connection via Supabase
- Login page with JWT auth
- Users table with roles: super_admin, admin, staff, viewer
- Seller accounts table
- user_seller_accounts assignment table (staff → seller account → permission_level)
- Category profiles table with: category_name, requires_print, image_style, sku_rules, listing_style, enabled_agents
- Basic dashboard layout with left sidebar
Run build. Fix all errors. Do not build Phase 2 yet.
