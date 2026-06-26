/** Contexto de operación POS (punto de venta, lista de precios, sucursal). Persistido en `localStorage`. */

export const POS_CONTEXT_KEY = "flowstore.pos.context.v1";

export type PosPriceListSnapshot = { id: string; name: string };

export type PosKind = "PRESALE" | "SALE";

export type PosContextV1 = {
  pointOfSaleId: string;
  /** Almacén sala de venta (STORE) del POS: stock mostrado y descuentos de venta. */
  storageId?: string | null;
  /** Sesión de caja abierta (requerida en caja; omitida en preventa). */
  cashSessionId?: string | null;
  pointOfSaleName?: string | null;
  branchName?: string | null;
  branchId?: string | null;
  priceListId?: string | null;
  priceLists?: PosPriceListSnapshot[];
  posKind?: PosKind;
  acceptsPresaleTickets?: boolean;
  updatedAt?: string;
};

export function readPosContextClient(): PosContextV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(POS_CONTEXT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PosContextV1;
  } catch {
    return null;
  }
}

export function savePosContextClient(ctx: PosContextV1): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      POS_CONTEXT_KEY,
      JSON.stringify({
        ...ctx,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // ignore
  }
}

export function patchPosContextClient(partial: Partial<PosContextV1>): void {
  const prev = readPosContextClient();
  if (!prev?.pointOfSaleId) return;
  savePosContextClient({ ...prev, ...partial, pointOfSaleId: prev.pointOfSaleId });
}
