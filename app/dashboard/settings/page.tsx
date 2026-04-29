import { Image as ImageIcon, KeyRound, PlugZap, ShieldCheck, Store } from "lucide-react";

import {
  saveIntegrationConnectionAction,
  syncDefaultIntegrationConnectionsAction,
  testIntegrationConnectionAction,
} from "@/app/dashboard/settings/actions";
import {
  DataPanel,
  EmptyState,
  Field,
  SectionHeader,
  StatusBadge,
  buttonClass,
  inputClass,
  secondaryButtonClass,
  selectClass,
  textareaClass,
} from "@/components/dashboard/ui";
import { formatDate, titleCase } from "@/lib/format";
import { canManageWorkspace } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function formatJson(value: unknown) {
  if (!value) {
    return "{}";
  }

  return JSON.stringify(value, null, 2);
}

function configRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, string>;
}

function configValue(config: Record<string, string>, key: string, fallback = "") {
  const value = config[key];
  return typeof value === "string" ? value : fallback;
}

function statusTone(status: string) {
  if (status === "connected") {
    return "text-moss";
  }

  if (status === "error" || status === "needs_config") {
    return "text-amber";
  }

  return "text-muted";
}

function authMethodLabel(value: string) {
  const labels: Record<string, string> = {
    api_key: "API key",
    api_token: "API token",
    oauth2: "OAuth 2.0",
    oauth2_or_token: "OAuth 2.0 / API token",
    service_role: "Service role",
  };

  return labels[value] ?? titleCase(value);
}

function connectionMessage(result?: string, provider?: string) {
  if (!result) {
    return null;
  }

  const label = provider ? titleCase(provider.replaceAll("_", " ")) : "Provider";
  const messages: Record<string, string> = {
    "missing-env": `${label} OAuth is ready, but required environment variables are missing. Check the provider card below.`,
    "oauth-disabled": `${label} is not set to OAuth 2.0 yet. Select an OAuth auth method and save the connection.`,
    "missing-placeholders": `${label} OAuth URL still has placeholders. Fill shop/account values before connecting.`,
    "code-received": `${label} returned an OAuth authorization code. Token exchange and secure token storage are the next live step.`,
    error: `${label} OAuth authorization failed. Check the provider card below.`,
    forbidden: "Only admins can connect providers.",
  };

  return messages[result] ?? `${label} connection flow returned: ${result}.`;
}

export default async function SettingsPage({ searchParams }: { searchParams?: Promise<{ connect?: string; provider?: string }> }) {
  const params = searchParams ? await searchParams : undefined;
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);
  const connections = await prisma.integrationConnection.findMany({
    orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
  });
  const aiImageConnections = connections.filter((connection) => {
    const config = configRecord(connection.publicConfig);
    return connection.provider === "openai" || config.connectionCategory === "ai_image_generation";
  });
  const marketplaceConnections = connections.filter((connection) => configRecord(connection.publicConfig).connectionCategory === "marketplace");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Settings"
        description="Configure API connection options for database, image processing, storage, AI, queues, deployment, and marketplace push providers."
        action={
          canManage ? (
            <form action={syncDefaultIntegrationConnectionsAction}>
              <button className={buttonClass} type="submit">
                Sync all options
              </button>
            </form>
          ) : null
        }
      />

      {connectionMessage(params?.connect, params?.provider) ? (
        <DataPanel>
          <p className="text-sm font-medium text-ink">{connectionMessage(params?.connect, params?.provider)}</p>
        </DataPanel>
      ) : null}

      <DataPanel>
        <div className="flex items-start gap-3">
          <ShieldCheck aria-hidden className="mt-1 h-5 w-5 text-moss" />
          <div>
            <h2 className="text-lg font-semibold text-ink">Credential handling</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Raw API keys are not stored here. Add secrets to `.env` or your hosting provider, then list the environment variable
              names below. The test action checks whether those variables are present at runtime.
            </p>
          </div>
        </div>
      </DataPanel>

      <div className="grid gap-5 lg:grid-cols-2">
        <DataPanel>
          <div className="flex items-start gap-3">
            <ImageIcon aria-hidden className="mt-1 h-5 w-5 text-moss" />
            <div>
              <h2 className="text-lg font-semibold text-ink">AI image generation</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Configure ChatGPT/OpenAI and Photoroom image generation for product visuals, prompt drafts, print concepts, and future image-edit agents.
              </p>
              <p className="mt-3 text-sm font-medium text-ink">{aiImageConnections.length} AI image provider options ready.</p>
            </div>
          </div>
        </DataPanel>

        <DataPanel>
          <div className="flex items-start gap-3">
            <Store aria-hidden className="mt-1 h-5 w-5 text-moss" />
            <div>
              <h2 className="text-lg font-semibold text-ink">Marketplace OAuth connections</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Configure OAuth, seller app credentials, access tokens, scopes, and callback URLs for Shopify, Amazon, Flipkart, Meesho, and JioMart.
              </p>
              <p className="mt-3 text-sm font-medium text-ink">{marketplaceConnections.length} marketplace provider options ready.</p>
            </div>
          </div>
        </DataPanel>
      </div>

      {connections.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {connections.map((connection) => {
            const config = configRecord(connection.publicConfig);
            const authMethod = configValue(config, "authMethod", "api_key");
            const category = configValue(config, "connectionCategory", "operations");
            const isOpenAiImage = connection.provider === "openai" || category === "ai_image_generation";
            const isPhotoroom = connection.provider === "photoroom";
            const connectHref =
              connection.provider === "openai"
                ? "https://platform.openai.com/api-keys"
                : isPhotoroom
                  ? "https://app.photoroom.com"
                : `/api/integrations/oauth/start/${connection.provider}`;
            const connectLabel = connection.provider === "openai" ? "Open OpenAI API keys" : isPhotoroom ? "Open Photoroom" : "Connect";

            return (
              <DataPanel key={connection.id}>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-paper">
                      <PlugZap aria-hidden className={`h-5 w-5 ${statusTone(connection.status)}`} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-ink">{connection.displayName}</h2>
                        <StatusBadge label={authMethodLabel(authMethod)} />
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted">{connection.description}</p>
                    </div>
                  </div>
                  <StatusBadge label={titleCase(connection.status)} />
                </div>

                <div className="mb-4 flex flex-wrap gap-3">
                  <a
                    className={buttonClass}
                    href={connectHref}
                    rel={connection.provider === "openai" || isPhotoroom ? "noreferrer" : undefined}
                    target={connection.provider === "openai" || isPhotoroom ? "_blank" : undefined}
                  >
                    {connectLabel}
                  </a>
                  <span className="inline-flex h-10 items-center rounded-md border border-line bg-paper px-3 text-xs font-medium text-muted">
                    {category === "marketplace" ? "Marketplace account connection" : authMethodLabel(authMethod)}
                  </span>
                </div>

                {canManage ? (
                  <form action={saveIntegrationConnectionAction} className="space-y-4">
                    <input name="provider" type="hidden" value={connection.provider} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Display name">
                        <input className={inputClass} name="displayName" defaultValue={connection.displayName} required />
                      </Field>
                      <Field label="Base URL">
                        <input className={inputClass} name="baseUrl" defaultValue={connection.baseUrl ?? ""} placeholder="https://api.example.com" />
                      </Field>
                    </div>

                    <Field label="Description">
                      <textarea className={textareaClass} name="description" defaultValue={connection.description} required />
                    </Field>

                    <div className="rounded-md border border-line bg-paper p-4">
                      <div className="flex items-start gap-3">
                        <KeyRound aria-hidden className="mt-1 h-4 w-4 text-moss" />
                        <div>
                          <h3 className="text-sm font-semibold text-ink">Connection auth</h3>
                          <p className="mt-1 text-sm leading-6 text-muted">
                            Select how this provider connects, then map OAuth or token values to environment variable names.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Field label="Connection category">
                          <select className={selectClass} defaultValue={category} name="connectionCategory">
                            <option value="ai_image_generation">AI image generation</option>
                            <option value="marketplace">Marketplace</option>
                            <option value="storage">Storage</option>
                            <option value="database">Database</option>
                            <option value="queue">Queue</option>
                            <option value="deployment">Deployment</option>
                            <option value="operations">Operations</option>
                          </select>
                        </Field>
                        <Field label="Authentication method">
                          <select className={selectClass} defaultValue={authMethod} name="authMethod">
                            <option value="api_key">API key</option>
                            <option value="api_token">API token</option>
                            <option value="oauth2">OAuth 2.0</option>
                            <option value="oauth2_or_token">OAuth 2.0 / API token</option>
                            <option value="service_role">Service role</option>
                          </select>
                        </Field>
                        <Field label="API key env key">
                          <input className={inputClass} defaultValue={configValue(config, "apiKeyEnvKey")} name="apiKeyEnvKey" placeholder="OPENAI_API_KEY" />
                        </Field>
                        <Field label="Project / account env key">
                          <input className={inputClass} defaultValue={configValue(config, "projectEnvKey")} name="projectEnvKey" placeholder="OPENAI_PROJECT_ID" />
                        </Field>
                      </div>
                    </div>

                    {isOpenAiImage ? (
                      <div className="rounded-md border border-line bg-paper p-4">
                        <h3 className="text-sm font-semibold text-ink">ChatGPT image generation</h3>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Field label="Image model">
                          <input className={inputClass} defaultValue={configValue(config, "imageModel", "gpt-image-1.5")} name="imageModel" />
                        </Field>
                        <Field label="Image endpoint">
                          <input className={inputClass} defaultValue={configValue(config, "imageEndpoint", "/v1/images/generations")} name="imageEndpoint" />
                        </Field>
                      </div>
                      {connection.provider === "openai" ? (
                        <a className={`${secondaryButtonClass} mt-4`} href="/api/integrations/openai-image-test" target="_blank">
                          Test OpenAI image generation
                        </a>
                      ) : null}
                      {isPhotoroom ? (
                        <a className={`${secondaryButtonClass} mt-4 sm:ml-3`} href="/api/integrations/photoroom-image-test" target="_blank">
                          Test Photoroom image generation
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                    <div className="rounded-md border border-line bg-paper p-4">
                      <h3 className="text-sm font-semibold text-ink">OAuth connection option</h3>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Field label="Authorization URL">
                          <input
                            className={inputClass}
                            defaultValue={configValue(config, "oauthAuthorizationUrl")}
                            name="oauthAuthorizationUrl"
                            placeholder="https://provider.com/oauth/authorize"
                          />
                        </Field>
                        <Field label="Token URL">
                          <input
                            className={inputClass}
                            defaultValue={configValue(config, "oauthTokenUrl")}
                            name="oauthTokenUrl"
                            placeholder="https://provider.com/oauth/token"
                          />
                        </Field>
                        <Field label="Client ID env key">
                          <input className={inputClass} defaultValue={configValue(config, "oauthClientIdEnvKey")} name="oauthClientIdEnvKey" />
                        </Field>
                        <Field label="Application ID env key">
                          <input className={inputClass} defaultValue={configValue(config, "oauthApplicationIdEnvKey")} name="oauthApplicationIdEnvKey" />
                        </Field>
                        <Field label="Client secret env key">
                          <input className={inputClass} defaultValue={configValue(config, "oauthClientSecretEnvKey")} name="oauthClientSecretEnvKey" />
                        </Field>
                        <Field label="Redirect URI env key">
                          <input className={inputClass} defaultValue={configValue(config, "oauthRedirectUriEnvKey")} name="oauthRedirectUriEnvKey" />
                        </Field>
                        <Field label="Access token env key">
                          <input className={inputClass} defaultValue={configValue(config, "oauthAccessTokenEnvKey")} name="oauthAccessTokenEnvKey" />
                        </Field>
                        <Field label="Refresh token env key">
                          <input className={inputClass} defaultValue={configValue(config, "oauthRefreshTokenEnvKey")} name="oauthRefreshTokenEnvKey" />
                        </Field>
                        <Field label="Scopes">
                          <input className={inputClass} defaultValue={configValue(config, "oauthScopes")} name="oauthScopes" />
                        </Field>
                      </div>

                      <a className={`${secondaryButtonClass} mt-4`} href={`/api/integrations/oauth/start/${connection.provider}`}>
                        Start OAuth connection
                      </a>
                    </div>

                    <Field label="Required environment variables">
                      <textarea className={textareaClass} name="secretEnvKeys" defaultValue={connection.secretEnvKeys.join("\n")} required />
                    </Field>

                    <Field label="Advanced public config JSON">
                      <textarea className={textareaClass} name="publicConfig" defaultValue={formatJson(connection.publicConfig)} />
                    </Field>

                    <Field label="Notes">
                      <textarea className={textareaClass} name="notes" defaultValue={connection.notes ?? ""} placeholder="Internal setup notes or account IDs." />
                    </Field>

                    <label className="flex items-center gap-3 rounded-md border border-line bg-paper px-3 py-3 text-sm font-medium text-ink">
                      <input className="h-4 w-4 accent-moss" defaultChecked={connection.isEnabled} name="isEnabled" type="checkbox" />
                      Enable this integration
                    </label>

                    {connection.missingEnvKeys.length ? (
                      <div className="rounded-md border border-amber/30 bg-amber/10 px-3 py-2 text-sm text-ink">
                        Missing: {connection.missingEnvKeys.join(", ")}
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-3">
                      <button className={buttonClass} type="submit">
                        Save connection
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="rounded-md border border-line bg-paper p-3 text-sm text-muted">
                    Admin access is required to edit API connection settings.
                  </div>
                )}

                {canManage ? (
                  <form action={testIntegrationConnectionAction} className="mt-3">
                    <input name="provider" type="hidden" value={connection.provider} />
                    <button className={secondaryButtonClass} type="submit">
                      Test environment
                    </button>
                  </form>
                ) : null}

                <div className="mt-4 border-t border-line pt-4 text-xs text-muted">
                  <p>{connection.lastTestStatus ?? "Not tested yet."}</p>
                  <p className="mt-1">Last tested: {connection.lastTestedAt ? formatDate(connection.lastTestedAt) : "-"}</p>
                </div>
              </DataPanel>
            );
          })}
        </div>
      ) : (
        <DataPanel>
          <EmptyState message="No API connection options yet. Use Sync all options to create the default provider list." />
        </DataPanel>
      )}
    </div>
  );
}
