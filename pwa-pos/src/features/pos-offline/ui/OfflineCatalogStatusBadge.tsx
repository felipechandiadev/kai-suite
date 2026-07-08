"use client";

import { useEffect, useState } from "react";
import { readPosContextClient, POS_CONTEXT_CHANGED_EVENT } from "@/features/session/lib/pos-context-storage";
import {
  formatCatalogAge,
  getOfflineCatalogStatus,
} from "@/features/pos-offline/application/catalog-readiness.usecase";

export function OfflineCatalogStatusBadge() {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const refresh = async () => {
      const ctx = readPosContextClient();
      const posId = ctx?.pointOfSaleId?.trim();
      const priceListId = ctx?.priceListId?.trim();
      if (!posId || !priceListId) {
        setLabel(null);
        return;
      }
      const status = await getOfflineCatalogStatus(posId, priceListId);
      if (!status.ready || status.rowCount <= 0) {
        setLabel("Catálogo: pendiente");
        return;
      }
      const age = formatCatalogAge(status.snapshotAt);
      setLabel(age ? `Catálogo: ${status.rowCount} · ${age}` : `Catálogo: ${status.rowCount}`);
    };

    void refresh();
    const interval = setInterval(() => void refresh(), 60_000);
    window.addEventListener(POS_CONTEXT_CHANGED_EVENT, () => void refresh());
    return () => {
      clearInterval(interval);
      window.removeEventListener(POS_CONTEXT_CHANGED_EVENT, () => void refresh());
    };
  }, []);

  if (!label) return null;

  return (
    <span
      className="hidden lg:inline text-xs text-muted-foreground whitespace-nowrap"
      title="Estado del catálogo offline local"
    >
      {label}
    </span>
  );
}
