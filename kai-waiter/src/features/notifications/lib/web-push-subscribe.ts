/**
 * Web Push (VAPID) para KaiFood Waiter.
 */

import { getClientBackendApiBase } from "@/lib/backend-api";
import type { DiningAuthContext } from "@/lib/backend-api";

function clientBackendBase(): string {
  try {
    return getClientBackendApiBase();
  } catch {
    return "";
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function fetchVapidPublicKey(ctx: DiningAuthContext): Promise<string | null> {
  const base = clientBackendBase();
  try {
    const res = await fetch(`${base}/api/notifications/push/vapid-public-key`, {
      headers: {
        Authorization: `Bearer ${ctx.userId}`,
        "X-Active-Company-Id": ctx.companyId,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { publicKey?: string | null };
    return json.publicKey?.trim() || null;
  } catch {
    return null;
  }
}

export async function ensureWaiterWebPushSubscription(params: {
  userId: string;
  companyId: string;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!params.userId.trim() || !params.companyId.trim()) return false;
  if (typeof Notification !== "undefined" && Notification.permission === "denied") {
    return false;
  }

  const ctx: DiningAuthContext = {
    userId: params.userId,
    companyId: params.companyId,
  };

  try {
    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return false;
    } else if (Notification.permission !== "granted") {
      return false;
    }

    const reg = await navigator.serviceWorker.ready;
    const publicKey = await fetchVapidPublicKey(ctx);
    if (!publicKey) {
      console.warn("[waiter-web-push] vapid-public-key vacío o no disponible");
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

    const base = clientBackendBase();
    const res = await fetch(`${base}/api/notifications/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ctx.userId}`,
        "X-Active-Company-Id": ctx.companyId,
      },
      body: JSON.stringify({
        clientApp: "waiter",
        subscription: {
          endpoint,
          keys: { p256dh, auth },
        },
      }),
    });
    if (!res.ok) {
      console.warn(`[waiter-web-push] subscribe failed status=${res.status}`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[waiter-web-push] subscribe error", err);
    return false;
  }
}
