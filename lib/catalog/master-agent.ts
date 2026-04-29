import type { AgentRunStatus, JobStatus, JobType, Marketplace, Prisma } from "@prisma/client";

import { AGENT_BLUEPRINTS, PIPELINE_MARKETPLACES } from "@/lib/catalog/agent-definitions";
import { evaluateImageReadiness } from "@/lib/catalog/image-rules";
import { generateListingCopy } from "@/lib/catalog/listings";
import { buildVariantSku, splitSizes } from "@/lib/catalog/sku";
import { prisma } from "@/lib/prisma";

export async function syncAgentDefinitions() {
  await Promise.all(
    AGENT_BLUEPRINTS.map((agent) =>
      prisma.agentDefinition.upsert({
        where: { slug: agent.slug },
        update: {
          name: agent.name,
          description: agent.description,
          phase: agent.phase,
          capabilities: agent.capabilities,
          isMaster: agent.isMaster ?? false,
          isActive: true,
          sortOrder: agent.sortOrder,
        },
        create: {
          slug: agent.slug,
          name: agent.name,
          description: agent.description,
          phase: agent.phase,
          capabilities: agent.capabilities,
          isMaster: agent.isMaster ?? false,
          sortOrder: agent.sortOrder,
        },
      }),
    ),
  );
}

export async function writeAgentRun({
  slug,
  productId,
  bulkJobId,
  createdById,
  objective,
  status,
  input,
  output,
  logs,
}: {
  slug: string;
  productId?: string;
  bulkJobId?: string;
  createdById?: string;
  objective: string;
  status: AgentRunStatus;
  input: Prisma.InputJsonValue;
  output?: Prisma.InputJsonValue;
  logs: string[];
}) {
  await syncAgentDefinitions();
  const agent = await prisma.agentDefinition.findUniqueOrThrow({ where: { slug } });
  const now = new Date();

  return prisma.agentRun.create({
    data: {
      agentDefinitionId: agent.id,
      productId,
      bulkJobId,
      createdById,
      objective,
      status,
      input,
      output,
      logs,
      startedAt: now,
      finishedAt: status === "completed" || status === "failed" ? now : null,
    },
  });
}

export async function ensureProductVariants(productId: string) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { variants: true },
  });

  if (product.variants.length) {
    return product.variants.length;
  }

  const sizes = splitSizes(product.sizeRange);

  await prisma.productVariant.createMany({
    data: sizes.map((size) => ({
      productId: product.id,
      size,
      color: product.color,
      sku: buildVariantSku(product.sku, size),
      price: product.basePrice,
      mrp: product.mrp,
      stock: 0,
    })),
    skipDuplicates: true,
  });

  return sizes.length;
}

export async function generateListings(productId: string, marketplaces: readonly Marketplace[] = PIPELINE_MARKETPLACES) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: {
      sellerAccount: true,
      images: true,
    },
  });
  const readiness = evaluateImageReadiness(product.images.length);

  if (!readiness.canGenerateListing) {
    throw new Error(readiness.message);
  }

  const listings = await Promise.all(
    marketplaces.map((marketplace) => {
      const copy = generateListingCopy(product, marketplace);

      return prisma.marketplaceListing.upsert({
        where: {
          productId_marketplace: {
            productId,
            marketplace,
          },
        },
        update: {
          ...copy,
          status: readiness.isMarketplaceReady ? "generated" : "draft",
          version: { increment: 1 },
        },
        create: {
          productId,
          marketplace,
          ...copy,
          status: readiness.isMarketplaceReady ? "generated" : "draft",
        },
      });
    }),
  );

  await prisma.product.update({
    where: { id: productId },
    data: {
      status: readiness.isMarketplaceReady ? "ready" : "enrichment",
      imageReadiness: readiness.status,
    },
  });

  return listings.length;
}

export async function auditImages(productId: string, createdById?: string) {
  const images = await prisma.productImage.findMany({
    where: { productId },
    orderBy: { sortOrder: "asc" },
  });

  if (!images.length) {
    await prisma.product.update({
      where: { id: productId },
      data: { imageReadiness: "blocked" },
    });
    await writeAgentRun({
      slug: "image_audit",
      productId,
      createdById,
      objective: "Audit product images",
      status: "completed",
      input: { productId },
      output: { score: 0, message: "No images uploaded yet." },
      logs: ["Image audit completed with no uploaded images."],
    });
    return { processed: 0, readiness: evaluateImageReadiness(0) };
  }

  const readiness = evaluateImageReadiness(images.length);

  await Promise.all(
    images.map((image, index) =>
      prisma.productImage.update({
        where: { id: image.id },
        data: {
          status: "processed",
          processedUrl: image.processedUrl ?? image.sourceUrl,
          auditScore: Math.max(82, 96 - index * 3),
          notes: `${readiness.message} Replace simulated processed URL when Photoroom API is configured.`,
        },
      }),
    ),
  );

  await prisma.product.update({
    where: { id: productId },
    data: { imageReadiness: readiness.status },
  });

  await writeAgentRun({
    slug: "image_audit",
    productId,
    createdById,
    objective: "Audit product images",
    status: "completed",
    input: { productId, imageCount: images.length },
    output: { processed: images.length, readiness: readiness.status },
    logs: [`Processed ${images.length} image records. ${readiness.message}`],
  });

  return { processed: images.length, readiness };
}

export async function generatePrintAsset(productId: string, createdById?: string) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { categoryProfile: true },
  });

  if (!product.categoryProfile.requiresPrint) {
    return null;
  }

  const prompt = `${product.brand} ${product.targetAudience} ${product.pattern} print artwork for ${product.color} ${product.fabric}, clean commercial textile graphic`;

  const asset = await prisma.printAsset.create({
    data: {
      productId,
      prompt,
      assetUrl: `/generated/prints/${product.sku.toLowerCase()}.png`,
      notes: "Generated placeholder. Connect image generation provider before production print output.",
    },
  });

  await writeAgentRun({
    slug: "print_generation",
    productId,
    createdById,
    objective: "Generate print-ready asset",
    status: "completed",
    input: { productId, prompt },
    output: { assetUrl: asset.assetUrl },
    logs: ["Print asset prompt and placeholder record created."],
  });

  return asset;
}

export async function queueMarketplacePush(productId: string, marketplace: Marketplace, createdById?: string) {
  const imageCount = await prisma.productImage.count({ where: { productId } });
  const readiness = evaluateImageReadiness(imageCount);

  if (!readiness.isMarketplaceReady) {
    throw new Error(`Marketplace push blocked. ${readiness.message}`);
  }

  const listing = await prisma.marketplaceListing.findUnique({
    where: {
      productId_marketplace: {
        productId,
        marketplace,
      },
    },
  });

  if (!listing) {
    await generateListings(productId, [marketplace]);
  }

  const freshListing = await prisma.marketplaceListing.findUniqueOrThrow({
    where: {
      productId_marketplace: {
        productId,
        marketplace,
      },
    },
  });

  const push = await prisma.marketplacePush.upsert({
    where: {
      productId_marketplace: {
        productId,
        marketplace,
      },
    },
    update: {
      listingId: freshListing.id,
      status: "pushed",
      externalId: `${marketplace.toUpperCase()}-${Date.now()}`,
      payload: {
        listingId: freshListing.id,
        title: freshListing.title,
        skuSource: productId,
      },
      response: {
        mode: "simulated",
        message: "Marketplace API payload recorded. Configure real credentials to transmit externally.",
      },
      error: null,
      pushedAt: new Date(),
    },
    create: {
      productId,
      listingId: freshListing.id,
      marketplace,
      status: "pushed",
      externalId: `${marketplace.toUpperCase()}-${Date.now()}`,
      payload: {
        listingId: freshListing.id,
        title: freshListing.title,
        skuSource: productId,
      },
      response: {
        mode: "simulated",
        message: "Marketplace API payload recorded. Configure real credentials to transmit externally.",
      },
      pushedAt: new Date(),
    },
  });

  await prisma.marketplaceListing.update({
    where: { id: freshListing.id },
    data: { status: "pushed" },
  });

  await prisma.product.update({
    where: { id: productId },
    data: { status: "pushed" },
  });

  await writeAgentRun({
    slug: "marketplace_push",
    productId,
    createdById,
    objective: `Push ${marketplace} listing`,
    status: "completed",
    input: { productId, marketplace },
    output: { pushId: push.id, externalId: push.externalId },
    logs: [`${marketplace} push payload recorded.`],
  });

  return push;
}

export async function runMasterAgent(productId: string, objective: string, createdById?: string) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: {
      categoryProfile: true,
      images: true,
      variants: true,
    },
  });

  await syncAgentDefinitions();
  const startedAt = new Date();
  const logs = [
    "SPB Manager Agent started full pipeline.",
    "Assigned SKU, Variant, Image Audit, Listing, Quality Check, Export, Memory, and Push specialists.",
  ];

  const variants = await ensureProductVariants(productId);
  logs.push(`Variant Agent verified ${variants} variant rows.`);

  const imageAudit = await auditImages(productId, createdById);
  logs.push(`Image Audit Agent processed ${imageAudit.processed} image records. ${imageAudit.readiness.message}`);

  const printAsset = await generatePrintAsset(productId, createdById);
  logs.push(printAsset ? "Print Generation Agent created print asset." : "Print Generation Agent skipped because category does not require print.");

  let listingCount = 0;

  if (imageAudit.readiness.canGenerateListing) {
    listingCount = await generateListings(productId);
    logs.push(`Listing Agent generated ${listingCount} marketplace listings.`);
  } else {
    logs.push(`Listing Agent blocked: ${imageAudit.readiness.message}`);
  }

  await prisma.agentMemory.upsert({
    where: {
      scopeType_scopeKey_title: {
        scopeType: "category",
        scopeKey: product.categoryProfile.categoryName,
        title: "Latest pipeline preference",
      },
    },
    update: {
      value: {
        listingStyle: product.categoryProfile.listingStyle,
        imageStyle: product.categoryProfile.imageStyle,
        lastProductSku: product.sku,
      },
      createdById,
    },
    create: {
      scopeType: "category",
      scopeKey: product.categoryProfile.categoryName,
      title: "Latest pipeline preference",
      value: {
        listingStyle: product.categoryProfile.listingStyle,
        imageStyle: product.categoryProfile.imageStyle,
        lastProductSku: product.sku,
      },
      createdById,
    },
  });
  logs.push("Memory Agent saved category preferences for reuse.");

  await writeAgentRun({
    slug: "quality_check",
    productId,
    createdById,
    objective: "Validate full product readiness",
    status: "completed",
    input: { productId },
    output: {
      hasVariants: variants > 0,
      listingCount,
      processedImages: imageAudit.processed,
      imageReadiness: imageAudit.readiness.status,
      ready: imageAudit.readiness.isMarketplaceReady,
    },
    logs: [imageAudit.readiness.isMarketplaceReady ? "Quality gate passed for marketplace readiness." : imageAudit.readiness.message],
  });

  const run = await writeAgentRun({
    slug: "spb_manager",
    productId,
    createdById,
    objective,
    status: "completed",
    input: { productId, objective, previousStatus: product.status },
    output: {
      variants,
      processedImages: imageAudit.processed,
      listingCount,
      imageReadiness: imageAudit.readiness.status,
      status: imageAudit.readiness.isMarketplaceReady ? "ready" : "enrichment",
    },
    logs,
  });

  await prisma.product.update({
    where: { id: productId },
    data: {
      status: imageAudit.readiness.isMarketplaceReady ? "ready" : "enrichment",
      imageReadiness: imageAudit.readiness.status,
    },
  });

  await prisma.agentRun.update({
    where: { id: run.id },
    data: {
      startedAt,
      finishedAt: new Date(),
    },
  });

  return run;
}

export async function processBulkJob(bulkJobId: string, createdById?: string) {
  const job = await prisma.bulkJob.findUniqueOrThrow({
    where: { id: bulkJobId },
    include: { items: true },
  });

  await prisma.bulkJob.update({
    where: { id: bulkJobId },
    data: { status: "running" },
  });

  let processedItems = 0;
  let failedItems = 0;

  for (const item of job.items) {
    try {
      await prisma.bulkJobItem.update({
        where: { id: item.id },
        data: { status: "running" },
      });

      if (job.jobType === "listing_generation") {
        await generateListings(item.productId, job.marketplace ? [job.marketplace] : PIPELINE_MARKETPLACES);
      } else if (job.jobType === "image_processing") {
        await auditImages(item.productId, createdById);
      } else if (job.jobType === "marketplace_push") {
        await queueMarketplacePush(item.productId, job.marketplace ?? "Shopify", createdById);
      } else {
        await runMasterAgent(item.productId, `Bulk ${job.jobType} pipeline`, createdById);
      }

      processedItems += 1;
      await prisma.bulkJobItem.update({
        where: { id: item.id },
        data: {
          status: "completed",
          message: "Completed",
          output: { completedAt: new Date().toISOString() },
        },
      });
    } catch (error) {
      failedItems += 1;
      await prisma.bulkJobItem.update({
        where: { id: item.id },
        data: {
          status: "failed",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  const status: JobStatus = failedItems ? "failed" : "completed";

  await prisma.bulkJob.update({
    where: { id: bulkJobId },
    data: {
      status,
      processedItems,
      failedItems,
    },
  });

  await writeAgentRun({
    slug: "bulk_job",
    bulkJobId,
    createdById,
    objective: `Process ${job.jobType}`,
    status: failedItems ? "failed" : "completed",
    input: { bulkJobId, jobType: job.jobType },
    output: { processedItems, failedItems },
    logs: [`Bulk job processed ${processedItems} items with ${failedItems} failures.`],
  });
}

export function parseJobType(value: string): JobType {
  if (["listing_generation", "image_processing", "excel_export", "marketplace_push", "full_pipeline"].includes(value)) {
    return value as JobType;
  }

  return "full_pipeline";
}
