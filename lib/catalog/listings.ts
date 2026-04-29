import type { Marketplace, Product, SellerAccount } from "@prisma/client";

type ListingProduct = Product & {
  sellerAccount: SellerAccount;
};

function trimForMarketplace(value: string, maxLength: number) {
  return value.length <= maxLength ? value : value.slice(0, maxLength - 1).trimEnd();
}

function featureText(product: ListingProduct) {
  return product.features.length ? product.features.join(", ") : `${product.fit} fit, ${product.pattern} pattern`;
}

function packText(product: ListingProduct) {
  return product.packOf > 1 ? `Pack of ${product.packOf}` : "Single pack";
}

function baseTitle(product: ListingProduct) {
  return `${product.brand} ${product.targetAudience} ${product.fabric} ${product.pattern} ${product.fit} ${packText(product)} - ${product.color}`;
}

export function generateListingCopy(product: ListingProduct, marketplace: Marketplace) {
  const titleBase = baseTitle(product);
  const useCase = product.targetAudience.toLowerCase().includes("kid")
    ? "school, casual wear, playtime, and gifting"
    : "daily wear, travel, gym, lounging, and casual outings";
  const keywords = [
    product.brand,
    product.fabric,
    product.color,
    product.pattern,
    product.fit,
    product.targetAudience,
    product.isCombo ? "combo" : "single",
    packText(product),
  ].map((keyword) => keyword.toLowerCase());

  const commonBullets = [
    `${product.fabric} fabric selected for comfort, breathability, and everyday use.`,
    `${product.fit} fit with ${featureText(product)} for a practical garment finish.`,
    `${packText(product)} in ${product.color}, suitable for ${useCase}.`,
    `Designed for ${product.targetAudience} with easy styling across marketplace catalog needs.`,
    "Wash with similar colors and dry in shade to preserve garment finish.",
  ];

  const specifications = {
    brand: product.brand,
    fabric: product.fabric,
    color: product.color,
    sizeRange: product.sizeRange,
    fit: product.fit,
    pattern: product.pattern,
    targetAudience: product.targetAudience,
    packOf: product.packOf,
    sku: product.sku,
    modelNumber: product.modelNumber,
  };

  if (marketplace === "Amazon") {
    return {
      title: trimForMarketplace(`${titleBase} | Comfortable ${product.fabric} Clothing`, 200),
      bullets: commonBullets,
      description: `${product.brand} brings a reliable ${product.fabric} ${product.pattern.toLowerCase()} style for ${product.targetAudience.toLowerCase()}. This ${packText(product).toLowerCase()} is built for repeat use with clear sizing, practical finishing, and marketplace-ready product information.`,
      keywords,
      specifications,
      bodyHtml: null,
    };
  }

  if (marketplace === "Flipkart") {
    return {
      title: trimForMarketplace(`${product.brand} ${product.targetAudience} ${product.pattern} ${product.fabric} ${packText(product)}`, 150),
      bullets: commonBullets.slice(0, 4),
      description: `A catalog-ready ${product.fabric} garment from ${product.brand}, made for ${useCase}.`,
      keywords,
      specifications: { ...specifications, keyFeatures: commonBullets.slice(0, 4) },
      bodyHtml: null,
    };
  }

  if (marketplace === "Myntra") {
    return {
      title: trimForMarketplace(`${product.brand} ${product.color} ${product.pattern} ${product.fabric} ${product.fit} Fit`, 120),
      bullets: [
        `Style note: Pair this ${product.color.toLowerCase()} piece with everyday basics for a clean casual look.`,
        `Size and fit: ${product.fit} fit, available in ${product.sizeRange}.`,
        `Material and care: ${product.fabric}; gentle wash recommended.`,
      ],
      description: `This ${product.brand} style is prepared for Myntra with clear fit, material, and care information.`,
      keywords,
      specifications,
      bodyHtml: null,
    };
  }

  if (marketplace === "Shopify") {
    return {
      title: trimForMarketplace(`${product.brand} ${product.color} ${product.pattern} ${product.fabric}`, 70),
      bullets: commonBullets.slice(0, 3),
      description: `${product.brand} ${product.fabric} clothing for ${product.targetAudience.toLowerCase()}, available as ${packText(product).toLowerCase()}.`,
      keywords,
      specifications,
      bodyHtml: `<p>${product.brand} ${product.fabric} ${product.pattern.toLowerCase()} garment in ${product.color.toLowerCase()}.</p><ul>${commonBullets
        .slice(0, 3)
        .map((bullet) => `<li>${bullet}</li>`)
        .join("")}</ul>`,
    };
  }

  return {
    title: trimForMarketplace(`${product.brand} ${product.targetAudience} ${product.fabric} ${packText(product)}`, 120),
    bullets: commonBullets.slice(0, 3),
    description: `${product.brand} ${product.fabric} ${product.pattern.toLowerCase()} garment for ${product.targetAudience.toLowerCase()}.`,
    keywords,
    specifications,
    bodyHtml: null,
  };
}

