import { Suspense } from "react";
import { LoadingState } from '@kai/ui';
import {
  listExpenseCategoriesForPage,
  listExpenseCategoryOperationalGroupsMeta,
} from "@/features/expense-categories/actions/expense-category.action";
import { ExpenseCategoriesCollection } from "./components/ExpenseCategoriesCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [initialCategories, groupOptions] = await Promise.all([
    listExpenseCategoriesForPage(),
    listExpenseCategoryOperationalGroupsMeta(),
  ]);

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="expense-categories-page-skeleton" />
      }
    >
      <ExpenseCategoriesCollection initialCategories={initialCategories} groupOptions={groupOptions} />
    </Suspense>
  );
}
