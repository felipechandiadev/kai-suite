import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { connection } from "next/server";
import { PurchasingVariantSearchPosRequest } from "@/features/purchasing-reception/infrastructure/purchasing-variant-search-pos.request";
import { getPurchaseDocSearchFromUrl } from "@/features/purchasing-reception/lib/parse-purchase-doc-search-url";
import PosReceptionNewPageClient from "./PosReceptionNewPageClient";

export const dynamic = "force-dynamic";

function ReceptionNewFallback() {
  return (
    <div
      className="min-h-0 min-w-0 p-3 text-sm text-muted-foreground"
      data-test-id="pos-receptions-new-skeleton"
    >
      Cargando búsqueda…
    </div>
  );
}

export default async function PosReceptionNewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  noStore();
  const sp = await searchParams;
  const { q, page, pageSize } = getPurchaseDocSearchFromUrl(sp);
  const variantSearch = await PurchasingVariantSearchPosRequest.search({ q, page, pageSize });

  return (
    <Suspense fallback={<ReceptionNewFallback />}>
      <PosReceptionNewPageClient
        variantSearch={variantSearch}
        searchQuery={q}
        searchPage={page}
      />
    </Suspense>
  );
}
