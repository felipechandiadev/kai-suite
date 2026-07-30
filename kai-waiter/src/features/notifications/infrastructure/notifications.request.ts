import {
  normalizeWaiterInboxItem,
  waiterInboxItemToRow,
} from "../lib/inbox-mapper";
import type {
  WaiterInboxItem,
  WaiterNotificationRow,
} from "../types/notification.types";

function clientBackendBase(): string {
  const base = process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ?? "";
  return base.replace(/\/$/, "");
}

function authHeaders(
  userId: string,
  companyId: string,
): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${userId}`,
    "X-Active-Company-Id": companyId,
  };
}

export async function fetchWaiterUnreadCount(
  userId: string,
  companyId: string,
): Promise<number> {
  const base = clientBackendBase();
  if (!base) return 0;
  try {
    const res = await fetch(
      `${base}/api/notifications/unread-count?domain=SALES`,
      { headers: authHeaders(userId, companyId) },
    );
    if (!res.ok) return 0;
    const json = (await res.json()) as { count?: number };
    return typeof json.count === "number" ? json.count : 0;
  } catch {
    return 0;
  }
}

export async function fetchWaiterDiningInbox(
  userId: string,
  companyId: string,
  limit = 30,
): Promise<WaiterNotificationRow[]> {
  const base = clientBackendBase();
  if (!base) return [];
  const search = new URLSearchParams({
    domain: "SALES",
    status: "UNREAD",
    limit: String(limit),
  });
  try {
    const res = await fetch(`${base}/api/notifications/inbox?${search}`, {
      headers: authHeaders(userId, companyId),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { items?: unknown[] };
    if (!Array.isArray(json.items)) return [];
    return json.items
      .map((row) => normalizeWaiterInboxItem(row))
      .filter((x): x is WaiterInboxItem => x != null)
      .map((item) => waiterInboxItemToRow(item))
      .filter((x): x is WaiterNotificationRow => x != null);
  } catch {
    return [];
  }
}

export async function markWaiterNotificationRead(
  userId: string,
  companyId: string,
  deliveryId: string,
): Promise<boolean> {
  const base = clientBackendBase();
  if (!base || !deliveryId) return false;
  try {
    const res = await fetch(
      `${base}/api/notifications/deliveries/${encodeURIComponent(deliveryId)}/read`,
      {
        method: "PATCH",
        headers: authHeaders(userId, companyId),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
