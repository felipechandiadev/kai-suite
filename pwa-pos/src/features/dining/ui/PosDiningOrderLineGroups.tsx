"use client";

import { useMemo, useState } from "react";
import { Badge, IconButton, TextField } from "@kai/ui";
import {
  canCancelDiningLine,
  canSendDiningLineToKitchen,
  diningLineGroupAllReady,
  diningLineGroupKitchenFireNumbers,
  diningLineGroupStatusLabel,
  diningProductNeedsKitchen,
  groupDiningOrderLines,
  isKitchenReadyStatus,
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
  productType?: string | null;
};

type Props = {
  lines: PosDiningOrderLine[];
  productByVariantId: Record<string, DiningLineProductMeta>;
  disabled?: boolean;
  busy?: boolean;
  onSendLines: (lineIds: string[]) => void;
  onCancelLines: (lineIds: string[]) => void;
  onUpdateNotes: (lineIds: string[], notes: string | null) => void;
};

export function PosDiningOrderLineGroups({
  lines,
  productByVariantId,
  disabled = false,
  busy = false,
  onSendLines,
  onCancelLines,
  onUpdateNotes,
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
          onUpdateNotes={onUpdateNotes}
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
  onUpdateNotes,
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
  onUpdateNotes: (lineIds: string[], notes: string | null) => void;
}) {
  const unitPrice = product?.unitPrice ?? 0;
  const totalPrice = unitPrice * group.quantityTotal;
  const showHeaderActions = !isExpanded || !canExpand;
  /** null until lookup: hide kitchen actions (avoid ChefHat flash on PHYSICAL). */
  const productType = product?.productType ?? null;
  const needsKitchen = diningProductNeedsKitchen(productType);
  const draftIds = group.lines
    .filter((l) => canSendDiningLineToKitchen(l.kitchenStatus, productType))
    .map((l) => l.id);
  const cancelIds = group.lines
    .filter((l) => canCancelDiningLine(l.kitchenStatus))
    .map((l) => l.id);
  const canSend = draftIds.length > 0;
  const canCancel = cancelIds.length > 0;
  const allReady = needsKitchen && diningLineGroupAllReady(group);
  const name = product?.name ?? "Producto";
  const fireNumbers = needsKitchen ? diningLineGroupKitchenFireNumbers(group) : [];
  const canEditNotes = needsKitchen && draftIds.length > 0;
  const statusLabel = needsKitchen
    ? diningLineGroupStatusLabel(group)
    : "En cuenta";
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(group.notes ?? "");

  const openNotesEditor = () => {
    setNotesDraft(group.notes ?? "");
    setEditingNotes(true);
  };

  const saveNotes = () => {
    const next = notesDraft.trim() || null;
    setEditingNotes(false);
    if ((group.notes ?? null) === next) return;
    onUpdateNotes(draftIds, next);
  };

  return (
    <li
      className={`rounded-lg border px-2 py-2 text-sm ${
        allReady
          ? "border-success/40 bg-success/10"
          : "border-border bg-surface"
      }`}
      data-test-id={`pos-dining-line-group-${group.key}`}
      data-all-ready={allReady ? "true" : "false"}
      data-needs-kitchen={needsKitchen ? "true" : "false"}
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
                onClick={() => onSendLines(draftIds)}
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
                onClick={() => onCancelLines(cancelIds)}
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
            {statusLabel}
            {group.notes ? ` · ${group.notes}` : ""}
          </p>
          {fireNumbers.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {fireNumbers.map((n) => (
                <Badge
                  key={n}
                  variant="secondary-outlined"
                  className="text-[10px]"
                  data-test-id={`pos-dining-line-group-pedido-${group.key}-${n}`}
                >
                  {`Pedido #${n}`}
                </Badge>
              ))}
            </div>
          ) : null}
          {canEditNotes ? (
            <div className="mt-1.5">
              {editingNotes ? (
                <div className="flex flex-col gap-1.5">
                  <TextField
                    label="Nota cocina"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value.slice(0, 200))}
                    disabled={disabled || busy}
                    data-test-id={`pos-dining-line-group-notes-input-${group.key}`}
                  />
                  <div className="flex gap-1">
                    <IconButton
                      icon="Check"
                      variant="action"
                      size="sm"
                      ariaLabel="Guardar nota"
                      title="Guardar"
                      disabled={disabled || busy}
                      onClick={saveNotes}
                      data-test-id={`pos-dining-line-group-notes-save-${group.key}`}
                    />
                    <IconButton
                      icon="X"
                      variant="action"
                      size="sm"
                      ariaLabel="Cancelar nota"
                      title="Cancelar"
                      disabled={disabled || busy}
                      onClick={() => setEditingNotes(false)}
                      data-test-id={`pos-dining-line-group-notes-cancel-${group.key}`}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-left text-[11px] text-primary underline-offset-2 hover:underline disabled:opacity-50"
                  disabled={disabled || busy}
                  onClick={openNotesEditor}
                  data-test-id={`pos-dining-line-group-notes-edit-${group.key}`}
                >
                  {group.notes ? "Editar nota cocina" : "Agregar nota cocina"}
                </button>
              )}
            </div>
          ) : null}
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
            const lineSend = canSendDiningLineToKitchen(
              line.kitchenStatus,
              productType,
            );
            const lineCancel = canCancelDiningLine(line.kitchenStatus);
            const lineReady = needsKitchen && isKitchenReadyStatus(line.kitchenStatus);
            const fireN = needsKitchen ? line.kitchenFireNumber : null;
            const lineStatusLabel = needsKitchen
              ? kitchenItemStatusLabel(line.kitchenStatus)
              : "En cuenta";
            return (
              <li
                key={line.id}
                className={`flex items-start gap-1 rounded-md px-2 py-1.5 ${
                  lineReady ? "bg-success/15" : "bg-muted/30"
                }`}
                data-test-id={`pos-dining-line-item-${line.id}`}
                data-ready={lineReady ? "true" : "false"}
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
                    {lineStatusLabel}
                    {line.notes?.trim() ? ` · ${line.notes.trim()}` : ""}
                  </p>
                  {typeof fireN === "number" && fireN > 0 ? (
                    <Badge
                      variant="secondary-outlined"
                      className="mt-0.5 text-[10px]"
                      data-test-id={`pos-dining-line-pedido-${line.id}`}
                    >
                      {`Pedido #${fireN}`}
                    </Badge>
                  ) : null}
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
