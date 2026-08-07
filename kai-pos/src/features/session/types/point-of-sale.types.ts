export type PosPriceList = { id: string; name: string; isActive: boolean };

export type PosKind = "PRESALE" | "SALE";

export type PointOfSaleListItem = {
  id: string;
  name: string;
  branchId?: string | null;
  branch?: { id: string; name: string } | null;
  branchName?: string | null;
  storageId?: string | null;
  storage?: { id: string; name: string; type?: string } | null;
  priceLists: PosPriceList[];
  deviceId?: string | null;
  isActive: boolean;
  defaultPriceListId: string | null;
  kind?: PosKind;
  acceptsPresaleTickets?: boolean;
  allowsDeferredPayment?: boolean;
  deferredPaymentEnabled?: boolean;
  kaiFoodEnabled?: boolean;
};

export type ListPointsOfSaleResult =
  | { success: true; pointsOfSale: PointOfSaleListItem[] }
  | { success: false; error: string; pointsOfSale: []; statusCode?: number };

