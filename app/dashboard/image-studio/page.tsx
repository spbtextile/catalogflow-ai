import Link from "next/link";

import { generatePromptToMarketplaceAction } from "@/app/dashboard/image-studio/actions";
import {
  DataPanel,
  EmptyState,
  Field,
  SectionHeader,
  StatusBadge,
  buttonClass,
  inputClass,
  selectClass,
  textareaClass,
} from "@/components/dashboard/ui";
import { DESIGN_STUDIO_POSES } from "@/lib/catalog/design-studio";
import { evaluateImageReadiness } from "@/lib/catalog/image-rules";
import { formatDate, titleCase } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { canEditCatalog, canManageWorkspace } from "@/lib/rbac";
import { getCurrentUser } from "@/lib/session";

const marketplaces = ["Amazon", "Flipkart", "Myntra", "Meesho", "Shopify", "JioMart"] as const;

export default async function ImageStudioPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);
  const canEdit = canEditCatalog(user.role);
  const sellerAccountIds = user.assignedSellerAccounts.map((assignment) => assignment.sellerAccountId);

  const [sellerAccounts, categoryProfiles, products] = await Promise.all([
    canManage
      ? prisma.sellerAccount.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
      : Promise.resolve(user.assignedSellerAccounts.map((assignment) => assignment.sellerAccount).filter((account) => account.isActive)),
    prisma.categoryProfile.findMany({ where: { isActive: true }, orderBy: { categoryName: "asc" } }),
    prisma.product.findMany({
      where: canManage ? undefined : { sellerAccountId: { in: sellerAccountIds } },
      include: {
        sellerAccount: true,
        categoryProfile: true,
        _count: { select: { images: true, listings: true, pushes: true, printAssets: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Image Studio"
        description="Generate garment images from prompts, create seven marketplace poses, apply print artwork, run QA, prepare SKU/name feeds, and record marketplace pushes."
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(360px,0.44fr)_minmax(0,1fr)]">
        {canEdit ? (
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Prompt to marketplace</h2>
            <form action={generatePromptToMarketplaceAction} className="mt-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
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
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Brand">
                  <input className={inputClass} defaultValue="SPB" name="brand" required />
                </Field>
                <Field label="Target audience">
                  <input className={inputClass} defaultValue="Mens" name="targetAudience" required />
                </Field>
              </div>

              <Field label="Garment prompt">
                <input className={inputClass} defaultValue="mens cotton t-shirt" name="garmentPrompt" required />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sleeve style">
                  <select className={selectClass} defaultValue="half sleeve" name="sleeveStyle">
                    <option value="half sleeve">Half sleeve</option>
                    <option value="full sleeve">Full sleeve</option>
                    <option value="sleeveless">Sleeveless</option>
                    <option value="raglan sleeve">Raglan sleeve</option>
                    <option value="polo collar half sleeve">Polo collar half sleeve</option>
                  </select>
                </Field>
                <Field label="Generation mode">
                  <select className={selectClass} defaultValue="draft" name="generationMode">
                    <option value="draft">Draft preview</option>
                    <option value="openai">OpenAI live</option>
                  </select>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Fabric">
                  <input className={inputClass} defaultValue="Cotton" name="fabric" required />
                </Field>
                <Field label="Color">
                  <input className={inputClass} defaultValue="Black" name="color" required />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Size range">
                  <input className={inputClass} defaultValue="S M L XL XXL" name="sizeRange" required />
                </Field>
                <Field label="Fit">
                  <input className={inputClass} defaultValue="Regular" name="fit" required />
                </Field>
              </div>

              <Field label="Pattern">
                <input className={inputClass} defaultValue="Graphic Printed" name="pattern" required />
              </Field>
              <Field label="Print prompt">
                <textarea
                  className={textareaClass}
                  defaultValue="minimal chest print with clean SPB textile style, premium casualwear graphic"
                  name="printPrompt"
                  required
                />
              </Field>
              <Field label="Features">
                <input className={inputClass} defaultValue="soft feel, breathable, easy wash" name="features" />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Pack of">
                  <input className={inputClass} defaultValue="1" min="1" name="packOf" required type="number" />
                </Field>
                <Field label="Price">
                  <input className={inputClass} defaultValue="399" min="1" name="basePrice" required step="0.01" type="number" />
                </Field>
                <Field label="MRP">
                  <input className={inputClass} defaultValue="799" min="1" name="mrp" required step="0.01" type="number" />
                </Field>
              </div>

              <div className="rounded-md border border-line bg-paper p-3">
                <p className="text-sm font-semibold text-ink">Marketplace feed</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {marketplaces.map((marketplace) => (
                    <label className="flex items-center gap-2 text-sm font-medium text-ink" key={marketplace}>
                      <input className="h-4 w-4 accent-moss" defaultChecked name="marketplaces" type="checkbox" value={marketplace} />
                      {marketplace}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-md border border-line bg-paper px-3 py-3 text-sm font-medium text-ink">
                <input className="h-4 w-4 accent-moss" name="isCombo" type="checkbox" />
                Combo product
              </label>
              <label className="flex items-center gap-3 rounded-md border border-line bg-paper px-3 py-3 text-sm font-medium text-ink">
                <input className="h-4 w-4 accent-moss" name="pushMarketplaces" type="checkbox" />
                Push after feed generation
              </label>

              <button className={buttonClass} type="submit">
                Generate full pipeline
              </button>
            </form>
          </DataPanel>
        ) : null}

        <div className="space-y-5">
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Seven pose set</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {DESIGN_STUDIO_POSES.map((pose) => (
                <div className="rounded-md border border-line bg-paper p-3" key={pose.slug}>
                  <p className="font-medium text-ink">{pose.label}</p>
                  <p className="mt-1 text-xs text-muted">{pose.prompt}</p>
                </div>
              ))}
            </div>
          </DataPanel>

          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Recent generated products</h2>
            {products.length ? (
              <div className="mt-4 space-y-3">
                {products.map((product) => {
                  const readiness = evaluateImageReadiness(product._count.images);

                  return (
                    <article className="rounded-lg border border-line p-4" key={product.id}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <Link className="font-semibold text-ink hover:text-moss" href={`/dashboard/products/${product.id}`}>
                            {product.sku}
                          </Link>
                          <p className="mt-1 text-sm text-muted">
                            {product.brand} {product.categoryProfile.categoryName} - {product.sellerAccount.marketplace}
                          </p>
                        </div>
                        <StatusBadge label={titleCase(product.status)} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                        <StatusBadge label={readiness.label} />
                        <span className="rounded-md bg-paper px-2 py-1">{product._count.images}/7 images</span>
                        <span className="rounded-md bg-paper px-2 py-1">{product._count.printAssets} print assets</span>
                        <span className="rounded-md bg-paper px-2 py-1">{product._count.listings} feeds</span>
                        <span className="rounded-md bg-paper px-2 py-1">{product._count.pushes} pushes</span>
                      </div>
                      <p className="mt-2 text-xs text-muted">{formatDate(product.createdAt)}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No generated products yet." />
            )}
          </DataPanel>
        </div>
      </div>
    </div>
  );
}
