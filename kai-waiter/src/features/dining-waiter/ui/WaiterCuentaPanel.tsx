"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, IconButton, TextField } from "@kai/ui";
import type {
  DiningOrderDto,
  WaiterLineProductMeta,
} from "../infrastructure/dining.request";
import {
  cancelOrderItemAction,
  getCompanyTipSettingsAction,
  listKitchenProductionUnitsAction,
  lookupWaiterVariantsAction,
  markFireDeliveredAction,
  reopenOrderAction,
  requestOrderBillAction,
  resolveWaiterBranchCatalogContextAction,
  sendOrderToKitchenAction,
  updateOrderLineNotesAction,
} from "../actions/waiter.action";
import { listPrintAgentsForWaiterAction } from "@/features/print-agents/actions/print-agents.action";
import { printWaiterDiningAccountTicket } from "../lib/waiter-dining-account-ticket-print";
import { printWaiterKitchenComandasAfterFire } from "../lib/waiter-kitchen-comanda-print";
import type { KitchenUnitPrintInfo, PrintAgentCatalogItem } from "@kai/print-service-client";
import {
  canCancelWaiterLine,
  canSendWaiterLineToKitchen,
  groupWaiterOrderLines,
  isWaiterKitchenReadyStatus,
  waiterKitchenStatusLabel,
  waiterLineGroupAllReady,
  waiterLineGroupFireNumbers,
  waiterLineGroupStatusLabel,
  waiterProductNeedsKitchen,
  type WaiterLineGroup,
} from "../lib/group-waiter-order-lines";
import { groupWaiterFiresForDelivery } from "../lib/group-waiter-fires";
import { WaiterProductNameWithAttributes } from "./WaiterProductNameWithAttributes";
import type { WaiterSession } from "@/lib/app-session";
import {
  isWaiterAccountUnavailableError,
  messageFromUnknownError,
  WAITER_ACCOUNT_UNAVAILABLE_MSG,
} from "../lib/waiter-account-unavailable";

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

type WaiterCuentaPanelProps = {
  session: WaiterSession;
  branchId: string;
  order: DiningOrderDto;
  onOrderUpdated: (order: DiningOrderDto) => void;
  onAccountUnavailable: (message: string) => void;
  /** Fire a resaltar (deep-link desde campana). */
  highlightFireId?: string | null;
};

export function WaiterCuentaPanel({
  session,
  branchId,
  order,
  onOrderUpdated,
  onAccountUnavailable,
  highlightFireId = null,
}: WaiterCuentaPanelProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [productByVariantId, setProductByVariantId] = useState<
    Record<string, WaiterLineProductMeta>
  >({});
  const [kitchenUnits, setKitchenUnits] = useState<KitchenUnitPrintInfo[]>([]);
  const [printAgents, setPrintAgents] = useState<PrintAgentCatalogItem[]>([]);
  const [branchName, setBranchName] = useState<string | null>(null);

  const auth = useMemo(
    () => ({ userId: session.userId, companyId: session.companyId }),
    [session.userId, session.companyId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [units, agents, catalog] = await Promise.all([
          listKitchenProductionUnitsAction({ ...auth, branchId }),
          listPrintAgentsForWaiterAction({
            userId: session.userId,
            companyId: session.companyId,
          }),
          resolveWaiterBranchCatalogContextAction({ ...auth, branchId }),
        ]);
        if (cancelled) return;
        setKitchenUnits(
          units.map((u) => ({
            id: u.id,
            name: u.name,
            kitchenFulfillmentMode: u.kitchenFulfillmentMode,
            kitchenPrintSettings: u.kitchenPrintSettings,
          })),
        );
        setPrintAgents(
          agents.map((a) => ({
            id: a.id,
            displayName: a.displayName,
            lanHost: a.lanHost,
            wsPort: a.wsPort,
            wssPort: a.wssPort,
            useTls: a.useTls,
            online: a.online,
            platform: a.platform,
          })),
        );
        setBranchName(catalog.branchName?.trim() || null);
      } catch {
        if (!cancelled) {
          setKitchenUnits([]);
          setPrintAgents([]);
          setBranchName(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth, branchId, session.userId, session.companyId]);

  const fireAndMaybePrint = async (lineIds: string[]) => {
    const next = await sendOrderToKitchenAction({
      ...auth,
      orderId: order.id,
      lineIds,
    });
    void printWaiterKitchenComandasAfterFire({
      order: next,
      sentLineIds: lineIds,
      productByVariantId,
      kitchenUnits,
      printAgents,
      companyName: null,
      branchName,
    });
    return next;
  };

  const lines = order.lines ?? [];
  const groups = useMemo(() => groupWaiterOrderLines(lines), [lines]);
  const kitchenFires = useMemo(
    () => groupWaiterFiresForDelivery(lines),
    [lines],
  );

  useEffect(() => {
    if (!highlightFireId) return;
    const el = document.querySelector(
      `[data-test-id="waiter-badge-kitchen-ready-${highlightFireId}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [highlightFireId, kitchenFires.kitchenReady.length]);
  const draftLines = lines.filter((l) => {
    const meta = productByVariantId[l.productVariantId];
    return canSendWaiterLineToKitchen(l.kitchenStatus, meta?.productType);
  });
  const draftCount = draftLines.length;
  const isBilling = order.status === "BILLING";

  const variantIdsKey = useMemo(
    () =>
      [
        ...new Set(
          lines
            .map((l) => l.productVariantId)
            .filter((id) => Boolean(id?.trim())),
        ),
      ]
        .sort()
        .join(","),
    [lines],
  );

  useEffect(() => {
    const ids = variantIdsKey ? variantIdsKey.split(",") : [];
    if (ids.length === 0) {
      setProductByVariantId({});
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const ctx = await resolveWaiterBranchCatalogContextAction({
          ...auth,
          branchId,
        });
        const map = await lookupWaiterVariantsAction({
          ...auth,
          variantIds: ids,
          branchId,
          priceListId: ctx.priceListId,
          pointOfSaleId: ctx.pointOfSaleId,
        });
        if (!cancelled) setProductByVariantId(map);
      } catch {
        if (!cancelled) {
          const fallback: Record<string, WaiterLineProductMeta> = {};
          for (const line of order.lines ?? []) {
            if (fallback[line.productVariantId]) continue;
            fallback[line.productVariantId] = {
              name: line.productVariant?.name ?? "Producto",
              unitPrice: 0,
            };
          }
          setProductByVariantId(fallback);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth, branchId, order.lines, variantIdsKey]);

  const run = async (key: string, fn: () => Promise<DiningOrderDto>) => {
    setBusy(key);
    setError(null);
    try {
      onOrderUpdated(await fn());
    } catch (e) {
      const msg = messageFromUnknownError(e, "Error en la operación");
      if (isWaiterAccountUnavailableError(msg)) {
        onAccountUnavailable(WAITER_ACCOUNT_UNAVAILABLE_MSG);
        return;
      }
      setError(msg);
    } finally {
      setBusy(null);
    }
  };

  const buildPrintLines = (ord: DiningOrderDto) => {
    const active = (ord.lines ?? []).filter(
      (l) => l.kitchenStatus !== "CANCELLED",
    );
    return active.map((l) => {
      const meta = productByVariantId[l.productVariantId];
      const attrs = (meta?.attributes ?? [])
        .map((a) => a.attributeValue?.trim())
        .filter(Boolean) as string[];
      const baseName =
        meta?.name?.trim() ||
        l.productVariant?.name?.trim() ||
        "Producto";
      const name =
        attrs.length > 0 ? `${baseName} · ${attrs.join(" · ")}` : baseName;
      return {
        name,
        quantity: Number(l.quantity) || 0,
        unitPrice: meta?.unitPrice ?? 0,
        notes: l.notes ?? null,
      };
    });
  };

  const printAccount = async (ord: DiningOrderDto) => {
    const lines = buildPrintLines(ord);
    if (lines.length === 0) {
      throw new Error("La cuenta no tiene ítems para imprimir");
    }
    const fiscalTotal = lines.reduce(
      (sum, l) =>
        sum + Math.round((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0)),
      0,
    );
    let tipSuggestPercent: number | null = null;
    let tipSuggestedAmount: number | null = null;
    try {
      const tipSettings = await getCompanyTipSettingsAction({ ...auth });
      if (tipSettings?.enabled) {
        tipSuggestPercent = Number(tipSettings.suggestPercent) || 10;
        tipSuggestedAmount = Math.max(
          0,
          Math.round((fiscalTotal * tipSuggestPercent) / 100),
        );
      }
    } catch {
      // tips optional
    }
    await printWaiterDiningAccountTicket({
      orderId: ord.id,
      displayLabel: ord.displayLabel,
      tableCode: ord.diningTable?.code ?? null,
      kind: ord.kind,
      status: ord.status,
      lines,
      companyName: null,
      branchName,
      tipSuggestPercent,
      tipSuggestedAmount,
    });
  };

  const handleRequestBillAndPrint = async () => {
    setBusy("bill");
    setError(null);
    try {
      let next = order;
      if (next.status !== "BILLING") {
        next = await requestOrderBillAction({ ...auth, orderId: order.id });
        onOrderUpdated(next);
      }
      await printAccount(next);
    } catch (e) {
      const msg = messageFromUnknownError(e, "Error al pedir la cuenta");
      if (isWaiterAccountUnavailableError(msg)) {
        onAccountUnavailable(WAITER_ACCOUNT_UNAVAILABLE_MSG);
        return;
      }
      setError(msg);
    } finally {
      setBusy(null);
    }
  };

  const handleReprint = async () => {
    setBusy("reprint");
    setError(null);
    try {
      await printAccount(order);
    } catch (e) {
      const msg = messageFromUnknownError(e, "Error al imprimir la cuenta");
      if (isWaiterAccountUnavailableError(msg)) {
        onAccountUnavailable(WAITER_ACCOUNT_UNAVAILABLE_MSG);
        return;
      }
      setError(msg);
    } finally {
      setBusy(null);
    }
  };

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-test-id="waiter-cuenta-panel">
      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {groups.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            Sin ítems. Ve a Menú para cargar productos.
          </li>
        ) : (
          groups.map((group) => (
            <GroupCard
              key={group.key}
              group={group}
              product={productByVariantId[group.productVariantId]}
              isExpanded={expanded.has(group.key)}
              canExpand={group.lines.length > 1}
              disabled={isBilling}
              busy={busy !== null}
              onToggle={() => toggle(group.key)}
              onSendLines={(lineIds) =>
                void run(`fire-${group.key}`, () => fireAndMaybePrint(lineIds))
              }
              onCancelLines={(lineIds) =>
                void run(`cancel-${group.key}`, async () => {
                  let latest = order;
                  for (const lineId of lineIds) {
                    latest = await cancelOrderItemAction({
                      ...auth,
                      orderId: order.id,
                      lineId,
                    });
                  }
                  return latest;
                })
              }
              onUpdateNotes={(lineIds, notes) =>
                void run(`notes-${group.key}`, async () => {
                  let latest = order;
                  for (const lineId of lineIds) {
                    latest = await updateOrderLineNotesAction({
                      ...auth,
                      orderId: order.id,
                      lineId,
                      notes,
                    });
                  }
                  return latest;
                })
              }
            />
          ))
        )}
      </ul>

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        {(kitchenFires.preparing.length > 0 ||
          kitchenFires.kitchenReady.length > 0) &&
        !isBilling ? (
          <div
            className="flex flex-wrap items-center gap-1.5"
            data-test-id="waiter-kitchen-fire-badges"
          >
            {kitchenFires.preparing.map((fire) => {
              const label =
                fire.kitchenFireNumber != null
                  ? `En cocina #${fire.kitchenFireNumber}`
                  : `En cocina (${fire.lineCount})`;
              return (
                <span
                  key={`prep-${fire.fireId}`}
                  className="rounded-full"
                  data-test-id={`waiter-badge-in-kitchen-${fire.fireId}`}
                >
                  <Badge variant="primary-outlined" className="text-[10px]">
                    {label}
                  </Badge>
                </span>
              );
            })}
            {kitchenFires.kitchenReady.map((fire) => {
              const label =
                fire.kitchenFireNumber != null
                  ? `Cocina lista #${fire.kitchenFireNumber}`
                  : `Cocina lista (${fire.lineCount})`;
              const highlighted = highlightFireId === fire.fireId;
              return (
                <button
                  key={`ready-${fire.fireId}`}
                  type="button"
                  disabled={busy !== null}
                  title="Marcar entregado en mesa"
                  aria-label={`${label}. Marcar entregado`}
                  onClick={() =>
                    void run(`deliver-${fire.fireId}`, () =>
                      markFireDeliveredAction({
                        ...auth,
                        orderId: order.id,
                        fireId: fire.fireId,
                      }),
                    )
                  }
                  className={`rounded-full disabled:cursor-not-allowed disabled:opacity-50 ${
                    highlighted ? "ring-2 ring-warning ring-offset-1" : ""
                  }`}
                  data-test-id={`waiter-badge-kitchen-ready-${fire.fireId}`}
                >
                  <Badge variant="warning-outlined" className="text-[10px]">
                    {label}
                  </Badge>
                </button>
              );
            })}
          </div>
        ) : null}
        {draftCount > 0 ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            loading={busy === "fire-all"}
            disabled={busy !== null || isBilling}
            onClick={() =>
              void run("fire-all", () =>
                fireAndMaybePrint(draftLines.map((l) => l.id)),
              )
            }
            data-test-id="waiter-fire-all"
          >
            Enviar {draftCount} a cocina
          </Button>
        ) : null}
        {isBilling ? (
          <>
            <Button
              type="button"
              variant="outlined"
              size="sm"
              loading={busy === "reopen"}
              disabled={busy !== null}
              onClick={() =>
                void run("reopen", () =>
                  reopenOrderAction({ ...auth, orderId: order.id }),
                )
              }
              data-test-id="waiter-reopen-account"
            >
              Reabrir cuenta
            </Button>
            <Button
              type="button"
              variant="outlined"
              size="sm"
              loading={busy === "reprint"}
              disabled={busy !== null}
              onClick={() => void handleReprint()}
              data-test-id="waiter-reprint-account"
            >
              Reimprimir cuenta
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outlined"
            size="sm"
            loading={busy === "bill"}
            disabled={busy !== null}
            onClick={() => void handleRequestBillAndPrint()}
            data-test-id="waiter-request-bill"
          >
            Pedir cuenta
          </Button>
        )}
      </div>

      {error ? (
        <p className="text-sm text-red-500" data-test-id="waiter-cuenta-error">
          {error}
        </p>
      ) : null}
    </div>
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
  group: WaiterLineGroup;
  product?: WaiterLineProductMeta;
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
  const productType = product?.productType ?? null;
  const needsKitchen = waiterProductNeedsKitchen(productType);
  const draftIds = group.lines
    .filter((l) => canSendWaiterLineToKitchen(l.kitchenStatus, productType))
    .map((l) => l.id);
  const cancelIds = group.lines
    .filter((l) => canCancelWaiterLine(l.kitchenStatus))
    .map((l) => l.id);
  const canSend = draftIds.length > 0;
  const canCancel = cancelIds.length > 0;
  const allReady = needsKitchen && waiterLineGroupAllReady(group);
  const name =
    product?.name ??
    group.lines[0]?.productVariant?.name ??
    "Producto";
  const fireNumbers = needsKitchen ? waiterLineGroupFireNumbers(group) : [];
  const canEditNotes = needsKitchen && draftIds.length > 0;
  const statusLabel = needsKitchen
    ? waiterLineGroupStatusLabel(group)
    : "En cuenta";
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(group.notes ?? "");

  return (
    <li
      className={`rounded-lg border px-2 py-2 text-sm ${
        allReady ? "border-success/40 bg-success/10" : "border-border bg-surface"
      }`}
      data-test-id={`waiter-cuenta-group-${group.key}`}
    >
      <div className="flex items-start gap-1">
        {canExpand ? (
          <IconButton
            icon={isExpanded ? "ChevronDown" : "ChevronRight"}
            variant="action"
            size="sm"
            className="mt-0.5 shrink-0"
            ariaLabel={isExpanded ? "Contraer ítems" : "Expandir ítems"}
            disabled={disabled}
            onClick={onToggle}
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
                disabled={disabled || busy}
                isLoading={busy}
                onClick={() => onSendLines(draftIds)}
                data-test-id={`waiter-fire-group-${group.key}`}
              />
            ) : null}
            {canCancel ? (
              <IconButton
                icon="Trash2"
                variant="action"
                size="sm"
                ariaLabel="Eliminar ítems"
                disabled={disabled || busy}
                onClick={() => onCancelLines(cancelIds)}
                data-test-id={`waiter-cancel-group-${group.key}`}
              />
            ) : null}
          </div>
        ) : null}

        <div className="min-w-0 flex-1">
          <WaiterProductNameWithAttributes
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
                  />
                  <div className="flex gap-1">
                    <IconButton
                      icon="Check"
                      variant="action"
                      size="sm"
                      ariaLabel="Guardar nota"
                      disabled={disabled || busy}
                      onClick={() => {
                        const next = notesDraft.trim() || null;
                        setEditingNotes(false);
                        if ((group.notes ?? null) === next) return;
                        onUpdateNotes(draftIds, next);
                      }}
                    />
                    <IconButton
                      icon="X"
                      variant="action"
                      size="sm"
                      ariaLabel="Cancelar nota"
                      disabled={disabled || busy}
                      onClick={() => setEditingNotes(false)}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-left text-[11px] text-primary underline-offset-2 hover:underline disabled:opacity-50"
                  disabled={disabled || busy}
                  onClick={() => {
                    setNotesDraft(group.notes ?? "");
                    setEditingNotes(true);
                  }}
                >
                  {group.notes ? "Editar nota cocina" : "Agregar nota cocina"}
                </button>
              )}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 text-right tabular-nums">
          <p className="font-semibold">{formatQty(group.quantityTotal)}</p>
          <p className="text-[11px] text-muted-foreground">
            {formatMoney(totalPrice)}
          </p>
        </div>
      </div>

      {isExpanded && canExpand ? (
        <ul className="mt-2 space-y-1.5 border-t border-border pt-2 pl-7">
          {group.lines.map((line) => {
            const qty = Number(line.quantity) || 0;
            const lineSend = canSendWaiterLineToKitchen(
              line.kitchenStatus,
              productType,
            );
            const lineCancel = canCancelWaiterLine(line.kitchenStatus);
            const lineReady =
              needsKitchen && isWaiterKitchenReadyStatus(line.kitchenStatus);
            const fireN = needsKitchen ? line.kitchenFireNumber : null;
            const lineStatusLabel = needsKitchen
              ? waiterKitchenStatusLabel(line.kitchenStatus)
              : "En cuenta";
            return (
              <li
                key={line.id}
                className={`flex items-start gap-1 rounded-md px-2 py-1.5 ${
                  lineReady ? "bg-success/15" : "bg-muted/30"
                }`}
              >
                <div className="flex shrink-0 items-center gap-0.5">
                  {lineSend ? (
                    <IconButton
                      icon="ChefHat"
                      variant="action"
                      size="sm"
                      ariaLabel="Enviar a cocina"
                      disabled={disabled || busy}
                      onClick={() => onSendLines([line.id])}
                    />
                  ) : null}
                  {lineCancel ? (
                    <IconButton
                      icon="Trash2"
                      variant="action"
                      size="sm"
                      ariaLabel="Eliminar ítem"
                      disabled={disabled || busy}
                      onClick={() => onCancelLines([line.id])}
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">
                    {lineStatusLabel}
                    {line.notes?.trim() ? ` · ${line.notes.trim()}` : ""}
                  </p>
                  {typeof fireN === "number" && fireN > 0 ? (
                    <Badge variant="secondary-outlined" className="mt-0.5 text-[10px]">
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
