export type RuleScope = "TRANSACTION" | "TRANSACTION_LINE" | (string & {});

export type AccountingRuleLineSide = "DEBIT" | "CREDIT" | (string & {});
export type AccountingRuleLineAmountMode =
  | "TOTAL"
  | "SUBTOTAL"
  | "TAX"
  | "DISCOUNT"
  | "FIXED"
  | (string & {});

export type AccountingRuleLine = {
  id: string;
  ruleId: string;
  side: AccountingRuleLineSide;
  accountId: string;
  amountMode: AccountingRuleLineAmountMode;
  amountValue: number | null;
  sortOrder: number;
  isActive: boolean;
  account?: { id: string; code?: string; name?: string } | null;
};

export type AccountingRuleListItem = {
  id: string;
  companyId: string;
  appliesTo: RuleScope;
  transactionType: string;
  expenseCategoryId: string | null;
  taxId: string | null;
  paymentMethod: string | null;
  debitAccountId: string;
  creditAccountId: string;
  lines?: AccountingRuleLine[];
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  debitAccount?: { id: string; code?: string; name?: string } | null;
  creditAccount?: { id: string; code?: string; name?: string } | null;
  tax?: { id: string; name?: string; code?: string | null } | null;
  expenseCategory?: { id: string; name?: string; code?: string | null } | null;
};

export type ListAccountingRulesResult =
  | { success: true; rules: AccountingRuleListItem[] }
  | { success: false; error: string; rules: [] };

export type CreateAccountingRuleResult =
  | { success: true; rule: AccountingRuleListItem }
  | { success: false; error: string };

export type UpdateAccountingRuleResult =
  | { success: true; rule: AccountingRuleListItem }
  | { success: false; error: string };

export type DeleteAccountingRuleResult = { success: true } | { success: false; error: string };

