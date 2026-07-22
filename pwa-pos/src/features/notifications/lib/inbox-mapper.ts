import type { InboxItem } from "../types/notification.types";
import {
  formatAttributeValues,
  productNameFromNotificationTitle,
} from "./variant-display";

export type NotificationRow = {
  deliveryId: string;
  title: string;
  body: string | null;
  kind: string;
  receivedAt: number;
  productName: string;
  attributesLabel: string;
  storageName: string;
  physicalStock: number;
  alertLabels: string[];
  /** Resumen cocina (ítem/pedido listo). */
  diningItems?: Array<{
    name: string;
    quantity: number;
    notes: string | null;
  }>;
};

function alertLabelsFromPayload(
  payload: Record<string, unknown>,
  kind: string,
): string[] {
  const rawAlerts = payload.alerts;
  if (Array.isArray(rawAlerts) && rawAlerts.length > 0) {
    return rawAlerts.map((a) => String(a).replace(/^stock\./, ""));
  }
  const alertKind = String(payload.alertKind ?? "").trim();
  if (alertKind) {
    return [alertKind.replace(/^stock\./, "")];
  }
  if (kind) {
    return [kind.replace(/^stock\./, "")];
  }
  return ["stock"];
}

export function normalizeInboxItem(raw: unknown): InboxItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const notificationRaw = r.notification;
  if (!notificationRaw || typeof notificationRaw !== "object") return null;
  const n = notificationRaw as Record<string, unknown>;
  const deliveryId = String(r.deliveryId ?? r.delivery_id ?? "").trim();
  if (!deliveryId) return null;

  return {
    deliveryId,
    status: String(r.status ?? "UNREAD") as InboxItem["status"],
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

export function inboxItemToRow(item: InboxItem, domainFilter?: string): NotificationRow | null {
  const domain = item.notification?.domain ?? "";
  if (domainFilter && domain !== domainFilter) return null;

  const n = item.notification;
  const p = n.payload ?? {};
  const displayLabel = String(p.displayLabel ?? "").trim();
  const productName =
    displayLabel ||
    String(p.productName ?? "").trim() ||
    productNameFromNotificationTitle(n.title);
  const attributesLabel =
    String(p.variantAttributes ?? "").trim() ||
    formatAttributeValues(p.attributeValues as Record<string, unknown> | undefined);
  const storageName = String(p.storageName ?? "").trim();

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

  return {
    deliveryId: item.deliveryId,
    title: n.title,
    body: n.body,
    kind: n.kind,
    receivedAt: new Date(item.deliveredAt).getTime(),
    productName,
    attributesLabel,
    storageName,
    physicalStock: Number(p.physicalStock ?? 0),
    alertLabels: alertLabelsFromPayload(p, n.kind),
    diningItems: diningItems && diningItems.length > 0 ? diningItems : undefined,
  };
}
