"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { CollectionPageLayout } from "@kai/ui";
import type { AccountHierarchyNode } from "@/features/accounting-chart-of-accounts/types/chart-of-accounts.types";
import type { TaxListItem } from "@/features/accounting-taxes/types/tax.types";
import type { ExpenseCategoryListItem } from "@/features/expense-categories/types/expense-category.types";
import type { AccountingRuleListItem } from "@/features/accounting-rules/types/accounting-rule.types";
import { AccountingRulesCollectionAddAction } from "./AccountingRulesCollectionAddAction";
import { AccountingRuleCard } from "./AccountingRuleCard";

export type AccountingRulesCollectionProps = {
  initialRules: AccountingRuleListItem[];
  accountsHierarchy: AccountHierarchyNode[];
  taxes: TaxListItem[];
  expenseCategories: ExpenseCategoryListItem[];
};

export function AccountingRulesCollection({
  initialRules,
  accountsHierarchy,
  taxes,
  expenseCategories,
}: AccountingRulesCollectionProps) {
  const searchParams = useSearchParams();
  const q = (searchParams.get("search") ?? "").trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return initialRules;
    return initialRules.filter((r) => {
      const debit = `${r.debitAccount?.code ?? ""} ${r.debitAccount?.name ?? ""}`.toLowerCase();
      const credit = `${r.creditAccount?.code ?? ""} ${r.creditAccount?.name ?? ""}`.toLowerCase();
      const tax = `${r.tax?.name ?? ""} ${r.tax?.code ?? ""}`.toLowerCase();
      const exp = `${r.expenseCategory?.name ?? ""} ${r.expenseCategory?.code ?? ""}`.toLowerCase();
      const blob = `${r.transactionType} ${r.appliesTo} ${r.paymentMethod ?? ""} ${debit} ${credit} ${tax} ${exp}`.toLowerCase();
      return blob.includes(q);
    });
  }, [initialRules, q]);

  return (
    <CollectionPageLayout
      title="Reglas contables"
      addAction={
        <AccountingRulesCollectionAddAction
          accountsHierarchy={accountsHierarchy}
          taxes={taxes}
          expenseCategories={expenseCategories}
        />
      }
      showSearch
      searchParamName="search"
      searchLabel="Buscar"
      searchPlaceholder="Buscar por tipo, cuentas, método de pago, impuesto o categoría"
      contentEmptyMessage="No hay reglas que mostrar"
      contentItems={
        filtered.length > 0
          ? filtered.map((r) => (
              <AccountingRuleCard
                key={r.id}
                rule={r}
                accountsHierarchy={accountsHierarchy}
                taxes={taxes}
                expenseCategories={expenseCategories}
              />
            ))
          : []
      }
      contentGridColumns={{ default: 1, md: 2, lg: 3 }}
      contentGridGapClassName="gap-4"
      contentGridItemsAlign="stretch"
      data-test-id="accounting-rules-collection"
    />
  );
}

