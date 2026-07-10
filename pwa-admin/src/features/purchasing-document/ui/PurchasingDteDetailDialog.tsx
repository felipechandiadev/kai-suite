"use client";
import { LoadingState } from '@kai/ui';

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@kai/ui";
import { Button } from "@kai/ui";
import { Alert } from "@kai/ui";
import { getPurchasingTransactionDetailAction } from "../actions/purchasing-detail.action";
import { getReceptionDetailForReturnAction } from "@/features/receptions/actions/reception.action";
import type { PurchasingTransactionDetail } from "../types/purchasing-detail.types";
import type { ReceptionDetailForReturn } from "@/features/receptions/types/reception.types";
import PurchasingProductLinesTable, {
  receptionLinesToRows,
  transactionLinesToRows,
} from "./PurchasingProductLinesTable";

type Props = {
  transactionId: string | null;
  open: boolean;
  onClose: () => void;
  /** Título del documento tributario (factura / boleta). */
  documentLabel: string;
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

export default function PurchasingDteDetailDialog({
  transactionId,
  open,
  onClose,
  documentLabel,
}: Props) {
  const [tx, setTx] = useState<PurchasingTransactionDetail | null>(null);
  const [reception, setReception] = useState<ReceptionDetailForReturn | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!transactionId?.trim()) {
      return;
    }
    setLoading(true);
    setError(null);
    setReception(null);
    const txRes = await getPurchasingTransactionDetailAction(transactionId);
    if (!txRes.success) {
      setTx(null);
      setError(txRes.error);
      setLoading(false);
      return;
    }
    setTx(txRes.data);
    const receptionId = txRes.data.receptionId;
    if (receptionId) {
      const recRes = await getReceptionDetailForReturnAction(receptionId);
      if (recRes.success) {
        setReception(recRes.reception);
      }
    }
    setLoading(false);
  }, [transactionId]);

  useEffect(() => {
    if (!open) {
      setTx(null);
      setReception(null);
      setError(null);
      return;
    }
    void load();
  }, [open, load]);

  const fiscalRows = tx ? transactionLinesToRows(tx.lines) : [];
  const receptionRows = reception ? receptionLinesToRows(reception.lines) : [];
  const showFiscalSection = fiscalRows.length > 0;
  const showReceptionSection = receptionRows.length > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Detalle — ${documentLabel}`}
      size="lg"
      scroll="paper"
      data-test-id="purchasing-dte-detail-dialog"
      actions={
        <Button
          variant="outlined"
          size="md"
          onClick={onClose}
          data-test-id="purchasing-dte-detail-close"
        >
          Cerrar
        </Button>
      }
      actionsJustify="end"
    >
      {loading ? <LoadingState className="flex items-center justify-center py-4" label="Cargando documento" /> : null}
      {error ? <Alert variant="error">{error}</Alert> : null}
      {tx && !loading ? (
        <div className="space-y-5">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Documento tributario</h3>
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Folio interno</dt>
                <dd className="font-medium text-foreground">
                  {tx.documentNumber || tx.id.slice(0, 8)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Registro</dt>
                <dd className="text-foreground">{formatDateTime(tx.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Proveedor</dt>
                <dd className="text-foreground">{tx.supplierLabel || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Folio DTE</dt>
                <dd className="text-foreground">
                  {tx.documentFolio || tx.externalReference || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Neto</dt>
                <dd className="tabular-nums text-foreground">{formatMoney(tx.subtotal)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">IVA</dt>
                <dd className="tabular-nums text-foreground">{formatMoney(tx.taxAmount)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total</dt>
                <dd className="tabular-nums font-medium text-foreground">
                  {formatMoney(tx.total)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Estado</dt>
                <dd className="text-foreground">{tx.status || "—"}</dd>
              </div>
            </dl>
            {showFiscalSection ? (
              <PurchasingProductLinesTable
                rows={fiscalRows}
                emptyMessage="Sin líneas en el documento tributario."
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                El documento tributario no incluye detalle por producto (registro resumen).
              </p>
            )}
          </section>

          {reception || tx.receptionId ? (
            <section className="space-y-2 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">
                Recepción asociada — productos
              </h3>
              {reception ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    {reception.documentNumber || reception.reference || reception.id.slice(0, 8)}
                    {reception.storageName ? ` · ${reception.storageName}` : ""}
                  </p>
                  <PurchasingProductLinesTable
                    rows={receptionRows}
                    emptyMessage="La recepción no tiene líneas de producto."
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No se pudo cargar la recepción vinculada.
                </p>
              )}
            </section>
          ) : (
            <p className="text-sm text-muted-foreground border-t border-border pt-4">
              Este documento no tiene una recepción vinculada en el sistema.
            </p>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
