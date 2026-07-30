import { Suspense } from "react";
import { listPurchaseOrdersForGrid } from "@/features/purchasing-document/actions/purchase-order-list.action";
import PurchaseOrdersDataGrid from "./ui/PurchaseOrdersDataGrid";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function PurchaseOrdersListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(parseSp(sp, "page") || "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(parseSp(sp, "limit") || "25", 10) || 25));
  const search = parseSp(sp, "search");

  const result = await listPurchaseOrdersForGrid({
    page,
    limit,
    search: search || undefined,
  });

  return (
    <div className="min-h-0 p-0" data-test-id="purchase-orders-list-page-root">
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center py-4" data-test-id="purchase-orders-list-skeleton" />
        }
      >
        <PurchaseOrdersDataGrid rows={result.rows} total={result.total} />
      </Suspense>
    </div>
  );
}
