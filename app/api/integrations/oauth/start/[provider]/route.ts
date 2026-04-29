import type { IntegrationProvider, IntegrationStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { INTEGRATION_PROVIDER_VALUES } from "@/lib/integrations/definitions";
import { prisma } from "@/lib/prisma";
import { canManageWorkspace } from "@/lib/rbac";
import { getSession } from "@/lib/session";

function configRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, string>;
}

function configValue(config: Record<string, string>, key: string) {
  const value = config[key];
  return typeof value === "string" ? value.trim() : "";
}

function envValue(key: string) {
  return key ? process.env[key]?.trim() ?? "" : "";
}

function settingsRedirect(request: NextRequest, provider: string, result: string) {
  const url = new URL("/dashboard/settings", request.url);
  url.searchParams.set("provider", provider);
  url.searchParams.set("connect", result);
  return NextResponse.redirect(url);
}

async function updateConnectionStatus(provider: IntegrationProvider, status: IntegrationStatus, message: string, missingEnvKeys: string[] = []) {
  await prisma.integrationConnection.update({
    where: { provider },
    data: {
      status,
      missingEnvKeys,
      lastTestStatus: message,
      lastTestedAt: new Date(),
    },
  });
}

function replaceProviderPlaceholders(value: string) {
  return value.replace("{store}", process.env.SHOPIFY_STORE_DOMAIN ?? "");
}

function stateValue(provider: string) {
  return Buffer.from(`${provider}:${Date.now()}`).toString("base64url");
}

export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!canManageWorkspace(session.role)) {
    return settingsRedirect(request, "unknown", "forbidden");
  }

  const { provider: providerParam } = await context.params;

  if (!INTEGRATION_PROVIDER_VALUES.includes(providerParam as (typeof INTEGRATION_PROVIDER_VALUES)[number])) {
    return settingsRedirect(request, providerParam, "invalid-provider");
  }

  const provider = providerParam as IntegrationProvider;

  if (provider === "openai") {
    return NextResponse.redirect("https://platform.openai.com/api-keys");
  }

  const connection = await prisma.integrationConnection.findUnique({
    where: { provider },
  });

  if (!connection) {
    return settingsRedirect(request, provider, "missing-connection");
  }

  const config = configRecord(connection.publicConfig);
  const authMethod = configValue(config, "authMethod");
  const authorizationUrl = replaceProviderPlaceholders(configValue(config, "oauthAuthorizationUrl"));

  if (!authMethod.includes("oauth") || !authorizationUrl) {
    await updateConnectionStatus(provider, "needs_config", "OAuth is not enabled for this provider. Select OAuth 2.0 in Settings first.");
    return settingsRedirect(request, provider, "oauth-disabled");
  }

  if (authorizationUrl.includes("{") || authorizationUrl.includes("}")) {
    await updateConnectionStatus(provider, "needs_config", "OAuth URL still has placeholders. Fill provider-specific values before connecting.");
    return settingsRedirect(request, provider, "missing-placeholders");
  }

  const redirectKey = configValue(config, "oauthRedirectUriEnvKey");
  const redirectUri = envValue(redirectKey) || new URL(`/api/integrations/oauth/callback/${provider}`, request.url).toString();
  const missingEnvKeys: string[] = [];
  const url = new URL(authorizationUrl);
  const scopes = configValue(config, "oauthScopes");

  if (provider === "amazon_sp_api") {
    const applicationIdKey = configValue(config, "oauthApplicationIdEnvKey");
    const applicationId = envValue(applicationIdKey);

    if (!applicationId) {
      missingEnvKeys.push(applicationIdKey || "AMAZON_SP_API_APPLICATION_ID");
    }

    url.searchParams.set("application_id", applicationId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", stateValue(provider));

    if (process.env.NODE_ENV !== "production") {
      url.searchParams.set("version", "beta");
    }
  } else {
    const clientIdKey = configValue(config, "oauthClientIdEnvKey");
    const clientId = envValue(clientIdKey);

    if (!clientId) {
      missingEnvKeys.push(clientIdKey || "OAuth client ID env key");
    }

    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", stateValue(provider));

    if (scopes) {
      url.searchParams.set("scope", scopes);
    }

    if (provider === "dropbox") {
      url.searchParams.set("token_access_type", "offline");
    }
  }

  if (missingEnvKeys.length) {
    await updateConnectionStatus(provider, "needs_config", `OAuth connect is ready, but these env vars are missing: ${missingEnvKeys.join(", ")}`, missingEnvKeys);
    return settingsRedirect(request, provider, "missing-env");
  }

  return NextResponse.redirect(url);
}
