import { generateListingsAction } from "@/app/dashboard/catalog-actions";
import {
  DataPanel,
  EmptyState,
  Field,
  SectionHeader,
  StatusBadge,
  buttonClass,
  secondaryButtonClass,
  selectClass,
} from "@/components/dashboard/ui";
import { titleCase } from "@/lib/format";
import { canEditCatalog, canManageWorkspace } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const marketplaces = ["Amazon", "Flipkart", "Myntra", "Meesho", "Shopify", "JioMart"] as const;

export default async function ListingsPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);
  const canEdit = canEditCatalog(user.role);
  const sellerAccountIds = user.assignedSellerAccounts.map((assignment) => assignment.sellerAccountId);

  const [products, listings] = await Promise.all([
    prisma.product.findMany({
      where: canManage ? undefined : { sellerAccountId: { in: sellerAccountIds } },
      include: { categoryProfile: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.marketplaceListing.findMany({
      where: canManage
        ? undefined
        : {
            product: {
              sellerAccountId: { in: sellerAccountIds },
            },
          },
      include: {
        product: {
          include: {
            categoryProfile: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Listings"
        description="Generate and review marketplace-wise listing content, SEO keywords, specifications, and Excel-ready export files."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(340px,0.34fr)_minmax(0,1fr)]">
        {canEdit ? (
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Generate listings</h2>
            <form action={generateListingsAction} className="mt-5 space-y-4">
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
                  <option value="">All marketplaces</option>
                  {marketplaces.map((marketplace) => (
                    <option key={marketplace} value={marketplace}>
                      {marketplace}
                    </option>
                  ))}
                </select>
              </Field>
              <button className={buttonClass} type="submit">
                Generate
              </button>
            </form>

            <div className="mt-6 border-t border-line pt-5">
              <p className="text-sm font-semibold text-ink">Excel exports</p>
              <div className="mt-3 grid gap-2">
                {marketplaces.map((marketplace) => (
                  <a className={secondaryButtonClass} href={`/api/exports/marketplace?marketplace=${marketplace}`} key={marketplace}>
                    Export {marketplace}
                  </a>
                ))}
              </div>
            </div>
          </DataPanel>
        ) : null}

        <DataPanel>
          <h2 className="text-lg font-semibold text-ink">Generated marketplace content</h2>
          {listings.length ? (
            <div className="mt-4 space-y-3">
              {listings.map((listing) => (
                <article className="rounded-lg border border-line p-4" key={listing.id}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-moss">{listing.marketplace}</p>
                      <h3 className="mt-1 font-semibold text-ink">{listing.title}</h3>
                      <p className="mt-1 text-xs text-muted">
                        {listing.product.sku} - {listing.product.categoryProfile.categoryName}
                      </p>
                    </div>
                    <StatusBadge label={titleCase(listing.status)} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">{listing.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState message="No marketplace listings generated yet." />
          )}
        </DataPanel>
      </div>
    </div>
  );
}

