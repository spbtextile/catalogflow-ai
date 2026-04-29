import { pushMarketplaceAction } from "@/app/dashboard/catalog-actions";
import {
  DataPanel,
  EmptyState,
  Field,
  SectionHeader,
  StatusBadge,
  buttonClass,
  selectClass,
} from "@/components/dashboard/ui";
import { formatDate, titleCase } from "@/lib/format";
import { canEditCatalog, canManageWorkspace } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const marketplaces = ["Shopify", "Amazon", "Flipkart", "Myntra", "Meesho", "JioMart"] as const;

export default async function MarketplacePushPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);
  const canEdit = canEditCatalog(user.role);
  const sellerAccountIds = user.assignedSellerAccounts.map((assignment) => assignment.sellerAccountId);

  const [products, pushes] = await Promise.all([
    prisma.product.findMany({
      where: canManage ? undefined : { sellerAccountId: { in: sellerAccountIds } },
      include: { categoryProfile: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.marketplacePush.findMany({
      where: canManage ? undefined : { product: { sellerAccountId: { in: sellerAccountIds } } },
      include: {
        product: {
          include: {
            categoryProfile: true,
          },
        },
        listing: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Marketplace push"
        description="Prepare and record API push payloads. Shopify, Amazon, and Flipkart are simulated until real credentials are configured."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.34fr)_minmax(0,1fr)]">
        {canEdit ? (
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Push product</h2>
            <form action={pushMarketplaceAction} className="mt-5 space-y-4">
              <Field label="Product">
                <select className={selectClass} name="productId">
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.sku} - {product.brand} {product.categoryProfile.categoryName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Marketplace">
                <select className={selectClass} name="marketplace">
                  {marketplaces.map((marketplace) => (
                    <option key={marketplace} value={marketplace}>
                      {marketplace}
                    </option>
                  ))}
                </select>
              </Field>
              <button className={buttonClass} type="submit">
                Record push
              </button>
            </form>
          </DataPanel>
        ) : null}

        <DataPanel>
          <h2 className="text-lg font-semibold text-ink">Push history</h2>
          {pushes.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
                    <th className="py-3 font-semibold">Marketplace</th>
                    <th className="py-3 font-semibold">Product</th>
                    <th className="py-3 font-semibold">External ID</th>
                    <th className="py-3 font-semibold">Status</th>
                    <th className="py-3 font-semibold">Pushed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pushes.map((push) => (
                    <tr key={push.id}>
                      <td className="py-3 font-medium text-ink">{push.marketplace}</td>
                      <td className="py-3 text-muted">{push.product.sku}</td>
                      <td className="py-3 font-mono text-xs text-muted">{push.externalId ?? "-"}</td>
                      <td className="py-3">
                        <StatusBadge label={titleCase(push.status)} />
                      </td>
                      <td className="py-3 text-muted">{push.pushedAt ? formatDate(push.pushedAt) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No marketplace pushes have been recorded yet." />
          )}
        </DataPanel>
      </div>
    </div>
  );
}

