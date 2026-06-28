import type {
  PosFavoriteProductEntry,
  PosFavoriteProductsSnapshotV1,
} from "../types/pos-favorite-product.types";
import {
  getMigratedLocalStorageItem,
  setMigratedLocalStorageItem,
} from "../../../../../shared/storage-key-migrate";

const STORAGE_PREFIX = "kai.pos.favoriteProducts.v1";
const STORAGE_PREFIX_LEGACY = "flowstore.pos.favoriteProducts.v1";

function storageKey(pointOfSaleId: string): string {
  return `${STORAGE_PREFIX}.${pointOfSaleId.trim()}`;
}

function legacyStorageKey(pointOfSaleId: string): string {
  return `${STORAGE_PREFIX_LEGACY}.${pointOfSaleId.trim()}`;
}

function emptySnapshot(pointOfSaleId: string): PosFavoriteProductsSnapshotV1 {
  return {
    version: 1,
    pointOfSaleId: pointOfSaleId.trim(),
    items: [],
    updatedAt: new Date().toISOString(),
  };
}

export function readPosFavoriteProducts(
  pointOfSaleId: string | null | undefined,
): PosFavoriteProductEntry[] {
  const posId = pointOfSaleId?.trim();
  if (!posId || typeof window === "undefined") return [];
  try {
    const raw = getMigratedLocalStorageItem(storageKey(posId), legacyStorageKey(posId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PosFavoriteProductsSnapshotV1;
    if (parsed?.version !== 1 || parsed.pointOfSaleId !== posId) return [];
    if (!Array.isArray(parsed.items)) return [];
    return parsed.items.filter(
      (row) => typeof row?.variantId === "string" && row.variantId.trim(),
    );
  } catch {
    return [];
  }
}

export const POS_FAVORITE_PRODUCTS_CHANGED_EVENT = "pos-favorite-products-changed";

function notifyFavoriteProductsChanged(pointOfSaleId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(POS_FAVORITE_PRODUCTS_CHANGED_EVENT, {
      detail: { pointOfSaleId: pointOfSaleId.trim() },
    }),
  );
}

export function writePosFavoriteProducts(
  pointOfSaleId: string,
  items: PosFavoriteProductEntry[],
): void {
  const posId = pointOfSaleId.trim();
  if (!posId || typeof window === "undefined") return;
  const snapshot: PosFavoriteProductsSnapshotV1 = {
    version: 1,
    pointOfSaleId: posId,
    items,
    updatedAt: new Date().toISOString(),
  };
  try {
    setMigratedLocalStorageItem(
      storageKey(posId),
      legacyStorageKey(posId),
      JSON.stringify(snapshot),
    );
    notifyFavoriteProductsChanged(posId);
  } catch {
    // quota / modo privado
  }
}

export function removePosFavoriteProduct(
  pointOfSaleId: string,
  variantId: string,
): PosFavoriteProductEntry[] {
  const next = readPosFavoriteProducts(pointOfSaleId).filter(
    (row) => row.variantId !== variantId,
  );
  writePosFavoriteProducts(pointOfSaleId, next);
  return next;
}

export function addPosFavoriteProduct(
  pointOfSaleId: string,
  entry: PosFavoriteProductEntry,
): { items: PosFavoriteProductEntry[]; added: boolean } {
  const current = readPosFavoriteProducts(pointOfSaleId);
  if (current.some((row) => row.variantId === entry.variantId)) {
    return { items: current, added: false };
  }
  const next = [...current, entry];
  writePosFavoriteProducts(pointOfSaleId, next);
  return { items: next, added: true };
}
