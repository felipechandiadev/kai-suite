import { useEffect, useState } from "react";
import { Alert, Button, Dialog } from "@kai/ui";
import { formatClp } from "@/lib/format";
import { toUserMessage } from "@/lib/errors";
import {
  fetchPrintSalePreview,
  printSaleTicket,
  type LitePrintPreview,
} from "@/sections/admin/api/lite-print.api";
import type { LitePrintCompanyHeader } from "../lib/print-company-header";
import { litePaymentLabel } from "../lib/lite-payment-labels";

export type LiteSaleReceiptPayment = {
  method: string;
  amount: number;
  reference?: string;
};

export type LiteSaleReceiptPayload = {
  saleId: string;
  total: number;
  change: number;
  methodLabel: string;
  payments: LiteSaleReceiptPayment[];
  lines: unknown;
  company?: LitePrintCompanyHeader;
  soldAt?: string | null;
  printError: string | null;
  preview: LitePrintPreview | null;
};

type Props = {
  open: boolean;
  data: LiteSaleReceiptPayload | null;
  onClose: () => void;
};

export function LiteSaleReceiptDialog({ open, data, onClose }: Props) {
  const [reprintBusy, setReprintBusy] = useState(false);
  const [reprintError, setReprintError] = useState<string | null>(null);
  const [preview, setPreview] = useState<LitePrintPreview | null>(null);

  useEffect(() => {
    setPreview(null);
    setReprintError(null);
  }, [data?.saleId, open]);

  useEffect(() => {
    if (!open || !data) return;
    const timer = window.setTimeout(() => {
      document
        .querySelector<HTMLButtonElement>('[data-test-id="lite-sale-receipt-close"]')
        ?.focus();
    }, 50);
    return () => window.clearTimeout(timer);
  }, [open, data]);

  useEffect(() => {
    if (!open || !data || reprintBusy) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-test-id='lite-sale-receipt-reprint']")) return;
      e.preventDefault();
      onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, data, reprintBusy, onClose]);

  const activePreview = preview ?? data?.preview ?? null;
  const cols = activePreview?.cols ?? 42;

  async function handleReprint() {
    if (!data) return;
    setReprintBusy(true);
    setReprintError(null);
    try {
      await printSaleTicket({
        saleId: data.saleId,
        total: data.total,
        method: data.methodLabel,
        lines: data.lines,
        company: data.company,
        soldAt: data.soldAt,
      });
      const next = await fetchPrintSalePreview({
        saleId: data.saleId,
        total: data.total,
        method: data.methodLabel,
        lines: data.lines,
        company: data.company,
        soldAt: data.soldAt,
      });
      setPreview(next);
    } catch (e) {
      setReprintError(toUserMessage(e));
    } finally {
      setReprintBusy(false);
    }
  }

  return (
    <Dialog
      open={open && data != null}
      onClose={onClose}
      title="Venta registrada"
      data-test-id="lite-sale-receipt-dialog"
      actions={
        <>
          <Button
            type="button"
            variant="outlined"
            loading={reprintBusy}
            onClick={() => void handleReprint()}
            data-test-id="lite-sale-receipt-reprint"
          >
            Reimprimir
          </Button>
          <Button
            type="button"
            onClick={onClose}
            data-test-id="lite-sale-receipt-close"
          >
            Cerrar
          </Button>
        </>
      }
    >
      {data ? (
        <div className="space-y-4">
          {data.printError ? (
            <Alert variant="warning">
              Impresión automática falló: {data.printError}
            </Alert>
          ) : null}
          {reprintError ? <Alert variant="error">{reprintError}</Alert> : null}

          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Total</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatClp(data.total)}
              </span>
            </div>
            {data.payments.map((p) => (
              <div
                key={`${p.method}-${p.amount}`}
                className="flex justify-between gap-2"
                data-test-id={`lite-sale-receipt-pay-${p.method}`}
              >
                <span className="text-muted-foreground">
                  {litePaymentLabel(p.method)}
                  {p.reference?.trim() ? ` · ${p.reference.trim()}` : ""}
                </span>
                <span className="font-mono tabular-nums">{formatClp(p.amount)}</span>
              </div>
            ))}
            {data.change > 0 ? (
              <div
                className="flex justify-between gap-2 border-t border-border pt-2 font-semibold"
                data-test-id="lite-sale-receipt-change"
              >
                <span>Vuelto</span>
                <span className="font-mono tabular-nums">{formatClp(data.change)}</span>
              </div>
            ) : null}
          </div>

          {activePreview ? (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">
                {activePreview.paperProfile} · {activePreview.cols} columnas ·{" "}
                {activePreview.textEncoding}
              </p>
              <div className="flex justify-center overflow-x-auto rounded-md bg-neutral-900 p-4">
                <pre
                  className="whitespace-pre-wrap wrap-break-word font-mono text-[11px] leading-snug text-neutral-100"
                  style={{ width: `${cols}ch`, maxWidth: "100%" }}
                  data-test-id="lite-sale-receipt-preview"
                >
                  {activePreview.text}
                </pre>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin vista previa del ticket.</p>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
