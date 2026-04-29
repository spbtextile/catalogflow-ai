import type { ImageReadinessStatus, ProductImageRole } from "@prisma/client";

export const MINIMUM_LISTING_IMAGES = 3;
export const RECOMMENDED_LISTING_IMAGES = 7;
export const MAX_MARKETPLACE_IMAGES = 8;

export const IMAGE_ROLE_OPTIONS: Array<{ value: ProductImageRole; label: string; description: string }> = [
  { value: "main_front", label: "Main front", description: "Primary white-background front image." },
  { value: "back", label: "Back", description: "Back view." },
  { value: "side", label: "Side / angle", description: "Side or three-quarter angle." },
  { value: "detail", label: "Detail", description: "Fabric, print, stitching, or feature close-up." },
  { value: "lifestyle", label: "Lifestyle", description: "Model or usage image." },
  { value: "size_fit", label: "Size / fit", description: "Measurement, fit, or size information image." },
  { value: "pack_detail", label: "Pack / care", description: "Combo, pack, wash-care, or included-detail image." },
  { value: "extra", label: "Extra", description: "Optional extra marketplace image." },
];

export function evaluateImageReadiness(imageCount: number): {
  status: ImageReadinessStatus;
  label: string;
  message: string;
  canGenerateListing: boolean;
  isMarketplaceReady: boolean;
} {
  if (imageCount < MINIMUM_LISTING_IMAGES) {
    return {
      status: "blocked",
      label: "Blocked",
      message: `Need at least ${MINIMUM_LISTING_IMAGES} images before listing/export/push. Add ${MINIMUM_LISTING_IMAGES - imageCount} more.`,
      canGenerateListing: false,
      isMarketplaceReady: false,
    };
  }

  if (imageCount < RECOMMENDED_LISTING_IMAGES) {
    return {
      status: "draft",
      label: "Draft images",
      message: `${imageCount}/${RECOMMENDED_LISTING_IMAGES} recommended images. Listing can be drafted, but product is not marketplace-ready.`,
      canGenerateListing: true,
      isMarketplaceReady: false,
    };
  }

  return {
    status: "ready",
    label: "Marketplace-ready",
    message: `${Math.min(imageCount, MAX_MARKETPLACE_IMAGES)}/${RECOMMENDED_LISTING_IMAGES} required set complete. Up to ${MAX_MARKETPLACE_IMAGES} marketplace images will be used.`,
    canGenerateListing: true,
    isMarketplaceReady: true,
  };
}

export function imageRoleLabel(role: ProductImageRole) {
  return IMAGE_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

