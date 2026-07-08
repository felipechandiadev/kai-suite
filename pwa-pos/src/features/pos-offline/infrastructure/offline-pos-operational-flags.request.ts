import { posOfflineBackendFetch } from "./backend-api-client";

type PosOperationalFlagsApiResponse = {
  success?: boolean;
  pointOfSale?: {
    deferredPaymentEnabled?: boolean;
  };
};

export async function fetchPosOperationalFlags(pointOfSaleId: string) {
  return posOfflineBackendFetch<PosOperationalFlagsApiResponse>(
    `/api/points-of-sale/${encodeURIComponent(pointOfSaleId)}`,
    { method: "GET" },
  );
}
