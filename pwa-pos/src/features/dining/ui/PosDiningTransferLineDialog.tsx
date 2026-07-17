"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Alert, Button, Dialog, DotProgress } from "@kai/ui";
import {
  listPosDiningOrdersAction,
  transferCartLineToDiningOrderAction,
} from "@/features/dining/actions/dining-pos.action";
import { diningOrderStatusLabel } from "@/features/dining/lib/dining-status-labels";
import type {
  DiningOrderKind,
  PosDiningOrderSummary,
} from "@/features/dining/types/dining-pos.types";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";
import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";

const TAB_KIND: Record<string, DiningOrderKind> = {
  mesas: "TABLE",
  barra: "COUNTER",
  takeaway: "TAKEAWAY",
};

const TAB_LABELS: Record<DiningOrderKind, string> = {
  TABLE: "Mesas",
  COUNTER: "Barra",
  TAKEAWAY: "Para llevar",
};

type TabKey = "mesas" | "barra" | "takeaway";

type Props = {
  open: boolean;
  onClose: () => void;
  line: PosCartLine;
  branchId: string;
  onSuccess: () => void;
};

export function PosDiningTransferLineDialog({
  open,
  onClose,
  line,
  branchId,
  onSuccess,
}: Props) {
  const [tab, setTab] = useState<TabKey>("mesas");
  const [orders, setOrders] = useState<PosDiningOrderSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  const activeKind = TAB_KIND[tab];

  const loadOrders = useCallback(() => {
    if (!open || !branchId.trim()) return;
    setLoading(true);
    setError(null);
    void listPosDiningOrdersAction({ branchId: branchId.trim(), kind: activeKind }).then((res) => {
      setLoading(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setError(res.message);
        setOrders([]);
        return;
      }
      setOrders(res.orders);
    });
  }, [activeKind, branchId, open]);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setError(null);
      return;
    }
    loadOrders();
  }, [loadOrders, open]);

  useEffect(() => {
    if (!open) return;
    setSelectedId(null);
    loadOrders();
  }, [tab, open, loadOrders]);

  const visibleOrders = useMemo(() => {
    return orders.filter((o) => o.status !== "CLOSED" && o.status !== "FREE");
  }, [orders]);

  const handleTransfer = () => {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    void transferCartLineToDiningOrderAction({
      diningOrderId: selectedId,
      productVariantId: line.variantId,
      quantity: line.quantity,
    }).then((res) => {
      setSubmitting(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setError(res.message);
        return;
      }
      startTransition(() => {
        onSuccess();
        onClose();
      });
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Transferir a cuenta"
      size="md"
      alertArea={error ? <Alert variant="error">{error}</Alert> : undefined}
      actions={
        <>
          <Button type="button" variant="outlined" onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleTransfer}
            disabled={!selectedId || submitting}
            data-test-id="pos-dining-transfer-confirm"
          >
            {submitting ? "Transfiriendo…" : "Transferir"}
          </Button>
        </>
      }
      actionsJustify="between"
      data-test-id="pos-dining-transfer-dialog"
    >
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          {line.productName} ·{" "}
          {new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(line.quantity)} u.
        </p>

        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(Object.keys(TAB_KIND) as TabKey[]).map((key) => (
            <button
              key={key}
              type="button"
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                tab === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setTab(key)}
              data-test-id={`pos-dining-transfer-tab-${key}`}
            >
              {TAB_LABELS[TAB_KIND[key]]}
            </button>
          ))}
        </div>

        <div
          className="max-h-[min(16rem,45vh)] space-y-2 overflow-y-auto"
          aria-busy={loading}
          data-test-id="pos-dining-transfer-orders"
        >
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <DotProgress />
              Cargando cuentas…
            </p>
          ) : visibleOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay cuentas abiertas en {TAB_LABELS[activeKind].toLowerCase()}.
            </p>
          ) : (
            visibleOrders.map((order) => {
              const activeLines = order.lines.filter((l) => l.kitchenStatus !== "CANCELLED");
              const picked = selectedId === order.id;
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => setSelectedId(order.id)}
                  className={`block w-full rounded-xl border p-3 text-left shadow-sm transition-colors ${
                    picked
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-primary/5"
                  }`}
                  data-test-id={`pos-dining-transfer-pick-${order.id}`}
                >
                  <p className="text-sm font-medium text-foreground">{order.displayLabel}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {activeLines.length} ítem(s) · {diningOrderStatusLabel(order.status)}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </Dialog>
  );
}
