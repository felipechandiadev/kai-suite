import {
  DiningOrderKind,
  KitchenItemStatus,
} from '../domain/dining.enums';
import { effectiveKitchenFireId } from './dining-order-status.util';

export type DiningBoardColumn = 'PREPARING' | 'READY';

export type DiningBoardTicketDto = {
  fireId: string;
  orderId: string;
  kitchenFireNumber: number | null;
  customerName: string;
  column: DiningBoardColumn;
  readyAt: string | null;
  updatedAt: string;
};

export type DiningBoardSnapshotDto = {
  companyId: string;
  branchId: string;
  preparing: DiningBoardTicketDto[];
  ready: DiningBoardTicketDto[];
  updatedAt: string;
};

type BoardLineInput = {
  id: string;
  kitchenFireId?: string | null;
  kitchenFireNumber?: number | null;
  kitchenStatus: KitchenItemStatus;
  readyAt?: Date | string | null;
  updatedAt?: Date | string | null;
  sentToKitchenAt?: Date | string | null;
};

type BoardOrderInput = {
  id: string;
  kind: DiningOrderKind;
  status: string;
  displayLabel: string;
  profile?: { customerName?: string | null } | null;
  updatedAt?: Date | string | null;
  lines?: BoardLineInput[] | null;
};

const BOARD_KINDS = new Set<DiningOrderKind>([
  DiningOrderKind.TAKEAWAY,
  DiningOrderKind.COUNTER,
  DiningOrderKind.TABLE,
]);

const PREPARING_STATUSES = new Set<KitchenItemStatus>([
  KitchenItemStatus.SENT,
  KitchenItemStatus.PREPARING,
]);

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function resolveCustomerName(order: BoardOrderInput): string {
  const fromProfile = order.profile?.customerName?.trim();
  if (fromProfile) return fromProfile;
  // Mesas: el displayLabel ("Mesa T2") es la señal útil en el monitor.
  return order.displayLabel?.trim() || 'Cliente';
}

/**
 * Agrega fires TAKEAWAY/COUNTER/TABLE en columnas PREPARING | READY.
 */
export function buildDiningBoardSnapshot(params: {
  companyId: string;
  branchId: string;
  orders: BoardOrderInput[];
  now?: Date;
}): DiningBoardSnapshotDto {
  const nowIso = (params.now ?? new Date()).toISOString();
  const preparing: DiningBoardTicketDto[] = [];
  const ready: DiningBoardTicketDto[] = [];

  for (const order of params.orders) {
    if (!BOARD_KINDS.has(order.kind)) continue;
    if (String(order.status).toUpperCase() === 'CLOSED') continue;

    const lines = (order.lines ?? []).filter(
      (l) =>
        l.kitchenStatus !== KitchenItemStatus.CANCELLED &&
        l.kitchenStatus !== KitchenItemStatus.DRAFT,
    );
    if (lines.length === 0) continue;

    const byFire = new Map<string, BoardLineInput[]>();
    for (const line of lines) {
      const fireId = effectiveKitchenFireId(line);
      const list = byFire.get(fireId) ?? [];
      list.push(line);
      byFire.set(fireId, list);
    }

    const customerName = resolveCustomerName(order);

    for (const [fireId, fireLines] of byFire) {
      const hasPreparing = fireLines.some((l) =>
        PREPARING_STATUSES.has(l.kitchenStatus),
      );
      const readyLines = fireLines.filter(
        (l) => l.kitchenStatus === KitchenItemStatus.READY_FOR_PICKUP,
      );
      const kitchenFireNumber =
        fireLines.find((l) => l.kitchenFireNumber != null)?.kitchenFireNumber ??
        null;

      let column: DiningBoardColumn | null = null;
      if (hasPreparing) {
        column = 'PREPARING';
      } else if (readyLines.length > 0) {
        column = 'READY';
      }
      // Solo READY (cocina) sin PREPARING: fuera del board hasta ready-for-pickup.
      if (!column) continue;

      const readyAts = readyLines
        .map((l) => toIso(l.readyAt))
        .filter((v): v is string => Boolean(v));
      readyAts.sort();
      const readyAt = readyAts[0] ?? null;

      const updatedCandidates = [
        toIso(order.updatedAt),
        ...fireLines.map((l) => toIso(l.updatedAt) ?? toIso(l.sentToKitchenAt)),
        readyAt,
      ].filter((v): v is string => Boolean(v));
      updatedCandidates.sort();
      const updatedAt =
        updatedCandidates[updatedCandidates.length - 1] ?? nowIso;

      const ticket: DiningBoardTicketDto = {
        fireId,
        orderId: order.id,
        kitchenFireNumber:
          kitchenFireNumber != null ? Number(kitchenFireNumber) : null,
        customerName,
        column,
        readyAt,
        updatedAt,
      };

      if (column === 'PREPARING') preparing.push(ticket);
      else ready.push(ticket);
    }
  }

  const byNumberThenTime = (a: DiningBoardTicketDto, b: DiningBoardTicketDto) => {
    const na = a.kitchenFireNumber ?? Number.MAX_SAFE_INTEGER;
    const nb = b.kitchenFireNumber ?? Number.MAX_SAFE_INTEGER;
    if (na !== nb) return na - nb;
    return a.updatedAt.localeCompare(b.updatedAt);
  };

  preparing.sort(byNumberThenTime);
  ready.sort((a, b) => {
    const ra = a.readyAt ?? a.updatedAt;
    const rb = b.readyAt ?? b.updatedAt;
    return ra.localeCompare(rb);
  });

  return {
    companyId: params.companyId,
    branchId: params.branchId,
    preparing,
    ready,
    updatedAt: nowIso,
  };
}
