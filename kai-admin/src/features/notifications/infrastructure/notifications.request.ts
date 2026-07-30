import type { InboxItem } from "../types/notification.types";
import { normalizeInboxItem } from "../lib/inbox-mapper";

function clientBackendBaseUrl(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_BACKEND_API_URL?.trim() ||
    process.env.BACKEND_API_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

function authHeaders(
  token: string,
  activeCompanyId: string | null,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (activeCompanyId) {
    headers["X-Active-Company-Id"] = activeCompanyId;
  }
  return headers;
}

export async function fetchUnreadCount(
  token: string,
  activeCompanyId: string | null,
  domain?: string,
): Promise<number> {
  const base = clientBackendBaseUrl();
  if (!base) return 0;
  const q = domain ? `?domain=${encodeURIComponent(domain)}` : "";
  const res = await fetch(`${base}/api/notifications/unread-count${q}`, {
    headers: authHeaders(token, activeCompanyId),
    credentials: "include",
  });
  if (!res.ok) return 0;
  const json = (await res.json()) as { count?: number };
  return typeof json.count === "number" ? json.count : 0;
}

export async function fetchInbox(
  token: string,
  activeCompanyId: string | null,
  params?: { domain?: string; status?: string; limit?: number },
): Promise<InboxItem[]> {
  const base = clientBackendBaseUrl();
  if (!base) return [];
  const search = new URLSearchParams();
  if (params?.domain) search.set("domain", params.domain);
  if (params?.status) search.set("status", params.status);
  if (params?.limit) search.set("limit", String(params.limit));
  const qs = search.toString();
  const res = await fetch(`${base}/api/notifications/inbox${qs ? `?${qs}` : ""}`, {
    headers: authHeaders(token, activeCompanyId),
    credentials: "include",
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { items?: unknown[] };
  if (!Array.isArray(json.items)) return [];
  return json.items
    .map((row) => normalizeInboxItem(row))
    .filter((x): x is InboxItem => x != null);
}

export async function markAllNotificationsRead(
  token: string,
  activeCompanyId: string | null,
  domain?: string,
): Promise<void> {
  const base = clientBackendBaseUrl();
  if (!base) return;
  const q = domain ? `?domain=${encodeURIComponent(domain)}` : "";
  await fetch(`${base}/api/notifications/deliveries/mark-all-read${q}`, {
    method: "POST",
    headers: authHeaders(token, activeCompanyId),
    credentials: "include",
  });
}
