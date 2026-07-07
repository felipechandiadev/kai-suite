"use client";

import { useCallback, useState } from "react";
import { downloadFiscalPackForPos } from "../application/download-fiscal-pack.usecase";
import { downloadCatalogSnapshotForPos } from "../application/download-catalog-snapshot.usecase";

export type OfflineBootstrapStatus = {
  fiscal: "idle" | "loading" | "ok" | "error";
  catalog: "idle" | "loading" | "ok" | "error";
  fiscalMessage?: string;
  catalogMessage?: string;
  catalogTotal?: number;
};

const IDLE: OfflineBootstrapStatus = { fiscal: "idle", catalog: "idle" };

export async function runOfflineBootstrap(
  pointOfSaleId: string,
  priceListId: string,
): Promise<OfflineBootstrapStatus> {
  const [fiscalRes, catalogRes] = await Promise.all([
    downloadFiscalPackForPos(pointOfSaleId),
    downloadCatalogSnapshotForPos(pointOfSaleId, priceListId),
  ]);
  return {
    fiscal: fiscalRes.success ? "ok" : "error",
    catalog: catalogRes.success ? "ok" : "error",
    fiscalMessage: fiscalRes.success ? undefined : fiscalRes.message,
    catalogMessage: catalogRes.success ? undefined : catalogRes.message,
    catalogTotal: catalogRes.success ? catalogRes.total : undefined,
  };
}

export function useOfflineBootstrapRunner() {
  const [status, setStatus] = useState<OfflineBootstrapStatus>(IDLE);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (pointOfSaleId: string, priceListId: string) => {
    setLoading(true);
    setStatus({ fiscal: "loading", catalog: "loading" });
    try {
      const next = await runOfflineBootstrap(pointOfSaleId, priceListId);
      setStatus(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, run, reset: () => setStatus(IDLE) };
}
