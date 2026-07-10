"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@kai/ui";
import { Button } from "@kai/ui";
import { getFiscalPackLedgerSummaryAction, getFiscalSubPackLedgerSummaryAction } from "../actions/fiscal.actions";
import type { FiscalEmissionRow, FiscalPackLedgerSummary } from "../types/fiscal.types";
import { FiscalEmissionsGridCore } from "./FiscalEmissionsGridCore";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  cafId?: string;
  allocationId?: string;
  folioFrom?: number;
  folioTo?: number;
  pointOfSaleId?: string;
  initialEmissions?: FiscalEmissionRow[];
  initialTotal?: number;
};

export function FolioLedgerDialog({
  open,
  onClose,
  title,
  cafId,
  allocationId,
  folioFrom,
  folioTo,
  pointOfSaleId,
  initialEmissions = [],
  initialTotal = 0,
}: Props) {
  const [summary, setSummary] = useState<FiscalPackLedgerSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    void (async () => {
      const res = allocationId
        ? await getFiscalSubPackLedgerSummaryAction(allocationId)
        : cafId
          ? await getFiscalPackLedgerSummaryAction(cafId)
          : { success: false as const, error: "Sin contexto de paquete" };
      if (cancelled) return;
      setLoading(false);
      if (!res.success) {
        setError(res.error);
        setSummary(null);
        return;
      }
      setSummary(res.summary);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, cafId, allocationId]);

  const fixedFilters = useMemo(
    () => ({
      cafId,
      allocationId,
      folioFrom,
      folioTo,
      pointOfSaleId,
    }),
    [cafId, allocationId, folioFrom, folioTo, pointOfSaleId],
  );

  const gridKey = `${cafId ?? ""}:${allocationId ?? ""}:${folioFrom ?? ""}:${folioTo ?? ""}:${pointOfSaleId ?? ""}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      scroll="paper"
      maxHeight="min(92vh, 900px)"
      data-test-id="folio-ledger-dialog"
      actions={
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando resumen…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : summary ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <Kpi label="Total rango" value={String(summary.total)} />
            <Kpi label="Emitidos" value={String(summary.emittedCount)} />
            <Kpi label="Disponibles" value={String(summary.available)} />
            <Kpi label="Siguiente folio" value={String(summary.nextFolio)} />
          </div>
        ) : null}

        {open ? (
          <FiscalEmissionsGridCore
            key={gridKey}
            initialItems={initialEmissions}
            initialTotal={initialTotal}
            fixedFilters={fixedFilters}
            embedded
            showFilters={false}
            autoLoad
            title="Emisiones en este rango"
          />
        ) : null}
      </div>
    </Dialog>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
