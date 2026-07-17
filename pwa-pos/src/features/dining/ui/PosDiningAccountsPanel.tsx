"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Badge,
  Button,
  DotProgress,
  IconButton,
  Select,
} from "@kai/ui";
import {
  getPosDiningOrderAction,
  listPosDiningOrdersAction,
  listPosDiningRoomsAction,
  openPosCounterOrderAction,
  openPosTakeawayOrderAction,
  requestPosDiningBillAction,
  sendPosDiningOrderToKitchenAction,
} from "@/features/dining/actions/dining-pos.action";
import { diningAccountTitle } from "@/features/dining/lib/dining-account-title";
import { diningOrderLinesToCart } from "@/features/dining/lib/dining-order-lines-to-cart";
import {
  diningOrderStatusLabel,
  kitchenItemStatusLabel,
} from "@/features/dining/lib/dining-status-labels";
import type {
  DiningOrderKind,
  PosDiningOrderSummary,
  PosDiningRoomSummary,
} from "@/features/dining/types/dining-pos.types";
import { PosDiningAddItemDialog } from "@/features/dining/ui/PosDiningAddItemDialog";
import { PosDiningMenuColumn } from "@/features/dining/ui/PosDiningMenuColumn";
import { PosDiningRenameAccountDialog } from "@/features/dining/ui/PosDiningRenameAccountDialog";
import { lookupPosVariantsAction } from "@/features/pos-products/actions/pos-products.action";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";
import { usePosCart } from "@/features/pos-cart/PosCartProvider";
import { usePosCompactLayout } from "@/shared/hooks/usePosCompactLayout";

export const POS_DINING_URL_KEYS = {
  tab: "diningTab",
  orderId: "diningOrderId",
  roomId: "diningRoomId",
} as const;

type TabKey = "mesas" | "barra" | "takeaway";

const TAB_TO_KIND: Record<TabKey, DiningOrderKind> = {
  mesas: "TABLE",
  barra: "COUNTER",
  takeaway: "TAKEAWAY",
};

const TAB_LABELS: Record<TabKey, string> = {
  mesas: "Mesas",
  barra: "Barra",
  takeaway: "Para llevar",
};

const ALL_TABS = Object.keys(TAB_TO_KIND) as TabKey[];

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

function isActiveOrder(order: PosDiningOrderSummary) {
  return order.status !== "CLOSED" && order.status !== "FREE";
}

function kitchenProgressFromLines(lines: PosDiningOrderSummary["lines"]) {
  const active = lines.filter((l) => l.kitchenStatus !== "CANCELLED");
  const total = active.length;
  const inKitchen = active.filter(
    (l) => l.kitchenStatus === "SENT" || l.kitchenStatus === "PREPARING",
  ).length;
  const ready = active.filter(
    (l) => l.kitchenStatus === "READY" || l.kitchenStatus === "SERVED",
  ).length;
  return { total, inKitchen, ready };
}

type Props = {
  branchId: string;
  heightVh?: number;
  disabled?: boolean;
  /**
   * `panel` — columna estrecha (cobro): selector + lista.
   * `page` — `/accounts`: desktop Cuentas | Menú | Detalle; mobile unificado.
   */
  layout?: "panel" | "page";
  /** Rellena el alto del contenedor (sin vh fijos). */
  fillViewport?: boolean;
};

export default function PosDiningAccountsPanel({
  branchId,
  heightVh = 76,
  disabled = false,
  layout = "panel",
  fillViewport = false,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const cart = usePosCart();
  const compact = usePosCompactLayout();
  const [, startTransition] = useTransition();

  const pageDesktop = layout === "page" && !compact;
  const shellStyle = fillViewport
    ? undefined
    : { height: `${heightVh}vh`, minHeight: `${heightVh}vh` };
  const shellClass = fillViewport ? "h-full min-h-0" : "";

  const urlTab = (sp.get(POS_DINING_URL_KEYS.tab) ?? "mesas") as TabKey;
  const tab: TabKey =
    urlTab === "barra" || urlTab === "takeaway" || urlTab === "mesas" ? urlTab : "mesas";
  const urlOrderId = (sp.get(POS_DINING_URL_KEYS.orderId) ?? "").trim();
  const urlRoomId = (sp.get(POS_DINING_URL_KEYS.roomId) ?? "").trim();

  const [orders, setOrders] = useState<PosDiningOrderSummary[]>([]);
  const [rooms, setRooms] = useState<PosDiningRoomSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detail, setDetail] = useState<PosDiningOrderSummary | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<PosDiningOrderSummary | null>(null);
  const [variantNames, setVariantNames] = useState<Record<string, string>>({});
  const [variantPrices, setVariantPrices] = useState<Record<string, number>>({});
  const refreshRef = useRef(0);

  const navigateDining = useCallback(
    (params: URLSearchParams) => {
      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router],
  );

  const setTab = useCallback(
    (next: TabKey) => {
      const params = new URLSearchParams(sp.toString());
      params.set(POS_DINING_URL_KEYS.tab, next);
      if (!pageDesktop) {
        params.delete(POS_DINING_URL_KEYS.orderId);
      }
      navigateDining(params);
    },
    [navigateDining, pageDesktop, sp],
  );

  const setSelectedOrderId = useCallback(
    (orderId: string | null) => {
      const params = new URLSearchParams(sp.toString());
      if (orderId) {
        params.set(POS_DINING_URL_KEYS.orderId, orderId);
      } else {
        params.delete(POS_DINING_URL_KEYS.orderId);
      }
      navigateDining(params);
    },
    [navigateDining, sp],
  );

  const setRoomFilter = useCallback(
    (roomId: string) => {
      const params = new URLSearchParams(sp.toString());
      if (roomId) {
        params.set(POS_DINING_URL_KEYS.roomId, roomId);
      } else {
        params.delete(POS_DINING_URL_KEYS.roomId);
      }
      navigateDining(params);
    },
    [navigateDining, sp],
  );

  const refreshList = useCallback(() => {
    if (!branchId.trim()) return;
    const ticket = ++refreshRef.current;
    setListLoading(true);
    setListError(null);
    void listPosDiningOrdersAction({
      branchId: branchId.trim(),
      kind: TAB_TO_KIND[tab],
    }).then((res) => {
      if (ticket !== refreshRef.current) return;
      setListLoading(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setListError(res.message);
        setOrders([]);
        return;
      }
      setOrders(res.orders);
    });
  }, [branchId, tab]);

  useEffect(() => {
    if (!branchId.trim()) return;
    void listPosDiningRoomsAction(branchId.trim()).then((res) => {
      if (!res.success) return;
      setRooms(res.rooms.filter((r) => r.isActive));
    });
  }, [branchId]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!urlOrderId) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    setDetailLoading(true);
    setDetailError(null);
    void getPosDiningOrderAction(urlOrderId).then((res) => {
      setDetailLoading(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setDetailError(res.message);
        setDetail(null);
        return;
      }
      setDetail(res.order);
    });
  }, [urlOrderId]);

  useEffect(() => {
    const detailLines = detail?.lines ?? [];
    const listLines = orders.flatMap((o) => o.lines);
    const variantIds = [
      ...new Set(
        [...detailLines, ...listLines]
          .map((l) => l.productVariantId)
          .filter(Boolean),
      ),
    ];
    if (variantIds.length === 0) {
      setVariantNames({});
      setVariantPrices({});
      return;
    }
    const ctx = readPosContextClient();
    void lookupPosVariantsAction({
      variantIds,
      pointOfSaleId: ctx?.pointOfSaleId ?? null,
      branchId: ctx?.branchId ?? branchId,
      priceListId: ctx?.priceListId ?? null,
    }).then((res) => {
      if (!res.success) return;
      const names: Record<string, string> = {};
      const prices: Record<string, number> = {};
      for (const p of res.products) {
        names[p.variantId] = p.productName;
        prices[p.variantId] = Number(p.unitPriceWithTax) || 0;
      }
      setVariantNames(names);
      setVariantPrices(prices);
    });
  }, [branchId, detail, orders]);

  const filteredOrders = useMemo(() => {
    let rows = orders.filter(isActiveOrder);
    if (tab === "mesas" && urlRoomId) {
      rows = rows.filter((o) => o.diningRoomId === urlRoomId);
    }
    return rows;
  }, [orders, tab, urlRoomId]);

  const estimateOrderTotal = useCallback(
    (order: PosDiningOrderSummary) => {
      return order.lines
        .filter((l) => l.kitchenStatus !== "CANCELLED")
        .reduce((sum, l) => {
          const unit = variantPrices[l.productVariantId] ?? 0;
          return sum + unit * (Number(l.quantity) || 0);
        }, 0);
    },
    [variantPrices],
  );

  const estimatedTotal = useMemo(() => {
    if (!detail) return 0;
    return estimateOrderTotal(detail);
  }, [detail, estimateOrderTotal]);

  const draftCount = useMemo(() => {
    return (detail?.lines ?? []).filter((l) => l.kitchenStatus === "DRAFT").length;
  }, [detail]);

  const kitchenProgress = useMemo(
    () => kitchenProgressFromLines(detail?.lines ?? []),
    [detail],
  );

  const canManageCounter = detail?.kind === "COUNTER" || detail?.kind === "TAKEAWAY";

  const handleOpenCounter = () => {
    if (!branchId.trim()) return;
    setActionBusy(true);
    setActionError(null);
    void openPosCounterOrderAction(branchId.trim()).then((res) => {
      setActionBusy(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setActionError(res.message);
        return;
      }
      const params = new URLSearchParams(sp.toString());
      params.set(POS_DINING_URL_KEYS.tab, "barra");
      params.set(POS_DINING_URL_KEYS.orderId, res.order.id);
      navigateDining(params);
      refreshList();
    });
  };

  const handleOpenTakeaway = () => {
    if (!branchId.trim()) return;
    setActionBusy(true);
    setActionError(null);
    void openPosTakeawayOrderAction(branchId.trim()).then((res) => {
      setActionBusy(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setActionError(res.message);
        return;
      }
      const params = new URLSearchParams(sp.toString());
      params.set(POS_DINING_URL_KEYS.tab, "takeaway");
      params.set(POS_DINING_URL_KEYS.orderId, res.order.id);
      navigateDining(params);
      refreshList();
    });
  };

  const handleSendToKitchen = () => {
    if (!detail) return;
    setActionBusy(true);
    setActionError(null);
    void sendPosDiningOrderToKitchenAction(detail.id).then((res) => {
      setActionBusy(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setActionError(res.message);
        return;
      }
      setDetail(res.order);
      refreshList();
    });
  };

  const handleCobrar = async () => {
    if (!detail) return;
    setActionBusy(true);
    setActionError(null);

    let order = detail;
    if (order.status !== "BILLING") {
      const billRes = await requestPosDiningBillAction(order.id);
      if (!billRes.success) {
        setActionBusy(false);
        if (redirectToLoginIfUnauthorized(billRes)) return;
        setActionError(billRes.message);
        return;
      }
      order = billRes.order;
      setDetail(order);
    }

    const activeLines = order.lines.filter((l) => l.kitchenStatus !== "CANCELLED");
    const variantIds = [...new Set(activeLines.map((l) => l.productVariantId))];
    if (variantIds.length === 0) {
      setActionBusy(false);
      setActionError("La cuenta no tiene ítems para cobrar.");
      return;
    }

    const ctx = readPosContextClient();
    const lookupRes = await lookupPosVariantsAction({
      variantIds,
      pointOfSaleId: ctx?.pointOfSaleId ?? null,
      branchId: ctx?.branchId ?? branchId,
      priceListId: ctx?.priceListId ?? null,
    });
    if (!lookupRes.success) {
      setActionBusy(false);
      if (redirectToLoginIfUnauthorized(lookupRes)) return;
      setActionError(lookupRes.message);
      return;
    }

    const cartLines = diningOrderLinesToCart(activeLines, lookupRes.products);
    if (cartLines.length === 0) {
      setActionBusy(false);
      setActionError("No se pudieron resolver los productos de la cuenta.");
      return;
    }

    cart.loadDiningOrderForPayment(
      {
        id: order.id,
        displayLabel: order.displayLabel,
        kind: order.kind,
      },
      cartLines,
    );
    setActionBusy(false);
    if (!pathname.startsWith("/pos/payment")) {
      router.push("/pos/payment");
    }
  };

  const handleMenuOrderUpdated = (order: PosDiningOrderSummary) => {
    setDetail(order);
    refreshList();
  };

  const renderOrderButton = (order: PosDiningOrderSummary) => {
    const activeLines = order.lines.filter((l) => l.kitchenStatus !== "CANCELLED");
    const progress = kitchenProgressFromLines(order.lines);
    const selected = order.id === urlOrderId;
    const title = diningAccountTitle(order);
    const estimated = estimateOrderTotal(order);
    return (
      <button
        key={order.id}
        type="button"
        disabled={disabled}
        onClick={() => setSelectedOrderId(order.id)}
        className={`block w-full rounded-xl border p-3 text-left shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          selected
            ? "border-primary/50 bg-primary/5"
            : "border-border bg-surface hover:border-primary/40 hover:bg-primary/5"
        }`}
        data-test-id={`pos-dining-pick-${order.id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            <p className="truncate text-[11px] text-muted-foreground">{order.displayLabel}</p>
          </div>
          {progress.total > 0 ? (
            <div className="flex max-w-[55%] shrink-0 flex-wrap justify-end gap-1">
              <Badge
                variant="primary-outlined"
                className="text-[10px]"
                data-test-id={`pos-dining-pick-badge-in-kitchen-${order.id}`}
              >
                En cocina {progress.inKitchen}/{progress.total}
              </Badge>
              <Badge
                variant="primary-outlined"
                className="text-[10px]"
                data-test-id={`pos-dining-pick-badge-ready-${order.id}`}
              >
                Listos {progress.ready}/{progress.total}
              </Badge>
            </div>
          ) : (
            <Badge variant="secondary-outlined" className="shrink-0 text-[10px]">
              {diningOrderStatusLabel(order.status)}
            </Badge>
          )}
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <p className="min-w-0 text-[11px] text-muted-foreground">
            {activeLines.length} ítem(s)
            {order.diningRoomName ? ` · ${order.diningRoomName}` : ""}
          </p>
          <p
            className="shrink-0 text-sm font-semibold tabular-nums text-foreground"
            data-test-id={`pos-dining-pick-estimated-${order.id}`}
          >
            {formatMoney(estimated)}
          </p>
        </div>
      </button>
    );
  };

  const accountsListBody = (
    <>
      {tab === "mesas" && rooms.length > 0 ? (
        <Select
          label="Salón"
          placeholder="Todos los salones"
          density="compact"
          value={urlRoomId || null}
          onChange={(id) => setRoomFilter(id ? String(id) : "")}
          options={[
            { id: "", label: "Todos los salones" },
            ...rooms.map((room) => ({ id: room.id, label: room.name })),
          ]}
          alwaysShowLabel
          disabled={disabled}
          data-test-id="pos-dining-room-filter"
        />
      ) : null}

      {tab === "barra" ? (
        <Button
          type="button"
          variant="outlined"
          size="sm"
          onClick={handleOpenCounter}
          disabled={disabled || actionBusy || !branchId.trim()}
          data-test-id="pos-dining-open-counter-btn"
        >
          Abrir cuenta barra
        </Button>
      ) : null}

      {tab === "takeaway" ? (
        <Button
          type="button"
          variant="outlined"
          size="sm"
          onClick={handleOpenTakeaway}
          disabled={disabled || actionBusy || !branchId.trim()}
          data-test-id="pos-dining-open-takeaway-btn"
        >
          Abrir para llevar
        </Button>
      ) : null}

      {listError ? (
        <Alert variant="error" className="py-2 text-sm">
          {listError}
        </Alert>
      ) : null}

      {actionError && !pageDesktop ? (
        <Alert variant="error" className="py-2 text-sm">
          {actionError}
        </Alert>
      ) : null}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        aria-busy={listLoading}
        data-test-id="pos-dining-accounts-list"
      >
        {listLoading ? (
          <div
            className="flex flex-1 items-center justify-center py-10"
            data-test-id="pos-dining-accounts-list-loading"
          >
            <DotProgress />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay cuentas activas.</p>
            ) : null}
            {filteredOrders.map(renderOrderButton)}
          </div>
        )}
      </div>
    </>
  );

  const tabSelector = (
    <div
      className="flex shrink-0 gap-1 rounded-lg border border-border bg-muted/30 p-1"
      role="tablist"
      aria-label="Tipo de cuenta"
    >
      {ALL_TABS.map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={tab === key}
          disabled={disabled}
          className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            tab === key
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setTab(key)}
          data-test-id={`pos-dining-tab-${key}`}
        >
          {TAB_LABELS[key]}
        </button>
      ))}
    </div>
  );

  const detailContent = (
    <>
      {actionError ? (
        <Alert variant="error" className="py-2 text-sm">
          {actionError}
        </Alert>
      ) : null}

      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        aria-busy={detailLoading}
        data-test-id="pos-dining-detail-body"
      >
        {!urlOrderId ? (
          <p className="text-sm text-muted-foreground">
            Seleccioná una cuenta para ver el detalle.
          </p>
        ) : detailLoading ? (
          <div
            className="flex flex-1 items-center justify-center py-10"
            data-test-id="pos-dining-detail-loading"
          >
            <DotProgress />
          </div>
        ) : detailError ? (
          <Alert variant="error">{detailError}</Alert>
        ) : detail ? (
          <div className="grid gap-3">
            {detail.profile?.notes?.trim() || detail.profile?.adultCount != null ? (
              <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                {detail.profile.adultCount != null ? (
                  <span>{detail.profile.adultCount} adulto(s)</span>
                ) : null}
                {detail.profile.childCount != null ? (
                  <span>
                    {detail.profile.adultCount != null ? " · " : ""}
                    {detail.profile.childCount} niño(s)
                  </span>
                ) : null}
                {detail.profile.notes?.trim() ? (
                  <p className="mt-1 text-foreground">{detail.profile.notes.trim()}</p>
                ) : null}
              </div>
            ) : null}

            <ul className="space-y-2" data-test-id="pos-dining-detail-lines">
              {detail.lines
                .filter((l) => l.kitchenStatus !== "CANCELLED")
                .map((line) => (
                  <li
                    key={line.id}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {variantNames[line.productVariantId] ?? "Producto"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {kitchenItemStatusLabel(line.kitchenStatus)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        <p className="font-semibold">
                          {new Intl.NumberFormat("es-CL", {
                            maximumFractionDigits: 3,
                          }).format(Number(line.quantity) || 0)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatMoney(
                            (variantPrices[line.productVariantId] ?? 0) *
                              (Number(line.quantity) || 0),
                          )}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>

      {detail ? (
        <div className="shrink-0 space-y-2 border-t border-border pt-3">
          {!pageDesktop && canManageCounter ? (
            <Button
              type="button"
              variant="outlined"
              size="sm"
              onClick={() => setAddItemOpen(true)}
              disabled={disabled || actionBusy}
              data-test-id="pos-dining-add-item-btn"
            >
              Agregar ítem
            </Button>
          ) : null}
          <div className="flex items-center gap-2">
            {kitchenProgress.total > 0 ? (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                <Badge
                  variant="primary-outlined"
                  className="text-[10px]"
                  data-test-id="pos-dining-badge-in-kitchen"
                >
                  En cocina {kitchenProgress.inKitchen}/{kitchenProgress.total}
                </Badge>
                <Badge
                  variant="primary-outlined"
                  className="text-[10px]"
                  data-test-id="pos-dining-badge-ready"
                >
                  Listos {kitchenProgress.ready}/{kitchenProgress.total}
                </Badge>
              </div>
            ) : (
              <div className="min-w-0 flex-1" />
            )}
            <div className="flex shrink-0 items-center gap-3">
              {draftCount > 0 ? (
                <IconButton
                  icon="ChefHat"
                  variant="secondary"
                  size="lg"
                  className="shrink-0"
                  ariaLabel={`Enviar a cocina (${draftCount})`}
                  title={`Enviar a cocina (${draftCount})`}
                  disabled={disabled || actionBusy}
                  isLoading={actionBusy}
                  onClick={handleSendToKitchen}
                  data-test-id="pos-dining-fire-btn"
                />
              ) : null}
              <IconButton
                icon="CircleDollarSign"
                variant="outlined"
                size="lg"
                className="shrink-0"
                ariaLabel={actionBusy ? "Procesando cobro" : "Cobrar"}
                title={actionBusy ? "Procesando…" : "Cobrar"}
                disabled={disabled || actionBusy || detail.lines.length === 0}
                isLoading={actionBusy}
                onClick={() => void handleCobrar()}
                data-test-id="pos-dining-cobrar-btn"
              />
            </div>
          </div>
        </div>
      ) : null}

      {detail && addItemOpen ? (
        <PosDiningAddItemDialog
          open={addItemOpen}
          onClose={() => setAddItemOpen(false)}
          orderId={detail.id}
          onAdded={() => {
            void getPosDiningOrderAction(detail.id).then((res) => {
              if (res.success) setDetail(res.order);
              refreshList();
            });
          }}
        />
      ) : null}
    </>
  );

  const renameDialog =
    renameTarget != null ? (
      <PosDiningRenameAccountDialog
        open
        onClose={() => setRenameTarget(null)}
        orderId={renameTarget.id}
        initialName={diningAccountTitle(renameTarget)}
        onSaved={() => {
          refreshList();
          if (urlOrderId === renameTarget.id) {
            void getPosDiningOrderAction(renameTarget.id).then((res) => {
              if (res.success) setDetail(res.order);
            });
          }
        }}
      />
    ) : null;

  const renderDetailHeaderTitle = (order: PosDiningOrderSummary | null, fallback: string) => {
    if (!order) {
      return <h2 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{fallback}</h2>;
    }
    const title = diningAccountTitle(order);
    return (
      <div className="flex min-w-0 flex-1 items-start gap-1">
        <IconButton
          icon="Pencil"
          variant="action"
          size="sm"
          className="mt-0.5 shrink-0"
          ariaLabel={`Renombrar ${title}`}
          title="Nombre de la cuenta"
          disabled={disabled}
          onClick={() => setRenameTarget(order)}
          data-test-id="pos-dining-detail-rename"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
          <p className="truncate text-[11px] text-muted-foreground">{order.displayLabel}</p>
        </div>
      </div>
    );
  };

  if (pageDesktop) {
    return (
      <div
        className={`grid w-full grid-cols-3 gap-4 ${shellClass}`}
        style={shellStyle}
        data-test-id="pos-dining-accounts-desktop"
      >
        <aside
          className="flex h-full min-h-0 min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4"
          aria-label="Cuentas"
          data-test-id="pos-dining-accounts-column"
        >
          <div className="shrink-0">{tabSelector}</div>
          {accountsListBody}
        </aside>

        <PosDiningMenuColumn
          orderId={urlOrderId || null}
          disabled={disabled}
          fillViewport={fillViewport}
          heightVh={heightVh}
          onOrderUpdated={handleMenuOrderUpdated}
        />

        <aside
          className="flex h-full min-h-0 min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4"
          aria-label="Detalle de cuenta"
          data-test-id="pos-dining-detail-column"
        >
          <div className="flex shrink-0 items-center gap-2">
            {renderDetailHeaderTitle(detail, "Detalle")}
            {detail ? (
              <div
                className="shrink-0 text-right"
                data-test-id="pos-dining-detail-estimated-total"
              >
                {detail.status === "BILLING" ? (
                  <Badge variant="secondary-outlined" className="mb-0.5 text-[10px]">
                    Por cobrar
                  </Badge>
                ) : null}
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Estimado
                </p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {formatMoney(estimatedTotal)}
                </p>
              </div>
            ) : null}
          </div>
          {detailContent}
        </aside>
        {renameDialog}
      </div>
    );
  }

  // Mobile page / payment panel: stacked detail replaces list
  if (urlOrderId && (detail || detailLoading || detailError)) {
    return (
      <aside
        className={`flex w-full min-w-0 flex-col gap-3 self-stretch rounded-xl border border-border bg-background p-4 ${shellClass}`}
        style={shellStyle}
        aria-label="Detalle de cuenta"
        data-test-id="pos-dining-accounts-panel-detail"
      >
        <div className="flex shrink-0 items-center gap-2">
          <IconButton
            icon="ArrowLeft"
            variant="action"
            size="sm"
            ariaLabel="Volver a la lista de cuentas"
            title="Volver"
            onClick={() => setSelectedOrderId(null)}
            disabled={disabled}
            data-test-id="pos-dining-detail-back"
          />
          {renderDetailHeaderTitle(detail, "Cuenta")}
          {detail ? (
            <div
              className="shrink-0 text-right"
              data-test-id="pos-dining-detail-estimated-total"
            >
              {detail.status === "BILLING" ? (
                <Badge variant="secondary-outlined" className="mb-0.5 text-[10px]">
                  Por cobrar
                </Badge>
              ) : null}
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Estimado
              </p>
              <p className="text-sm font-bold tabular-nums text-foreground">
                {formatMoney(estimatedTotal)}
              </p>
            </div>
          ) : null}
        </div>
        {detailContent}
        {renameDialog}
      </aside>
    );
  }

  return (
    <aside
      className={`flex w-full min-w-0 flex-col gap-3 self-stretch rounded-xl border border-border bg-background p-4 ${shellClass}`}
      style={shellStyle}
      aria-label="Cuentas salón"
      data-test-id="pos-dining-accounts-panel"
    >
      <div className="shrink-0">
        <h2 className="text-sm font-semibold text-foreground">Cuentas</h2>
      </div>
      {tabSelector}
      {accountsListBody}
      {renameDialog}
    </aside>
  );
}
