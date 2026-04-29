import { processImagesAction } from "@/app/dashboard/catalog-actions";
import { DataPanel, EmptyState, SectionHeader, StatusBadge, secondaryButtonClass } from "@/components/dashboard/ui";
import { imageRoleLabel } from "@/lib/catalog/image-rules";
import { formatDate, titleCase } from "@/lib/format";
import { canEditCatalog, canManageWorkspace } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function ImagesPage() {
  const user = await getCurrentUser();
  const canManage = canManageWorkspace(user.role);
  const canEdit = canEditCatalog(user.role);
  const sellerAccountIds = user.assignedSellerAccounts.map((assignment) => assignment.sellerAccountId);

  const images = await prisma.productImage.findMany({
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
          sellerAccount: true,
          categoryProfile: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Images"
        description="Track uploaded product images, simulated Dropbox links, processing status, audit score, and marketplace readiness."
      />

      <DataPanel>
        {images.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted">
                  <th className="py-3 font-semibold">Image</th>
                  <th className="py-3 font-semibold">Product</th>
                  <th className="py-3 font-semibold">Dropbox path</th>
                  <th className="py-3 font-semibold">Score</th>
                  <th className="py-3 font-semibold">Status</th>
                  <th className="py-3 font-semibold">Updated</th>
                  <th className="py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {images.map((image) => (
                  <tr key={image.id}>
                    <td className="py-3">
                      <p className="font-medium text-ink">{image.fileName}</p>
                      <p className="mt-1 text-xs font-medium text-moss">{imageRoleLabel(image.role)}</p>
                      <p className="mt-1 truncate text-xs text-muted">{image.sourceUrl}</p>
                    </td>
                    <td className="py-3 text-muted">
                      {image.product.brand} {image.product.categoryProfile.categoryName}
                    </td>
                    <td className="py-3 text-xs text-muted">{image.dropboxPath}</td>
                    <td className="py-3 text-muted">{image.auditScore ?? "-"}</td>
                    <td className="py-3">
                      <StatusBadge label={titleCase(image.status)} />
                    </td>
                    <td className="py-3 text-muted">{formatDate(image.updatedAt)}</td>
                    <td className="py-3">
                      {canEdit ? (
                        <form action={processImagesAction}>
                          <input name="productId" type="hidden" value={image.productId} />
                          <button className={secondaryButtonClass} type="submit">
                            Process
                          </button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No product images uploaded yet. Open a product and add image links." />
        )}
      </DataPanel>
    </div>
  );
}
