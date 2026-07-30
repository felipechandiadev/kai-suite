"use server";

import { EShopPreviewRequest } from "../infrastructure/eshop-preview.request";

export async function getEShopCatalogProductPreviewAction(productId: string) {
  return EShopPreviewRequest.getCatalogProductPreview(productId);
}
