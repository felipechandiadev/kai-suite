import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Package,
  PackageCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { getTodayIso, parseIsoDateForDisplay, timeToMinutes } from "@kai/ui";
import type {
  DeliveryOperationsBoard,
  DeliveryOperationsOrder,
  DeliveryOperationsStatus,
} from "@/features/e-shop-delivery/types/delivery.types";

const SANTIAGO_TZ = "America/Santiago";

/** Etapas visibles en el tablero de operación (feliz + incidencia). */
export const OPERATIONS_STAGES: DeliveryOperationsStatus[] = [
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_DISPATCH",
  "IN_TRANSIT",
  "DELIVERED",
  "ISSUE",
];

export const STATUS_ICONS: Record<DeliveryOperationsStatus, LucideIcon> = {
  CONFIRMED: ClipboardList,
  PREPARING: Package,
  READY_FOR_DISPATCH: PackageCheck,
  IN_TRANSIT: Truck,
  DELIVERED: CheckCircle2,
  ISSUE: AlertTriangle,
};

/** Etiquetas en plural (encabezados de columna). */
export const STATUS_LABELS: Record<DeliveryOperationsStatus, string> = {
  CONFIRMED: "Confirmados",
  PREPARING: "Preparando",
  READY_FOR_DISPATCH: "Listos",
  IN_TRANSIT: "En camino",
  DELIVERED: "Entregados",
  ISSUE: "Incidencia",
};

/** Etiquetas en singular (chips de estado). */
export const STATUS_LABELS_SINGULAR: Record<DeliveryOperationsStatus, string> = {
  CONFIRMED: "Confirmado",
  PREPARING: "Preparando",
  READY_FOR_DISPATCH: "Listo",
  IN_TRANSIT: "En camino",
  DELIVERED: "Entregado",
  ISSUE: "Incidencia",
};

/** Camino feliz: CONFIRMED → PREPARING → READY_FOR_DISPATCH → IN_TRANSIT → DELIVERED. */
const HAPPY_PATH: Record<string, DeliveryOperationsStatus> = {
  CONFIRMED: "PREPARING",
  PREPARING: "READY_FOR_DISPATCH",
  READY_FOR_DISPATCH: "IN_TRANSIT",
  IN_TRANSIT: "DELIVERED",
};

const NON_HAPPY_TARGETS = new Set(["ISSUE", "CANCELLED", "RETURNED"]);

function isOperationsStage(status: string): status is DeliveryOperationsStatus {
  return OPERATIONS_STAGES.includes(status as DeliveryOperationsStatus);
}

export function statusLabel(status: string): string {
  return isOperationsStage(status) ? STATUS_LABELS_SINGULAR[status] : status;
}

export function primaryNextStatus(
  current: string,
  allowed: readonly string[],
): DeliveryOperationsStatus | null {
  const happy = HAPPY_PATH[current];
  if (happy && allowed.includes(happy)) return happy;
  for (const status of allowed) {
    if (!NON_HAPPY_TARGETS.has(status) && isOperationsStage(status)) {
      return status;
    }
  }
  const first = allowed[0];
  return first && isOperationsStage(first) ? first : null;
}

export function advanceActionLabel(nextStatus: DeliveryOperationsStatus): string {
  switch (nextStatus) {
    case "PREPARING":
      return "Marcar preparando";
    case "READY_FOR_DISPATCH":
      return "Marcar listo";
    case "IN_TRANSIT":
      return "Marcar en camino";
    case "DELIVERED":
      return "Marcar entregado";
    case "ISSUE":
      return "Reportar incidencia";
    default:
      return `→ ${STATUS_LABELS_SINGULAR[nextStatus]}`;
  }
}

export function defaultStage(board: DeliveryOperationsBoard): DeliveryOperationsStatus {
  const bodega: DeliveryOperationsStatus[] = [
    "PREPARING",
    "CONFIRMED",
    "READY_FOR_DISPATCH",
  ];
  for (const stage of bodega) {
    if ((board.totals[stage] ?? 0) > 0) return stage;
  }
  for (const stage of OPERATIONS_STAGES) {
    if ((board.totals[stage] ?? 0) > 0) return stage;
  }
  return "PREPARING";
}

export function totalActiveOrders(board: DeliveryOperationsBoard): number {
  return OPERATIONS_STAGES.reduce(
    (sum, status) => sum + (board.totals[status] ?? 0),
    0,
  );
}

export function orderMatchesOperationsSearch(
  order: DeliveryOperationsOrder,
  rawQuery: string,
): boolean {
  const query = rawQuery.trim().replace(/^#/, "").toLowerCase();
  if (!query) return false;

  if (order.orderNumber.toLowerCase().includes(query)) return true;
  if (order.customerLabel.toLowerCase().includes(query)) return true;
  if (order.itemsSummary.toLowerCase().includes(query)) return true;

  return order.lines.some(
    (line) =>
      line.productName.toLowerCase().includes(query) ||
      line.variantLabel.toLowerCase().includes(query),
  );
}

export function formatOperationsDate(dateStr: string): string {
  const date = parseIsoDateForDisplay(dateStr);
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: SANTIAGO_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatCurrency(clp: number): string {
  return `$${Math.round(clp).toLocaleString("es-CL")}`;
}

export function totalOrderCount(
  counts: Partial<Record<string, number>>,
): number {
  return Object.values(counts).reduce<number>(
    (sum, n) => sum + (n ?? 0),
    0,
  );
}

export function isCutoffOpen(
  occurrenceDate: string,
  orderCutoffTime: string,
): boolean {
  const today = getTodayIso();
  if (occurrenceDate < today) return false;
  if (occurrenceDate > today) return true;
  const nowParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SANTIAGO_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(nowParts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(nowParts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute < timeToMinutes(orderCutoffTime);
}

export type RepartoStartReadiness = {
  canStart: boolean;
  reason: string | null;
  blockingCount: number;
  readyCount: number;
  issueCount: number;
};

const STARTABLE_ROUTE_STATUSES = ["planned", "route_ready"];

export function evaluateRepartoStartReadinessFromCounts(input: {
  orderCounts: Partial<Record<string, number>>;
  stopCount: number;
  driverUserId: string | null;
  routeStatus: string;
}): RepartoStartReadiness {
  const blockingCount =
    (input.orderCounts.SUBMITTED ?? 0) +
    (input.orderCounts.CONFIRMED ?? 0) +
    (input.orderCounts.PREPARING ?? 0);
  const readyCount = input.orderCounts.READY_FOR_DISPATCH ?? 0;
  const issueCount = input.orderCounts.ISSUE ?? 0;

  let reason: string | null = null;

  if (!STARTABLE_ROUTE_STATUSES.includes(input.routeStatus)) {
    reason = "El reparto no puede iniciarse en su estado actual";
  } else if (!input.driverUserId) {
    reason = "Asigna un repartidor antes de iniciar el reparto";
  } else if (blockingCount > 0) {
    reason =
      blockingCount === 1
        ? "1 pedido aún en preparación"
        : `${blockingCount} pedidos aún en preparación`;
  } else if (readyCount === 0) {
    reason = "No hay pedidos listos para reparto";
  } else if (input.stopCount === 0) {
    reason = "Optimiza la ruta antes de iniciar el reparto";
  }

  return {
    canStart: reason === null,
    reason,
    blockingCount,
    readyCount,
    issueCount,
  };
}

export function evaluateBoardStartReadiness(
  board: DeliveryOperationsBoard,
): RepartoStartReadiness {
  const occurrence = board.occurrence;
  const hasOptimizedRoute =
    occurrence != null &&
    (occurrence.routeStatus === "route_ready" ||
      occurrence.totalDistanceM != null ||
      occurrence.stopCount > 0);

  return evaluateRepartoStartReadinessFromCounts({
    orderCounts: board.totals,
    stopCount: hasOptimizedRoute ? occurrence?.stopCount || 1 : 0,
    driverUserId: occurrence?.driverUserId ?? null,
    routeStatus: occurrence?.routeStatus ?? "planned",
  });
}

export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(limit, queue.length) },
    async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item !== undefined) await fn(item);
      }
    },
  );
  await Promise.all(workers);
}
