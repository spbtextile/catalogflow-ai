import { PrismaClient, UserRole, Marketplace, PermissionLevel, ImageStyle, ListingStyle } from "@prisma/client";
import bcrypt from "bcryptjs";

import { AGENT_BLUEPRINTS } from "../lib/catalog/agent-definitions";
import { buildModelNumber, buildProductSku, buildVariantSku, splitSizes } from "../lib/catalog/sku";
import { INTEGRATION_BLUEPRINTS } from "../lib/integrations/definitions";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("CatalogFlow@123", 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@spbtextile.com" },
    update: {
      name: "SPB Admin",
      role: UserRole.super_admin,
      isActive: true,
    },
    create: {
      name: "SPB Admin",
      email: "admin@spbtextile.com",
      passwordHash,
      role: UserRole.super_admin,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "catalog@spbtextile.com" },
    update: {
      name: "Catalog Staff",
      role: UserRole.staff,
      isActive: true,
    },
    create: {
      name: "Catalog Staff",
      email: "catalog@spbtextile.com",
      passwordHash,
      role: UserRole.staff,
    },
  });

  const amazon = await prisma.sellerAccount.upsert({
    where: { accountCode: "AMZ-SPB-01" },
    update: {
      name: "SPB Textile Amazon",
      marketplace: Marketplace.Amazon,
      isActive: true,
    },
    create: {
      name: "SPB Textile Amazon",
      accountCode: "AMZ-SPB-01",
      marketplace: Marketplace.Amazon,
    },
  });

  const flipkart = await prisma.sellerAccount.upsert({
    where: { accountCode: "FK-SPB-01" },
    update: {
      name: "SPB Textile Flipkart",
      marketplace: Marketplace.Flipkart,
      isActive: true,
    },
    create: {
      name: "SPB Textile Flipkart",
      accountCode: "FK-SPB-01",
      marketplace: Marketplace.Flipkart,
    },
  });

  const shopify = await prisma.sellerAccount.upsert({
    where: { accountCode: "SHP-SPB-01" },
    update: {
      name: "SPB Textile Shopify",
      marketplace: Marketplace.Shopify,
      isActive: true,
    },
    create: {
      name: "SPB Textile Shopify",
      accountCode: "SHP-SPB-01",
      marketplace: Marketplace.Shopify,
    },
  });

  await prisma.userSellerAccount.upsert({
    where: {
      userId_sellerAccountId: {
        userId: staff.id,
        sellerAccountId: amazon.id,
      },
    },
    update: {
      permissionLevel: PermissionLevel.editor,
      assignedById: superAdmin.id,
    },
    create: {
      userId: staff.id,
      sellerAccountId: amazon.id,
      permissionLevel: PermissionLevel.editor,
      assignedById: superAdmin.id,
    },
  });

  await prisma.userSellerAccount.upsert({
    where: {
      userId_sellerAccountId: {
        userId: superAdmin.id,
        sellerAccountId: shopify.id,
      },
    },
    update: {
      permissionLevel: PermissionLevel.owner,
      assignedById: superAdmin.id,
    },
    create: {
      userId: superAdmin.id,
      sellerAccountId: shopify.id,
      permissionLevel: PermissionLevel.owner,
      assignedById: superAdmin.id,
    },
  });

  await prisma.userSellerAccount.upsert({
    where: {
      userId_sellerAccountId: {
        userId: superAdmin.id,
        sellerAccountId: flipkart.id,
      },
    },
    update: {
      permissionLevel: PermissionLevel.owner,
      assignedById: superAdmin.id,
    },
    create: {
      userId: superAdmin.id,
      sellerAccountId: flipkart.id,
      permissionLevel: PermissionLevel.owner,
      assignedById: superAdmin.id,
    },
  });

  const kidsTshirt = await prisma.categoryProfile.upsert({
    where: { categoryName: "Kids T-shirt" },
    update: {
      requiresPrint: true,
      imageStyle: ImageStyle.white_bg,
      skuRules: { prefix: "KTS", numberingFormat: "0000", example: "KTS-BRAND-COLOR-SIZE-0001" },
      listingStyle: ListingStyle.detailed,
      enabledAgents: ["sku", "listing", "image_audit", "excel_export"],
      isActive: true,
    },
    create: {
      categoryName: "Kids T-shirt",
      requiresPrint: true,
      imageStyle: ImageStyle.white_bg,
      skuRules: { prefix: "KTS", numberingFormat: "0000", example: "KTS-BRAND-COLOR-SIZE-0001" },
      listingStyle: ListingStyle.detailed,
      enabledAgents: ["sku", "listing", "image_audit", "excel_export"],
    },
  });

  await prisma.categoryProfile.upsert({
    where: { categoryName: "Mens Shorts" },
    update: {
      requiresPrint: false,
      imageStyle: ImageStyle.studio,
      skuRules: { prefix: "MSH", numberingFormat: "0000", example: "MSH-BRAND-COLOR-SIZE-0001" },
      listingStyle: ListingStyle.premium,
      enabledAgents: ["sku", "listing", "quality_check"],
      isActive: true,
    },
    create: {
      categoryName: "Mens Shorts",
      requiresPrint: false,
      imageStyle: ImageStyle.studio,
      skuRules: { prefix: "MSH", numberingFormat: "0000", example: "MSH-BRAND-COLOR-SIZE-0001" },
      listingStyle: ListingStyle.premium,
      enabledAgents: ["sku", "listing", "quality_check"],
    },
  });

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

  const sampleSku = buildProductSku({
    prefix: "KTS",
    brand: "SPB",
    color: "Navy",
    sizeRange: "2-8",
    packOf: 1,
    sequence: 1,
    numberingFormat: "0000",
  });

  const sampleProduct = await prisma.product.upsert({
    where: { sku: sampleSku },
    update: {
      sellerAccountId: amazon.id,
      categoryProfileId: kidsTshirt.id,
      brand: "SPB",
      fabric: "Cotton",
      color: "Navy",
      sizeRange: "2-8",
      fit: "Regular",
      pattern: "Graphic Printed",
      features: ["soft feel", "round neck", "easy wash"],
      targetAudience: "Boys",
      isCombo: false,
      packOf: 1,
      basePrice: 249,
      mrp: 499,
      status: "ready",
      createdById: superAdmin.id,
    },
    create: {
      sellerAccountId: amazon.id,
      categoryProfileId: kidsTshirt.id,
      brand: "SPB",
      fabric: "Cotton",
      color: "Navy",
      sizeRange: "2-8",
      fit: "Regular",
      pattern: "Graphic Printed",
      features: ["soft feel", "round neck", "easy wash"],
      targetAudience: "Boys",
      isCombo: false,
      packOf: 1,
      sku: sampleSku,
      modelNumber: buildModelNumber("KTS", 1),
      basePrice: 249,
      mrp: 499,
      status: "ready",
      createdById: superAdmin.id,
    },
  });

  await prisma.productVariant.createMany({
    data: splitSizes("2-8").map((size) => ({
      productId: sampleProduct.id,
      size,
      color: "Navy",
      sku: buildVariantSku(sampleProduct.sku, size),
      price: 249,
      mrp: 499,
      stock: 0,
    })),
    skipDuplicates: true,
  });

  const existingImage = await prisma.productImage.findFirst({
    where: {
      productId: sampleProduct.id,
      fileName: `${sampleProduct.sku}-front.jpg`,
    },
  });

  if (!existingImage) {
    await prisma.productImage.create({
      data: {
        productId: sampleProduct.id,
        uploadedById: superAdmin.id,
        fileName: `${sampleProduct.sku}-front.jpg`,
        sourceUrl: "https://example.com/catalogflow/sample-front.jpg",
        dropboxPath: `/SPB Textile/CatalogFlow/${sampleProduct.sku}/${sampleProduct.sku}-front.jpg`,
        dropboxLink: `https://dropbox.example.com/spbtextile/${encodeURIComponent(sampleProduct.sku)}/${encodeURIComponent(
          `${sampleProduct.sku}-front.jpg`,
        )}?dl=0`,
        processedUrl: "https://example.com/catalogflow/sample-front-processed.jpg",
        status: "processed",
        auditScore: 94,
        notes: "Seed image record for workflow testing.",
      },
    });
  }

  await prisma.agentMemory.upsert({
    where: {
      scopeType_scopeKey_title: {
        scopeType: "brand",
        scopeKey: "SPB",
        title: "Default tone",
      },
    },
    update: {
      value: { notes: "Use clear marketplace-safe copy, simple benefits, and avoid unsupported medical or performance claims." },
      createdById: superAdmin.id,
    },
    create: {
      scopeType: "brand",
      scopeKey: "SPB",
      title: "Default tone",
      value: { notes: "Use clear marketplace-safe copy, simple benefits, and avoid unsupported medical or performance claims." },
      createdById: superAdmin.id,
    },
  });

  await Promise.all(
    INTEGRATION_BLUEPRINTS.map((integration) =>
      prisma.integrationConnection.upsert({
        where: { provider: integration.provider },
        update: {
          displayName: integration.displayName,
          description: integration.description,
          baseUrl: integration.baseUrl,
          publicConfig: integration.publicConfig,
          secretEnvKeys: integration.secretEnvKeys,
          missingEnvKeys: integration.secretEnvKeys.filter((key) => !process.env[key]),
          sortOrder: integration.sortOrder,
        },
        create: {
          provider: integration.provider,
          displayName: integration.displayName,
          description: integration.description,
          baseUrl: integration.baseUrl,
          publicConfig: integration.publicConfig,
          secretEnvKeys: integration.secretEnvKeys,
          missingEnvKeys: integration.secretEnvKeys.filter((key) => !process.env[key]),
          sortOrder: integration.sortOrder,
        },
      }),
    ),
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
