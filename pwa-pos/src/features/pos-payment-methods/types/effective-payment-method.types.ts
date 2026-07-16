import type { PosPaymentMethodId } from "@/features/pos-cart/pos-payment.types";

export interface EffectiveVoucherKind {
  id: string;
  code: string;
  name: string;
  faceValueMode: "FIXED" | "OPEN";
  defaultFaceValue?: number | null;
  requireFaceValue: boolean;
  defaultIssuerName?: string | null;
}

export interface EffectivePaymentMethod {
  companyPaymentMethodId: string;
  method: PosPaymentMethodId | string;
  label: string;
  alias?: string | null;
  bankAccountKey?: string | null;
  requireReference: boolean;
  preloadOnPaymentScreen: boolean;
  preloadOrder: number | null;
  isDefaultForChange: boolean;
  displayOrder: number;
  /** Tipo enlazado cuando method === VOUCHER. */
  voucherKind?: EffectiveVoucherKind | null;
  /** @deprecated compat */
  voucherKinds?: Array<{
    code: string;
    name: string;
    requireFaceValue: boolean;
    defaultIssuerName?: string | null;
  }>;
}

export type EffectivePaymentMethodsResponse =
  | {
      success: true;
      paymentMethods: EffectivePaymentMethod[];
      voucherKinds?: EffectivePaymentMethod["voucherKinds"];
    }
  | { success: false; message: string };
