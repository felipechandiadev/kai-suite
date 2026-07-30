import { getClientBackendApiBase } from "@/lib/backend-api-url";
import type { InboxItem } from "../types/notification.types";
import { normalizeInboxItem } from "../lib/inbox-mapper";

function authHeaders(
  userId: string,
  activeCompanyId: string | null | undefined,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${userId}`,
  };
  if (activeCompanyId) {
    headers["X-Active-Company-Id"] = activeCompanyId;
  }
  return headers;
}

export async function fetchUnreadCount(
  userId: string,
  activeCompanyId: string | null | undefined,
  domain?: string,
): Promise<number> {
  const base = getClientBackendApiBase();
  if (!base) return 0;
  const q = domain ? `?domain=${encodeURIComponent(domain)}` : "";
  try {
    const res = await fetch(`${base}/api/notifications/unread-count${q}`, {
      headers: authHeaders(userId, activeCompanyId),
    });
    if (!res.ok) return 0;
    const json = (await res.json()) as { count?: number };
    return typeof json.count === "number" ? json.count : 0;
  } catch {
    return 0;
  }
}

export async function fetchInbox(
  userId: string,
  activeCompanyId: string | null | undefined,
  params?: { domain?: string; status?: string; limit?: number },
): Promise<InboxItem[]> {
  const base = getClientBackendApiBase();
  if (!base) return [];
  const search = new URLSearchParams();
  if (params?.domain) search.set("domain", params.domain);
  if (params?.status) search.set("status", params.status);
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  try {
    const res = await fetch(`${base}/api/notifications/inbox${qs ? `?${qs}` : ""}`, {
      headers: authHeaders(userId, activeCompanyId),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { items?: unknown[] };
    if (!Array.isArray(json.items)) return [];
    return json.items
      .map((row) => normalizeInboxItem(row))
      .filter((x): x is InboxItem => x != null);
  } catch {
    return [];
  }
}

export async function markNotificationRead(
  userId: string,
  activeCompanyId: string | null | undefined,
  deliveryId: string,
): Promise<boolean> {
  const base = getClientBackendApiBase();
  if (!base || !deliveryId) return false;
  try {
    const res = await fetch(
      `${base}/api/notifications/deliveries/${encodeURIComponent(deliveryId)}/read`,
      {
        method: "PATCH",
        headers: authHeaders(userId, activeCompanyId),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function markAllNotificationsRead(
  userId: string,
  activeCompanyId: string | null | undefined,
  domain?: string,
): Promise<void> {
  const base = getClientBackendApiBase();
  if (!base) return;
  const q = domain ? `?domain=${encodeURIComponent(domain)}` : "";
  try {
    await fetch(`${base}/api/notifications/deliveries/mark-all-read${q}`, {
      method: "POST",
      headers: authHeaders(userId, activeCompanyId),
    });
  } catch {
    /* red no alcanzable (p. ej. localhost en tablet) */
  }
}
