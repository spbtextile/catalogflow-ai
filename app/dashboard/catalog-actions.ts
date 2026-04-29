"use server";

import type { ProductImageRole, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  auditImages,
  ensureProductVariants,
  generateListings,
  generatePrintAsset,
  parseJobType,
  processBulkJob,
  queueMarketplacePush,
  runMasterAgent,
  syncAgentDefinitions,
} from "@/lib/catalog/master-agent";
import { MAX_MARKETPLACE_IMAGES } from "@/lib/catalog/image-rules";
import { buildModelNumber, buildProductSku, readSkuRules } from "@/lib/catalog/sku";
import { prisma } from "@/lib/prisma";
import { canEditCatalog, canManageWorkspace } from "@/lib/rbac";
import { requireSession } from "@/lib/session";

const marketplaceSchema = z.enum(["Amazon", "Flipkart", "Myntra", "Meesho", "Shopify", "JioMart"]);
const imageRoleSchema = z.enum(["main_front", "back", "side", "detail", "lifestyle", "size_fit", "pack_detail", "extra"]);

function readRequired(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function readOptional(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function requireCatalogEditor() {
  const session = await requireSession();

  if (!canEditCatalog(session.role)) {
    throw new Error("You do not have permission to edit catalog data.");
  }

  return session;
}

async function assertSellerAccess(userId: string, role: UserRole, sellerAccountId: string) {
  if (canManageWorkspace(role)) {
    return;
  }

  const assignment = await prisma.userSellerAccount.findUnique({
    where: {
      userId_sellerAccountId: {
        userId,
        sellerAccountId,
      },
    },
  });

  if (!assignment || assignment.permissionLevel === "viewer") {
    throw new Error("You do not have edit access to this seller account.");
  }
}

async function nextProductIdentity(categoryProfileId: string, formData: FormData) {
  const category = await prisma.categoryProfile.findUniqueOrThrow({
    where: { id: categoryProfileId },
  });
  const rules = readSkuRules(category.skuRules);
  const count = await prisma.product.count({
    where: { categoryProfileId },
  });

  let sequence = count + 1;
  let sku = "";
  let modelNumber = "";

  for (let attempts = 0; attempts < 50; attempts += 1) {
    sku = buildProductSku({
      prefix: rules.prefix,
      brand: readRequired(formData, "brand"),
      color: readRequired(formData, "color"),
      sizeRange: readRequired(formData, "sizeRange"),
      packOf: Number(readRequired(formData, "packOf")),
      sequence,
      numberingFormat: rules.numberingFormat,
    });
    modelNumber = buildModelNumber(rules.prefix, sequence);

    const existing = await prisma.product.findFirst({
      where: {
        OR: [{ sku }, { modelNumber }],
      },
      select: { id: true },
    });

    if (!existing) {
      break;
    }

    sequence += 1;
  }

  return { sku, modelNumber };
}

export async function saveProduct(formData: FormData) {
  const session = await requireCatalogEditor();

  const parsed = z
    .object({
      sellerAccountId: z.string().min(1),
      categoryProfileId: z.string().min(1),
      brand: z.string().min(2),
      fabric: z.string().min(2),
      color: z.string().min(2),
      sizeRange: z.string().min(1),
      fit: z.string().min(2),
      pattern: z.string().min(2),
      features: z.array(z.string()).default([]),
      targetAudience: z.string().min(2),
      isCombo: z.boolean(),
      packOf: z.number().int().min(1).max(20),
      basePrice: z.number().positive(),
      mrp: z.number().positive(),
    })
    .parse({
      sellerAccountId: readRequired(formData, "sellerAccountId"),
      categoryProfileId: readRequired(formData, "categoryProfileId"),
      brand: readRequired(formData, "brand"),
      fabric: readRequired(formData, "fabric"),
      color: readRequired(formData, "color"),
      sizeRange: readRequired(formData, "sizeRange"),
      fit: readRequired(formData, "fit"),
      pattern: readRequired(formData, "pattern"),
      features:
        readOptional(formData, "features")
          ?.split(",")
          .map((feature) => feature.trim())
          .filter(Boolean) ?? [],
      targetAudience: readRequired(formData, "targetAudience"),
      isCombo: formData.get("isCombo") === "on",
      packOf: Number(readRequired(formData, "packOf")),
      basePrice: Number(readRequired(formData, "basePrice")),
      mrp: Number(readRequired(formData, "mrp")),
    });

  await assertSellerAccess(session.userId, session.role, parsed.sellerAccountId);

  if (parsed.mrp < parsed.basePrice) {
    throw new Error("MRP cannot be lower than base price.");
  }

  const identity = await nextProductIdentity(parsed.categoryProfileId, formData);

  const product = await prisma.product.create({
    data: {
      ...parsed,
      ...identity,
      createdById: session.userId,
    },
  });

  await ensureProductVariants(product.id);
  await syncAgentDefinitions();
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/products");
}

export async function saveProductImage(formData: FormData) {
  const session = await requireCatalogEditor();
  const productId = readRequired(formData, "productId");
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { sellerAccount: true },
  });

  await assertSellerAccess(session.userId, session.role, product.sellerAccountId);

  const marketplaceValue = readOptional(formData, "marketplace");
  const marketplace = marketplaceValue ? marketplaceSchema.parse(marketplaceValue) : undefined;
  const role = imageRoleSchema.parse(readRequired(formData, "role")) as ProductImageRole;
  const fileName = readRequired(formData, "fileName");
  const sourceUrl = readRequired(formData, "sourceUrl");
  const dropboxPath = `/SPB Textile/CatalogFlow/${product.sku}/${fileName}`;
  const existingImageCount = await prisma.productImage.count({
    where: { productId },
  });

  if (existingImageCount >= MAX_MARKETPLACE_IMAGES) {
    throw new Error(`Maximum ${MAX_MARKETPLACE_IMAGES} marketplace images allowed per product.`);
  }

  await prisma.productImage.create({
    data: {
      productId,
      uploadedById: session.userId,
      fileName,
      role,
      sourceUrl,
      marketplace,
      dropboxPath,
      dropboxLink: `https://dropbox.example.com/spbtextile/${encodeURIComponent(product.sku)}/${encodeURIComponent(fileName)}?dl=0`,
      status: "uploaded",
    },
  });

  await auditImages(productId, session.userId);
  revalidatePath(`/dashboard/products/${productId}`);
  revalidatePath("/dashboard/images");
}

export async function runMasterAgentAction(formData: FormData) {
  const session = await requireCatalogEditor();
  const productId = readRequired(formData, "productId");
  const objective = readOptional(formData, "objective") ?? "Run full CatalogFlow pipeline";

  await runMasterAgent(productId, objective, session.userId);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agents");
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function generateListingsAction(formData: FormData) {
  await requireCatalogEditor();
  const productId = readRequired(formData, "productId");
  const marketplace = readOptional(formData, "marketplace");

  await generateListings(productId, marketplace ? [marketplaceSchema.parse(marketplace)] : undefined);
  revalidatePath("/dashboard/listings");
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function processImagesAction(formData: FormData) {
  const session = await requireCatalogEditor();
  const productId = readRequired(formData, "productId");

  await auditImages(productId, session.userId);
  revalidatePath("/dashboard/images");
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function generatePrintAction(formData: FormData) {
  const session = await requireCatalogEditor();
  const productId = readRequired(formData, "productId");

  await generatePrintAsset(productId, session.userId);
  revalidatePath("/dashboard/prints");
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function pushMarketplaceAction(formData: FormData) {
  const session = await requireCatalogEditor();
  const productId = readRequired(formData, "productId");
  const marketplace = marketplaceSchema.parse(readRequired(formData, "marketplace"));

  await queueMarketplacePush(productId, marketplace, session.userId);
  revalidatePath("/dashboard/marketplace-push");
  revalidatePath(`/dashboard/products/${productId}`);
}

export async function createBulkJobAction(formData: FormData) {
  const session = await requireCatalogEditor();
  const productIds = formData
    .getAll("productIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (!productIds.length) {
    throw new Error("Select at least one product.");
  }

  const jobType = parseJobType(readRequired(formData, "jobType"));
  const marketplaceValue = readOptional(formData, "marketplace");
  const marketplace = marketplaceValue ? marketplaceSchema.parse(marketplaceValue) : undefined;

  const job = await prisma.bulkJob.create({
    data: {
      title: readRequired(formData, "title"),
      jobType,
      marketplace,
      totalItems: productIds.length,
      createdById: session.userId,
      payload: {
        requestedFrom: "dashboard",
        productIds,
      },
      items: {
        create: productIds.map((productId) => ({
          productId,
        })),
      },
    },
  });

  await processBulkJob(job.id, session.userId);
  revalidatePath("/dashboard/bulk-jobs");
}

export async function processBulkJobAction(formData: FormData) {
  const session = await requireCatalogEditor();
  const bulkJobId = readRequired(formData, "bulkJobId");

  await processBulkJob(bulkJobId, session.userId);
  revalidatePath("/dashboard/bulk-jobs");
}

export async function saveMemoryAction(formData: FormData) {
  const session = await requireCatalogEditor();
  const scopeType = readRequired(formData, "scopeType");
  const scopeKey = readRequired(formData, "scopeKey");
  const title = readRequired(formData, "title");
  const notes = readRequired(formData, "notes");

  await prisma.agentMemory.upsert({
    where: {
      scopeType_scopeKey_title: {
        scopeType,
        scopeKey,
        title,
      },
    },
    update: {
      value: { notes },
      createdById: session.userId,
    },
    create: {
      scopeType,
      scopeKey,
      title,
      value: { notes },
      createdById: session.userId,
    },
  });

  revalidatePath("/dashboard/memory");
}

export async function syncAgentsAction() {
  await requireCatalogEditor();
  await syncAgentDefinitions();
  revalidatePath("/dashboard/agents");
}
