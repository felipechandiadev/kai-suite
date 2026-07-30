import type { PosCartLine } from "@/app/(pos)/pos/ui/PosCartLineCard";
import type { PosProductSearchItem } from "@/features/pos-products/types/pos-product.types";

export type PriceListStamp = {
  priceListId: string;
  priceListName: string;
};

export const CART_MIXED_PRICE_LIST_MESSAGE =
  "No se pueden mezclar listas de precios en el mismo carrito.";

export const CART_SWITCH_PRICE_LIST_BLOCKED_MESSAGE =
  "Vaciá el carrito antes de cambiar la lista de precios.";

export function resolveActivePriceListStamp(input: {
  priceListId?: string | null;
  priceLists?: Array<{ id: string; name: string }> | null;
}): PriceListStamp | null {
  const priceListId = input.priceListId?.trim() || "";
  if (!priceListId) return null;
  const found = (input.priceLists ?? []).find((p) => String(p.id) === priceListId);
  const priceListName = found?.name?.trim() || "Lista de precios";
  return { priceListId, priceListName };
}

/** Primera lista presente en las líneas (si todas coinciden o hay al menos una). */
export function cartPriceListId(lines: PosCartLine[]): string | null {
  for (const line of lines) {
    const id = line.priceListId?.trim();
    if (id) return id;
  }
  return null;
}

export function assertCartSinglePriceList(
  lines: PosCartLine[],
): { ok: true } | { ok: false; message: string } {
  const ids = new Set(
    lines
      .map((l) => l.priceListId?.trim())
      .filter((id): id is string => Boolean(id)),
  );
  if (ids.size > 1) {
    return { ok: false, message: CART_MIXED_PRICE_LIST_MESSAGE };
  }
  return { ok: true };
}

export function stampProductAsCartLine(
  item: PosProductSearchItem,
  stamp: PriceListStamp,
  quantity: number,
): PosCartLine {
  return {
    ...item,
    quantity,
    priceListId: stamp.priceListId,
    priceListName: stamp.priceListName,
  };
}

/**
 * Intenta agregar (o sumar qty) respetando una sola lista por carrito.
 * Devuelve las líneas siguientes o null si la lista no coincide.
 */
export function tryAddItemWithPriceList(
  prev: PosCartLine[],
  item: PosProductSearchItem,
  stamp: PriceListStamp,
  quantity: number,
  maxQty?: number | null,
): PosCartLine[] | null {
  const cartList = cartPriceListId(prev);
  if (cartList && cartList !== stamp.priceListId) {
    return null;
  }

  const q = Math.max(1, Math.round(Number(quantity) || 1));
  const i = prev.findIndex((l) => l.variantId === item.variantId);
  if (i >= 0) {
    const nextQty = prev[i].quantity + q;
    const capped = maxQty != null ? Math.min(nextQty, maxQty) : nextQty;
    const next = [...prev];
    next[i] = {
      ...next[i],
      quantity: capped,
      priceListId: next[i].priceListId?.trim() || stamp.priceListId,
      priceListName: next[i].priceListName?.trim() || stamp.priceListName,
    };
    return next;
  }

  return [...prev, stampProductAsCartLine(item, stamp, q)];
}

/** Completa priceListId/name faltantes con el stamp de sesión. */
export function backfillCartLinesPriceList(
  lines: PosCartLine[],
  stamp: PriceListStamp | null,
): PosCartLine[] {
  if (!stamp) return lines;
  return lines.map((l) => {
    if (l.priceListId?.trim()) {
      return {
        ...l,
        priceListName: l.priceListName?.trim() || stamp.priceListName,
      };
    }
    return {
      ...l,
      priceListId: stamp.priceListId,
      priceListName: stamp.priceListName,
    };
  });
}

export function stampLinesWithPriceList(
  lines: PosCartLine[],
  stamp: PriceListStamp,
): PosCartLine[] {
  return lines.map((l) => ({
    ...l,
    priceListId: l.priceListId?.trim() || stamp.priceListId,
    priceListName: l.priceListName?.trim() || stamp.priceListName,
  }));
}
