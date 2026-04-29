export type AgentBlueprint = {
  slug: string;
  name: string;
  description: string;
  phase: number;
  capabilities: string[];
  isMaster?: boolean;
  sortOrder: number;
};

export const AGENT_BLUEPRINTS: AgentBlueprint[] = [
  {
    slug: "spb_manager",
    name: "SPB Manager Agent",
    description: "Master controller that plans catalog work, assigns specialist agents, and writes the final product readiness state.",
    phase: 6,
    capabilities: ["orchestration", "routing", "quality_gate", "pipeline_memory"],
    isMaster: true,
    sortOrder: 1,
  },
  {
    slug: "seo",
    name: "SEO Agent",
    description: "Builds marketplace-safe keywords from category, garment attributes, brand memory, and customer search intent.",
    phase: 6,
    capabilities: ["keywords", "search_terms", "duplicate_prevention"],
    sortOrder: 2,
  },
  {
    slug: "listing",
    name: "Listing Agent",
    description: "Generates marketplace-wise titles, bullets, descriptions, specifications, Shopify SEO, and tags.",
    phase: 4,
    capabilities: ["amazon_listing", "flipkart_listing", "myntra_listing", "shopify_copy"],
    sortOrder: 3,
  },
  {
    slug: "image_audit",
    name: "Image Audit Agent",
    description: "Checks catalog image readiness, marketplace framing, background, and missing image risks.",
    phase: 5,
    capabilities: ["image_quality", "marketplace_compliance", "readiness_score"],
    sortOrder: 4,
  },
  {
    slug: "base_image",
    name: "Base Image Agent",
    description: "Tracks base image uploads and normalizes file metadata before processing.",
    phase: 3,
    capabilities: ["upload_intake", "image_metadata", "source_tracking"],
    sortOrder: 5,
  },
  {
    slug: "photoroom_edit",
    name: "Photoroom Edit Agent",
    description: "Prepares background removal and studio-image processing requests for Photoroom or fallback providers.",
    phase: 5,
    capabilities: ["background_removal", "studio_background", "marketplace_resize"],
    sortOrder: 6,
  },
  {
    slug: "print_generation",
    name: "Print Generation Agent",
    description: "Creates print prompt records and print-ready asset placeholders for categories that require artwork.",
    phase: 5,
    capabilities: ["print_prompt", "print_asset", "kidswear_graphics"],
    sortOrder: 7,
  },
  {
    slug: "sku",
    name: "SKU Agent",
    description: "Generates SKU and model numbers from category rules, brand, color, size, combo, and pack data.",
    phase: 2,
    capabilities: ["sku_generation", "model_number", "combo_rules"],
    sortOrder: 8,
  },
  {
    slug: "marketplace_push",
    name: "Marketplace Push Agent",
    description: "Packages approved listing payloads and records push status for Shopify, Amazon, Flipkart, and later channels.",
    phase: 7,
    capabilities: ["shopify_push", "amazon_spapi_payload", "flipkart_payload"],
    sortOrder: 9,
  },
  {
    slug: "excel_export",
    name: "Excel Export Agent",
    description: "Prepares marketplace-ready bulk upload rows and export status for Excel-compatible files.",
    phase: 4,
    capabilities: ["bulk_template", "image_links", "variant_rows"],
    sortOrder: 10,
  },
  {
    slug: "quality_check",
    name: "Quality Check Agent",
    description: "Validates missing fields, wrong price logic, image gaps, duplicate SKUs, and listing readiness.",
    phase: 6,
    capabilities: ["field_validation", "price_validation", "readiness_gate"],
    sortOrder: 11,
  },
  {
    slug: "storage",
    name: "Storage Agent",
    description: "Builds SKU-based storage paths and stable processed image locations.",
    phase: 3,
    capabilities: ["sku_folder", "asset_paths", "storage_policy"],
    sortOrder: 12,
  },
  {
    slug: "dropbox",
    name: "Dropbox Agent",
    description: "Creates Dropbox-ready folders and share-link records for product images.",
    phase: 3,
    capabilities: ["dropbox_path", "public_links", "asset_linking"],
    sortOrder: 13,
  },
  {
    slug: "variant",
    name: "Variant Agent",
    description: "Creates product variants from size range, color, pricing, MRP, and stock inputs.",
    phase: 2,
    capabilities: ["size_variants", "price_rows", "stock_defaults"],
    sortOrder: 14,
  },
  {
    slug: "combo",
    name: "Combo Agent",
    description: "Applies pack-of and combo naming rules across SKU, titles, and specifications.",
    phase: 2,
    capabilities: ["combo_sku", "pack_copy", "bundle_rules"],
    sortOrder: 15,
  },
  {
    slug: "bulk_job",
    name: "Bulk Job Agent",
    description: "Creates and processes multi-product jobs for listing, image, export, push, and full-pipeline work.",
    phase: 6,
    capabilities: ["queue", "batch_processing", "job_progress"],
    sortOrder: 16,
  },
  {
    slug: "error_retry",
    name: "Error Retry Agent",
    description: "Captures failed operations and prepares retry-safe job output.",
    phase: 6,
    capabilities: ["retry_policy", "failure_logs", "job_recovery"],
    sortOrder: 17,
  },
  {
    slug: "unique_validation",
    name: "Unique Validation Agent",
    description: "Prevents duplicate SKUs, repeated titles, and repeated marketplace content.",
    phase: 6,
    capabilities: ["sku_uniqueness", "title_uniqueness", "content_variation"],
    sortOrder: 18,
  },
  {
    slug: "notification",
    name: "Notification Agent",
    description: "Writes completion messages and operator-readable status updates for jobs and pushes.",
    phase: 6,
    capabilities: ["job_messages", "staff_alerts", "completion_summary"],
    sortOrder: 19,
  },
  {
    slug: "memory",
    name: "Memory Agent",
    description: "Stores reusable brand, category, marketplace, and workflow preferences for future listing runs.",
    phase: 6,
    capabilities: ["brand_memory", "category_preferences", "listing_tone"],
    sortOrder: 20,
  },
];

export const PIPELINE_MARKETPLACES = ["Amazon", "Flipkart", "Myntra", "Meesho", "Shopify", "JioMart"] as const;

