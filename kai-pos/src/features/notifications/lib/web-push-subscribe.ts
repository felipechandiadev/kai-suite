/**
 * Helpers Web Push (VAPID) para el POS.
 */

import { getClientBackendApiBase } from "@/lib/backend-api-url";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function fetchVapidPublicKey(
  userId: string,
  activeCompanyId: string | null | undefined,
): Promise<string | null> {
  const base = getClientBackendApiBase();
  if (!base) return null;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${userId}`,
  };
  if (activeCompanyId) headers["X-Active-Company-Id"] = activeCompanyId;
  try {
    const res = await fetch(`${base}/api/notifications/push/vapid-public-key`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { publicKey?: string | null };
    return json.publicKey?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Solicita permiso y registra la suscripción push del POS en el backend.
 * Seguro llamar varias veces; no reintenta si el permiso está denegado.
 */
export async function ensurePosWebPushSubscription(params: {
  userId: string;
  activeCompanyId?: string | null;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!params.userId.trim()) return false;
  if (typeof Notification !== "undefined" && Notification.permission === "denied") {
    return false;
  }

  try {
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;
    } else if (Notification.permission !== "granted") {
      return false;
    }

    const reg = await navigator.serviceWorker.ready;
    const publicKey = await fetchVapidPublicKey(
      params.userId,
      params.activeCompanyId,
    );
    if (!publicKey) {
      console.warn("[pos-web-push] vapid-public-key vacío o no disponible");
      return false;
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    const json = sub.toJSON();
    const endpoint = json.endpoint?.trim();
    const p256dh = json.keys?.p256dh?.trim();
    const auth = json.keys?.auth?.trim();
    if (!endpoint || !p256dh || !auth) return false;

    const base = getClientBackendApiBase();
    if (!base) return false;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.userId}`,
    };
    if (params.activeCompanyId) {
      headers["X-Active-Company-Id"] = params.activeCompanyId;
    }

    const res = await fetch(`${base}/api/notifications/push/subscribe`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        clientApp: "pos",
        subscription: {
          endpoint,
          keys: { p256dh, auth },
        },
      }),
    });
    if (!res.ok) {
      console.warn(
        `[pos-web-push] subscribe failed status=${res.status}`,
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[pos-web-push] subscribe error", err);
    return false;
  }
}
