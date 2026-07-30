export type MultimediaEntityType =
  | "product"
  | "product-variant"
  | "company"
  | "brand"
  | "e-shop-testimonial"
  | "e-shop-hero-slide"
  | "employee";

export type MultimediaAssetListItem = {
  id: string;
  publicUrl: string;
  mimeType: string;
  kind: string;
  /** Solo si el backend envía el flag (links por entidad). */
  isPrimary?: boolean;
  sortOrder?: number;
  linkId?: string;
  /** Preferido en grids / slots; cae a publicUrl si no hay variantes. */
  thumbnailUrl?: string | null;
};

/** Src para listados (thumb) vs detalle (full / publicUrl). */
export function pickMultimediaSrc(
  asset: Pick<MultimediaAssetListItem, "publicUrl" | "thumbnailUrl">,
  prefer: "thumb" | "full" = "full",
): string {
  if (prefer === "thumb") {
    return (asset.thumbnailUrl?.trim() || asset.publicUrl).trim();
  }
  return asset.publicUrl.trim();
}
