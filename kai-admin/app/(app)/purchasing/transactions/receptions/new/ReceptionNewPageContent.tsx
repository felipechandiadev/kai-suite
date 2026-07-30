import { unstable_noStore as noStore } from "next/cache";
import { PurchasingVariantSearchRequest } from "@/features/purchasing-document/infrastructure/purchasing-variant-search.request";
import { getPurchaseDocSearchFromUrl } from "@/features/purchasing-document/lib/parse-purchase-doc-search-url";
import { createDirectReceptionAction } from "@/features/receptions/actions/reception.action";
import { getPurchasingTransactionDetailAction } from "@/features/purchasing-document/actions/purchasing-detail.action";
import { searchPurchaseOrdersForReceptionAction } from "@/features/purchasing-document/actions/purchase-order-list.action";
import { PurchaseDocumentBuilder } from "@/shared/components/PurchaseDocumentBuilder";

export default async function ReceptionNewPageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();
  const sp = await searchParams;
  const { q, page, pageSize } = getPurchaseDocSearchFromUrl(sp);

  const variantSearch = await PurchasingVariantSearchRequest.search({ q, page, pageSize });

  return (
    <div className="min-h-0 min-w-0" data-test-id="receptions-new-page">
      <PurchaseDocumentBuilder
        mode="reception"
        variantSearch={variantSearch}
        searchQuery={q}
        searchPage={page}
        backToListHref="/purchasing/transactions/receptions"
        onSaveReception={createDirectReceptionAction}
        fetchPurchaseOrderDetail={getPurchasingTransactionDetailAction}
        searchPurchaseOrders={searchPurchaseOrdersForReceptionAction}
      />
    </div>
  );
}
