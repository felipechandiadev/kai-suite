export type LaundryPaymentMode =
  | "FULL_ON_RECEIVE"
  | "FULL_ON_PICKUP"
  | "DEPOSIT_THEN_BALANCE";

export type LaundryReceptionStatus =
  | "DRAFT"
  | "RECEIVED"
  | "IN_PROCESS"
  | "READY"
  | "DELIVERED"
  | "CANCELLED";

export type LaundryGarmentAttributeValueSnapshot = {
  attributeId: string;
  attributeCode?: string;
  valueId: string;
  label?: string;
};

export type LaundryReceptionServiceLine = {
  id: string;
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string | null;
  sortOrder: number;
};

export type LaundryReceptionGarment = {
  id: string;
  garmentTypeId: string;
  quantity: number;
  attributeValues: LaundryGarmentAttributeValueSnapshot[];
  careInstructions?: string | null;
  customerNotes?: string | null;
  sortOrder: number;
  serviceLines: LaundryReceptionServiceLine[];
};

export type LaundryReception = {
  id: string;
  branchId: string;
  pointOfSaleId?: string | null;
  userId: string;
  code?: string | null;
  customerId: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot?: string | null;
  status: LaundryReceptionStatus;
  paymentMode: LaundryPaymentMode;
  depositAmount: number;
  paidAmount: number;
  balanceDue: number;
  servicesTotal: number;
  receivedAt?: string | null;
  promisedAt?: string | null;
  readyAt?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  garments?: LaundryReceptionGarment[];
};

export type LaundryGarmentType = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  sortOrder: number;
};

export type LaundryAttributeValue = {
  id: string;
  attributeId: string;
  label: string;
  active: boolean;
  sortOrder: number;
};

export type LaundryGarmentAttribute = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  sortOrder: number;
  values: LaundryAttributeValue[];
};

export type LaundryCareTemplate = {
  id: string;
  label: string;
  text: string;
  active: boolean;
  sortOrder: number;
};

export type CreateLaundryReceptionServiceLineInput = {
  productVariantId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
};

export type CreateLaundryReceptionGarmentInput = {
  garmentTypeId: string;
  quantity: number;
  attributeValues?: LaundryGarmentAttributeValueSnapshot[];
  careInstructions?: string;
  customerNotes?: string;
  serviceLines: CreateLaundryReceptionServiceLineInput[];
};

export type CreateLaundryReceptionInput = {
  branchId: string;
  pointOfSaleId?: string;
  customerId: string;
  paymentMode?: LaundryPaymentMode;
  depositAmount?: number;
  promisedAt?: string;
  notes?: string;
  garments: CreateLaundryReceptionGarmentInput[];
};

export type LaundryCatalogBundle = {
  garmentTypes: LaundryGarmentType[];
  attributes: LaundryGarmentAttribute[];
  careTemplates: LaundryCareTemplate[];
};

export type LaundryMutationResponse =
  | { success: true; reception: LaundryReception }
  | { success: false; message: string };

export type LaundryReceptionDetailResponse =
  | { success: true; reception: LaundryReception }
  | { success: false; message: string };

export type LaundryReceptionsListResponse =
  | {
      success: true;
      items: LaundryReception[];
      total: number;
      page: number;
      limit: number;
    }
  | { success: false; message: string };

export type LaundryCatalogResponse =
  | { success: true; catalog: LaundryCatalogBundle }
  | { success: false; message: string };
