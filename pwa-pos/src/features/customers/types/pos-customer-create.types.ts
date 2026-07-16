import type { PersonEconomicActivity } from "@kai/chile-catalogs";

export type PosCustomerDocumentType = "RUN" | "RUT" | "PASSPORT" | "DNI";

export type PosPersonGeoFields = {
  regionCode?: string | null;
  regionName?: string | null;
  communeCode?: string | null;
  communeName?: string | null;
  treasuryCode?: string | null;
  economicActivities?: PersonEconomicActivity[] | null;
};

/** Formulario al crear cliente desde el POS (se normaliza en la action antes del POST). */
export type PosCreateCustomerInput = {
  personType: "NATURAL" | "COMPANY";
  firstName?: string;
  lastName?: string;
  businessName?: string;
  documentType: PosCustomerDocumentType;
  documentNumber: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit: number;
  paymentDayOfMonth: 5 | 10 | 15 | 20 | 25 | 30;
  notes?: string | null;
} & PosPersonGeoFields;

/** Cuerpo enviado a POST /api/customers. */
export type PosCreateCustomerApiBody = {
  personType: "NATURAL" | "COMPANY";
  firstName: string;
  lastName?: string;
  businessName?: string;
  documentType: PosCustomerDocumentType;
  documentNumber: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit: number;
  paymentDayOfMonth: 5 | 10 | 15 | 20 | 25 | 30;
  notes?: string | null;
} & PosPersonGeoFields;

export type PosCreateCustomerResult =
  | { success: true; customerId: string }
  | { success: false; message: string };
