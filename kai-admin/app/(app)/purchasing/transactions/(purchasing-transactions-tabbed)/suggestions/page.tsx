import { Suspense } from "react";
import { LoadingState } from "@kai/ui";
import { listPurchaseSuggestionsForPage } from "@/features/purchasing-suggestions/actions/purchase-suggestions.action";
import PurchaseSuggestionsBoard from "./ui/PurchaseSuggestionsBoard";

export const dynamic = "force-dynamic";

export default async function PurchaseSuggestionsPage() {
  const { groups, suppliers } = await listPurchaseSuggestionsForPage();
  return (
    <div className="min-h-0 p-0" data-test-id="purchase-suggestions-page-root">
      <Suspense
        fallback={<LoadingState className="flex items-center justify-center py-4" data-test-id="purchase-suggestions-skeleton" />}
      >
        <PurchaseSuggestionsBoard groups={groups} suppliers={suppliers} />
      </Suspense>
    </div>
  );
}
