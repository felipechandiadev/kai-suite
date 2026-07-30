export type PosCustomerSearchRow = {
  customerId: string;
  displayName: string;
  documentNumber: string | null;
  phone: string | null;
  email: string | null;
};

export type PosCustomerSearchResponse =
  | {
      success: true;
      page: number;
      pageSize: number;
      total: number;
      customers: PosCustomerSearchRow[];
    }
  | { success: false; message: string };

/** Cliente de la venta en curso: puede ser de catálogo o invitado (sin id).
 *
 * Mantenemos `name`, `document` y `phone` como strings vacíos en lugar de
 * `null` para no romper compatibilidad con escrituras previas en
 * localStorage. `email` se introdujo después y se mantiene opcional. */
export type PosSaleCustomer = {
  customerId: string | null;
  name: string;
  document: string;
  phone: string;
  email?: string | null;
};
