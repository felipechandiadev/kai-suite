"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Dialog, DotProgress } from "@kai/ui";
import { getPosSaleReceiptPrintAction } from "@/features/pos-print/actions/pos-sale-receipt-print.action";
import type { PosSaleReceiptPrintDto } from "@/features/pos-print/types/pos-sale-receipt-print.types";
import { formatReceiptLineDisplayName } from "@/features/pos-print/lib/format-receipt-line-name";

const currencyFmt = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function formatMoney(n: number): string {
  return currencyFmt.format(Number.isFinite(n) ? n : 0);
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type Props = {
  open: boolean;
  transactionId: string | null;
  documentNumber?: string | null;
  onClose: () => void;
};

export function CashMovementSaleDetailDialog({
  open,
  transactionId,
  documentNumber,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PosSaleReceiptPrintDto | null>(null);

  useEffect(() => {
    if (!open || !transactionId?.trim()) {
      setLoading(false);
      setError(null);
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetail(null);
    void (async () => {
      const res = await getPosSaleReceiptPrintAction(transactionId.trim());
      if (cancelled) return;
      setLoading(false);
      if (!res.success) {
        setError(res.message ?? "No se pudo cargar el detalle de la venta");
        return;
      }
      setDetail(res.receipt);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, transactionId]);

  const title =
    documentNumber?.trim() || detail?.folio?.trim()
      ? `Detalle de venta · ${(documentNumber ?? detail?.folio ?? "").trim()}`
      : "Detalle de venta";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      actions={
        <Button type="button" variant="outlined" onClick={onClose}>
          Cerrar
        </Button>
      }
      data-test-id="cash-movement-sale-detail-dialog"
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <DotProgress />
        </div>
      ) : null}

      {error ? (
        <Alert variant="error" data-test-id="cash-movement-sale-detail-error">
          {error}
        </Alert>
      ) : null}

      {!loading && !error && detail ? (
        <div className="flex max-h-[min(70vh,560px)] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Folio
              </p>
              <p className="font-medium">{detail.folio.trim() || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Fecha
              </p>
              <p>{formatDateTime(detail.issuedAtIso)}</p>
            </div>
            {[detail.pos.branchName, detail.pos.pointOfSaleName].filter(Boolean).length > 0 ? (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Origen
                </p>
                <p>
                  {[detail.pos.branchName, detail.pos.pointOfSaleName]
                    .filter((x) => x && String(x).trim())
                    .join(" · ")}
                </p>
              </div>
            ) : null}
            {detail.customer?.name?.trim() || detail.customer?.document?.trim() ? (
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Cliente
                </p>
                <p>
                  {detail.customer?.name?.trim() || "—"}
                  {detail.customer?.document?.trim()
                    ? ` · ${detail.customer.document.trim()}`
                    : ""}
                </p>
              </div>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Productos
            </p>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[320px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Producto</th>
                    <th className="px-3 py-2 font-medium text-right">Cant.</th>
                    <th className="px-3 py-2 font-medium text-right">Precio</th>
                    <th className="px-3 py-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.lines.map((line, idx) => {
                    const name = formatReceiptLineDisplayName(
                      line.productName,
                      line.attributes,
                    );
                    const unit = line.unitSymbol?.trim() ? ` ${line.unitSymbol.trim()}` : "";
                    return (
                      <tr
                        key={idx}
                        className="border-b border-border/60 last:border-0"
                        data-test-id={`cash-movement-sale-detail-line-${idx}`}
                      >
                        <td className="px-3 py-2 align-top">{name}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right align-top tabular-nums">
                          {line.quantity}
                          {unit}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right align-top tabular-nums">
                          {formatMoney(line.unitPriceWithTax)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right align-top font-medium tabular-nums">
                          {formatMoney(line.lineGross)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {detail.promotions.length > 0 ? (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Promociones
              </p>
              <ul className="space-y-1 text-sm">
                {detail.promotions.map((p, idx) => (
                  <li key={idx} className="flex justify-between gap-2">
                    <span>
                      {p.code} {p.name}
                    </span>
                    <span className="tabular-nums">−{formatMoney(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Subtotal neto</span>
              <span className="tabular-nums">{formatMoney(detail.totals.subtotalNet)}</span>
            </div>
            <div className="mt-1 flex justify-between gap-2">
              <span className="text-muted-foreground">Impuestos</span>
              <span className="tabular-nums">{formatMoney(detail.totals.taxes)}</span>
            </div>
            {detail.totals.lineDiscounts > 0.01 ? (
              <div className="mt-1 flex justify-between gap-2">
                <span className="text-muted-foreground">Descuentos línea</span>
                <span className="tabular-nums">−{formatMoney(detail.totals.lineDiscounts)}</span>
              </div>
            ) : null}
            {detail.totals.orderDiscount > 0.01 ? (
              <div className="mt-1 flex justify-between gap-2">
                <span className="text-muted-foreground">Descuento orden</span>
                <span className="tabular-nums">−{formatMoney(detail.totals.orderDiscount)}</span>
              </div>
            ) : null}
            <div className="mt-2 flex justify-between gap-2 border-t border-border pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(detail.totals.total)}</span>
            </div>
          </div>

          {detail.payments.length > 0 || detail.totals.change > 0.01 ? (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pagos
              </p>
              <ul className="space-y-1 text-sm">
                {detail.payments.map((p, idx) => (
                  <li key={idx} className="flex justify-between gap-2">
                    <span>
                      {p.label}
                      {p.detail?.trim() ? (
                        <span className="block text-xs text-muted-foreground">{p.detail}</span>
                      ) : null}
                    </span>
                    <span className="tabular-nums">{formatMoney(p.amount)}</span>
                  </li>
                ))}
                {detail.totals.change > 0.01 ? (
                  <li className="flex justify-between gap-2">
                    <span>Vuelto</span>
                    <span className="tabular-nums">{formatMoney(detail.totals.change)}</span>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
