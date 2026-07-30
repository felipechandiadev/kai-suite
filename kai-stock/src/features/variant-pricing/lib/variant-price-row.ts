import type { VariantPriceListItem } from "../types/pricing.types";

export type VariantPriceRowDraft = {
  key: string;
  priceListId: string;
  net: number;
  gross: number;
  taxIds: string[];
  maxDiscountPercent: number | null;
  minPrice: number | null;
  lastEdited: "net" | "gross";
};

export function newRowKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function priceListItemToRow(
  item: VariantPriceListItem,
  defaultTaxIds: string[],
): VariantPriceRowDraft {
  return {
    key: newRowKey(),
    priceListId: item.priceListId,
    net: Math.round(item.netPrice),
    gross: Math.round(item.grossPrice),
    taxIds:
      Array.isArray(item.taxIds) && item.taxIds.length > 0 ? [...item.taxIds] : [...defaultTaxIds],
    maxDiscountPercent:
      item.maxDiscountPercent != null && Number.isFinite(Number(item.maxDiscountPercent))
        ? Number(item.maxDiscountPercent)
        : null,
    minPrice:
      item.minPrice != null && Number.isFinite(Number(item.minPrice))
        ? Math.round(Number(item.minPrice))
        : null,
    lastEdited: "net",
  };
}

export function rowToPriceListItem(
  row: VariantPriceRowDraft,
  priceListName: string,
  currency: string,
): VariantPriceListItem {
  return {
    priceListId: row.priceListId,
    priceListName,
    currency,
    netPrice: Math.round(row.net),
    grossPrice: Math.round(row.gross),
    taxIds: row.taxIds.length > 0 ? [...row.taxIds] : undefined,
    maxDiscountPercent: row.maxDiscountPercent,
    minPrice: row.minPrice,
  };
}
