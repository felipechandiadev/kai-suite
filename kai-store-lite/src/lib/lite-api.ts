/** Shared response shapes for `/api/lite/*` (Bearer = user UUID). */

export type LiteCatalogItem = {
  id: string;
  name: string;
  type: string;
  sku?: string;
};

export type LitePosCatalogItem = {
  variantId: string;
  name: string;
  sku?: string;
  barcode?: string | null;
  unitPrice: number;
  productType: "PHYSICAL" | "SERVICE" | "PACK" | string;
};

export type LiteStockItem = {
  variantId: string;
  sku?: string;
  name: string;
  physicalStock: number;
  storageName?: string;
};

export type LiteCustomer = {
  id: string;
  name: string;
  documentNumber?: string;
  email?: string;
};

export type LiteSupplier = {
  id: string;
  name: string;
  documentNumber?: string;
};

export type LiteCashSession = {
  id: string;
  status?: string;
  pointOfSaleId?: string;
  pointOfSaleName?: string;
  openedAt?: string;
  closedAt?: string | null;
  openingAmount?: number;
  openingFloat?: number;
  closingAmount?: number | null;
  counted?: number | null;
};

export type LitePointOfSale = {
  id: string;
  name: string;
  code?: string;
  branchId?: string;
  active?: boolean;
  isActive?: boolean;
};

export type LiteUser = {
  id: string;
  name?: string;
  userName?: string;
  email?: string;
  mail?: string;
  roles?: string[];
};

export type LiteCompanyPayload = {
  company?: {
    id?: string;
    name?: string;
    razonSocial?: string;
    nombreFantasia?: string | null;
    rut?: string;
    businessActivity?: string | null;
    address?: string | null;
    commune?: string | null;
    city?: string | null;
    phone?: string | null;
    mail?: string | null;
    defaultCurrency?: string;
  };
  branch?: {
    id?: string;
    name?: string;
    code?: string;
  };
  storage?: {
    id: string;
    name: string;
    isDefault?: boolean;
  } | null;
  warehouses?: Array<{
    id: string;
    name: string;
    code?: string;
  }>;
  taxRate?: number;
};

export type LiteDashboard = {
  salesToday?: number;
  salesCount?: number;
  salesTodayAmount?: number;
  salesTodayCount?: number;
  salesMtdAmount?: number;
  salesMtdCount?: number;
  averageTicketMtd?: number;
  stockLowCount?: number;
  stockSkuCount?: number;
  openSessions?: number;
  customers?: number;
  salesByMonth?: Array<{ period: string; label: string; total: number }>;
  message?: string;
  [key: string]: unknown;
};

export type LiteItems<T> = { items: T[] };
