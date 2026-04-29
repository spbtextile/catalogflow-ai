import type { IntegrationStatus } from "@prisma/client";

export function evaluateIntegrationStatus(isEnabled: boolean, secretEnvKeys: string[]) {
  const missingEnvKeys = secretEnvKeys.filter((key) => !process.env[key]);
  const status: IntegrationStatus = !isEnabled ? "not_configured" : missingEnvKeys.length ? "needs_config" : "connected";
  const message =
    status === "connected"
      ? "All required environment variables are present."
      : status === "needs_config"
        ? `Missing environment variables: ${missingEnvKeys.join(", ")}`
        : "Connection is disabled.";

  return { status, missingEnvKeys, message };
}

