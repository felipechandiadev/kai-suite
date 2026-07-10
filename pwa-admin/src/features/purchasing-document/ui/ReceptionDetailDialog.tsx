"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@kai/ui";
import { Button } from "@kai/ui";
import { Alert } from "@kai/ui";
import { getReceptionDetailForReturnAction } from "@/features/receptions/actions/reception.action";
import type { ReceptionDetailForReturn } from "@/features/receptions/types/reception.types";
import PurchasingProductLinesTable, {
  receptionLinesToRows,
} from "./PurchasingProductLinesTable";

type Props = {
  receptionId: string | null;
  open: boolean;
  onClose: () => void;
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso?.trim()) {
    return "—";
  }
  const d = new Date(iso.trim());
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return d.toLocaleString("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DTE_TYPE_LABEL: Record<string, string> = {
  invoice: "Factura",
  receipt: "Boleta",
  guide: "Guía",
  other: "Otro",
};

export default function ReceptionDetailDialog({ receptionId, open, onClose }: Props) {
  const [detail, setDetail] = useState<ReceptionDetailForReturn | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!receptionId?.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    const r = await getReceptionDetailForReturnAction(receptionId);
    if (r.success) {
      setDetail(r.reception);
    } else {
      setDetail(null);
      setError(r.error);
    }
    setLoading(false);
  }, [receptionId]);

  useEffect(() => {
    if (!open) {
      setDetail(null);
      setError(null);
      return;
    }
    void load();
  }, [open, load]);

  const lineRows = detail ? receptionLinesToRows(detail.lines) : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Detalle de recepción"
      size="lg"
      scroll="paper"
      data-test-id="reception-detail-dialog"
      actions={
        <Button variant="outlined" size="md" onClick={onClose} data-test-id="reception-detail-close">
          Cerrar
        </Button>
      }
      actionsJustify="end"
    >
      {loading ? (
        <LoadingState className="flex items-center justify-center py-4" label="Cargando recepción" />
      ) : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
      {detail && !loading ? (
        <div className="space-y-4">
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Folio recepción</dt>
              <dd className="font-medium text-foreground">
                {detail.folio || detail.documentNumber || "—"}
              </dd>
            </div>
            {(detail.supplierDocumentRef || detail.reference || detail.dteNumber) ? (
              <div>
                <dt className="text-muted-foreground">Doc. proveedor</dt>
                <dd className="text-foreground">
                  {detail.supplierDocumentRef || detail.reference || detail.dteNumber}
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Registro</dt>
              <dd className="text-foreground">{formatDateTime(detail.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Proveedor</dt>
              <dd className="text-foreground">{detail.supplierName || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Almacén</dt>
              <dd className="text-foreground">{detail.storageName || "—"}</dd>
            </div>
            {detail.dteType ? (
              <div>
                <dt className="text-muted-foreground">Tipo DTE</dt>
                <dd className="text-foreground">
                  {DTE_TYPE_LABEL[detail.dteType] ?? detail.dteType}
                </dd>
              </div>
            ) : null}
            {detail.dteNumber ? (
              <div>
                <dt className="text-muted-foreground">Folio DTE</dt>
                <dd className="text-foreground">{detail.dteNumber}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Neto recepción</dt>
              <dd className="tabular-nums text-foreground">{formatMoney(detail.subtotal ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total recepción</dt>
              <dd className="tabular-nums font-medium text-foreground">
                {formatMoney(detail.total ?? 0)}
              </dd>
            </div>
          </dl>
          {detail.notes ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Notas: </span>
              {detail.notes}
            </p>
          ) : null}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Productos recibidos</h3>
            {detail.storageName ? (
              <p className="mb-2 text-xs text-muted-foreground">
                Stock en <span className="font-medium text-foreground">{detail.storageName}</span>
                {" "}(unidad de inventario).
              </p>
            ) : null}
            <PurchasingProductLinesTable rows={lineRows} showStockImpact />
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
