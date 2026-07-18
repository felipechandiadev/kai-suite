"use client";

import { useMemo, useState } from "react";
import { IconButton } from "@kai/ui";
import {
  canCancelDiningLine,
  canSendDiningLineToKitchen,
  groupDiningOrderLines,
  type DiningLineGroup,
} from "@/features/dining/lib/group-dining-order-lines";
import { kitchenItemStatusLabel } from "@/features/dining/lib/dining-status-labels";
import type { PosDiningOrderLine } from "@/features/dining/types/dining-pos.types";
import type { PosProductAttribute } from "@/features/pos-products/types/pos-product.types";
import { PosProductNameWithAttributes } from "@/features/pos-products/ui/posProductPreview";

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function formatQty(n: number) {
  return new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 3,
  }).format(n);
}

export type DiningLineProductMeta = {
  name: string;
  attributes?: PosProductAttribute[];
  unitPrice: number;
};

type Props = {
  lines: PosDiningOrderLine[];
  productByVariantId: Record<string, DiningLineProductMeta>;
  disabled?: boolean;
  busy?: boolean;
  onSendLines: (lineIds: string[]) => void;
  onCancelLines: (lineIds: string[]) => void;
};

export function PosDiningOrderLineGroups({
  lines,
  productByVariantId,
  disabled = false,
  busy = false,
  onSendLines,
  onCancelLines,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const groups = useMemo(() => groupDiningOrderLines(lines), [lines]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (groups.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2" data-test-id="pos-dining-detail-lines">
      {groups.map((group) => (
        <GroupCard
          key={group.key}
          group={group}
          product={productByVariantId[group.productVariantId]}
          isExpanded={expanded.has(group.key)}
          canExpand={group.lines.length > 1}
          disabled={disabled}
          busy={busy}
          onToggle={() => toggle(group.key)}
          onSendLines={onSendLines}
          onCancelLines={onCancelLines}
        />
      ))}
    </ul>
  );
}

function GroupCard({
  group,
  product,
  isExpanded,
  canExpand,
  disabled,
  busy,
  onToggle,
  onSendLines,
  onCancelLines,
}: {
  group: DiningLineGroup;
  product?: DiningLineProductMeta;
  isExpanded: boolean;
  canExpand: boolean;
  disabled: boolean;
  busy: boolean;
  onToggle: () => void;
  onSendLines: (lineIds: string[]) => void;
  onCancelLines: (lineIds: string[]) => void;
}) {
  const unitPrice = product?.unitPrice ?? 0;
  const totalPrice = unitPrice * group.quantityTotal;
  const showHeaderActions = !isExpanded || !canExpand;
  const canSend = canSendDiningLineToKitchen(group.kitchenStatus);
  const canCancel = canCancelDiningLine(group.kitchenStatus);
  const name = product?.name ?? "Producto";

  return (
    <li
      className="rounded-lg border border-border bg-surface px-2 py-2 text-sm"
      data-test-id={`pos-dining-line-group-${group.key}`}
    >
      <div className="flex items-start gap-1">
        {canExpand ? (
          <IconButton
            icon={isExpanded ? "ChevronDown" : "ChevronRight"}
            variant="action"
            size="sm"
            className="mt-0.5 shrink-0"
            ariaLabel={isExpanded ? "Contraer ítems" : "Expandir ítems"}
            title={isExpanded ? "Contraer" : "Expandir"}
            disabled={disabled}
            onClick={onToggle}
            data-test-id={`pos-dining-line-group-toggle-${group.key}`}
          />
        ) : (
          <span className="mt-0.5 inline-block w-7 shrink-0" aria-hidden />
        )}

        {showHeaderActions ? (
          <div className="mt-0.5 flex shrink-0 items-center gap-0.5">
            {canSend ? (
              <IconButton
                icon="ChefHat"
                variant="action"
                size="sm"
                ariaLabel="Enviar a cocina"
                title="Enviar a cocina"
                disabled={disabled || busy}
                isLoading={busy}
                onClick={() => onSendLines(group.lines.map((l) => l.id))}
                data-test-id={`pos-dining-line-group-send-${group.key}`}
              />
            ) : null}
            {canCancel ? (
              <IconButton
                icon="Trash2"
                variant="action"
                size="sm"
                ariaLabel="Eliminar ítems"
                title="Eliminar"
                disabled={disabled || busy}
                onClick={() => onCancelLines(group.lines.map((l) => l.id))}
                data-test-id={`pos-dining-line-group-cancel-${group.key}`}
              />
            ) : null}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <PosProductNameWithAttributes
            name={name}
            attributes={product?.attributes}
            className="text-sm font-medium leading-snug text-foreground"
          />
          <p className="text-[11px] text-muted-foreground">
            {kitchenItemStatusLabel(group.kitchenStatus)}
            {group.notes ? ` · ${group.notes}` : ""}
          </p>
        </div>

        <div className="shrink-0 text-right tabular-nums">
          <p className="font-semibold">{formatQty(group.quantityTotal)}</p>
          <p className="text-[11px] text-muted-foreground">{formatMoney(totalPrice)}</p>
        </div>
      </div>

      {isExpanded && canExpand ? (
        <ul className="mt-2 space-y-1.5 border-t border-border pt-2 pl-7">
          {group.lines.map((line) => {
            const qty = Number(line.quantity) || 0;
            const lineSend = canSendDiningLineToKitchen(line.kitchenStatus);
            const lineCancel = canCancelDiningLine(line.kitchenStatus);
            return (
              <li
                key={line.id}
                className="flex items-start gap-1 rounded-md bg-muted/30 px-2 py-1.5"
                data-test-id={`pos-dining-line-item-${line.id}`}
              >
                <div className="flex shrink-0 items-center gap-0.5">
                  {lineSend ? (
                    <IconButton
                      icon="ChefHat"
                      variant="action"
                      size="sm"
                      ariaLabel="Enviar a cocina"
                      title="Enviar a cocina"
                      disabled={disabled || busy}
                      isLoading={busy}
                      onClick={() => onSendLines([line.id])}
                      data-test-id={`pos-dining-line-send-${line.id}`}
                    />
                  ) : null}
                  {lineCancel ? (
                    <IconButton
                      icon="Trash2"
                      variant="action"
                      size="sm"
                      ariaLabel="Eliminar ítem"
                      title="Eliminar"
                      disabled={disabled || busy}
                      onClick={() => onCancelLines([line.id])}
                      data-test-id={`pos-dining-line-cancel-${line.id}`}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {kitchenItemStatusLabel(line.kitchenStatus)}
                    {line.notes?.trim() ? ` · ${line.notes.trim()}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {formatMoney(unitPrice * qty)}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}
