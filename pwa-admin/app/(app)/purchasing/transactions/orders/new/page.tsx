import { Suspense } from "react";
import { unstable_noStore as noStore } from "next/cache";
import { connection } from "next/server";
import PurchaseOrderNewPageContent from "./PurchaseOrderNewPageContent";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

function PurchaseOrderNewFallback() {
  return (
    <LoadingState className="flex items-center justify-center min-h-0 min-w-0 p-3 py-4" label="Cargando búsqueda" data-test-id="purchase-orders-new-skeleton" />
  );
}

export default async function NewPurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  noStore();

  return (
    <Suspense fallback={<PurchaseOrderNewFallback />}>
      <PurchaseOrderNewPageContent searchParams={searchParams} />
    </Suspense>
  );
}
