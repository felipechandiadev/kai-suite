export type CompanyBankAccountItem = {
  accountKey?: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolderName?: string;
  isPrimary?: boolean;
};

export type CompanyDetails = {
  id?: string | null;
  tradeName?: string | null;
  businessName?: string | null;
  taxId?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  bankAccounts?: CompanyBankAccountItem[];
  razonSocial?: string | null;
  nombreFantasia?: string | null;
  rut?: string | null;
  mail?: string | null;
  settings?: { address?: string | null; phone?: string | null; email?: string | null } | null;
};
