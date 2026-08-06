"use client";

import type { ReportSummaryDelta } from "@/shared/reports/types";

type Props = {
  label: string;
  formattedValue: string;
  delta: ReportSummaryDelta;
  helpSlot?: React.ReactNode;
  deltaSlot?: React.ReactNode;
  testId?: string;
};

/**
 * Bullet graph (Stephen Few): bandas cualitativas, barra de medida y marcador de comparación.
 */
export function KpiBulletChart({
  label,
  formattedValue,
  delta,
  helpSlot,
  deltaSlot,
  testId,
}: Props) {
  const current = Number.isFinite(delta.current) ? delta.current : 0;
  const previous = Number.isFinite(delta.previous) ? delta.previous : 0;
  const scale = Math.max(Math.abs(current), Math.abs(previous), 1);
  const measurePct = Math.min(100, (Math.abs(current) / scale) * 100);
  const markerPct = Math.min(100, (Math.abs(previous) / scale) * 100);

  return (
    <article
      className="break-inside-avoid rounded-xl border border-border/80 bg-background px-3.5 py-3 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] print:border-neutral-300 print:shadow-none"
      data-test-id={testId}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-center gap-1">
          <h4 className="truncate text-[11px] font-medium tracking-wide text-muted-foreground">
            {label}
          </h4>
          {helpSlot}
        </div>
        {deltaSlot}
      </header>

      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
        {formattedValue}
      </p>

      <svg
        className="mt-3 block h-5 w-full"
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${label}: ${formattedValue}`}
      >
        <rect x="0" y="4" width="60" height="12" fill="currentColor" className="text-muted-foreground/25" />
        <rect x="60" y="4" width="20" height="12" fill="currentColor" className="text-muted-foreground/15" />
        <rect x="80" y="4" width="20" height="12" fill="currentColor" className="text-muted-foreground/8" />
        <rect
          x="0"
          y="7"
          width={Math.max(measurePct, 0.4)}
          height="6"
          rx="1"
          fill="var(--color-primary, #002b59)"
        />
        <rect
          x={Math.max(0, markerPct - 0.6)}
          y="3"
          width="1.2"
          height="14"
          fill="var(--color-foreground, #1a1a1a)"
          opacity={0.85}
        />
      </svg>
    </article>
  );
}

/** Claves money/count densas aptas para bullet (ventas + compras + inventario). */
const BULLET_KPI_KEYS = new Set([
  "totalSales",
  "ticketCount",
  "avgTicket",
  "accountCount",
  "tipTotal",
  "grossMargin",
  "totalAmount",
  "amount",
  "quantity",
  "returnsTotal",
  "returnsCount",
  "salesTotal",
  "totalSalesB",
  "ticketCountB",
  "avgTicketB",
  "totalPurchases",
  "totalPayments",
  "purchaseCount",
  "paymentCount",
  "avgPurchase",
  "netTotal",
  "grossTotal",
  "taxTotal",
  "valorConPmp",
  "totalValor",
  "valorMovido",
  "qty",
  "netQty",
  "qtyIn",
  "qtyOut",
  "qtyNet",
  "qtyMoved",
  "qtyTotal",
  "lineEvents",
  "movementCount",
  "transferCount",
  "adjustmentCount",
]);

export function shouldUseKpiBullet(
  key: string,
  value: unknown,
  delta: ReportSummaryDelta | undefined,
): delta is ReportSummaryDelta {
  if (!delta) return false;
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (!BULLET_KPI_KEYS.has(key)) return false;
  return Number.isFinite(delta.current) && Number.isFinite(delta.previous);
}
