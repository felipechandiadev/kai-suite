import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { listRecurringExpensesForPage } from "@/features/treasury-recurring-expenses/actions/recurring-expense.action";
import { RecurringExpensesCollection } from "./components/RecurringExpensesCollection";

export const dynamic = "force-dynamic";

export default async function RecurringExpensesPage() {
  const { rows, categories } = await listRecurringExpensesForPage();

  return (
    <Suspense
      fallback={
        <LoadingState
          className="flex items-center justify-center py-4"
          data-test-id="recurring-expenses-page-skeleton"
        />
      }
    >
      <RecurringExpensesCollection initialRows={rows} categories={categories} />
    </Suspense>
  );
}
