-- CreateEnum
CREATE TYPE "ProductImageRole" AS ENUM ('main_front', 'back', 'side', 'detail', 'lifestyle', 'size_fit', 'pack_detail', 'extra');

-- CreateEnum
CREATE TYPE "ImageReadinessStatus" AS ENUM ('blocked', 'draft', 'ready');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "imageReadiness" "ImageReadinessStatus" NOT NULL DEFAULT 'blocked';

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN "role" "ProductImageRole" NOT NULL DEFAULT 'extra';

-- Backfill existing products based on current image counts.
UPDATE "Product" p
SET "imageReadiness" = CASE
  WHEN image_counts.count >= 7 THEN 'ready'::"ImageReadinessStatus"
  WHEN image_counts.count >= 3 THEN 'draft'::"ImageReadinessStatus"
  ELSE 'blocked'::"ImageReadinessStatus"
END
FROM (
  SELECT "productId", COUNT(*)::int AS count
  FROM "ProductImage"
  GROUP BY "productId"
) image_counts
WHERE p."id" = image_counts."productId";

