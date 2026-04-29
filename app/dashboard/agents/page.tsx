import { runMasterAgentAction, syncAgentsAction } from "@/app/dashboard/catalog-actions";
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
} from "@/components/dashboard/ui";
import { formatDate, titleCase } from "@/lib/format";
import { canEditCatalog, canManageWorkspace } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function AgentsPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);
  const canEdit = canEditCatalog(user.role);
  const sellerAccountIds = user.assignedSellerAccounts.map((assignment) => assignment.sellerAccountId);

  const [agents, products, runs] = await Promise.all([
    prisma.agentDefinition.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.product.findMany({
      where: canManage ? undefined : { sellerAccountId: { in: sellerAccountIds } },
      include: { categoryProfile: true },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
    prisma.agentRun.findMany({
      include: {
        agentDefinition: true,
        product: true,
        bulkJob: true,
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Agents"
        description="SPB Manager Agent controls the pipeline and assigns 19 specialist agents for SKU, listings, images, print, bulk jobs, memory, export, and marketplace push."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.36fr)_minmax(0,1fr)]">
        {canEdit ? (
          <div className="space-y-5">
            <DataPanel>
              <h2 className="text-lg font-semibold text-ink">Master agent control</h2>
              <form action={runMasterAgentAction} className="mt-5 space-y-4">
                <Field label="Product">
                  <select className={selectClass} name="productId">
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} - {product.brand} {product.categoryProfile.categoryName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Objective">
                  <input className={inputClass} defaultValue="Complete full CatalogFlow pipeline" name="objective" />
                </Field>
                <button className={buttonClass} type="submit">
                  Run SPB Manager Agent
                </button>
              </form>
            </DataPanel>

            <DataPanel>
              <h2 className="text-lg font-semibold text-ink">Agent registry</h2>
              <form action={syncAgentsAction} className="mt-4">
                <button className={secondaryButtonClass} type="submit">
                  Sync 20 agents
                </button>
              </form>
            </DataPanel>
          </div>
        ) : null}

        <div className="space-y-5">
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Agent team</h2>
            {agents.length ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {agents.map((agent) => (
                  <article className="rounded-lg border border-line p-4" key={agent.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{agent.name}</p>
                        <p className="mt-1 text-sm leading-6 text-muted">{agent.description}</p>
                      </div>
                      {agent.isMaster ? <StatusBadge label="Master" /> : <StatusBadge label={`Phase ${agent.phase}`} />}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {agent.capabilities.slice(0, 3).map((capability) => (
                        <span className="rounded-md bg-paper px-2 py-1 text-xs text-muted" key={capability}>
                          {titleCase(capability)}
                        </span>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState message="Agents are not synced yet. Use Sync 20 agents." />
            )}
          </DataPanel>

          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Recent runs</h2>
            {runs.length ? (
              <div className="mt-4 space-y-3">
                {runs.map((run) => (
                  <div className="rounded-md border border-line p-3" key={run.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-ink">{run.agentDefinition.name}</p>
                        <p className="mt-1 text-sm text-muted">{run.objective}</p>
                        <p className="mt-1 text-xs text-muted">{formatDate(run.createdAt)}</p>
                      </div>
                      <StatusBadge label={titleCase(run.status)} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No agent runs yet." />
            )}
          </DataPanel>
        </div>
      </div>
    </div>
  );
}

