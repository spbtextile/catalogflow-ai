import type { Prisma } from "@prisma/client";

type SkuRules = {
  prefix?: string;
  numberingFormat?: string;
};

function compact(value: string) {
  return value
    .replace(/[^a-zA-Z0-9]+/g, "")
    .slice(0, 8)
    .toUpperCase();
}

export function readSkuRules(value: Prisma.JsonValue): Required<SkuRules> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { prefix: "SPB", numberingFormat: "0000" };
  }

  const rules = value as Record<string, unknown>;

  return {
    prefix: typeof rules.prefix === "string" && rules.prefix ? rules.prefix.toUpperCase() : "SPB",
    numberingFormat: typeof rules.numberingFormat === "string" && rules.numberingFormat ? rules.numberingFormat : "0000",
  };
}

export function formatSequence(sequence: number, numberingFormat: string) {
  return String(sequence).padStart(numberingFormat.length, "0");
}

export function buildProductSku({
  prefix,
  brand,
  color,
  sizeRange,
  packOf,
  sequence,
  numberingFormat,
}: {
  prefix: string;
  brand: string;
  color: string;
  sizeRange: string;
  packOf: number;
  sequence: number;
  numberingFormat: string;
}) {
  const pack = packOf > 1 ? `P${packOf}` : "P1";
  return [prefix, compact(brand), compact(color), compact(sizeRange), pack, formatSequence(sequence, numberingFormat)]
    .filter(Boolean)
    .join("-");
}

export function buildModelNumber(prefix: string, sequence: number) {
  const year = new Date().getFullYear().toString().slice(-2);
  return `SPB-${prefix}-${year}-${String(sequence).padStart(5, "0")}`;
}

export function splitSizes(sizeRange: string) {
  const cleaned = sizeRange.trim();

  if (!cleaned) {
    return ["Free"];
  }

  if (cleaned.includes("-")) {
    const [start, end] = cleaned.split("-").map((part) => Number(part.trim()));

    if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start && end - start <= 20) {
      return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
    }
  }

  return cleaned
    .split(/[,\s/]+/)
    .map((size) => size.trim().toUpperCase())
    .filter(Boolean);
}

export function buildVariantSku(productSku: string, size: string) {
  return `${productSku}-${compact(size) || "FREE"}`;
}

