import { PlugZap, ShieldCheck } from "lucide-react";

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

function statusTone(status: string) {
  if (status === "connected") {
    return "text-moss";
  }

  if (status === "error" || status === "needs_config") {
    return "text-amber";
  }

  return "text-muted";
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);
  const connections = await prisma.integrationConnection.findMany({
    orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
  });

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

      {connections.length ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {connections.map((connection) => (
            <DataPanel key={connection.id}>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-paper">
                    <PlugZap aria-hidden className={`h-5 w-5 ${statusTone(connection.status)}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-ink">{connection.displayName}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted">{connection.description}</p>
                  </div>
                </div>
                <StatusBadge label={titleCase(connection.status)} />
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

                  <Field label="Required environment variables">
                    <textarea className={textareaClass} name="secretEnvKeys" defaultValue={connection.secretEnvKeys.join("\n")} required />
                  </Field>

                  <Field label="Public config JSON">
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
          ))}
        </div>
      ) : (
        <DataPanel>
          <EmptyState message="No API connection options yet. Use Sync all options to create the default provider list." />
        </DataPanel>
      )}
    </div>
  );
}

