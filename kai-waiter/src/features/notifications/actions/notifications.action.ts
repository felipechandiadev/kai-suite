"use server";

import { authHeaders, getServerBackendApiBase } from "@/lib/backend-api";
import { requireWaiterAuth } from "@/lib/waiter-auth.server";

/**
 * Llamadas de notificaciones / web push hechas en servidor con la cookie firmada
 * (el navegador no tiene acceso al token httpOnly).
 */
function apiUrl(path: string): string {
  return `${getServerBackendApiBase()}/api${path}`;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    const ctx = await requireWaiterAuth();
    return await fetch(apiUrl(path), {
      ...init,
      headers: authHeaders(ctx),
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function fetchUnreadCountAction(): Promise<number> {
  const res = await authedFetch("/notifications/unread-count?domain=SALES");
  if (!res?.ok) return 0;
  const json = (await res.json()) as { count?: number };
  return typeof json.count === "number" ? json.count : 0;
}

export async function fetchInboxRawAction(limit = 30): Promise<unknown[]> {
  const search = new URLSearchParams({
    domain: "SALES",
    status: "UNREAD",
    limit: String(Math.min(Math.max(1, Math.floor(limit)), 100)),
  });
  const res = await authedFetch(`/notifications/inbox?${search}`);
  if (!res?.ok) return [];
  const json = (await res.json()) as { items?: unknown[] };
  return Array.isArray(json.items) ? json.items : [];
}

export async function markNotificationReadAction(deliveryId: string): Promise<boolean> {
  if (typeof deliveryId !== "string" || !deliveryId.trim()) return false;
  const res = await authedFetch(
    `/notifications/deliveries/${encodeURIComponent(deliveryId.trim())}/read`,
    { method: "PATCH" },
  );
  return Boolean(res?.ok);
}

export async function fetchVapidPublicKeyAction(): Promise<string | null> {
  const res = await authedFetch("/notifications/push/vapid-public-key");
  if (!res?.ok) return null;
  const json = (await res.json()) as { publicKey?: string | null };
  return json.publicKey?.trim() || null;
}

export async function subscribeWebPushAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<boolean> {
  const endpoint = String(subscription?.endpoint ?? "").trim();
  const p256dh = String(subscription?.keys?.p256dh ?? "").trim();
  const auth = String(subscription?.keys?.auth ?? "").trim();
  if (!endpoint || !p256dh || !auth) return false;
  const res = await authedFetch("/notifications/push/subscribe", {
    method: "POST",
    body: JSON.stringify({
      clientApp: "waiter",
      subscription: { endpoint, keys: { p256dh, auth } },
    }),
  });
  if (res && !res.ok) {
    console.warn(`[waiter-web-push] subscribe failed status=${res.status}`);
  }
  return Boolean(res?.ok);
}
