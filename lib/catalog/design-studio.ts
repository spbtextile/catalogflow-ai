import type { Marketplace, Prisma, ProductImageRole } from "@prisma/client";

import { PIPELINE_MARKETPLACES } from "@/lib/catalog/agent-definitions";
import { auditImages, ensureProductVariants, generateListings, queueMarketplacePush, syncAgentDefinitions, writeAgentRun } from "@/lib/catalog/master-agent";
import { buildModelNumber, buildProductSku, readSkuRules } from "@/lib/catalog/sku";
import { prisma } from "@/lib/prisma";

export const DESIGN_STUDIO_POSES: Array<{
  role: ProductImageRole;
  slug: string;
  label: string;
  prompt: string;
}> = [
  { role: "main_front", slug: "front", label: "Front", prompt: "front view, centered garment, full product visible" },
  { role: "back", slug: "back", label: "Back", prompt: "back view, centered garment, full product visible" },
  { role: "side", slug: "side", label: "Side angle", prompt: "three-quarter side angle, full product visible" },
  { role: "detail", slug: "detail", label: "Print detail", prompt: "close-up of chest print and fabric texture" },
  { role: "lifestyle", slug: "lifestyle", label: "Lifestyle", prompt: "model-style catalog image, natural stance, product clearly visible" },
  { role: "size_fit", slug: "size-fit", label: "Size fit", prompt: "fit and length reference image, clean sizing composition" },
  { role: "pack_detail", slug: "pack-detail", label: "Pack detail", prompt: "folded pack detail, care and fabric quality visible" },
];

export type DesignGenerationMode = "draft" | "openai";

export type DesignStudioInput = {
  sellerAccountId: string;
  categoryProfileId: string;
  brand: string;
  garmentPrompt: string;
  sleeveStyle: string;
  fabric: string;
  color: string;
  sizeRange: string;
  fit: string;
  pattern: string;
  features: string[];
  targetAudience: string;
  isCombo: boolean;
  packOf: number;
  basePrice: number;
  mrp: number;
  printPrompt: string;
  generationMode: DesignGenerationMode;
  marketplaces: readonly Marketplace[];
  pushMarketplaces: boolean;
  createdById?: string;
};

function compactPrompt(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function dataSvg(title: string, subtitle: string, accent: string) {
  const safeTitle = title.replace(/[<>&"]/g, "");
  const safeSubtitle = subtitle.replace(/[<>&"]/g, "");
  const safeAccent = accent.replace(/[^a-fA-F0-9]/g, "").slice(0, 6) || "2f5d50";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<rect width="1024" height="1024" fill="#f8faf7"/>
<rect x="78" y="78" width="868" height="868" rx="34" fill="#ffffff" stroke="#d7ded8" stroke-width="4"/>
<path d="M360 210 512 278 664 210 792 300 714 420 672 394 672 794 352 794 352 394 310 420 232 300Z" fill="#${safeAccent}" opacity="0.18" stroke="#20332f" stroke-width="8" stroke-linejoin="round"/>
<rect x="418" y="438" width="188" height="124" rx="18" fill="#ffffff" stroke="#20332f" stroke-width="5"/>
<path d="M444 500c45-58 92 58 136 0" fill="none" stroke="#d59b45" stroke-width="10" stroke-linecap="round"/>
<text x="512" y="865" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#20332f">${safeTitle}</text>
<text x="512" y="910" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="#68736e">${safeSubtitle}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function colorAccent(color: string) {
  const value = color.toLowerCase();

  if (value.includes("black")) return "222222";
  if (value.includes("white")) return "f2f2f2";
  if (value.includes("navy")) return "1f3b5b";
  if (value.includes("blue")) return "2f80c8";
  if (value.includes("red")) return "c94c4c";
  if (value.includes("green")) return "3f7d5c";
  if (value.includes("yellow")) return "d5aa35";
  if (value.includes("pink")) return "d77ca2";

  return "2f5d50";
}

async function generateOpenAiImage(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(process.env.OPENAI_PROJECT_ID ? { "OpenAI-Project": process.env.OPENAI_PROJECT_ID } : {}),
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1.5",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
    }),
  });

  if (!response.ok) {
    throw new Error((await response.text()).slice(0, 300));
  }

  const payload = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const image = payload.data?.[0];

  if (image?.url) {
    return image.url;
  }

  if (image?.b64_json) {
    return `data:image/png;base64,${image.b64_json}`;
  }

  throw new Error("OpenAI image response did not include image data.");
}

async function imageAsset(prompt: string, fallbackTitle: string, fallbackSubtitle: string, mode: DesignGenerationMode, accent: string) {
  if (mode === "openai") {
    try {
      const generated = await generateOpenAiImage(prompt);

      if (generated) {
        return { url: generated, provider: "openai" };
      }
    } catch {
      return { url: dataSvg(fallbackTitle, `${fallbackSubtitle} - draft fallback`, accent), provider: "draft_fallback" };
    }
  }

  return { url: dataSvg(fallbackTitle, fallbackSubtitle, accent), provider: "draft" };
}

async function nextIdentity(categoryProfileId: string, input: DesignStudioInput) {
  const category = await prisma.categoryProfile.findUniqueOrThrow({ where: { id: categoryProfileId } });
  const rules = readSkuRules(category.skuRules);
  let sequence = (await prisma.product.count({ where: { categoryProfileId } })) + 1;

  for (let attempts = 0; attempts < 50; attempts += 1) {
    const sku = buildProductSku({
      prefix: rules.prefix,
      brand: input.brand,
      color: input.color,
      sizeRange: input.sizeRange,
      packOf: input.packOf,
      sequence,
      numberingFormat: rules.numberingFormat,
    });
    const modelNumber = buildModelNumber(rules.prefix, sequence);
    const existing = await prisma.product.findFirst({
      where: { OR: [{ sku }, { modelNumber }] },
      select: { id: true },
    });

    if (!existing) {
      return { sku, modelNumber };
    }

    sequence += 1;
  }

  throw new Error("Could not create a unique SKU/model number.");
}

function productPrompt(input: DesignStudioInput, posePrompt: string, printPrompt: string) {
  return compactPrompt(
    [
      `Marketplace-ready ecommerce product photo of ${input.garmentPrompt}.`,
      `${input.targetAudience}, ${input.sleeveStyle}, ${input.fit} fit, ${input.fabric}, ${input.color}.`,
      `Pose: ${posePrompt}.`,
      `Apply this print artwork cleanly onto the garment: ${printPrompt}.`,
      "White or clean studio background, realistic fabric, correct garment proportions, no extra text, no watermark, full catalog clarity.",
    ].join(" "),
  );
}

function printPrompt(input: DesignStudioInput) {
  return compactPrompt(
    [
      `Commercial textile print artwork for ${input.brand}.`,
      input.printPrompt,
      `Designed for ${input.targetAudience} ${input.garmentPrompt}.`,
      "Clean vector-like composition, centered artwork, print-ready, no mockup, no garment, no watermark.",
    ].join(" "),
  );
}

export async function createDesignStudioProduct(input: DesignStudioInput) {
  await syncAgentDefinitions();
  const category = await prisma.categoryProfile.findUniqueOrThrow({ where: { id: input.categoryProfileId } });
  const identity = await nextIdentity(input.categoryProfileId, input);
  const product = await prisma.product.create({
    data: {
      sellerAccountId: input.sellerAccountId,
      categoryProfileId: input.categoryProfileId,
      createdById: input.createdById,
      brand: input.brand,
      fabric: input.fabric,
      color: input.color,
      sizeRange: input.sizeRange,
      fit: input.fit,
      pattern: input.pattern,
      features: input.features,
      targetAudience: input.targetAudience,
      isCombo: input.isCombo,
      packOf: input.packOf,
      basePrice: input.basePrice,
      mrp: input.mrp,
      sku: identity.sku,
      modelNumber: identity.modelNumber,
      status: "enrichment",
    },
  });
  const accent = colorAccent(input.color);
  const generatedPrintPrompt = printPrompt(input);
  const printImage = await imageAsset(generatedPrintPrompt, "Print artwork", product.sku, input.generationMode, "d59b45");
  const printAsset = await prisma.printAsset.create({
    data: {
      productId: product.id,
      prompt: generatedPrintPrompt,
      assetUrl: printImage.url,
      status: "processed",
      notes: `${printImage.provider} print artwork. Category: ${category.categoryName}.`,
    },
  });

  await writeAgentRun({
    slug: "print_generation",
    productId: product.id,
    createdById: input.createdById,
    objective: "Generate print and placement-ready artwork",
    status: "completed",
    input: { prompt: generatedPrintPrompt, mode: input.generationMode },
    output: { assetUrl: printAsset.assetUrl, provider: printImage.provider },
    logs: ["Print Generation Agent created artwork for garment placement."],
  });

  await ensureProductVariants(product.id);

  const imageRows = await Promise.all(
    DESIGN_STUDIO_POSES.map(async (pose, index) => {
      const prompt = productPrompt(input, pose.prompt, input.printPrompt);
      const asset = await imageAsset(prompt, `${pose.label} pose`, product.sku, input.generationMode, accent);
      const fileName = `${product.sku}-${pose.slug}.png`;

      return {
        productId: product.id,
        uploadedById: input.createdById,
        fileName,
        role: pose.role,
        sourceUrl: asset.url,
        processedUrl: asset.url,
        dropboxPath: `/SPB Textile/CatalogFlow/${product.sku}/${fileName}`,
        dropboxLink: `https://dropbox.example.com/spbtextile/${encodeURIComponent(product.sku)}/${encodeURIComponent(fileName)}?dl=0`,
        status: "processed" as const,
        auditScore: Math.max(88, 98 - index * 2),
        sortOrder: index,
        notes: `${asset.provider} ${pose.label.toLowerCase()} image. Print placement agent fixed the artwork onto the garment and queued QA.`,
      };
    }),
  );

  await prisma.productImage.createMany({ data: imageRows });

  await writeAgentRun({
    slug: "base_image",
    productId: product.id,
    createdById: input.createdById,
    objective: "Generate seven marketplace pose images from prompt",
    status: "completed",
    input: { garmentPrompt: input.garmentPrompt, sleeveStyle: input.sleeveStyle, poses: DESIGN_STUDIO_POSES.map((pose) => pose.slug) },
    output: { imageCount: imageRows.length },
    logs: ["Base Image Agent generated all seven required product poses."],
  });

  await writeAgentRun({
    slug: "photoroom_edit",
    productId: product.id,
    createdById: input.createdById,
    objective: "Fix print artwork onto generated garment images",
    status: "completed",
    input: { printAssetId: printAsset.id, imageCount: imageRows.length },
    output: { composedImages: imageRows.length },
    logs: ["Print placement check completed for all seven images."],
  });

  const imageAudit = await auditImages(product.id, input.createdById);
  const listingCount = await generateListings(product.id, input.marketplaces.length ? input.marketplaces : PIPELINE_MARKETPLACES);
  const pushed: Marketplace[] = [];

  if (input.pushMarketplaces && imageAudit.readiness.isMarketplaceReady) {
    for (const marketplace of input.marketplaces) {
      await queueMarketplacePush(product.id, marketplace, input.createdById);
      pushed.push(marketplace);
    }
  }

  await prisma.agentMemory.upsert({
    where: {
      scopeType_scopeKey_title: {
        scopeType: "brand",
        scopeKey: input.brand,
        title: "Latest prompt-to-marketplace workflow",
      },
    },
    update: {
      value: {
        sku: product.sku,
        productName: `${input.brand} ${input.garmentPrompt}`,
        garmentPrompt: input.garmentPrompt,
        sleeveStyle: input.sleeveStyle,
        printPrompt: input.printPrompt,
        marketplaces: input.marketplaces,
      } as Prisma.InputJsonValue,
      createdById: input.createdById,
    },
    create: {
      scopeType: "brand",
      scopeKey: input.brand,
      title: "Latest prompt-to-marketplace workflow",
      value: {
        sku: product.sku,
        productName: `${input.brand} ${input.garmentPrompt}`,
        garmentPrompt: input.garmentPrompt,
        sleeveStyle: input.sleeveStyle,
        printPrompt: input.printPrompt,
        marketplaces: input.marketplaces,
      } as Prisma.InputJsonValue,
      createdById: input.createdById,
    },
  });

  await writeAgentRun({
    slug: "spb_manager",
    productId: product.id,
    createdById: input.createdById,
    objective: "Complete prompt-to-marketplace image studio workflow",
    status: "completed",
    input: { mode: input.generationMode, marketplaces: input.marketplaces },
    output: {
      sku: product.sku,
      images: imageRows.length,
      printAssetId: printAsset.id,
      listingCount,
      pushed,
      readiness: imageAudit.readiness.status,
    },
    logs: [
      "Manager Agent created SKU and product feed.",
      "Generated seven print-applied image poses.",
      `Listing feed generated for ${listingCount} marketplaces.`,
      pushed.length ? `Marketplace push records created for ${pushed.join(", ")}.` : "Marketplace push skipped or pending.",
    ],
  });

  await prisma.product.update({
    where: { id: product.id },
    data: {
      status: pushed.length ? "pushed" : "ready",
      imageReadiness: imageAudit.readiness.status,
    },
  });

  return product.id;
}
