/** Fila devuelta por GET `/customers` (adapter + `CustomersService.search`). */
export type CustomerListRow = {
  /** Alias para DataGrid (`row.id`). */
  id: string;
  customerId: string;
  personId: string;
  displayName: string;
  /** Tipo de documento de identidad (`Person.documentType`). */
  documentType?: string | null;
  documentNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  creditLimit: number;
  currentBalance?: number;
  availableCredit?: number;
  paymentDayOfMonth?: number | null;
  isActive: boolean;
  /** Tiene cuenta en el portal Mi cuenta del eShop. */
  hasEshopAccount?: boolean;
  eshopUsername?: string | null;
  eshopLoginEmail?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomerListResult = {
  success?: boolean;
  page: number;
  pageSize: number;
  total: number;
  customers: CustomerListRow[];
  /** Política empresa: crédito interno para clientes (Ajustes → Empresa). */
  internalCreditEnabled?: boolean;
};

/** Cuenta portal Mi cuenta (eShop) vinculada al cliente ERP. */
export type CustomerEshopAccountView = {
  accountId: string;
  username: string | null;
  loginEmail: string;
  registeredAt: string;
  emailVerifiedAt: string | null;
  updatedAt: string;
  webOrdersCount: number;
};

/** Detalle GET `/customers/:id` (`customer` en el JSON). */
export type CustomerDetailView = {
  customerId: string;
  personId: string;
  /** `Person.type` (p. ej. NATURAL, COMPANY). */
  personType?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
  displayName: string;
  documentType?: string | null;
  documentNumber?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  creditLimit: number;
  usedCredit: number;
  availableCredit: number;
  paymentDayOfMonth?: number | null;
  isActive: boolean;
  eshopAccount?: CustomerEshopAccountView | null;
  createdAt?: string;
  updatedAt?: string;
};

/** Cuerpo PUT `/customers/:id` para datos mostrados en resumen (persona + cliente). */
export type UpdateCustomerPayload = {
  creditLimit?: number;
  paymentDayOfMonth?: 5 | 10 | 15 | 20 | 25 | 30;
  firstName?: string;
  lastName?: string;
  businessName?: string;
  documentType?: "RUN" | "RUT" | "PASSPORT" | "DNI";
  documentNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
};

export type CustomerDocumentType = "RUN" | "RUT" | "PASSPORT" | "DNI";

export type CreateCustomerFormInput = {
  personType: "NATURAL" | "COMPANY";
  firstName?: string;
  lastName?: string;
  businessName?: string;
  documentType: CustomerDocumentType;
  documentNumber: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit: number;
  paymentDayOfMonth: 5 | 10 | 15 | 20 | 25 | 30;
  notes?: string | null;
};
