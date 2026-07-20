export type PersonBankAccountItem = {
  accountKey?: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolderName?: string;
  accountHolderRut?: string;
  isPrimary?: boolean;
  notes?: string;
  currentBalance?: number;
};

export type AddPersonBankAccountInput = {
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolderName?: string;
  accountHolderRut?: string;
  isPrimary?: boolean;
  notes?: string;
};
