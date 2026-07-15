"use client";

import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@kai/ui";
import type {
  DeliveryOperationsOrder,
  DeliveryOperationsStatus,
} from "@/features/e-shop-delivery/types/delivery.types";
import { OperationsChip } from "./OperationsChip";
import {
  advanceActionLabel,
  formatCurrency,
  primaryNextStatus,
  STATUS_ICONS,
  statusLabel,
} from "./operations.utils";

type OperationsKanbanCardProps = {
  order: DeliveryOperationsOrder;
  columnStage: DeliveryOperationsStatus;
  pending: boolean;
  isActive: boolean;
  selected: boolean;
  searchHighlight: boolean;
  routeStarted: boolean;
  onToggleSelect: (orderId: string) => void;
  onAdvance: (orderId: string, nextStatus: DeliveryOperationsStatus) => void;
  onToggleLinePicked: (
    orderId: string,
    lineId: string,
    isPicked: boolean,
  ) => void;
  onPickAllLines: (orderId: string, advanceTo?: "READY_FOR_DISPATCH") => void;
};

function ctaTargetStatus(
  columnStage: DeliveryOperationsStatus,
  nextStatus: DeliveryOperationsStatus | null,
): DeliveryOperationsStatus | null {
  if (columnStage === "CONFIRMED") return "PREPARING";
  if (columnStage === "PREPARING") return "READY_FOR_DISPATCH";
  return nextStatus;
}

export function OperationsKanbanCard({
  order,
  columnStage,
  pending,
  isActive,
  selected,
  searchHighlight,
  routeStarted,
  onToggleSelect,
  onAdvance,
  onToggleLinePicked,
  onPickAllLines,
}: OperationsKanbanCardProps) {
  const [expanded, setExpanded] = useState(false);

  const nextStatus = primaryNextStatus(
    order.deliveryStatus,
    order.allowedNextStatuses,
  );
  const canPickLines =
    columnStage === "CONFIRMED" || columnStage === "PREPARING";
  const lineCount = order.lineCount ?? order.lines.length;
  const pickedCount = order.pickedCount ?? 0;
  const allLinesPicked = lineCount > 0 && pickedCount >= lineCount;
  const progress = lineCount > 0 ? Math.round((pickedCount / lineCount) * 100) : 0;

  const subtotal = order.lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const total = subtotal + order.shippingFee;

  function handlePrimaryAction() {
    if (columnStage === "CONFIRMED") {
      onAdvance(order.id, "PREPARING");
      return;
    }
    if (columnStage === "PREPARING") {
      onPickAllLines(order.id, "READY_FOR_DISPATCH");
      return;
    }
    if (nextStatus && nextStatus !== "ISSUE") {
      onAdvance(order.id, nextStatus);
    }
  }

  const primaryLabel =
    columnStage === "CONFIRMED"
      ? "Iniciar preparación"
      : columnStage === "PREPARING"
        ? "Marcar listo"
        : nextStatus
          ? advanceActionLabel(nextStatus)
          : null;

  const primaryDisabled =
    pending ||
    (columnStage === "PREPARING" && !allLinesPicked) ||
    (columnStage === "READY_FOR_DISPATCH" &&
      nextStatus === "IN_TRANSIT" &&
      !routeStarted);

  const targetStatus = ctaTargetStatus(columnStage, nextStatus);
  const TargetStatusIcon = targetStatus ? STATUS_ICONS[targetStatus] : null;

  return (
    <article
      className={`rounded-xl border bg-card shadow-sm transition-all ${
        selected
          ? "border-primary ring-1 ring-primary/30"
          : searchHighlight
            ? "border-primary/40 ring-1 ring-primary/20"
            : "border-border"
      } ${isActive ? "opacity-60" : ""}`}
    >
      <div className="p-3">
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(order.id)}
            aria-label={`Seleccionar pedido ${order.orderNumber}`}
            className="mt-1 size-4 shrink-0 rounded border-border"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1">
                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    (order.sourceChannel ?? "ESHOP") === "POS"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-sky-100 text-sky-900"
                  }`}
                  data-test-id="order-source-channel"
                >
                  {(order.sourceChannel ?? "ESHOP") === "POS" ? "POS" : "eShop"}
                </span>
                <button
                  type="button"
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-expanded={expanded}
                  aria-label={expanded ? "Contraer detalle" : "Expandir detalle"}
                  onClick={() => setExpanded((value) => !value)}
                >
                  <ChevronDown
                    className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </button>
                <span className="truncate text-lg font-bold tabular-nums text-foreground">
                  #{order.orderNumber}
                </span>
              </div>
              {primaryLabel && targetStatus ? (
                <Button
                  type="button"
                  variant="outlined"
                  size="sm"
                  className="!inline-flex !h-7 !min-h-0 shrink-0 items-center gap-1 rounded-full !px-2 !py-0.5"
                  disabled={primaryDisabled}
                  loading={isActive}
                  onClick={handlePrimaryAction}
                  aria-label={primaryLabel}
                  title={primaryLabel}
                >
                  <ArrowRight className="size-3.5 shrink-0" aria-hidden />
                  {TargetStatusIcon ? (
                    <TargetStatusIcon className="size-3.5 shrink-0" aria-hidden />
                  ) : null}
                </Button>
              ) : null}
            </div>
            <p className="truncate text-sm font-medium">{order.customerLabel}</p>
            {order.addressShort ? (
              <p className="truncate text-xs text-muted-foreground">
                {order.addressShort}
              </p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <OperationsChip>{statusLabel(order.deliveryStatus)}</OperationsChip>
              <span className="text-sm font-semibold tabular-nums">
                {formatCurrency(total)}
              </span>
              {lineCount > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {pickedCount}/{lineCount} ítems
                </span>
              ) : null}
            </div>
            {canPickLines && lineCount > 0 ? (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
          </div>
        </div>

        {expanded ? (
          <div className="mt-3 space-y-3 border-t border-border/70 pt-3">
            <ul className="space-y-2">
              {order.lines.map((line) => (
                <li
                  key={line.id}
                  className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                    line.isPicked
                      ? "border-primary/20 bg-primary/5"
                      : "border-border/70"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={line.isPicked}
                    disabled={
                      pending ||
                      (columnStage !== "CONFIRMED" && columnStage !== "PREPARING")
                    }
                    onChange={(event) =>
                      onToggleLinePicked(order.id, line.id, event.target.checked)
                    }
                    className="mt-0.5 size-4 shrink-0 rounded border-border"
                    aria-label={`Marcar ${line.productName}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-medium ${line.isPicked ? "text-muted-foreground line-through" : ""}`}
                    >
                      {line.productName}
                      {line.variantLabel ? (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {line.variantLabel}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {line.quantity} × {formatCurrency(line.unitPrice)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium tabular-nums">
                    {formatCurrency(line.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <p>
                Subtotal {formatCurrency(subtotal)} · Envío{" "}
                {formatCurrency(order.shippingFee)}
              </p>
              {order.commune ? (
                <p className="mt-0.5">Comuna: {order.commune}</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
