/**
 * Mirror de `company_voucher_kinds` (API).
 */
export type VoucherFaceValueMode = "FIXED" | "OPEN";

export type CompanyVoucherKind = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  faceValueMode: VoucherFaceValueMode;
  defaultFaceValue?: number | null;
  requireFaceValue: boolean;
  defaultIssuerName?: string | null;
};

export function emptyCompanyVoucherKind(): Omit<CompanyVoucherKind, "id" | "code"> & {
  id?: string;
  code?: string;
} {
  return {
    name: "",
    isActive: true,
    faceValueMode: "OPEN",
    defaultFaceValue: null,
    requireFaceValue: true,
    defaultIssuerName: null,
  };
}
