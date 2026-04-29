import { createBulkJobAction, processBulkJobAction } from "@/app/dashboard/catalog-actions";
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

const marketplaces = ["Amazon", "Flipkart", "Myntra", "Meesho", "Shopify", "JioMart"] as const;
const jobTypes = [
  ["full_pipeline", "Full pipeline"],
  ["listing_generation", "Listing generation"],
  ["image_processing", "Image processing"],
  ["excel_export", "Excel export"],
  ["marketplace_push", "Marketplace push"],
] as const;

export default async function BulkJobsPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);
  const canEdit = canEditCatalog(user.role);
  const sellerAccountIds = user.assignedSellerAccounts.map((assignment) => assignment.sellerAccountId);

  const [products, jobs] = await Promise.all([
    prisma.product.findMany({
      where: canManage ? undefined : { sellerAccountId: { in: sellerAccountIds } },
      include: { categoryProfile: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.bulkJob.findMany({
      include: {
        createdBy: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader title="Bulk jobs" description="Run multi-product queues for listing generation, image processing, Excel export prep, marketplace push, or the full agent pipeline." />

      <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.38fr)_minmax(0,1fr)]">
        {canEdit ? (
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Create job</h2>
            <form action={createBulkJobAction} className="mt-5 space-y-4">
              <Field label="Job title">
                <input className={inputClass} name="title" placeholder="Amazon kids t-shirt batch" required />
              </Field>
              <Field label="Job type">
                <select className={selectClass} name="jobType">
                  {jobTypes.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Marketplace">
                <select className={selectClass} name="marketplace">
                  <option value="">All / not required</option>
                  {marketplaces.map((marketplace) => (
                    <option key={marketplace} value={marketplace}>
                      {marketplace}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="space-y-2">
                <p className="text-sm font-medium text-ink">Products</p>
                <div className="max-h-72 space-y-2 overflow-auto rounded-md border border-line p-2">
                  {products.map((product) => (
                    <label className="flex items-start gap-3 rounded-md px-2 py-2 text-sm text-muted hover:bg-paper" key={product.id}>
                      <input className="mt-1 h-4 w-4 accent-moss" name="productIds" type="checkbox" value={product.id} />
                      <span>
                        <span className="block font-medium text-ink">{product.sku}</span>
                        {product.brand} {product.categoryProfile.categoryName}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <button className={buttonClass} type="submit">
                Create and run job
              </button>
            </form>
          </DataPanel>
        ) : null}

        <DataPanel>
          <h2 className="text-lg font-semibold text-ink">Job history</h2>
          {jobs.length ? (
            <div className="mt-4 space-y-3">
              {jobs.map((job) => (
                <article className="rounded-lg border border-line p-4" key={job.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-ink">{job.title}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {titleCase(job.jobType)} {job.marketplace ? `- ${job.marketplace}` : ""} - {formatDate(job.createdAt)}
                      </p>
                    </div>
                    <StatusBadge label={titleCase(job.status)} />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-md bg-paper p-3">
                      <p className="text-muted">Total</p>
                      <p className="mt-1 font-semibold text-ink">{job.totalItems}</p>
                    </div>
                    <div className="rounded-md bg-paper p-3">
                      <p className="text-muted">Processed</p>
                      <p className="mt-1 font-semibold text-ink">{job.processedItems}</p>
                    </div>
                    <div className="rounded-md bg-paper p-3">
                      <p className="text-muted">Failed</p>
                      <p className="mt-1 font-semibold text-ink">{job.failedItems}</p>
                    </div>
                  </div>
                  {canEdit ? (
                    <form action={processBulkJobAction} className="mt-4">
                      <input name="bulkJobId" type="hidden" value={job.id} />
                      <button className={secondaryButtonClass} type="submit">
                        Run again
                      </button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState message="No bulk jobs have been created yet." />
          )}
        </DataPanel>
      </div>
    </div>
  );
}

