export type PriceListListItem = {
  id: string;
  name: string;
  priceListType: string;
  currency: string;
  priority: number;
  isDefault: boolean;
  isActive: boolean;
  description: string | null;
};
