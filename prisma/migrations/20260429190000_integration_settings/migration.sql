-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('supabase', 'dropbox', 'photoroom', 'remove_bg', 'shopify', 'amazon_sp_api', 'flipkart_seller', 'meesho', 'jiomart', 'upstash_redis', 'openai', 'vercel');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('not_configured', 'needs_config', 'connected', 'error');

-- CreateTable
CREATE TABLE "IntegrationConnection" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'not_configured',
    "baseUrl" TEXT,
    "publicConfig" JSONB,
    "secretEnvKeys" TEXT[],
    "missingEnvKeys" TEXT[],
    "lastTestStatus" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationConnection_provider_key" ON "IntegrationConnection"("provider");

-- CreateIndex
CREATE INDEX "IntegrationConnection_status_idx" ON "IntegrationConnection"("status");

-- CreateIndex
CREATE INDEX "IntegrationConnection_isEnabled_idx" ON "IntegrationConnection"("isEnabled");

