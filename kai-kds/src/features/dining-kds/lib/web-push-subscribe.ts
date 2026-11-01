/**
 * Web Push (VAPID) para KaiFood KDS.
 */

import {
  fetchKdsVapidPublicKeyAction,
  subscribeKdsWebPushAction,
} from "../actions/push.action";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function ensureKdsWebPushSubscription(params: {
  /** Solo para decidir si hay sesión en UI; la credencial va en cookie httpOnly. */
  userId?: string;
  companyId?: string;
  productionUnitId?: string | null;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!params.userId?.trim() || !params.companyId?.trim()) return false;
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
    const publicKey = await fetchKdsVapidPublicKeyAction();
    if (!publicKey) return false;

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

    return await subscribeKdsWebPushAction({
      productionUnitId: params.productionUnitId ?? null,
      subscription: { endpoint, keys: { p256dh, auth } },
    });
  } catch (err) {
    console.warn("[kds-web-push] subscribe error", err);
    return false;
  }
}
