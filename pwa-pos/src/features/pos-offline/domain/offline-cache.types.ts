export type OfflineCustomerRow = {
  customerId: string;
  displayName: string;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
  searchName: string;
  lastUsedAt?: string | null;
};

export type OfflineStockSnapshotRow = {
  /** PK compuesta: `{posId}:{priceListId}:{variantId}` */
  id: string;
  variantId: string;
  pointOfSaleId: string;
  priceListId: string;
  availableStock: number | null;
  availableStockBase: number | null;
  trackInventory: boolean;
  snapshotAt: string;
};

export type CompanyCacheRow = {
  id: "company";
  tradeName: string | null;
  legalName: string | null;
  cachedAt: string;
};

export type SessionMetaRow = {
  id: "session";
  pointOfSaleName: string | null;
  userRole: string | null;
  personName: string | null;
  deferredPaymentEnabled?: boolean;
  cachedAt: string;
};
