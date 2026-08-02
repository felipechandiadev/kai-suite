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
} from "@kai/ui";
import {
  getPosDiningBranchSettingsAction,
  getPosDiningOrderAction,
  listPosDiningOrdersAction,
  listPosDiningRoomsAction,
  openPosCounterOrderAction,
  openPosTableOrderAction,
  openPosTakeawayOrderAction,
  requestPosDiningBillAction,
  reopenPosDiningOrderAction,
  abandonEmptyPosDiningOrderAction,
  cancelPosDiningOrderItemAction,
  sendPosDiningOrderToKitchenAction,
  markPosDiningFireReadyForPickupAction,
  markPosDiningFireDeliveredAction,
  updatePosDiningOrderLineNotesAction,
} from "@/features/dining/actions/dining-pos.action";
import { diningAccountTitle } from "@/features/dining/lib/dining-account-title";
import { groupDiningFiresForBoard } from "@/features/dining/lib/group-dining-fires-for-board";
import { printDiningAccountTicketAgentOrBrowser } from "@/features/dining/lib/dining-account-ticket-agent";
import { getCompanyDetailsAction } from "@/features/company/actions/company.action";
import { getCompanyTipSettingsForPosAction } from "@/features/company/actions/company-tips.action";
import { lookupPosVariantsAction } from "@/features/pos-products/actions/pos-products.action";
import {
  readPosDiningMenuColumnCollapsed,
  readPosDiningTablesView,
  writePosDiningMenuColumnCollapsed,
  writePosDiningTablesView,
  type PosDiningTablesView,
} from "@/features/dining/lib/dining-menu-column-collapsed-storage";
import { diningOrderLinesToCart } from "@/features/dining/lib/dining-order-lines-to-cart";
import { diningOrderAllKitchenReady, diningOrderCanBillOrCharge, diningProductNeedsKitchen } from "@/features/dining/lib/group-dining-order-lines";
import { mergeDiningSessionLines } from "@/features/dining/lib/merge-dining-session-lines";
import {
  diningOrderStatusLabel,
} from "@/features/dining/lib/dining-status-labels";
import {
  useDiningBranchRealtime,
  type DiningSessionUpdatedPayload,
} from "@/features/dining/lib/use-dining-branch-realtime";
import type {
  DiningOrderKind,
  PosDiningOrderLine,
  PosDiningOrderSummary,
  PosDiningRoomSummary,
} from "@/features/dining/types/dining-pos.types";
import { PosDiningAddItemDialog } from "@/features/dining/ui/PosDiningAddItemDialog";
import { PosDiningMenuColumn } from "@/features/dining/ui/PosDiningMenuColumn";
import {
  PosDiningOrderLineGroups,
  type DiningLineProductMeta,
} from "@/features/dining/ui/PosDiningOrderLineGroups";
import { PosDiningRenameAccountDialog } from "@/features/dining/ui/PosDiningRenameAccountDialog";
import { readPosContextClient } from "@/features/session/lib/pos-context-storage";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/pos-api-failure";
import { diningKindToTab, useDiningPayment } from "@/features/dining-payment";
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

function sessionItemsToLines(
  items: DiningSessionUpdatedPayload["items"],
): PosDiningOrderLine[] {
  return items.map((item) => ({
    id: item.id,
    productVariantId: item.productVariantId,
    quantity: item.quantity,
    notes: item.notes ?? null,
    kitchenStatus: item.kitchenStatus,
    kitchenFireId: item.kitchenFireId ?? null,
    kitchenFireNumber: item.kitchenFireNumber ?? null,
  }));
}

function kitchenProgressFromLines(lines: PosDiningOrderSummary["lines"]) {
  const active = lines.filter((l) => l.kitchenStatus !== "CANCELLED");
  const total = active.length;
  const inKitchen = active.filter(
    (l) => l.kitchenStatus === "SENT" || l.kitchenStatus === "PREPARING",
  ).length;
  const kitchenReady = active.filter((l) => l.kitchenStatus === "READY").length;
  const pickupReady = active.filter(
    (l) => l.kitchenStatus === "READY_FOR_PICKUP",
  ).length;
  const ready = kitchenReady + pickupReady;
  return { total, inKitchen, kitchenReady, pickupReady, ready };
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
  const diningPayment = useDiningPayment();
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
  const [allowPosOpenTable, setAllowPosOpenTable] = useState(false);
  const [menuColumnCollapsed, setMenuColumnCollapsed] = useState(false);
  const [tablesView, setTablesView] = useState<PosDiningTablesView>("list");
  const [productByVariantId, setProductByVariantId] = useState<
    Record<string, DiningLineProductMeta>
  >({});
  const refreshRef = useRef(0);
  /** After first successful load for the current tab, refreshes stay silent (no spinner). */
  const listHydratedRef = useRef(false);
  const refreshListRef = useRef<(opts?: { silent?: boolean }) => void>(() => {});
  /** Evita flash de loading cuando ya tenemos el detalle al abrir mesa/barra/takeaway. */
  const skipDetailFetchForOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    setMenuColumnCollapsed(readPosDiningMenuColumnCollapsed());
    setTablesView(readPosDiningTablesView());
  }, []);

  const setMenuCollapsedPersist = useCallback((collapsed: boolean) => {
    setMenuColumnCollapsed(collapsed);
    writePosDiningMenuColumnCollapsed(collapsed);
  }, []);

  const setTablesViewPersist = useCallback((view: PosDiningTablesView) => {
    setTablesView(view);
    writePosDiningTablesView(view);
  }, []);

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

  const upsertOrderInList = useCallback((order: PosDiningOrderSummary) => {
    setOrders((prev) => {
      const rest = prev.filter((o) => o.id !== order.id);
      return [order, ...rest];
    });
  }, []);

  const applySessionUpdated = useCallback(
    (payload: DiningSessionUpdatedPayload) => {
      if (payload.branchId !== branchId.trim()) return;
      if (payload.kind !== TAB_TO_KIND[tab]) return;

      const closed =
        payload.status === "CLOSED" || payload.status === "FREE";
      const items = Array.isArray(payload.items) ? payload.items : [];

      let missingFromList = false;

      setOrders((prev) => {
        if (closed) {
          return prev.filter((o) => o.id !== payload.orderId);
        }
        const idx = prev.findIndex((o) => o.id === payload.orderId);
        if (idx < 0) {
          missingFromList = true;
          const stub: PosDiningOrderSummary = {
            id: payload.orderId,
            branchId: payload.branchId,
            kind: payload.kind,
            displayLabel: payload.displayLabel,
            status: payload.status,
            diningTableId: payload.diningTableId ?? null,
            openedAt: new Date().toISOString(),
            lines: sessionItemsToLines(items),
          };
          return [stub, ...prev];
        }
        const existing = prev[idx]!;
        const next: PosDiningOrderSummary = {
          ...existing,
          status: payload.status,
          displayLabel: payload.displayLabel,
          diningTableId: payload.diningTableId ?? existing.diningTableId,
          lines: mergeDiningSessionLines(existing.lines ?? [], items),
        };
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      });

      setDetail((prev) => {
        if (!prev || prev.id !== payload.orderId) return prev;
        if (closed) return null;
        return {
          ...prev,
          status: payload.status,
          displayLabel: payload.displayLabel,
          diningTableId: payload.diningTableId ?? prev.diningTableId,
          lines: mergeDiningSessionLines(prev.lines ?? [], items),
        };
      });

      if (missingFromList && !closed) {
        refreshListRef.current({ silent: true });
      }
    },
    [branchId, tab],
  );

  const { connected: diningWsConnected } = useDiningBranchRealtime(
    branchId,
    applySessionUpdated,
    {
      enabled: Boolean(branchId.trim()) && !disabled,
    },
  );

  const refreshList = useCallback((opts?: { silent?: boolean }) => {
    if (!branchId.trim()) return;
    const ticket = ++refreshRef.current;
    const silent = opts?.silent === true || listHydratedRef.current;
    if (!silent) setListLoading(true);
    setListError(null);
    void listPosDiningOrdersAction({
      branchId: branchId.trim(),
      kind: TAB_TO_KIND[tab],
    })
      .then((res) => {
        if (ticket !== refreshRef.current) return;
        if (!res.success) {
          if (redirectToLoginIfUnauthorized(res)) return;
          setListError(res.message);
          setOrders([]);
          listHydratedRef.current = false;
          return;
        }
        setOrders(res.orders);
        listHydratedRef.current = true;
      })
      .catch((e) => {
        if (ticket !== refreshRef.current) return;
        setListError(e instanceof Error ? e.message : "No se pudieron cargar las cuentas");
        setOrders([]);
        listHydratedRef.current = false;
      })
      .finally(() => {
        if (ticket === refreshRef.current) {
          setListLoading(false);
        }
      });
  }, [branchId, tab]);

  refreshListRef.current = refreshList;

  useEffect(() => {
    if (!branchId.trim()) return;
    void listPosDiningRoomsAction(branchId.trim()).then((res) => {
      if (!res.success) return;
      setRooms(res.rooms.filter((r) => r.isActive));
    });
    void getPosDiningBranchSettingsAction(branchId.trim()).then((res) => {
      if (!res.success) return;
      setAllowPosOpenTable(res.settings.allowPosOpenTable === true);
    });
  }, [branchId]);

  useEffect(() => {
    listHydratedRef.current = false;
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!urlOrderId) {
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
      return;
    }
    if (skipDetailFetchForOrderIdRef.current === urlOrderId) {
      skipDetailFetchForOrderIdRef.current = null;
      setDetailLoading(false);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    void getPosDiningOrderAction(urlOrderId)
      .then((res) => {
        if (cancelled) return;
        if (!res.success) {
          if (redirectToLoginIfUnauthorized(res)) return;
          setDetailError(res.message);
          setDetail(null);
          return;
        }
        setDetail(res.order);
      })
      .catch((e) => {
        if (cancelled) return;
        setDetailError(e instanceof Error ? e.message : "No se pudo cargar la cuenta");
        setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
      setProductByVariantId({});
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
      const next: Record<string, DiningLineProductMeta> = {};
      for (const p of res.products) {
        next[p.variantId] = {
          name: p.productName,
          attributes: p.attributes,
          unitPrice: Number(p.unitPriceWithTax) || 0,
          productType: p.productType ?? null,
        };
      }
      setProductByVariantId(next);
    });
  }, [branchId, detail, orders]);

  const filteredOrders = useMemo(() => {
    let rows = orders.filter(isActiveOrder);
    if (tab === "mesas" && urlRoomId) {
      rows = rows.filter((o) => o.diningRoomId === urlRoomId);
    }
    return rows;
  }, [orders, tab, urlRoomId]);

  const mesaCards = useMemo(() => {
    const orderByTableId = new Map<string, PosDiningOrderSummary>();
    for (const order of orders) {
      if (
        isActiveOrder(order) &&
        order.kind === "TABLE" &&
        order.diningTableId
      ) {
        orderByTableId.set(order.diningTableId, order);
      }
    }
    const roomList = urlRoomId
      ? rooms.filter((r) => r.id === urlRoomId)
      : rooms;
    return roomList.flatMap((room) => {
      const tables = [...(room.tables ?? [])].sort((a, b) =>
        (a.code || a.label).localeCompare(b.code || b.label, "es", {
          numeric: true,
        }),
      );
      return tables
        .filter((t) => Boolean(t.id))
        .map((t) => ({
          tableId: t.id,
          code: t.code,
          label: t.label || t.code,
          roomId: room.id,
          roomName: room.name,
          order: orderByTableId.get(t.id) ?? null,
        }));
    });
  }, [orders, rooms, urlRoomId]);

  const estimateOrderTotal = useCallback(
    (order: PosDiningOrderSummary) => {
      return order.lines
        .filter((l) => l.kitchenStatus !== "CANCELLED")
        .reduce((sum, l) => {
          const unit = productByVariantId[l.productVariantId]?.unitPrice ?? 0;
          return sum + unit * (Number(l.quantity) || 0);
        }, 0);
    },
    [productByVariantId],
  );

  const estimatedTotal = useMemo(() => {
    if (!detail) return 0;
    return estimateOrderTotal(detail);
  }, [detail, estimateOrderTotal]);

  const draftCount = useMemo(() => {
    return (detail?.lines ?? []).filter((l) => {
      if (l.kitchenStatus !== "DRAFT") return false;
      const productType = productByVariantId[l.productVariantId]?.productType;
      return diningProductNeedsKitchen(productType ?? null);
    }).length;
  }, [detail, productByVariantId]);

  const productTypeByVariantId = useMemo(() => {
    const map: Record<string, string | null | undefined> = {};
    for (const [id, meta] of Object.entries(productByVariantId)) {
      map[id] = meta.productType ?? null;
    }
    return map;
  }, [productByVariantId]);

  const canBillOrCharge = useMemo(() => {
    if (!detail) return false;
    return diningOrderCanBillOrCharge(detail.lines, productTypeByVariantId);
  }, [detail, productTypeByVariantId]);

  const isBilling = detail?.status === "BILLING";

  const kitchenProgress = useMemo(
    () => kitchenProgressFromLines(detail?.lines ?? []),
    [detail],
  );

  const kitchenFires = useMemo(
    () => groupDiningFiresForBoard(detail?.lines ?? []),
    [detail],
  );

  const canManageCounter = detail?.kind === "COUNTER" || detail?.kind === "TAKEAWAY";

  const isAccountEmpty = useMemo(() => {
    if (!detail) return false;
    return !(detail.lines ?? []).some((l) => l.kitchenStatus !== "CANCELLED");
  }, [detail]);

  const canAbandonEmpty =
    isAccountEmpty &&
    detail != null &&
    (detail.status === "OPEN" || detail.status === "SENT") &&
    !isBilling;

  const applyOpenedOrder = (order: PosDiningOrderSummary, tab: TabKey) => {
    setDetailError(null);
    setDetail(order);
    setDetailLoading(false);
    skipDetailFetchForOrderIdRef.current = order.id;
    upsertOrderInList(order);
    const params = new URLSearchParams(sp.toString());
    params.set(POS_DINING_URL_KEYS.tab, tab);
    params.set(POS_DINING_URL_KEYS.orderId, order.id);
    navigateDining(params);
    refreshList({ silent: true });
  };

  const handleOpenTable = (diningTableId: string) => {
    const tid = diningTableId.trim();
    if (!branchId.trim() || !tid) return;
    setActionBusy(true);
    setActionError(null);
    void openPosTableOrderAction(branchId.trim(), tid).then((res) => {
      setActionBusy(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setActionError(res.message);
        return;
      }
      applyOpenedOrder(res.order, "mesas");
    });
  };

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
      applyOpenedOrder(res.order, "barra");
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
      applyOpenedOrder(res.order, "takeaway");
    });
  };

  const handleSendToKitchen = (lineIds?: string[]) => {
    if (!detail) return;
    setActionBusy(true);
    setActionError(null);
    void sendPosDiningOrderToKitchenAction(detail.id, lineIds).then((res) => {
      setActionBusy(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setActionError(res.message);
        return;
      }
      setDetail(res.order);
      upsertOrderInList(res.order);
      refreshList({ silent: true });
    });
  };

  const handleFireReadyForPickup = (fireId: string) => {
    if (!detail) return;
    setActionBusy(true);
    setActionError(null);
    void markPosDiningFireReadyForPickupAction(detail.id, fireId).then((res) => {
      setActionBusy(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setActionError(res.message);
        return;
      }
      setDetail(res.order);
      upsertOrderInList(res.order);
      refreshList({ silent: true });
    });
  };

  const handleFireDelivered = (fireId: string) => {
    if (!detail) return;
    setActionBusy(true);
    setActionError(null);
    void markPosDiningFireDeliveredAction(detail.id, fireId).then((res) => {
      setActionBusy(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setActionError(res.message);
        return;
      }
      setDetail(res.order);
      upsertOrderInList(res.order);
      refreshList({ silent: true });
    });
  };

  const handleCancelLines = (lineIds: string[]) => {
    if (!detail || lineIds.length === 0) return;
    const orderId = detail.id;
    setActionBusy(true);
    setActionError(null);
    void (async () => {
      let lastOrder = detail;
      for (const lineId of lineIds) {
        const res = await cancelPosDiningOrderItemAction(orderId, lineId);
        if (!res.success) {
          setActionBusy(false);
          if (redirectToLoginIfUnauthorized(res)) return;
          setActionError(res.message);
          if (lastOrder) {
            setDetail(lastOrder);
            upsertOrderInList(lastOrder);
          }
          refreshList({ silent: true });
          return;
        }
        lastOrder = res.order;
      }
      setActionBusy(false);
      setDetail(lastOrder);
      upsertOrderInList(lastOrder);
      refreshList({ silent: true });
    })();
  };

  const handleUpdateNotes = (lineIds: string[], notes: string | null) => {
    if (!detail || lineIds.length === 0) return;
    const orderId = detail.id;
    setActionBusy(true);
    setActionError(null);
    void (async () => {
      let lastOrder = detail;
      for (const lineId of lineIds) {
        const res = await updatePosDiningOrderLineNotesAction(
          orderId,
          lineId,
          notes,
        );
        if (!res.success) {
          setActionBusy(false);
          if (redirectToLoginIfUnauthorized(res)) return;
          setActionError(res.message);
          if (lastOrder) {
            setDetail(lastOrder);
            upsertOrderInList(lastOrder);
          }
          refreshList({ silent: true });
          return;
        }
        lastOrder = res.order;
      }
      setActionBusy(false);
      setDetail(lastOrder);
      upsertOrderInList(lastOrder);
      refreshList({ silent: true });
    })();
  };

  const handleCobrar = async () => {
    if (!detail) return;
    setActionBusy(true);
    setActionError(null);

    if (!diningOrderCanBillOrCharge(detail.lines, productTypeByVariantId)) {
      setActionBusy(false);
      setActionError(
        "Hay productos PREPARADO pendientes de cocina. Espere a que estén listos antes de cobrar.",
      );
      return;
    }

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

    diningPayment.startDiningPayment({
      order: {
        id: order.id,
        displayLabel: order.displayLabel,
        kind: order.kind,
      },
      lines: cartLines,
    });
    setActionBusy(false);
    const tab = diningKindToTab(order.kind);
    const params = new URLSearchParams({
      mode: "dining",
      diningOrderId: order.id,
      diningTab: tab,
    });
    router.push(`/pos/payment?${params.toString()}`);
  };

  const handleRequestBillAndPrint = async () => {
    if (!detail) return;
    setActionBusy(true);
    setActionError(null);

    if (!diningOrderCanBillOrCharge(detail.lines, productTypeByVariantId)) {
      setActionBusy(false);
      setActionError(
        "Hay productos PREPARADO pendientes de cocina. Espere a que estén listos antes de pedir la cuenta.",
      );
      return;
    }

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
      upsertOrderInList(order);
    }

    const activeLines = order.lines.filter((l) => l.kitchenStatus !== "CANCELLED");
    if (activeLines.length === 0) {
      setActionBusy(false);
      setActionError("La cuenta no tiene ítems para imprimir.");
      return;
    }

    let products = productByVariantId;
    const missing = activeLines.some((l) => !products[l.productVariantId]);
    if (missing) {
      const ctx = readPosContextClient();
      const lookupRes = await lookupPosVariantsAction({
        variantIds: [...new Set(activeLines.map((l) => l.productVariantId))],
        pointOfSaleId: ctx?.pointOfSaleId ?? null,
        branchId: ctx?.branchId ?? branchId,
        priceListId: ctx?.priceListId ?? null,
      });
      if (lookupRes.success) {
        const next: Record<string, DiningLineProductMeta> = { ...products };
        for (const p of lookupRes.products) {
          next[p.variantId] = {
            name: p.productName,
            attributes: p.attributes,
            unitPrice: Number(p.unitPriceWithTax) || 0,
            productType: p.productType ?? null,
          };
        }
        products = next;
        setProductByVariantId(next);
      }
    }

    const tableCode =
      order.tableCode?.trim() ||
      mesaCards.find((m) => m.order?.id === order.id)?.code ||
      null;

    const lines = activeLines.map((l) => {
      const meta = products[l.productVariantId];
      const attrs = (meta?.attributes ?? [])
        .map((a) => a.attributeValue?.trim())
        .filter(Boolean) as string[];
      const baseName = meta?.name?.trim() || l.productVariantId;
      const name = attrs.length > 0 ? `${baseName} · ${attrs.join(" · ")}` : baseName;
      return {
        name,
        quantity: Number(l.quantity) || 0,
        unitPrice: meta?.unitPrice ?? 0,
        notes: l.notes ?? null,
      };
    });

    let company = null as Awaited<ReturnType<typeof getCompanyDetailsAction>>;
    try {
      company = (await getCompanyDetailsAction()) ?? null;
    } catch {
      company = null;
    }

    const fiscalTotal = lines.reduce(
      (sum, l) => sum + Math.round((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0)),
      0,
    );
    let tipSuggestPercent: number | null = null;
    let tipSuggestedAmount: number | null = null;
    try {
      const tipRes = await getCompanyTipSettingsForPosAction();
      if (tipRes.success && tipRes.tipSettings?.enabled) {
        tipSuggestPercent = tipRes.tipSettings.suggestPercent;
        tipSuggestedAmount = Math.max(
          0,
          Math.round((fiscalTotal * tipSuggestPercent) / 100),
        );
      }
    } catch {
      // tips optional
    }

    await printDiningAccountTicketAgentOrBrowser({
      orderId: order.id,
      displayLabel: order.displayLabel,
      tableCode,
      kind: order.kind,
      status: order.status,
      lines,
      company,
      tipSuggestPercent,
      tipSuggestedAmount,
    });
    setActionBusy(false);
    refreshList({ silent: true });
  };

  const handleReopenAccount = () => {
    if (!detail || detail.status !== "BILLING") return;
    setActionBusy(true);
    setActionError(null);
    void reopenPosDiningOrderAction(detail.id).then((res) => {
      setActionBusy(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setActionError(res.message);
        return;
      }
      setDetail(res.order);
      upsertOrderInList(res.order);
      refreshList({ silent: true });
    });
  };

  const handleAbandonEmptyAccount = () => {
    if (!detail || !canAbandonEmpty) return;
    const orderId = detail.id;
    setActionBusy(true);
    setActionError(null);
    void abandonEmptyPosDiningOrderAction(orderId).then((res) => {
      setActionBusy(false);
      if (!res.success) {
        if (redirectToLoginIfUnauthorized(res)) return;
        setActionError(res.message);
        return;
      }
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setDetail(null);
      setDetailError(null);
      setSelectedOrderId(null);
      refreshList({ silent: true });
    });
  };

  const handleMenuOrderUpdated = (order: PosDiningOrderSummary) => {
    setDetail(order);
    upsertOrderInList(order);
    refreshList({ silent: true });
  };

  const renderFreeTableCard = (
    mesa: {
      tableId: string;
      code: string;
      label: string;
      roomName: string;
    },
    layout: "list" | "grid" = "list",
  ) => {
    const title = mesa.label.startsWith("Mesa ")
      ? mesa.label
      : `Mesa ${mesa.code || mesa.label}`;
    const shortLabel = mesa.code?.trim() || mesa.label;
    const openDisabled =
      disabled || actionBusy || !branchId.trim() || !allowPosOpenTable;
    const openTitle = allowPosOpenTable
      ? "Abrir mesa"
      : "Habilitá «POS (pantalla Cuentas)» en Configuración KaiFood";

    if (layout === "grid") {
      return (
        <button
          key={mesa.tableId}
          type="button"
          disabled={openDisabled}
          title={openTitle}
          aria-label={`Abrir mesa ${title}`}
          onClick={() => handleOpenTable(mesa.tableId)}
          className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface p-2 text-center shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
          data-test-id={`pos-dining-table-free-${mesa.tableId}`}
          data-layout="grid"
        >
          <span className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
            {shortLabel}
          </span>
          <Badge variant="primary" className="text-[9px]">
            Libre
          </Badge>
        </button>
      );
    }

    return (
      <div
        key={mesa.tableId}
        className="flex w-full flex-col gap-2 rounded-xl border border-border bg-surface p-3 text-left shadow-sm"
        data-test-id={`pos-dining-table-free-${mesa.tableId}`}
        data-layout="list"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            <p className="truncate text-[11px] text-muted-foreground">{mesa.roomName}</p>
          </div>
          <Badge variant="primary" className="shrink-0 text-[10px]">
            Libre
          </Badge>
        </div>
        <Button
          type="button"
          variant="outlined"
          size="sm"
          className="w-full"
          disabled={openDisabled}
          aria-label={`Abrir mesa ${title}`}
          title={openTitle}
          onClick={() => handleOpenTable(mesa.tableId)}
          data-test-id={`pos-dining-open-table-${mesa.tableId}`}
        >
          Abrir mesa
        </Button>
      </div>
    );
  };

  const renderOrderButton = (
    order: PosDiningOrderSummary,
    layout: "list" | "grid" = "list",
  ) => {
    const activeLines = order.lines.filter((l) => l.kitchenStatus !== "CANCELLED");
    const progress = kitchenProgressFromLines(order.lines);
    const selected = order.id === urlOrderId;
    const isBilling = order.status === "BILLING";
    const allReady = !isBilling && diningOrderAllKitchenReady(order.lines);
    const title = diningAccountTitle(order);
    const estimated = estimateOrderTotal(order);
    const showKitchenProgress =
      !isBilling && (progress.inKitchen > 0 || progress.ready > 0);
    const tone = isBilling
      ? selected
        ? "border-amber-500/50 bg-amber-500/10"
        : "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10"
      : selected
        ? allReady
          ? "border-success/50 bg-success/15"
          : "border-primary/50 bg-primary/5"
        : allReady
          ? "border-success/40 bg-success/10 hover:border-success/50 hover:bg-success/15"
          : "border-border bg-surface hover:border-primary/40 hover:bg-primary/5";

    if (layout === "grid") {
      return (
        <button
          key={order.id}
          type="button"
          disabled={disabled}
          onClick={() => setSelectedOrderId(order.id)}
          className={`flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${tone}`}
          data-test-id={`pos-dining-pick-${order.id}`}
          data-all-ready={allReady ? "true" : "false"}
          data-billing={isBilling ? "true" : "false"}
          data-layout="grid"
        >
          <span className="line-clamp-2 text-xs font-semibold leading-tight text-foreground">
            {title}
          </span>
          {isBilling ? (
            <Badge variant="secondary-outlined" className="text-[9px]">
              Por cobrar
            </Badge>
          ) : showKitchenProgress ? (
            <span className="text-[9px] tabular-nums text-muted-foreground">
              {progress.inKitchen > 0 ? `Cocina ${progress.inKitchen}` : null}
              {progress.inKitchen > 0 &&
              (progress.kitchenReady > 0 || progress.pickupReady > 0)
                ? " · "
                : null}
              {progress.kitchenReady > 0
                ? `Cocina lista ${progress.kitchenReady}`
                : null}
              {progress.kitchenReady > 0 && progress.pickupReady > 0 ? " · " : null}
              {progress.pickupReady > 0
                ? `Retirar ${progress.pickupReady}`
                : null}
            </span>
          ) : (
            <Badge variant="secondary-outlined" className="text-[9px]">
              {diningOrderStatusLabel(order.status)}
            </Badge>
          )}
          <span
            className="text-[11px] font-semibold tabular-nums text-foreground"
            data-test-id={`pos-dining-pick-estimated-${order.id}`}
          >
            {formatMoney(estimated)}
          </span>
        </button>
      );
    }

    return (
      <button
        key={order.id}
        type="button"
        disabled={disabled}
        onClick={() => setSelectedOrderId(order.id)}
        className={`block w-full rounded-xl border p-3 text-left shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${tone}`}
        data-test-id={`pos-dining-pick-${order.id}`}
        data-all-ready={allReady ? "true" : "false"}
        data-billing={isBilling ? "true" : "false"}
        data-layout="list"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            <p className="truncate text-[11px] text-muted-foreground">{order.displayLabel}</p>
          </div>
          {isBilling ? (
            <Badge
              variant="secondary-outlined"
              className="shrink-0 text-[10px]"
              data-test-id={`pos-dining-pick-badge-billing-${order.id}`}
            >
              Por cobrar
            </Badge>
          ) : showKitchenProgress ? (
            <div className="flex max-w-[55%] shrink-0 flex-wrap justify-end gap-1">
              {progress.inKitchen > 0 ? (
                <span aria-label={`En cocina ${progress.inKitchen}`}>
                  <Badge
                    variant="primary-outlined"
                    className="text-[10px]"
                    data-test-id={`pos-dining-pick-badge-in-kitchen-${order.id}`}
                  >
                    {`En cocina ${progress.inKitchen}`}
                  </Badge>
                </span>
              ) : null}
              {progress.kitchenReady > 0 ? (
                <span aria-label={`Cocina lista ${progress.kitchenReady}`}>
                  <Badge
                    variant="warning-outlined"
                    className="text-[10px]"
                    data-test-id={`pos-dining-pick-badge-kitchen-ready-${order.id}`}
                  >
                    {`Cocina lista ${progress.kitchenReady}`}
                  </Badge>
                </span>
              ) : null}
              {progress.pickupReady > 0 ? (
                <span aria-label={`Retirar ${progress.pickupReady}`}>
                  <Badge
                    variant="success-outlined"
                    className="text-[10px]"
                    data-test-id={`pos-dining-pick-badge-ready-${order.id}`}
                  >
                    {`Retirar ${progress.pickupReady}`}
                  </Badge>
                </span>
              ) : null}
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
        <div className="flex items-start gap-2">
          <div
            className="flex min-w-0 flex-1 flex-wrap gap-1.5"
            role="group"
            aria-label="Filtrar por salón"
            data-test-id="pos-dining-room-filter"
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => setRoomFilter("")}
              className="rounded-full disabled:cursor-not-allowed disabled:opacity-50"
              aria-pressed={!urlRoomId}
              data-test-id="pos-dining-room-filter-all"
            >
              <Badge variant={!urlRoomId ? "primary" : "secondary-outlined"} className="text-[11px]">
                Todos
              </Badge>
            </button>
            {rooms.map((room) => {
              const active = urlRoomId === room.id;
              return (
                <button
                  key={room.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setRoomFilter(room.id)}
                  className="rounded-full disabled:cursor-not-allowed disabled:opacity-50"
                  aria-pressed={active}
                  data-test-id={`pos-dining-room-filter-${room.id}`}
                >
                  <Badge
                    variant={active ? "primary" : "secondary-outlined"}
                    className="text-[11px]"
                  >
                    {room.name}
                  </Badge>
                </button>
              );
            })}
          </div>
          <IconButton
            icon={tablesView === "grid" ? "LayoutList" : "LayoutGrid"}
            variant="action"
            size="sm"
            className="shrink-0"
            ariaLabel={
              tablesView === "grid" ? "Vista lista de mesas" : "Vista grilla de mesas"
            }
            title={tablesView === "grid" ? "Vista lista" : "Vista grilla"}
            disabled={disabled}
            onClick={() =>
              setTablesViewPersist(tablesView === "grid" ? "list" : "grid")
            }
            data-test-id="pos-dining-tables-view-toggle"
          />
        </div>
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
          <div
            className={
              tab === "mesas" && tablesView === "grid"
                ? menuColumnCollapsed
                  ? "grid grid-cols-5 gap-2"
                  : "grid grid-cols-3 gap-2"
                : "space-y-2"
            }
            data-tables-view={tab === "mesas" ? tablesView : undefined}
          >
            {tab === "mesas" ? (
              <>
                {mesaCards.length === 0 ? (
                  <p className="col-span-full text-sm text-muted-foreground">
                    No hay mesas en este salón.
                  </p>
                ) : null}
                {mesaCards.map((mesa) =>
                  mesa.order
                    ? renderOrderButton(mesa.order, tablesView)
                    : renderFreeTableCard(mesa, tablesView),
                )}
              </>
            ) : (
              <>
                {filteredOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay cuentas activas.</p>
                ) : null}
                {filteredOrders.map((order) => renderOrderButton(order, "list"))}
              </>
            )}
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

            <PosDiningOrderLineGroups
              lines={detail.lines}
              productByVariantId={productByVariantId}
              disabled={disabled || isBilling}
              busy={actionBusy}
              onSendLines={(lineIds) => handleSendToKitchen(lineIds)}
              onCancelLines={handleCancelLines}
              onUpdateNotes={handleUpdateNotes}
            />
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
              disabled={disabled || actionBusy || isBilling}
              data-test-id="pos-dining-add-item-btn"
            >
              Agregar ítem
            </Button>
          ) : null}
          <div className="flex items-center gap-2">
            {kitchenProgress.total > 0 &&
            (kitchenFires.preparing.length > 0 ||
              kitchenFires.kitchenReady.length > 0 ||
              kitchenFires.pickupReady.length > 0) ? (
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                {kitchenFires.preparing.map((fire) => {
                  const label =
                    fire.kitchenFireNumber != null
                      ? `En cocina #${fire.kitchenFireNumber}`
                      : `En cocina (${fire.lineCount})`;
                  return (
                    <span
                      key={`prep-${fire.fireId}`}
                      title="Pedido en cocina"
                      aria-label={label}
                      className="rounded-full"
                      data-test-id={`pos-dining-badge-in-kitchen-fire-${fire.fireId}`}
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
                  return (
                    <button
                      key={`kitchen-ready-${fire.fireId}`}
                      type="button"
                      disabled={disabled || actionBusy || isBilling}
                      title="Marcar listo para retirar (Kai Board)"
                      aria-label={`${label}. Marcar listo para retirar`}
                      onClick={() => handleFireReadyForPickup(fire.fireId)}
                      className="rounded-full disabled:cursor-not-allowed disabled:opacity-50"
                      data-test-id={`pos-dining-badge-kitchen-ready-fire-${fire.fireId}`}
                    >
                      <Badge variant="warning-outlined" className="text-[10px]">
                        {label}
                      </Badge>
                    </button>
                  );
                })}
                {kitchenFires.pickupReady.map((fire) => {
                  const label =
                    fire.kitchenFireNumber != null
                      ? `Retirar #${fire.kitchenFireNumber}`
                      : `Retirar (${fire.lineCount})`;
                  return (
                    <button
                      key={`pickup-${fire.fireId}`}
                      type="button"
                      disabled={disabled || actionBusy || isBilling}
                      title="Marcar entregado (quitar de Kai Board)"
                      aria-label={`${label}. Marcar entregado`}
                      onClick={() => handleFireDelivered(fire.fireId)}
                      className="rounded-full disabled:cursor-not-allowed disabled:opacity-50"
                      data-test-id={`pos-dining-badge-ready-fire-${fire.fireId}`}
                    >
                      <Badge variant="success-outlined" className="text-[10px]">
                        {label}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="min-w-0 flex-1" />
            )}
            <div className="flex shrink-0 items-center gap-3">
              {canAbandonEmpty ? (
                <Button
                  variant="outlined"
                  size="sm"
                  className="shrink-0"
                  disabled={disabled || actionBusy}
                  loading={actionBusy}
                  onClick={() => handleAbandonEmptyAccount()}
                  data-test-id="pos-dining-abandon-empty-btn"
                >
                  {detail.kind === "TABLE" ? "Cerrar mesa" : "Eliminar cuenta"}
                </Button>
              ) : null}
              {isBilling ? (
                <Button
                  variant="outlined"
                  size="sm"
                  className="shrink-0"
                  disabled={disabled || actionBusy}
                  loading={actionBusy}
                  onClick={() => handleReopenAccount()}
                  data-test-id="pos-dining-reopen-btn"
                >
                  Reabrir cuenta
                </Button>
              ) : null}
              {draftCount > 0 && !isBilling ? (
                <IconButton
                  icon="ChefHat"
                  variant="secondary"
                  size="lg"
                  className="shrink-0"
                  ariaLabel={`Enviar a cocina (${draftCount})`}
                  title={`Enviar a cocina (${draftCount})`}
                  disabled={disabled || actionBusy}
                  isLoading={actionBusy}
                  onClick={() => handleSendToKitchen()}
                  data-test-id="pos-dining-fire-btn"
                />
              ) : null}
              <IconButton
                icon="Receipt"
                variant="outlined"
                size="lg"
                className="shrink-0"
                ariaLabel={
                  actionBusy ? "Imprimiendo cuenta" : "Cuenta (por cobrar)"
                }
                title={
                  !canBillOrCharge
                    ? "Espere a que los PREPARADO estén listos"
                    : actionBusy
                      ? "Procesando…"
                      : "Imprimir cuenta (por cobrar)"
                }
                disabled={
                  disabled ||
                  actionBusy ||
                  detail.lines.length === 0 ||
                  !canBillOrCharge
                }
                isLoading={actionBusy}
                onClick={() => void handleRequestBillAndPrint()}
                data-test-id="pos-dining-account-ticket-btn"
              />
              <IconButton
                icon="CircleDollarSign"
                variant="outlined"
                size="lg"
                className="shrink-0"
                ariaLabel={actionBusy ? "Procesando cobro" : "Cobrar"}
                title={
                  !canBillOrCharge
                    ? "Espere a que los PREPARADO estén listos"
                    : actionBusy
                      ? "Procesando…"
                      : "Cobrar"
                }
                disabled={
                  disabled ||
                  actionBusy ||
                  detail.lines.length === 0 ||
                  !canBillOrCharge
                }
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
              if (res.success) {
                setDetail(res.order);
                upsertOrderInList(res.order);
              }
              refreshList({ silent: true });
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
          refreshList({ silent: true });
          if (urlOrderId === renameTarget.id) {
            void getPosDiningOrderAction(renameTarget.id).then((res) => {
              if (res.success) {
                setDetail(res.order);
                upsertOrderInList(res.order);
              }
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
        className={`relative grid w-full gap-4 ${shellClass} ${
          menuColumnCollapsed
            ? "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
            : "grid-cols-3"
        }`}
        style={shellStyle}
        data-test-id="pos-dining-accounts-desktop"
        data-dining-ws={diningWsConnected ? "connected" : "disconnected"}
        data-menu-collapsed={menuColumnCollapsed ? "1" : "0"}
      >
        <aside
          className="flex h-full min-h-0 min-w-0 flex-col gap-3 rounded-xl border border-border bg-background p-4"
          aria-label="Cuentas"
          data-test-id="pos-dining-accounts-column"
        >
          <div className="shrink-0">{tabSelector}</div>
          {accountsListBody}
        </aside>

        {menuColumnCollapsed ? (
          <aside
            className={`flex w-11 shrink-0 flex-col items-center rounded-xl border border-border bg-background py-3 ${
              fillViewport ? "h-full min-h-0" : ""
            }`}
            style={
              fillViewport
                ? undefined
                : { height: `${heightVh}vh`, minHeight: `${heightVh}vh` }
            }
            aria-label="Menú colapsado"
            data-test-id="pos-dining-menu-column-collapsed"
          >
            <IconButton
              icon="PanelLeftOpen"
              variant="action"
              size="sm"
              ariaLabel="Expandir menú"
              title="Expandir menú"
              onClick={() => setMenuCollapsedPersist(false)}
              data-test-id="pos-dining-menu-expand"
            />
          </aside>
        ) : null}
        {/* Mantener montado al colapsar para no perder filtros/búsqueda en sesión. */}
        <div
          className={
            menuColumnCollapsed
              ? "pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
              : "flex min-h-0 min-w-0 flex-col"
          }
          aria-hidden={menuColumnCollapsed || undefined}
        >
          <PosDiningMenuColumn
            orderId={urlOrderId || null}
            disabled={disabled || isBilling}
            fillViewport={fillViewport}
            heightVh={heightVh}
            onOrderUpdated={handleMenuOrderUpdated}
            onCollapse={() => setMenuCollapsedPersist(true)}
          />
        </div>

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
      data-dining-ws={diningWsConnected ? "connected" : "disconnected"}
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
