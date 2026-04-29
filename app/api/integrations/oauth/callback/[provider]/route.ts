import type { IntegrationProvider } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { INTEGRATION_PROVIDER_VALUES } from "@/lib/integrations/definitions";
import { prisma } from "@/lib/prisma";
import { canManageWorkspace } from "@/lib/rbac";
import { getSession } from "@/lib/session";

function settingsRedirect(request: NextRequest, provider: string, result: string) {
  const url = new URL("/dashboard/settings", request.url);
  url.searchParams.set("provider", provider);
  url.searchParams.set("connect", result);
  return NextResponse.redirect(url);
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
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const authorizationCode = url.searchParams.get("code") ?? url.searchParams.get("spapi_oauth_code");

  if (error) {
    await prisma.integrationConnection.update({
      where: { provider },
      data: {
        status: "error",
        lastTestStatus: `OAuth authorization failed: ${error}`,
        lastTestedAt: new Date(),
      },
    });
    return settingsRedirect(request, provider, "error");
  }

  if (!authorizationCode) {
    await prisma.integrationConnection.update({
      where: { provider },
      data: {
        status: "needs_config",
        lastTestStatus: "OAuth callback returned without an authorization code.",
        lastTestedAt: new Date(),
      },
    });
    return settingsRedirect(request, provider, "missing-code");
  }

  await prisma.integrationConnection.update({
    where: { provider },
    data: {
      status: "needs_config",
      lastTestStatus: "OAuth authorization code received. Provider-specific token exchange and secure token storage are the next live-connection step.",
      lastTestedAt: new Date(),
    },
  });

  return settingsRedirect(request, provider, "code-received");
}
