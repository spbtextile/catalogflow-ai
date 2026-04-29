export const INTEGRATION_PROVIDER_VALUES = [
  "supabase",
  "dropbox",
  "photoroom",
  "remove_bg",
  "shopify",
  "amazon_sp_api",
  "flipkart_seller",
  "meesho",
  "jiomart",
  "upstash_redis",
  "openai",
  "vercel",
] as const;

export type IntegrationProviderValue = (typeof INTEGRATION_PROVIDER_VALUES)[number];

export type IntegrationBlueprint = {
  provider: IntegrationProviderValue;
  displayName: string;
  description: string;
  baseUrl?: string;
  publicConfig?: Record<string, string>;
  secretEnvKeys: string[];
  sortOrder: number;
};

export const INTEGRATION_BLUEPRINTS: IntegrationBlueprint[] = [
  {
    provider: "supabase",
    displayName: "Supabase PostgreSQL",
    description: "Primary PostgreSQL database connection used by Prisma, auth, products, agents, jobs, and settings.",
    baseUrl: "https://supabase.com",
    publicConfig: { project: "Supabase project URL is optional for admin reference" },
    secretEnvKeys: ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
    sortOrder: 1,
  },
  {
    provider: "dropbox",
    displayName: "Dropbox",
    description: "Stores processed product images in SKU folders and generates marketplace-ready public links.",
    baseUrl: "https://api.dropboxapi.com",
    publicConfig: { rootFolder: "/SPB Textile/CatalogFlow" },
    secretEnvKeys: ["DROPBOX_ACCESS_TOKEN", "DROPBOX_APP_KEY", "DROPBOX_APP_SECRET"],
    sortOrder: 2,
  },
  {
    provider: "photoroom",
    displayName: "Photoroom",
    description: "Primary image editing API for background removal, studio backgrounds, resize, crop, and shadow processing.",
    baseUrl: "https://image-api.photoroom.com",
    secretEnvKeys: ["PHOTOROOM_API_KEY"],
    sortOrder: 3,
  },
  {
    provider: "remove_bg",
    displayName: "remove.bg",
    description: "Fallback image background-removal API when Photoroom is unavailable.",
    baseUrl: "https://api.remove.bg",
    secretEnvKeys: ["REMOVE_BG_API_KEY"],
    sortOrder: 4,
  },
  {
    provider: "shopify",
    displayName: "Shopify Admin API",
    description: "First live marketplace push target for products, variants, media, tags, and SEO fields.",
    baseUrl: "https://{store}.myshopify.com/admin/api",
    publicConfig: { apiVersion: "2026-01" },
    secretEnvKeys: ["SHOPIFY_STORE_DOMAIN", "SHOPIFY_ADMIN_ACCESS_TOKEN"],
    sortOrder: 5,
  },
  {
    provider: "amazon_sp_api",
    displayName: "Amazon SP-API",
    description: "Amazon marketplace publishing target for listing payloads, images, inventory, and catalog status.",
    baseUrl: "https://sellingpartnerapi-fe.amazon.com",
    publicConfig: { region: "IN" },
    secretEnvKeys: [
      "AMAZON_SP_API_CLIENT_ID",
      "AMAZON_SP_API_CLIENT_SECRET",
      "AMAZON_SP_API_REFRESH_TOKEN",
      "AMAZON_SP_API_SELLER_ID",
      "AMAZON_SP_API_REGION",
    ],
    sortOrder: 6,
  },
  {
    provider: "flipkart_seller",
    displayName: "Flipkart Seller API",
    description: "Flipkart listing, inventory, and catalog-push target for approved products.",
    baseUrl: "https://api.flipkart.net",
    secretEnvKeys: ["FLIPKART_SELLER_ID", "FLIPKART_APP_ID", "FLIPKART_APP_SECRET"],
    sortOrder: 7,
  },
  {
    provider: "meesho",
    displayName: "Meesho Supplier API",
    description: "Meesho simple title, description, image-link, and catalog upload target.",
    baseUrl: "https://supplier.meesho.com",
    secretEnvKeys: ["MEESHO_SUPPLIER_ID", "MEESHO_API_TOKEN"],
    sortOrder: 8,
  },
  {
    provider: "jiomart",
    displayName: "JioMart Seller API",
    description: "JioMart marketplace push target for approved listing and image-link payloads.",
    baseUrl: "https://seller.jiomart.com",
    secretEnvKeys: ["JIOMART_SELLER_ID", "JIOMART_API_TOKEN"],
    sortOrder: 9,
  },
  {
    provider: "upstash_redis",
    displayName: "Upstash Redis",
    description: "Queue and retry backend for durable bulk jobs and future worker execution.",
    baseUrl: "https://upstash.com",
    secretEnvKeys: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    sortOrder: 10,
  },
  {
    provider: "openai",
    displayName: "OpenAI",
    description: "AI provider for listing generation, agent reasoning, image prompts, quality checks, and memory extraction.",
    baseUrl: "https://api.openai.com",
    secretEnvKeys: ["OPENAI_API_KEY"],
    sortOrder: 11,
  },
  {
    provider: "vercel",
    displayName: "Vercel",
    description: "Deployment, environment, logs, and hosting integration for production operations.",
    baseUrl: "https://api.vercel.com",
    secretEnvKeys: ["VERCEL_TOKEN", "VERCEL_PROJECT_ID"],
    sortOrder: 12,
  },
];

