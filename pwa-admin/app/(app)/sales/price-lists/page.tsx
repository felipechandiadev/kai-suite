import { Suspense } from "react";
import { listPriceListsForPage } from "@/features/sales-price-lists/actions/price-list.action";
import { PriceListCollection } from "./components/PriceListCollection";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialPriceLists = await listPriceListsForPage();

  return (
    <Suspense
      fallback={
        <LoadingState className="flex items-center justify-center p-4 md:p-6 py-4" data-test-id="price-lists-page-skeleton" />
      }
    >
      <PriceListCollection initialPriceLists={initialPriceLists} />
    </Suspense>
  );
}
