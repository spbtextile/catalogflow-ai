"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { canManageWorkspace } from "@/lib/rbac";
import { requireSession } from "@/lib/session";

const userRoleSchema = z.enum(["super_admin", "admin", "staff", "viewer"]);
const marketplaceSchema = z.enum(["Amazon", "Flipkart", "Myntra", "Meesho", "Shopify", "JioMart"]);
const permissionSchema = z.enum(["owner", "manager", "editor", "viewer"]);
const imageStyleSchema = z.enum(["white_bg", "lifestyle", "studio"]);
const listingStyleSchema = z.enum(["short", "detailed", "premium"]);

async function requireManager() {
  const session = await requireSession();

  if (!canManageWorkspace(session.role)) {
    throw new Error("You do not have permission to manage this workspace.");
  }

  return session;
}

function readRequired(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

export async function saveUser(formData: FormData) {
  await requireManager();

  const parsed = z
    .object({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      role: userRoleSchema,
    })
    .parse({
      name: readRequired(formData, "name"),
      email: readRequired(formData, "email").toLowerCase(),
      password: readRequired(formData, "password"),
      role: readRequired(formData, "role"),
    });

  const passwordHash = await bcrypt.hash(parsed.password, 12);

  await prisma.user.upsert({
    where: { email: parsed.email },
    update: {
      name: parsed.name,
      role: parsed.role,
      passwordHash,
      isActive: true,
    },
    create: {
      name: parsed.name,
      email: parsed.email,
      role: parsed.role,
      passwordHash,
    },
  });

  revalidatePath("/dashboard");
}

export async function saveSellerAccount(formData: FormData) {
  await requireManager();

  const parsed = z
    .object({
      name: z.string().min(2),
      accountCode: z.string().min(2),
      marketplace: marketplaceSchema,
    })
    .parse({
      name: readRequired(formData, "name"),
      accountCode: readRequired(formData, "accountCode").toUpperCase(),
      marketplace: readRequired(formData, "marketplace"),
    });

  await prisma.sellerAccount.upsert({
    where: { accountCode: parsed.accountCode },
    update: {
      name: parsed.name,
      marketplace: parsed.marketplace,
      isActive: true,
    },
    create: {
      name: parsed.name,
      accountCode: parsed.accountCode,
      marketplace: parsed.marketplace,
    },
  });

  revalidatePath("/dashboard");
}

export async function saveAssignment(formData: FormData) {
  const session = await requireManager();

  const parsed = z
    .object({
      userId: z.string().min(1),
      sellerAccountId: z.string().min(1),
      permissionLevel: permissionSchema,
    })
    .parse({
      userId: readRequired(formData, "userId"),
      sellerAccountId: readRequired(formData, "sellerAccountId"),
      permissionLevel: readRequired(formData, "permissionLevel"),
    });

  await prisma.userSellerAccount.upsert({
    where: {
      userId_sellerAccountId: {
        userId: parsed.userId,
        sellerAccountId: parsed.sellerAccountId,
      },
    },
    update: {
      permissionLevel: parsed.permissionLevel,
      assignedById: session.userId,
    },
    create: {
      userId: parsed.userId,
      sellerAccountId: parsed.sellerAccountId,
      permissionLevel: parsed.permissionLevel,
      assignedById: session.userId,
    },
  });

  revalidatePath("/dashboard");
}

export async function saveCategoryProfile(formData: FormData) {
  await requireManager();

  const agents = formData
    .getAll("enabledAgents")
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  const parsed = z
    .object({
      categoryName: z.string().min(2),
      requiresPrint: z.boolean(),
      imageStyle: imageStyleSchema,
      skuPrefix: z.string().min(2).max(12),
      numberingFormat: z.string().min(2).max(12),
      listingStyle: listingStyleSchema,
      enabledAgents: z.array(z.string()).min(1),
    })
    .parse({
      categoryName: readRequired(formData, "categoryName"),
      requiresPrint: formData.get("requiresPrint") === "on",
      imageStyle: readRequired(formData, "imageStyle"),
      skuPrefix: readRequired(formData, "skuPrefix").toUpperCase(),
      numberingFormat: readRequired(formData, "numberingFormat"),
      listingStyle: readRequired(formData, "listingStyle"),
      enabledAgents: agents,
    });

  await prisma.categoryProfile.upsert({
    where: { categoryName: parsed.categoryName },
    update: {
      requiresPrint: parsed.requiresPrint,
      imageStyle: parsed.imageStyle,
      skuRules: {
        prefix: parsed.skuPrefix,
        numberingFormat: parsed.numberingFormat,
        example: `${parsed.skuPrefix}-BRAND-COLOR-SIZE-${parsed.numberingFormat.replaceAll("0", "1")}`,
      },
      listingStyle: parsed.listingStyle,
      enabledAgents: parsed.enabledAgents,
      isActive: true,
    },
    create: {
      categoryName: parsed.categoryName,
      requiresPrint: parsed.requiresPrint,
      imageStyle: parsed.imageStyle,
      skuRules: {
        prefix: parsed.skuPrefix,
        numberingFormat: parsed.numberingFormat,
        example: `${parsed.skuPrefix}-BRAND-COLOR-SIZE-${parsed.numberingFormat.replaceAll("0", "1")}`,
      },
      listingStyle: parsed.listingStyle,
      enabledAgents: parsed.enabledAgents,
    },
  });

  revalidatePath("/dashboard");
}

