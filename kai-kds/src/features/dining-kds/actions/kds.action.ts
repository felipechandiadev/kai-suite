"use server";

import { diningLogin, diningSocketToken } from "@/lib/backend-api";
import {
  clearKdsAuthCookies,
  requireKdsAuth,
  setKdsAuthCookies,
} from "@/lib/kds-auth.server";
import { DiningKdsRequest } from "../infrastructure/dining-kds.request";

export type KdsLoginResult = {
  userId: string;
  companyId: string;
  userName: string;
  email: string | null;
  displayName: string;
};

/**
 * `userId`/`companyId` en el cuerpo de las acciones son legado de la UI y se IGNORAN:
 * la identidad sale siempre de la cookie httpOnly firmada (requireKdsAuth).
 */
type LegacyIdentity = { userId?: string; companyId?: string };

export async function kdsLoginAction(body: {
  userName: string;
  password: string;
  companyId: string;
}): Promise<KdsLoginResult> {
  const { tokens, ...session } = await diningLogin(body);
  await setKdsAuthCookies(tokens);
  return session;
}

/** true si hay cookie firmada utilizable (refresca si hace falta). */
export async function hasKdsAuthAction(): Promise<boolean> {
  try {
    await requireKdsAuth();
    return true;
  } catch {
    return false;
  }
}

export async function kdsLogoutAction(): Promise<void> {
  await clearKdsAuthCookies();
}

/**
 * Token de corta vida (typ=ws, ~60s) para el handshake del WebSocket.
 * El access token nunca sale de la cookie httpOnly; el navegador solo ve este token,
 * que kai-core no acepta en HTTP. `null` si no hay sesión (el cliente va a login).
 */
export async function getKdsSocketTokenAction(): Promise<
  { ok: true; token: string; expiresIn: number } | { ok: false; reason: "unauthorized" | "error" }
> {
  let ctx;
  try {
    ctx = await requireKdsAuth();
  } catch {
    return { ok: false, reason: "unauthorized" };
  }
  try {
    const { token, expiresIn } = await diningSocketToken(ctx);
    return { ok: true, token, expiresIn };
  } catch (e) {
    const status = (e as { status?: number })?.status;
    return { ok: false, reason: status === 401 ? "unauthorized" : "error" };
  }
}

export async function listProductionUnitsAction(
  body: LegacyIdentity & { branchId?: string } = {},
) {
  return DiningKdsRequest.listProductionUnits(await requireKdsAuth(), body.branchId);
}

export async function getKitchenQueueAction(body: LegacyIdentity & { productionUnitId: string }) {
  return DiningKdsRequest.productionUnitQueue(await requireKdsAuth(), body.productionUnitId);
}

export async function getProductionUnitHistoryAction(
  body: LegacyIdentity & { productionUnitId: string },
) {
  return DiningKdsRequest.productionUnitHistory(await requireKdsAuth(), body.productionUnitId);
}

export async function markKitchenItemReadyAction(
  body: LegacyIdentity & { orderId: string; lineId: string },
) {
  return DiningKdsRequest.markReady(await requireKdsAuth(), body.orderId, body.lineId);
}

export async function markKitchenLinesReadyAction(
  body: LegacyIdentity & { orderId: string; lineIds: string[]; productionUnitId: string },
) {
  return DiningKdsRequest.markLinesReady(
    await requireKdsAuth(),
    body.orderId,
    body.lineIds,
    body.productionUnitId,
  );
}

export async function markKitchenFireReadyAction(
  body: LegacyIdentity & { orderId: string; fireId: string; productionUnitId: string },
) {
  return DiningKdsRequest.markFireReady(
    await requireKdsAuth(),
    body.orderId,
    body.fireId,
    body.productionUnitId,
  );
}
