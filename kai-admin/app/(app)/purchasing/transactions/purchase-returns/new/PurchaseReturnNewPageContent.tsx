import { unstable_noStore as noStore } from "next/cache";
import { createPurchaseReturnAction } from "@/features/purchasing-purchase-returns/actions/purchase-return.action";
import type { PurchasingVariantSearchResult } from "@/features/purchasing-document/types/purchasing-document.types";
import { resolveReceptionForPurchaseReturnAction } from "@/features/receptions/actions/reception.action";
import { PurchaseDocumentBuilder } from "@/shared/components/PurchaseDocumentBuilder";

const EMPTY_VARIANT_SEARCH: PurchasingVariantSearchResult = {
  items: [],
  page: 1,
  pageSize: 24,
  total: 0,
};

export default async function PurchaseReturnNewPageContent() {
  noStore();

  return (
    <div
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
      data-test-id="purchase-returns-new-page"
    >
      <PurchaseDocumentBuilder
        mode="purchase_return"
        variantSearch={EMPTY_VARIANT_SEARCH}
        searchQuery=""
        searchPage={1}
        backToListHref="/purchasing/transactions/purchase-returns"
        resolveReceptionForReturn={resolveReceptionForPurchaseReturnAction}
        onSavePurchaseReturn={createPurchaseReturnAction}
      />
    </div>
  );
}
