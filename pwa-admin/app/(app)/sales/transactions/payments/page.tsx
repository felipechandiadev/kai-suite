import { Suspense } from "react";
import { listSalesPaymentsAction } from "@/features/sales-payments/actions/sales-payments.action";
import SalesPaymentsDataGrid from "./ui/SalesPaymentsDataGrid";
import { LoadingState } from '@kai/ui';

export const dynamic = "force-dynamic";

export default async function Page() {
  const res = await listSalesPaymentsAction({ page: 1, limit: 50 });

  const rows = res.success ? res.data.rows : [];
  const total = res.success ? res.data.total : 0;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col p-0"
      data-test-id="sales-transactions-payments-page-root"
    >
      <Suspense
        fallback={
          <LoadingState className="flex items-center justify-center py-4" data-test-id="sales-transactions-payments-page-skeleton" />
        }
      >
        <SalesPaymentsDataGrid rows={rows} total={total} />
      </Suspense>
      {!res.success ? (
        <p
          className="p-4 text-sm text-error"
          data-test-id="sales-transactions-payments-page-error"
        >
          {res.error}
        </p>
      ) : null}
    </div>
  );
}
