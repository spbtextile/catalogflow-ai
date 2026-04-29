import { PrismaClient, UserRole, Marketplace, PermissionLevel, ImageStyle, ListingStyle } from "@prisma/client";
import bcrypt from "bcryptjs";

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

  await prisma.categoryProfile.upsert({
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

