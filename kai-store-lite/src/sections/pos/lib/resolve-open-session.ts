import { liteFetch } from "@/lib/lite-client";
import type { LiteCashSession } from "@/lib/lite-api";
import type { LitePointOfSale } from "@/lib/lite-api";
import { usePosCartStore } from "../store/pos-cart.store";

export type ResolvedOpenSession = {
  pointOfSaleId: string;
  cashSessionId: string;
  openingAmount: number;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Sesión OPEN del negocio Lite (mono-POS); cualquier OPEN cuenta. */
export async function findOpenCashSession(): Promise<ResolvedOpenSession | null> {
  const [posRes, sessionsRes] = await Promise.all([
    liteFetch<{ items: LitePointOfSale[] }>("/lite/points-of-sale"),
    liteFetch<{ items: LiteCashSession[] }>("/lite/cash-sessions"),
  ]);

  const posList = posRes.items ?? [];
  const preferredPos = posList[0];

  const openSessions = (sessionsRes.items ?? []).filter(
    (s) => String(s.status ?? "").toUpperCase() === "OPEN" && Boolean(s.id),
  );
  if (openSessions.length === 0) return null;

  const open =
    (preferredPos?.id
      ? openSessions.find((s) => s.pointOfSaleId === preferredPos.id)
      : undefined) ??
    openSessions.find((s) => !s.pointOfSaleId) ??
    openSessions[0];

  if (!open?.id) return null;

  const pointOfSaleId = open.pointOfSaleId || preferredPos?.id;
  if (!pointOfSaleId) return null;

  return {
    pointOfSaleId,
    cashSessionId: open.id,
    openingAmount: Number(open.openingAmount ?? open.openingFloat ?? 0),
  };
}

/** Aplica sesión abierta al store y pasa a venta. */
export function attachResolvedOpenSession(session: ResolvedOpenSession) {
  const store = usePosCartStore.getState();
  store.setPointOfSaleId(session.pointOfSaleId);
  store.setCashSessionId(session.cashSessionId);
  store.setOpeningFloat(session.openingAmount);
  store.setSessionOpen(true);
  store.setPhase("sale");
  store.setSessionBootstrap("ready");
}

/**
 * Única puerta de reanudación: store local o GET /lite/cash-sessions.
 * Reintentos cortos por Core recién levantado.
 */
export async function resumeOpenCashSession(opts?: {
  retries?: number;
}): Promise<"sale" | "opening"> {
  const retries = Math.max(1, opts?.retries ?? 3);
  const store = usePosCartStore.getState();

  if (store.sessionOpen && store.cashSessionId) {
    if (store.phase === "opening") store.setPhase("sale");
    store.setSessionBootstrap("ready");
    return "sale";
  }

  store.setSessionBootstrap("pending");

  let lastError: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const open = await findOpenCashSession();
      if (open) {
        attachResolvedOpenSession(open);
        return "sale";
      }

      const next = usePosCartStore.getState();
      next.setSessionBootstrap("ready");
      if (next.phase !== "payment" && next.phase !== "closing") {
        next.setPhase("opening");
      }
      return "opening";
    } catch (e) {
      lastError = e;
      if (attempt < retries - 1) await sleep(400 * (attempt + 1));
    }
  }

  usePosCartStore.getState().setSessionBootstrap("ready");
  if (lastError) throw lastError;
  return "opening";
}
