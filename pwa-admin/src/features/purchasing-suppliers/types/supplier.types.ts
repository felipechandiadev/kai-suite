import type { PersonEconomicActivity } from "@kai/chile-catalogs";

/** Campos geo Chile + actividades económicas SII en `Person`. */
export type PersonGeoFields = {
  regionCode?: string | null;
  regionName?: string | null;
  communeCode?: string | null;
  communeName?: string | null;
  treasuryCode?: string | null;
  economicActivities?: PersonEconomicActivity[] | null;
};

/** Coincide con backend `PersonType`. */
export type SupplierPersonType = "NATURAL" | "COMPANY";

/** Coincide con backend `DocumentType`. */
export type SupplierDocumentType = "RUN" | "RUT" | "PASSPORT" | "DNI";

/** Coincide con backend `SupplierType`. */
export type SupplierCommercialType =
  | "MANUFACTURER"
  | "DISTRIBUTOR"
  | "WHOLESALER"
  | "SERVICE_PROVIDER"
  | "CONTRACTOR"
  | "LOGISTICS"
  | "IMPORTER";

/** Cuentas bancarias del `person` del proveedor (JSON en API). */
export type SupplierPersonBankAccount = {
  accountKey?: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolderName?: string;
  isPrimary?: boolean;
  notes?: string;
};

export type SupplierPersonGrid = {
  id: string;
  type: SupplierPersonType;
  firstName: string;
  lastName?: string | null;
  businessName?: string | null;
  documentType?: SupplierDocumentType | string | null;
  documentNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  bankAccounts?: SupplierPersonBankAccount[];
} & PersonGeoFields;

export type SupplierGridRow = {
  id: string;
  alias?: string | null;
  supplierType: SupplierCommercialType | string;
  defaultPaymentTermDays: number;
  isActive: boolean;
  notes?: string | null;
  person?: SupplierPersonGrid | null;
};

/** Detalle GET `/suppliers/:id`. */
export type SupplierDetailView = SupplierGridRow & {
  personId: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateSupplierPersonPayload = {
  firstName?: string;
  lastName?: string;
  businessName?: string;
  documentType?: string;
  documentNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
} & PersonGeoFields;

export type UpdateSupplierPayload = {
  supplierType?: string;
  alias?: string | null;
  defaultPaymentTermDays?: number;
  isActive?: boolean;
  notes?: string | null;
  person?: UpdateSupplierPersonPayload;
};
