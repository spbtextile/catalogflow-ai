import { generatePrintAction } from "@/app/dashboard/catalog-actions";
import { DataPanel, EmptyState, Field, SectionHeader, StatusBadge, buttonClass, selectClass } from "@/components/dashboard/ui";
import { formatDate, titleCase } from "@/lib/format";
import { canEditCatalog, canManageWorkspace } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function PrintsPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);
  const canEdit = canEditCatalog(user.role);
  const sellerAccountIds = user.assignedSellerAccounts.map((assignment) => assignment.sellerAccountId);

  const [products, printAssets] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...(canManage ? {} : { sellerAccountId: { in: sellerAccountIds } }),
        categoryProfile: { requiresPrint: true },
      },
      include: { categoryProfile: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.printAsset.findMany({
      where: canManage ? undefined : { product: { sellerAccountId: { in: sellerAccountIds } } },
      include: { product: { include: { categoryProfile: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader title="Print generation" description="Create print prompts and asset records for products whose category profile requires print artwork." />

      <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.34fr)_minmax(0,1fr)]">
        {canEdit ? (
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Generate print asset</h2>
            <form action={generatePrintAction} className="mt-5 space-y-4">
              <Field label="Product">
                <select className={selectClass} name="productId">
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} - {product.brand} {product.categoryProfile.categoryName}
                    </option>
                  ))}
                </select>
              </Field>
              <button className={buttonClass} type="submit">
                Generate print
              </button>
            </form>
          </DataPanel>
        ) : null}

        <DataPanel>
          <h2 className="text-lg font-semibold text-ink">Print assets</h2>
          {printAssets.length ? (
            <div className="mt-4 space-y-3">
              {printAssets.map((asset) => (
                <article className="rounded-lg border border-line p-4" key={asset.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        aria-hidden
                        className="h-24 w-24 shrink-0 rounded-md border border-line bg-paper bg-cover bg-center"
                        style={{ backgroundImage: `url("${asset.assetUrl}")` }}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">{asset.product.sku}</p>
                        <p className="mt-1 text-sm text-muted">{asset.prompt}</p>
                      </div>
                    </div>
                    <StatusBadge label={titleCase(asset.status)} />
                  </div>
                  <p className="mt-3 font-mono text-xs text-muted">{asset.assetUrl}</p>
                  <p className="mt-2 text-xs text-muted">{formatDate(asset.createdAt)}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState message="No print assets generated yet." />
          )}
        </DataPanel>
      </div>
    </div>
  );
}
