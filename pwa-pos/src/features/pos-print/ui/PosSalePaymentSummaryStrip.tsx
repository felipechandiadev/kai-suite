"use client";

import type { PosSaleReceiptData } from "@/app/(pos)/pos/payment/ui/PosSaleReceiptDialog";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(n) || 0));
}

function dueLabel(data: PosSaleReceiptData): string {
  if (data.ncPayout?.length) return "Total a devolver";
  if (data.documentKind === "backorder") return "Abono a pagar";
  if (data.quotaCollection?.length || data.arCollection?.length) return "Total a cobrar";
  if (data.collectionPending) return "Total a pagar";
  return "Total a pagar";
}

function receivedLabel(data: PosSaleReceiptData): string {
  if (data.ncPayout?.length) return "Total entregado";
  return "Total recibido";
}

type Props = {
  data: PosSaleReceiptData;
  "data-test-id"?: string;
};

/**
 * Resumen monetario compacto (misma UI que cabecera «Venta en curso» en `/pos/payment`).
 * Se muestra en diálogos de venta registrada / reimpresión, sobre el selector de comprobante.
 */
export function PosSalePaymentSummaryStrip({
  data,
  "data-test-id": dataTestId = "pos-sale-payment-summary-strip",
}: Props) {
  const totalDue = Number(data.totals.total) || 0;
  const received = Number(data.totals.paid) || 0;
  const change = Number(data.totals.change) || 0;
  const remaining = Math.max(0, totalDue - received);

  return (
    <div
      className="flex flex-wrap items-stretch gap-2 text-sm"
      data-test-id={dataTestId}
    >
      <div className="flex min-w-32 flex-1 flex-col rounded-lg bg-slate-100/80 px-3 py-2 dark:bg-slate-800/40">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 sm:text-base">
          {dueLabel(data)}
        </span>
        <span className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100 sm:text-2xl">
          {formatMoney(totalDue)}
        </span>
      </div>
      <div className="flex min-w-32 flex-1 flex-col rounded-lg bg-sky-100/70 px-3 py-2 dark:bg-sky-900/30">
        <span className="text-sm font-medium text-sky-700 dark:text-sky-300 sm:text-base">
          {receivedLabel(data)}
        </span>
        <span className="text-xl font-bold tabular-nums text-sky-900 dark:text-sky-100 sm:text-2xl">
          {formatMoney(received)}
        </span>
      </div>
      {remaining > 0.01 ? (
        <div className="flex min-w-32 flex-1 flex-col rounded-lg bg-amber-100/70 px-3 py-2 dark:bg-amber-900/30">
          <span className="text-sm font-medium text-amber-800 dark:text-amber-300 sm:text-base">
            Saldo restante
          </span>
          <span className="text-xl font-bold tabular-nums text-amber-900 dark:text-amber-100 sm:text-2xl">
            {formatMoney(remaining)}
          </span>
        </div>
      ) : null}
      {change > 0.01 ? (
        <div className="flex min-w-32 flex-1 flex-col rounded-lg bg-emerald-100/70 px-3 py-2 dark:bg-emerald-900/30">
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300 sm:text-base">
            Vuelto
          </span>
          <span className="text-xl font-bold tabular-nums text-emerald-900 dark:text-emerald-100 sm:text-2xl">
            {formatMoney(change)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
