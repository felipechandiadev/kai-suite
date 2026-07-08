/** Contexto de operación POS (punto de venta, lista de precios, sucursal). Persistido en `localStorage`. */

import {
  getMigratedLocalStorageItem,
  setMigratedLocalStorageItem,
} from "@kai-shared/storage-key-migrate";

export const POS_CONTEXT_KEY = "kai.pos.context.v1";
export const POS_CONTEXT_KEY_LEGACY = "flowstore.pos.context.v1";

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
  deferredPaymentEnabled?: boolean;
  updatedAt?: string;
};

export const POS_CONTEXT_CHANGED_EVENT = "kai.pos-context.changed";

function notifyPosContextChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(POS_CONTEXT_CHANGED_EVENT));
}

export function readPosContextClient(): PosContextV1 | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = getMigratedLocalStorageItem(POS_CONTEXT_KEY, POS_CONTEXT_KEY_LEGACY);
    if (!raw) return null;
    return JSON.parse(raw) as PosContextV1;
  } catch {
    return null;
  }
}

export function savePosContextClient(ctx: PosContextV1): void {
  if (typeof window === "undefined") return;
  try {
    setMigratedLocalStorageItem(
      POS_CONTEXT_KEY,
      POS_CONTEXT_KEY_LEGACY,
      JSON.stringify({
        ...ctx,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // ignore
  }
  notifyPosContextChanged();
}

export function patchPosContextClient(partial: Partial<PosContextV1>): void {
  const prev = readPosContextClient();
  if (!prev?.pointOfSaleId) return;
  savePosContextClient({ ...prev, ...partial, pointOfSaleId: prev.pointOfSaleId });
}
