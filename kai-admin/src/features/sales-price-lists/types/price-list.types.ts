/**
 * Alineado a `mapPriceList` del backend (PriceListsService).
 */
export type PriceListListItem = {
  id: string;
  name: string;
  priceListType: string;
  currency: string;
  validFrom?: string | Date | null;
  validUntil?: string | Date | null;
  priority: number;
  isDefault: boolean;
  isActive: boolean;
  nonDeletable?: boolean;
  description: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type ListPriceListsResult =
  | { success: true; priceLists: PriceListListItem[] }
  | { success: false; error: string; priceLists: [] };

export type CreatePriceListResult =
  | { success: true; priceList: PriceListListItem }
  | { success: false; error: string };

export type UpdatePriceListResult =
  | { success: true; priceList: PriceListListItem }
  | { success: false; error: string };

export type DeletePriceListResult = { success: true } | { success: false; error: string };

export const PRICE_LIST_TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: "RETAIL", label: "Minorista" },
  { id: "WHOLESALE", label: "Mayorista" },
  { id: "VIP", label: "VIP" },
  { id: "PROMOTIONAL", label: "Promocional" },
];
