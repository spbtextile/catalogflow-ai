import { notFound } from "next/navigation";

import {
  generateListingsAction,
  generatePrintAction,
  processImagesAction,
  pushMarketplaceAction,
  runMasterAgentAction,
  saveProductImage,
} from "@/app/dashboard/catalog-actions";
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
import { IMAGE_ROLE_OPTIONS, evaluateImageReadiness, imageRoleLabel } from "@/lib/catalog/image-rules";
import { formatDate, titleCase } from "@/lib/format";
import { canEditCatalog } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const marketplaces = ["Amazon", "Flipkart", "Myntra", "Meesho", "Shopify", "JioMart"] as const;

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const canEdit = canEditCatalog(user.role);

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      sellerAccount: true,
      categoryProfile: true,
      variants: { orderBy: { size: "asc" } },
      images: { orderBy: { createdAt: "desc" } },
      listings: { orderBy: { marketplace: "asc" } },
      printAssets: { orderBy: { createdAt: "desc" } },
      pushes: { orderBy: { updatedAt: "desc" } },
      agentRuns: {
        include: { agentDefinition: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!product) {
    notFound();
  }

  const imageReadiness = evaluateImageReadiness(product.images.length);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`${product.brand} ${product.categoryProfile.categoryName}`}
        description={`${product.sku} - ${product.modelNumber} - ${product.sellerAccount.name}`}
        action={<StatusBadge label={titleCase(product.status)} />}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)]">
        <div className="space-y-5">
          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Product data</h2>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              {[
                ["Fabric", product.fabric],
                ["Color", product.color],
                ["Size range", product.sizeRange],
                ["Fit", product.fit],
                ["Pattern", product.pattern],
                ["Audience", product.targetAudience],
                ["Pack", product.packOf > 1 ? `Pack of ${product.packOf}` : "Single"],
                ["Price", `Rs. ${String(product.basePrice)}`],
                ["MRP", `Rs. ${String(product.mrp)}`],
              ].map(([label, value]) => (
                <div className="rounded-md bg-paper p-3" key={label}>
                  <p className="text-muted">{label}</p>
                  <p className="mt-1 font-medium text-ink">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {product.features.map((feature) => (
                <span className="rounded-md bg-moss/10 px-2 py-1 text-xs font-medium text-moss" key={feature}>
                  {feature}
                </span>
              ))}
            </div>
            <div className="mt-5 rounded-md border border-line bg-paper p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink">Image readiness</p>
                  <p className="mt-1 text-sm text-muted">{imageReadiness.message}</p>
                </div>
                <StatusBadge label={imageReadiness.label} />
              </div>
            </div>
          </DataPanel>

          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Variants</h2>
            {product.variants.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
                      <th className="py-3 font-semibold">Size</th>
                      <th className="py-3 font-semibold">SKU</th>
                      <th className="py-3 font-semibold">Price</th>
                      <th className="py-3 font-semibold">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {product.variants.map((variant) => (
                      <tr key={variant.id}>
                        <td className="py-3 text-ink">{variant.size}</td>
                        <td className="py-3 font-mono text-xs text-muted">{variant.sku}</td>
                        <td className="py-3 text-muted">Rs. {String(variant.price)}</td>
                        <td className="py-3 text-muted">{variant.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No variants generated yet. Run the master agent." />
            )}
          </DataPanel>

          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Marketplace listings</h2>
            {product.listings.length ? (
              <div className="mt-4 space-y-3">
                {product.listings.map((listing) => (
                  <article className="rounded-lg border border-line p-4" key={listing.id}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-moss">{listing.marketplace}</p>
                        <h3 className="mt-1 font-semibold text-ink">{listing.title}</h3>
                      </div>
                      <StatusBadge label={titleCase(listing.status)} />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted">{listing.description}</p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {listing.bullets.slice(0, 4).map((bullet) => (
                        <p className="rounded-md bg-paper p-2 text-xs text-muted" key={bullet}>
                          {bullet}
                        </p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState message="No listings generated yet." />
            )}
          </DataPanel>

          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Recent agent runs</h2>
            {product.agentRuns.length ? (
              <div className="mt-4 space-y-3">
                {product.agentRuns.map((run) => (
                  <div className="rounded-md border border-line p-3" key={run.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">{run.agentDefinition.name}</p>
                        <p className="mt-1 text-sm text-muted">{run.objective}</p>
                      </div>
                      <StatusBadge label={titleCase(run.status)} />
                    </div>
                    <p className="mt-2 text-xs text-muted">{run.logs.join(" ")}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No agents have run for this product yet." />
            )}
          </DataPanel>
        </div>

        <div className="space-y-5">
          {canEdit ? (
            <DataPanel>
              <h2 className="text-lg font-semibold text-ink">Master agent</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Runs variant generation, image audit, print generation, listing generation, quality check, and memory update.
              </p>
              <form action={runMasterAgentAction} className="mt-4 space-y-3">
                <input name="productId" type="hidden" value={product.id} />
                <Field label="Objective">
                  <input className={inputClass} defaultValue="Complete full product pipeline" name="objective" />
                </Field>
                <button className={buttonClass} type="submit">
                  Run master agent
                </button>
              </form>
            </DataPanel>
          ) : null}

          {canEdit ? (
            <DataPanel>
              <h2 className="text-lg font-semibold text-ink">Upload image link</h2>
              <form action={saveProductImage} className="mt-4 space-y-4">
                <input name="productId" type="hidden" value={product.id} />
                <Field label="File name">
                  <input className={inputClass} name="fileName" placeholder={`${product.sku}-front.jpg`} required />
                </Field>
                <Field label="Source URL">
                  <input className={inputClass} name="sourceUrl" placeholder="https://..." required type="url" />
                </Field>
                <Field label="Image role">
                  <select className={selectClass} name="role" required>
                    {IMAGE_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Marketplace use">
                  <select className={selectClass} name="marketplace">
                    <option value="">All marketplaces</option>
                    {marketplaces.map((marketplace) => (
                      <option key={marketplace} value={marketplace}>
                        {marketplace}
                      </option>
                    ))}
                  </select>
                </Field>
                <button className={secondaryButtonClass} type="submit">
                  Save image
                </button>
              </form>
            </DataPanel>
          ) : null}

          {canEdit ? (
            <DataPanel>
              <h2 className="text-lg font-semibold text-ink">Quick operations</h2>
              <div className="mt-4 grid gap-3">
                <form action={generateListingsAction}>
                  <input name="productId" type="hidden" value={product.id} />
                  <button
                    className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    disabled={!imageReadiness.canGenerateListing}
                    type="submit"
                  >
                    Generate all listings
                  </button>
                </form>
                <form action={processImagesAction}>
                  <input name="productId" type="hidden" value={product.id} />
                  <button className={secondaryButtonClass} type="submit">
                    Process images
                  </button>
                </form>
                <form action={generatePrintAction}>
                  <input name="productId" type="hidden" value={product.id} />
                  <button className={secondaryButtonClass} type="submit">
                    Generate print
                  </button>
                </form>
                <form action={pushMarketplaceAction} className="grid gap-3">
                  <input name="productId" type="hidden" value={product.id} />
                  <select className={selectClass} name="marketplace">
                    {marketplaces.map((marketplace) => (
                      <option key={marketplace} value={marketplace}>
                        {marketplace}
                      </option>
                    ))}
                  </select>
                  <button
                    className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    disabled={!imageReadiness.isMarketplaceReady}
                    type="submit"
                  >
                    Push marketplace
                  </button>
                </form>
              </div>
            </DataPanel>
          ) : null}

          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Images</h2>
            {product.images.length ? (
              <div className="mt-4 space-y-3">
                {product.images.map((image) => {
                  const previewUrl = image.processedUrl ?? image.sourceUrl;

                  return (
                    <div className="rounded-md border border-line p-3" key={image.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            aria-hidden
                            className="h-20 w-20 shrink-0 rounded-md border border-line bg-paper bg-cover bg-center"
                            style={{ backgroundImage: `url("${previewUrl}")` }}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-ink">{image.fileName}</p>
                            <p className="mt-1 text-xs font-medium text-moss">{imageRoleLabel(image.role)}</p>
                            <p className="mt-1 truncate text-xs text-muted">{image.dropboxPath}</p>
                          </div>
                        </div>
                        <StatusBadge label={titleCase(image.status)} />
                      </div>
                      <p className="mt-2 text-xs text-muted">{image.notes ?? "Waiting for processing."}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState message="No image links uploaded yet." />
            )}
          </DataPanel>

          <DataPanel>
            <h2 className="text-lg font-semibold text-ink">Print and pushes</h2>
            <div className="mt-4 space-y-3">
              {product.printAssets.map((asset) => (
                <div className="flex gap-3 rounded-md bg-paper p-3 text-sm" key={asset.id}>
                  <div
                    aria-hidden
                    className="h-20 w-20 shrink-0 rounded-md border border-line bg-white bg-cover bg-center"
                    style={{ backgroundImage: `url("${asset.assetUrl}")` }}
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{asset.assetUrl}</p>
                    <p className="mt-1 text-muted">{asset.prompt}</p>
                  </div>
                </div>
              ))}
              {product.pushes.map((push) => (
                <div className="rounded-md bg-paper p-3 text-sm" key={push.id}>
                  <p className="font-medium text-ink">{push.marketplace}</p>
                  <p className="mt-1 text-muted">
                    {titleCase(push.status)} {push.pushedAt ? `on ${formatDate(push.pushedAt)}` : ""}
                  </p>
                </div>
              ))}
              {!product.printAssets.length && !product.pushes.length ? <EmptyState message="No print assets or pushes yet." /> : null}
            </div>
          </DataPanel>
        </div>
      </div>
    </div>
  );
}
