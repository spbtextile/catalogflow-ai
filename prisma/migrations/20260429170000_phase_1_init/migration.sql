-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'admin', 'staff', 'viewer');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('owner', 'manager', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "Marketplace" AS ENUM ('Amazon', 'Flipkart', 'Myntra', 'Meesho', 'Shopify', 'JioMart');

-- CreateEnum
CREATE TYPE "ImageStyle" AS ENUM ('white_bg', 'lifestyle', 'studio');

-- CreateEnum
CREATE TYPE "ListingStyle" AS ENUM ('short', 'detailed', 'premium');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'staff',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "marketplace" "Marketplace" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSellerAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sellerAccountId" TEXT NOT NULL,
    "permissionLevel" "PermissionLevel" NOT NULL DEFAULT 'viewer',
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSellerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryProfile" (
    "id" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "requiresPrint" BOOLEAN NOT NULL DEFAULT false,
    "imageStyle" "ImageStyle" NOT NULL DEFAULT 'white_bg',
    "skuRules" JSONB NOT NULL,
    "listingStyle" "ListingStyle" NOT NULL DEFAULT 'detailed',
    "enabledAgents" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SellerAccount_accountCode_key" ON "SellerAccount"("accountCode");

-- CreateIndex
CREATE INDEX "UserSellerAccount_sellerAccountId_idx" ON "UserSellerAccount"("sellerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSellerAccount_userId_sellerAccountId_key" ON "UserSellerAccount"("userId", "sellerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryProfile_categoryName_key" ON "CategoryProfile"("categoryName");

-- AddForeignKey
ALTER TABLE "UserSellerAccount" ADD CONSTRAINT "UserSellerAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSellerAccount" ADD CONSTRAINT "UserSellerAccount_sellerAccountId_fkey" FOREIGN KEY ("sellerAccountId") REFERENCES "SellerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSellerAccount" ADD CONSTRAINT "UserSellerAccount_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

