import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SectionHeader, EmptyState } from "@/components/dashboard/ui";
import { FolderOpen, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

export default async function DesignsPage({ searchParams }: { searchParams?: Promise<{ imported?: string }> }) {
  await getCurrentUser();
  const params = await searchParams;

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      categoryProfile: true,
      variants: true,
      images: {
        where: { sortOrder: 0 },
        take: 1,
      },
      printAssets: true,
    },
  });

  const importedCount = params?.imported ? parseInt(params.imported) : 0;

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <SectionHeader title="Designs" description="Manage your print-on-demand designs and grouped SKUs." />
        <div className="mt-8">
          <EmptyState message="No designs found. Try importing from a Google Sheet." />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <SectionHeader title="Designs" description="Manage your print-on-demand designs and grouped SKUs." />

      {importedCount > 0 && (
        <div className="mt-6 rounded-md bg-green-50 p-4 border border-green-200 text-sm text-green-800">
          Successfully imported {importedCount} design(s) from Google Sheets!
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const mainImage = product.images[0]?.sourceUrl;
          const variantsCount = product.variants.length;
          const hasPrint = product.printAssets.length > 0;

          return (
            <div key={product.id} className="overflow-hidden rounded-xl border border-line bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md">
              <div className="aspect-square bg-paper relative">
                {mainImage ? (
                  <img src={mainImage} alt={product.sku} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted">
                    <ImageIcon className="h-10 w-10 opacity-20" />
                  </div>
                )}
                {hasPrint && (
                  <div className="absolute top-3 right-3 rounded-full bg-indigo-500 p-1.5 text-white shadow-sm" title="Has Print Asset">
                    <FolderOpen className="h-4 w-4" />
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {product.categoryProfile.categoryName}
                  </span>
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {variantsCount} variants
                  </span>
                </div>

                <h3 className="font-semibold text-ink truncate" title={product.sku}>
                  {product.sku}
                </h3>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted">
                    {product.color} • {product.fabric}
                  </div>
                  <Link
                    href={`/dashboard/products/${product.id}`}
                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    View Details →
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
