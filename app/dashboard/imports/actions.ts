import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ensureProductVariants } from "@/lib/catalog/master-agent";

// The Google Sheet URL should be like:
// https://docs.google.com/spreadsheets/d/1U0QqOCIBzaYSB1wM4E8x-UtOsKc2E-A6-L6I8XR3Y0g/edit?gid=1067044377#gid=1067044377
// We convert it to the export CSV format:
// https://docs.google.com/spreadsheets/d/1U0QqOCIBzaYSB1wM4E8x-UtOsKc2E-A6-L6I8XR3Y0g/export?format=csv&gid=1067044377

function getCsvUrl(sheetUrl: string) {
  try {
    const url = new URL(sheetUrl);
    if (!url.hostname.includes("docs.google.com")) return null;

    const pathParts = url.pathname.split("/");
    const idIndex = pathParts.indexOf("d");
    if (idIndex === -1 || pathParts.length <= idIndex + 1) return null;

    const sheetId = pathParts[idIndex + 1];
    let gid = "0";

    if (url.searchParams.has("gid")) {
      gid = url.searchParams.get("gid")!;
    } else {
      const hashParams = new URLSearchParams(url.hash.replace("#", ""));
      if (hashParams.has("gid")) {
        gid = hashParams.get("gid")!;
      }
    }

    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  } catch {
    return null;
  }
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let inQuotes = false;
  let currentVal = "";

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (i + 1 < line.length && line[i + 1] === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(currentVal);
      currentVal = "";
    } else {
      currentVal += char;
    }
  }
  result.push(currentVal);
  return result;
}

function parseCsv(csv: string) {
  const lines = csv.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(h => h.trim());
  const rows = lines.slice(1).map(parseCsvLine);

  return rows.map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i]?.trim() || "";
    });
    return obj;
  });
}

function extractDesignNumberAndSize(sku: string) {
  const parts = sku.split("_");
  if (parts.length > 1) {
    const size = parts.pop()!;
    return { designNumber: parts.join("_"), size };
  }
  return { designNumber: sku, size: "FREE" };
}

export async function importGoogleSheet(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role === "viewer") {
    throw new Error("Unauthorized");
  }

  const sheetUrl = formData.get("sheetUrl") as string;
  if (!sheetUrl) throw new Error("Missing Sheet URL");

  const csvUrl = getCsvUrl(sheetUrl);
  if (!csvUrl) throw new Error("Invalid Google Sheets URL");

  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch CSV: ${response.statusText}`);
  }

  const csvText = await response.text();
  const rows = parseCsv(csvText);

  if (rows.length === 0) throw new Error("Sheet is empty or incorrectly formatted");

  const category = await prisma.categoryProfile.findFirst({
    where: { categoryName: "T-Shirt" }
  });

  let categoryId = category?.id;
  if (!categoryId) {
    const newCat = await prisma.categoryProfile.create({
      data: {
        categoryName: "T-Shirt",
        skuRules: { prefix: "TSHRT", numberingFormat: "0000" }
      }
    });
    categoryId = newCat.id;
  }

  const sellerAccount = await prisma.sellerAccount.findFirst();
  if (!sellerAccount) throw new Error("No seller accounts exist. Please create one first.");

  const productMap = new Map<string, Record<string, unknown>>();

  for (const row of rows) {
    const sku = row["SKU"];
    if (!sku) continue;

    const { designNumber, size } = extractDesignNumberAndSize(sku);
    const mainImageUrl = row["Main Image URL"];

    if (!productMap.has(designNumber)) {
      productMap.set(designNumber, {
        sku: designNumber,
        modelNumber: `IMPORT-${designNumber}`,
        sellerAccountId: sellerAccount.id,
        categoryProfileId: categoryId,
        createdById: user.id,
        brand: "Imported Brand",
        fabric: "Cotton",
        color: "Multicolor",
        sizeRange: size,
        fit: "Regular",
        pattern: "Printed",
        features: ["Imported from Sheets"],
        targetAudience: "Unisex",
        basePrice: 500,
        mrp: 999,
        variants: [],
        images: mainImageUrl ? [mainImageUrl] : [],
      });
    } else {
      const prod = productMap.get(designNumber)!;
      if (!(prod.sizeRange as string).includes(size)) {
        prod.sizeRange = `${prod.sizeRange as string},${size}`;
      }
      if (mainImageUrl && !(prod.images as string[]).includes(mainImageUrl)) {
        (prod.images as string[]).push(mainImageUrl);
      }
    }

    const prodVariants = productMap.get(designNumber)!.variants as Array<Record<string, string>>;
    prodVariants.push({
      size,
      sku: sku,
      mainImageUrl
    });
  }

  let importedCount = 0;

  for (const [designNumber, prodDataAny] of productMap.entries()) {
    const prodData = prodDataAny as Record<string, unknown>;
    const existing = await prisma.product.findUnique({
      where: { sku: prodData.sku as string }
    });

    let productId = existing?.id;

    if (!existing) {
      const product = await prisma.product.create({
        data: {
          sellerAccountId: prodData.sellerAccountId as string,
          categoryProfileId: prodData.categoryProfileId as string,
          createdById: prodData.createdById as string,
          brand: prodData.brand as string,
          fabric: prodData.fabric as string,
          color: prodData.color as string,
          sizeRange: prodData.sizeRange as string,
          fit: prodData.fit as string,
          pattern: prodData.pattern as string,
          features: prodData.features as string[],
          targetAudience: prodData.targetAudience as string,
          basePrice: prodData.basePrice as number,
          mrp: prodData.mrp as number,
          sku: prodData.sku as string,
          modelNumber: prodData.modelNumber as string,
          status: "draft"
        }
      });
      productId = product.id;
      importedCount++;
    }

    if (productId) {
      await ensureProductVariants(productId);

      // Update variants with imported SKUs and correct sizes
      for (const v of prodData.variants as Array<Record<string, string>>) {
         await prisma.productVariant.upsert({
           where: { sku: v.sku },
           update: { size: v.size },
           create: {
             productId: productId,
             size: v.size,
             color: prodData.color as string,
             sku: v.sku,
             price: prodData.basePrice as number,
             mrp: prodData.mrp as number,
             stock: 0
           }
         });
      }

      const images = prodData.images as string[];
      for (let i = 0; i < images.length; i++) {
        const url = images[i];
        const fileName = `img_${i}.jpg`;

        const existingImage = await prisma.productImage.findFirst({
          where: { productId, fileName }
        });

        if (!existingImage) {
          await prisma.productImage.create({
            data: {
              productId,
              uploadedById: user.id,
              fileName,
              sourceUrl: url,
              dropboxPath: `/${designNumber}/images/${fileName}`,
              dropboxLink: url,
              status: "uploaded",
              sortOrder: i
            }
          });
        }
      }

      const printPath = `/${designNumber}/prints/design.png`;
      const existingPrint = await prisma.printAsset.findFirst({
        where: { productId }
      });

      if (!existingPrint) {
        await prisma.printAsset.create({
          data: {
            productId,
            prompt: `Imported design ${designNumber}`,
            assetUrl: "https://via.placeholder.com/1024",
            status: "processed",
            notes: `Stored conceptually in Google Drive: ${printPath}`
          }
        });
      }
    }
  }

  revalidatePath("/dashboard/products");
  revalidatePath("/dashboard/designs");
  redirect(`/dashboard/designs?imported=${importedCount}`);
}
