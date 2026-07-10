import { Suspense } from "react";
import { listCategoriesForPage } from "@/features/inventory-categories/actions/category.action";
import { CategoriesCollection } from "./components/CategoriesCollection";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialCategories = await listCategoriesForPage();

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="categories-page-skeleton" />
      }
    >
      <CategoriesCollection initialCategories={initialCategories} />
    </Suspense>
  );
}
