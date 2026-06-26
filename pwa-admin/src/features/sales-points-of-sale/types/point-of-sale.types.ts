export type PosKind = "PRESALE" | "SALE";

/**
 * DTO alineado con el mapa del backend (PosService.mapPointOfSale).
 */
export type PointOfSaleListItem = {
  id: string;
  companyId?: string;
  name: string;
  branchId?: string | null;
  branch?: { id: string; name: string } | null;
  storageId?: string | null;
  storage?: { id: string; name: string; type?: string } | null;
  priceLists: Array<{ id: string; name: string; isActive: boolean }>;
  deviceId?: string | null;
  isActive: boolean;
  defaultPriceListId: string | null;
  kind?: PosKind;
  acceptsPresaleTickets?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ListPointsOfSaleResult =
  | { success: true; pointsOfSale: PointOfSaleListItem[] }
  | { success: false; error: string; pointsOfSale: [] };

export type CreatePointOfSaleResult =
  | { success: true; pointOfSale: PointOfSaleListItem }
  | { success: false; error: string };

export type UpdatePointOfSaleResult =
  | { success: true; pointOfSale: PointOfSaleListItem }
  | { success: false; error: string };

export type DeletePointOfSaleResult = { success: true } | { success: false; error: string };
