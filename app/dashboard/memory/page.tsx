import { saveMemoryAction } from "@/app/dashboard/catalog-actions";
import {
  DataPanel,
  EmptyState,
  Field,
  SectionHeader,
  buttonClass,
  inputClass,
  textareaClass,
} from "@/components/dashboard/ui";
import { formatDate } from "@/lib/format";
import { canEditCatalog } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function MemoryPage() {
  const user = await getCurrentUser();
  const canEdit = canEditCatalog(user.role);
  const memories = await prisma.agentMemory.findMany({
    include: { createdBy: true },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Memory"
        description="Store brand, category, marketplace, and workflow preferences so the agent system can reuse SPB Textile decisions."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.34fr)_minmax(0,1fr)]">
        {canEdit ? (
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Add memory</h2>
            <form action={saveMemoryAction} className="mt-5 space-y-4">
              <Field label="Scope type">
                <input className={inputClass} name="scopeType" placeholder="brand, category, marketplace" required />
              </Field>
              <Field label="Scope key">
                <input className={inputClass} name="scopeKey" placeholder="Kids T-shirt" required />
              </Field>
              <Field label="Title">
                <input className={inputClass} name="title" placeholder="Tone preference" required />
              </Field>
              <Field label="Notes">
                <textarea className={textareaClass} name="notes" placeholder="Use simple parent-friendly copy and avoid overclaiming fabric benefits." required />
              </Field>
              <button className={buttonClass} type="submit">
                Save memory
              </button>
            </form>
          </DataPanel>
        ) : null}

        <DataPanel>
          <h2 className="text-lg font-semibold text-ink">Saved memories</h2>
          {memories.length ? (
            <div className="mt-4 space-y-3">
              {memories.map((memory) => {
                const value = memory.value && typeof memory.value === "object" && !Array.isArray(memory.value) ? (memory.value as Record<string, unknown>) : {};
                return (
                  <article className="rounded-lg border border-line p-4" key={memory.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-moss">
                          {memory.scopeType} / {memory.scopeKey}
                        </p>
                        <h3 className="mt-1 font-semibold text-ink">{memory.title}</h3>
                      </div>
                      <p className="text-xs text-muted">{formatDate(memory.updatedAt)}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted">{String(value.notes ?? JSON.stringify(value))}</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No memory records yet." />
          )}
        </DataPanel>
      </div>
    </div>
  );
}

