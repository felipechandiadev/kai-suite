import type { WaiterInboxItem, WaiterNotificationRow } from "../types/notification.types";

export function normalizeWaiterInboxItem(raw: unknown): WaiterInboxItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const notificationRaw = r.notification;
  if (!notificationRaw || typeof notificationRaw !== "object") return null;
  const n = notificationRaw as Record<string, unknown>;
  const deliveryId = String(r.deliveryId ?? r.delivery_id ?? "").trim();
  if (!deliveryId) return null;

  return {
    deliveryId,
    status: String(r.status ?? "UNREAD"),
    deliveredAt: String(r.deliveredAt ?? r.delivered_at ?? ""),
    readAt: (r.readAt ?? r.read_at ?? null) as string | null,
    notification: {
      id: String(n.id ?? ""),
      domain: String(n.domain ?? ""),
      kind: String(n.kind ?? ""),
      severity: String(n.severity ?? ""),
      title: String(n.title ?? ""),
      body: (n.body as string | null) ?? null,
      payload: (n.payload as Record<string, unknown>) ?? {},
      createdAt: String(n.createdAt ?? n.created_at ?? ""),
    },
  };
}

export function waiterInboxItemToRow(
  item: WaiterInboxItem,
): WaiterNotificationRow | null {
  const n = item.notification;
  if (!n.kind.startsWith("dining.")) return null;
  const p = n.payload ?? {};
  const rawItems = p.items;
  const diningItems = Array.isArray(rawItems)
    ? rawItems
        .map((raw) => {
          if (!raw || typeof raw !== "object") return null;
          const it = raw as Record<string, unknown>;
          const name = String(it.name ?? "").trim();
          if (!name) return null;
          return {
            name,
            quantity: Number(it.quantity) || 0,
            notes: (it.notes != null ? String(it.notes).trim() : "") || null,
          };
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
    : undefined;

  const fireNum = p.kitchenFireNumber;
  return {
    deliveryId: item.deliveryId,
    title: n.title,
    body: n.body,
    kind: n.kind,
    receivedAt: new Date(item.deliveredAt).getTime() || Date.now(),
    orderId: String(p.orderId ?? "").trim() || null,
    diningTableId: String(p.diningTableId ?? "").trim() || null,
    kitchenFireId: String(p.kitchenFireId ?? "").trim() || null,
    kitchenFireNumber:
      typeof fireNum === "number" && Number.isFinite(fireNum) ? fireNum : null,
    diningItems: diningItems && diningItems.length > 0 ? diningItems : undefined,
  };
}
