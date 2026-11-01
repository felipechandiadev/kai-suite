"use server";

import { authHeaders, getServerBackendApiBase } from "@/lib/backend-api";
import { requireKdsAuth } from "@/lib/kds-auth.server";

/** Web push hecho en servidor con la cookie firmada (el navegador no ve el token). */
async function authedFetch(path: string, init?: RequestInit): Promise<Response | null> {
  try {
    const ctx = await requireKdsAuth();
    return await fetch(`${getServerBackendApiBase()}/api${path}`, {
      ...init,
      headers: authHeaders(ctx),
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export async function fetchKdsVapidPublicKeyAction(): Promise<string | null> {
  const res = await authedFetch("/notifications/push/vapid-public-key");
  if (!res?.ok) return null;
  const json = (await res.json()) as { publicKey?: string | null };
  return json.publicKey?.trim() || null;
}

export async function subscribeKdsWebPushAction(input: {
  productionUnitId?: string | null;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
}): Promise<boolean> {
  const endpoint = String(input?.subscription?.endpoint ?? "").trim();
  const p256dh = String(input?.subscription?.keys?.p256dh ?? "").trim();
  const auth = String(input?.subscription?.keys?.auth ?? "").trim();
  if (!endpoint || !p256dh || !auth) return false;
  const productionUnitId =
    typeof input.productionUnitId === "string" ? input.productionUnitId.trim() || null : null;
  const res = await authedFetch("/notifications/push/subscribe", {
    method: "POST",
    body: JSON.stringify({
      clientApp: "kds",
      productionUnitId,
      subscription: { endpoint, keys: { p256dh, auth } },
    }),
  });
  if (res && !res.ok) {
    console.warn(`[kds-web-push] subscribe failed status=${res.status}`);
  }
  return Boolean(res?.ok);
}
