import { Suspense } from "react";
import { listSalesTransactionsAction } from "@/features/sales-transactions/actions/sales-transactions-list.action";
import SalesTransactionsDataGrid from "../ui/SalesTransactionsDataGrid";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

function parsePositiveInt(
  raw: string | string[] | undefined,
  fallback: number,
  max: number,
): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(String(s ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(max, n);
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const limit = parsePositiveInt(sp.limit, 25, 100);
  const page = parsePositiveInt(sp.page, 1, 10_000);

  const res = await listSalesTransactionsAction({ page, limit });

  const rows = res.success ? res.data.rows : [];
  const total = res.success ? res.data.total : 0;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col p-0"
      data-test-id="sales-transactions-sales-page-root"
    >
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center py-4" data-test-id="sales-transactions-sales-page-skeleton" />
        }
      >
        <SalesTransactionsDataGrid rows={rows} total={total} testIdSuffix="sales" />
      </Suspense>
      {!res.success ? (
        <p
          className="p-4 text-sm text-error"
          data-test-id="sales-transactions-sales-page-error"
        >
          {res.error}
        </p>
      ) : null}
    </div>
  );
}
