"use server";

import type { Marketplace, UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createDesignStudioProduct, type DesignGenerationMode } from "@/lib/catalog/design-studio";
import { prisma } from "@/lib/prisma";
import { canEditCatalog, canManageWorkspace } from "@/lib/rbac";
import { requireSession } from "@/lib/session";

const marketplaceSchema = z.enum(["Amazon", "Flipkart", "Myntra", "Meesho", "Shopify", "JioMart"]);
const generationModeSchema = z.enum(["draft", "openai"]);

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

function readNumber(formData: FormData, key: string) {
  const value = Number(readRequired(formData, key));

  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a valid number.`);
  }

  return value;
}

function readMarketplaces(formData: FormData) {
  return formData
    .getAll("marketplaces")
    .filter((value): value is string => typeof value === "string")
    .map((value) => marketplaceSchema.parse(value)) as Marketplace[];
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

export async function generatePromptToMarketplaceAction(formData: FormData) {
  const session = await requireSession();

  if (!canEditCatalog(session.role)) {
    throw new Error("You do not have permission to generate catalog products.");
  }

  const sellerAccountId = readRequired(formData, "sellerAccountId");
  await assertSellerAccess(session.userId, session.role, sellerAccountId);

  const marketplaces = readMarketplaces(formData);
  const packOf = Math.max(1, Math.trunc(readNumber(formData, "packOf")));
  const basePrice = readNumber(formData, "basePrice");
  const mrp = readNumber(formData, "mrp");

  if (mrp < basePrice) {
    throw new Error("MRP cannot be lower than base price.");
  }

  const productId = await createDesignStudioProduct({
    sellerAccountId,
    categoryProfileId: readRequired(formData, "categoryProfileId"),
    brand: readRequired(formData, "brand"),
    garmentPrompt: readRequired(formData, "garmentPrompt"),
    sleeveStyle: readRequired(formData, "sleeveStyle"),
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
    packOf,
    basePrice,
    mrp,
    printPrompt: readRequired(formData, "printPrompt"),
    generationMode: generationModeSchema.parse(readRequired(formData, "generationMode")) as DesignGenerationMode,
    marketplaces,
    pushMarketplaces: formData.get("pushMarketplaces") === "on",
    createdById: session.userId,
  });

  redirect(`/dashboard/products/${productId}`);
}
