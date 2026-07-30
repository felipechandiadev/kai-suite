import { posOfflineBackendFetch } from "./backend-api-client";
import type { OfflineCatalogSnapshotApiResponse } from "../domain/offline-catalog.types";

export async function fetchOfflineCatalogSnapshot(
  pointOfSaleId: string,
  params: { priceListId: string; cursor?: string; limit?: number },
) {
  const qs = new URLSearchParams({ priceListId: params.priceListId });
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));
  return posOfflineBackendFetch<OfflineCatalogSnapshotApiResponse>(
    `/api/points-of-sale/${encodeURIComponent(pointOfSaleId)}/offline-catalog-snapshot?${qs}`,
  );
}
