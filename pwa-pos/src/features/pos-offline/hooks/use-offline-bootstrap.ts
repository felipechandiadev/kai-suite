"use client";

import { useCallback, useState } from "react";
import { runBootstrapCoordinator } from "../application/bootstrap-coordinator.usecase";
import type { OfflineBootstrapStatus } from "../domain/offline-bootstrap.types";

export type { OfflineBootstrapStatus };

const IDLE: OfflineBootstrapStatus = { fiscal: "idle", catalog: "idle", customers: "idle" };

/** @deprecated Use runBootstrapCoordinator */
export async function runOfflineBootstrap(
  pointOfSaleId: string,
  priceListId: string,
): Promise<OfflineBootstrapStatus> {
  return runBootstrapCoordinator(pointOfSaleId, priceListId);
}

export function useOfflineBootstrapRunner() {
  const [status, setStatus] = useState<OfflineBootstrapStatus>(IDLE);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (pointOfSaleId: string, priceListId: string) => {
    setLoading(true);
    setStatus({ fiscal: "loading", catalog: "loading", customers: "loading" });
    try {
      const next = await runBootstrapCoordinator(pointOfSaleId, priceListId, setStatus);
      setStatus(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, []);

  return { status, loading, run, reset: () => setStatus(IDLE) };
}
