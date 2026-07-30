import { listVariantSalePriceHistoryAction } from "@/features/inventory-products/actions/product.action";
import type { VariantSalePriceHistoryEntry } from "@/features/inventory-products/types/variant-sale-price-history.types";
import { createDedupedAsyncFetch } from "@/shared/lib/dedupe-async-fetch";

type SalePriceHistoryActionResult = Awaited<ReturnType<typeof listVariantSalePriceHistoryAction>>;

function historyCacheKey(variantId: string, options?: { limit?: number }): string {
  return `${variantId.trim()}:${options?.limit ?? 50}`;
}

export const fetchVariantSalePriceHistoryForPage = createDedupedAsyncFetch(
  (variantId: string, options?: { limit?: number }) =>
    listVariantSalePriceHistoryAction(variantId.trim(), { limit: options?.limit ?? 50 }),
  {
    keyFn: historyCacheKey,
  },
);

/** Última fecha de cambio por lista de precios (para metadata en filas de precio). */
export function lastUpdatedByListIdFromHistory(
  items: VariantSalePriceHistoryEntry[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const e of items) {
    const listId = e.priceListId?.trim();
    const at = e.at?.trim();
    if (!listId || !at) {
      continue;
    }
    const prev = map[listId];
    if (!prev || at > prev) {
      map[listId] = at;
    }
  }
  return map;
}

export function invalidateVariantSalePriceHistoryCache(
  variantId: string,
  options?: { limit?: number },
): void {
  fetchVariantSalePriceHistoryForPage.invalidate(variantId, options);
}
