"use client";

import type { StockGridRow, StockStorageBreakdownRow } from "../types/stock-grid.types";
import { IconButton } from "@kai/ui";
import { Switch } from "@kai/ui";
import {
  computeStorageThresholdAlert,
  labelStorageThresholdAlert,
  STOCK_THRESHOLD_ALERT_CARD_CLASS,
} from "../lib/stock-threshold-alert";
import {
  formatStockSlashPair,
  stockUnitDiffersFromSale,
  unitLabelSymbol,
  usesSaleUnitCount,
} from "../lib/stock-unit-display";
import { StockThresholdBadge } from "./StockThresholdBadge";

export type StockStorageCardActions = {
  busy: boolean;
  countInSaleUnits: boolean;
  canTransfer: boolean;
  onOpenReservations: (row: StockGridRow, b: StockStorageBreakdownRow) => void;
  onCountInSaleUnitsChange: (saleUnits: boolean) => void;
  onRecount: (p: {
    variantId: string;
    storageId: string;
    title: string;
    currentQty: number;
  }) => void;
  onQuickDelta: (p: {
    variantId: string;
    storageId: string;
    currentQty: number;
    delta: number;
  }) => void;
  onTransfer: (p: {
    variantId: string;
    sourceStorageId: string;
    sourceLabel: string;
  }) => void;
};

export type StockStorageCardProps = {
  row: StockGridRow;
  breakdown: StockStorageBreakdownRow;
  interactive?: boolean;
  actions?: StockStorageCardActions;
  "data-test-id"?: string;
};

export function StockStorageCard({
  row,
  breakdown: b,
  interactive = true,
  actions,
  "data-test-id": dataTestId,
}: StockStorageCardProps) {
  const title = [b.storageName, b.branchName].filter(Boolean).join(" · ");
  const stockSym = unitLabelSymbol(row, "stock");
  const saleSym = unitLabelSymbol(row, "sale");
  const showUnitSwitch = interactive && usesSaleUnitCount(row) && stockUnitDiffersFromSale(row);
  const min = b.effectiveMinimumStock;
  const max = b.effectiveMaximumStock;
  const reorder = b.effectiveReorderPoint;
  const thresholdAlert = computeStorageThresholdAlert({
    physical: b.quantity,
    minimum: b.effectiveMinimumStock ?? min,
    minimumEnabled: b.effectiveMinimumStockEnabled,
    maximum: b.effectiveMaximumStock ?? max,
    maximumEnabled: b.effectiveMaximumStockEnabled,
    reorder: b.effectiveReorderPoint ?? reorder,
    reorderEnabled: b.effectiveReorderPointEnabled,
  });

  const testBase = dataTestId ?? `stock-storage-card-${row.variantId}-${b.storageId}`;

  return (
    <article
      className={`flex min-w-0 flex-col gap-2 rounded-xl border p-3 shadow-sm ${
        thresholdAlert ? STOCK_THRESHOLD_ALERT_CARD_CLASS : "border-border bg-background"
      }`}
      data-test-id={testBase}
      data-threshold-alert={thresholdAlert ?? undefined}
      title={thresholdAlert ? labelStorageThresholdAlert(thresholdAlert) : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-foreground" title={title}>
            {b.storageName}
          </h4>
          {b.branchName ? <p className="text-xs text-muted-foreground">{b.branchName}</p> : null}
        </div>
        <div
          className="flex max-w-[58%] shrink-0 flex-wrap items-center justify-end gap-1"
          data-test-id={`stock-thresholds-${b.storageId}`}
        >
          <StockThresholdBadge
            abbr="Mín"
            label="Mínimo"
            value={min}
            enabled={b.effectiveMinimumStockEnabled}
            data-test-id={`stock-threshold-min-${b.storageId}`}
          />
          <StockThresholdBadge
            abbr="Máx"
            label="Máximo"
            value={max}
            enabled={b.effectiveMaximumStockEnabled}
            data-test-id={`stock-threshold-max-${b.storageId}`}
          />
          <StockThresholdBadge
            abbr="Rep"
            label="Punto de reposición"
            value={reorder}
            enabled={b.effectiveReorderPointEnabled}
            data-test-id={`stock-threshold-rep-${b.storageId}`}
          />
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Físico</dt>
        <dd
          className="text-right font-mono tabular-nums text-foreground"
          title={
            stockUnitDiffersFromSale(row)
              ? `${unitLabelSymbol(row, "stock")} (base) / ${unitLabelSymbol(row, "sale")} (venta)`
              : row.unitOfMeasure || undefined
          }
        >
          {formatStockSlashPair(b.quantity, row)}
        </dd>
        <dt className="flex items-center gap-1 text-muted-foreground">
          <span>Reservado</span>
          {interactive && actions && b.reservedStock > 0 ? (
            <IconButton
              icon="Info"
              variant="neutral"
              size="xs"
              ariaLabel="Ver detalle de reservas"
              title="Ver detalle de reservas"
              onClick={() => actions.onOpenReservations(row, b)}
              data-test-id={`stock-reserved-detail-${row.variantId}-${b.storageId}`}
            />
          ) : null}
        </dt>
        <dd className="text-right font-mono tabular-nums text-foreground">
          {formatStockSlashPair(b.reservedStock, row)}
        </dd>
        <dt className="text-muted-foreground">Disponible</dt>
        <dd
          className={`text-right font-mono tabular-nums ${
            b.availableStock < 0 ? "text-destructive" : "text-foreground"
          }`}
          title={
            stockUnitDiffersFromSale(row)
              ? `${unitLabelSymbol(row, "stock")} (base) / ${unitLabelSymbol(row, "sale")} (venta)`
              : row.unitOfMeasure || undefined
          }
        >
          {formatStockSlashPair(b.availableStock, row)}
        </dd>
      </dl>
      {interactive && actions ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
          {showUnitSwitch ? (
            <Switch
              density="compact"
              checked={actions.countInSaleUnits}
              onChange={actions.onCountInSaleUnitsChange}
              disabled={actions.busy}
              optionLabels={{
                off: stockSym || "Stock",
                on: saleSym || "Venta",
              }}
              data-test-id={`stock-unit-switch-${b.storageId}`}
            />
          ) : (
            <span className="min-w-0 flex-1" aria-hidden />
          )}
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-0.5">
            <IconButton
              icon="RefreshCcw"
              variant="action"
              size="sm"
              ariaLabel="Reconteo"
              disabled={actions.busy}
              onClick={() =>
                actions.onRecount({
                  variantId: row.variantId,
                  storageId: b.storageId,
                  title,
                  currentQty: b.quantity,
                })
              }
              data-test-id={`stock-recount-${b.storageId}`}
            />
            <IconButton
              icon="Minus"
              variant="action"
              size="sm"
              ariaLabel="Disminuir stock"
              disabled={actions.busy || b.quantity <= 0}
              onClick={() =>
                actions.onQuickDelta({
                  variantId: row.variantId,
                  storageId: b.storageId,
                  currentQty: b.quantity,
                  delta: -1,
                })
              }
              data-test-id={`stock-decrease-${b.storageId}`}
            />
            <IconButton
              icon="Plus"
              variant="action"
              size="sm"
              ariaLabel="Aumentar stock"
              disabled={actions.busy}
              onClick={() =>
                actions.onQuickDelta({
                  variantId: row.variantId,
                  storageId: b.storageId,
                  currentQty: b.quantity,
                  delta: 1,
                })
              }
              data-test-id={`stock-increase-${b.storageId}`}
            />
            <IconButton
              icon="ArrowLeftRight"
              variant="action"
              size="sm"
              ariaLabel="Transferir stock"
              disabled={actions.busy || !actions.canTransfer}
              onClick={() =>
                actions.onTransfer({
                  variantId: row.variantId,
                  sourceStorageId: b.storageId,
                  sourceLabel: title,
                })
              }
              data-test-id={`stock-transfer-open-${b.storageId}`}
            />
          </div>
        </div>
      ) : null}
    </article>
  );
}
