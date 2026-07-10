"use client";

import { useMemo, useState } from "react";
import { Button } from "@kai/ui";
import type { AccountHierarchyNode } from "@/features/accounting-chart-of-accounts/types/chart-of-accounts.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type { ExpenseCategoryListItem } from "@/features/expense-categories/types/expense-category.types";
import { CreateAccountingRuleDialog } from "./CreateAccountingRuleDialog";

export function AccountingRulesCollectionAddAction({
  accountsHierarchy,
  taxes,
  expenseCategories,
}: {
  accountsHierarchy: AccountHierarchyNode[];
  taxes: TaxListItem[];
  expenseCategories: ExpenseCategoryListItem[];
}) {
  const [open, setOpen] = useState(false);
  const activeTaxes = useMemo(() => taxes.filter((t) => t.isActive), [taxes]);
  const activeExpenseCategories = useMemo(() => expenseCategories.filter((c) => c.isActive), [expenseCategories]);

  return (
    <>
      <Button variant="primary" size="md" onClick={() => setOpen(true)} aria-label="Crear regla" data-test-id="rule-create-open">
        Crear regla
      </Button>
      <CreateAccountingRuleDialog
        open={open}
        onClose={() => setOpen(false)}
        accountsHierarchy={accountsHierarchy}
        taxes={activeTaxes}
        expenseCategories={activeExpenseCategories}
      />
    </>
  );
}

