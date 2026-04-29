import type { Marketplace } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const marketplaces = new Set(["Amazon", "Flipkart", "Myntra", "Meesho", "Shopify", "JioMart"]);

function escapeCell(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const marketplaceParam = url.searchParams.get("marketplace") ?? "Amazon";

  if (!marketplaces.has(marketplaceParam)) {
    return NextResponse.json({ message: "Invalid marketplace" }, { status: 400 });
  }

  const marketplace = marketplaceParam as Marketplace;
  const listings = await prisma.marketplaceListing.findMany({
    where: { marketplace },
    include: {
      product: {
        include: {
          variants: true,
          images: true,
          sellerAccount: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const rows = listings.flatMap((listing) => {
    const imageLinks = listing.product.images.map((image) => image.dropboxLink).join(" | ");
    const variants = listing.product.variants.length ? listing.product.variants : [null];

    return variants.map((variant) => ({
      sellerAccount: listing.product.sellerAccount.name,
      marketplace,
      parentSku: listing.product.sku,
      sku: variant?.sku ?? listing.product.sku,
      modelNumber: listing.product.modelNumber,
      title: listing.title,
      bullet1: listing.bullets[0] ?? "",
      bullet2: listing.bullets[1] ?? "",
      bullet3: listing.bullets[2] ?? "",
      bullet4: listing.bullets[3] ?? "",
      bullet5: listing.bullets[4] ?? "",
      description: listing.description,
      keywords: listing.keywords.join(", "),
      price: variant?.price ?? listing.product.basePrice,
      mrp: variant?.mrp ?? listing.product.mrp,
      color: variant?.color ?? listing.product.color,
      size: variant?.size ?? listing.product.sizeRange,
      imageLinks,
    }));
  });

  const headers = [
    "Seller Account",
    "Marketplace",
    "Parent SKU",
    "SKU",
    "Model Number",
    "Title",
    "Bullet 1",
    "Bullet 2",
    "Bullet 3",
    "Bullet 4",
    "Bullet 5",
    "Description",
    "Keywords",
    "Price",
    "MRP",
    "Color",
    "Size",
    "Image Links",
  ];

  const body = `<!doctype html><html><head><meta charset="utf-8" /></head><body><table><thead><tr>${headers
    .map((header) => `<th>${escapeCell(header)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr><td>${escapeCell(row.sellerAccount)}</td><td>${escapeCell(row.marketplace)}</td><td>${escapeCell(row.parentSku)}</td><td>${escapeCell(
          row.sku,
        )}</td><td>${escapeCell(row.modelNumber)}</td><td>${escapeCell(row.title)}</td><td>${escapeCell(row.bullet1)}</td><td>${escapeCell(
          row.bullet2,
        )}</td><td>${escapeCell(row.bullet3)}</td><td>${escapeCell(row.bullet4)}</td><td>${escapeCell(row.bullet5)}</td><td>${escapeCell(
          row.description,
        )}</td><td>${escapeCell(row.keywords)}</td><td>${escapeCell(row.price)}</td><td>${escapeCell(row.mrp)}</td><td>${escapeCell(
          row.color,
        )}</td><td>${escapeCell(row.size)}</td><td>${escapeCell(row.imageLinks)}</td></tr>`,
    )
    .join("")}</tbody></table></body></html>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="catalogflow-${marketplace.toLowerCase()}-export.xls"`,
    },
  });
}

