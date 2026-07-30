import { posOfflineBackendFetch } from "./backend-api-client";
import type { OfflineFiscalPackApiResponse } from "../domain/offline-fiscal-pack.types";

export async function fetchOfflineFiscalPack(pointOfSaleId: string) {
  return posOfflineBackendFetch<OfflineFiscalPackApiResponse>(
    `/api/points-of-sale/${encodeURIComponent(pointOfSaleId)}/offline-fiscal-pack`,
    { method: "GET" },
  );
}
