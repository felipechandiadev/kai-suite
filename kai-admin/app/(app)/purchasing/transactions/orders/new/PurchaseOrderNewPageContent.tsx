import { unstable_noStore as noStore } from "next/cache";
import { createPurchaseOrderAction } from "@/features/purchasing-document/actions/purchase-order.action";
import { PurchasingVariantSearchRequest } from "@/features/purchasing-document/infrastructure/purchasing-variant-search.request";
import { getPurchaseDocSearchFromUrl } from "@/features/purchasing-document/lib/parse-purchase-doc-search-url";
import { PurchaseDocumentBuilder } from "@/shared/components/PurchaseDocumentBuilder";

export default async function PurchaseOrderNewPageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  noStore();
  const sp = await searchParams;
  const { q, page, pageSize } = getPurchaseDocSearchFromUrl(sp);

  const variantSearch = await PurchasingVariantSearchRequest.search({ q, page, pageSize });

  return (
    <div className="min-h-0 min-w-0" data-test-id="purchase-orders-new-page">
      <PurchaseDocumentBuilder
        mode="purchase_order"
        variantSearch={variantSearch}
        searchQuery={q}
        searchPage={page}
        backToListHref="/purchasing/transactions/orders"
        onSavePurchaseOrder={createPurchaseOrderAction}
      />
    </div>
  );
}
