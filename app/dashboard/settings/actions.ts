"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { INTEGRATION_BLUEPRINTS, INTEGRATION_PROVIDER_VALUES } from "@/lib/integrations/definitions";
import { evaluateIntegrationStatus } from "@/lib/integrations/status";
import { prisma } from "@/lib/prisma";
import { canManageWorkspace } from "@/lib/rbac";
import { requireSession } from "@/lib/session";

const providerSchema = z.enum(INTEGRATION_PROVIDER_VALUES);

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

async function requireSettingsManager() {
  const session = await requireSession();

  if (!canManageWorkspace(session.role)) {
    throw new Error("Only admins can manage API connection settings.");
  }

  return session;
}

function parseEnvKeys(value?: string) {
  return (
    value
      ?.split(/[,\n]/)
      .map((key) => key.trim())
      .filter(Boolean) ?? []
  );
}

function parseJsonConfig(value?: string): Prisma.InputJsonValue | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = JSON.parse(value) as unknown;

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Public config must be a JSON object.");
  }

  return parsed as Prisma.InputJsonValue;
}

function mergeAuthConfig(publicConfig: Prisma.InputJsonValue | undefined, formData: FormData) {
  const base =
    publicConfig && typeof publicConfig === "object" && !Array.isArray(publicConfig)
      ? { ...(publicConfig as Record<string, Prisma.InputJsonValue>) }
      : {};
  const fields = [
    "connectionCategory",
    "authMethod",
    "apiKeyEnvKey",
    "projectEnvKey",
    "imageModel",
    "imageEndpoint",
    "oauthAuthorizationUrl",
    "oauthTokenUrl",
    "oauthScopes",
    "oauthApplicationIdEnvKey",
    "oauthClientIdEnvKey",
    "oauthClientSecretEnvKey",
    "oauthRedirectUriEnvKey",
    "oauthAccessTokenEnvKey",
    "oauthRefreshTokenEnvKey",
  ];

  fields.forEach((field) => {
    const value = readOptional(formData, field);

    if (value) {
      base[field] = value;
    } else {
      delete base[field];
    }
  });

  return base as Prisma.InputJsonValue;
}

function authEnvKeys(formData: FormData) {
  return [
    "apiKeyEnvKey",
    "projectEnvKey",
    "oauthClientIdEnvKey",
    "oauthApplicationIdEnvKey",
    "oauthClientSecretEnvKey",
    "oauthRedirectUriEnvKey",
    "oauthAccessTokenEnvKey",
    "oauthRefreshTokenEnvKey",
  ]
    .map((field) => readOptional(formData, field))
    .filter((value): value is string => Boolean(value));
}

function uniqueEnvKeys(keys: string[]) {
  return Array.from(new Set(keys));
}

export async function syncDefaultIntegrationConnectionsAction() {
  await requireSettingsManager();

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
          missingEnvKeys: integration.secretEnvKeys,
          sortOrder: integration.sortOrder,
        },
      }),
    ),
  );

  revalidatePath("/dashboard/settings");
}

export async function saveIntegrationConnectionAction(formData: FormData) {
  await requireSettingsManager();

  const provider = providerSchema.parse(readRequired(formData, "provider"));
  const secretEnvKeys = uniqueEnvKeys([...parseEnvKeys(readRequired(formData, "secretEnvKeys")), ...authEnvKeys(formData)]);
  const isEnabled = formData.get("isEnabled") === "on";
  const evaluation = evaluateIntegrationStatus(isEnabled, secretEnvKeys);
  const publicConfig = mergeAuthConfig(parseJsonConfig(readOptional(formData, "publicConfig")), formData);

  await prisma.integrationConnection.upsert({
    where: { provider },
    update: {
      displayName: readRequired(formData, "displayName"),
      description: readRequired(formData, "description"),
      isEnabled,
      status: evaluation.status,
      baseUrl: readOptional(formData, "baseUrl"),
      publicConfig,
      secretEnvKeys,
      missingEnvKeys: evaluation.missingEnvKeys,
      lastTestStatus: evaluation.message,
      lastTestedAt: new Date(),
      notes: readOptional(formData, "notes"),
    },
    create: {
      provider,
      displayName: readRequired(formData, "displayName"),
      description: readRequired(formData, "description"),
      isEnabled,
      status: evaluation.status,
      baseUrl: readOptional(formData, "baseUrl"),
      publicConfig,
      secretEnvKeys,
      missingEnvKeys: evaluation.missingEnvKeys,
      lastTestStatus: evaluation.message,
      lastTestedAt: new Date(),
      notes: readOptional(formData, "notes"),
    },
  });

  revalidatePath("/dashboard/settings");
}

export async function testIntegrationConnectionAction(formData: FormData) {
  await requireSettingsManager();

  const provider = providerSchema.parse(readRequired(formData, "provider"));
  const connection = await prisma.integrationConnection.findUniqueOrThrow({
    where: { provider },
  });
  const evaluation = evaluateIntegrationStatus(connection.isEnabled, connection.secretEnvKeys);

  await prisma.integrationConnection.update({
    where: { provider },
    data: {
      status: evaluation.status,
      missingEnvKeys: evaluation.missingEnvKeys,
      lastTestStatus: evaluation.message,
      lastTestedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/settings");
}
