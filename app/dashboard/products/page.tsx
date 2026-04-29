import Link from "next/link";

import { saveProduct } from "@/app/dashboard/catalog-actions";
import {
  DataPanel,
  EmptyState,
  Field,
  SectionHeader,
  StatusBadge,
  buttonClass,
  inputClass,
  selectClass,
} from "@/components/dashboard/ui";
import { formatDate, titleCase } from "@/lib/format";
import { canEditCatalog, canManageWorkspace } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function ProductsPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);
  const canEdit = canEditCatalog(user.role);

  const [sellerAccounts, categoryProfiles, products] = await Promise.all([
    canManage
      ? prisma.sellerAccount.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
      : Promise.resolve(user.assignedSellerAccounts.map((assignment) => assignment.sellerAccount).filter((account) => account.isActive)),
    prisma.categoryProfile.findMany({ where: { isActive: true }, orderBy: { categoryName: "asc" } }),
    prisma.product.findMany({
      where: canManage
        ? undefined
        : {
            sellerAccountId: {
              in: user.assignedSellerAccounts.map((assignment) => assignment.sellerAccountId),
            },
          },
      include: {
        sellerAccount: true,
        categoryProfile: true,
        _count: {
          select: {
            variants: true,
            images: true,
            listings: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Products"
        description="Create products, generate SKUs and model numbers, and prepare variants for listing, image, export, and marketplace workflows."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.42fr)_minmax(0,1fr)]">
        {canEdit ? (
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Create product</h2>
            <form action={saveProduct} className="mt-5 space-y-4">
              <Field label="Seller account">
                <select className={selectClass} name="sellerAccountId" required>
                  {sellerAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {account.marketplace}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Category profile">
                <select className={selectClass} name="categoryProfileId" required>
                  {categoryProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.categoryName}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Brand">
                  <input className={inputClass} name="brand" placeholder="SPB" required />
                </Field>
                <Field label="Target audience">
                  <input className={inputClass} name="targetAudience" placeholder="Boys" required />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fabric">
                  <input className={inputClass} name="fabric" placeholder="Cotton" required />
                </Field>
                <Field label="Color">
                  <input className={inputClass} name="color" placeholder="Navy Blue" required />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Size range">
                  <input className={inputClass} name="sizeRange" placeholder="2-8 or S M L XL" required />
                </Field>
                <Field label="Fit">
                  <input className={inputClass} name="fit" placeholder="Regular" required />
                </Field>
              </div>

              <Field label="Pattern / print">
                <input className={inputClass} name="pattern" placeholder="Graphic Printed" required />
              </Field>
              <Field label="Features">
                <input className={inputClass} name="features" placeholder="soft feel, no pocket, stretch fabric" />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Pack of">
                  <input className={inputClass} defaultValue="1" min="1" name="packOf" required type="number" />
                </Field>
                <Field label="Price">
                  <input className={inputClass} min="1" name="basePrice" required step="0.01" type="number" />
                </Field>
                <Field label="MRP">
                  <input className={inputClass} min="1" name="mrp" required step="0.01" type="number" />
                </Field>
              </div>

              <label className="flex items-center gap-3 rounded-md border border-line bg-paper px-3 py-3 text-sm font-medium text-ink">
                <input className="h-4 w-4 accent-moss" name="isCombo" type="checkbox" />
                Combo product
              </label>

              <button className={buttonClass} type="submit">
                Create product
              </button>
            </form>
          </DataPanel>
        ) : null}

        <DataPanel>
          <h2 className="text-lg font-semibold text-ink">Catalog products</h2>
          {products.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[840px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
                    <th className="py-3 font-semibold">Product</th>
                    <th className="py-3 font-semibold">SKU</th>
                    <th className="py-3 font-semibold">Seller</th>
                    <th className="py-3 font-semibold">Status</th>
                    <th className="py-3 font-semibold">Assets</th>
                    <th className="py-3 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td className="py-3">
                        <Link className="font-semibold text-ink hover:text-moss" href={`/dashboard/products/${product.id}`}>
                          {product.brand} {product.categoryProfile.categoryName}
                        </Link>
                        <p className="mt-1 text-xs text-muted">
                          {product.color}, {product.sizeRange}, {product.packOf > 1 ? `Pack of ${product.packOf}` : "Single"}
                        </p>
                      </td>
                      <td className="py-3 font-mono text-xs text-muted">{product.sku}</td>
                      <td className="py-3 text-muted">{product.sellerAccount.marketplace}</td>
                      <td className="py-3">
                        <StatusBadge label={titleCase(product.status)} />
                      </td>
                      <td className="py-3 text-muted">
                        {product._count.variants} variants, {product._count.images} images, {product._count.listings} listings
                      </td>
                      <td className="py-3 text-muted">{formatDate(product.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No products yet. Create the first product to start the CatalogFlow pipeline." />
          )}
        </DataPanel>
      </div>
    </div>
  );
}

