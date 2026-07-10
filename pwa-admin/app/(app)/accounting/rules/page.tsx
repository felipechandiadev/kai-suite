import { Suspense } from "react";
import { listAccountingRulesForPage } from "@/features/accounting-rules/actions/accounting-rule.action";
import { listChartOfAccountsForPage } from "@/features/accounting-chart-of-accounts/actions/chart-of-accounts.action";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import { listExpenseCategoriesForPage } from "@/features/expense-categories/actions/expense-category.action";
import { AccountingRulesCollection } from "./ui/AccountingRulesCollection";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const [rulesResult, accountsResult, taxes, expenseCategories] = await Promise.all([
    listAccountingRulesForPage(),
    listChartOfAccountsForPage({ includeInactive: true }),
    listTaxesForPage(),
    listExpenseCategoriesForPage(),
  ]);

  const rules = rulesResult.success ? rulesResult.rules : [];
  const hierarchy = accountsResult.success ? accountsResult.data.hierarchy : [];

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="accounting-rules-page-skeleton" />
      }
    >
      <AccountingRulesCollection
        initialRules={rules}
        accountsHierarchy={hierarchy}
        taxes={taxes}
        expenseCategories={expenseCategories}
      />
    </Suspense>
  );
}

