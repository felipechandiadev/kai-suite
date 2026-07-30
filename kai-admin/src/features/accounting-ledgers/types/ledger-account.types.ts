export type LedgerAccountRow = {
  id: string;
  code: string;
  name: string;
};

export type LedgerAccountsListResult = {
  accounts: LedgerAccountRow[];
};
