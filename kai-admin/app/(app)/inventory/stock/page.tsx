import { Suspense } from "react";
import { listStockForGrid } from "@/features/inventory-stock/actions/stock.action";
import { listStoragesForPage } from "@/features/inventory-storages/actions/storage.action";
import StockDataGrid from "./ui/StockDataGrid";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(parseSp(sp, "page") || "1", 10) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(parseSp(sp, "limit") || "25", 10) || 25));
  const search = parseSp(sp, "search");
  const sortField = parseSp(sp, "sortField") || "productName";
  const sortRaw = parseSp(sp, "sort");
  const sort = sortRaw === "desc" ? "desc" : "asc";
  const storageId = parseSp(sp, "storageId");
  const branchId = parseSp(sp, "branchId");
  const stockAlertsRaw = parseSp(sp, "stock-alerts").toLowerCase();
  const stockAlerts =
    stockAlertsRaw === "true" || stockAlertsRaw === "1" || stockAlertsRaw === "yes";

  const [result, storages] = await Promise.all([
    listStockForGrid({
      search,
      storageId: storageId || undefined,
      branchId: branchId || undefined,
      stockAlerts: stockAlerts ? true : undefined,
      page,
      limit,
      sortField,
      sort,
    }),
    listStoragesForPage(),
  ]);

  return (
    <div className="min-h-0 p-0" data-test-id="inventory-stock-page-root">
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center py-4" data-test-id="inventory-stock-skeleton" />
        }
      >
        <StockDataGrid
          rows={result.rows}
          total={result.total}
          storages={storages}
          branchId={branchId || undefined}
          filterStorageId={storageId || undefined}
        />
      </Suspense>
    </div>
  );
}
